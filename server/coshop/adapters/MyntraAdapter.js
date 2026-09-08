const RetailerAdapter = require('./RetailerAdapter');

/**
 * MyntraAdapter
 * Fashion, Footwear, and Lifestyle integration adapter for Myntra:
 * - Emphasizes size options, brand mapping, and fast fashion delivery estimates.
 */
class MyntraAdapter extends RetailerAdapter {
  constructor(config = {}) {
    super({
      id: 'myntra',
      name: 'Myntra',
      logo: 'https://cdn.iconscout.com/icon/free/png-256/free-myntra-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4618004.png?f=webp&w=256',
      primaryColor: '#FF3F6C',
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
        priceHistory: true, // Internal pricing comparison permissible
        priceAlerts: false,
        deliveryEstimate: true,
        variantMapping: true
      },
      compliance: {
        termsUrl: 'https://www.myntra.com/terms',
        affiliateProgramUrl: 'https://www.myntra.com/affiliate',
        attributionRules: 'View on Myntra / Sold on Myntra',
        priceRules: 'Prices reflect Myntra active catalog offers and coupon eligibility.',
        refreshPolicyMinutes: 60
      }
    });

    this.affiliateCode = process.env.MYNTRA_AFFILIATE_CODE || 'cogether_myntra';
  }

  generateAffiliateUrl(product, code = this.affiliateCode) {
    const rawUrl = product.productUrl || `https://www.myntra.com/${product.retailerProductId}`;
    const url = new URL(rawUrl);
    url.searchParams.set('utm_source', 'cogether_affiliate');
    url.searchParams.set('utm_medium', 'cogether_shop');
    url.searchParams.set('affId', code);
    return url.toString();
  }

  normalize(raw) {
    const originalPrice = raw.originalPrice || raw.mrp || raw.price || 0;
    const price = raw.price || originalPrice;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    return {
      id: `myntra_${raw.id || raw.retailerProductId}`,
      retailerId: this.id,
      retailerName: this.name,
      retailerLogo: this.logo,
      retailerProductId: raw.retailerProductId || raw.id,
      title: raw.title || 'Myntra Fashion Item',
      brand: raw.brand || 'Brand',
      description: raw.description || '',
      category: raw.category || 'Fashion',
      subcategory: raw.subcategory || 'Apparel',
      images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [raw.image || raw.thumbnail || ''],
      thumbnail: raw.thumbnail || raw.image || (Array.isArray(raw.images) ? raw.images[0] : ''),
      price,
      currency: 'INR',
      originalPrice,
      discount,
      availability: raw.availability || 'In Stock',
      stockStatus: raw.stockStatus || 'IN_STOCK',
      rating: Number(raw.rating || 4.4),
      reviewCount: Number(raw.reviewCount || 85),
      sizeOptions: raw.sizeOptions || ['S', 'M', 'L', 'XL'],
      colorOptions: raw.colorOptions || [],
      variants: raw.variants || [],
      shippingInfo: raw.shippingInfo || 'Free shipping on orders above ₹799',
      deliveryEstimate: raw.deliveryEstimate || '3 Days',
      productUrl: raw.url || raw.productUrl || `https://www.myntra.com/${raw.id}`,
      affiliateUrl: this.generateAffiliateUrl({ productUrl: raw.url || raw.productUrl, retailerProductId: raw.id }),
      lastUpdated: new Date().toISOString(),
      sourceTimestamp: Date.now(),
      attributes: raw.attributes || {},
      retailerData: {
        myntra: {
          styleId: raw.id,
          returnPolicy: '14 Days Easy Returns',
          tryAndBuy: true
        }
      }
    };
  }
}

module.exports = MyntraAdapter;
