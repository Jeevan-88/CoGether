-- Migration 005: CoShop Normalized Catalog, Retailer Offers & Affiliate Tracking

CREATE TABLE IF NOT EXISTS coshop.products (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  thumbnail_url TEXT,
  normalized_price NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  rating NUMERIC(3, 2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coshop.retailer_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(100) NOT NULL REFERENCES coshop.products(id) ON DELETE CASCADE,
  retailer_id VARCHAR(50) NOT NULL, -- 'amazon', 'myntra', 'flipkart', 'ajio'
  price NUMERIC(12, 2) NOT NULL,
  url TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  stock_status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
  delivery_estimate VARCHAR(100),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coshop.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100),
  product_id VARCHAR(100) NOT NULL REFERENCES coshop.products(id),
  retailer_id VARCHAR(50) NOT NULL,
  destination_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coshop_products_brand_cat ON coshop.products(brand, category);
CREATE INDEX IF NOT EXISTS idx_coshop_offers_product ON coshop.retailer_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_coshop_clicks_product ON coshop.affiliate_clicks(product_id, created_at);
