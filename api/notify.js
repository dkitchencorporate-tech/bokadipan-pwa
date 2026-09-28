// Función consolidada: send-campaign/send-order-push/send-transactional-email/
// save-push-subscription/track-pwa-install/track-visit en un solo serverless
// function (ver api/account.js para la explicación completa del límite de
// 12 funciones en Vercel Hobby que motiva esta consolidación).
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { withTx } from './_lib/db.js';
import { requireAuth, assertAdmin } from './_lib/adminGuard.js';

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BRAND_NAME = process.env.BRAND_NAME || 'D-Kitchen';
const BRAND_SLOGAN = process.env.BRAND_SLOGAN || 'Gastronomía de Autor';

// ---------- send-campaign ----------

const buildCampaignHtml = ({ headline, message, flyerUrl, ctaText, ctaUrl }) => `
<div style="background:#f1f5f9;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="background:#18181b;padding:28px 24px;text-align:center;border-bottom:4px solid #F59E0B;">
        <div style="font-size:20px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(BRAND_NAME)}</div>
        <div style="font-size:11px;color:#FACC15;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">${escapeHtml(BRAND_SLOGAN)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        ${headline ? `<h2 style="margin:0 0 16px 0;font-size:22px;font-weight:900;text-transform:uppercase;color:#0f172a;text-align:center;">${headline}</h2>` : ''}
        ${flyerUrl ? `<img src="${flyerUrl}" alt="Promoción" style="width:100%;border-radius:12px;margin-bottom:16px;display:block;" />` : ''}
        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:20px;color:#334155;font-size:15px;line-height:1.6;white-space:pre-line;">${message}</div>
        <div style="text-align:center;margin-top:24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#D97706;color:#ffffff;font-weight:900;text-transform:uppercase;letter-spacing:1px;font-size:13px;padding:14px 32px;border-radius:10px;text-decoration:none;">${ctaText}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#f1f5f9;padding:20px 24px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
        <div style="font-weight:700;color:#334155;">${escapeHtml(BRAND_NAME)}</div>
        <div>${escapeHtml(BRAND_SLOGAN)}</div>
        <div style="margin-top:8px;color:#94a3b8;">Has recibido este correo porque formas parte del Club VIP de ${escapeHtml(BRAND_NAME)}.</div>
      </td>
    </tr>
  </table>
</div>
`;

async function handleSendCampaign(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let auth;
  try {
    auth = requireAuth(req);
    await withTx(async (client) => { await assertAdmin(client); }, { userId: auth.userId });
  } catch (e) {
    return res.status(e.statusCode || 401).json({ error: e.message });
  }

  const { subject, headline, message, flyerUrl, ctaText, ctaUrl, recipients } = req.body || {};

  if (!subject || !message || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Faltan datos de la campaña (asunto, mensaje o destinatarios)' });
  }

  const validRecipients = recipients.filter(r => typeof r === 'string' && r.includes('@')).slice(0, 2000);
  if (validRecipients.length === 0) {
    return res.status(400).json({ error: 'No hay destinatarios con email válido' });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ error: 'El correo saliente no está configurado en el servidor todavía.' });
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
      to: process.env.SMTP_USER,
      bcc: validRecipients,
      subject,
      html: buildCampaignHtml({ headline, message, flyerUrl, ctaText, ctaUrl })
    });

    return res.status(200).json({ success: true, sent: validRecipients.length });
  } catch (err) {
    console.error('Error enviando campaña:', err);
    return res.status(500).json({ error: 'No se pudo enviar la campaña. Inténtalo de nuevo.' });
  }
}

// ---------- send-order-push ----------

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// Construye y firma un JWT VAPID (RFC 8292) usando solo el módulo crypto de
// Node — sin la librería web-push.
function buildVapidAuthHeader(endpointOrigin) {
  const jwk = JSON.parse(process.env.VAPID_PRIVATE_JWK);
  const privateKey = crypto.createPrivateKey({ key: jwk, format: 'jwk' });

  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(JSON.stringify({
    aud: endpointOrigin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: process.env.VAPID_SUBJECT || 'mailto:hola@sevenfoodfries.com'
  }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  const jwt = `${signingInput}.${b64url(signature)}`;

  return `vapid t=${jwt}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

async function sendPush(subscription) {
  const endpointOrigin = new URL(subscription.endpoint).origin;
  const authHeader = buildVapidAuthHeader(endpointOrigin);
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: { Authorization: authHeader, TTL: '86400', 'Content-Length': '0' }
  });
}

async function handleSendOrderPush(req, res) {
  let auth;
  try {
    auth = requireAuth(req);
  } catch (e) {
    return res.status(e.statusCode || 401).json({ error: e.message });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Falta el teléfono del cliente' });

  if (!process.env.VAPID_PRIVATE_JWK || !process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Las notificaciones push no están configuradas en el servidor.' });
  }

  try {
    const subs = await withTx(async (client) => {
      await assertAdmin(client);
      const r = await client.query('SELECT * FROM push_subscriptions WHERE client_phone = $1', [phone]);
      return r.rows;
    }, { userId: auth.userId });

    if (subs.length === 0) return res.status(200).json({ sent: 0 });

    let sent = 0;
    const staleIds = [];
    for (const sub of subs) {
      try {
        const result = await sendPush(sub.subscription);
        if (result.ok) sent += 1;
        else if (result.status === 404 || result.status === 410) staleIds.push(sub.id);
      } catch (err) {
        console.error('Error enviando push a', sub.subscription?.endpoint, err);
      }
    }

    if (staleIds.length > 0) {
      await withTx(async (client) => {
        await assertAdmin(client);
        await client.query('DELETE FROM push_subscriptions WHERE id = ANY($1::uuid[])', [staleIds]);
      }, { userId: auth.userId });
    }

    return res.status(200).json({ sent });
  } catch (err) {
    console.error('Error en send-order-push:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'No se pudo enviar la notificación' });
  }
}

// ---------- send-transactional-email ----------

const wrapTransactional = (title, bodyHtml) => `
<div style="background:#f1f5f9;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="background:#18181b;padding:24px;text-align:center;border-bottom:4px solid #F59E0B;">
        <div style="font-size:18px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(BRAND_NAME)}</div>
        <div style="font-size:11px;color:#FACC15;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">${title}</div>
      </td>
    </tr>
    <tr><td style="padding:28px 24px;color:#334155;font-size:14px;line-height:1.6;">${bodyHtml}</td></tr>
    <tr>
      <td style="background:#f1f5f9;padding:16px 24px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
        ${escapeHtml(BRAND_SLOGAN)}
      </td>
    </tr>
  </table>
</div>
`;

const transactionalTemplates = {
  order_confirmation: (d) => ({
    subject: `Pedido confirmado ${d.orderId ? '#' + String(d.orderId).slice(0, 8).toUpperCase() : ''} — ${BRAND_NAME}`,
    to: d.to,
    html: wrapTransactional('Pedido confirmado', `
      <p>Hola ${escapeHtml(d.clientName) || ''},</p>
      <p>Hemos recibido tu pedido correctamente. En breve empezaremos a prepararlo.</p>
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:14px;margin:16px 0;">
        <p style="margin:0;"><strong>Total:</strong> ${Number(d.total || 0).toFixed(2)}€</p>
      </div>
      <div style="text-align:center;margin:20px 0 4px;">
        <a href="${d.appUrl || '/'}pedido" style="display:inline-block;background:#D97706;color:#ffffff;font-weight:900;text-transform:uppercase;letter-spacing:1px;font-size:13px;padding:14px 32px;border-radius:10px;text-decoration:none;">Seguir mi pedido</a>
      </div>
    `)
  }),
  order_admin: (d) => ({
    subject: `🔔 Nuevo pedido ${d.orderId ? '#' + String(d.orderId).slice(0, 8).toUpperCase() : ''} — ${Number(d.total || 0).toFixed(2)}€`,
    to: process.env.SMTP_USER,
    html: wrapTransactional('Nuevo pedido recibido', `
      <p><strong>Cliente:</strong> ${escapeHtml(d.clientName) || 'Cliente anónimo'}</p>
      <p><strong>Total:</strong> ${Number(d.total || 0).toFixed(2)}€</p>
      <p>Revisa el panel de Pedidos para ver el detalle completo.</p>
    `)
  }),
  welcome: (d) => ({
    subject: `¡Bienvenido al Club VIP de ${BRAND_NAME}!`,
    to: d.to,
    html: wrapTransactional('¡Bienvenido!', `
      <p>Hola ${escapeHtml(d.clientName) || ''},</p>
      <p>¡Gracias por registrarte en ${escapeHtml(BRAND_NAME)}! Tu cuenta ya está lista y a partir de ahora acumulas puntos VIP con cada pedido, canjeables por descuentos.</p>
      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${d.appUrl || '/'}" style="display:inline-block;background:#D97706;color:#ffffff;font-weight:900;text-transform:uppercase;letter-spacing:1px;font-size:13px;padding:14px 32px;border-radius:10px;text-decoration:none;">Ver la carta y pedir</a>
      </div>
      <p>¡Que aproveche!</p>
    `)
  })
};

async function handleSendTransactionalEmail(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { type, to } = req.body || {};
  if (!transactionalTemplates[type]) {
    return res.status(400).json({ error: 'Tipo de correo desconocido' });
  }

  if (type !== 'order_admin' && (!to || !to.includes('@'))) {
    return res.status(400).json({ error: 'Falta un email de destino válido' });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // No-op silencioso: nunca debe romper el flujo de compra/registro del cliente
    return res.status(200).json({ skipped: true });
  }

  try {
    const appUrl = `https://${req.headers.host}/`;
    const built = transactionalTemplates[type]({ ...(req.body || {}), appUrl });
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: `"${BRAND_NAME}" <${process.env.SMTP_USER}>`,
      to: built.to,
      subject: built.subject,
      html: built.html
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error enviando email transaccional:', err);
    // No-op: un fallo de email nunca debe bloquear el checkout/registro en el frontend
    return res.status(200).json({ success: false });
  }
}

// ---------- save-push-subscription ----------

async function handleSavePushSubscription(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { phone, subscription } = req.body || {};
  if (!phone || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'Datos de suscripción incompletos' });
  }

  try {
    await withTx(async (client) => {
      await client.query(
        'INSERT INTO push_subscriptions (client_phone, subscription) VALUES ($1, $2)',
        [phone, JSON.stringify(subscription)]
      );
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error guardando suscripción push:', err);
    if (/Demasiadas suscripciones/.test(err.message)) {
      return res.status(429).json({ error: err.message });
    }
    return res.status(500).json({ error: 'No se pudo guardar la suscripción' });
  }
}

// ---------- track-pwa-install ----------
// Analítica mínima de instalaciones de la PWA. Nunca debe bloquear el flujo
// del usuario: siempre 200.

async function handleTrackPwaInstall(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { deviceType, appType, userAgent } = req.body || {};

  try {
    await withTx(async (client) => {
      await client.query(
        'INSERT INTO pwa_installs (device_type, app_type, user_agent) VALUES ($1, $2, $3)',
        [deviceType || null, appType || null, userAgent || null]
      );
    }, { bypass: false });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: false });
  }
}

// ---------- track-visit ----------
// event_type/label/device_type permiten distinguir page_view de
// category_click en AdminAnalytics. La analítica nunca debe romper la
// navegación del visitante.

async function handleTrackVisit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { sessionId, eventType, label, deviceType } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Falta sessionId' });

  try {
    await withTx(async (client) => {
      await client.query(
        'INSERT INTO site_visits (session_id, event_type, label, device_type) VALUES ($1, $2, $3, $4)',
        [sessionId, eventType || null, label || null, deviceType || null]
      );
    }, { bypass: false });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: false });
  }
}

export default async function handler(req, res) {
  const { action } = req.query || {};
  switch (action) {
    case 'send-campaign': return handleSendCampaign(req, res);
    case 'send-order-push': return handleSendOrderPush(req, res);
    case 'send-transactional-email': return handleSendTransactionalEmail(req, res);
    case 'save-push-subscription': return handleSavePushSubscription(req, res);
    case 'track-pwa-install': return handleTrackPwaInstall(req, res);
    case 'track-visit': return handleTrackVisit(req, res);
    default: return res.status(404).json({ error: 'Acción desconocida' });
  }
}
