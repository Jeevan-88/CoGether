const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SearchIndex = require('../server/coshop/engine/searchIndex');

async function testCoshopAdmin() {
  console.log('🧪 Testing CoShop SearchIndex Custom Publishing...');

  const index = new SearchIndex();
  const initialTotal = index.indexedProducts.length;

  const testItem = {
    id: 'test_product_999',
    title: 'Test Automated Running Shoe',
    brand: 'TestBrand',
    category: 'Footwear',
    price: 3499,
    originalPrice: 4999,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    productUrl: 'https://example.com/item/999'
  };

  // 1. Add Custom Product
  const added = index.addCustomProduct(testItem);
  assert.strictEqual(added.id, 'test_product_999');
  assert.strictEqual(added.brand, 'TestBrand');
  assert.strictEqual(index.indexedProducts.length, initialTotal + 1);

  // 2. Search finds the product
  const searchRes = index.search({ q: 'Test Automated' });
  assert(searchRes.products.length > 0, 'Search should find custom product');
  assert.strictEqual(searchRes.products[0].id, 'test_product_999');

  // 3. Remove Custom Product
  index.removeCustomProduct('test_product_999');
  assert.strictEqual(index.indexedProducts.length, initialTotal);
  const searchAfter = index.search({ q: 'Test Automated' });
  assert.strictEqual(searchAfter.products.length, 0);

  console.log('✅ CoShop SearchIndex custom ingestion and removal verified successfully!\n');
}

testCoshopAdmin().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
