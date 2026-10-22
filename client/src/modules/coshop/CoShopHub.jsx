import React, { useState, useEffect } from 'react';
import { 
  Search, Sparkles, ShoppingBag, Heart, Users, Filter, 
  ArrowRight, Check, Star, ShieldCheck, Tag, Zap, ChevronRight, X
} from 'lucide-react';
import ProductCard from './components/ProductCard.jsx';
import ProductDetailModal from './components/ProductDetailModal.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import AIShoppingAssistantModal from './components/AIShoppingAssistantModal.jsx';
import SharedCartDrawer from './components/SharedCartDrawer.jsx';
import CoShopRoom from './components/CoShopRoom.jsx';
import { useAuth } from '../../core/AuthContext.jsx';
import { API_URL } from '../../config/api.js';
import './CoShopHub.css';

export default function CoShopHub({
  initialUser,
  initialRoomId,
  initialUsername,
  onBackToHome,
  onSelectService
}) {
  const { profile } = useAuth();
  // Navigation & View Mode
  const [activeView, setActiveView] = useState(initialRoomId ? 'room' : 'discovery');
  const [activeRoomId, setActiveRoomId] = useState(initialRoomId || null);
  const currentUsername = initialUsername || profile?.displayName || profile?.username || initialUser?.name || 'Shopper_' + Math.floor(100 + Math.random() * 900);

  // Search & Catalog State
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [facets, setFacets] = useState({});
  const [loading, setLoading] = useState(false);

  // Filter & Sort State
  const [selectedRetailers, setSelectedRetailers] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Curated Feeds
  const [recommendations, setRecommendations] = useState({ trending: [], bestValue: [], deals: [] });

  // Cart & Wishlist State
  const [cartItems, setCartItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Fetch Curated Feeds on Mount
  useEffect(() => {
    fetch(`${API_URL}/api/coshop/recommendations`)
      .then((r) => r.json())
      .then((data) => setRecommendations(data))
      .catch((e) => console.error('Failed to fetch curated feeds:', e));
  }, []);

  // Fetch Products & Dynamic Facets
  useEffect(() => {
    if (activeView === 'room') return;

    setLoading(true);
    const params = new URLSearchParams();
    if (submittedQuery) params.set('q', submittedQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedRetailers.length > 0) params.set('retailer', selectedRetailers.join(','));
    if (selectedBrand !== 'all') params.set('brand', selectedBrand);
    if (priceRange.min > 0) params.set('minPrice', priceRange.min);
    if (priceRange.max < 1000000) params.set('maxPrice', priceRange.max);
    if (minRating > 0) params.set('minRating', minRating);
    params.set('sort', sortBy);
    params.set('limit', '30');

    fetch(`${API_URL}/api/coshop/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setTotalCount(data.total || 0);
        if (data.facets) setFacets(data.facets);
      })
      .catch((err) => console.error('Product catalog query error:', err))
      .finally(() => setLoading(false));
  }, [submittedQuery, selectedCategory, selectedRetailers, selectedBrand, priceRange, minRating, sortBy, activeView]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setSubmittedQuery(searchQuery.trim());
  };

  // Toggle Retailer Checkbox
  const handleToggleRetailer = (retId) => {
    setSelectedRetailers((prev) => 
      prev.includes(retId) ? prev.filter((r) => r !== retId) : [...prev, retId]
    );
  };

  // Toggle Wishlist
  const handleToggleWishlist = (product) => {
    setWishlist((prev) => 
      prev.some((p) => p.id === product.id) 
        ? prev.filter((p) => p.id !== product.id) 
        : [...prev, product]
    );
  };

  // Add to Cart
  const handleAddToCart = (product) => {
    setCartItems((prev) => [...prev, product]);
  };

  // Remove from Cart
  const handleRemoveFromCart = (item) => {
    setCartItems((prev) => prev.filter((p) => p !== item));
  };

  // Reset all active filters
  const handleResetFilters = () => {
    setSelectedRetailers([]);
    setSelectedBrand('all');
    setPriceRange({ min: 0, max: 1000000 });
    setMinRating(0);
    setSortBy('relevance');
  };

  // Start Shared Shopping Room
  const handleStartSharedRoom = () => {
    const newRoomCode = 'SHOP-' + Math.floor(1000 + Math.random() * 9000);
    const newUrl = `${window.location.pathname}?room=${newRoomCode}&mode=shop`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setActiveRoomId(newRoomCode);
    setActiveView('room');
  };

  // If in Shared Room Mode, render CoShopRoom
  if (activeView === 'room' && activeRoomId) {
    return (
      <CoShopRoom
        roomId={activeRoomId}
        username={currentUsername}
        onLeave={() => {
          window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
          setActiveRoomId(null);
          setActiveView('discovery');
        }}
      />
    );
  }

  const categoryTabs = [
    { id: 'all', label: 'All Products' },
    { id: 'Footwear', label: 'Footwear & Shoes' },
    { id: 'Laptops', label: 'Laptops & Computers' },
    { id: 'Audio', label: 'Headphones & Audio' },
    { id: 'Gaming', label: 'Gaming Mice & Gear' },
    { id: 'Fashion', label: 'Apparel & Fashion' }
  ];

  const quickSearches = [
    'black running shoes under 3000',
    'coding laptop under 80k',
    'headphones under 3000',
    'gaming mouse under 2000'
  ];

  return (
    <div className="coshop-hub-viewport-surface">
      {/* ── TOP COSHOP NAVBAR ── */}
      <header className="coshop-global-header">
        <div className="coshop-header-brand-group">
          <button type="button" className="btn-brand-home" onClick={onBackToHome} title="Back to CoGether Home">
            <span className="brand-accent">CO</span><span>SHOP</span>
          </button>
          <span className="brand-badge-pill">MULTI-STORE DISCOVERY</span>
        </div>

        {/* Global Search Bar */}
        <form className="coshop-header-search-form" onSubmit={handleSearchSubmit}>
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder="Search verified products across Amazon, Myntra, Flipkart, AJIO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="coshop-header-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => {
                setSearchQuery('');
                setSubmittedQuery('');
              }}
            >
              <X size={14} />
            </button>
          )}
          <button type="submit" className="btn-submit-search">
            Search
          </button>
        </form>

        {/* Right Navigation & Tools */}
        <div className="coshop-header-right-actions">
          {/* AI Shopping Assistant Trigger */}
          <button
            type="button"
            className="btn-open-ai-assistant"
            onClick={() => setIsAiModalOpen(true)}
            title="Ask AI Shopping Assistant"
          >
            <Sparkles size={14} />
            <span>AI ASSISTANT</span>
          </button>

          {/* Start Shared Shopping Room */}
          <button
            type="button"
            className="btn-start-room-deck"
            onClick={handleStartSharedRoom}
            title="Start Shared Shopping Room with live cameras"
          >
            <Users size={14} />
            <span>SHOP TOGETHER</span>
          </button>

          {/* Multi-Store Cart */}
          <button
            type="button"
            className="btn-header-cart"
            onClick={() => setIsCartOpen(true)}
            title="Open CoShop Multi-Store Cart"
          >
            <ShoppingBag size={15} />
            {cartItems.length > 0 && <span className="cart-badge-count">{cartItems.length}</span>}
          </button>
        </div>
      </header>

      {/* ── SECONDARY CATEGORY STRIP ── */}
      <nav className="coshop-category-strip">
        <div className="category-scroll-container">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`cat-pill-btn ${selectedCategory.toLowerCase() === tab.id.toLowerCase() ? 'active' : ''}`}
              onClick={() => setSelectedCategory(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="coshop-main-content-layout">
        {/* If no active search, show Hero & Curated Showcase */}
        {!submittedQuery && selectedCategory === 'all' && (
          <section className="coshop-hero-discovery-banner">
            <div className="hero-text-content">
              <span className="hero-eyebrow-tag">
                <Zap size={12} />
                THE FUTURE OF SOCIAL SHOPPING
              </span>
              <h1 className="hero-main-title">
                One Unified Search.<br />
                <span className="gradient-highlight">Every Store. Best Verified Price.</span>
              </h1>
              <p className="hero-description-body">
                Discover, compare prices, and explore thousands of products across Amazon, Myntra, Flipkart, and AJIO with your friends in real-time.
              </p>

              {/* Quick Query Suggestion Chips */}
              <div className="hero-quick-chips-row">
                <span className="chips-label">TRY SEARCHING:</span>
                {quickSearches.map((qs, i) => (
                  <button
                    key={i}
                    type="button"
                    className="hero-query-chip"
                    onClick={() => {
                      setSearchQuery(qs);
                      setSubmittedQuery(qs);
                    }}
                  >
                    <span>{qs}</span>
                    <ArrowRight size={11} />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Catalog Search & Discovery Layout with Sidebar */}
        <div className="coshop-catalog-view-container">
          {/* Dynamic Facet Filter Sidebar */}
          <FilterSidebar
            facets={facets}
            selectedRetailers={selectedRetailers}
            onToggleRetailer={handleToggleRetailer}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            priceRange={priceRange}
            onChangePriceRange={(min, max) => setPriceRange({ min, max })}
            minRating={minRating}
            onChangeRating={setMinRating}
            onResetFilters={handleResetFilters}
            isOpenMobile={isMobileFilterOpen}
            onCloseMobile={() => setIsMobileFilterOpen(false)}
          />

          {/* Right Product Showcase Grid */}
          <section className="coshop-products-display-pane">
            {/* Action & Sort Bar */}
            <div className="catalog-meta-action-bar">
              <div className="catalog-results-counter">
                <button
                  type="button"
                  className="btn-trigger-mobile-filter"
                  onClick={() => setIsMobileFilterOpen(true)}
                >
                  <Filter size={13} />
                  <span>Filters</span>
                </button>
                <span className="count-label">
                  SHOWING <strong>{totalCount}</strong> PRODUCTS
                  {submittedQuery && <span> FOR "<strong>{submittedQuery}</strong>"</span>}
                </span>
              </div>

              <div className="catalog-sort-selector-group">
                <span className="sort-label">SORT BY:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="coshop-sort-dropdown"
                >
                  <option value="relevance">Relevance</option>
                  <option value="best_value">Best Value</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="catalog-loading-state">
                <div className="loading-spinner" />
                <span>Searching verified catalogs across Amazon, Myntra, Flipkart, AJIO...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="catalog-empty-state">
                <Search size={44} className="empty-search-icon" />
                <h3>No products found</h3>
                <p>Try clearing your active filters or searching for different keywords.</p>
                <button type="button" className="btn-clear-all-empty" onClick={handleResetFilters}>
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="coshop-products-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(p) => setSelectedProduct(p)}
                    isWishlisted={wishlist.some((w) => w.id === product.id)}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── PRODUCT DETAIL MODAL ── */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isWishlisted={wishlist.some((w) => w.id === selectedProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* ── AI SHOPPING ASSISTANT MODAL ── */}
      <AIShoppingAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* ── SHARED CART DRAWER ── */}
      <SharedCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={() => setCartItems([])}
      />
    </div>
  );
}
