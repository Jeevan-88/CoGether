/**
 * Deduplication & Multi-Offer Comparison Engine
 * Groups equivalent products across retailers using brand, model, title similarity, and GTIN/SKU.
 * Calculates lowest verified price and fastest delivery without making unsupported claims.
 */

function generateDeduplicationKey(product) {
  const brand = (product.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTitle = (product.title || '')
    .toLowerCase()
    .replace(/(buy|online|best|india|men's|women's|shoe|shoes|black|white|blue)/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('_');

  return `${brand}__${cleanTitle}`;
}

function deduplicateAndGroupOffers(products) {
  const groups = new Map();

  for (const prod of products) {
    const key = prod.attributes?.gtin || prod.attributes?.modelId || generateDeduplicationKey(prod);

    if (!groups.has(key)) {
      groups.set(key, { ...prod, offers: [...(prod.offers || [])] });
    } else {
      const existing = groups.get(key);

      // Merge offer into existing master product
      const newOffers = prod.offers && prod.offers.length > 0 ? prod.offers : [{
        retailerId: prod.retailerId,
        retailerName: prod.retailerName,
        retailerLogo: prod.retailerLogo,
        price: prod.price,
        originalPrice: prod.originalPrice,
        discount: prod.discount,
        availability: prod.availability,
        deliveryEstimate: prod.deliveryEstimate,
        shippingInfo: prod.shippingInfo,
        productUrl: prod.productUrl,
        affiliateUrl: prod.affiliateUrl,
        lastUpdated: prod.lastUpdated
      }];

      for (const off of newOffers) {
        // Prevent duplicate offers from same retailer
        if (!existing.offers.some((o) => o.retailerId === off.retailerId)) {
          existing.offers.push(off);
        }
      }

      // Merge image gallery
      for (const img of prod.images || []) {
        if (!existing.images.includes(img)) existing.images.push(img);
      }

      // Merge sizes and colors
      existing.sizeOptions = Array.from(new Set([...(existing.sizeOptions || []), ...(prod.sizeOptions || [])]));
      existing.colorOptions = Array.from(new Set([...(existing.colorOptions || []), ...(prod.colorOptions || [])]));
    }
  }

  // Final comparison calculations for each master product
  const finalized = [];

  for (const prod of groups.values()) {
    if (prod.offers && prod.offers.length > 1) {
      // Sort offers by price ascending
      prod.offers.sort((a, b) => a.price - b.price);

      const lowestOffer = prod.offers[0];
      prod.price = lowestOffer.price;
      prod.originalPrice = lowestOffer.originalPrice;
      prod.discount = lowestOffer.discount;
      prod.retailerId = lowestOffer.retailerId;
      prod.retailerName = lowestOffer.retailerName;
      prod.affiliateUrl = lowestOffer.affiliateUrl;

      prod.hasComparison = true;
      prod.comparisonHeadline = 'LOWEST PRICE FOUND';
      prod.comparisonNote = `Lowest price available among ${prod.offers.length} verified stores`;
      prod.bestOffer = lowestOffer;

      // Find fastest delivery offer
      const fastest = [...prod.offers].sort((a, b) => {
        const daysA = parseInt(a.deliveryEstimate) || 99;
        const daysB = parseInt(b.deliveryEstimate) || 99;
        return daysA - daysB;
      })[0];
      prod.fastestDeliveryOffer = fastest;
    } else {
      prod.hasComparison = false;
      prod.comparisonHeadline = 'Based on available retailer data';
      prod.comparisonNote = 'Single retailer verified offer';
      prod.bestOffer = prod.offers?.[0] || null;
    }

    finalized.push(prod);
  }

  return finalized;
}

module.exports = { deduplicateAndGroupOffers, generateDeduplicationKey };
