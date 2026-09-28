// Rate Limiter en memoria para Serverless (Vercel Functions)
// Blindaje contra ataques de fuerza bruta y saturación DoS de endpoints sensibles

const ipBuckets = new Map();

// Limpieza periódica automática de entradas caducadas para preservar memoria
if (typeof setInterval !== 'undefined') {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipBuckets.entries()) {
      if (record.expiresAt < now) {
        ipBuckets.delete(key);
      }
    }
  }, 60000);
  if (cleanup.unref) cleanup.unref();
}

/**
 * Verifica si una petición excede el límite de tasa permitido.
 * @param {Object} req - Objeto de petición HTTP
 * @param {Object} options - { key: string, limit: number, windowMs: number }
 * @returns {Object} { ok: boolean, remaining?: number, retryAfterSec?: number }
 */
export function checkRateLimit(req, { key = 'global', limit = 10, windowMs = 60000 } = {}) {
  // Extraer IP real del cliente detrás de proxies Vercel / Cloudflare
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null)
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || '127.0.0.1';

  const bucketKey = `${key}:${ip}`;
  const now = Date.now();

  const record = ipBuckets.get(bucketKey);
  if (!record || record.expiresAt < now) {
    ipBuckets.set(bucketKey, { count: 1, expiresAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  record.count++;
  return { ok: true, remaining: limit - record.count };
}
