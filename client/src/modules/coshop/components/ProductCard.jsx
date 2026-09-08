import React from 'react';
import { Star, Heart, ExternalLink, Share2, Sparkles, ShoppingBag } from 'lucide-react';
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
    retailerName,
    retailerId,
    offers = [],
    hasComparison,
    comparisonHeadline
  } = product;

  const isAmazon = retailerId === 'amazon';
  const isMyntra = retailerId === 'myntra';
  const isFlipkart = retailerId === 'flipkart';
  const isAjio = retailerId === 'ajio';

  const storeCount = offers.length;

  return (
    <div className="coshop-product-card" onClick={() => onSelect?.(product)}>
      {/* Top Image Box */}
      <div className="product-image-frame">
        <img src={thumbnail} alt={title} className="product-card-img" loading="lazy" />

        {/* Discount Badge */}
        {discount > 0 && (
          <span className="product-discount-pill">
            {discount}% OFF
          </span>
        )}

        {/* Retailer Identity Tag */}
        <span className={`product-retailer-tag retailer-${retailerId}`}>
          {retailerName}
        </span>

        {/* Wishlist Toggle Button */}
        <button
          type="button"
          className={`btn-wishlist-action ${isWishlisted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product);
          }}
          title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart size={15} fill={isWishlisted ? '#FF3F6C' : 'none'} color={isWishlisted ? '#FF3F6C' : '#ffffff'} />
        </button>

        {/* Room Mode: Send to Friend Action */}
        {inRoomMode && onSendToFriend && (
          <button
            type="button"
            className="btn-send-friend-action"
            onClick={(e) => {
              e.stopPropagation();
              onSendToFriend(product);
            }}
            title="Send product to room discussion"
          >
            <Share2 size={13} />
            <span>Send</span>
          </button>
        )}
      </div>

      {/* Product Content Info */}
      <div className="product-card-body">
        <div className="product-brand-row">
          <span className="product-brand-name">{brand}</span>
          <div className="product-rating-badge">
            <Star size={11} fill="#FFE500" color="#FFE500" />
            <span>{rating.toFixed(1)}</span>
            {reviewCount > 0 && <span className="review-count">({reviewCount})</span>}
          </div>
        </div>

        <h3 className="product-title" title={title}>{title}</h3>

        {/* Multi-Store Comparison Indicator */}
        {storeCount > 1 ? (
          <div className="product-comparison-pill">
            <Sparkles size={11} className="compare-icon" />
            <span>LOWEST IN {storeCount} STORES</span>
          </div>
        ) : (
          <div className="product-single-store-note">
            <span>Verified Partner Offer</span>
          </div>
        )}

        {/* Price & Action Row */}
        <div className="product-price-action-row">
          <div className="price-block">
            <span className="currency-symbol">₹</span>
            <span className="current-price">{price.toLocaleString('en-IN')}</span>
            {originalPrice > price && (
              <span className="original-price">₹{originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>

          <button
            type="button"
            className="btn-view-deal"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(product);
            }}
          >
            {storeCount > 1 ? 'COMPARE' : 'VIEW DEAL'}
          </button>
        </div>
      </div>
    </div>
  );
}
