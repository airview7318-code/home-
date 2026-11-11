import { mkdir, writeFile } from 'node:fs/promises';

const origin = 'https://buja-real-estate.vercel.app';
const address = '인천광역시 검단구 발산로 17 메가타워 1층 101호 (원당동 1043-14)';
const officeId = `${origin}/#office`;
const office = { '@type':'RealEstateAgent','@id':officeId,name:'부자부동산공인중개사사무소',alternateName:'검단신도시 부자부동산',url:`${origin}/`,telephone:'+82-32-566-8949',address:{'@type':'PostalAddress',streetAddress:'발산로 17 메가타워 1층 101호 (원당동 1043-14)',addressLocality:'검단구',addressRegion:'인천광역시',postalCode:'23449',addressCountry:'KR'},hasMap:'https://map.naver.com/p/entry/place/1364587352',founder:{'@type':'Person',name:'윤민욱',jobTitle:'대표공인중개사'},identifier:{'@type':'PropertyValue',name:'중개사무소 등록번호',value:'제28260-2024-00008호'},openingHoursSpecification:{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],opens:'10:00',closes:'19:00'},sameAs:['https://blog.naver.com/property98','https://map.naver.com/p/entry/place/1364587352','https://place.map.kakao.com/1218078714','https://www.google.com/maps/search/?api=1&query=인천광역시%20검단구%20발산로%2017%20메가타워%201층%20101호','https://youtube.com/channel/UCkdtH4_82nVOP4QPPz3psDg','https://www.instagram.com/geomdanyoon/']};
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => `<script type="application/ld+json">${JSON.stringify(value).replace(/</g,'\\u003c')}</script>`;
const topics = [
  {
    slug:'geomdan-sangga-house-land', title:'검단신도시 상가주택·단독주택 토지 매물 안내', description:'검단신도시 상가주택·단독주택 토지를 알아볼 때 용도지역, 도로 접근, 건축물대장과 토지이용계획 등 계약 전 확인 사항을 정리합니다.',
    intro:'검단신도시에서 상가주택이나 단독주택 용도의 토지를 찾을 때는 매입 목적, 허용 용도, 도로 조건과 기반 시설을 함께 살펴야 합니다. 아래 기준으로 후보지를 비교하고, 개별 필지의 가능 여부는 최신 공적 자료와 관계 기관에 확인하세요.',
    checks:['토지이용계획확인서에서 용도지역·지구와 행위 제한을 확인합니다.','지적도와 토지대장으로 면적·지목·경계 정보를 살펴봅니다.','도로 접면과 진입 동선, 상·하수도 등 기반 시설을 현장에서 확인합니다.','건축 가능 규모와 인허가 여부는 토지별로 다르므로 관할 기관에 문의합니다.'],
    faq:[['상가주택 토지는 무엇부터 확인하나요?','토지이용계획, 도로 접면, 지목, 기반 시설과 원하는 용도의 건축 가능 여부를 최신 자료로 확인하세요.'],['단독주택을 지을 수 있는지 홈페이지 정보만으로 알 수 있나요?','필지별 규제와 계획이 달라 온라인 소개만으로 확정할 수 없습니다. 관할 기관과 관련 전문가에게 확인해야 합니다.'],['검단 토지 상담 때 필요한 정보는 무엇인가요?','희망 위치나 지번, 면적, 예산, 사용 목적과 검토 시기를 정리하면 비교 상담에 도움이 됩니다.']],
    blog:'https://blog.naver.com/property98'
  },
  {
    slug:'geomdan-e-block-land', title:'검단신도시 E블록 토지 매물·입지 확인 안내', description:'검단신도시 E블록 토지를 검토할 때 지번, 토지이용계획, 도로와 주변 생활권 등 실제 확인할 항목을 부자부동산이 안내합니다.',
    intro:'E블록 토지는 위치 이름만으로 이용 조건이나 개발 가능성을 단정할 수 없습니다. 대상 필지의 지번과 공적 장부를 기준으로 도로·경계·주변 환경을 확인하고, 용도와 인허가 조건은 공식 자료로 따로 검토하세요.',
    checks:['정확한 지번과 토지대장상 면적·지목을 확인합니다.','토지이용계획과 도시관리계획의 최신 내용을 확인합니다.','차량 진입, 도로 폭, 주변 시설과 현장 고저차를 살펴봅니다.','가격·거래 조건과 권리관계는 최신 자료와 계약 당사자에게 확인합니다.'],
    faq:[['E블록이라는 이름만으로 건축 가능 여부를 알 수 있나요?','아닙니다. 필지별 용도지역·지구와 지구단위계획 등을 확인해야 합니다.'],['토지 현장에서 무엇을 봐야 하나요?','경계, 접한 도로와 진입 동선, 주변 시설, 배수와 지형 등 실제 이용에 필요한 요소를 확인하세요.'],['토지 매물 상담에 지번이 꼭 필요한가요?','정확한 지번이 있으면 공적 자료와 위치를 대조하기 쉬워집니다. 아직 없다면 희망 구역·면적·예산부터 알려주세요.']],
    blog:'https://blog.naver.com/property98'
  },
  {
    slug:'ara-station-commercial', title:'검단 아라역 상가 임대·매매 상담 안내', description:'검단 아라역 인근 상가를 찾을 때 업종 적합성, 보행 동선, 임대료와 관리비, 시설 상태를 확인하는 기준을 정리했습니다.',
    intro:'아라역 인근 상가를 고를 때는 역과의 거리뿐 아니라 건물 출입구, 층, 보행 동선, 예정 업종과 점포 운영 비용을 함께 비교해야 합니다. 시간대별 현장 확인과 계약 전 서류 확인을 권합니다.',
    checks:['건축물 용도와 예정 업종의 사용·인허가 조건을 확인합니다.','층·전면·간판 위치와 역에서 점포까지 실제 보행 경로를 살펴봅니다.','보증금·월세·관리비·권리금 및 별도 비용을 구분해 비교합니다.','전기·급배수·환기·주차와 입점·원상회복 조건을 문서로 확인합니다.'],
    faq:[['아라역 가까운 상가는 모두 유동 인구가 많나요?','역과의 거리만으로 실제 유동을 단정할 수 없습니다. 출입구와 동선, 시간대별 현장을 직접 살펴보세요.'],['상가 계약 전에 업종도 확인해야 하나요?','건축물 용도, 건물 관리 규정과 업종별 인허가 요건을 확인해야 합니다. 최종 가능 여부는 관계 기관에 문의하세요.'],['월 임대료 외에 어떤 비용을 비교해야 하나요?','관리비와 별도 공과금, 주차료, 권리금, 시설 인수 비용 등 실제 부담 항목을 함께 확인하세요.']],
    blog:'https://blog.naver.com/property98/224435453340'
  },
  {
    slug:'geomdan-officetel', title:'검단신도시 오피스텔 매매·전월세 안내', description:'검단신도시 오피스텔 매매·전세·월세를 알아볼 때 전용면적, 관리비, 주차, 입주 가능일과 계약 조건을 확인하는 기준입니다.',
    intro:'검단 오피스텔은 거주·업무 등 이용 목적에 따라 살펴볼 조건이 달라집니다. 전용면적과 관리비, 주차·공용시설, 실제 시설 상태와 입주 가능일을 현장에서 확인하세요.',
    checks:['전용면적과 구조, 채광·환기 및 옵션 작동 상태를 확인합니다.','매매가 또는 보증금·월세에 관리비와 별도 비용을 더해 비교합니다.','주차 방식, 공용시설, 관리 규정과 입주 가능일을 확인합니다.','임대차 계약기간, 보증금 반환 조건, 수선 책임과 특약을 서면으로 확인합니다.'],
    faq:[['오피스텔 관리비는 어떻게 비교하나요?','관리비 항목과 최근 고지 내역, 전기·수도·난방 등 별도 부과 여부를 확인하세요.'],['주거용인지 업무용인지 확인해야 하나요?','이용 목적과 건축물대장상 용도, 세금·전입 등 관련 조건은 개별 상황에 따라 다르므로 관계 기관과 전문가에게 확인하세요.'],['전세·월세 계약 전 가장 먼저 볼 것은 무엇인가요?','임대인과 권리관계, 보증금 반환 조건, 관리비, 실제 인도 상태와 계약서 특약을 최신 자료로 확인하세요.']],
    blog:'https://blog.naver.com/property98'
  },
  {
    slug:'geomdan-office', title:'검단신도시 사무실 임대·매매 상담 안내', description:'검단신도시 사무실을 찾을 때 업무 인원, 건축물 용도, 주차, 관리비, 시설과 입주 일정을 함께 확인하세요.',
    intro:'검단에서 사무실을 알아볼 때는 월 임대료뿐 아니라 실제 업무 인원과 필요한 공간, 방문객 동선, 주차와 관리비를 함께 검토해야 합니다. 사업자등록과 업종 가능 여부는 건물 조건과 관계 기관에 별도 확인이 필요합니다.',
    checks:['상주 인원과 회의·상담 공간, 필요한 전용면적을 정리합니다.','건축물 용도와 관리 규정, 사업자등록·업종 조건을 확인합니다.','임대료·관리비·주차료와 전기·통신 등 월 고정비를 비교합니다.','냉난방·전력·인터넷·시설 인수와 입주 일정을 현장에서 확인합니다.'],
    faq:[['사무실을 볼 때 먼저 정할 조건은 무엇인가요?','업무 인원, 필요한 면적, 회의·상담 공간, 예산, 주차와 입주 시기를 정리하세요.'],['이 건물에서 원하는 업종으로 사업자등록이 가능한가요?','건축물 용도와 업종별 기준에 따라 달라집니다. 건물 관리 주체와 관할 기관에 사전에 확인하세요.'],['월 임대료 외에 확인할 비용은 무엇인가요?','관리비, 주차료, 공과금, 통신 비용, 시설 인수·원상회복 비용을 함께 확인하세요.']],
    blog:'https://blog.naver.com/property98'
  }
];

for (const page of topics) {
  const url = `${origin}/${page.slug}`;
  const faq = page.faq.map(([question,answer])=>`<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join('\n');
  const faqEntities = page.faq.map(([question,answer])=>({'@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer}}));
  const article = {'@type':'Article',headline:page.title,description:page.description,inLanguage:'ko-KR',datePublished:'2026-11-11',dateModified:'2026-11-11',author:{'@type':'Person',name:'윤민욱'},publisher:{'@id':officeId},mainEntityOfPage:url};
  const breadcrumb = {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'홈',item:`${origin}/`},{'@type':'ListItem',position:2,name:'검단 부동산 안내',item:`${origin}/geomdan-commercial-guide.html`},{'@type':'ListItem',position:3,name:page.title,item:url}]};
  const schema = {'@context':'https://schema.org','@graph':[office,article,breadcrumb,{'@type':'FAQPage',mainEntity:faqEntities}]};
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="검단신도시 부자부동산"><meta property="og:title" content="${esc(page.title)} | 부자부동산"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/assets/og-buja.png"><title>${esc(page.title)} | 부자부동산</title><link rel="icon" href="/buja-logo.svg"><link rel="stylesheet" href="/geo-content.css">${json(schema)}</head><body class="guide-page"><header class="guide-top"><a class="guide-brand" href="/"><img src="/buja-logo.svg" alt=""><span>검단신도시 부자부동산</span></a><a href="https://talk.naver.com/ct/w5wbcy" target="_blank" rel="noopener noreferrer">네이버 톡톡 상담 ↗</a></header><nav class="guide-breadcrumb"><a href="/">홈</a>　›　<a href="/geomdan-commercial-guide.html">검단 부동산 안내</a>　›　${esc(page.title)}</nav><header class="guide-hero"><span class="eyebrow">GEOMDAN PROPERTY · LOCAL GUIDE</span><h1>${esc(page.title)}</h1><p>${esc(page.intro)}</p><div class="guide-meta">부자부동산공인중개사사무소 · 대표공인중개사 윤민욱</div></header><main class="guide-content"><h2>${esc(page.title.replace(' 안내',''))} 확인 체크리스트</h2><ul>${page.checks.map(item=>`<li>${esc(item)}</li>`).join('')}</ul><h2>상담 전에 정리하면 좋은 조건</h2><p>희망 위치와 예산, 거래 유형, 면적, 이용 목적, 필요한 시기를 정리해 주세요. 공개 매물의 가격과 거래 가능 여부는 달라질 수 있어 상담 시점에 다시 확인합니다.</p><section class="content-placeholder"><h2>현장 사례와 상세 내용을 추가해 주세요</h2><p>여기에 직접 확인한 현장 사진, 매물 조건, 최신 자료와 작성자 의견을 추가할 수 있습니다.</p><p class="editor-note">작성 자리: 실제 주소·호실을 공개할 수 있는지 확인한 뒤, 확인된 정보와 원문 링크를 입력하세요.</p></section><h2>자주 묻는 질문</h2><div class="guide-faq">${faq}</div><p>관련 글: <a href="${esc(page.blog)}" target="_blank" rel="noopener noreferrer">네이버 블로그 글에서 더 보기 ↗</a></p><div class="guide-cta"><div><b>검단 부동산 상담이 필요하신가요?</b><p>전화 또는 네이버 톡톡으로 희망 조건을 알려주세요.</p></div><a href="https://talk.naver.com/ct/w5wbcy" target="_blank" rel="noopener noreferrer">네이버 톡톡 상담 ↗</a><a href="tel:0325668949">032-566-8949 전화하기</a></div></main><footer class="guide-footer"><b>부자부동산공인중개사사무소</b> · 대표공인중개사 윤민욱<br>${address} · 등록번호 제28260-2024-00008호<br><a href="/">홈</a> · <a href="https://map.naver.com/p/entry/place/1364587352">네이버 플레이스</a> · <a href="https://talk.naver.com/ct/w5wbcy">네이버 톡톡</a></footer><script defer src="/visit-tracker.js"></script><script defer src="/analytics.js"></script></body></html>`;
  await writeFile(`${page.slug}.html`, html);
}

await mkdir('assets', { recursive: true });
const aboutUrl = `${origin}/about`;
const aboutSchema = {'@context':'https://schema.org','@graph':[office,{'@type':'AboutPage',name:'부자부동산 사무소 소개',url:aboutUrl,about:{'@id':officeId},dateModified:'2026-11-11'},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'홈',item:`${origin}/`},{'@type':'ListItem',position:2,name:'사무소 소개',item:aboutUrl}]}]};
await writeFile('about.html', `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="검단신도시 부자부동산공인중개사사무소 소개. 대표공인중개사 윤민욱, 상가·토지·오피스텔·사무실·아파트 중개 상담과 위치·주차 안내."><link rel="canonical" href="${aboutUrl}"><meta property="og:title" content="부자부동산 사무소 소개 | 검단신도시"><meta property="og:description" content="검단신도시 부자부동산공인중개사사무소의 대표, 자격과 등록 정보, 위치 및 주차 안내."><meta property="og:image" content="${origin}/assets/og-buja.png"><title>부자부동산 사무소 소개 | 검단신도시 부동산</title><link rel="stylesheet" href="/geo-content.css">${json(aboutSchema)}</head><body class="guide-page"><header class="guide-top"><a class="guide-brand" href="/"><img src="/buja-logo.svg" alt=""><span>검단신도시 부자부동산</span></a><a href="https://talk.naver.com/ct/w5wbcy" target="_blank" rel="noopener noreferrer">네이버 톡톡 상담 ↗</a></header><main class="guide-content"><nav class="guide-breadcrumb"><a href="/">홈</a>　›　사무소 소개</nav><header class="guide-hero"><span class="eyebrow">ABOUT BUJA REAL ESTATE</span><h1>검단신도시 부자부동산</h1><p>검단 지역의 상가·상가주택·토지·오피스텔·사무실·아파트 매매와 임대차를 상담합니다.</p></header><section><h2>대표공인중개사 소개</h2><p><b>윤민욱 대표공인중개사</b>가 지역과 물건의 조건을 확인해 상담합니다. 계약 전 필요한 서류와 현장 상태를 함께 점검하고, 확인이 필요한 내용은 최신 공적 자료와 관계 기관 기준으로 안내합니다.</p><div class="about-photo-placeholder" role="img" aria-label="부자부동산 사무실 사진을 추가할 자리">사무실 외관 또는 내부 사진 추가 자리</div></section><section><h2>중개사무소 정보</h2><dl><div><dt>상호</dt><dd>부자부동산공인중개사사무소</dd></div><div><dt>대표</dt><dd>윤민욱 · 대표공인중개사</dd></div><div><dt>등록번호</dt><dd>제28260-2024-00008호</dd></div><div><dt>자격 정보</dt><dd>공인중개사 자격번호: [등록증 기준으로 입력]</dd></div><div><dt>주소</dt><dd>${address}</dd></div><div><dt>전화</dt><dd><a href="tel:0325668949">032-566-8949</a></dd></div><div><dt>영업시간</dt><dd>월~토 10:00~19:00 · 일요일 휴무</dd></div><div><dt>주차</dt><dd>메가타워 건물 주차 이용 가능 · 방문 전 전화로 주차 방법 확인</dd></div></dl></section><section><h2>오시는 길</h2><p>${address}<br>아라역 7번 출구 인근입니다. 네이버 플레이스에서 정확한 경로를 확인해 주세요.</p><p><a href="https://map.naver.com/p/entry/place/1364587352" target="_blank" rel="noopener noreferrer">네이버 플레이스에서 길찾기 ↗</a></p></section><div class="guide-cta"><div><b>방문 전 상담 시간을 확인해 주세요.</b><p>월~토 10:00~19:00 · 매주 일요일 휴무</p></div><a href="tel:0325668949">032-566-8949 전화하기</a><a href="https://talk.naver.com/ct/w5wbcy" target="_blank" rel="noopener noreferrer">네이버 톡톡 문의 ↗</a></div></main><footer class="guide-footer"><b>부자부동산공인중개사사무소</b> · 대표공인중개사 윤민욱<br>${address} · 등록번호 제28260-2024-00008호<br><a href="/">홈</a> · <a href="https://talk.naver.com/ct/w5wbcy">네이버 톡톡</a></footer><script defer src="/visit-tracker.js"></script><script defer src="/analytics.js"></script></body></html>`);

const mainPages = ['index.html','developments.html','geomdan-commercial-guide.html','geomdan-land-officetel-guide.html','geomdan-apartment-guide.html','about.html',...topics.map(page=>`${page.slug}.html`)];
for (const file of mainPages) {
  let html = await (await import('node:fs/promises')).readFile(file,'utf8');
  const articleNodes = [];
  for (const [, raw] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(raw);
      for (const node of parsed['@graph'] || [parsed]) if (['Article','AboutPage','WebSite'].includes(node['@type'])) articleNodes.push(node['@type']==='Article'?{...node,dateModified:'2026-11-11'}:node);
    } catch { /* common metadata replaces any invalid prior block */ }
  }
  const breadcrumb = {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'홈',item:`${origin}/`},{'@type':'ListItem',position:2,name:file==='index.html'?'검단신도시 부자부동산':file==='about.html'?'사무소 소개':'검단 부동산 안내',item:`${origin}/${file==='index.html'?'':file}`} ]};
  const faqs = [...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)].map(([,body])=>{
    const q=body.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
    const a=body.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/i,'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
    return q&&a?{'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}:null;
  }).filter(Boolean);
  const graph=[office,...articleNodes];
  if(file!=='index.html') graph.push(breadcrumb);
  if(faqs.length) graph.push({'@type':'FAQPage',mainEntity:faqs});
  html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'').replace('</head>',`${json({'@context':'https://schema.org','@graph':graph})}</head>`);
  await writeFile(file,html);
}
