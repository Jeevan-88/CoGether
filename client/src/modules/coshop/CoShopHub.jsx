import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Sparkles, ShoppingBag, Heart, Users, Filter, 
  ArrowRight, Check, Star, ChevronRight, X, Compass, LayoutGrid, SlidersHorizontal, RotateCcw,
  Tag, Play, Camera, Home, ShoppingCart, Gift, Flame, Package, ExternalLink
} from 'lucide-react';
import ProductCard from './components/ProductCard.jsx';
import ProductDetailModal from './components/ProductDetailModal.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import AIShoppingAssistantModal from './components/AIShoppingAssistantModal.jsx';
import SharedCartDrawer from './components/SharedCartDrawer.jsx';
import CoShopRoom from './components/CoShopRoom.jsx';
import ProductDetailPage, { LSKD_LEGGINGS_PRODUCT } from './components/ProductDetailPage.jsx';
import FullCartPage from './components/FullCartPage.jsx';
import CogetherAvatarRenderer from '../auth/CogetherAvatarRenderer.jsx';
import { useAuth } from '../../core/AuthContext.jsx';
import { API_URL } from '../../config/api.js';
import { curatedCategoryData } from './curatedData.js';
import './CoShopHub.css';

const BASE_CURATION_CATEGORIES = [
  { id: 'pet-supplies', name: 'Pet supplies' },
  { id: 'beauty', name: 'Beauty' },
  { id: 'women', name: 'Women' },
  { id: 'men', name: 'Men' },
  { id: 'home', name: 'Home' },
  { id: 'fitness', name: 'Fitness & nutrition' },
  { id: 'baby-toddler', name: 'Baby & toddler' },
  { id: 'sporting', name: 'Sporting goods' },
  { id: 'food-drinks', name: 'Food & drinks' },
  { id: 'toys-games', name: 'Toys & games' }
];

const INFINITE_CURATION_LIST = [
  ...BASE_CURATION_CATEGORIES.map(c => ({ ...c, loopUid: `s1-${c.id}` })),
  ...BASE_CURATION_CATEGORIES.map(c => ({ ...c, loopUid: `s2-${c.id}` })),
  ...BASE_CURATION_CATEGORIES.map(c => ({ ...c, loopUid: `s3-${c.id}` }))
];

export default function CoShopHub({
  initialUser,
  initialRoomId,
  initialUsername,
  onBackToHome,
  onSelectService
}) {
  const { profile } = useAuth();
  // Navigation & View Mode: 'discovery' | 'product' | 'cart' | 'room'
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || (initialRoomId ? 'room' : 'product');
  });
  const [activeRoomId, setActiveRoomId] = useState(initialRoomId || null);
  const currentUsername = initialUsername || profile?.displayName || profile?.username || initialUser?.name || 'Shopper_' + Math.floor(100 + Math.random() * 900);

  // Active viewing product for PDP
  const [viewingProduct, setViewingProduct] = useState(LSKD_LEGGINGS_PRODUCT);
  const [latestCartThumbnail, setLatestCartThumbnail] = useState('/coshop/products/cart_lskd_item.png');
  const [cartCount, setCartCount] = useState(3);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  // Marquee drag-to-scroll & infinite loop refs
  const marqueeRef = useRef(null);
  const isDraggingMarqueeRef = useRef(false);
  const marqueeStartXRef = useRef(0);
  const marqueeStartScrollLeftRef = useRef(0);
  const [isMarqueeDragging, setIsMarqueeDragging] = useState(false);

  // Search & Catalog State
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [facets, setFacets] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter & Sort State
  const [selectedRetailers, setSelectedRetailers] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Hero Banner Slide State (0 = Korean Beauty Edit, 1 = CoShop Social Platform)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);

  // Right Navigation Active State ('home' | 'categories' | 'cart' | 'deals' | 'bag' | 'wishlist')
  const [activeNav, setActiveNav] = useState('cart'); // Default 'cart' matching Screenshot 2's active cart state!
  const [activeCuratedCategory, setActiveCuratedCategory] = useState('men'); // Default 'men' matching reference screenshot 5!

  // Marquee scroll wrap handler for infinite loop
  const handleMarqueeScroll = () => {
    const wrap = marqueeRef.current;
    if (!wrap) return;
    const oneSetWidth = wrap.scrollWidth / 3;
    if (oneSetWidth <= 0) return;

    if (wrap.scrollLeft >= oneSetWidth * 2 - 20) {
      wrap.scrollLeft -= oneSetWidth;
    } else if (wrap.scrollLeft <= 20) {
      wrap.scrollLeft += oneSetWidth;
    }
  };

  const handleMarqueeMouseDown = (e) => {
    const wrap = marqueeRef.current;
    if (!wrap) return;
    isDraggingMarqueeRef.current = true;
    setIsMarqueeDragging(true);
    marqueeStartXRef.current = e.pageX - wrap.offsetLeft;
    marqueeStartScrollLeftRef.current = wrap.scrollLeft;
  };

  const handleMarqueeMouseMove = (e) => {
    if (!isDraggingMarqueeRef.current) return;
    e.preventDefault();
    const wrap = marqueeRef.current;
    if (!wrap) return;
    const x = e.pageX - wrap.offsetLeft;
    const walk = (x - marqueeStartXRef.current) * 1.6;
    wrap.scrollLeft = marqueeStartScrollLeftRef.current - walk;
  };

  const handleMarqueeMouseUp = () => {
    isDraggingMarqueeRef.current = false;
    setIsMarqueeDragging(false);
  };

  const handleMarqueeMouseLeave = () => {
    isDraggingMarqueeRef.current = false;
    setIsMarqueeDragging(false);
  };

  // Center initial marquee in middle copy
  useEffect(() => {
    const wrap = marqueeRef.current;
    if (wrap) {
      wrap.scrollLeft = wrap.scrollWidth / 3;
    }
  }, []);

  // Cart & Wishlist State
  // Default to 2 items so the cart indicator matches Screenshot 2's '2' badge immediately!
  const [cartItems, setCartItems] = useState([
    {
      id: 'k_beauty_centella_serum',
      retailerId: 'amazon',
      retailerName: 'Amazon India',
      title: 'Madagascar Centella Hyalu-Cica Water-Fit Sun Serum SPF50+ PA++++',
      brand: 'SKIN1004',
      price: 1450,
      originalPrice: 1999,
      discount: 27,
      rating: 4.8,
      thumbnail: 'https://images.unsplash.com/photo-1608248597359-5f21d3f9b2fa?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'nike_air_max_excee',
      retailerId: 'myntra',
      retailerName: 'Myntra',
      title: 'Nike Air Max Excee Running & Lifestyle Shoes',
      brand: 'Nike',
      price: 6899,
      originalPrice: 7995,
      discount: 14,
      rating: 4.6,
      thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
    }
  ]);
  const [wishlist, setWishlist] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBagModalOpen, setIsBagModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Auto-advance banner carousel with smooth progress animation
  useEffect(() => {
    let startTime = Date.now();
    const duration = 7000; // 7 seconds per slide

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setSlideProgress(progress);

      if (progress >= 1) {
        startTime = Date.now();
        setCurrentSlide(prev => (prev === 0 ? 1 : 0));
        setSlideProgress(0);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentSlide]);

  // Fetch Products & Dynamic Facets
  useEffect(() => {
    if (activeView === 'room') return;

    setLoading(true);
    const params = new URLSearchParams();
    if (submittedQuery) params.set('q', submittedQuery);
    if (selectedCategory !== 'all' && selectedCategory !== 'Holiday Sale' && selectedCategory !== 'Gifts') {
      params.set('category', selectedCategory);
    }
    if (selectedRetailers.length > 0) params.set('retailer', selectedRetailers.join(','));
    if (selectedBrand !== 'all') params.set('brand', selectedBrand);
    if (priceRange.min > 0) params.set('minPrice', priceRange.min);
    if (priceRange.max < 1000000) params.set('maxPrice', priceRange.max);
    if (minRating > 0) params.set('minRating', minRating);
    params.set('sort', sortBy);
    params.set('limit', '32');

    fetch(`${API_URL}/api/coshop/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        let fetchedProducts = data.products || [];
        if (selectedCategory === 'Holiday Sale') {
          fetchedProducts = fetchedProducts.filter(p => (p.discount && p.discount >= 15));
        }
        setProducts(fetchedProducts);
        setTotalCount(data.total || fetchedProducts.length);
        if (data.facets) setFacets(data.facets);
      })
      .catch((err) => {
        console.error('Product catalog query error:', err);
      })
      .finally(() => setLoading(false));
  }, [submittedQuery, selectedCategory, selectedRetailers, selectedBrand, priceRange, minRating, sortBy, activeView]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setSubmittedQuery(searchQuery.trim());
    setIsSearchFocused(false);
  };

  // Toggle Retailer Checkbox
  const handleToggleRetailer = (retId) => {
    setSelectedRetailers((prev) =>
      prev.includes(retId) ? prev.filter((r) => r !== retId) : [...prev, retId]
    );
  };

  // Wishlist Toggle
  const handleToggleWishlist = (product) => {
    setWishlist((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  };

  // Add to Shared Cart
  const handleAddToCart = (product, selectedOffer = null) => {
    const itemToAdd = {
      ...product,
      price: selectedOffer ? selectedOffer.price : product.price,
      retailerId: selectedOffer ? selectedOffer.retailerId : product.retailerId,
      retailerName: selectedOffer ? selectedOffer.retailerName : product.retailerName,
      affiliateUrl: selectedOffer ? selectedOffer.affiliateUrl : product.affiliateUrl
    };
    setCartItems((prev) => [...prev, itemToAdd]);
  };

  // Remove from Cart
  const handleRemoveFromCart = (item) => {
    setCartItems((prev) => prev.filter((p) => p !== item));
  };

  // Reset all active filters
  const handleResetFilters = () => {
    setSelectedRetailers([]);
    setSelectedBrand('all');
    setSelectedCategory('all');
    setSearchQuery('');
    setSubmittedQuery('');
    setPriceRange({ min: 0, max: 1000000 });
    setMinRating(0);
    setSortBy('relevance');
    setActiveNav('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle category selection
  const handleSelectCategory = (catId) => {
    if (selectedCategory.toLowerCase() === catId.toLowerCase()) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(catId);
    }
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

  // Exact 7 Categories + 1 Grid Icon (Green-Complementing Holiday Sale & Gifts Badges)
  const categoriesList = [
    {
      id: 'Holiday Sale',
      label: 'Holiday Sale',
      color: '#8A1526',
      poster: '/coshop/categories/holiday-sale-poster.svg',
      isSpecial: true
    },
    {
      id: 'Gifts',
      label: 'Gifts',
      color: '#739F20',
      poster: '/coshop/categories/gifts-poster.svg',
      isSpecial: true
    },
    {
      id: 'Beauty',
      label: 'Beauty',
      color: '#F86780',
      poster: '/coshop/categories/beauty-poster.png',
      video: '/coshop/videos/beauty-pill.webm'
    },
    {
      id: 'Women',
      label: 'Women',
      color: '#C81E38',
      poster: '/coshop/categories/women-poster.png',
      video: '/coshop/videos/women-pill.webm'
    },
    {
      id: 'Men',
      label: 'Men',
      color: '#2B263F',
      poster: '/coshop/categories/men-poster.png',
      video: '/coshop/videos/men-pill.webm'
    },
    {
      id: 'Family',
      label: 'Baby & toddler',
      color: '#C57E42',
      poster: '/coshop/categories/baby-toddler-poster.png',
      video: '/coshop/videos/baby-toddler-pill.webm'
    },
    {
      id: 'Sports',
      label: 'Sporting goods',
      color: '#E04A26',
      poster: '/coshop/categories/sporting-goods-poster.png',
      video: '/coshop/videos/sporting-pill.webm'
    }
  ];

  const quickSearches = [
    'Korean beauty serums and SPF',
    'Nike air max excee running shoes',
    'Apple MacBook Air M2 256GB',
    'ASUS TUF gaming laptop under 80k',
    'Sony wireless noise cancelling earbuds'
  ];

  const activeRetailersList = [
    { id: 'amazon', name: 'Amazon' },
    { id: 'flipkart', name: 'Flipkart' },
    { id: 'myntra', name: 'Myntra' },
    { id: 'ajio', name: 'AJIO' }
  ];

  // Continue browsing products (first 4 products)
  const continueProducts = products.length > 0 ? products.slice(0, 4) : [];

  return (
    <div className="coshop-pixel-root">
      
      {/* ── 1. HEADER (REPLICATE SCREENSHOT 2) ── */}
      <header className="coshop-pixel-header" data-testid="HeaderWrapper">
        <div className="coshop-header-inner">
          
          {/* Top Row: Minimal Logo at Left + Centered Pill Search Bar */}
          <div className="coshop-header-top-row">
            {/* CoShop Brand Logo at Upper-Left */}
            <button
              type="button"
              className="coshop-brand-logo-btn"
              onClick={handleResetFilters}
              title="Return to CoShop Home"
              data-testid="CoShopBrandLogo"
            >
              <span className="coshop-brand-logo-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 9H19L18 21H6L5 9Z" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="15" r="1.5" fill="#FFFFFF"/>
                </svg>
              </span>
              <span className="coshop-brand-logo-text">
                Co<span className="coshop-brand-logo-accent">Shop</span>
              </span>
            </button>

            {/* Large Centered Pill-Shaped Search Bar */}
            <div className="coshop-search-pill-container" data-testid="home-redesign-search-header">
              <form onSubmit={handleSearchSubmit} className="coshop-search-pill-form">
                <span className="coshop-search-pill-icon">
                  <Search size={18} strokeWidth={2.4} color="#6B7280" />
                </span>

                <input
                  type="text"
                  data-testid="search-input"
                  className="coshop-search-pill-input"
                  placeholder="What are you shopping for today?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSubmittedQuery(''); }}
                    className="coshop-search-clear-btn"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}

                {/* Right Action Icon: Visual / AI Search */}
                <button
                  type="button"
                  className="coshop-search-action-btn"
                  onClick={() => setIsAiModalOpen(true)}
                  title="Visual / AI Product Search"
                >
                  <Camera size={19} strokeWidth={1.8} color="#4B5563" />
                </button>
              </form>

              {/* Typeahead Dropdown */}
              {isSearchFocused && (
                <div className="coshop-typeahead-dropdown" data-testid="typeahead-content-container">
                  <div className="coshop-typeahead-header">Popular Searches</div>
                  {quickSearches.map((qs, i) => (
                    <button
                      key={i}
                      type="button"
                      className="coshop-typeahead-item"
                      onMouseDown={() => {
                        setSearchQuery(qs);
                        setSubmittedQuery(qs);
                      }}
                    >
                      <Search size={14} color="#888" />
                      <span>{qs}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dummy space right to ensure exact center alignment */}
            <div className="coshop-header-right-spacer" aria-hidden="true" />
          </div>

          {/* Category Navigation Horizontally Below Search Bar */}
          <nav className="coshop-category-nav-bar" aria-label="Product Categories" data-testid="shelf-section">
            <div className="coshop-category-track">
              {categoriesList.map((cat, idx) => {
                const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`coshop-category-item-btn coshop-plain-pill ${isSelected ? 'active' : ''}`}
                    data-carousel-index={idx}
                    data-hover-ready="true"
                    onMouseEnter={(e) => {
                      const vid = e.currentTarget.querySelector('video');
                      if (vid) {
                        vid.currentTime = 0;
                        vid.play().catch(() => {});
                      }
                    }}
                    onMouseLeave={(e) => {
                      const vid = e.currentTarget.querySelector('video');
                      if (vid) {
                        vid.pause();
                        vid.currentTime = 0;
                      }
                    }}
                  >
                    <div className="coshop-pill-media-wrap">
                      <div className={`coshop-pill-circle ${cat.isSpecial ? 'is-special' : ''}`} style={{ backgroundColor: cat.color }}>
                        <div className={`coshop-pill-rest-crop ${cat.isSpecial ? 'is-special' : ''}`}>
                          {cat.poster && (
                            <img
                              src={cat.poster}
                              alt=""
                              className={`coshop-pill-rest-img ${cat.isSpecial ? 'is-special' : ''}`}
                            />
                          )}
                        </div>
                      </div>
                      {cat.video && (
                        <video
                          data-testid="category-pill-video"
                          className="coshop-pill-artwork-video"
                          muted
                          playsInline
                          loop
                          preload="auto"
                        >
                          <source src={cat.video} type="video/webm" />
                        </video>
                      )}
                    </div>
                    <span className="coshop-cat-label">{cat.label}</span>
                  </button>
                );
              })}

              {/* 4-square Grid Icon Button */}
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`coshop-category-grid-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                title="View all categories"
                data-testid="view-all-link"
              >
                <LayoutGrid size={18} strokeWidth={2.4} />
              </button>
            </div>
          </nav>

          {/* Quick Shopping Sources (Amazon, Flipkart, Myntra, AJIO) */}
          <div className="coshop-retailer-chips-wrap">
            {activeRetailersList.map((ret) => {
              const isSelected = selectedRetailers.includes(ret.id);
              return (
                <button
                  key={ret.id}
                  type="button"
                  onClick={() => handleToggleRetailer(ret.id)}
                  className={`coshop-retailer-pill-chip ${isSelected ? 'active' : ''}`}
                >
                  {isSelected && <Check size={11} strokeWidth={3} />}
                  <span>{ret.name}</span>
                </button>
              );
            })}
          </div>

        </div>
      </header>

      {/* ── 2. LEFT FLOATING SIDEBAR — EXACT REFERENCE REPLICATION ── */}
      <aside className="coshop-left-nav-rail" aria-label="CoShop Navigation Rail">
        {/* Top 5 Primary Navigation Icons Pill Container */}
        <div className="coshop-left-primary-pill" data-testid="HeaderLinkGroup">
          
          {/* 1. Home — filled house icon */}
          <button
            type="button"
            className={`coshop-rail-icon-btn ${activeNav === 'home' && activeView === 'discovery' ? 'active-icon' : ''}`}
            onClick={() => {
              setActiveNav('home');
              setActiveView('discovery');
              window.scrollTo({ top: 0, behavior: 'instant' });
              handleResetFilters();
            }}
            title="Discovery Feed"
            data-testid="HeaderLink-Home"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.2335 1.58334C11.6668 1.25835 12.3335 1.25835 12.7668 1.58334L20.8668 7.65834C21.5752 8.18974 21.9893 9.02341 21.9893 9.90795V19.4674C21.9893 21.1352 20.6371 22.4874 18.9693 22.4874H15.6985C15.1462 22.4874 14.6985 22.0397 14.6985 21.4874V15.7731C14.6985 15.2208 14.2508 14.7731 13.6985 14.7731H10.3015C9.74921 14.7731 9.30149 15.2208 9.30149 15.7731V21.4874C9.30149 22.0397 8.85377 22.4874 8.30149 22.4874H5.03067C3.36285 22.4874 2.01067 21.1352 2.01067 19.4674V9.90795C2.01067 9.02341 2.42479 8.18974 3.13317 7.65834L11.2335 1.58334Z" />
            </svg>
          </button>

          {/* 2. Categories — four-square grid icon */}
          <button
            type="button"
            className={`coshop-rail-icon-btn ${activeNav === 'categories' ? 'active-icon' : ''}`}
            onClick={() => {
              setActiveNav('categories');
              if (activeView === 'product') {
                document.querySelector('.coshop-pdp-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                setActiveView('discovery');
                setTimeout(() => {
                  document.querySelector('.coshop-categories-grid-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            title="Explore All Categories"
            data-testid="HeaderLink-Ontdekken"
          >
            <LayoutGrid size={20} strokeWidth={2.4} />
          </button>

          {/* 3. Shopping cart — real-time product thumbnail with counter badge inside active circle */}
          <button
            type="button"
            className={`coshop-rail-icon-btn ${activeNav === 'cart' || activeView === 'cart' ? 'active-circle' : ''} ${isCartBouncing ? 'coshop-cart-bounce' : ''}`}
            onClick={() => {
              setActiveNav('cart');
              setActiveView('cart');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            title="Your Cart"
            data-testid="cart-indicator"
          >
            <div className="coshop-cart-thumb-box">
              <img
                src={latestCartThumbnail || '/coshop/products/cart_lskd_item.png'}
                alt="Product in cart"
                className="coshop-cart-inner-thumb"
              />
              <span className="coshop-cart-count-badge">
                {cartCount}
              </span>
            </div>
          </button>

          {/* 4. Deals — tag icon */}
          <button
            type="button"
            className={`coshop-rail-icon-btn ${activeNav === 'deals' || sortBy === 'discount' ? 'active-icon' : ''}`}
            onClick={() => {
              setActiveNav('deals');
              setActiveView('discovery');
              setSortBy(prev => prev === 'discount' ? 'relevance' : 'discount');
            }}
            title="Verified Deals & Discounts"
            data-testid="HeaderLink-Deals"
          >
            <Tag size={19} strokeWidth={2.2} />
          </button>

          {/* 5. Shopping bag — bag icon */}
          <button
            type="button"
            className={`coshop-rail-icon-btn ${activeNav === 'bag' || isBagModalOpen ? 'active-icon' : ''}`}
            onClick={() => {
              setActiveNav('bag');
              setIsBagModalOpen(true);
            }}
            title="Saved Orders & Bag"
            data-testid="HeaderLink-Bag"
          >
            <ShoppingBag size={19} strokeWidth={2.2} />
          </button>
        </div>

        {/* Bottom Separate Floating Pill: Wishlist & Real User Profile Avatar */}
        <div className="coshop-left-bottom-pill">
          {/* Wishlist / Heart Icon */}
          <button
            type="button"
            className={`coshop-rail-icon-btn ${activeNav === 'wishlist' || isWishlistModalOpen ? 'active-icon' : ''}`}
            onClick={() => {
              setActiveNav('wishlist');
              setIsWishlistModalOpen(true);
            }}
            title="Saved Wishlist"
            data-testid="favorites-icon-link"
          >
            <Heart
              size={19}
              strokeWidth={2.2}
              fill={wishlist.length > 0 ? '#739F20' : 'none'}
              color={wishlist.length > 0 ? '#739F20' : 'currentColor'}
            />
            {wishlist.length > 0 && (
              <span className="coshop-wishlist-count-badge">{wishlist.length}</span>
            )}
          </button>

          {/* Real User Profile Avatar (CoTogether User - No "YM" Text) */}
          <button
            type="button"
            className="coshop-rail-avatar-btn"
            title={`Account: ${currentUsername}`}
            onClick={() => alert(`Signed in as ${currentUsername}. CoTogether Universal Commerce Account active.`)}
            data-testid="sign-in-button"
          >
            {profile?.avatarConfig ? (
              <CogetherAvatarRenderer avatarConfig={profile.avatarConfig} size={38} showBackdrop={false} />
            ) : (
              <img
                src={profile?.avatar || '/assets/cinema/cowatch_user_avatar.png'}
                alt={currentUsername}
                className="coshop-real-avatar-img"
              />
            )}
            <span className="coshop-avatar-online-dot" />
          </button>
        </div>
      </aside>

      {/* ── 3. MAIN CONTENT CONTAINER ── */}
      <main className="coshop-content-viewport" data-id="content-wrapper-root">

        {activeView === 'product' ? (
          <ProductDetailPage
            product={viewingProduct}
            onAddToCart={(prod) => {
              handleAddToCart(prod);
              setTimeout(() => {
                setCartCount((c) => c + 1);
                setLatestCartThumbnail(prod.thumbnail || '/coshop/products/lskd_thumb_1.png');
                setIsCartBouncing(true);
                setTimeout(() => setIsCartBouncing(false), 650);
              }, 750);
            }}
            onSelectProduct={(p) => {
              setViewingProduct({
                id: p.id,
                title: p.title,
                brand: p.brand || 'LSKD',
                brandRating: '4.8 ★ (303.1K)',
                reviewsCount: p.rating || '2.2K ratings',
                price: typeof p.price === 'string' ? parseFloat(p.price.replace(/[^0-9.]/g, '')) || 59 : p.price || 59,
                currency: '$',
                originalPrice: p.originalPrice ? parseFloat(p.originalPrice.replace(/[^0-9.]/g, '')) : 95,
                discount: p.discount ? parseInt(p.discount) : 31,
                colour: 'Black',
                sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
                images: [
                  p.image || '/coshop/products/lskd_legging_main.png',
                  '/coshop/products/lskd_thumb_1.png',
                  '/coshop/products/lskd_thumb_2.png',
                  '/coshop/products/lskd_thumb_3.png'
                ],
                description: 'High performance activewear engineered for extreme movement, recovery, and daily comfort.',
                retailerName: p.brand || 'LSKD'
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isWishlisted={wishlist.some((w) => w.id === viewingProduct.id)}
            onToggleWishlist={handleToggleWishlist}
            onBack={() => setActiveView('discovery')}
          />
        ) : activeView === 'cart' ? (
          <FullCartPage
            onCheckoutGroup={(storeId) => {
              alert(`Proceeding to checkout for ${storeId.toUpperCase()}`);
            }}
            onAddRecommendation={(rec) => {
              setCartCount((c) => c + 1);
              setLatestCartThumbnail(rec.thumbnail);
              setIsCartBouncing(true);
              setTimeout(() => setIsCartBouncing(false), 650);
            }}
          />
        ) : (
          <>
            {/* ── HERO BANNER: The Korean Beauty Edit (Preserve My Image) ── */}
            <section className="coshop-hero-section" data-testid="banner-carousel-section" aria-label="Curated Spotlights">
          {/* Slide 0: The Korean Beauty Edit (Exact Match to Screenshot 2) */}
          <div className={`coshop-hero-slide ${currentSlide === 0 ? 'active' : 'inactive'}`}>
            <img
              src="/coshop/images/k-beauty-category-card.webp"
              alt="The Korean Beauty Edit"
              className="coshop-hero-bg-img"
            />
            {/* Smooth dark gradient overlay toward lower-left for strong readability */}
            <div className="coshop-hero-gradient-overlay"></div>

            <div className="coshop-hero-content-box">
              <h1 className="coshop-hero-heading">
                The Korean Beauty Edit
              </h1>
              <p className="coshop-hero-subtext">
                If you know, you glow. Discover CoShop cult favorites from serums to SPF.
              </p>
              <div className="coshop-hero-cta-wrapper">
                <button
                  type="button"
                  onClick={() => handleSelectCategory('Beauty')}
                  className="coshop-hero-cta-button"
                >
                  Explore Korean beauty
                </button>
              </div>
            </div>
          </div>

          {/* Slide 1: CoShop Universal Social Shopping Platform (Preserve Branding from Screenshot 1) */}
          <div className={`coshop-hero-slide ${currentSlide === 1 ? 'active' : 'inactive'}`}>
            <img
              src="/coshop/images/unauth.Banner.R06.desktop.poster.webp"
              alt="CoShop Social Shopping"
              className="coshop-hero-bg-img"
            />
            <div className="coshop-hero-gradient-overlay green-shade"></div>

            <div className="coshop-hero-content-box">
              <span className="coshop-hero-social-tag">
                <Users size={12} /> Social Shopping
              </span>
              <h2 className="coshop-hero-heading">
                CoShop draait helemaal om jou
              </h2>
              <p className="coshop-hero-subtext">
                Al je favoriete winkels. Al je bestellingen volgen. Live videogesprekken om samen met vrienden te winkelen.
              </p>
              <div className="coshop-hero-cta-wrapper">
                <button
                  type="button"
                  onClick={handleStartSharedRoom}
                  className="coshop-hero-cta-button party-cta"
                >
                  <Users size={15} />
                  <span>Start Shopping Party</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="coshop-hero-cta-button assistant-cta"
                >
                  <Sparkles size={15} />
                  <span>AI Assistant</span>
                </button>
              </div>
            </div>
          </div>

          {/* Small Carousel Indicators on the Lower-Right */}
          <div className="coshop-hero-carousel-indicators" data-testid="banner-carousel-controls">
            <button
              type="button"
              aria-label="Go to The Korean Beauty Edit"
              onClick={() => { setCurrentSlide(0); setSlideProgress(0); }}
              className={`coshop-indicator-track ${currentSlide === 0 ? 'active' : ''}`}
            >
              {currentSlide === 0 && (
                <span
                  className="coshop-indicator-progress"
                  data-testid="banner-autoplay-progress"
                  style={{ width: `${slideProgress * 100}%` }}
                />
              )}
            </button>
            <button
              type="button"
              aria-label="Go to CoShop Social Shopping"
              onClick={() => { setCurrentSlide(1); setSlideProgress(0); }}
              className={`coshop-indicator-track ${currentSlide === 1 ? 'active' : ''}`}
            >
              {currentSlide === 1 && (
                <span
                  className="coshop-indicator-progress"
                  data-testid="banner-autoplay-progress"
                  style={{ width: `${slideProgress * 100}%` }}
                />
              )}
            </button>
          </div>
        </section>

        {/* ── 4. SHOPPING CONTENT (REPLICATE SCREENSHOT 2) ── */}

        {/* Section 4A: Continue Browsing (Horizontal Product Row from Screenshot 2) */}
        {continueProducts.length > 0 && (
          <section className="coshop-continue-section">
            <div className="coshop-section-title-wrap">
              <h2 className="coshop-section-main-title">Continue</h2>
            </div>

            <div className="coshop-continue-horizontal-scroll">
              {continueProducts.map((p) => (
                <div
                  key={p.id}
                  className="coshop-continue-product-card"
                  onClick={() => {
                    setViewingProduct({
                      id: p.id,
                      title: p.title,
                      brand: p.brand,
                      brandRating: '4.8 ★ (303.1K)',
                      reviewsCount: '2.2K ratings',
                      price: p.price,
                      currency: '₹',
                      originalPrice: p.originalPrice,
                      discount: p.discount,
                      colour: 'Black',
                      sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
                      images: [
                        p.thumbnail || '/coshop/products/lskd_legging_main.png',
                        '/coshop/products/lskd_thumb_1.png',
                        '/coshop/products/lskd_thumb_2.png',
                        '/coshop/products/lskd_thumb_3.png'
                      ],
                      description: p.title,
                      retailerName: p.retailerName || p.brand
                    });
                    setActiveView('product');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="coshop-continue-img-frame">
                    <img src={p.thumbnail} alt={p.title} loading="lazy" />
                    <span className="coshop-continue-retailer-tag">{p.retailerName}</span>
                  </div>
                  <div className="coshop-continue-details">
                    <span className="coshop-continue-brand-text">{p.brand}</span>
                    <h4 className="coshop-continue-title-text" title={p.title}>{p.title}</h4>
                    <div className="coshop-continue-price-line">
                      <span className="coshop-continue-price-current">₹{p.price.toLocaleString('en-IN')}</span>
                      {p.originalPrice > p.price && (
                        <span className="coshop-continue-price-orig">₹{p.originalPrice.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 4B. CATEGORIES 2x5 GRID SECTION (EXACT REPLICA OF REFERENCE SCREENSHOTS 2, 3, 4) ── */}
        <section className="coshop-categories-grid-section" data-testid="categories-grid-section">
          <div className="coshop-section-title-wrap">
            <h2 className="coshop-categories-heading">
              <span>Categories</span>
              <ChevronRight size={20} className="coshop-heading-arrow" />
            </h2>
          </div>

          <div className="coshop-categories-grid">
            {[
              { id: 'beauty', name: 'Beauty', color: '#f86780', image: '/coshop/category-grid/beauty-first.webp' },
              { id: 'women', name: 'Women', color: '#d40126', image: '/coshop/category-grid/women-first.webp' },
              { id: 'men', name: 'Men', color: '#412236', image: '/coshop/category-grid/men-first.webp' },
              { id: 'home', name: 'Home', color: '#4c4a50', image: '/coshop/category-grid/home-first.webp' },
              { id: 'fitness', name: 'Fitness & nutrition', color: '#404040', image: '/coshop/category-grid/fitness-first.webp' },
              { id: 'baby-toddler', name: 'Baby & toddler', color: '#dc8152', image: '/coshop/category-grid/baby-toddler-first.webp' },
              { id: 'sporting', name: 'Sporting goods', color: '#f96045', image: '/coshop/category-grid/sporting-first.webp' },
              { id: 'food-drinks', name: 'Food & drinks', color: '#005ac9', image: '/coshop/category-grid/food-drinks-first.webp' },
              { id: 'toys-games', name: 'Toys & games', color: '#df3b34', image: '/coshop/category-grid/toys-games-first.webp' },
              { id: 'pet-supplies', name: 'Pet supplies', color: '#7eabcc', image: '/coshop/category-grid/pet-supplies-first.webp' }
            ].map((cat) => (
              <div
                key={cat.id}
                className="coshop-cat-grid-card"
                data-category={cat.id}
                data-hover-art="true"
                style={{ backgroundColor: cat.color }}
                onClick={() => {
                  setActiveCuratedCategory(cat.id);
                  document.querySelector('.coshop-curation-strip-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                onMouseEnter={(e) => {
                  setActiveCuratedCategory(cat.id);
                  const card = e.currentTarget;
                  card.setAttribute('data-playing', 'true');
                  const vid = card.querySelector('video');
                  if (vid) {
                    vid.currentTime = 0;
                    vid.play().catch(() => {});
                  }
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget;
                  const vid = card.querySelector('video');
                  if (vid) {
                    vid.pause();
                    vid.currentTime = 0;
                  }
                  card.removeAttribute('data-playing');
                }}
              >
                <span className="coshop-cat-grid-label">{cat.name}</span>
                <div className="coshop-cat-art-clip">
                  <div className="coshop-cat-art-inner">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="coshop-cat-art-poster"
                      loading="lazy"
                    />
                    <video
                      className="coshop-cat-art-video"
                      muted
                      playsInline
                      loop
                      preload="auto"
                    >
                      <source src={`/coshop/videos/${cat.id}-hover.webm`} type="video/webm" />
                    </video>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4C. GIANT CURATION SWITCHER STRIP (INFINITE LOOP & DRAG-TO-SCROLL) ── */}
        <section className="coshop-curation-strip-section" data-testid="curation-strip-section">
          <div
            ref={marqueeRef}
            className={`coshop-curation-marquee-wrap ${isMarqueeDragging ? 'is-dragging' : ''}`}
            onScroll={handleMarqueeScroll}
            onMouseDown={handleMarqueeMouseDown}
            onMouseMove={handleMarqueeMouseMove}
            onMouseUp={handleMarqueeMouseUp}
            onMouseLeave={handleMarqueeMouseLeave}
          >
            <div className="coshop-curation-words-track">
              {INFINITE_CURATION_LIST.map((cat) => {
                const isSelected = activeCuratedCategory === cat.id;
                const catData = curatedCategoryData[cat.id] || curatedCategoryData['men'];
                return (
                  <button
                    key={cat.loopUid}
                    type="button"
                    className={`coshop-curation-word-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setActiveCuratedCategory(cat.id)}
                    onMouseEnter={() => setActiveCuratedCategory(cat.id)}
                  >
                    <span className="coshop-curation-word-text">{cat.name}</span>
                    {isSelected && (
                      <div className="coshop-curation-3d-center-anchor">
                        {catData.video ? (
                          <video
                            className="coshop-curation-floating-3d-video"
                            autoPlay
                            muted
                            playsInline
                            loop
                            preload="auto"
                          >
                            <source src={catData.video} type="video/webm" />
                          </video>
                        ) : (
                          <img
                            src={catData.curation3D}
                            alt={catData.name}
                            className="coshop-curation-floating-3d-img"
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 4D. RELATED PRODUCTS CAROUSEL FOR ACTIVE CATEGORY (EXACT REPLICA OF SCREENSHOT 5) ── */}
          <div className="coshop-category-products-carousel-wrap">
            <div className="coshop-category-products-track">
              {((curatedCategoryData[activeCuratedCategory] || curatedCategoryData['men']).products || []).map((prod) => (
                <div
                  key={prod.id}
                  className="coshop-reference-product-card"
                  onClick={() => {
                    setViewingProduct({
                      id: prod.id,
                      title: prod.title,
                      brand: prod.brand,
                      brandRating: '4.8 ★ (303.1K)',
                      reviewsCount: `${prod.reviews || '2.2K'} ratings`,
                      price: parseInt(prod.price?.replace?.(/[^0-9]/g, '')) || 59,
                      currency: '$',
                      originalPrice: prod.originalPrice ? parseInt(prod.originalPrice.replace(/[^0-9]/g, '')) : 95,
                      discount: 31,
                      colour: 'Black',
                      sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
                      images: [
                        prod.image || '/coshop/products/lskd_legging_main.png',
                        '/coshop/products/lskd_thumb_1.png',
                        '/coshop/products/lskd_thumb_2.png',
                        '/coshop/products/lskd_thumb_3.png'
                      ],
                      description: prod.title,
                      retailerName: prod.brand
                    });
                    setActiveView('product');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="coshop-ref-prod-img-frame">
                    <img src={prod.image} alt={prod.title} loading="lazy" />
                  </div>
                  <div className="coshop-ref-prod-info">
                    <span className="coshop-ref-prod-brand">{prod.brand}</span>
                    <h3 className="coshop-ref-prod-title" title={prod.title}>{prod.title}</h3>
                    <div className="coshop-ref-prod-rating">
                      <div className="coshop-ref-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={11} fill="#111" color="#111" />
                        ))}
                      </div>
                      <span className="coshop-ref-reviews-text">({prod.reviews})</span>
                    </div>
                    <div className="coshop-ref-prod-price-row">
                      <span className="coshop-ref-price-current">{prod.price}</span>
                      {prod.originalPrice && (
                        <span className="coshop-ref-price-orig">{prod.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4E. CURATED DEPARTMENT SECTION: HOME > (EXACT REPLICA OF SCREENSHOT 5) ── */}
        <section className="coshop-department-section" data-testid="department-home-section">
          <div className="coshop-section-title-wrap">
            <h2 className="coshop-department-heading">
              <span>Home</span>
              <ChevronRight size={20} className="coshop-heading-arrow" />
            </h2>
          </div>

          <div className="coshop-department-editorial-grid">
            <div className="coshop-editorial-card large">
              <img src="/coshop/editorial/Home.jpeg" alt="Flamingo Estate Home" loading="lazy" />
              <div className="coshop-editorial-overlay">
                <span className="coshop-editorial-tag">Flamingo Estate</span>
                <h3>Pure Botanical Essentials For The Sanctuary</h3>
              </div>
            </div>
            <div className="coshop-editorial-card">
              <img src="/coshop/editorial/TASCHEN_DALI.jpeg" alt="TASCHEN Dali" loading="lazy" />
              <div className="coshop-editorial-overlay">
                <span className="coshop-editorial-tag">TASCHEN Books</span>
                <h3>Salvador Dali — The Definitive Hardcover Paintings</h3>
              </div>
            </div>
            <div className="coshop-editorial-card">
              <img src="/coshop/editorial/COVER_RUG.jpeg" alt="Revival Rugs" loading="lazy" />
              <div className="coshop-editorial-overlay">
                <span className="coshop-editorial-tag">Revival Rugs</span>
                <h3>Handcrafted Vintage Wool Area Rugs</h3>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. FOOTER ── */}
        <footer className="coshop-footer" data-testid="footer-next">
          <div className="coshop-footer-inner">
            {/* Left QR Column */}
            <div className="coshop-footer-left">
              <div className="coshop-footer-qr-card">
                <div className="coshop-qr-box" data-testid="download-qr-code">
                  <img src="/coshop/images/get-shop-app-qr-code-large-d6PnrfXS.png" alt="QR Code" data-testid="qr-image" />
                </div>
                <div className="coshop-qr-info">
                  <h4>Scan to shop on mobile</h4>
                  <p>Real-time alerts, party rooms & deals</p>
                </div>
              </div>

              <div className="coshop-footer-badges">
                <img src="/coshop/images/apple-badge-light-nl.svg" alt="App Store" data-testid="download-apple-store-link" />
                <img src="/coshop/images/google-badge-light-nl.svg" alt="Google Play" data-testid="download-play-store-link" />
              </div>
            </div>

            {/* Right Link Columns */}
            <div className="coshop-footer-cols">
              <div className="coshop-footer-col">
                <span className="coshop-footer-col-title">Features</span>
                <span className="coshop-footer-link">Multi-Store Search</span>
                <span className="coshop-footer-link">Live Price Tracking</span>
                <span className="coshop-footer-link">Party Shopping Rooms</span>
                <span className="coshop-footer-link">AI Shopping Assistant</span>
                <span className="coshop-footer-link">Shared Group Cart</span>
              </div>

              <div className="coshop-footer-col">
                <span className="coshop-footer-col-title">Supported Stores</span>
                <span className="coshop-footer-link">Amazon India</span>
                <span className="coshop-footer-link">Flipkart</span>
                <span className="coshop-footer-link">Myntra</span>
                <span className="coshop-footer-link">AJIO</span>
                <span className="coshop-footer-link">Nykaa</span>
              </div>

              <div className="coshop-footer-col">
                <span className="coshop-footer-col-title">CoGether Suite</span>
                <span className="coshop-footer-link">CoWatch Cinema</span>
                <span className="coshop-footer-link">CoPlay Games Arena</span>
                <span className="coshop-footer-link">CoStudy Focus Lounge</span>
                <span className="coshop-footer-link">Universal Video Call</span>
              </div>

              <div className="coshop-footer-col">
                <span className="coshop-footer-col-title">Trust & Legal</span>
                <span className="coshop-footer-link">Privacy Policy</span>
                <span className="coshop-footer-link">Terms of Service</span>
                <span className="coshop-footer-link">Cookie Preferences</span>
                <span className="coshop-footer-link">Trademark Notices</span>
              </div>
            </div>
          </div>

          {/* Sub-Footer */}
          <div className="coshop-sub-footer" data-testid="sub-footer-next">
            <span>© 2026 CoGether Universal Commerce. All rights reserved.</span>
            <span>
              CoShop is an independent universal comparison engine. Store names, trademarks, and logos belong to their respective owners.
            </span>
          </div>
        </footer>
        </>
      )}

      </main>

      {/* ── TRANSLUCENT FLOATING BOTTOM SEARCH BAR (SCREENSHOTS 1, 2, 3, 5) ── */}
      <div className="coshop-translucent-search-pill-wrap" data-testid="translucent-bottom-search-pill">
        <form onSubmit={handleSearchSubmit} className="coshop-translucent-search-form">
          <input
            type="text"
            data-testid="bottom-search-input"
            className="coshop-translucent-search-input"
            placeholder="What are you shopping for today?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="coshop-translucent-search-btn"
            aria-label="Submit search"
          >
            <ArrowRight size={18} strokeWidth={2.4} />
          </button>
        </form>
      </div>

      {/* ── 6. MODALS & DRAWERS ── */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isWishlisted={wishlist.some((w) => w.id === selectedProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Shared Cart Drawer (Accessible via Navigation Icon 3) */}
      <SharedCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={() => setCartItems([])}
      />

      {/* AI Assistant Modal */}
      <AIShoppingAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSelectProduct={(p) => {
          setIsAiModalOpen(false);
          setSelectedProduct(p);
        }}
      />

      {/* Filter Sidebar Drawer */}
      <FilterSidebar
        isOpenMobile={isFilterDrawerOpen}
        onCloseMobile={() => setIsFilterDrawerOpen(false)}
        facets={facets}
        selectedRetailers={selectedRetailers}
        onToggleRetailer={handleToggleRetailer}
        selectedBrand={selectedBrand}
        onSelectBrand={setSelectedBrand}
        priceRange={priceRange}
        onChangePriceRange={setPriceRange}
        minRating={minRating}
        onChangeRating={setMinRating}
        onResetFilters={handleResetFilters}
      />

      {/* Shopping Bag / Orders Drawer (Accessible via Navigation Icon 5) */}
      {isBagModalOpen && (
        <div className="coshop-modal-backdrop" onClick={() => setIsBagModalOpen(false)}>
          <div className="coshop-side-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="coshop-drawer-header">
              <div className="coshop-drawer-title-row">
                <ShoppingBag size={20} color="#739F20" />
                <h3>My Shopping Bag & Orders</h3>
              </div>
              <button type="button" className="coshop-drawer-close-btn" onClick={() => setIsBagModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="coshop-drawer-body">
              <div className="coshop-bag-summary-banner">
                <Package size={22} color="#739F20" />
                <div>
                  <h4>Universal Order Tracker</h4>
                  <p>All active orders from Amazon, Flipkart, Myntra, and AJIO in one unified feed.</p>
                </div>
              </div>
              <div className="coshop-drawer-items-list">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="coshop-drawer-item-row">
                    <img src={item.thumbnail} alt={item.title} className="coshop-drawer-thumb" />
                    <div className="coshop-drawer-item-info">
                      <span className="coshop-drawer-store-badge">{item.retailerName}</span>
                      <h5>{item.title}</h5>
                      <span className="coshop-drawer-price">₹{item.price?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="coshop-drawer-footer">
              <button
                type="button"
                className="coshop-drawer-primary-btn"
                onClick={() => {
                  setIsBagModalOpen(false);
                  setIsCartOpen(true);
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Modal (Accessible via Bottom Heart Icon) */}
      {isWishlistModalOpen && (
        <div className="coshop-modal-backdrop" onClick={() => setIsWishlistModalOpen(false)}>
          <div className="coshop-side-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="coshop-drawer-header">
              <div className="coshop-drawer-title-row">
                <Heart size={20} fill="#739F20" color="#739F20" />
                <h3>Saved Wishlist ({wishlist.length})</h3>
              </div>
              <button type="button" className="coshop-drawer-close-btn" onClick={() => setIsWishlistModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="coshop-drawer-body">
              {wishlist.length === 0 ? (
                <div className="coshop-drawer-empty">
                  <Heart size={44} color="#DDD" />
                  <h4>Your wishlist is empty</h4>
                  <p>Tap the heart icon on any product to save it across stores.</p>
                </div>
              ) : (
                <div className="coshop-drawer-items-list">
                  {wishlist.map((item) => (
                    <div key={item.id} className="coshop-drawer-item-row">
                      <img src={item.thumbnail} alt={item.title} className="coshop-drawer-thumb" />
                      <div className="coshop-drawer-item-info">
                        <span className="coshop-drawer-store-badge">{item.retailerName}</span>
                        <h5>{item.title}</h5>
                        <span className="coshop-drawer-price">₹{item.price?.toLocaleString('en-IN')}</span>
                      </div>
                      <button
                        type="button"
                        className="coshop-drawer-remove-btn"
                        onClick={() => handleToggleWishlist(item)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
