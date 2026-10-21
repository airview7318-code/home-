const ADMIN_URL = 'https://buja-real-estate.vercel.app/admin.html';

/** Receives Supabase Database Webhook payloads and sends a minimal email alert. */
function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty('WEBHOOK_TOKEN');
  const notifyTo = props.getProperty('NOTIFY_TO');
  const supplied = e && e.parameter ? e.parameter.token : '';
  if (!expected || !supplied || !constantTimeEquals_(expected, supplied)) {
    return json_({ ok: false, error: 'unauthorized' });
  }
  if (!notifyTo) return json_({ ok: false, error: 'notification_not_configured' });

  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (_) {
    return json_({ ok: false, error: 'invalid_json' });
  }
  if (payload.type !== 'INSERT' || payload.schema !== 'public' || payload.table !== 'inquiries') {
    return json_({ ok: false, error: 'unsupported_event' });
  }

  const record = payload.record || {};
  if (!record.id) return json_({ ok: false, error: 'missing_record_id' });

  const cache = CacheService.getScriptCache();
  const cacheKey = `inquiry-notice:${record.id}`;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'busy' });
  try {
    if (cache.get(cacheKey)) return json_({ ok: true, duplicate: true });
    const requestType = ['매물 접수', '찾는 매물', '일반 문의'].includes(record.request_type)
      ? record.request_type
      : '새 문의';
    const submittedAt = record.created_at
      ? Utilities.formatDate(new Date(record.created_at), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')
      : '시간 정보 없음';

    // Keep customer names, phone numbers, and details inside the admin center.
    MailApp.sendEmail({
      to: notifyTo,
      subject: `[부자부동산] ${requestType}가 접수되었습니다`,
      body: `홈페이지에 새 문의가 접수되었습니다.\n\n요청 종류: ${requestType}\n접수 시간: ${submittedAt}\n\n문의자의 연락처와 상세 내용은 관리자 센터에서 확인해 주세요.\n${ADMIN_URL}`,
      name: '검단신도시 부자부동산 알림'
    });
    cache.put(cacheKey, 'sent', 21600);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function constantTimeEquals_(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}
