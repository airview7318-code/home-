(() => {
  const config = window.BUJA_CONFIG || {};
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publicKey = config.supabaseAnonKey || '';
  if (!baseUrl || !publicKey || location.pathname === '/admin.html') return;

  try {
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
    fetch(`${baseUrl}/rest/v1/site_visits`, {
      method: 'POST',
      headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ visitor_id: visitorId }),
      keepalive: true
    }).catch(() => {});
  } catch (_) {
    // Visitor counting must never interrupt the page if storage or the network is unavailable.
  }
})();
