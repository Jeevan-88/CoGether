/**
 * RetailerAdapter (Base Class)
 * Defines the standard contract and capability matrix for all retailer integrations.
 * Ensures no single retailer's rules or limits bleed into other retailers.
 */
class RetailerAdapter {
  constructor(config = {}) {
    this.id = config.id || 'unknown';
    this.name = config.name || 'Unknown Retailer';
    this.logo = config.logo || '';
    this.primaryColor = config.primaryColor || '#FFE500';

    // Provider Capability Matrix
    this.capabilities = {
      productSearch: true,
      productDetails: true,
      price: true,
      availability: true,
      images: true,
      reviews: false, // Default to false unless explicitly permitted by API
      ratings: true,
      comparison: true,
      affiliateLinks: true,
      cartApi: false, // Default checkout remains on official retailer destination
      checkoutApi: false,
      priceHistory: false, // Prohibited by some retailers (e.g., Amazon Associates)
      priceAlerts: false,
      deliveryEstimate: true,
      variantMapping: true,
      ...config.capabilities
    };

    // Retailer Legal & Compliance Metadata
    this.compliance = {
      termsUrl: config.termsUrl || '',
      affiliateProgramUrl: config.affiliateProgramUrl || '',
      apiDocumentationUrl: config.apiDocumentationUrl || '',
      dataUsageRules: config.dataUsageRules || 'Standard partner feed display with attribution',
      attributionRules: config.attributionRules || `Sold on ${this.name}`,
      priceRules: config.priceRules || 'Display price with timestamp and retailer attribution',
      reviewRules: config.reviewRules || 'Link to official product page for customer reviews',
      linkRules: config.linkRules || 'Open official partner/affiliate destination in new window',
      refreshPolicyMinutes: config.refreshPolicyMinutes || 60,
      ...config.compliance
    };
  }

  /**
   * Search catalog products
   * @param {string} query
   * @param {object} options { category, brand, minPrice, maxPrice, limit, offset, sort }
   * @returns {Promise<Array>} Normalized products
   */
  async search(query, options = {}) {
    throw new Error(`search() not implemented in ${this.constructor.name}`);
  }

  /**
   * Get single product details by retailer product ID
   * @param {string} retailerProductId
   * @returns {Promise<object>} Normalized product
   */
  async getProductById(retailerProductId) {
    throw new Error(`getProductById() not implemented in ${this.constructor.name}`);
  }

  /**
   * Generate compliant affiliate / partner URL
   * @param {object} product
   * @param {string} tag
   * @returns {string}
   */
  generateAffiliateUrl(product, tag = '') {
    throw new Error(`generateAffiliateUrl() not implemented in ${this.constructor.name}`);
  }

  /**
   * Normalize raw retailer payload into the unified CoShop Product Model
   * @param {object} raw
   * @returns {object} Normalized product
   */
  normalize(raw) {
    throw new Error(`normalize() not implemented in ${this.constructor.name}`);
  }
}

module.exports = RetailerAdapter;
