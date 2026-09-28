import pg from 'pg';
// Conexión compartida a Neon/Postgres para todos los endpoints de api/*.js.
//
// IMPORTANTE: esto usa APP_DATABASE_URL (rol de app de Neon, SIN privilegio de
// BYPASSRLS), nunca DATABASE_URL (rol `neondb_owner`, que Neon marca
// BYPASSRLS por defecto y por tanto ignoraría por completo las políticas RLS
// definidas en la base de datos). Ver el comentario de cabecera del esquema
// SQL para el detalle de la decisión de arquitectura RLS + sesión de app.
const { Pool, types } = pg;

// `pg` devuelve NUMERIC/DECIMAL (precios, totales...) como string por
// defecto, para no perder precisión — pero el frontend (heredado de un
// backend PostgREST/Supabase que sí serializaba numeric como número JSON)
// hace aritmética directa asumiendo `number`. Se homogeniza aquí, una única
// vez, para todo el pool: OID 1700 = numeric.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.APP_DATABASE_URL;
    if (!connectionString) {
      throw new Error('Falta la variable de entorno APP_DATABASE_URL');
    }
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

// Ejecuta `fn(client)` dentro de una transacción. Si `userId` viene informado
// (del JWT ya verificado por el llamante), fija `app.current_user_id` con
// SET LOCAL para que las políticas RLS puedan aplicar "es su propia fila".
// Si `bypass` es true, además fija `app.bypass_rls = on` — solo debe usarse
// desde código de servidor de confianza (nunca a partir de un valor que
// venga directamente del cliente).
async function withTx(fn, { userId = null, bypass = false } = {}) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (userId) {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
    }
    if (bypass) {
      await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

export { getPool, withTx };
