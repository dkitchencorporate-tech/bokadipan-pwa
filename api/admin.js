// Función consolidada: analytics/catalog/clients/kiosk-add-items/orders/
// settings/upsells/upload-image del panel admin en un solo serverless
// function (ver api/account.js para la explicación completa del límite de 12
// funciones en Vercel Hobby). vercel.json reescribe /api/admin/<nombre> hacia
// /api/admin?action=<nombre> sin cambiar ninguna URL vista por el frontend.
import { withTx } from './_lib/db.js';
import { requireAuth, assertAdmin } from './_lib/adminGuard.js';
import { put } from '@vercel/blob';

// ---------- analytics ----------
// Datos agregados para AdminAnalytics.tsx: tráfico, ítems de pedidos (para
// inteligencia de ventas), instalaciones de PWA y export de clientes
// (profiles + kiosk_customers + orders). No hay tabla `reviews` aparte en
// este esquema — las valoraciones se derivan de orders.rating/review_comment
// en el propio handleOrders, no aquí.
async function handleAnalytics(req, res, auth) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const data = await withTx(async (client) => {
      await assertAdmin(client);

      const siteVisits = await client.query('SELECT * FROM site_visits ORDER BY created_at DESC LIMIT 5000');
      const pwaInstalls = await client.query('SELECT * FROM pwa_installs ORDER BY created_at DESC LIMIT 2000');
      const orderItems = await client.query(
        `SELECT oi.quantity, oi.unit_price, oi.customization_details, oi.order_id,
                json_build_object('created_at', o.created_at, 'status', o.status) AS orders
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id`
      );
      const profiles = await client.query('SELECT * FROM profiles ORDER BY created_at DESC LIMIT 5000');
      const kioskCustomers = await client.query('SELECT * FROM kiosk_customers ORDER BY created_at DESC LIMIT 5000');
      const orders = await client.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5000');

      return {
        siteVisits: siteVisits.rows,
        pwaInstalls: pwaInstalls.rows,
        orderItems: orderItems.rows,
        profiles: profiles.rows,
        kioskCustomers: kioskCustomers.rows,
        orders: orders.rows
      };
    }, { userId: auth.userId });

    return res.status(200).json(data);
  } catch (err) {
    console.error('Error en analítica admin:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'No se pudo cargar la analítica' });
  }
}

// ---------- catalog ----------
// Catálogo en vivo (crear/editar/borrar categorías, subcategorías y
// productos). La lectura del catálogo completo vive en GET /api/catalog?all=1
// (con JWT de admin); este endpoint es solo de escritura. `image_url` puede
// rellenarse a mano (URL externa) o generarse subiendo un archivo real via
// el action `upload-image` (ver handleUploadImage más abajo, Vercel Blob).
async function handleCatalog(req, res, auth) {
  const { type, id, ...fields } = req.body || {};

  try {
    if (req.method === 'POST') {
      const row = await withTx(async (client) => {
        await assertAdmin(client);
        if (type === 'category') {
          const r = await client.query(
            `INSERT INTO categories (name, subtitle, description, sort_order) VALUES ($1,$2,$3,COALESCE($4,0)) RETURNING *`,
            [fields.name, fields.subtitle || null, fields.description || null, fields.sort_order]
          );
          return r.rows[0];
        }
        if (type === 'subcategory') {
          const r = await client.query(
            `INSERT INTO subcategories (category_id, name, sort_order) VALUES ($1,$2,COALESCE($3,0)) RETURNING *`,
            [fields.category_id, fields.name, fields.sort_order]
          );
          return r.rows[0];
        }
        if (type === 'product') {
          let schemaObj = fields.customization_schema || {};
          if (typeof schemaObj === 'string') {
            try { schemaObj = JSON.parse(schemaObj); } catch (_) { schemaObj = {}; }
          }
          if (fields.badge !== undefined) {
            schemaObj = { ...schemaObj, badge: fields.badge };
          }
          const r = await client.query(
            `INSERT INTO products (category_id, subcategory_id, name, price, description, image_url, is_available, customization_schema, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,true),COALESCE($8,'{}'::jsonb),COALESCE($9,0)) RETURNING *`,
            [
              fields.category_id, fields.subcategory_id || null, fields.name, fields.price,
              fields.description || null, fields.image_url || null, fields.is_available,
              JSON.stringify(schemaObj),
              fields.sort_order
            ]
          );
          const row = r.rows[0];
          return { ...row, badge: row.customization_schema?.badge || row.name };
        }
        throw Object.assign(new Error('Tipo de entidad desconocido'), { statusCode: 400 });
      }, { userId: auth.userId });
      return res.status(200).json({ row });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Falta el id' });
      const row = await withTx(async (client) => {
        await assertAdmin(client);
        if (type === 'category') {
          const curr = (await client.query('SELECT * FROM categories WHERE id = $1', [id])).rows[0];
          if (!curr) throw Object.assign(new Error('Categoría no encontrada'), { statusCode: 404 });
          const newName = fields.name !== undefined ? fields.name : curr.name;
          const newSubtitle = fields.subtitle !== undefined ? fields.subtitle : curr.subtitle;
          const newDesc = fields.description !== undefined ? fields.description : curr.description;
          const newSort = fields.sort_order !== undefined ? fields.sort_order : curr.sort_order;
          const r = await client.query(
            `UPDATE categories SET name=$2, subtitle=$3, description=$4, sort_order=$5 WHERE id=$1 RETURNING *`,
            [id, newName, newSubtitle || null, newDesc || null, newSort ?? 0]
          );
          return r.rows[0];
        }
        if (type === 'subcategory') {
          const curr = (await client.query('SELECT * FROM subcategories WHERE id = $1', [id])).rows[0];
          if (!curr) throw Object.assign(new Error('Subcategoría no encontrada'), { statusCode: 404 });
          const newName = fields.name !== undefined ? fields.name : curr.name;
          const newSort = fields.sort_order !== undefined ? fields.sort_order : curr.sort_order;
          const r = await client.query(
            `UPDATE subcategories SET name=$2, sort_order=$3 WHERE id=$1 RETURNING *`,
            [id, newName, newSort ?? 0]
          );
          return r.rows[0];
        }
        if (type === 'product') {
          const curr = (await client.query('SELECT * FROM products WHERE id = $1', [id])).rows[0];
          if (!curr) throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 });
          const newCat = fields.category_id !== undefined ? fields.category_id : curr.category_id;
          const newSubcat = fields.subcategory_id !== undefined ? fields.subcategory_id : curr.subcategory_id;
          const newName = fields.name !== undefined ? fields.name : curr.name;
          const newPrice = fields.price !== undefined ? fields.price : curr.price;
          const newDesc = fields.description !== undefined ? fields.description : curr.description;
          const newImg = fields.image_url !== undefined ? fields.image_url : curr.image_url;
          const newAvail = fields.is_available !== undefined ? fields.is_available : curr.is_available;
          
          let baseSchema = fields.customization_schema !== undefined ? fields.customization_schema : curr.customization_schema;
          if (typeof baseSchema === 'string') {
            try { baseSchema = JSON.parse(baseSchema); } catch (_) { baseSchema = {}; }
          }
          if (!baseSchema || typeof baseSchema !== 'object') baseSchema = {};
          if (fields.badge !== undefined) {
            baseSchema = { ...baseSchema, badge: fields.badge };
          }

          const newSort = fields.sort_order !== undefined ? fields.sort_order : curr.sort_order;

          const r = await client.query(
            `UPDATE products SET
               category_id = $2,
               subcategory_id = $3,
               name = $4,
               price = $5,
               description = $6,
               image_url = $7,
               is_available = $8,
               customization_schema = $9,
               sort_order = $10
             WHERE id = $1 RETURNING *`,
            [
              id, newCat || null, newSubcat || null, newName, newPrice,
              newDesc || null, newImg || null, newAvail,
              JSON.stringify(baseSchema),
              newSort ?? 0
            ]
          );
          const row = r.rows[0];
          return { ...row, badge: row.customization_schema?.badge || row.name };
        }
        throw Object.assign(new Error('Tipo de entidad desconocido'), { statusCode: 400 });
      }, { userId: auth.userId });
      if (!row) return res.status(404).json({ error: 'No encontrado' });
      return res.status(200).json({ row });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Falta el id' });
      await withTx(async (client) => {
        await assertAdmin(client);
        const table = type === 'category' ? 'categories' : type === 'subcategory' ? 'subcategories' : type === 'product' ? 'products' : null;
        if (!table) throw Object.assign(new Error('Tipo de entidad desconocido'), { statusCode: 400 });
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      }, { userId: auth.userId });
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'POST, PUT, DELETE');
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en catálogo admin:', err);
    if (err.code === '23503') {
      return res.status(409).json({ error: 'No se puede borrar: hay elementos que dependen de esto (productos de esa categoría, etc.)' });
    }
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error en el catálogo' });
  }
}

// ---------- upload-image ----------
// Sube una imagen de producto real a Vercel Blob (sustituye el pegado manual
// de URL externas como único método). Recibe base64 en JSON en vez de
// multipart/form-data porque apiClient.ts solo sabe hablar JSON (ver
// src/lib/apiClient.ts) — no vale la pena añadir un segundo tipo de cliente
// HTTP solo para esto. Límite de 4MB en base64 (~3MB de imagen real), acorde
// al límite de payload de las funciones serverless de Vercel.
const MAX_UPLOAD_BASE64_CHARS = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function handleUploadImage(req, res, auth) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { filename, contentType, dataBase64 } = req.body || {};
  if (!dataBase64 || !contentType) {
    return res.status(400).json({ error: 'Faltan datos (contentType, dataBase64)' });
  }
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) {
    return res.status(400).json({ error: 'Tipo de imagen no permitido (solo JPEG, PNG o WebP)' });
  }
  if (dataBase64.length > MAX_UPLOAD_BASE64_CHARS) {
    return res.status(413).json({ error: 'La imagen es demasiado grande (máximo ~3MB)' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Almacenamiento de imágenes no configurado (falta provisionar Vercel Blob para este proyecto)' });
  }

  try {
    await withTx(async (client) => { await assertAdmin(client); }, { userId: auth.userId });

    const buffer = Buffer.from(dataBase64, 'base64');
    const safeName = (filename || 'producto').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'producto';
    const pathname = `products/${Date.now()}-${safeName}.${ext}`;
    const blob = await put(pathname, buffer, { access: 'public', contentType, addRandomSuffix: true });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('Error subiendo imagen:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'No se pudo subir la imagen' });
  }
}

// ---------- clients ----------
// Búsqueda y gestión de clientes. Sustituye a los RPC
// `admin_list_kiosk_customers` / `admin_update_kiosk_customer` /
// `admin_delete_kiosk_customer` que no existen en este esquema: aquí se
// cubre lo mismo con `search_client` (dedup profiles+kiosk_customers) más
// CRUD directo sobre `kiosk_customers` para los clientes de mostrador sin
// cuenta.
async function handleClients(req, res, auth) {
  try {
    if (req.method === 'GET') {
      const q = req.query.q || '';
      const onlyKiosk = req.query.onlyKiosk === '1';
      const clients = await withTx(async (client) => {
        await assertAdmin(client);
        if (onlyKiosk) {
          const r = await client.query(
            `SELECT phone, name, address, created_at FROM kiosk_customers
             WHERE phone ILIKE '%' || $1 || '%' OR name ILIKE '%' || $1 || '%' OR address ILIKE '%' || $1 || '%'
             ORDER BY created_at DESC`,
            [q]
          );
          return r.rows;
        }
        const r = await client.query('SELECT * FROM search_client($1)', [q]);
        return r.rows;
      }, { userId: auth.userId });
      return res.status(200).json({ clients });
    }

    if (req.method === 'PUT') {
      const { phone, name, address, originalPhone } = req.body || {};
      if (!phone) return res.status(400).json({ error: 'Falta el teléfono' });
      const row = await withTx(async (client) => {
        await assertAdmin(client);

        // Si el teléfono ya pertenece a un cliente VIP registrado en profiles,
        // no duplicamos: devolvemos la ficha del perfil registrado
        const existingProfile = await client.query(
          'SELECT id, full_name, phone, address FROM profiles WHERE phone = $1',
          [phone]
        );
        if (existingProfile.rows.length > 0) {
          const prof = existingProfile.rows[0];
          if (name && (!prof.full_name || prof.full_name === 'Sin Nombre')) {
            await client.query('UPDATE profiles SET full_name = $1 WHERE id = $2', [name, prof.id]);
          }
          return {
            id: prof.id,
            name: prof.full_name || name,
            phone: prof.phone,
            address: prof.address,
            is_registered: true
          };
        }

        if (originalPhone && originalPhone !== phone) {
          // Cambio de teléfono (clave primaria): borra la ficha antigua antes
          // de crear la nueva, para no dejar un duplicado huérfano.
          await client.query('DELETE FROM kiosk_customers WHERE phone = $1', [originalPhone]);
        }
        const r = await client.query(
          `INSERT INTO kiosk_customers (phone, name, address) VALUES ($1,$2,$3)
           ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address
           RETURNING *`,
          [phone, name || null, address || null]
        );
        return { ...r.rows[0], is_registered: false };
      }, { userId: auth.userId });
      return res.status(200).json({ client: row });
    }

    if (req.method === 'DELETE') {
      const { phone } = req.body || {};
      if (!phone) return res.status(400).json({ error: 'Falta el teléfono' });
      await withTx(async (client) => {
        await assertAdmin(client);
        await client.query('DELETE FROM kiosk_customers WHERE phone = $1', [phone]);
      }, { userId: auth.userId });
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en clientes admin:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error gestionando clientes' });
  }
}

// ---------- kiosk-add-items ----------
// Kiosko de mostrador: añade artículos a un pedido ya creado (p.ej. el
// cliente pide algo más después del ticket inicial). Reutiliza
// add_items_to_kiosk_order, que revalida cada precio contra `products`.
async function handleKioskAddItems(req, res, auth) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { orderId, items } = req.body || {};
  if (!orderId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos (orderId, items)' });
  }

  try {
    await withTx(async (client) => {
      await assertAdmin(client);
      await client.query('SELECT add_items_to_kiosk_order($1, $2)', [orderId, JSON.stringify(items)]);
    }, { userId: auth.userId });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error añadiendo artículos al pedido de kiosko:', err);
    return res.status(err.statusCode || 400).json({ error: err.message || 'No se pudieron añadir los artículos' });
  }
}

// ---------- orders ----------
// Listado y gestión de pedidos (reemplaza el canal realtime de Supabase por
// polling normal desde el frontend).
async function handleOrders(req, res, auth) {
  if (req.method === 'GET') {
    const { status, from, to } = req.query;
    try {
      const orders = await withTx(async (client) => {
        await assertAdmin(client);
        const statusList = status ? String(status).split(',').map(s => s.trim()) : null;
        const r = await client.query(
          `SELECT o.*, COALESCE(json_agg(
              json_build_object(
                'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity,
                'unit_price', oi.unit_price, 'customization_details', oi.customization_details,
                'is_sent_to_kitchen', oi.is_sent_to_kitchen, 'product_name', p.name
              ) ORDER BY oi.id
            ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS order_items
           FROM orders o
           LEFT JOIN order_items oi ON oi.order_id = o.id
           LEFT JOIN products p ON p.id = oi.product_id
           WHERE ($1::text[] IS NULL OR o.status = ANY($1::text[]))
             AND ($2::timestamptz IS NULL OR o.created_at >= $2::timestamptz)
             AND ($3::timestamptz IS NULL OR o.created_at < $3::timestamptz)
           GROUP BY o.id
           ORDER BY o.created_at DESC
           LIMIT 500`,
          [statusList, from || null, to || null]
        );
        return r.rows;
      }, { userId: auth.userId });
      return res.status(200).json({ orders });
    } catch (err) {
      console.error('Error listando pedidos (admin):', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'No se pudieron cargar los pedidos' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, status, rating, review_comment, notes, items, estimated_ready_at, payment_method } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Falta el id del pedido' });

    try {
      const updated = await withTx(async (client) => {
        await assertAdmin(client);

        const r = await client.query(
          `UPDATE orders SET
             status = COALESCE($2, status),
             rating = COALESCE($3, rating),
             review_comment = COALESCE($4, review_comment),
             notes = COALESCE($5, notes),
             estimated_ready_at = COALESCE($6, estimated_ready_at),
             payment_method = COALESCE($7, payment_method)
           WHERE id = $1
           RETURNING *`,
          [id, status || null, rating ?? null, review_comment ?? null, notes ?? null, estimated_ready_at || null, payment_method || null]
        );

        if (Array.isArray(items)) {
          for (const item of items) {
            if (!item.id) continue;
            await client.query(
              `UPDATE order_items SET
                 customization_details = COALESCE($2, customization_details),
                 is_sent_to_kitchen = COALESCE($3, is_sent_to_kitchen)
               WHERE id = $1 AND order_id = $4`,
              [item.id, item.customization_details ? JSON.stringify(item.customization_details) : null, item.is_sent_to_kitchen ?? null, id]
            );
          }
        }

        return r.rows[0];
      }, { userId: auth.userId });

      if (!updated) return res.status(404).json({ error: 'Pedido no encontrado' });
      return res.status(200).json({ order: updated });
    } catch (err) {
      console.error('Error actualizando pedido (admin):', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'No se pudo actualizar el pedido' });
    }
  }

  if (req.method === 'DELETE') {
    const { id, simulatedOnly } = req.body || {};
    try {
      await withTx(async (client) => {
        await assertAdmin(client);
        if (id) {
          await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
          await client.query('DELETE FROM orders WHERE id = $1', [id]);
        } else if (simulatedOnly) {
          // Limpieza segura de pedidos y datos de prueba
          await client.query(`
            DELETE FROM order_items 
            WHERE order_id IN (
              SELECT id FROM orders 
              WHERE client_name ILIKE '%test%' 
                 OR client_name ILIKE '%simulac%' 
                 OR client_name ILIKE '%prueba%'
                 OR client_phone IN ('600000000', '699999999', '611111111')
            )
          `);
          await client.query(`
            DELETE FROM orders 
            WHERE client_name ILIKE '%test%' 
               OR client_name ILIKE '%simulac%' 
               OR client_name ILIKE '%prueba%'
               OR client_phone IN ('600000000', '699999999', '611111111')
          `);
          await client.query(`
            DELETE FROM kiosk_customers 
            WHERE name ILIKE '%test%' 
               OR name ILIKE '%simulac%' 
               OR name ILIKE '%prueba%'
               OR phone IN ('600000000', '699999999', '611111111')
          `);
        }
      }, { userId: auth.userId });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error eliminando pedido (admin):', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'No se pudo eliminar el pedido' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ error: 'Método no permitido' });
}

// ---------- settings ----------
// Ajustes de tienda (abrir/cerrar, tarifa de envío, pedido mínimo, tiempo de
// preparación) y horario semanal (store_hours).
async function handleSettings(req, res, auth) {
  try {
    if (req.method === 'GET') {
      const data = await withTx(async (client) => {
        await assertAdmin(client);
        const settings = await client.query('SELECT * FROM store_settings WHERE id = 1');
        const hours = await client.query('SELECT * FROM store_hours ORDER BY day_of_week');
        return { settings: settings.rows[0], hours: hours.rows };
      }, { userId: auth.userId });
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { settings, hours } = req.body || {};
      const result = await withTx(async (client) => {
        await assertAdmin(client);
        let updatedSettings = null;
        if (settings) {
          const r = await client.query(
            `UPDATE store_settings SET
               delivery_fee = COALESCE($1, delivery_fee),
               min_order_delivery = COALESCE($2, min_order_delivery),
               is_store_open = COALESCE($3, is_store_open),
               estimated_prep_time = COALESCE($4, estimated_prep_time),
               saturation_mode = COALESCE($5, saturation_mode),
               business_name = COALESCE($6, business_name),
               business_legal_name = COALESCE($7, business_legal_name),
               business_cif = COALESCE($8, business_cif),
               business_phone = COALESCE($9, business_phone),
               business_whatsapp = COALESCE($10, business_whatsapp),
               business_email = COALESCE($11, business_email),
               business_address = COALESCE($12, business_address),
               business_city = COALESCE($13, business_city),
               business_postal_code = COALESCE($14, business_postal_code)
             WHERE id = 1 RETURNING *`,
            [
              settings.delivery_fee, settings.min_order_delivery, settings.is_store_open, settings.estimated_prep_time, settings.saturation_mode,
              settings.business_name, settings.business_legal_name, settings.business_cif, settings.business_phone,
              settings.business_whatsapp, settings.business_email, settings.business_address, settings.business_city, settings.business_postal_code
            ]
          );
          updatedSettings = r.rows[0];
        }
        if (Array.isArray(hours)) {
          for (const h of hours) {
            await client.query(
              `INSERT INTO store_hours (day_of_week, is_open, open_time, close_time)
               VALUES ($1,$2,$3,$4)
               ON CONFLICT (day_of_week) DO UPDATE SET is_open = EXCLUDED.is_open, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time`,
              [h.day_of_week, h.is_open, h.open_time || null, h.close_time || null]
            );
          }
        }
        return updatedSettings;
      }, { userId: auth.userId });
      return res.status(200).json({ settings: result });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en ajustes admin:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error en los ajustes' });
  }
}

// ---------- upsells ----------
// Sugerencias de venta cruzada (upsell) mostradas antes del checkout.
async function handleUpsells(req, res, auth) {
  try {
    if (req.method === 'GET') {
      const upsells = await withTx(async (client) => {
        await assertAdmin(client);
        const r = await client.query(
          `SELECT u.id, u.category, u.sort_order, u.product_id,
                  json_build_object('name', p.name, 'price', p.price, 'image_url', p.image_url, 'is_available', p.is_available) AS products
           FROM upsells u
           JOIN products p ON p.id = u.product_id
           ORDER BY u.sort_order ASC`
        );
        return r.rows;
      }, { userId: auth.userId });
      return res.status(200).json({ upsells });
    }

    if (req.method === 'POST') {
      const { product_id, category, sort_order } = req.body || {};
      if (!product_id || !category) return res.status(400).json({ error: 'Faltan datos (product_id, category)' });
      const row = await withTx(async (client) => {
        await assertAdmin(client);
        const r = await client.query(
          `INSERT INTO upsells (product_id, category, sort_order) VALUES ($1,$2,COALESCE($3,0)) RETURNING *`,
          [product_id, category, sort_order]
        );
        return r.rows[0];
      }, { userId: auth.userId });
      return res.status(200).json({ upsell: row });
    }

    if (req.method === 'PUT') {
      const { id, product_id, category, sort_order } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Falta el id' });
      const row = await withTx(async (client) => {
        await assertAdmin(client);
        const r = await client.query(
          `UPDATE upsells SET product_id = COALESCE($2, product_id), category = COALESCE($3, category), sort_order = COALESCE($4, sort_order)
           WHERE id = $1 RETURNING *`,
          [id, product_id, category, sort_order]
        );
        return r.rows[0];
      }, { userId: auth.userId });
      if (!row) return res.status(404).json({ error: 'No encontrado' });
      return res.status(200).json({ upsell: row });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Falta el id' });
      await withTx(async (client) => {
        await assertAdmin(client);
        await client.query('DELETE FROM upsells WHERE id = $1', [id]);
      }, { userId: auth.userId });
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en upsells admin:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error gestionando upsells' });
  }
}

export default async function handler(req, res) {
  let auth;
  try {
    auth = requireAuth(req);
  } catch (e) {
    return res.status(e.statusCode || 401).json({ error: e.message });
  }

  const { action } = req.query || {};
  switch (action) {
    case 'analytics': return handleAnalytics(req, res, auth);
    case 'catalog': return handleCatalog(req, res, auth);
    case 'upload-image': return handleUploadImage(req, res, auth);
    case 'clients': return handleClients(req, res, auth);
    case 'kiosk-add-items': return handleKioskAddItems(req, res, auth);
    case 'orders': return handleOrders(req, res, auth);
    case 'settings': return handleSettings(req, res, auth);
    case 'upsells': return handleUpsells(req, res, auth);
    default: return res.status(404).json({ error: 'Acción desconocida' });
  }
}
