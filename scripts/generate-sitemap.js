const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://chatwithcai.com';
const projectRoot = path.resolve(__dirname, '..');
const routesPath = path.join(projectRoot, 'src', 'public', 'publicPageRoutes.jsx');
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');

const routeSource = fs.readFileSync(routesPath, 'utf8');
const routePattern = /\{\s*path:\s*(['"])(.*?)\1\s*,\s*element:/g;
const routePaths = [...routeSource.matchAll(routePattern)].map((match) => match[2]);

if (routePaths.length === 0) {
  throw new Error(`No public routes found in ${routesPath}`);
}

const unsupportedRoutes = routePaths.filter(
  (routePath) => routePath.includes(':') || routePath.includes('*')
);

if (unsupportedRoutes.length > 0) {
  throw new Error(
    `Public sitemap routes must be canonical static paths: ${unsupportedRoutes.join(', ')}`
  );
}

const canonicalUrls = routePaths.map((routePath) => {
  const normalizedPath = routePath === '' ? '/' : routePath;
  return new URL(normalizedPath, SITE_ORIGIN).href;
});

if (new Set(canonicalUrls).size !== canonicalUrls.length) {
  throw new Error('Duplicate canonical URLs found in the public route definitions');
}

const escapeXml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const entries = canonicalUrls
  .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
  .join('\n');

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  entries,
  '</urlset>',
  '',
].join('\n');

fs.writeFileSync(sitemapPath, sitemap, 'utf8');
console.log(`Generated ${sitemapPath} with ${canonicalUrls.length} URLs.`);
