const ALLOWED_HOST = 'blogthumb.pstatic.net';

function isAllowedImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === ALLOWED_HOST &&
      !url.username && !url.password && !url.port &&
      /\.(?:png|jpe?g|webp|gif)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

module.exports = async function blogImage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  const imageUrl = typeof req.query.src === 'string' ? req.query.src : '';
  const postId = typeof req.query.id === 'string' && /^\d{8,20}$/.test(req.query.id)
    ? req.query.id
    : '';

  if (!postId || imageUrl.length > 3000 || !isAllowedImageUrl(imageUrl)) {
    return res.status(400).end();
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BujaRealEstate/1.0)',
        Referer: `https://blog.naver.com/property98/${postId}`
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok || !isAllowedImageUrl(response.url)) {
      return res.status(502).end();
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)) {
      return res.status(502).end();
    }

    const image = Buffer.from(await response.arrayBuffer());
    if (!image.length || image.length > 8 * 1024 * 1024) {
      return res.status(502).end();
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', image.length);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    return res.status(200).send(image);
  } catch {
    return res.status(502).end();
  }
};
