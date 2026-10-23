import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html','404.html','admin.html','privacy.html','property.html','developments.html','developments.js','geomdan-commercial-guide.html','geomdan-land-officetel-guide.html','geomdan-apartment-guide.html','styles.css','insights.css','reference.css','refinement.css','services.css','geo-content.css','app.js','property.js','admin.js','insights.js','services.js','analytics.js','visit-tracker.js','robots.txt','sitemap.xml','favicon.png']) await cp(file, `dist/${file}`);
if (existsSync('assets')) await cp('assets','dist/assets',{recursive:true});
if (existsSync('config.js')) await cp('config.js','dist/config.js');
// Add public listing detail URLs to the sitemap at build time when the public view is reachable.
try {
  const config = await readFile('config.js', 'utf8');
  const supabaseUrl = config.match(/supabaseUrl:'([^']+)'/)?.[1];
  const anonKey = config.match(/supabaseAnonKey:'([^']+)'/)?.[1];
  if (supabaseUrl && anonKey) {
    const endpoint = new URL('/rest/v1/properties_public', supabaseUrl);
    endpoint.search = new URLSearchParams({ select: 'id' });
    const response = await fetch(endpoint, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    if (response.ok) {
      const listings = await response.json();
      if (Array.isArray(listings) && listings.length) {
        let sitemap = await readFile('dist/sitemap.xml', 'utf8');
        const entries = listings.filter(item => item.id).map(item => `  <url>\n    <loc>https://buja-real-estate.vercel.app/property/${encodeURIComponent(item.id)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`).join('\n');
        sitemap = sitemap.replace('</urlset>', `${entries}\n</urlset>`);
        await writeFile('dist/sitemap.xml', sitemap);
        console.log(`Added ${listings.length} public property URLs to sitemap.`);
      }
    } else console.log('Public listing sitemap entries skipped; the homepage and guide URLs remain in sitemap.');
  }
} catch {
  console.log('Public listing sitemap entries skipped; the homepage and guide URLs remain in sitemap.');
}
console.log('Built static site into dist/');

await cp('profile-yun-minuk.png','dist/profile-yun-minuk.png');
await cp('buja-logo.svg','dist/buja-logo.svg');



