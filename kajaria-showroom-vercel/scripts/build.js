'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const publicDirectory = path.join(projectRoot, 'public');
const siteUrl = String(
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://example.com')
).replace(/\/$/, '');

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function getBusinessSchema() {
  const business = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: env('BUSINESS_NAME', 'Kajaria Shop'),
    url: `${siteUrl}/`,
    image: 'https://images.unsplash.com/photo-1708540084677-dc5838b37627?auto=format&fit=crop&w=2000&q=85',
    description: `Tile showroom serving ${env('CITY', 'Roorkee')} and nearby areas. Explore floor, wall, bathroom, kitchen and design-led tile collections.`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: env('CITY', 'Roorkee'),
      addressRegion: env('STATE', 'Uttarakhand'),
      addressCountry: 'IN'
    },
    areaServed: {
      '@type': 'City',
      name: env('CITY', 'Roorkee')
    }
  };

  const address = env('STREET_ADDRESS');
  const postalCode = env('POSTAL_CODE');
  const phone = env('PHONE_E164');
  const email = env('PUBLIC_EMAIL');
  const hours = env('OPENING_HOURS');

  if (address) business.address.streetAddress = address;
  if (postalCode) business.address.postalCode = postalCode;
  if (phone) business.telephone = phone;
  if (email) business.email = email;
  if (hours) business.openingHours = hours;

  return `<script type="application/ld+json">${escapeJsonForHtml(business)}</script>`;
}

function walkHtml(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

for (const filePath of walkHtml(publicDirectory)) {
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replaceAll('__SITE_URL__', siteUrl);
  if (filePath === path.join(publicDirectory, 'index.html')) {
    html = html.replace('__BUSINESS_SCHEMA__', getBusinessSchema());
  }
  fs.writeFileSync(filePath, html);
}

const sitemapPaths = [
  '/',
  '/collections.html',
  '/about.html',
  '/contact.html',
  '/guides/choosing-tiles.html',
  '/privacy.html',
  '/terms.html'
];

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapPaths.map((urlPath) => `  <url><loc>${siteUrl}${urlPath === '/' ? '/' : urlPath}</loc><changefreq>monthly</changefreq></url>`),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(path.join(publicDirectory, 'sitemap.xml'), sitemap);
fs.writeFileSync(
  path.join(publicDirectory, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /admin\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`
);

console.log(`Prepared static site files for ${siteUrl}`);
