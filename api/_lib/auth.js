import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// Autenticación propia (sin Supabase Auth): JWT firmado con APP_JWT_SECRET +
// contraseñas con bcrypt. El navegador solo guarda el JWT — nunca la
// contraseña ni su hash.

const SECRET = process.env.APP_JWT_SECRET;
const EXPIRES_IN = '30d';

function signToken(profile) {
  if (!SECRET) throw new Error('Falta la variable de entorno APP_JWT_SECRET');
  return jwt.sign(
    { sub: profile.id, isAdmin: !!profile.is_admin },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

function verifyToken(token) {
  if (!SECRET) throw new Error('Falta la variable de entorno APP_JWT_SECRET');
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

// Extrae y verifica el JWT de la cabecera Authorization: Bearer <token>.
// Devuelve { userId, isAdmin } o null si no hay token válido.
function getAuth(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.sub) return null;
  return { userId: payload.sub, isAdmin: !!payload.isAdmin };
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export { signToken, verifyToken, getAuth, hashPassword, verifyPassword };
