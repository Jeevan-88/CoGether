#!/usr/bin/env node
/**
 * CoShop Automated Product Publisher & Scraper CLI
 * 
 * Usage:
 *   1. Publish from file:
 *      node scripts/coshop-publisher.js
 * 
 *   2. Watch and auto-publish on file change:
 *      node scripts/coshop-publisher.js --watch
 * 
 *   3. Scrape and publish a single URL directly:
 *      node scripts/coshop-publisher.js --url "https://www.nike.com/in/t/air-force-1-07-shoes-WrLlWX/CW2288-111"
 * 
 *   4. Fast CLI manual publish:
 *      node scripts/coshop-publisher.js --title "Nike Dunk Low" --price 8295 --brand "Nike" --image "https://..." --link "https://..."
 */

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_URL || process.env.COSHOP_API_URL || 'http://localhost:3000';
const DEFAULT_ITEMS_FILE = path.resolve(__dirname, 'products-to-publish.json');

// Parse CLI Arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

async function publishSingleProduct(productData) {
  try {
    const res = await fetch(`${API_BASE}/api/coshop/admin/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error(`❌ Failed to publish: ${productData.title || productData.url}`, data.error || data.message);
      return false;
    }

    const item = data.products && data.products[0];
    console.log(`\n🎉 [PUBLISHED LIVE]`);
    console.log(`📦 Title:     ${item.title}`);
    console.log(`💰 Price:     ₹${item.price.toLocaleString('en-IN')}`);
    console.log(`🏷️  Brand:     ${item.brand}`);
    console.log(`📁 Category:  ${item.category}`);
    console.log(`🖼️  Image:     ${item.thumbnail}`);
    console.log(`🔗 Link:      ${item.productUrl}`);
    console.log(`🆔 ID:        ${item.id}`);
    return true;
  } catch (err) {
    console.error(`❌ Network error connecting to ${API_BASE}:`, err.message);
    return false;
  }
}

async function publishFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  let items = [];
  try {
    items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Invalid JSON in ${filePath}:`, err.message);
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.log(`ℹ️  No items found to publish in ${filePath}.`);
    return;
  }

  console.log(`\n=======================================================`);
  console.log(`🚀 CoShop Automated Publisher`);
  console.log(`📁 Ingesting ${items.length} product(s) from ${path.basename(filePath)}`);
  console.log(`🎯 Target API: ${API_BASE}`);
  console.log(`=======================================================\n`);

  let count = 0;
  for (const item of items) {
    const ok = await publishSingleProduct(item);
    if (ok) count++;
  }

  console.log(`\n✨ Successfully published ${count} of ${items.length} product(s) live to CoShop!`);
}

async function main() {
  const urlArg = getArg('--url');
  const titleArg = getArg('--title');
  const watchMode = hasFlag('--watch');
  const customFile = getArg('--file') || DEFAULT_ITEMS_FILE;

  // Single URL scrape & publish
  if (urlArg) {
    console.log(`🔍 Scraping & publishing URL: ${urlArg}`);
    await publishSingleProduct({ url: urlArg });
    return;
  }

  // Single manual item from flags
  if (titleArg) {
    const item = {
      title: titleArg,
      price: Number(getArg('--price') || 1999),
      brand: getArg('--brand') || 'Curated',
      category: getArg('--category') || 'Fashion',
      image: getArg('--image') || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      productUrl: getArg('--link') || 'https://www.cogether.tech'
    };
    await publishSingleProduct(item);
    return;
  }

  // File-based publish
  await publishFromFile(customFile);

  // Watch mode
  if (watchMode) {
    console.log(`\n👀 [WATCH MODE ACTIVE] Watching ${path.basename(customFile)} for changes...`);
    console.log(`💡 Add new product objects to the file and save to auto-publish! (Press Ctrl+C to exit)\n`);

    let lastMtime = fs.statSync(customFile).mtimeMs;
    fs.watchFile(customFile, { interval: 1000 }, async (curr) => {
      if (curr.mtimeMs > lastMtime) {
        lastMtime = curr.mtimeMs;
        console.log(`\n🔔 Change detected in ${path.basename(customFile)}! Syncing to catalog...`);
        await publishFromFile(customFile);
      }
    });
  }
}

main().catch((err) => {
  console.error('Fatal publisher error:', err);
  process.exit(1);
});
