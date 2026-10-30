(() => {
  const config = window.BUJA_CONFIG || {};
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publicKey = config.supabaseAnonKey || '';
  if (!baseUrl || !publicKey || location.pathname === '/admin.html') return;

  try {
    // The office can exclude its own browsing on each device from the admin screen.
    if (localStorage.getItem('buja_ignore_visit_stats_v1') === '1') return;
    const storageKey = 'buja_visitor_id_v1';
    let visitorId = localStorage.getItem(storageKey);
    if (!visitorId) {
      if (crypto.randomUUID) visitorId = crypto.randomUUID();
      else {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
        visitorId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }
      localStorage.setItem(storageKey, visitorId);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) return;
    const classifySource = () => {
      const allowed = new Set(['naver','google','youtube','instagram','kakao']);
      const normalize = value => {
        const source = String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0];
      if (allowed.has(source)) return source;
        if (/(^|\.)naver\.(com|me|net)$/.test(source)) return 'naver';
        if (/(^|\.)google\.(com|co\.kr|[a-z]{2,})$/.test(source)) return 'google';
        if (/(^|\.)(youtube\.com|youtu\.be)$/.test(source)) return 'youtube';
        if (/(^|\.)instagram\.com$/.test(source)) return 'instagram';
        if (/(^|\.)(kakao\.com|kakao\.co\.kr)$/.test(source)) return 'kakao';
        return '';
      };
      const utmSource = new URLSearchParams(location.search).get('utm_source');
      if (utmSource) return normalize(utmSource) || 'other';
      try {
        if (!document.referrer) return 'direct';
        const host = new URL(document.referrer).hostname.toLowerCase();
        if (host === location.hostname.toLowerCase()) return 'direct';
        return normalize(host) || 'other';
      } catch { return 'other'; }
    };
    const referrerSource = classifySource();
    const postVisit = body => fetch(baseUrl + '/rest/v1/site_visits', {
      method: 'POST',
      headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body),
      keepalive: true
    });
    postVisit({ visitor_id: visitorId, referrer_source: referrerSource })
      .then(response => {
        // Preserve total visit counts if the source-category migration has not been applied yet.
        if (!response.ok) return postVisit({ visitor_id: visitorId });
      })
      .catch(() => {});
  } catch (_) {
    // Visitor counting must never interrupt the page if storage or the network is unavailable.
  }
})();
