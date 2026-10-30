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
    '요청 내용: ' + details
  ].join('\n').slice(0, 940);
}

async function sendInquiryToOffice(user, inquiry) {
  const authorization = process.env.NAVER_TALKTALK_AUTHORIZATION;
  if (!authorization) throw new Error('TalkTalk send API authorization is not configured');
  const endpoint = 'https://gw.talk.naver.com/chatbot/v1/event';
  const headers = {
    Authorization: authorization,
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const sendResponse = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      event: 'send',
      user,
      textContent: { text: formatInquiry(inquiry) }
    }),
    signal: AbortSignal.timeout(2200)
  });
  const sendResult = await sendResponse.json().catch(() => ({}));
  if (!sendResponse.ok || sendResult.success !== true || sendResult.resultCode !== '00') {
    throw new Error(`TalkTalk message delivery failed (${sendResponse.status}, ${sendResult.resultCode || 'no result code'})`);
  }

  const handoverResponse = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      event: 'handover',
      user,
      partner: 'w5wrv7',
      options: { control: 'passThread', targetId: 1 }
    }),
    signal: AbortSignal.timeout(2200)
  });
  const handoverResult = await handoverResponse.json().catch(() => ({}));
  if (!handoverResponse.ok || handoverResult.success !== true || handoverResult.resultCode !== '00') {
    throw new Error(`TalkTalk handover failed (${handoverResponse.status}, ${handoverResult.resultCode || 'no result code'})`);
  }
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
  } else if (row.status === 'prompted' && sameSecret(row.user_hash, fingerprint)) {
    return reply(res, 200, { success: true });
  } else {
    return reply(res, 200, { success: true });
  }

  const inquiry = decrypt(row);
  try {
    await sendInquiryToOffice(user, inquiry);
  } catch (error) {
    await supabase(`talktalk_pending?token=eq.${encodeURIComponent(token)}&status=eq.prompted`, 'PATCH', {
      status: 'ready',
      user_hash: null
    }).catch(() => {});
    await supabase(`inquiries?talktalk_token=eq.${encodeURIComponent(token)}&talktalk_consent=eq.true`, 'PATCH', {
      talktalk_delivery_status: '톡톡 전달 실패'
    }).catch(() => {});
    throw error;
  }
  await supabase(`inquiries?talktalk_token=eq.${encodeURIComponent(token)}&talktalk_consent=eq.true`, 'PATCH', {
    talktalk_delivery_status: '톡톡 상담함 전달 완료',
    talktalk_sent_at: new Date().toISOString()
  });
  return reply(res, 200, {
    success: true
  });
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

    if (event.event === 'send') return reply(res, 200, { success: true });
    return reply(res, 200, { success: true });
  } catch (error) {
    console.error('TalkTalk inquiry webhook failed:', error.message);
    return reply(res, 500, { error: 'TalkTalk webhook failed' });
  }
};
