const crypto = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngbjsutgtyorjhroiutz.supabase.co';

function sameSecret(value, expected) {
  if (typeof value !== 'string' || typeof expected !== 'string') return false;
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  if (body) {
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    return res.status(status).json(body);
  }
  return res.status(status).end();
}

async function supabase(path, method = 'GET', body) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Supabase server key is not configured');
  // Supabase's new sb_secret_* keys are API keys, not JWTs. Send them only
  // through apikey; keep Authorization for legacy service_role JWTs.
  const headers = {
    apikey: key,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(2800)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return text ? JSON.parse(text) : [];
}

function decrypt(row) {
  const secret = process.env.NAVER_TALKTALK_WEBHOOK_TOKEN;
  if (!secret) throw new Error('TalkTalk encryption key is not configured');
  const key = Buffer.from(crypto.hkdfSync('sha256', Buffer.from(secret), Buffer.from('buja-talktalk-pending-v1'), Buffer.from('encrypted-inquiry-payload'), 32));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(row.payload_iv, 'base64'));
  decipher.setAuthTag(Buffer.from(row.payload_tag, 'base64'));
  const text = Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_payload, 'base64')),
    decipher.final()
  ]).toString('utf8');
  return JSON.parse(text);
}

function userHash(user) {
  return crypto.createHash('sha256').update(user).digest('hex');
}

function formatInquiry(inquiry) {
  const details = String(inquiry.details || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 520);
  return [
    '상담: ' + inquiry.request_type,
    '부동산 종류: ' + inquiry.property_type,
    '성함: ' + inquiry.name,
    '연락처: ' + inquiry.phone,
    '희망 지역: ' + (inquiry.area || '미입력'),
    '요청 내용: ' + details,
    '',
    '아래 버튼을 누르면 사무소에 상담 요청이 전달됩니다.'
  ].join('\n').slice(0, 940);
}

async function findPending(token) {
  const rows = await supabase(`talktalk_pending?token=eq.${encodeURIComponent(token)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=token,encrypted_payload,payload_iv,payload_tag,status,user_hash`);
  return rows[0] || null;
}

async function sendInquiryCard(res, row, token, user) {
  const fingerprint = userHash(user);
  if (row.status === 'ready') {
    const claimed = await supabase(`talktalk_pending?token=eq.${encodeURIComponent(token)}&status=eq.ready&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`, 'PATCH', {
      status: 'prompted',
      user_hash: fingerprint
    });
    if (!claimed.length) {
      const refreshed = await findPending(token);
      if (!refreshed || refreshed.status !== 'prompted' || !sameSecret(refreshed.user_hash, fingerprint)) return reply(res, 200, { success: true });
      row = refreshed;
    } else row = claimed[0];
  } else if (row.status !== 'prompted' || !sameSecret(row.user_hash, fingerprint)) {
    return reply(res, 200, { success: true });
  }

  const inquiry = decrypt(row);
  await supabase(`inquiries?talktalk_token=eq.${encodeURIComponent(token)}&talktalk_consent=eq.true`, 'PATCH', {
    talktalk_delivery_status: '톡톡 확인 대기'
  });
  return reply(res, 200, {
    event: 'send',
    compositeContent: {
      compositeList: [{
        title: '홈페이지 상담 접수',
        description: formatInquiry(inquiry),
        buttonList: [{
          type: 'TEXT',
          data: { title: '위 조건으로 상담 요청', code: token }
        }]
      }]
    }
  });
}

async function confirmInquiry(event, res) {
  const token = String(event.textContent?.code || '');
  const user = event.user;
  if (!/^[0-9a-f-]{36}$/i.test(token) || typeof user !== 'string' || user.length > 160 || event.textContent?.inputType !== 'button') {
    return reply(res, 200, { success: true });
  }
  const row = await findPending(token);
  if (!row || row.status !== 'prompted' || !sameSecret(row.user_hash, userHash(user))) return reply(res, 200, { success: true });

  await supabase(`inquiries?talktalk_token=eq.${encodeURIComponent(token)}&talktalk_consent=eq.true`, 'PATCH', {
    talktalk_delivery_status: '상담 요청 완료',
    talktalk_sent_at: new Date().toISOString()
  });
  await supabase(`talktalk_pending?token=eq.${encodeURIComponent(token)}`, 'DELETE');
  return reply(res, 200, { success: true });
}

module.exports = async function talktalkWebhook(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' });
  const url = new URL(req.url, 'https://buja-real-estate.vercel.app');
  if (!sameSecret(url.searchParams.get('token'), process.env.NAVER_TALKTALK_WEBHOOK_TOKEN)) {
    return reply(res, 401, { error: 'Unauthorized' });
  }

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (event.event === 'test') return reply(res, 200, { success: true });

    if (event.event === 'open') {
      const token = event.options?.from;
      const user = event.user;
      if (typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token) || typeof user !== 'string' || user.length > 160) {
        return reply(res, 200, { success: true });
      }
      const row = await findPending(token);
      if (!row) return reply(res, 200, { success: true });
      return await sendInquiryCard(res, row, token, user);
    }

    if (event.event === 'send') return await confirmInquiry(event, res);
    return reply(res, 200, { success: true });
  } catch (error) {
    console.error('TalkTalk inquiry webhook failed:', error.message);
    return reply(res, 500, { error: 'TalkTalk webhook failed' });
  }
};
