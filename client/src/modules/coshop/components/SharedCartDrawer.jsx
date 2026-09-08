import React, { useState } from 'react';
import { ShoppingBag, X, ExternalLink, Trash2, ShieldCheck, DollarSign, Sparkles } from 'lucide-react';
import './SharedCartDrawer.css';

export default function SharedCartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onRemoveItem,
  onClearCart
}) {
  const [budgetTarget, setBudgetTarget] = useState(10000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('10000');

  if (!isOpen) return null;

  // Group items by retailer
  const groupedByRetailer = cartItems.reduce((acc, item) => {
    const retId = item.retailerId || 'other';
    if (!acc[retId]) {
      acc[retId] = {
        retailerName: item.retailerName || 'Retailer',
        retailerId: retId,
        items: [],
        subtotal: 0
      };
    }
    acc[retId].items.push(item);
    acc[retId].subtotal += item.price;
    return acc;
  }, {});

  const totalCost = cartItems.reduce((sum, item) => sum + item.price, 0);
  const remainingBudget = budgetTarget - totalCost;
  const budgetProgress = Math.min(100, Math.round((totalCost / budgetTarget) * 100));

  const handleCheckoutRetailer = (group) => {
    // Open the primary item affiliate link
    const firstItem = group.items[0];
    if (firstItem) {
      window.open(firstItem.affiliateUrl || firstItem.productUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="shared-cart-drawer-backdrop" onClick={onClose}>
      <div className="shared-cart-drawer-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-title-block">
            <ShoppingBag size={18} className="cart-header-icon" />
            <div>
              <h3>COSHOP MULTI-STORE CART</h3>
              <span className="cart-count-subtitle">{cartItems.length} selected item{cartItems.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="cart-header-actions">
            {cartItems.length > 0 && (
              <button type="button" className="btn-clear-cart" onClick={onClearCart} title="Clear cart">
                Clear All
              </button>
            )}
            <button type="button" className="btn-close-cart" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── BUDGET PLANNER WIDGET ── */}
        <div className="budget-planner-card">
          <div className="budget-row-header">
            <span className="budget-title">SHOPPING BUDGET PLANNER</span>
            {isEditingBudget ? (
              <div className="budget-edit-form">
                <span className="rupee-sym">₹</span>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="budget-input-field"
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-save-budget"
                  onClick={() => {
                    setBudgetTarget(Number(budgetInput) || 10000);
                    setIsEditingBudget(false);
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-edit-budget"
                onClick={() => {
                  setBudgetInput(String(budgetTarget));
                  setIsEditingBudget(true);
                }}
              >
                Limit: ₹{budgetTarget.toLocaleString('en-IN')} (Edit)
              </button>
            )}
          </div>

          <div className="budget-metrics-row">
            <div>
              <span className="metric-label">TOTAL SELECTED:</span>
              <span className="metric-val total">₹{totalCost.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="metric-label">REMAINING:</span>
              <span className={`metric-val ${remainingBudget >= 0 ? 'safe' : 'exceeded'}`}>
                ₹{remainingBudget.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="budget-progress-track">
            <div
              className={`budget-progress-fill ${budgetProgress > 100 ? 'over-budget' : ''}`}
              style={{ width: `${Math.min(100, budgetProgress)}%` }}
            />
          </div>
        </div>

        {/* Items Container */}
        <div className="cart-items-scroll-area">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <ShoppingBag size={42} className="empty-cart-icon" />
              <h4>Your CoShop list is empty</h4>
              <p>Explore products across Amazon, Myntra, Flipkart, and AJIO to build your multi-store shopping list!</p>
            </div>
          ) : (
            <div className="retailer-groups-stack">
              {Object.values(groupedByRetailer).map((group) => (
                <div key={group.retailerId} className="retailer-cart-group-card">
                  <div className="retailer-group-header">
                    <span className="retailer-group-name">{group.retailerName}</span>
                    <span className="retailer-group-subtotal">
                      {group.items.length} item{group.items.length === 1 ? '' : 's'} • ₹{group.subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="retailer-items-list">
                    {group.items.map((item, i) => (
                      <div key={i} className="cart-item-row">
                        <img src={item.thumbnail} alt={item.title} className="cart-item-thumb" />
                        <div className="cart-item-details">
                          <span className="cart-item-brand">{item.brand}</span>
                          <h5 className="cart-item-title">{item.title}</h5>
                          <span className="cart-item-price">₹{item.price.toLocaleString('en-IN')}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => onRemoveItem?.(item)}
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="retailer-group-checkout-action">
                    <button
                      type="button"
                      className="btn-checkout-store"
                      onClick={() => handleCheckoutRetailer(group)}
                    >
                      <span>BUY {group.items.length} ITEM{group.items.length === 1 ? '' : 'S'} ON {group.retailerId.toUpperCase()}</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="cart-drawer-footer">
          <div className="multi-store-checkout-notice">
            <ShieldCheck size={14} className="shield-icon" />
            <p>
              <strong>Multi-Retailer Policy:</strong> Each item will open on its official verified store (Amazon, Myntra, etc.) for direct checkout and payment. CoShop does not collect payment card information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
