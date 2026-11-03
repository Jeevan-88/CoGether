import React, { useState } from 'react';
import { Trash2, MoreHorizontal, Plus, Minus, ArrowRight, Check } from 'lucide-react';
import './FullCartPage.css';

export const INITIAL_CART_GROUPS = [
  {
    storeId: 'lskd',
    storeName: 'LSKD',
    storeRating: '4.8 ★ (303.1K)',
    storeLogo: 'L',
    items: [
      {
        id: 'cart-lskd-1',
        title: 'O.G. Fusion Ultra High-Rise Full Length Legging Pockets - Black',
        variant: 'Black / 2XS',
        price: 95.0,
        currency: 'A$',
        quantity: 3,
        thumbnail: '/coshop/products/cart_lskd_item.png'
      }
    ]
  },
  {
    storeId: 'unbound-merino',
    storeName: 'Unbound Merino',
    storeRating: '4.8 ★ (37.4K)',
    storeLogo: 'UM',
    items: [
      {
        id: 'cart-merino-1',
        title: "Men's Merino Crew Neck T-Shirt",
        variant: 'Black / S',
        price: 98.0,
        currency: '$',
        quantity: 1,
        thumbnail: '/coshop/products/cart_merino_item.png'
      }
    ]
  }
];

export const YOU_MIGHT_ALSO_LIKE_ITEMS = [
  {
    id: 'rec-1',
    title: "Men's Long Sleeve Merino Crew",
    variant: 'Black / S',
    price: '$115.00',
    thumbnail: '/coshop/products/recom_merino_crew.png'
  },
  {
    id: 'rec-2',
    title: 'CORE™ Waffle Knit Henley',
    variant: 'Admiral / SM',
    price: '₹6,700.00',
    originalPrice: '₹9,600.00',
    thumbnail: '/coshop/products/recom_waffle_knit.png'
  },
  {
    id: 'rec-3',
    title: "Men's Merino V-Neck T-Shirt",
    variant: 'Black / S',
    price: '$98.00',
    thumbnail: '/coshop/products/recom_vneck.png'
  },
  {
    id: 'rec-4',
    title: 'MOAB® Stretch Canvas...',
    variant: 'Dark Khaki / 30 / 30',
    price: '₹8,600.00',
    originalPrice: '₹12,400.00',
    thumbnail: '/coshop/products/recom_stretch_canvas.png'
  },
  {
    id: 'rec-5',
    title: "Men's Compact Travel Hoodie",
    variant: 'Black / S',
    price: '$198.00',
    thumbnail: '/coshop/products/recom_hoodie.png'
  }
];

export default function FullCartPage({
  cartGroups = INITIAL_CART_GROUPS,
  onUpdateQuantity,
  onCheckoutGroup,
  onAddRecommendation
}) {
  const [groups, setGroups] = useState(cartGroups);
  const [addedRecIds, setAddedRecIds] = useState([]);

  const handleQtyChange = (storeId, itemId, delta) => {
    setGroups((prevGroups) =>
      prevGroups
        .map((g) => {
          if (g.storeId !== storeId) return g;
          const updatedItems = g.items
            .map((item) => {
              if (item.id !== itemId) return item;
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            })
            .filter(Boolean);
          return { ...g, items: updatedItems };
        })
        .filter((g) => g.items.length > 0)
    );

    if (onUpdateQuantity) {
      onUpdateQuantity(storeId, itemId, delta);
    }
  };

  const handleAddRec = (item) => {
    setAddedRecIds((prev) => [...prev, item.id]);
    if (onAddRecommendation) {
      onAddRecommendation(item);
    }
  };

  return (
    <div className="coshop-full-cart-page" data-testid="coshop-full-cart-page">
      <h1 className="coshop-cart-main-heading">Your cart</h1>

      <div className="coshop-cart-grid-layout">
        {/* Left Column: Multi-Store Carts */}
        <div className="coshop-cart-stores-col">
          {groups.map((group) => {
            const groupTotal = group.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
            const totalCount = group.items.reduce((sum, it) => sum + it.quantity, 0);
            const currency = group.items[0]?.currency || '$';

            return (
              <div key={group.storeId} className="coshop-store-cart-card">
                {/* Store Header */}
                <div className="coshop-store-cart-header">
                  <div className="coshop-store-brand-badge-wrap">
                    <span className="coshop-store-badge-avatar">{group.storeLogo}</span>
                    <div className="coshop-store-badge-meta">
                      <span className="coshop-store-title-text">{group.storeName}</span>
                      <span className="coshop-store-rating-text">{group.storeRating}</span>
                    </div>
                  </div>
                  <button type="button" className="coshop-store-menu-btn" aria-label="Store options">
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                {/* Items in Store */}
                <div className="coshop-store-items-list">
                  {group.items.map((item) => (
                    <div key={item.id} className="coshop-cart-item-row">
                      <img src={item.thumbnail} alt={item.title} className="coshop-cart-item-img" />
                      <div className="coshop-cart-item-details">
                        <div className="coshop-cart-item-title-row">
                          <h3 className="coshop-cart-item-title">{item.title}</h3>
                          <span className="coshop-cart-item-unit-price">
                            {currency}{item.price.toFixed(2)}
                          </span>
                        </div>
                        <span className="coshop-cart-item-variant">{item.variant}</span>

                        <div className="coshop-cart-item-controls-row">
                          <div className="coshop-cart-qty-counter">
                            <button
                              type="button"
                              className="coshop-cart-counter-btn"
                              onClick={() => handleQtyChange(group.storeId, item.id, -1)}
                              aria-label="Decrease quantity"
                            >
                              {item.quantity === 1 ? <Trash2 size={13} /> : '−'}
                            </button>
                            <span className="coshop-cart-counter-val">{item.quantity}</span>
                            <button
                              type="button"
                              className="coshop-cart-counter-btn"
                              onClick={() => handleQtyChange(group.storeId, item.id, 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <button type="button" className="coshop-cart-save-later-btn">
                            Save for later
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Green Checkout Button */}
                <div className="coshop-store-cart-footer">
                  <div className="coshop-store-subtotal-row">
                    <span className="coshop-store-subtotal-label">
                      Subtotal ({totalCount} {totalCount === 1 ? 'item' : 'items'})
                    </span>
                    <span className="coshop-store-subtotal-price">
                      {currency}{groupTotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="coshop-store-checkout-btn"
                    onClick={() => {
                      if (onCheckoutGroup) onCheckoutGroup(group);
                      else alert(`Proceeding to secure checkout for ${group.storeName} (${currency}${groupTotal.toFixed(2)})`);
                    }}
                  >
                    Continue to checkout
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: "You might also like" Card */}
        <div className="coshop-cart-recom-col">
          <div className="coshop-recom-card">
            <h2 className="coshop-recom-card-title">You might also like</h2>
            
            <div className="coshop-recom-items-list">
              {YOU_MIGHT_ALSO_LIKE_ITEMS.map((item) => {
                const isItemAdded = addedRecIds.includes(item.id);
                return (
                  <div key={item.id} className="coshop-recom-item-row">
                    <img src={item.thumbnail} alt={item.title} className="coshop-recom-thumb-img" />
                    
                    <div className="coshop-recom-meta-block">
                      <h4 className="coshop-recom-item-title">{item.title}</h4>
                      <span className="coshop-recom-variant-label">{item.variant}</span>
                      
                      <div className="coshop-recom-action-row">
                        <button
                          type="button"
                          className={`coshop-recom-add-btn ${isItemAdded ? 'added' : ''}`}
                          onClick={() => handleAddRec(item)}
                        >
                          {isItemAdded ? (
                            <>
                              <Check size={12} strokeWidth={2.8} />
                              <span>Added</span>
                            </>
                          ) : (
                            'Add to cart'
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="coshop-recom-price-col">
                      <span className="coshop-recom-price">{item.price}</span>
                      {item.originalPrice && (
                        <span className="coshop-recom-orig-price">{item.originalPrice}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
