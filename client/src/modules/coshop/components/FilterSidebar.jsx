import React from 'react';
import { Filter, X, RotateCcw, Check, ChevronDown, Star } from 'lucide-react';
import './FilterSidebar.css';

export default function FilterSidebar({
  facets = {},
  selectedRetailers = [],
  onToggleRetailer,
  selectedBrand = 'all',
  onSelectBrand,
  priceRange = { min: 0, max: 100000 },
  onChangePriceRange,
  minRating = 0,
  onChangeRating,
  onResetFilters,
  isOpenMobile = false,
  onCloseMobile
}) {
  const brands = facets.brands || [];
  const retailersList = [
    { id: 'amazon', name: 'Amazon India' },
    { id: 'myntra', name: 'Myntra' },
    { id: 'flipkart', name: 'Flipkart' },
    { id: 'ajio', name: 'AJIO' }
  ];

  const pricePresets = [
    { label: 'All Prices', min: 0, max: 1000000 },
    { label: 'Under ₹1,000', min: 0, max: 1000 },
    { label: '₹1,000 – ₹3,000', min: 1000, max: 3000 },
    { label: '₹3,000 – ₹10,000', min: 3000, max: 10000 },
    { label: '₹10,000+', min: 10000, max: 1000000 }
  ];

  const isAnyFilterActive = 
    selectedRetailers.length > 0 || 
    selectedBrand !== 'all' || 
    priceRange.max < 1000000 || 
    minRating > 0;

  return (
    <aside className={`coshop-filter-sidebar ${isOpenMobile ? 'is-open-mobile' : ''}`}>
      {/* Sidebar Header */}
      <div className="filter-header-row">
        <div className="filter-title-group">
          <Filter size={14} className="filter-icon" />
          <span>FILTERS</span>
        </div>

        <div className="filter-actions-right">
          {isAnyFilterActive && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={onResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            className="btn-close-filter-mobile"
            onClick={onCloseMobile}
            title="Close filters"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="filter-scrollable-sections">
        {/* 1. Retailer Checkboxes */}
        <div className="filter-group-block">
          <span className="filter-group-title">RETAILERS</span>
          <div className="filter-checkbox-list">
            {retailersList.map((ret) => {
              const isChecked = selectedRetailers.includes(ret.id);
              const facetCount = facets.retailers?.find((r) => r.id === ret.id)?.count || 0;

              return (
                <label key={ret.id} className="filter-checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleRetailer(ret.id)}
                  />
                  <span className="custom-check-box">
                    {isChecked && <Check size={10} />}
                  </span>
                  <span className="checkbox-label-text">{ret.name}</span>
                  <span className="facet-count-badge">{facetCount}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 2. Price Budget Presets */}
        <div className="filter-group-block">
          <span className="filter-group-title">PRICE BUDGET</span>
          <div className="filter-radio-list">
            {pricePresets.map((preset, idx) => {
              const isActive = priceRange.min === preset.min && priceRange.max === preset.max;

              return (
                <button
                  key={idx}
                  type="button"
                  className={`price-preset-pill ${isActive ? 'active' : ''}`}
                  onClick={() => onChangePriceRange(preset.min, preset.max)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Brands */}
        {brands.length > 0 && (
          <div className="filter-group-block">
            <span className="filter-group-title">TOP BRANDS</span>
            <div className="filter-brands-list">
              <button
                type="button"
                className={`brand-chip-btn ${selectedBrand === 'all' ? 'active' : ''}`}
                onClick={() => onSelectBrand('all')}
              >
                All Brands
              </button>
              {brands.slice(0, 10).map((b) => {
                const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();

                return (
                  <button
                    key={b.name}
                    type="button"
                    className={`brand-chip-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectBrand(isSelected ? 'all' : b.name)}
                  >
                    <span>{b.name}</span>
                    <span className="brand-count">({b.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Customer Rating */}
        <div className="filter-group-block">
          <span className="filter-group-title">MINIMUM RATING</span>
          <div className="rating-filter-options">
            {[4, 3].map((stars) => (
              <button
                key={stars}
                type="button"
                className={`btn-rating-filter ${minRating === stars ? 'active' : ''}`}
                onClick={() => onChangeRating(minRating === stars ? 0 : stars)}
              >
                <Star size={12} fill="#FFE500" color="#FFE500" />
                <span>{stars}★ & above</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
