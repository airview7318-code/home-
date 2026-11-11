import './scripts/create-seo-pages.mjs';
import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const origin = 'https://buja-real-estate.vercel.app';
const officeAddress = '인천광역시 검단구 발산로 17 메가타워 1층 101호 (원당동 1043-14)';
const officeId = `${origin}/#office`;
const office = {
  '@type': 'RealEstateAgent', '@id': officeId, name: '부자부동산공인중개사사무소', alternateName: '검단신도시 부자부동산',
  url: `${origin}/`, logo: `${origin}/buja-logo.svg`, image: `${origin}/assets/og-buja.png`, telephone: '+82-32-566-8949',
  priceRange: '상담', currenciesAccepted: 'KRW',
  address: { '@type': 'PostalAddress', streetAddress: '발산로 17 메가타워 1층 101호 (원당동 1043-14)', addressLocality: '검단구', addressRegion: '인천광역시', postalCode: '23449', addressCountry: 'KR' },
  geo: { '@type': 'GeoCoordinates', latitude: 37.5928695102, longitude: 126.7102107678 },
  hasMap: 'https://map.naver.com/p/entry/place/1364587352',
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], opens: '10:00', closes: '19:00' }],
  founder: { '@type': 'Person', name: '윤민욱', jobTitle: '대표공인중개사' },
  identifier: { '@type': 'PropertyValue', name: '중개사무소 등록번호', value: '제28260-2024-00008호' },
  areaServed: ['검단신도시','아라동','원당동','당하동','불로동'],
  knowsAbout: ['검단신도시 부동산','상가 중개','토지 중개','상가주택','오피스텔','사무실','아파트 매매·임대차','검단 상권 분석'],
  sameAs: ['https://blog.naver.com/property98','https://map.naver.com/p/entry/place/1364587352','https://place.map.kakao.com/1218078714','https://www.google.com/maps/search/?api=1&query=인천광역시%20검단구%20발산로%2017%20메가타워%201층%20101호','https://youtube.com/channel/UCkdtH4_82nVOP4QPPz3psDg','https://www.instagram.com/geomdanyoon/']
};

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const publicFiles = (await readdir('.')).filter(name => /\.(html|js|css|xml|txt|svg|png|mjs)$/.test(name) && !['build.mjs','server.mjs','config.example.js','search-console-sitemap.png'].includes(name));
for (const file of publicFiles) await cp(file, `dist/${file}`);
if (existsSync('assets')) await cp('assets', 'dist/assets', { recursive: true });
if (existsSync('config.js')) await cp('config.js', 'dist/config.js');

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);
const jsonScript = value => `<script type="application/ld+json">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;
const fetchPublic = async (table, query) => {
  const config = await readFile('config.js', 'utf8');
  const url = config.match(/supabaseUrl:'([^']+)'/)?.[1];
  const key = config.match(/supabaseAnonKey:'([^']+)'/)?.[1];
  if (!url || !key) throw new Error('Public Supabase configuration unavailable');
  const endpoint = new URL(`/rest/v1/${table}`, url);
  endpoint.search = new URLSearchParams(query);
  const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`${table} returned ${response.status}`);
  return response.json();
};
const dealPrice = item => {
  const amount = value => value == null || value === '' ? '' : `${Number(value).toLocaleString('ko-KR')}만원`;
  if (item.transaction_type === '매매') return `매매 ${amount(item.price) || '조건 문의'}`;
  if (item.transaction_type === '전세') return `전세 ${amount(item.deposit) || '조건 문의'}`;
  if (item.transaction_type === '월세') return `보증금 ${amount(item.deposit) || '문의'} · 월세 ${amount(item.rent) || '문의'}`;
  return '가격·거래 조건 문의';
};
const propertyCard = item => `<article class="property-card"><a href="/listing/${encodeURIComponent(item.id)}/"><div class="property-image">${item.image_url ? `<img src="${esc(item.image_url)}" alt="${esc(item.title)} 매물 사진" width="600" height="338" loading="lazy">` : ''}<span class="badge">${esc(item.property_type)} · ${esc(item.transaction_type)}</span></div><div class="property-info"><h3>${esc(item.title)}</h3><span class="property-loc">${esc(item.area || item.address || '검단신도시')}</span><div class="property-price">${esc(dealPrice(item))}</div><div class="property-meta"><span>전용 ${esc(item.area_m2 || '문의')}㎡</span><span>${esc(item.parking || '주차 확인')}</span></div><span class="property-detail-link">매물 상세 보기 ↗</span></div></a></article>`;
const developmentCard = item => `<article class="dev-card">${item.image_url ? `<img src="${esc(item.image_url)}" alt="${esc(item.title)} 분양 안내" width="600" height="338" loading="lazy">` : ''}<div class="dev-card-body"><span class="dev-status">${esc(item.status || '정보 확인')}</span><h2>${esc(item.title)}</h2><p class="dev-meta">${esc(item.category || '분양 정보')}${item.location ? ` · ${esc(item.location)}` : ''}</p>${item.supply_scale ? `<p>공급 규모 · ${esc(item.supply_scale)}</p>` : ''}${item.area_info ? `<p>면적 · ${esc(item.area_info)}</p>` : ''}${item.price_info ? `<p>분양가 · ${esc(item.price_info)}</p>` : ''}${item.schedule ? `<p>일정 · ${esc(item.schedule)}</p>` : ''}${item.description ? `<p>${esc(item.description)}</p>` : ''}<a href="https://talk.naver.com/ct/w5wbcy" target="_blank" rel="noopener noreferrer">네이버 톡톡 문의 ↗</a></div></article>`;

let properties = [];
let developments = [];
try { properties = await fetchPublic('properties_public', { select: '*', order: 'created_at.desc' }); console.log(`Prerendered ${properties.length} public listings.`); }
catch (error) { console.log(`Public listing prerender skipped: ${error.message}`); }
try { developments = await fetchPublic('developments_public', { select: '*', order: 'updated_at.desc' }); console.log(`Prerendered ${developments.length} public developments.`); }
catch (error) { console.log(`Development prerender skipped: ${error.message}`); }

const faqSchemaFrom = html => {
  const entities = [...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)].map(([, body]) => {
    const question = body.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    const answer = body.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/i, '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    return question && answer ? { '@type':'Question', name:question, acceptedAnswer:{ '@type':'Answer', text:answer } } : null;
  }).filter(Boolean);
  return entities.length ? { '@context':'https://schema.org', '@type':'FAQPage', mainEntity:entities } : null;
};
const updatePage = async file => {
  let html = await readFile(`dist/${file}`, 'utf8');
  html = html.replace(/인천광역시 검단구 원당동 1043-14(?:\s*메가타워\s*101호)?/g, officeAddress);
  html = html.replace(/https:\/\/open\.kakao\.com\/o\/saJVu9Si/g, 'https://talk.naver.com/ct/w5wbcy')
    .replace(/카카오톡|카톡/gi, '네이버 톡톡')
    .replace(/href="index\.html(#.*?)?"/g, (_, hash = '') => `href="/${hash}"`)
    .replace(/href='index\.html(#.*?)?'/g, (_, hash = '') => `href='/${hash}'`);
  html = html.replace(/https:\/\/images\.unsplash\.com\/photo-1486406146926-c627a92ad1ab\?auto=format&amp;fit=crop&amp;w=1200&amp;h=630&amp;q=85/g, `${origin}/assets/og-buja.png`);
  html = html.replace(/<meta property="og:image" content="https:\/\/images\.unsplash\.com[^\"]*"\s*\/>/g, `<meta property="og:image" content="${origin}/assets/og-buja.png">`);
  html = html.replace(/index\.html#listings/g, '/#listings').replace(/index\.html#contact/g, '/#contact').replace(/index\.html#home/g, '/#home');
  const faq = faqSchemaFrom(html);
  const pageLabels = {
    'about.html':'사무소 소개', 'developments.html':'검단신도시 신규 분양',
    'geomdan-commercial-guide.html':'검단신도시 상가 안내', 'geomdan-land-officetel-guide.html':'검단 토지·오피스텔·사무실 안내',
    'geomdan-apartment-guide.html':'검단신도시 아파트 안내',
    'geomdan-sangga-house-land.html':'검단 상가주택·단독주택 토지', 'geomdan-e-block-land.html':'검단 E블록 토지',
    'ara-station-commercial.html':'검단 아라역 상가', 'geomdan-officetel.html':'검단신도시 오피스텔', 'geomdan-office.html':'검단신도시 사무실'
  };
  const canonicalUrl = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || `${origin}/${file}`;
  const breadcrumb = {
    '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      { '@type':'ListItem', position:1, name:'홈', item:`${origin}/` },
      { '@type':'ListItem', position:2, name:pageLabels[file] || '검단 부동산 안내', item:canonicalUrl }
    ]
  };
  const isHome = file === 'index.html';
  const graph = [office];
  const oldJson = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (!isHome && oldJson.length) {
    for (const [, raw] of oldJson) {
      try {
        const parsed = JSON.parse(raw);
        for (const entity of parsed['@graph'] || [parsed]) {
          if (entity['@type'] === 'Article') graph.push({ ...entity, dateModified: '2026-11-11' });
          if (entity['@type'] === 'AboutPage' || entity['@type'] === 'WebSite') graph.push(entity);
        }
      } catch { /* discard malformed old metadata and regenerate the common graph */ }
    }
  }
  if (!isHome) graph.push(breadcrumb);
  if (faq) graph.push(faq);
  const structured = jsonScript({ '@context':'https://schema.org', '@graph':graph });
  if (oldJson.length) html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '').replace('</head>', `${structured}\n</head>`);
  else html = html.replace('</head>', `${structured}\n</head>`);
if (isHome) {
    const cards = properties.map(propertyCard).join('\n');
  const fallbackCards = cards || '<article class="property-card"><div class="property-info"><h3>검단신도시 공개 매물 안내</h3><p>현재 공개된 매물이 없습니다. 최신 매물은 전화 또는 네이버 톡톡으로 확인해 주세요.</p><a href="https://blog.naver.com/property98">네이버 블로그에서 매물·정보 확인 ↗</a></div></article>';
    html = html.replace(/<div class="property-grid" id="property-grid">[\s\S]*?(?=<nav class="blog-pagination")/, `<div class="property-grid" id="property-grid">${cards}</div><noscript><div class="noscript-listings"><h3>검단신도시 공개 매물</h3>${fallbackCards}</div></noscript>`);
  }
  if (file === 'developments.html') {
    const cards = developments.map(developmentCard).join('\n');
    html = html.replace(/<section id="development-list" class="dev-grid"[^>]*>[\s\S]*?<\/section>/, `<section id="development-list" class="dev-grid" aria-live="polite">${cards || '<p class="dev-empty">현재 공개된 분양 정보가 없습니다.</p>'}</section><noscript><div class="noscript-developments"><h2>검단신도시 분양 정보</h2>${cards || '<p>현재 공개된 분양 정보가 없습니다.</p>'}</div></noscript>`);
  }
  await writeFile(`dist/${file}`, html);
};

const seoPages = new Set(['index.html','developments.html','geomdan-commercial-guide.html','geomdan-land-officetel-guide.html','geomdan-apartment-guide.html','about.html','geomdan-sangga-house-land.html','geomdan-e-block-land.html','ara-station-commercial.html','geomdan-officetel.html','geomdan-office.html']);
for (const file of seoPages) if (publicFiles.includes(file)) await updatePage(file);

// Produce crawlable detail pages from the public-only view. Do not publish records not visible through RLS.
for (const item of properties) {
  if (!item.id) continue;
  const directory = `dist/listing/${encodeURIComponent(item.id)}`;
  await mkdir(directory, { recursive: true });
  const title = `${item.area || '검단신도시'} ${item.property_type || '부동산'} ${item.transaction_type || '매물'} | ${item.title} | 부자부동산`;
  const canonical = `${origin}/listing/${encodeURIComponent(item.id)}/`;
  const facts = [
    ['중개사무소명','부자부동산공인중개사사무소'],['소재지',officeAddress],['연락처','032-566-8949'],['등록번호','제28260-2024-00008호'],['대표자','윤민욱'],
    ['매물 소재지',item.address || item.area || '검단신도시 · 상세 위치 상담'],['부동산 종류',item.property_type || '문의'],['거래형태 및 가격',dealPrice(item)],['전용면적',item.area_m2 ? `${item.area_m2}㎡` : '상담 시 확인'],['층수',item.floor ? `${item.floor}층` : '상담 시 확인'],['주차',item.parking || '상담 시 확인']
  ];
  const detailSchema = { '@context':'https://schema.org','@type':'RealEstateListing','name':item.title,'url':canonical,'description':String(item.description || `${item.area || '검단신도시'} 공개 매물 안내`).slice(0,300),'datePosted':item.created_at,'address':{'@type':'PostalAddress','addressLocality':item.area || '검단신도시','addressRegion':'인천광역시','addressCountry':'KR'},'provider':{'@id':officeId} };
  const image = /^https:\/\//i.test(item.image_url || '') ? `<meta property="og:image" content="${esc(item.image_url)}">` : '';
  const picture = /^https:\/\//i.test(item.image_url || '') ? `<img src="${esc(item.image_url)}" alt="${esc(item.title)} 매물 사진" width="1200" height="675">` : '';
  const markup = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(String(item.description || `${item.area || '검단신도시'} ${item.property_type || '부동산'} 매물 정보`).slice(0,155))}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:url" content="${canonical}">${image}<link rel="stylesheet" href="/geo-content.css">${jsonScript(detailSchema)}</head><body class="guide-page"><header class="guide-top"><a class="guide-brand" href="/"><img src="/buja-logo.svg" alt=""><span>검단신도시 부자부동산</span></a><a href="/#listings">전체 매물 보기 ↗</a></header><main class="guide-content"><nav aria-label="현재 위치"><a href="/">홈</a>　›　<a href="/#listings">검단신도시 공개 매물</a>　›　${esc(item.property_type || '매물')}</nav><h1>${esc(item.title)}</h1><p>${esc(item.area || '검단신도시')} · ${esc(item.property_type || '부동산')} · ${esc(item.transaction_type || '거래 조건 문의')}</p>${picture}<h2>중개대상물 표시·광고 정보</h2><dl>${facts.map(([label,value]) => `<div><dt><b>${esc(label)}</b></dt><dd>${esc(value)}</dd></div>`).join('')}</dl><h2>상세 안내</h2><p>${esc(item.description || '세부 조건과 현재 거래 가능 여부는 상담 시 확인해 주세요.')}</p>${item.source_url ? `<p><a href="${esc(item.source_url)}" target="_blank" rel="noopener noreferrer">관련 원문 보기 ↗</a></p>` : ''}<aside class="guide-notice">매물 정보와 거래 가능 여부는 변동될 수 있습니다. 최신 조건과 공적 서류를 확인한 뒤 거래를 결정해 주세요.</aside><p><a href="tel:0325668949">전화 상담 · 032-566-8949</a>　<a href="https://talk.naver.com/ct/w5wbcy" target="_blank" rel="noopener noreferrer">네이버 톡톡 문의 ↗</a></p></main><footer class="guide-footer"><b>부자부동산공인중개사사무소</b> · 대표공인중개사 윤민욱<br>${officeAddress} · 등록번호 제28260-2024-00008호</footer></body></html>`;
  await writeFile(`${directory}/index.html`, markup);
}

let sitemap = await readFile('dist/sitemap.xml', 'utf8');
sitemap = sitemap.replace(/<lastmod>[^<]+<\/lastmod>/g, '<lastmod>2026-11-11</lastmod>');
const listingUrls = properties.map(item => `  <url><loc>${origin}/listing/${encodeURIComponent(item.id)}/</loc><lastmod>${String(item.updated_at || item.created_at || '2026-11-11').slice(0,10)}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`).join('\n');
sitemap = sitemap.replace('</urlset>', `${listingUrls}\n</urlset>`);
await writeFile('dist/sitemap.xml', sitemap);
await writeFile('dist/llms.txt', `# 검단신도시 부자부동산\n\n부자부동산공인중개사사무소는 인천광역시 검단구 원당동의 메가타워 1층 101호에 있는 공인중개사사무소입니다. 검단신도시의 상가·상가주택·토지·오피스텔·사무실·아파트 매매와 임대차를 상담합니다. 대표공인중개사 윤민욱, 등록번호 제28260-2024-00008호, 전화 032-566-8949. 운영시간 월~토 10:00~19:00, 일요일 휴무.\n\n## 주요 페이지\n- [홈페이지](${origin}/)\n- [사무소 소개](${origin}/about)\n- [신규 분양 안내](${origin}/developments.html)\n- [검단 상가 안내](${origin}/geomdan-commercial-guide.html)\n- [토지·오피스텔·사무실 안내](${origin}/geomdan-land-officetel-guide.html)\n- [아파트 안내](${origin}/geomdan-apartment-guide.html)\n- [상가주택·토지](${origin}/geomdan-sangga-house-land)\n- [검단 E블록 토지](${origin}/geomdan-e-block-land)\n- [아라역 상가](${origin}/ara-station-commercial)\n- [검단 오피스텔](${origin}/geomdan-officetel)\n- [검단 사무실](${origin}/geomdan-office)\n\n매물 조건과 거래 가능 여부는 변경될 수 있으므로 원문, 최신 공적 장부와 사무소 상담으로 확인하세요.\n`);
console.log('Built static site, crawlable property/development lists, SEO metadata, and sitemap into dist/.');
