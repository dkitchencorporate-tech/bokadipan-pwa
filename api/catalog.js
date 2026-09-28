import { withTx } from './_lib/db.js';
import { getAuth } from './_lib/auth.js';
// Catálogo público: cualquier visitante puede leerlo sin autenticarse.
// products/categories tienen RLS de SELECT abierto (USING (true)), así que
// esta consulta funciona igual con o sin `app.current_user_id` fijado.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const auth = getAuth(req);
  const includeUnavailable = req.query.all === '1' && auth && auth.isAdmin;

  try {
    const data = await withTx(async (client) => {
      const categories = await client.query('SELECT * FROM categories ORDER BY sort_order, name');
      const subcategories = await client.query('SELECT * FROM subcategories ORDER BY sort_order, name');
      const products = await client.query(
        includeUnavailable
          ? 'SELECT * FROM products ORDER BY sort_order, name'
          : 'SELECT * FROM products WHERE is_available = true ORDER BY sort_order, name'
      );
      const settings = await client.query('SELECT * FROM store_settings WHERE id = 1');
      const hours = await client.query('SELECT * FROM store_hours ORDER BY day_of_week');
      const upsells = await client.query(
        `SELECT u.id, u.category, u.sort_order, u.product_id,
                json_build_object('id', p.id, 'name', p.name, 'price', p.price, 'description', p.description, 'is_available', p.is_available) AS products
         FROM upsells u JOIN products p ON p.id = u.product_id
         WHERE p.is_available = true
         ORDER BY u.sort_order`
      );
      const productsList = products.rows.map(p => {
        const customBadge = p.customization_schema && typeof p.customization_schema === 'object' ? p.customization_schema.badge : null;
        return {
          ...p,
          badge: customBadge || p.badge || p.name
        };
      });

      return {
        categories: categories.rows,
        subcategories: subcategories.rows,
        products: productsList,
        settings: settings.rows[0] || null,
        hours: hours.rows,
        upsells: upsells.rows
      };
    }, auth ? { userId: auth.userId } : {});

    if (includeUnavailable || req.query.all === '1') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2, stale-while-revalidate=5');
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error cargando catálogo:', err);
    return res.status(500).json({ error: 'No se pudo cargar el catálogo' });
  }
};
