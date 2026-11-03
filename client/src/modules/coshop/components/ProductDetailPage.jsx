import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Heart, Share2, MoreHorizontal, 
  Check, Star, ShoppingBag, ArrowRight, ShieldCheck, Truck, RefreshCw
} from 'lucide-react';
import './ProductDetailPage.css';

export const LSKD_LEGGINGS_PRODUCT = {
  id: 'lskd-fusion-legging',
  title: 'O.G. Fusion Ultra High-Rise Full Length Legging Pockets - Black',
  brand: 'LSKD',
  brandRating: '4.8 ★ (303.1K)',
  reviewsCount: '2.2K ratings',
  price: 59,
  currency: 'A$',
  originalPrice: 95,
  discount: 38,
  colour: 'Black',
  sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  images: [
    '/coshop/products/lskd_legging_main.png',
    '/coshop/products/lskd_thumb_1.png',
    '/coshop/products/lskd_thumb_2.png',
    '/coshop/products/lskd_thumb_3.png',
    '/coshop/products/lskd_thumb_4.png',
    '/coshop/products/lskd_thumb_5.png',
    '/coshop/products/lskd_thumb_6.png'
  ],
  description: 'Iconic visual air unit with breathable mesh overlays and durable foam midsole for supreme athletic cushioning.',
  retailerName: 'LSKD US',
  retailerId: 'lskd'
};

export const EDITORIAL_CATALOG_ITEMS = [
  {
    id: 'ed-1',
    type: 'editorial',
    title: 'Stretching 101',
    subtitle: 'Travel mats, rollers, and acupressure tools.',
    image: '/coshop/products/catalog_stretching_101.png',
    bg: '#E5DED8'
  },
  {
    id: 'ed-2',
    type: 'product',
    brand: 'LSKD US',
    title: 'O.G. Fusion Ultra High-Rise Full...',
    rating: '★★★★★ (105)',
    price: '$65.00',
    originalPrice: '$95.00',
    discount: '32% off',
    image: '/coshop/products/lskd_legging_main.png'
  },
  {
    id: 'ed-3',
    type: 'editorial',
    title: 'Womens New Arrivals',
    subtitle: 'High performance activewear.',
    image: '/coshop/products/catalog_womens_new_arrivals.png',
    bg: '#3B82F6'
  },
  {
    id: 'ed-4',
    type: 'product',
    brand: 'LSKD US',
    title: 'Fusion O.G High-Rise Full Length...',
    rating: '★★★★★ (1)',
    price: '$65.00',
    originalPrice: '$94.00',
    discount: '31% off',
    image: '/coshop/products/catalog_tights_leggings.png'
  },
  {
    id: 'ed-5',
    type: 'editorial',
    title: 'MUSCLE REPUBLIC',
    subtitle: '4.8 ★ (58.6K)',
    image: '/coshop/products/catalog_muscle_republic.png',
    bg: '#CBD5E1'
  },
  {
    id: 'ed-6',
    type: 'product',
    brand: 'LSKD US',
    title: 'Fusion Bonded High-Rise Full Leng...',
    rating: '★★★★★ (20)',
    price: '$65.00',
    originalPrice: '$94.00',
    discount: '31% off',
    image: '/coshop/products/catalog_tights_leggings.png'
  },
  {
    id: 'ed-7',
    type: 'editorial',
    title: 'The best sleep recipes',
    subtitle: 'Sleep gummies, magnesium, soothing teas.',
    image: '/coshop/products/catalog_sleep_recipes.png',
    bg: '#F5EBE1'
  },
  {
    id: 'ed-8',
    type: 'editorial',
    title: 'Tights & Leggings',
    subtitle: 'Engineered for comfort and support.',
    image: '/coshop/products/catalog_tights_leggings.png',
    bg: '#E2E8F0'
  },
  {
    id: 'ed-9',
    type: 'product',
    brand: 'LSKD US',
    title: 'Fusion Bonded High-Rise Full Leng...',
    rating: '★★★★★ (18)',
    price: '$89.00',
    originalPrice: '$128.00',
    discount: '30% off',
    image: '/coshop/products/cart_lskd_item.png'
  }
];

export default function ProductDetailPage({
  product = LSKD_LEGGINGS_PRODUCT,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false,
  onBack,
  onSelectProduct
}) {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState('2XS');
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isFlying, setIsFlying] = useState(false);

  const images = product?.images?.length ? product.images : [
    product?.thumbnail || '/coshop/products/lskd_legging_main.png',
    '/coshop/products/lskd_thumb_1.png',
    '/coshop/products/lskd_thumb_2.png',
    '/coshop/products/lskd_thumb_3.png',
    '/coshop/products/lskd_thumb_4.png',
    '/coshop/products/lskd_thumb_5.png',
    '/coshop/products/lskd_thumb_6.png'
  ];

  const handlePrevImage = () => {
    setSelectedImageIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCartClick = () => {
    // 1. Trigger flight animation
    setIsFlying(true);
    setIsAdded(true);

    // 2. Add to cart in parent state
    if (onAddToCart) {
      onAddToCart({
        ...product,
        selectedSize,
        quantity,
        thumbnail: images[selectedImageIdx] || images[0]
      });
    }

    // 3. Reset flight after animation finishes
    setTimeout(() => {
      setIsFlying(false);
    }, 850);
  };

  return (
    <div className="coshop-pdp-container" data-testid="coshop-product-detail-page">
      {/* ── FLYING CURVED SQUARE ANIMATION TO LEFT CART ── */}
      {isFlying && (
        <div className="coshop-fly-curved-square" aria-hidden="true">
          <img 
            src={images[selectedImageIdx] || images[0]} 
            alt="Flying product" 
            className="coshop-fly-img"
          />
        </div>
      )}

      {/* ── TOP PRODUCT SECTION (SCREENSHOT 1) ── */}
      <section className="coshop-pdp-main-row">
        
        {/* Left Vertical Gallery Strip */}
        <div className="coshop-pdp-thumbs-strip" aria-label="Product thumbnails">
          {images.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              className={`coshop-pdp-thumb-btn ${selectedImageIdx === idx ? 'active' : ''}`}
              onClick={() => setSelectedImageIdx(idx)}
              aria-label={`View photo ${idx + 1}`}
            >
              <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="coshop-pdp-thumb-img" />
            </button>
          ))}
        </div>

        {/* Center Large Main Image with Arrows */}
        <div className="coshop-pdp-hero-image-wrap">
          <button 
            type="button" 
            className="coshop-pdp-arrow-btn prev" 
            onClick={handlePrevImage}
            aria-label="Previous image"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>

          <img 
            src={images[selectedImageIdx] || images[0]} 
            alt={product.title} 
            className="coshop-pdp-hero-img" 
          />

          <button 
            type="button" 
            className="coshop-pdp-arrow-btn next" 
            onClick={handleNextImage}
            aria-label="Next image"
          >
            <ChevronRight size={20} strokeWidth={2.4} />
          </button>
        </div>

        {/* Right Details Column */}
        <div className="coshop-pdp-details-col">
          {/* Store Row */}
          <div className="coshop-pdp-store-row">
            <div className="coshop-pdp-store-badge-group">
              <span className="coshop-pdp-store-avatar">
                {product.brand?.[0] || 'L'}
              </span>
              <div className="coshop-pdp-store-info">
                <span className="coshop-pdp-store-name">{product.brand || 'LSKD'}</span>
                <span className="coshop-pdp-store-rating">{product.brandRating || '4.8 ★ (303.1K)'}</span>
              </div>
            </div>
            <button type="button" className="coshop-pdp-more-btn" aria-label="More options">
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Product Title */}
          <h1 className="coshop-pdp-title">{product.title}</h1>

          {/* Star Rating Row */}
          <div className="coshop-pdp-ratings-row">
            <div className="coshop-pdp-stars">
              {'★★★★★'}
            </div>
            <span className="coshop-pdp-rating-count">{product.reviewsCount || '2.2K ratings'}</span>
          </div>

          {/* Price Row */}
          <div className="coshop-pdp-price-row">
            <span className="coshop-pdp-current-price">
              {product.currency || 'A$'}{product.price?.toFixed ? product.price.toFixed(2) : product.price}
            </span>
            {product.originalPrice && (
              <span className="coshop-pdp-original-price">
                {product.currency || 'A$'}{product.originalPrice?.toFixed ? product.originalPrice.toFixed(2) : product.originalPrice}
              </span>
            )}
            {product.discount && (
              <span className="coshop-pdp-discount-badge">{product.discount}% off</span>
            )}
          </div>

          {/* Colour Swatch */}
          <div className="coshop-pdp-option-block">
            <span className="coshop-pdp-option-label">
              Colour <strong>{product.colour || 'Black'}</strong>
            </span>
            <div className="coshop-pdp-swatch-ring active">
              <img 
                src={images[0]} 
                alt="Black colour" 
                className="coshop-pdp-swatch-img" 
              />
            </div>
          </div>

          {/* Size Pills */}
          <div className="coshop-pdp-option-block">
            <span className="coshop-pdp-option-label">
              Size <strong>{selectedSize}</strong>
            </span>
            <div className="coshop-pdp-size-pills-row">
              {(product.sizes || ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']).map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`coshop-pdp-size-pill ${selectedSize === size ? 'active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="coshop-pdp-option-block">
            <span className="coshop-pdp-option-label">Quantity</span>
            <div className="coshop-pdp-qty-pill">
              <button 
                type="button" 
                className="coshop-pdp-qty-btn" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                −
              </button>
              <span className="coshop-pdp-qty-num">{quantity}</span>
              <button 
                type="button" 
                className="coshop-pdp-qty-btn" 
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons: Green Primary Add To Cart + Black Buy Now */}
          <div className="coshop-pdp-actions-col">
            <button
              type="button"
              className={`coshop-pdp-add-cart-btn ${isAdded ? 'is-added' : ''}`}
              onClick={handleAddToCartClick}
              data-testid="pdp-add-to-cart-btn"
            >
              {isAdded ? (
                <>
                  <Check size={18} strokeWidth={2.8} />
                  <span>Added to cart</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={18} strokeWidth={2.2} />
                  <span>Add to cart</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="coshop-pdp-buy-now-btn"
              onClick={() => {
                handleAddToCartClick();
                alert(`Proceeding to instant checkout for ${product.title}`);
              }}
            >
              Buy now
            </button>
          </div>

          {/* Save & Share Secondary Row */}
          <div className="coshop-pdp-share-row">
            <button 
              type="button" 
              className={`coshop-pdp-tool-btn ${isWishlisted ? 'active' : ''}`}
              onClick={() => onToggleWishlist?.(product)}
            >
              <Heart size={16} fill={isWishlisted ? '#739F20' : 'none'} color={isWishlisted ? '#739F20' : 'currentColor'} />
              <span>{isWishlisted ? 'Saved' : 'Save'}</span>
            </button>
            <button 
              type="button" 
              className="coshop-pdp-tool-btn"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.title, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('Product link copied to clipboard!');
                }
              }}
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>
          </div>

        </div>
      </section>

      {/* ── BELOW IT: EDITORIAL CATALOG GRID (SCREENSHOT 2) ── */}
      <section className="coshop-pdp-catalog-section" data-testid="pdp-catalog-section">
        <div className="coshop-pdp-catalog-grid">
          {EDITORIAL_CATALOG_ITEMS.map((item) => {
            if (item.type === 'editorial') {
              return (
                <div key={item.id} className="coshop-pdp-ed-card">
                  <img src={item.image} alt={item.title} className="coshop-pdp-ed-img" loading="lazy" />
                  <div className="coshop-pdp-ed-overlay">
                    <h4 className="coshop-pdp-ed-title">{item.title}</h4>
                    <p className="coshop-pdp-ed-subtitle">{item.subtitle}</p>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={item.id} 
                className="coshop-pdp-product-card"
                onClick={() => onSelectProduct?.(item)}
              >
                <div className="coshop-pdp-card-img-wrap">
                  {item.discount && (
                    <span className="coshop-pdp-card-badge">{item.discount}</span>
                  )}
                  <img src={item.image} alt={item.title} className="coshop-pdp-card-img" loading="lazy" />
                </div>
                <div className="coshop-pdp-card-info">
                  <span className="coshop-pdp-card-brand">{item.brand}</span>
                  <h4 className="coshop-pdp-card-title">{item.title}</h4>
                  <div className="coshop-pdp-card-stars">{item.rating}</div>
                  <div className="coshop-pdp-card-price-row">
                    <span className="coshop-pdp-card-price">{item.price}</span>
                    {item.originalPrice && (
                      <span className="coshop-pdp-card-orig">{item.originalPrice}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
