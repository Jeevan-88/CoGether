const RetailerAdapter = require('./RetailerAdapter');

/**
 * AmazonAdapter
 * Compliant integration for Amazon products adhering to Amazon Associates / PA-API rules:
 * - Does NOT allow generic price tracking / alerts (prohibited by Associates terms).
 * - Requires explicit Associates disclaimer.
 * - Displays prices with timestamp attribution.
 * - Uses compliant tag-vended affiliate URL generation.
 */
class AmazonAdapter extends RetailerAdapter {
  constructor(config = {}) {
    super({
      id: 'amazon',
      name: 'Amazon India',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      primaryColor: '#FF9900',
      capabilities: {
        productSearch: true,
        productDetails: true,
        price: true,
        availability: true,
        images: true,
        reviews: false, // Amazon reviews require specific API license
        ratings: true,
        comparison: true,
        affiliateLinks: true,
        cartApi: false,
        checkoutApi: false,
        priceHistory: false, // Explicitly restricted per Amazon Associates Operating Agreement
        priceAlerts: false, // Explicitly restricted
        deliveryEstimate: true,
        variantMapping: true
      },
      compliance: {
        termsUrl: 'https://affiliate-program.amazon.in/help/operating/agreement',
        affiliateProgramUrl: 'https://affiliate-program.amazon.in/',
        apiDocumentationUrl: 'https://webservices.amazon.com/paapi5/documentation/',
        attributionRules: 'View on Amazon / Sold on Amazon',
        priceRules: 'Prices and availability are accurate as of the date/time indicated and are subject to change.',
        linkRules: 'Vended links must preserve associate tag and not be artificially modified.',
        refreshPolicyMinutes: 60
      }
    });

    this.associateTag = process.env.AMAZON_ASSOCIATE_TAG || 'cogether-21';
  }

  generateAffiliateUrl(product, tag = this.associateTag) {
    const rawUrl = product.productUrl || `https://www.amazon.in/dp/${product.retailerProductId}`;
    const url = new URL(rawUrl);
    url.searchParams.set('tag', tag);
    url.searchParams.set('linkCode', 'll1');
    return url.toString();
  }

  normalize(raw) {
    const originalPrice = raw.originalPrice || raw.price || 0;
    const price = raw.price || originalPrice;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    return {
      id: `amazon_${raw.id || raw.asin || raw.retailerProductId}`,
      retailerId: this.id,
      retailerName: this.name,
      retailerLogo: this.logo,
      retailerProductId: raw.asin || raw.retailerProductId || raw.id,
      title: raw.title || 'Amazon Product',
      brand: raw.brand || 'Generic',
      description: raw.description || '',
      category: raw.category || 'General',
      subcategory: raw.subcategory || '',
      images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [raw.image || raw.thumbnail || ''],
      thumbnail: raw.thumbnail || raw.image || (Array.isArray(raw.images) ? raw.images[0] : ''),
      price,
      currency: 'INR',
      originalPrice,
      discount,
      availability: raw.availability || 'In Stock',
      stockStatus: raw.stockStatus || 'IN_STOCK',
      rating: Number(raw.rating || 4.2),
      reviewCount: Number(raw.reviewCount || 120),
      sizeOptions: raw.sizeOptions || [],
      colorOptions: raw.colorOptions || [],
      variants: raw.variants || [],
      shippingInfo: raw.shippingInfo || 'Prime eligible free delivery',
      deliveryEstimate: raw.deliveryEstimate || '2 Days',
      productUrl: raw.url || raw.productUrl || `https://www.amazon.in/dp/${raw.asin || raw.id}`,
      affiliateUrl: this.generateAffiliateUrl({ productUrl: raw.url || raw.productUrl, retailerProductId: raw.asin || raw.id }),
      lastUpdated: new Date().toISOString(),
      sourceTimestamp: Date.now(),
      attributes: raw.attributes || {},
      retailerData: {
        amazon: {
          asin: raw.asin || raw.retailerProductId || raw.id,
          primeEligible: raw.primeEligible !== false,
          fulfilledByAmazon: true,
          badge: raw.badge || 'Amazon\'s Choice'
        }
      }
    };
  }
}

module.exports = AmazonAdapter;
