const FEED_URL = 'https://rss.blog.naver.com/property98.xml';

function xmlValue(source, name) {
  const match = source.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  if (!match) return '';
  return match[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '').trim();
}

function decodeXml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    const key = entity.toLowerCase();
    if (key === 'amp') return '&';
    if (key === 'lt') return '<';
    if (key === 'gt') return '>';
    if (key === 'quot') return '"';
    if (key === 'apos') return "'";
    const point = key.startsWith('#x') ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    return Number.isFinite(point) ? String.fromCodePoint(point) : '';
  });
}

function plainText(value) {
  return decodeXml(value.replace(/<img\b[^>]*>/gi, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeExcerpt(value) {
  return plainText(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
    .replace(/(?:\+?82[-. ]?)?0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4}/g, '')
    .replace(/(?:전화|휴대전화|연락처|문의)\s*[:：]?/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, 120);
}

function classify(category, title) {
  const c = category.replace(/\s/g, '');
  const t = title.replace(/\s/g, '');
  const listing = /매물|호실|입주임박|임대중|선임대|급매|분양중|매매가|매매금액/.test(t);
  if (!listing && /건축물대장|등기부등본|확정일자|전입신고|권리분석|임대차계약|계약체크|계약전|계약서|용도지역|건폐율|용적률|중개보수|중개수수료|취득세|재산세|보증금|월세|관리비|체크리스트|확인방법|보는법|보는방법|주의사항|절차|계산방법|계산법/.test(t)) return '정보';
  if (!listing && /정보|가이드|칼럼|생활법률/.test(c)) return '정보';
  if (/오피스텔/.test(t)) return '오피스텔';
  if (/아파트/.test(t) && /아파트/.test(c)) return '아파트';
  if (/토지|택지|필지/.test(t) || c.includes('토지')) return '토지';
  if (c.includes('상가') || c.includes('사무실')) return /사무실|업무공간/.test(t) ? '사무실' : '상가';
  if (/상가|사무실|창업|양도양수/.test(t)) return /사무실/.test(t) ? '사무실' : '상가';
  if (/검단|부동산/.test(t) || /소식|뉴스/.test(c)) return '소식';
  return '정보';
}

function imageFrom(description) {
  const source = description.match(/<img\b[^>]*?src=["']([^"']+)["']/i)?.[1] || '';
  try {
    const image = new URL(decodeXml(source));
    return image.protocol === 'https:' && image.hostname.endsWith('.pstatic.net') ? image.href : '';
  } catch { return ''; }
}

module.exports = async function blogFeed(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
  try {
    const response = await fetch(FEED_URL, { headers: { 'User-Agent': 'Mozilla/5.0 BujaRealEstateSite/1.0', Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error(`Naver RSS returned ${response.status}`);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(([, item]) => {
      const title = plainText(xmlValue(item, 'title'));
      const category = plainText(xmlValue(item, 'category'));
      const id = (xmlValue(item, 'guid').match(/property98\/(\d+)/) || xmlValue(item, 'link').match(/property98\/(\d+)/))?.[1];
      if (!id || !title) return null;
      const kind = classify(category, title);
      const description = xmlValue(item, 'description');
      return {
        id, kind, title,
        url: `https://blog.naver.com/property98/${id}`,
        category: category || '검단 부동산 소식',
        summary: safeExcerpt(description) || '검단신도시 부동산 관련 내용을 네이버 블로그 원문에서 확인하세요.',
        image: imageFrom(description),
        publishedAt: plainText(xmlValue(item, 'pubDate'))
      };
    }).filter(Boolean);

    const grouped = new Map();
    for (const item of items) {
      if (!['상가', '토지', '오피스텔', '사무실', '아파트'].includes(item.kind)) continue;
      const group = grouped.get(item.kind) || [];
      group.push(item);
      grouped.set(item.kind, group);
    }
    const propertyPosts = [...grouped.values()].flat();
    const newsPosts = items.filter(item => item.kind === '소식').slice(0, 6);
    const infoPosts = items.filter(item => item.kind === '정보').slice(0, 12);
    return res.status(200).json({ propertyPosts, newsPosts, infoPosts, updatedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ error: '블로그 피드를 불러오지 못했습니다.' });
  }
};
