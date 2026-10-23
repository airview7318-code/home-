const SITE_ORIGIN = 'https://buja-real-estate.vercel.app';
// This is the project's public publishable key, also used by config.js in the browser.
const PUBLIC_SUPABASE_URL = 'https://ngbjsutgtyorjhroiutz.supabase.co';
const PUBLIC_SUPABASE_KEY = 'sb_publishable_wkP3xEPTNmarPS-RxJi6QA_72pMkXyy';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const formatAmount = value => {
  if (value == null || value === '') return '상담';
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}만원` : '상담';
};

async function getPublicSupabaseConfig() {
  return { url: PUBLIC_SUPABASE_URL, key: PUBLIC_SUPABASE_KEY };
}

function notFound(res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(404).send(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>매물을 찾을 수 없습니다 | 부자부동산</title><body><main><h1>현재 공개된 매물이 아닙니다.</h1><p>거래가 종료되었거나 공개가 해제된 매물일 수 있습니다.</p><a href="/">홈페이지로 돌아가기</a></main></body></html>`);
}

module.exports = async function propertyDetail(req, res) {
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').send('Method not allowed');
  const id = String(req.query?.id || '');
  if (!UUID.test(id)) return notFound(res);

  try {
    const { url, key } = await getPublicSupabaseConfig();
    const endpoint = new URL('/rest/v1/properties_public', url);
    endpoint.search = new URLSearchParams({
      select: 'id,title,property_type,transaction_type,area,price,deposit,rent,area_m2,floor,parking,description,image_url,source_url,created_at',
      id: `eq.${id}`
    });
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    const property = rows[0];
    if (!property) return notFound(res);

    const title = `${property.area || '검단신도시'} ${property.property_type || '부동산'} ${property.transaction_type || '매물'} | ${property.title} | 부자부동산`;
    const summary = String(property.description || `${property.area || '검단신도시'} ${property.property_type || '부동산'} 공개 매물입니다. 최신 거래 조건과 현재 상태는 상담 시 확인해 주세요.`).replace(/\s+/g, ' ').trim().slice(0, 155);
    const canonical = `${SITE_ORIGIN}/property/${encodeURIComponent(property.id)}`;
    const deal = property.transaction_type === '매매'
      ? `매매 ${formatAmount(property.price)}`
      : property.transaction_type === '전세'
        ? `전세 ${formatAmount(property.deposit)}`
        : `보증금 ${formatAmount(property.deposit)} · 월세 ${formatAmount(property.rent)}`;
    const image = /^https:\/\//i.test(property.image_url || '') ? property.image_url : '';
    const facts = [
      ['지역', property.area || '검단신도시'],
      ['종류', `${property.property_type || '부동산'} · ${property.transaction_type || '조건 문의'}`],
      ['가격', deal],
      ['면적', property.area_m2 ? `전용 ${property.area_m2}㎡` : '상담'],
      ['층수', property.floor ? `${property.floor}층` : '문의'],
      ['주차', property.parking || '문의'],
      ['건물', property.building_name || '문의']
    ];
    const listing = {
      '@context': 'https://schema.org', '@type': 'RealEstateListing', '@id': canonical,
      name: property.title, url: canonical, description: summary,
      datePosted: property.created_at || undefined,
      address: { '@type': 'PostalAddress', addressLocality: property.area || '검단신도시', addressRegion: '인천광역시', addressCountry: 'KR' },
      category: property.property_type,
      provider: { '@type': 'RealEstateAgent', name: '부자부동산공인중개사사무소', url: `${SITE_ORIGIN}/`, telephone: '+82-32-566-8949' },
      ...(image ? { image } : {})
    };
    const imageMarkup = image ? `<img class="property-cover" src="${escapeHtml(image)}" alt="${escapeHtml(property.title)} 매물 사진">` : '';
    const factsMarkup = facts.map(([label, value]) => `<div><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>`).join('');
    const sourceMarkup = property.source_url && /^https:\/\//i.test(property.source_url)
      ? `<p><a href="${escapeHtml(property.source_url)}" target="_blank" rel="noopener noreferrer">관련 원문 보기 ↗</a></p>` : '';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(`<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(summary)}"><link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article"><meta property="og:locale" content="ko_KR"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(summary)}"><meta property="og:url" content="${escapeHtml(canonical)}">${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}
<link rel="icon" type="image/svg+xml" href="/buja-logo.svg"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/geo-content.css">
<script type="application/ld+json">${JSON.stringify(listing).replace(/</g, '\\u003c')}</script></head>
<body class="guide-page"><header class="guide-top"><a class="guide-brand" href="/"><img src="/buja-logo.svg" alt=""><span>검단신도시 부자부동산</span></a><a href="/#listings">전체 매물 보기 ↗</a></header>
<div class="guide-breadcrumb"><a href="/">홈</a>　›　<a href="/#listings">검단신도시 공개 매물</a>　›　${escapeHtml(property.property_type || '매물')}</div>
<main class="guide-content"><span class="eyebrow">PUBLIC PROPERTY LISTING</span><h1>${escapeHtml(property.title)}</h1><p class="guide-meta">${escapeHtml(property.area || '검단신도시')} · ${escapeHtml(property.property_type || '부동산')} · ${escapeHtml(property.transaction_type || '조건 문의')}</p>
${imageMarkup}<h2>매물 정보</h2><div class="guide-checklist">${factsMarkup}</div><h2>상세 안내</h2><p>${escapeHtml(property.description || '추가 상세 조건과 현재 거래 가능 여부는 상담 시 확인해 주세요.')}</p>${sourceMarkup}
<aside class="guide-notice">가격, 임대 조건, 공개 여부와 거래 가능 상태는 바뀔 수 있습니다. 계약 전 최신 서류와 현장을 확인해 주세요.</aside>
<div class="guide-cta"><div><b>이 매물에 대해 상담하시겠어요?</b><p>현재 조건과 방문 가능 시간을 전화로 확인해 주세요.</p></div><a href="tel:0325668949">032-566-8949 전화하기</a></div><p><a href="/#listings">← 공개 매물 목록으로</a></p></main>
<footer class="guide-footer"><b>부자부동산공인중개사사무소</b> · 대표공인중개사 윤민욱<br>인천광역시 검단구 원당동 1043-14 메가타워 101호 · 등록번호 제28260-2024-00008호<br><a href="/">홈페이지</a> · <a href="https://naver.me/F0z9zmWA" target="_blank" rel="noopener noreferrer">네이버 지도</a> · <a href="https://open.kakao.com/o/saJVu9Si" target="_blank" rel="noopener noreferrer">카카오톡 상담</a></footer></body></html>`);
  } catch (error) {
    console.error('Public property detail lookup failed:', error?.message || 'unknown error');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.status(503).send('공개 매물 정보를 일시적으로 불러오지 못했습니다. 전화 또는 카카오톡으로 문의해 주세요.');
  }
};

