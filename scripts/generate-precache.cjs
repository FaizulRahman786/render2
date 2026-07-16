#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Script to scan the `dist` folder and produce a `precache-manifest.json`
// with the list of files that should be precached by the service worker.

const distDir = path.resolve(process.cwd(), 'dist');
const outFile = path.join(distDir, 'precache-manifest.json');

function walk(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found. Run `vite build` first.');
  process.exit(0);
}

const allFiles = walk(distDir)
  .map(f => path.relative(distDir, f).replace(/\\/g, '/'))
  .filter(p => p !== 'precache-manifest.json');

// Cache hashed/static assets only. index.html is intentionally excluded: it is
// NOT content-hashed, so precaching it would pin a stale shell referencing
// deleted bundles after a deploy (navigations use network-first instead).
const precache = allFiles
  .filter(p => /\.(js|css|svg|png|jpg|jpeg|webp|woff2?|json)$/.test(p))
  .filter(p => p !== 'index.html')
  .map(p => '/' + p.replace(/^\/?/, ''));

fs.writeFileSync(outFile, JSON.stringify(precache, null, 2));
console.log('Wrote precache manifest with', precache.length, 'entries to', outFile);
