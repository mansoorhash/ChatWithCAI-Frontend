const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(projectRoot, 'public', '.well-known', 'api-catalog');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

if (!Array.isArray(catalog.linkset) || catalog.linkset.length === 0) {
  throw new Error('API catalog must contain a non-empty linkset array');
}

const requiredRelations = ['service-desc', 'service-doc'];
const supportedRelations = [...requiredRelations, 'status'];

for (const entry of catalog.linkset) {
  const anchor = new URL(entry.anchor);
  if (anchor.protocol !== 'https:') {
    throw new Error(`API catalog anchor must use HTTPS: ${entry.anchor}`);
  }

  for (const relation of requiredRelations) {
    if (!Array.isArray(entry[relation]) || entry[relation].length === 0) {
      throw new Error(`API catalog entry ${entry.anchor} is missing ${relation}`);
    }
  }

  for (const relation of supportedRelations) {
    for (const link of entry[relation] || []) {
      const href = new URL(link.href);
      if (href.protocol !== 'https:' || typeof link.type !== 'string') {
        throw new Error(`Invalid ${relation} link for ${entry.anchor}`);
      }
    }
  }
}

console.log(`Validated ${catalog.linkset.length} API catalog entry.`);
