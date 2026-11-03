import React from 'react';
import { Star, Heart, Share2, Sparkles } from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({
  product,
  onSelect,
  isWishlisted = false,
  onToggleWishlist,
  onSendToFriend,
  inRoomMode = false
}) {
  if (!product) return null;

  const {
    title,
    brand,
    price,
    originalPrice,
    discount,
    rating,
    reviewCount,
    thumbnail,
    images = [],
    retailerName,
    retailerId,
    offers = []
  } = product;

  const storeCount = offers.length;
  // Swatches: up to 3 thumbnails
  const swatches = (images && images.length > 1) ? images.slice(0, 3) : [];

  return (
    <div className="shop-product-card" onClick={() => onSelect?.(product)}>
      {/* 20px inner radius product image frame */}
      <div className="shop-card-image-frame">
        <img
          src={thumbnail}
          alt={title}
          className="shop-card-img"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Discount badge */}
        {discount > 0 && (
          <span className="shop-discount-pill">
            {discount}% off
          </span>
        )}

        {/* Retailer identity pill */}
        <span className={`shop-retailer-pill ret-${retailerId || 'store'}`}>
          {retailerName}
        </span>

        {/* Wishlist button */}
        <button
          type="button"
          className={`shop-card-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product);
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart size={14} fill={isWishlisted ? '#739F20' : 'none'} color={isWishlisted ? '#739F20' : '#000000'} />
        </button>

        {/* Room Mode: Send to Friend Action */}
        {inRoomMode && onSendToFriend && (
          <button
            type="button"
            className="shop-card-send-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSendToFriend(product);
            }}
            title="Share to room"
          >
            <Share2 size={12} />
            <span>Send</span>
          </button>
        )}
      </div>

      {/* Mini Swatches Strip */}
      {swatches.length > 0 && (
        <div className="shop-swatches-strip">
          {swatches.map((img, idx) => (
            <div key={idx} className="shop-swatch-thumb">
              <img src={img} alt="" />
            </div>
          ))}
        </div>
      )}

      {/* Product Body */}
      <div className="shop-card-body">
        {/* Brand & Star Rating Row */}
        <div className="shop-card-meta-row">
          <span className="shop-brand-name">{brand}</span>
          <div className="shop-rating-row">
            <Star size={10} fill="#000000" color="#000000" />
            <span className="shop-rating-val">{rating.toFixed(1)}</span>
            {reviewCount > 0 && <span className="shop-review-count">({reviewCount})</span>}
          </div>
        </div>

        {/* Title */}
        <h3 className="shop-card-title" title={title}>{title}</h3>

        {/* Multi-Store Comparison Pill */}
        {storeCount > 1 ? (
          <div className="shop-store-compare-pill">
            <Sparkles size={11} className="compare-sparkle" />
            <span>Best verified in {storeCount} stores</span>
          </div>
        ) : (
          <div className="shop-store-single-pill">
            <span>Verified Partner Offer</span>
          </div>
        )}

        {/* Price & Action Row */}
        <div className="shop-price-row">
          <div className="shop-price-group">
            <span className="shop-current-price">₹{price.toLocaleString('en-IN')}</span>
            {originalPrice > price && (
              <span className="shop-original-price">₹{originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>

          <button
            type="button"
            className="shop-btn-pill-action"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(product);
            }}
          >
            {storeCount > 1 ? 'Compare' : 'View'}
          </button>
        </div>
      </div>
    </div>
  );
}
