// Generates public/sitemap.xml (+ sets the Sitemap line in robots.txt) from the
// public routes known to be indexable. SITE_URL (or VITE_SITE_URL) should be set
// at build time to the canonical public origin; otherwise a placeholder keeps the
// pipeline deterministic and the build logs a warning.
const fs = require('fs');
const path = require('path');

const SITE_URL = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
const publicDir = path.join(__dirname, '..', 'public');

const PUBLIC_ROUTES = ['/', '/courses', '/faculty', '/notices', '/events', '/contact'];

function buildSitemap(base) {
  const urls = PUBLIC_ROUTES.map((route) => {
    const loc = route === '/' ? new URL('/', base).toString() : new URL(route.replace(/^\//, ''), base).toString();
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function writeRobotsSitemap(base) {
  const robotsPath = path.join(publicDir, 'robots.txt');
  if (!fs.existsSync(robotsPath)) return;
  const robots = fs.readFileSync(robotsPath, 'utf8');
  const stripped = robots.replace(/^Sitemap:.*$/m, '').trimEnd();
  const withSitemap = base ? `${stripped}\n\nSitemap: ${new URL('sitemap.xml', base).toString()}\n` : stripped;
  fs.writeFileSync(robotsPath, `${withSitemap}\n`);
}

if (SITE_URL) {
  const base = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), buildSitemap(base));
  writeRobotsSitemap(base);
  console.log(`[sitemap] wrote public/sitemap.xml for ${base}`);
} else {
  // Sitemap skipped — keep a helpful empty file out of the pipeline to avoid a
  // dangling 404 for /sitemap.xml, and clearly log the requirement.
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Set SITE_URL or VITE_SITE_URL at build time to generate the sitemap. -->\n');
  console.warn('[sitemap] SITE_URL/VITE_SITE_URL not set — wrote placeholder, real sitemap requires the public origin.');
}