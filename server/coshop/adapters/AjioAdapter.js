const RetailerAdapter = require('./RetailerAdapter');

/**
 * AjioAdapter
 * Reliance Retail / AJIO Fashion & Streetwear integration adapter:
 * - Emphasizes exclusive brand collections, curated trends, and coupon discounts.
 */
class AjioAdapter extends RetailerAdapter {
  constructor(config = {}) {
    super({
      id: 'ajio',
      name: 'AJIO',
      logo: 'https://assets.ajio.com/static/img/Ajio-Logo.svg',
      primaryColor: '#2C4152',
      capabilities: {
        productSearch: true,
        productDetails: true,
        price: true,
        availability: true,
        images: true,
        reviews: false,
        ratings: true,
        comparison: true,
        affiliateLinks: true,
        cartApi: false,
        checkoutApi: false,
        priceHistory: true,
        priceAlerts: false,
        deliveryEstimate: true,
        variantMapping: true
      },
      compliance: {
        termsUrl: 'https://www.ajio.com/help/termsAndConditions',
        affiliateProgramUrl: 'https://www.ajio.com/',
        attributionRules: 'View on AJIO / Sold on AJIO',
        priceRules: 'Pricing reflects standard AJIO fashion catalog rates.',
        refreshPolicyMinutes: 60
      }
    });

    this.affiliateTag = process.env.AJIO_AFFILIATE_TAG || 'cogether_ajio';
  }

  generateAffiliateUrl(product, tag = this.affiliateTag) {
    const rawUrl = product.productUrl || `https://www.ajio.com/p/${product.retailerProductId}`;
    const url = new URL(rawUrl);
    url.searchParams.set('utm_source', 'cogether');
    url.searchParams.set('utm_campaign', tag);
    return url.toString();
  }

  normalize(raw) {
    const originalPrice = raw.originalPrice || raw.mrp || raw.price || 0;
    const price = raw.price || originalPrice;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    return {
      id: `ajio_${raw.id || raw.retailerProductId}`,
      retailerId: this.id,
      retailerName: this.name,
      retailerLogo: this.logo,
      retailerProductId: raw.retailerProductId || raw.id,
      title: raw.title || 'AJIO Trends Item',
      brand: raw.brand || 'Brand',
      description: raw.description || '',
      category: raw.category || 'Fashion',
      subcategory: raw.subcategory || 'Footwear',
      images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [raw.image || raw.thumbnail || ''],
      thumbnail: raw.thumbnail || raw.image || (Array.isArray(raw.images) ? raw.images[0] : ''),
      price,
      currency: 'INR',
      originalPrice,
      discount,
      availability: raw.availability || 'In Stock',
      stockStatus: raw.stockStatus || 'IN_STOCK',
      rating: Number(raw.rating || 4.2),
      reviewCount: Number(raw.reviewCount || 64),
      sizeOptions: raw.sizeOptions || ['6', '7', '8', '9', '10'],
      colorOptions: raw.colorOptions || [],
      variants: raw.variants || [],
      shippingInfo: raw.shippingInfo || 'Standard Delivery within 3-4 days',
      deliveryEstimate: raw.deliveryEstimate || '3 Days',
      productUrl: raw.url || raw.productUrl || `https://www.ajio.com/p/${raw.id}`,
      affiliateUrl: this.generateAffiliateUrl({ productUrl: raw.url || raw.productUrl, retailerProductId: raw.id }),
      lastUpdated: new Date().toISOString(),
      sourceTimestamp: Date.now(),
      attributes: raw.attributes || {},
      retailerData: {
        ajio: {
          styleCode: raw.id,
          ajioExclusive: true
        }
      }
    };
  }
}

module.exports = AjioAdapter;
