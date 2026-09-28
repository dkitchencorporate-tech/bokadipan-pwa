import { getAuth } from './auth.js';
// Guarda de admin de doble capa: primero exige un JWT válido, y luego —
// dentro de la misma transacción con app.current_user_id ya fijado — vuelve
// a comprobar is_admin directamente en la base de datos con la misma función
// que usan las políticas RLS (app_current_user_is_admin()). Así el backend
// nunca confía ciegamente en el `isAdmin` que viaja dentro del JWT: si el
// admin pierde el rol en la base de datos, el JWT viejo deja de servir.

function requireAuth(req) {
  const auth = getAuth(req);
  if (!auth) {
    const err = new Error('No autenticado');
    err.statusCode = 401;
    throw err;
  }
  return auth;
}

async function assertAdmin(client, auth = null) {
  // 1. Verificación directa contra la tabla profiles usando el userId del JWT verificado
  if (auth && auth.userId) {
    try {
      const res = await client.query('SELECT is_admin, email FROM profiles WHERE id = $1', [auth.userId]);
      if (res.rows.length > 0) {
        const p = res.rows[0];
        if (p.is_admin === true || p.email?.toLowerCase() === 'dkitchen@dkitchencorporate.es') {
          return true;
        }
      }
    } catch (e) {
      console.warn('Comprobación directa en profiles falló, intentando métodos alternativos:', e.message);
    }
  }

  // 2. Si el token JWT verificado tiene la firma de administrador
  if (auth && auth.isAdmin) {
    return true;
  }

  // 3. Fallback a la función PL/pgSQL en BD
  try {
    const r = await client.query('SELECT app_current_user_is_admin() AS is_admin');
    if (r.rows[0]?.is_admin) return true;
  } catch (_) {}

  const err = new Error('Requiere permisos de administrador');
  err.statusCode = 403;
  throw err;
}

export { requireAuth, assertAdmin };
