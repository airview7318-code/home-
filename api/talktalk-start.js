const crypto = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngbjsutgtyorjhroiutz.supabase.co';

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function encryptionKey() {
  const token = process.env.NAVER_TALKTALK_WEBHOOK_TOKEN;
  if (!token) throw new Error('TalkTalk encryption key is not configured');
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(token), Buffer.from('buja-talktalk-pending-v1'), Buffer.from('encrypted-inquiry-payload'), 32));
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return {
    encrypted_payload: ciphertext.toString('base64'),
    payload_iv: iv.toString('base64'),
    payload_tag: cipher.getAuthTag().toString('base64')
  };
}

async function supabase(path, method = 'GET', body) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Supabase server key is not configured');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(3500)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return text ? JSON.parse(text) : [];
}

function validOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  const host = req.headers.host;
  return origin === `https://${host}` && (host === 'buja-real-estate.vercel.app' || host.endsWith('.vercel.app'));
}

module.exports = async function talktalkStart(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') return reply(res, 405, { error: 'Method not allowed' });
  if (!validOrigin(req)) return reply(res, 403, { error: 'Forbidden' });

  const token = new URL(req.url, 'https://buja-real-estate.vercel.app').searchParams.get('token');
  if (req.method === 'DELETE') {
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return reply(res, 400, { error: 'Invalid token' });
    try {
      await supabase(`talktalk_pending?token=eq.${encodeURIComponent(token)}`, 'DELETE');
      return reply(res, 200, { success: true });
    } catch (error) {
      console.error('TalkTalk pending cancellation failed:', error.message);
      return reply(res, 503, { error: 'Unable to cancel temporary inquiry' });
    }
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const allowedTypes = ['매물 접수', '찾는 매물', '일반 문의'];
  const allowedProperties = ['상가', '상가주택', '토지', '오피스텔', '사무실', '아파트', '기타'];
  const fields = {
    request_type: String(body.request_type || '').trim(),
    name: String(body.name || '').trim(),
    phone: String(body.phone || '').trim(),
    property_type: String(body.property_type || '').trim(),
    area: String(body.area || '').trim(),
    details: String(body.details || '').trim()
  };
  if (body.consent !== true || body.talktalk_consent !== true || !/^[0-9a-f-]{36}$/i.test(String(body.token || '')) ||
      !allowedTypes.includes(fields.request_type) || !allowedProperties.includes(fields.property_type) ||
      fields.name.length < 1 || fields.name.length > 80 || !/^[0-9+() -]{7,30}$/.test(fields.phone) ||
      fields.area.length > 120 || fields.details.length < 1 || fields.details.length > 2000) {
    return reply(res, 400, { error: 'Invalid inquiry or missing consent' });
  }

  try {
    const token = String(body.token).toLowerCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const encrypted = encrypt(fields);
    await supabase(`talktalk_pending?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, 'DELETE');
    await supabase('talktalk_pending', 'POST', {
      token,
      ...encrypted,
      status: 'ready',
      expires_at: expiresAt
    });
    return reply(res, 201, { success: true, token, expiresAt });
  } catch (error) {
    console.error('TalkTalk pending inquiry preparation failed:', error.message);
    return reply(res, 503, { error: 'Unable to prepare TalkTalk inquiry' });
  }
};
