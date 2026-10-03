import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { withTx, query } from './_lib/db.js';
import { signToken, verifyPassword, hashPassword, getAuth } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

const BRAND_NAME = process.env.BRAND_NAME || 'D-Kitchen White-Label';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'dkitchen@dkitchencorporate.es';
const MASTER_TOTP_SECRET = process.env.SUPER_ADMIN_TOTP_SECRET || null;

function sanitizeProfile(p) {
  if (!p) return null;
  const { password_hash, email_verification_token, admin_2fa_code, totp_secret, ...rest } = p;
  return rest;
}

// Base32 decode y validación RFC 6238 TOTP (Google Authenticator / Authy / Microsoft Authenticator)
function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let cleaned = String(base32).replace(/=+$/, '').toUpperCase().replace(/[\s-]/g, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    let val = alphabet.indexOf(cleaned.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  let bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

function getTOTP(secretBase32, timeOffsetSteps = 0) {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const counter = Math.floor(epoch / timeStep) + timeOffsetSteps;
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24 |
                (hmac[offset + 1] & 0xff) << 16 |
                (hmac[offset + 2] & 0xff) << 8 |
                (hmac[offset + 3] & 0xff)) % 1000000;
  return code.toString().padStart(6, '0');
}

function verifyTOTP(token, secretBase32) {
  const cleanToken = String(token).trim();
  for (let step = -1; step <= 1; step++) {
    if (getTOTP(secretBase32, step) === cleanToken) {
      return true;
    }
  }
  return false;
}

async function sendSmtpEmail({ to, subject, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !to) {
    return false;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: `"${BRAND_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    return true;
  } catch (e) {
    console.error('Error enviando email directo desde account.js:', e);
    return false;
  }
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Protección anti-fuerza bruta: máx 5 intentos de login cada 5 minutos por IP
  const rate = checkRateLimit(req, { key: 'login', limit: 5, windowMs: 300000 });
  if (!rate.ok) {
    res.setHeader('Retry-After', rate.retryAfterSec);
    return res.status(429).json({ error: `Demasiados intentos de acceso. Por favor espera ${rate.retryAfterSec} segundos antes de reintentar.` });
  }

  const { identifier, email, phone, password } = req.body || {};
  const loginId = identifier || email || phone;
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  try {
    const cleanLogin = String(loginId).trim().toLowerCase();
    const isSuperAdmin = cleanLogin === SUPER_ADMIN_EMAIL;

    let profile = null;
    try {
      profile = await withTx(async (client) => {
        const r = await client.query(
          'SELECT * FROM profiles WHERE LOWER(phone) = LOWER($1) OR LOWER(email) = LOWER($1)',
          [cleanLogin]
        );
        return r.rows[0] || null;
      }, {});
    } catch (dbErr) {
      console.warn('Error buscando perfil en login:', dbErr.message);
    }

    if (isSuperAdmin) {
      const isSuperPass = process.env.SUPER_ADMIN_PASSWORD ? password === process.env.SUPER_ADMIN_PASSWORD : false;
      const isHashMatch = profile?.password_hash ? await verifyPassword(password, profile.password_hash) : false;
      if (!isSuperPass && !isHashMatch) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      return res.status(200).json({
        requires_2fa: true,
        auth_type: 'totp',
        email_hint: SUPER_ADMIN_EMAIL.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        message: 'Introduce el código de 6 dígitos de tu aplicación Google Authenticator'
      });
    }

    if (!profile) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const ok = await verifyPassword(password, profile.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = signToken(profile);
    return res.status(200).json({ token, profile: sanitizeProfile(profile) });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'No se pudo iniciar sesión. Inténtalo de nuevo.' });
  }
}

async function handleVerifyAdmin2FA(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ error: 'Falta el correo o el código de autenticación' });
  }

  const rate2fa = checkRateLimit(req, { key: 'verify-2fa', limit: 5, windowMs: 300000 });
  if (!rate2fa.ok) {
    res.setHeader('Retry-After', rate2fa.retryAfterSec);
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim();

  try {
    let profile = null;
    try {
      profile = await withTx(async (client) => {
        const r = await client.query('SELECT * FROM profiles WHERE LOWER(email) = $1', [cleanEmail]);
        return r.rows[0] || null;
      }, {});
    } catch (e) {
      console.warn('Error en consulta profiles en 2FA:', e.message);
    }

    // Solo perfiles reales que ya son administradores en la BD.
    const targetProfile = profile && profile.is_admin ? profile : null;

    if (!targetProfile) {
      return res.status(404).json({ error: 'Usuario administrador no encontrado' });
    }

    const secretToUse = targetProfile.totp_secret || MASTER_TOTP_SECRET;
    const isValidTOTP = !!secretToUse && verifyTOTP(cleanCode, secretToUse);

    if (!isValidTOTP) {
      return res.status(401).json({ error: 'Código 2FA incorrecto o expirado.' });
    }

    // Emitir Token de Sesión Completo para Administrador
    const token = signToken({ ...targetProfile, is_admin: true });
    return res.status(200).json({ token, profile: sanitizeProfile({ ...targetProfile, is_admin: true }) });
  } catch (err) {
    console.error('Error verificando 2FA TOTP:', err);
    return res.status(500).json({ error: 'Error durante la verificación del código de seguridad.' });
  }
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { full_name, phone, email, password, address } = req.body || {};

  if (!full_name || !phone || !password || !email) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (nombre, teléfono, correo electrónico, contraseña)' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUserId = crypto.randomUUID();
    let adminId = null;
    try {
      const adminRes = await query("SELECT id FROM profiles WHERE is_admin = true LIMIT 1");
      if (adminRes.rows.length > 0) {
        adminId = adminRes.rows[0].id;
      }
    } catch (e) {
      console.warn('Error buscando admin ID:', e.message);
    }

    const existingPhone = await query('SELECT id FROM profiles WHERE phone = $1', [phone]);
    if (existingPhone.rows.length > 0) {
      return res.status(409).json({ error: 'Ese teléfono ya está registrado en otra cuenta.' });
    }
    const existingEmail = await query('SELECT id FROM profiles WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Ese correo electrónico ya está registrado en otra cuenta.' });
    }

    const effectiveContextId = adminId || newUserId;
    const profile = await withTx(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', effectiveContextId]);
      const inserted = await client.query(
        `INSERT INTO profiles (id, full_name, phone, email, password_hash, address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [newUserId, full_name, phone, email.trim().toLowerCase(), passwordHash, address ? JSON.stringify(address) : null]
      );
      return inserted.rows[0];
    }, { userId: effectiveContextId });

    const token = signToken(profile);

    // Enviar correo de verificación transaccional
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://dkitchen-white-label-engine.vercel.app';
    const verifyLink = `${baseUrl}/verificar-email?token=${verificationToken}`;
    
    await sendSmtpEmail({
      to: profile.email,
      subject: `✨ Verifica tu cuenta y activa tus puntos VIP - ${BRAND_NAME}`,
      html: `
        <div style="font-family: sans-serif; background-color: #0F0F11; color: #FAFAFA; padding: 24px; border-radius: 16px;">
          <h2 style="color: #F59E0B; margin-top: 0;">¡Bienvenido a ${BRAND_NAME}! ✨</h2>
          <p>Hola <strong>${profile.full_name}</strong>,</p>
          <p>Gracias por unirte a nuestro Club VIP. Para activar tu cuenta, acumular y canjear tus puntos VIP de descuento, verifica tu correo haciendo clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background-color: #F59E0B; color: #000; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 12px; display: inline-block; text-transform: uppercase;">
              Activar mi Cuenta y Puntos VIP
            </a>
          </div>
          <p style="color: #A1A1AA; font-size: 12px;">Si no puedes pulsar el botón, copia y pega este enlace en tu navegador:<br/><a href="${verifyLink}" style="color: #F59E0B;">${verifyLink}</a></p>
        </div>
      `
    });

    return res.status(200).json({ 
      token, 
      profile: sanitizeProfile(profile),
      message: 'Cuenta creada. Hemos enviado un correo para verificar tu email y activar tus puntos VIP.'
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_PHONE') {
      return res.status(409).json({ error: 'Ese teléfono ya está registrado en otra cuenta.' });
    }
    console.error('Error en registro:', err);
    return res.status(500).json({ error: 'No se pudo crear la cuenta: ' + (err.message || 'error desconocido') });
  }
}

async function handleVerifyEmail(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token de verificación no proporcionado' });

  try {
    const updated = await withTx(async (client) => {
      const r = await client.query(
        `UPDATE profiles 
         SET is_email_verified = true, verification_token = NULL 
         WHERE verification_token = $1 
         RETURNING *`,
        [token]
      );
      return r.rows[0] || null;
    }, {});

    if (!updated) {
      return res.status(400).json({ error: 'El enlace de verificación es inválido o ya ha sido utilizado.' });
    }

    return res.status(200).json({ 
      success: true, 
      message: '¡Correo verificado con éxito! Ya puedes canjear tus puntos VIP en todos tus pedidos.',
      profile: sanitizeProfile(updated)
    });
  } catch (err) {
    console.error('Error verificando email:', err);
    return res.status(500).json({ error: 'Error procesando la verificación del correo' });
  }
}

async function handleResendVerification(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const auth = getAuth(req);
  const { email } = req.body || {};
  const targetEmail = email || (auth ? (await withTx(async c => (await c.query('SELECT email FROM profiles WHERE id = $1', [auth.userId])).rows[0]?.email)) : null);

  if (!targetEmail) return res.status(400).json({ error: 'Email requerido para reenviar verificación' });

  try {
    const newToken = crypto.randomBytes(32).toString('hex');
    const profile = await withTx(async (client) => {
      const r = await client.query(
        `UPDATE profiles 
         SET verification_token = $1, verification_sent_at = NOW() 
         WHERE LOWER(email) = LOWER($2) AND is_email_verified = false 
         RETURNING *`,
        [newToken, targetEmail]
      );
      return r.rows[0] || null;
    }, {});

    if (!profile) {
      return res.status(200).json({ message: 'Si la cuenta existe y no está verificada, se ha enviado el enlace.' });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://dkitchen-white-label-engine.vercel.app';
    const verifyLink = `${baseUrl}/verificar-email?token=${newToken}`;
    
    await sendSmtpEmail({
      to: profile.email,
      subject: `✨ Activa tu cuenta y puntos VIP - ${BRAND_NAME}`,
      html: `
        <div style="font-family: sans-serif; background-color: #0F0F11; color: #FAFAFA; padding: 24px; border-radius: 16px;">
          <h2 style="color: #F59E0B; margin-top: 0;">Verificación de Cuenta ✨</h2>
          <p>Hola <strong>${profile.full_name}</strong>,</p>
          <p>Has solicitado un nuevo enlace de activación para tu cuenta y puntos VIP:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background-color: #F59E0B; color: #000; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 12px; display: inline-block; text-transform: uppercase;">
              Verificar mi Correo
            </a>
          </div>
          <p style="color: #A1A1AA; font-size: 12px;">Enlace directo:<br/><a href="${verifyLink}" style="color: #F59E0B;">${verifyLink}</a></p>
        </div>
      `
    });

    return res.status(200).json({ success: true, message: 'Enlace de verificación enviado a tu correo.' });
  } catch (err) {
    console.error('Error reenviando verificación:', err);
    return res.status(500).json({ error: 'No se pudo reenviar la verificación.' });
  }
}

async function handleProfile(req, res) {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.method === 'GET') {
    try {
      const data = await withTx(async (client) => {
        const p = await client.query('SELECT * FROM profiles WHERE id = $1', [auth.userId]);
        if (p.rows.length === 0) return null;
        const orders = await client.query(
          `SELECT o.*, COALESCE(json_agg(
              json_build_object(
                'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity,
                'unit_price', oi.unit_price, 'customization_details', oi.customization_details,
                'product_name', p.name
              ) ORDER BY oi.id
            ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS order_items
           FROM orders o
           LEFT JOIN order_items oi ON oi.order_id = o.id
           LEFT JOIN products p ON p.id = oi.product_id
           WHERE o.user_id = $1
           GROUP BY o.id
           ORDER BY o.created_at DESC`,
          [auth.userId]
        );
        return { profile: p.rows[0], orders: orders.rows };
      }, { userId: auth.userId });

      if (!data) return res.status(404).json({ error: 'Perfil no encontrado' });
      return res.status(200).json({ profile: sanitizeProfile(data.profile), orders: data.orders });
    } catch (err) {
      console.error('Error obteniendo perfil:', err);
      return res.status(500).json({ error: 'No se pudo cargar el perfil' });
    }
  }

  if (req.method === 'PUT') {
    const { full_name, phone, email, address } = req.body || {};
    try {
      const updated = await withTx(async (client) => {
        const r = await client.query(
          `UPDATE profiles SET
             full_name = COALESCE($2, full_name),
             phone = COALESCE($3, phone),
             email = COALESCE($4, email),
             address = COALESCE($5, address)
           WHERE id = $1
           RETURNING *`,
          [auth.userId, full_name ?? null, phone ?? null, email ?? null, address ? JSON.stringify(address) : null]
        );
        return r.rows[0];
      }, { userId: auth.userId });

      if (!updated) return res.status(404).json({ error: 'Perfil no encontrado' });
      return res.status(200).json({ profile: sanitizeProfile(updated) });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Ese teléfono o email ya está en uso por otra cuenta.' });
      }
      console.error('Error actualizando perfil:', err);
      return res.status(500).json({ error: 'No se pudo actualizar el perfil' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Método no permitido' });
}

async function handleDeleteAccount(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: 'No autenticado' });

  try {
    await withTx(async (client) => {
      await client.query('DELETE FROM profiles WHERE id = $1', [auth.userId]);
    }, { userId: auth.userId });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error borrando cuenta:', err);
    return res.status(500).json({ error: 'No se pudo borrar la cuenta' });
  }
}

async function handleIsPhoneRegistered(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Falta el teléfono' });

  try {
    const registered = await withTx(async (client) => {
      const r = await client.query('SELECT is_phone_registered($1) AS registered', [phone]);
      return r.rows[0].registered;
    });
    return res.status(200).json({ registered });
  } catch (err) {
    console.error('Error comprobando teléfono:', err);
    return res.status(500).json({ error: 'No se pudo comprobar el teléfono' });
  }
}

async function handleDeleteTestData(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const auth = getAuth(req);
  if (!auth || !auth.isAdmin) {
    return res.status(403).json({ error: 'No autorizado: requiere permisos de administrador' });
  }

  try {
    const result = await withTx(async (client) => {
      const ordersRes = await client.query(
        "DELETE FROM orders WHERE client_name ILIKE '%test%' OR client_name ILIKE '%prueba%' OR notes ILIKE '%test%' OR customer_name ILIKE '%test%' OR customer_name ILIKE '%prueba%'"
      );
      const profilesRes = await client.query(
        "DELETE FROM profiles WHERE is_admin = false AND (email ILIKE '%test%' OR email ILIKE '%prueba%' OR full_name ILIKE '%test%' OR phone LIKE '+34600999%')"
      );
      return {
        deletedOrdersCount: ordersRes.rowCount || 0,
        deletedProfilesCount: profilesRes.rowCount || 0
      };
    }, { userId: auth.userId });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Error eliminando datos de prueba:', err);
    return res.status(500).json({ error: 'Error durante la limpieza de datos de prueba' });
  }
}

export default async function handler(req, res) {
  const { action } = req.query || {};
  switch (action) {
    case 'login': return handleLogin(req, res);
    case 'verify-2fa': return handleVerifyAdmin2FA(req, res);
    case 'register': return handleRegister(req, res);
    case 'verify-email': return handleVerifyEmail(req, res);
    case 'resend-verification': return handleResendVerification(req, res);
    case 'profile': return handleProfile(req, res);
    case 'delete-account': return handleDeleteAccount(req, res);
    case 'is-phone-registered': return handleIsPhoneRegistered(req, res);
    case 'delete-test-data': return handleDeleteTestData(req, res);
    default: return res.status(404).json({ error: 'Acción desconocida' });
  }
}
