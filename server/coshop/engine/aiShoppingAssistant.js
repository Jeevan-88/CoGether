/**
 * CoGether AI Shopping Assistant
 * Converts natural conversational prompts into structured catalog queries.
 * Evaluates best-value products and provides factual comparisons backed strictly by indexed data.
 */

class AIShoppingAssistant {
  constructor(searchIndex) {
    this.searchIndex = searchIndex;
  }

  /**
   * Process a conversational shopper prompt
   * @param {string} prompt
   * @param {object} context { history, currentRoomProducts }
   */
  async advise(prompt = '', context = {}) {
    if (!prompt || !prompt.trim()) {
      return {
        reply: "Hello! I'm your CoGether AI Shopping Assistant. Tell me what you're looking for, e.g. 'black running shoes under ₹3000' or 'best coding laptop under ₹80k'.",
        structuredQuery: {},
        recommendedProducts: [],
        bestValuePick: null
      };
    }

    const cleanPrompt = prompt.trim();
    const parsed = this.searchIndex.parseNaturalQuery(cleanPrompt);

    // Check if the user is asking to compare in-room products: "Which one should I buy?"
    if (cleanPrompt.toLowerCase().includes('which one') && Array.isArray(context.currentRoomProducts) && context.currentRoomProducts.length >= 2) {
      return this.compareRoomProducts(context.currentRoomProducts);
    }

    // Execute structured catalog search backed strictly by verified index
    const searchResults = this.searchIndex.search({
      q: parsed.cleanQuery || cleanPrompt,
      category: parsed.detectedCategory || 'all',
      brand: parsed.detectedBrand || 'all',
      maxPrice: parsed.maxPrice !== null ? parsed.maxPrice : 1000000,
      minPrice: parsed.minPrice !== null ? parsed.minPrice : 0,
      sort: 'best_value',
      limit: 6
    });

    const products = searchResults.products;

    if (products.length === 0) {
      return {
        reply: `I searched across Amazon, Myntra, Flipkart, and AJIO for "${cleanPrompt}", but couldn't find any products matching those exact criteria. Try broadening your budget or search terms!`,
        structuredQuery: parsed,
        recommendedProducts: [],
        bestValuePick: null
      };
    }

    // Determine Best Value pick based strictly on factual metrics
    const bestValuePick = products[0];
    const savings = bestValuePick.originalPrice > bestValuePick.price 
      ? `₹${(bestValuePick.originalPrice - bestValuePick.price).toLocaleString('en-IN')}` 
      : null;

    let explanation = `I found ${searchResults.total} verified option${searchResults.total > 1 ? 's' : ''} for "${cleanPrompt}".`;
    explanation += ` The best value pick is **${bestValuePick.title}** at **₹${bestValuePick.price.toLocaleString('en-IN')}** on **${bestValuePick.retailerName}** (★ ${bestValuePick.rating}/5 from ${bestValuePick.reviewCount} reviews).`;
    if (savings) {
      explanation += ` You save ${savings} (${bestValuePick.discount}% off).`;
    }
    if (bestValuePick.offers && bestValuePick.offers.length > 1) {
      explanation += ` Multi-store comparison is available across ${bestValuePick.offers.length} retailers.`;
    }

    return {
      reply: explanation,
      structuredQuery: parsed,
      recommendedProducts: products,
      bestValuePick,
      factualDisclaimer: 'Best value recommendation based on verified price, rating, and available source data.'
    };
  }

  /**
   * Factual side-by-side comparison for in-room social shopping
   */
  compareRoomProducts(products) {
    const [a, b] = products;

    let comparisonNotes = [];
    if (a.price < b.price) {
      comparisonNotes.push(`**${a.title}** is cheaper by ₹${(b.price - a.price).toLocaleString('en-IN')}.`);
    } else if (b.price < a.price) {
      comparisonNotes.push(`**${b.title}** is cheaper by ₹${(a.price - b.price).toLocaleString('en-IN')}.`);
    }

    if (a.rating > b.rating) {
      comparisonNotes.push(`**${a.title}** has a higher customer rating (★ ${a.rating} vs ★ ${b.rating}).`);
    } else if (b.rating > a.rating) {
      comparisonNotes.push(`**${b.title}** has a higher customer rating (★ ${b.rating} vs ★ ${a.rating}).`);
    }

    const reply = `Based on verified indexed data:\n` + comparisonNotes.join(' ') + `\nBoth options are available on their respective official store pages.`;

    return {
      reply,
      isComparison: true,
      comparedProducts: [a, b],
      factualDisclaimer: 'Comparison strictly derived from source price and review ratings.'
    };
  }
}

module.exports = AIShoppingAssistant;
