import React, { useState } from 'react';
import { 
  X, Star, Heart, ExternalLink, ShieldCheck, Truck, RotateCcw, 
  Sparkles, Check, Share2, ShoppingBag, Info
} from 'lucide-react';
import { API_URL } from '../../../config/api.js';
import './ProductDetailModal.css';

export default function ProductDetailModal({
  product,
  onClose,
  isWishlisted = false,
  onToggleWishlist,
  onAddToCart,
  inRoomMode = false,
  onSendToFriend
}) {
  if (!product) return null;

  const {
    id,
    title,
    brand,
    description,
    category,
    subcategory,
    images = [],
    thumbnail,
    price,
    originalPrice,
    discount,
    rating,
    reviewCount,
    sizeOptions = [],
    colorOptions = [],
    attributes = {},
    offers = [],
    bestOffer,
    fastestDeliveryOffer
  } = product;

  const [selectedImg, setSelectedImg] = useState(images[0] || thumbnail);
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || null);
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  const handleBuyClick = (offer) => {
    // Log affiliate click on backend
    fetch(`${API_URL}/api/coshop/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: id,
        retailerId: offer.retailerId,
        targetUrl: offer.affiliateUrl || offer.productUrl
      })
    }).catch(() => {});

    // Open official retailer destination in new window
    window.open(offer.affiliateUrl || offer.productUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAddCart = () => {
    onAddToCart?.(product);
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2000);
  };

  return (
    <div className="product-detail-modal-backdrop" onClick={onClose}>
      <div className="product-detail-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="modal-header-row">
          <div className="modal-header-breadcrumbs">
            <span>CoShop</span>
            <span className="sep">/</span>
            <span>{category}</span>
            {subcategory && (
              <>
                <span className="sep">/</span>
                <span>{subcategory}</span>
              </>
            )}
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} title="Close details">
            <X size={18} />
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="modal-body-layout">
          {/* Left Column: Image Gallery */}
          <div className="modal-gallery-col">
            <div className="main-preview-box">
              <img src={selectedImg} alt={title} className="main-preview-img" />
              {discount > 0 && (
                <span className="gallery-discount-pill">{discount}% OFF</span>
              )}
            </div>

            {images.length > 1 && (
              <div className="gallery-thumbnails-strip">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`thumb-btn ${selectedImg === img ? 'active' : ''}`}
                    onClick={() => setSelectedImg(img)}
                  >
                    <img src={img} alt={`${title} thumb ${idx}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information & Multi-Store Comparison */}
          <div className="modal-info-col">
            <div className="info-meta-row">
              <span className="info-brand-tag">{brand}</span>
              <div className="info-rating-row">
                <Star size={13} fill="#FFE500" color="#FFE500" />
                <span className="rating-val">{rating.toFixed(1)}</span>
                <span className="reviews-val">({reviewCount} verified reviews)</span>
              </div>
            </div>

            <h2 className="info-product-title">{title}</h2>

            <p className="info-description">{description}</p>

            {/* Size Options */}
            {sizeOptions.length > 0 && (
              <div className="variants-section">
                <span className="variants-label">SELECT SIZE / OPTION:</span>
                <div className="variants-chips">
                  {sizeOptions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`variant-chip ${selectedSize === s ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Options */}
            {colorOptions.length > 0 && (
              <div className="variants-section">
                <span className="variants-label">AVAILABLE COLORS:</span>
                <div className="variants-chips">
                  {colorOptions.map((c) => (
                    <span key={c} className="variant-chip-static">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── MULTI-STORE PRICE & DELIVERY COMPARISON ── */}
            <div className="store-comparison-container">
              <div className="comparison-header">
                <div className="comp-title-group">
                  <Sparkles size={14} className="comp-star" />
                  <h4>STORE AVAILABILITY & PRICE COMPARISON</h4>
                </div>
                <span className="comp-source-note">Based on available retailer data</span>
              </div>

              <div className="offers-table">
                {offers.map((offer, idx) => {
                  const isLowest = offer.price === offers[0]?.price;
                  const isFastest = fastestDeliveryOffer?.retailerId === offer.retailerId;

                  return (
                    <div key={idx} className={`offer-row ${isLowest ? 'highlight-lowest' : ''}`}>
                      <div className="offer-retailer-block">
                        <span className="retailer-name-label">{offer.retailerName}</span>
                        <div className="offer-badges-cluster">
                          {isLowest && (
                            <span className="badge-lowest-price">LOWEST PRICE FOUND</span>
                          )}
                          {isFastest && offers.length > 1 && (
                            <span className="badge-fastest-delivery">FASTEST DELIVERY</span>
                          )}
                        </div>
                      </div>

                      <div className="offer-delivery-block">
                        <div className="delivery-time">
                          <Truck size={12} className="truck-icon" />
                          <span>{offer.deliveryEstimate || '2-3 Days'}</span>
                        </div>
                        <span className="shipping-note">{offer.shippingInfo || 'Standard Shipping'}</span>
                      </div>

                      <div className="offer-price-block">
                        <span className="offer-price-val">₹{offer.price.toLocaleString('en-IN')}</span>
                        {offer.originalPrice > offer.price && (
                          <span className="offer-original-val">₹{offer.originalPrice.toLocaleString('en-IN')}</span>
                        )}
                      </div>

                      <div className="offer-action-block">
                        <button
                          type="button"
                          className="btn-buy-retailer"
                          onClick={() => handleBuyClick(offer)}
                          title={`Open ${offer.retailerName} official product page`}
                        >
                          <span>BUY ON {offer.retailerId.toUpperCase()}</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Add to Cart / Wishlist / Send to Friend */}
            <div className="modal-primary-actions-row">
              <button
                type="button"
                className="btn-modal-add-cart"
                onClick={handleAddCart}
              >
                <ShoppingBag size={15} />
                <span>{addedToCartToast ? 'ADDED TO COSHOP CART!' : 'ADD TO COSHOP LIST'}</span>
              </button>

              <button
                type="button"
                className={`btn-modal-wishlist ${isWishlisted ? 'active' : ''}`}
                onClick={() => onToggleWishlist?.(product)}
              >
                <Heart size={15} fill={isWishlisted ? '#FF3F6C' : 'none'} color={isWishlisted ? '#FF3F6C' : '#ffffff'} />
                <span>{isWishlisted ? 'SAVED' : 'WISHLIST'}</span>
              </button>

              {inRoomMode && onSendToFriend && (
                <button
                  type="button"
                  className="btn-modal-send-room"
                  onClick={() => {
                    onSendToFriend(product);
                    onClose();
                  }}
                >
                  <Share2 size={15} />
                  <span>DISCUSS IN ROOM</span>
                </button>
              )}
            </div>

            {/* Compliance & Affiliate Disclosure */}
            <div className="modal-compliance-notice">
              <Info size={13} className="info-icon" />
              <p>
                <strong>Disclosure:</strong> CoShop is an authorized product discovery and comparison platform. Actual checkout and payments occur securely on the official retailer website. CoShop may earn an affiliate commission from qualifying purchases. Prices and availability are updated regularly from source feeds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
