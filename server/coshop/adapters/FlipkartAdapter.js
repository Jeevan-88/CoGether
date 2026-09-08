const RetailerAdapter = require('./RetailerAdapter');

/**
 * FlipkartAdapter
 * Electronics, Gadgets, and Multi-Category adapter for Flipkart:
 * - Emphasizes Flipkart Assured status, bank offers, and exchange options.
 */
class FlipkartAdapter extends RetailerAdapter {
  constructor(config = {}) {
    super({
      id: 'flipkart',
      name: 'Flipkart',
      logo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256',
      primaryColor: '#2874F0',
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
        termsUrl: 'https://affiliate.flipkart.com/terms',
        affiliateProgramUrl: 'https://affiliate.flipkart.com/',
        attributionRules: 'View on Flipkart / Sold on Flipkart',
        priceRules: 'Pricing reflects standard Flipkart offer terms.',
        refreshPolicyMinutes: 60
      }
    });

    this.affiliateId = process.env.FLIPKART_AFFILIATE_ID || 'cogether_fk';
  }

  generateAffiliateUrl(product, affId = this.affiliateId) {
    const rawUrl = product.productUrl || `https://www.flipkart.com/product/p/${product.retailerProductId}`;
    const url = new URL(rawUrl);
    url.searchParams.set('affid', affId);
    return url.toString();
  }

  normalize(raw) {
    const originalPrice = raw.originalPrice || raw.mrp || raw.price || 0;
    const price = raw.price || originalPrice;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    return {
      id: `flipkart_${raw.id || raw.fsn || raw.retailerProductId}`,
      retailerId: this.id,
      retailerName: this.name,
      retailerLogo: this.logo,
      retailerProductId: raw.fsn || raw.retailerProductId || raw.id,
      title: raw.title || 'Flipkart Product',
      brand: raw.brand || 'Brand',
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
      rating: Number(raw.rating || 4.3),
      reviewCount: Number(raw.reviewCount || 210),
      sizeOptions: raw.sizeOptions || [],
      colorOptions: raw.colorOptions || [],
      variants: raw.variants || [],
      shippingInfo: raw.shippingInfo || 'Flipkart Plus Free Fast Delivery',
      deliveryEstimate: raw.deliveryEstimate || '2 Days',
      productUrl: raw.url || raw.productUrl || `https://www.flipkart.com/product/p/${raw.fsn || raw.id}`,
      affiliateUrl: this.generateAffiliateUrl({ productUrl: raw.url || raw.productUrl, retailerProductId: raw.fsn || raw.id }),
      lastUpdated: new Date().toISOString(),
      sourceTimestamp: Date.now(),
      attributes: raw.attributes || {},
      retailerData: {
        flipkart: {
          fsn: raw.fsn || raw.id,
          fAssured: true,
          bankOffer: raw.bankOffer || '5% Cashback on Axis Bank Card'
        }
      }
    };
  }
}

module.exports = FlipkartAdapter;
