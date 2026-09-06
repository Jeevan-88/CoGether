import React from 'react';
import './CoGetherButton.css';

/**
 * Standardized CoGether Arcade Action Button
 * Enforces uniform geometry across all gameplay actions:
 * - height: 48px
 * - min-width: 160px
 * - padding: 0 24px
 * - font-weight: 800
 * - centered content
 *
 * Variants: 'primary' (arcade yellow), 'secondary' (dark charcoal), 'danger' (red), 'ghost' (transparent)
 */
export default function CoGetherButton({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost'
  size = 'standard',   // 'standard' (48px) | 'compact' (38px)
  icon: Icon = null,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  title = '',
  ariaLabel = ''
}) {
  const variantClass = `btn-arcade-${variant}`;
  const sizeClass = size === 'compact' ? 'btn-size-compact' : 'btn-size-standard';
  const widthClass = fullWidth ? 'btn-full-width' : '';

  return (
    <button
      type={type}
      className={`cogether-arcade-btn ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      title={title || (typeof children === 'string' ? children : undefined)}
      aria-label={ariaLabel || title || (typeof children === 'string' ? children : 'Action')}
    >
      {Icon && <Icon className="btn-icon" size={16} aria-hidden="true" />}
      <span className="btn-label">{children}</span>
    </button>
  );
}
