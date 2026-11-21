import React, { useState, useEffect } from 'react';
import {
  PackagePlus, Link as LinkIcon, Trash2, Globe, CheckCircle2,
  AlertCircle, Loader2, ArrowLeft, RefreshCw, ShoppingBag, Terminal
} from 'lucide-react';
import { API_URL } from '../config/api.js';
import './AuthStyles.css';

export default function AdminPublisherPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('scrape'); // 'scrape' | 'manual' | 'live' | 'script'
  
  // Scraper State
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [scrapeError, setScrapeError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');

  // Manual Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Fashion');
  const [imageUrl, setImageUrl] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Products State
  const [liveProducts, setLiveProducts] = useState([]);
  const [loadingLive, setLoadingLive] = useState(false);

  const fetchLiveProducts = async () => {
    setLoadingLive(true);
    try {
      const res = await fetch(`${API_URL}/api/coshop/admin/products`);
      const data = await res.json();
      if (data.success) {
        setLiveProducts(data.products || []);
      }
    } catch (_e) {}
    setLoadingLive(false);
  };

  useEffect(() => {
    fetchLiveProducts();
  }, []);

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!scrapeUrl.trim()) return;
    setIsScraping(true);
    setScrapeError('');
    setScrapedData(null);
    setPublishSuccess('');

    try {
      const res = await fetch(`${API_URL}/api/coshop/admin/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract product metadata');
      }
      setScrapedData(data.scraped);
    } catch (err) {
      setScrapeError(err.message || 'Could not fetch metadata from this URL');
    } finally {
      setIsScraping(false);
    }
  };

  const handlePublishScraped = async () => {
    if (!scrapedData) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/coshop/admin/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapedData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Publish failed');
      setPublishSuccess(`Published "${scrapedData.title}" live to CoShop!`);
      setScrapedData(null);
      setScrapeUrl('');
      fetchLiveProducts();
    } catch (err) {
      setScrapeError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !price) return;
    setIsSubmitting(true);
    setPublishSuccess('');

    const item = {
      title: title.trim(),
      price: Number(price),
      originalPrice: Number(originalPrice || price),
      brand: brand.trim() || 'Curated',
      category: category.trim(),
      image: imageUrl.trim() || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      productUrl: productUrl.trim() || 'https://www.cogether.tech',
      description: description.trim()
    };

    try {
      const res = await fetch(`${API_URL}/api/coshop/admin/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Publish failed');
      setPublishSuccess(`Published "${item.title}" successfully!`);
      setTitle('');
      setPrice('');
      setOriginalPrice('');
      setBrand('');
      setImageUrl('');
      setProductUrl('');
      setDescription('');
      fetchLiveProducts();
    } catch (err) {
      alert('Error publishing item: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Remove this product from CoShop live catalog?')) return;
    try {
      await fetch(`${API_URL}/api/coshop/admin/products/${id}`, { method: 'DELETE' });
      fetchLiveProducts();
    } catch (_e) {}
  };

  return (
    <div className="auth-page-container" style={{ minHeight: '100vh', padding: '40px 16px', alignItems: 'flex-start' }}>
      <div className="auth-page-card" style={{ maxWidth: '880px', textAlign: 'left', padding: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('/') : window.location.href = '/'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Back to CoGether
          </button>

          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#22c55e',
            background: 'rgba(34, 197, 94, 0.1)',
            padding: '4px 10px',
            borderRadius: '12px',
            letterSpacing: '0.08em'
          }}>
            ADMIN INGESTION ENGINE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
              CoShop Catalog Publisher
            </h1>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Publish custom products, scrape web links, and automate real-time inventory updates.
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginBottom: '28px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('scrape')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'scrape' ? '#22c55e' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'scrape' ? '#000' : '#94a3b8',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🔗 Auto-Scrape Link
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'manual' ? '#22c55e' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'manual' ? '#000' : '#94a3b8',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            ✏️ Manual Add
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'live' ? '#22c55e' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'live' ? '#000' : '#94a3b8',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            📦 Live Catalog ({liveProducts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('script')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeTab === 'script' ? '#22c55e' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'script' ? '#000' : '#94a3b8',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            ⚡ Local CLI Script
          </button>
        </div>

        {publishSuccess && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            color: '#4ade80',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> {publishSuccess}
          </div>
        )}

        {/* ── TAB 1: AUTO SCRAPE URL ── */}
        {activeTab === 'scrape' && (
          <div>
            <form onSubmit={handleScrape} style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
                PASTE PRODUCT URL (AMAZON, NIKE, MYNTRA, ZARA, FLIPKART, ETC.)
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="url"
                  placeholder="https://www.nike.com/in/t/air-force-1..."
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  className="auth-input"
                  style={{ flex: 1 }}
                  required
                />
                <button
                  type="submit"
                  disabled={isScraping || !scrapeUrl.trim()}
                  className="auth-btn-primary"
                  style={{ width: 'auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isScraping ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                  <span>{isScraping ? 'Extracting...' : 'Extract Data'}</span>
                </button>
              </div>
            </form>

            {scrapeError && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
                <AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                {scrapeError}
              </div>
            )}

            {scrapedData && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                gap: '20px',
                alignItems: 'center'
              }}>
                <img
                  src={scrapedData.thumbnail}
                  alt={scrapedData.title}
                  style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '10px' }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 800 }}>{scrapedData.brand} · {scrapedData.category}</span>
                  <h3 style={{ margin: '4px 0 8px', fontSize: '16px', fontWeight: 700, color: '#fff' }}>{scrapedData.title}</h3>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
                    ₹{scrapedData.price?.toLocaleString('en-IN')}
                    {scrapedData.originalPrice > scrapedData.price && (
                      <span style={{ fontSize: '13px', color: '#64748b', textDecoration: 'line-through', marginLeft: '8px' }}>
                        ₹{scrapedData.originalPrice?.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handlePublishScraped}
                    disabled={isSubmitting}
                    className="auth-btn-primary"
                    style={{ width: 'auto', padding: '8px 20px', fontSize: '13px' }}
                  >
                    {isSubmitting ? 'Publishing...' : '🚀 Publish Live to CoShop'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MANUAL FORM ── */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  PRODUCT TITLE *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nike Dunk Low Retro"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  BRAND / STORE *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nike, Apple, Zara"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  PRICE (INR) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 7999"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  ORIGINAL PRICE (INR)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 9999"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="auth-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  CATEGORY
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="auth-input"
                  style={{ background: '#1c1f26', color: '#fff' }}
                >
                  <option value="Footwear">Footwear</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Lifestyle">Lifestyle</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  IMAGE URL *
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  BUY / AFFILIATE DESTINATION LINK
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                DESCRIPTION
              </label>
              <textarea
                rows={2}
                placeholder="Product highlights, specifications, and details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="auth-input"
                style={{ resize: 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-btn-primary"
              style={{ width: 'auto', padding: '12px 28px' }}
            >
              {isSubmitting ? 'Publishing...' : '✨ Publish Product Live'}
            </button>
          </form>
        )}

        {/* ── TAB 3: LIVE PRODUCTS ── */}
        {activeTab === 'live' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Showing {liveProducts.length} custom published product(s) in CoShop live engine.
              </span>
              <button
                type="button"
                onClick={fetchLiveProducts}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {liveProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No custom products published yet. Use the Auto-Scrape or Manual Add tabs to publish your first item!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                {liveProducts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <img
                      src={p.thumbnail || (p.images && p.images[0])}
                      alt={p.title}
                      style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700 }}>{p.brand}</span>
                      <h4 style={{ margin: '4px 0', fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                        {p.title}
                      </h4>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginTop: 'auto', paddingTop: '8px' }}>
                        ₹{p.price?.toLocaleString('en-IN')}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{
                          marginTop: '10px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          padding: '6px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: LOCAL CLI SCRIPT INSTRUCTIONS ── */}
        {activeTab === 'script' && (
          <div>
            <div style={{
              background: '#0d1117',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#38bdf8',
              lineHeight: 1.6,
              marginBottom: '20px'
            }}>
              <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: '8px' }}>
                # 1. Run local publisher script
              </div>
              node scripts/coshop-publisher.js
              <br /><br />
              <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: '8px' }}>
                # 2. Watch mode: automatically publishes when you edit scripts/products-to-publish.json
              </div>
              node scripts/coshop-publisher.js --watch
              <br /><br />
              <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: '8px' }}>
                # 3. Direct URL scraping & publishing from terminal
              </div>
              node scripts/coshop-publisher.js --url "https://store.com/your-product-link"
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
              You can simply add your product items or links to <code>scripts/products-to-publish.json</code>. Running the script will automatically ingest them into the CoShop live search engine!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
