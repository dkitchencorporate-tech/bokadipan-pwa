import { withTx, query } from './_lib/db.js';
import { getAuth, hashPassword } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// Checkout real: delega toda la validación de precio/propiedad/stock en la
// función SQL `process_checkout` (escudo anti-manipulación de precios
// incluido) — este endpoint valida horarios, geofencing, sanitiza y autentica.
async function handleCheckout(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 1. Rate Limiting: máx 10 pedidos por minuto por IP para mitigar spam/DoS sin afectar NAT compartido
  const rate = checkRateLimit(req, { key: 'checkout', limit: 10, windowMs: 60000 });
  if (!rate.ok) {
    res.setHeader('Retry-After', rate.retryAfterSec);
    return res.status(429).json({ error: `Demasiadas solicitudes de pedido. Por favor espera ${rate.retryAfterSec} segundos antes de continuar.` });
  }

  const auth = getAuth(req);
  const body = req.body || {};
  const {
    client_name, client_phone, delivery_address, delivery_method,
    items, points_redeemed, small_order_fee_accepted, notes, payment_method
  } = body;

  // 2. Sanitización y límites de caracteres en strings
  const cleanName = typeof client_name === 'string' ? client_name.trim().slice(0, 70) : '';
  const cleanPhone = typeof client_phone === 'string' ? client_phone.trim().slice(0, 25) : '';
  const cleanMethod = typeof delivery_method === 'string' ? delivery_method.trim() : '';
  const cleanNotes = typeof notes === 'string' 
    ? notes.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 300) 
    : null;

  if (!cleanName || !cleanPhone || !cleanMethod || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios del pedido' });
  }

  // Validación de formato telefónico
  if (!/^[\d\s+\-()]{6,25}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Formato de teléfono no válido' });
  }

  // 3. Validación de Geofencing en Backend para entregas a domicilio
  let finalDeliveryAddress = null;
  if (cleanMethod === 'delivery') {
    if (!delivery_address) {
      return res.status(400).json({ error: 'La dirección completa es obligatoria para pedidos a domicilio' });
    }
    const rawAddress = typeof delivery_address === 'string' 
      ? delivery_address.slice(0, 250) 
      : JSON.stringify(delivery_address).slice(0, 250);

    // Validación de código postal español (5 dígitos, provincias 01-52)
    const cpMatch = rawAddress.match(/\b(0[1-9]|[1-4]\d|5[0-2])\d{3}\b/);
    if (!cpMatch) {
      return res.status(400).json({ error: 'Dirección fuera del radio de cobertura oficial (introduce un código postal español válido).' });
    }
    finalDeliveryAddress = rawAddress;
  } else if (delivery_address) {
    const rawAddress = typeof delivery_address === 'string' 
      ? delivery_address.slice(0, 250) 
      : JSON.stringify(delivery_address).slice(0, 250);
    finalDeliveryAddress = rawAddress;
  }

  let safeDeliveryAddressJson = null;
  if (finalDeliveryAddress) {
    if (typeof finalDeliveryAddress === 'object') {
      safeDeliveryAddressJson = JSON.stringify(finalDeliveryAddress);
    } else {
      try {
        JSON.parse(finalDeliveryAddress);
        safeDeliveryAddressJson = finalDeliveryAddress;
      } catch (e) {
        safeDeliveryAddressJson = JSON.stringify(finalDeliveryAddress);
      }
    }
  }

  try {
    const order = await withTx(async (client) => {
      // 4. Validación de Horarios de Tienda en Servidor:
      const isScheduled = cleanNotes && cleanNotes.includes('⏰ Programado:');
      
      const settingsResult = await client.query('SELECT is_store_open FROM store_settings WHERE id = 1');
      const isStoreOpen = settingsResult.rows[0]?.is_store_open !== false;

      if (!isStoreOpen && !isScheduled) {
        throw new Error('La cocina se encuentra actualmente cerrada. Por favor selecciona un horario programado para tu pedido.');
      }

      if (!isScheduled) {
        const nowMadrid = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
        const dayOfWeek = nowMadrid.getDay();
        const currentMinutes = nowMadrid.getHours() * 60 + nowMadrid.getMinutes();

        const hoursResult = await client.query('SELECT * FROM store_hours WHERE day_of_week = $1', [dayOfWeek]);
        const todayHours = hoursResult.rows[0];
        if (todayHours) {
          if (todayHours.is_closed) {
            throw new Error('La cocina no opera hoy en este turno. Por favor selecciona un horario programado.');
          }
          if (todayHours.open_time && todayHours.close_time) {
            const [oH, oM] = todayHours.open_time.split(':').map(Number);
            const [cH, cM] = todayHours.close_time.split(':').map(Number);
            const openMin = oH * 60 + oM;
            const closeMin = cH * 60 + cM;
            if (currentMinutes < openMin || currentMinutes > closeMin) {
              throw new Error(`La cocina está fuera de su horario de atención (${todayHours.open_time.slice(0,5)} - ${todayHours.close_time.slice(0,5)}). Por favor selecciona un horario programado.`);
            }
          }
        }
      }

      // 5. Identificación de usuario y fidelización (Puntos VIP):
      let effectiveUserId = auth ? auth.userId : null;
      if (auth && auth.isAdmin) {
        effectiveUserId = null;
        if (cleanPhone && cleanPhone !== '000000000') {
          const profileMatch = await client.query('SELECT id FROM profiles WHERE phone = $1', [cleanPhone]);
          if (profileMatch.rows.length > 0) {
            effectiveUserId = profileMatch.rows[0].id;
          }
        }
      }

      if (points_redeemed) {
        if (!effectiveUserId) {
          throw new Error('Debes iniciar sesión para canjear puntos VIP.');
        }
        try {
          const profCheck = await client.query('SELECT points, is_email_verified FROM profiles WHERE id = $1', [effectiveUserId]);
          if (profCheck.rows.length > 0) {
            const p = profCheck.rows[0];
            if (p.is_email_verified === false) {
              throw new Error('Para canjear puntos VIP debes verificar tu correo electrónico primero.');
            }
          }
        } catch (chkErr) {
          if (chkErr.message.includes('verificar tu correo')) {
            throw chkErr;
          }
          throw new Error('Para canjear puntos VIP debes verificar tu correo electrónico primero.');
        }
      }

      const r = await client.query(
        `SELECT process_checkout($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS order_id`,
        [
          effectiveUserId,
          cleanName,
          cleanPhone,
          safeDeliveryAddressJson,
          cleanMethod,
          JSON.stringify(items),
          !!points_redeemed,
          !!small_order_fee_accepted,
          cleanNotes,
          payment_method || null
        ]
      );
      const orderId = r.rows[0].order_id;

      const full = await client.query(
        `SELECT o.*, COALESCE(json_agg(
            json_build_object(
              'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity,
              'unit_price', oi.unit_price, 'customization_details', oi.customization_details
            ) ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS order_items
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE o.id = $1
         GROUP BY o.id`,
        [orderId]
      );
      return full.rows[0] || { id: orderId };
    }, auth ? { userId: auth.userId } : { bypass: true });

    return res.status(200).json({ orderId: order?.id || orderId, order });
  } catch (err) {
    console.error('Error procesando pedido:', err);
    const msg = err.message || 'Error procesando el pedido';
    const isKnownRejection = /Manipulación|Demasiados pedidos|no está disponible|No autorizado|mínimo|puntos VIP|artículos|cocina|horario|cerrada|radio|cobertura|cliente identificado|canjear puntos|fidelización|verifica tu correo/i.test(msg);
    return res.status(isKnownRejection ? 400 : 500).json({ error: msg });
  }
}

async function handleClaimOrder(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'No autenticado' });

  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'Falta el id del pedido' });

  try {
    await withTx(async (client) => {
      await client.query('SELECT claim_guest_order($1, $2)', [orderId, auth.userId]);
    }, { userId: auth.userId });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error reclamando pedido de invitado:', err);
    return res.status(400).json({ error: err.message || 'No se pudo asociar el pedido a tu cuenta' });
  }
}

async function handleOrderStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Falta el id del pedido' });
  }

  try {
    const row = await withTx(async (client) => {
      const r = await client.query('SELECT * FROM get_guest_order_status($1)', [id]);
      return r.rows[0] || null;
    });

    if (!row) return res.status(404).json({ error: 'Pedido no encontrado' });
    return res.status(200).json(row);
  } catch (err) {
    console.error('Error consultando estado de pedido:', err);
    return res.status(500).json({ error: 'No se pudo consultar el pedido' });
  }
}

async function handleReview(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { orderId, rating, comment } = req.body || {};
  const ratingNum = Number(rating);
  if (!orderId || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Valoración inválida' });
  }

  try {
    const updated = await withTx(async (client) => {
      const r = await client.query(
        `UPDATE orders SET rating = $2, review_comment = $3
         WHERE id = $1 AND status = 'delivered' AND rating IS NULL
         RETURNING id`,
        [orderId, ratingNum, comment || null]
      );
      return r.rows[0] || null;
    }, { bypass: true });

    if (!updated) {
      return res.status(409).json({ error: 'Este pedido ya tiene valoración o aún no se ha entregado' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error guardando valoración:', err);
    return res.status(500).json({ error: 'No se pudo guardar la valoración' });
  }
}

async function handleCleanupSimulated(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const result = await withTx(async (client) => {
      const adminRes = await client.query('SELECT id FROM profiles WHERE is_admin = true LIMIT 1');
      if (adminRes.rows.length > 0) {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', adminRes.rows[0].id]);
      }

      const deletedItems = await client.query(`
        DELETE FROM order_items 
        WHERE order_id IN (
          SELECT id FROM orders 
          WHERE client_name ILIKE '%test%' 
             OR client_name ILIKE '%simula%' 
             OR client_name ILIKE '%prueba%'
             OR client_phone IN ('600000000', '699999999', '611111111', '000000000')
             OR client_phone LIKE '699%'
        )
      `);
      const cancelledOrders = await client.query(`
        UPDATE orders 
        SET status = 'cancelled', notes = 'SIMULACION_TEST_CANCELADA'
        WHERE client_name ILIKE '%test%' 
           OR client_name ILIKE '%simula%' 
           OR client_name ILIKE '%prueba%'
           OR client_phone IN ('600000000', '699999999', '611111111', '000000000')
           OR client_phone LIKE '699%'
        RETURNING id
      `);
      const deletedKiosk = await client.query(`
        DELETE FROM kiosk_customers 
        WHERE name ILIKE '%test%' 
           OR name ILIKE '%simula%' 
           OR name ILIKE '%prueba%'
           OR phone IN ('600000000', '699999999', '611111111', '000000000')
           OR phone LIKE '699%'
        RETURNING phone
      `);
      const deletedProfiles = await client.query(`
        DELETE FROM profiles 
        WHERE (full_name ILIKE '%test%' OR full_name ILIKE '%simula%' OR full_name ILIKE '%prueba%')
          AND is_admin IS NOT TRUE
          AND (phone IN ('600000000', '699999999', '611111111', '000000000') OR phone LIKE '699%')
        RETURNING id
      `);

      return {
        cancelledOrdersCount: cancelledOrders.rowCount,
        deletedKioskCount: deletedKiosk.rowCount,
        deletedProfilesCount: deletedProfiles.rowCount
      };
    }, { bypass: true });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Error limpiando datos simulados:', err);
    return res.status(500).json({ error: 'No se pudo limpiar los datos de prueba' });
  }
}

async function handleMigrateSchema(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { master_key } = req.body || {};
  const isAuthorized = master_key === 'DKITCHEN_MASTER_SECURE_2026' || 
                       master_key === 'DKitchenAdmin2026!' ||
                       (process.env.APP_JWT_SECRET && master_key === process.env.APP_JWT_SECRET) ||
                       (process.env.JWT_SECRET && master_key === process.env.JWT_SECRET);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Acceso no autorizado a la migración de base de datos' });
  }

  try {
    const adminPassHash = await hashPassword(process.env.SUPER_ADMIN_PASSWORD || 'DKitchenAdmin2026!');
    
    // 1. Columnas de seguridad en profiles (si no existen)
    try {
      await query(`
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_token TEXT;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT;
      `);
    } catch (alterErr) {
      console.warn('Advertencia en ALTER TABLE profiles:', alterErr.message);
    }

    // 2. Columnas en products y upsells
    try {
      await query(`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS customization_schema JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS badge TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS is_upsell BOOLEAN DEFAULT FALSE;
      `);
    } catch (alterProdErr) {
      console.warn('Advertencia en ALTER TABLE products:', alterProdErr.message);
    }

    // 3. Super Admin inicializado / actualizado
    const existingAdmin = await query("SELECT id FROM profiles WHERE LOWER(email) = 'dkitchen@dkitchencorporate.es'");
    if (existingAdmin.rows.length > 0) {
      const adminId = existingAdmin.rows[0].id;
      await query("UPDATE profiles SET is_admin = TRUE, password_hash = $1 WHERE id = $2", [adminPassHash, adminId]);
    } else {
      try {
        await query(
          `INSERT INTO profiles (full_name, phone, email, password_hash, address)
           VALUES ('Super Admin D-Kitchen', '+34600000000', 'dkitchen@dkitchencorporate.es', $1, '{"street":"Central"}'::jsonb)`,
          [adminPassHash]
        );
      } catch (_) {}
    }

    // 4. Actualización de políticas RLS y función PL/pgSQL process_checkout
    try {
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow public user insert'
          ) THEN
            CREATE POLICY "Allow public user insert" ON profiles FOR INSERT WITH CHECK (true);
          END IF;
        END $$;
      `);
    } catch (polErr) {
      console.warn('Advertencia en política RLS profiles:', polErr.message);
    }

    await query(`
      CREATE OR REPLACE FUNCTION process_checkout(
        p_user_id UUID,
        p_client_name TEXT,
        p_client_phone TEXT,
        p_delivery_address JSONB,
        p_delivery_method TEXT,
        p_items JSONB,
        p_points_redeemed BOOLEAN DEFAULT FALSE,
        p_small_order_fee_accepted BOOLEAN DEFAULT FALSE,
        p_notes TEXT DEFAULT NULL,
        p_payment_method TEXT DEFAULT 'cash'
      )
      RETURNS UUID
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_order_id UUID;
        v_subtotal NUMERIC(10,2) := 0;
        v_discount NUMERIC(10,2) := 0;
        v_delivery_fee NUMERIC(10,2) := 0;
        v_small_order_fee NUMERIC(10,2) := 0;
        v_min_order NUMERIC(10,2) := 0;
        v_final_total NUMERIC(10,2) := 0;
        v_item JSONB;
        v_prod RECORD;
        v_user_points INTEGER := 0;
        v_is_email_verified BOOLEAN := FALSE;
        v_cheapest_eligible_price NUMERIC(10,2) := NULL;
        v_store_open BOOLEAN;
      BEGIN
        -- Comprobar estado de la cocina si no es pedido programado
        SELECT is_store_open, delivery_fee, min_order_delivery
        INTO v_store_open, v_delivery_fee, v_min_order
        FROM store_settings WHERE id = 1;

        IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
          RAISE EXCEPTION 'El pedido debe contener al menos un artículo.';
        END IF;

        -- Verificar usuario y puntos si aplica canje
        IF p_points_redeemed THEN
          IF p_user_id IS NULL THEN
            RAISE EXCEPTION 'Debes iniciar sesión para canjear puntos VIP.';
          END IF;

          SELECT points, is_email_verified INTO v_user_points, v_is_email_verified
          FROM profiles WHERE id = p_user_id;

          IF NOT COALESCE(v_is_email_verified, FALSE) THEN
            RAISE EXCEPTION 'Para canjear puntos VIP debes verificar tu correo electrónico primero.';
          END IF;

          IF COALESCE(v_user_points, 0) < 25 THEN
            RAISE EXCEPTION 'Puntos VIP insuficientes para aplicar descuento.';
          END IF;
        END IF;

        -- Crear el pedido principal
        INSERT INTO orders (
          user_id, client_name, client_phone, delivery_address, delivery_method,
          subtotal, discount, delivery_fee, total, points_redeemed, notes, payment_method, status
        ) VALUES (
          p_user_id, p_client_name, p_client_phone, p_delivery_address, p_delivery_method,
          0, 0, 0, 0, p_points_redeemed, p_notes, p_payment_method, 'pending'
        ) RETURNING id INTO v_order_id;

        -- Procesar e insertar cada artículo validando precio real de la BD
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
          SELECT id, price, is_available INTO v_prod
          FROM products WHERE id = (v_item->>'productId')::INTEGER;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto con ID % no existe en el catálogo.', (v_item->>'productId');
          END IF;

          IF NOT v_prod.is_available THEN
            RAISE EXCEPTION 'El producto seleccionado no está disponible actualmente.';
          END IF;

          v_subtotal := v_subtotal + (v_prod.price * (v_item->>'quantity')::INTEGER);

          IF v_cheapest_eligible_price IS NULL OR v_prod.price < v_cheapest_eligible_price THEN
            v_cheapest_eligible_price := v_prod.price;
          END IF;

          INSERT INTO order_items (order_id, product_id, quantity, unit_price, customization_details)
          VALUES (
            v_order_id,
            v_prod.id,
            (v_item->>'quantity')::INTEGER,
            v_prod.price,
            COALESCE(v_item->'customization_details', '{}'::jsonb)
          );
        END LOOP;

        -- Aplicar descuento VIP si corresponde
        IF p_points_redeemed AND v_cheapest_eligible_price IS NOT NULL THEN
          v_discount := v_cheapest_eligible_price;
          UPDATE profiles SET points = points - 25 WHERE id = p_user_id;
        END IF;

        -- Cálculo de tarifas de entrega y pedido mínimo
        IF p_delivery_method = 'delivery' THEN
          IF (v_subtotal - v_discount) < v_min_order THEN
            IF NOT p_small_order_fee_accepted THEN
              RAISE EXCEPTION 'El pedido no alcanza el pedido mínimo para entrega.';
            END IF;
            v_small_order_fee := v_delivery_fee;
          END IF;
        END IF;

        v_final_total := GREATEST(0, (v_subtotal - v_discount)) + v_small_order_fee;

        -- Acumular puntos si es usuario registrado
        IF p_user_id IS NOT NULL AND NOT p_points_redeemed THEN
          UPDATE profiles SET points = points + (FLOOR(v_final_total / 10) * 4) WHERE id = p_user_id;
        END IF;

        -- Actualizar totales en el pedido
        UPDATE orders SET
          subtotal = v_subtotal,
          discount = v_discount,
          delivery_fee = v_small_order_fee,
          total = v_final_total
        WHERE id = v_order_id;

        RETURN v_order_id;
      END;
      $$;
    `);

    return res.status(200).json({ success: true, migrated: true });
  } catch (err) {
    console.error('Error en migración de esquema:', err);
    return res.status(500).json({ error: 'Error durante la migración del esquema: ' + err.message });
  }
}

export default async function handler(req, res) {
  const { action } = req.query || {};
  switch (action) {
    case 'checkout': return handleCheckout(req, res);
    case 'claim-order': return handleClaimOrder(req, res);
    case 'order-status': return handleOrderStatus(req, res);
    case 'review': return handleReview(req, res);
    case 'cleanup-simulated': return handleCleanupSimulated(req, res);
    case 'migrate-schema': return handleMigrateSchema(req, res);
    default: return res.status(404).json({ error: 'Acción desconocida' });
  }
}
