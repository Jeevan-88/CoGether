/**
 * Normalization Pipeline
 * Ensures every incoming product adheres strictly to the single unified CoShop Product Model.
 */

function validateAndNormalizeProduct(item) {
  if (!item || typeof item !== 'object') {
    throw new Error('Invalid product entity provided to normalization pipeline');
  }

  const price = Math.max(0, Number(item.price || 0));
  const originalPrice = Math.max(price, Number(item.originalPrice || price));
  const discount = originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : (item.discount || 0);

  const images = Array.isArray(item.images) && item.images.length > 0 
    ? item.images.filter(Boolean) 
    : [item.thumbnail || item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'];

  return {
    id: String(item.id || `prod_${Math.random().toString(36).substr(2, 9)}`),
    retailerId: String(item.retailerId || 'unknown'),
    retailerName: String(item.retailerName || 'Retailer'),
    retailerLogo: item.retailerLogo || '',
    retailerProductId: String(item.retailerProductId || item.id || ''),

    title: String(item.title || 'Untitled Product').trim(),
    brand: String(item.brand || 'Generic').trim(),
    description: String(item.description || '').trim(),

    category: String(item.category || 'General').trim(),
    subcategory: String(item.subcategory || '').trim(),

    images,
    thumbnail: item.thumbnail || images[0],

    price,
    currency: 'INR',
    originalPrice,
    discount,

    availability: String(item.availability || 'In Stock'),
    stockStatus: item.stockStatus || (price > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'),

    rating: Math.min(5, Math.max(0, Number(item.rating || 4.0))),
    reviewCount: Math.max(0, Number(item.reviewCount || 0)),

    sizeOptions: Array.isArray(item.sizeOptions) ? item.sizeOptions : [],
    colorOptions: Array.isArray(item.colorOptions) ? item.colorOptions : [],
    variants: Array.isArray(item.variants) ? item.variants : [],

    shippingInfo: String(item.shippingInfo || 'Standard Delivery'),
    deliveryEstimate: String(item.deliveryEstimate || '2-4 Business Days'),

    productUrl: String(item.productUrl || ''),
    affiliateUrl: String(item.affiliateUrl || item.productUrl || ''),

    lastUpdated: item.lastUpdated || new Date().toISOString(),
    sourceTimestamp: Number(item.sourceTimestamp || Date.now()),

    attributes: typeof item.attributes === 'object' && item.attributes !== null ? item.attributes : {},
    retailerData: typeof item.retailerData === 'object' && item.retailerData !== null ? item.retailerData : {},

    // Comparison container
    offers: Array.isArray(item.offers) ? item.offers : [
      {
        retailerId: item.retailerId || 'unknown',
        retailerName: item.retailerName || 'Retailer',
        retailerLogo: item.retailerLogo || '',
        price,
        originalPrice,
        discount,
        availability: item.availability || 'In Stock',
        deliveryEstimate: item.deliveryEstimate || '2-4 Days',
        shippingInfo: item.shippingInfo || 'Standard Delivery',
        productUrl: item.productUrl || '',
        affiliateUrl: item.affiliateUrl || item.productUrl || '',
        lastUpdated: item.lastUpdated || new Date().toISOString()
      }
    ]
  };
}

module.exports = { validateAndNormalizeProduct };
