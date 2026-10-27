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
  return res.status(status).json(body);
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
    signal: AbortSignal.timeout(4500)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return text ? JSON.parse(text) : [];
}

function formatInquiry(inquiry) {
  const details = String(inquiry.details || '');
  const detailsText = `${details.slice(0, 650)}${details.length > 650 ? '…' : ''}`;
  const lines = [
    `상담: ${inquiry.request_type}`,
    `부동산 종류: ${inquiry.property_type || '미입력'}`,
    `연락처: ${inquiry.phone}`,
    `성함: ${inquiry.name}`,
    `희망 지역: ${inquiry.area || '미입력'}`,
    `요청 내용: ${detailsText}`
  ];
  return lines.join('\n').slice(0, 1000);
}

async function sendTalkTalkMessage(user, inquiry) {
  const authorization = process.env.NAVER_TALKTALK_AUTHORIZATION;
  if (!authorization) throw new Error('TalkTalk send authorization is not configured');
  const response = await fetch('https://gw.talk.naver.com/chatbot/v1/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8', Authorization: authorization },
    body: JSON.stringify({
      event: 'send',
      user,
      compositeContent: {
        compositeList: [{
          title: '홈페이지 상담 접수',
          description: `${formatInquiry(inquiry)}\n\n접수한 조건을 확인했습니다. 확인 후 톡톡으로 답변드리겠습니다.`.slice(0, 1000)
        }]
      }
    }),
    signal: AbortSignal.timeout(4500)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) throw new Error(`TalkTalk message failed (${response.status})`);
}

module.exports = async function talktalkWebhook(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' });
  const url = new URL(req.url, 'https://buja-real-estate.vercel.app');
  if (!sameSecret(url.searchParams.get('token'), process.env.NAVER_TALKTALK_WEBHOOK_TOKEN)) {
    return reply(res, 401, { error: 'Unauthorized' });
  }

  const event = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (event.event === 'test') return reply(res, 200, { success: true });
  if (event.event !== 'open') return reply(res, 200, { success: true });

  const token = event.options?.from;
  const user = event.user;
  if (typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token) || typeof user !== 'string' || user.length > 160) {
    return reply(res, 200, { success: true });
  }

  let claimed;
  try {
    const filter = `talktalk_token=eq.${encodeURIComponent(token)}&consent=eq.true&talktalk_consent=eq.true&talktalk_delivery_status=eq.%EB%8C%80%EA%B8%B0&select=id,request_type,name,phone,property_type,area,details,created_at`;
    claimed = await supabase(`inquiries?${filter}`, 'PATCH', { talktalk_delivery_status: '전송중' });
    if (!claimed.length) return reply(res, 200, { success: true });
    const inquiry = claimed[0];
    const ageHours = (Date.now() - new Date(inquiry.created_at).getTime()) / 3600000;
    if (!Number.isFinite(ageHours) || ageHours < 0 || ageHours > 48) {
      await supabase(`inquiries?id=eq.${encodeURIComponent(inquiry.id)}`, 'PATCH', { talktalk_delivery_status: '만료' });
      return reply(res, 200, { success: true });
    }
    await sendTalkTalkMessage(user, inquiry);
    await supabase(`inquiries?id=eq.${encodeURIComponent(inquiry.id)}`, 'PATCH', {
      talktalk_delivery_status: '전송완료',
      talktalk_sent_at: new Date().toISOString()
    });
    return reply(res, 200, { success: true });
  } catch (error) {
    if (claimed?.[0]?.id) {
      await supabase(`inquiries?id=eq.${encodeURIComponent(claimed[0].id)}`, 'PATCH', { talktalk_delivery_status: '대기' }).catch(() => {});
    }
    console.error('TalkTalk inquiry delivery failed:', error.message);
    return reply(res, 500, { error: 'TalkTalk delivery failed' });
  }
};
