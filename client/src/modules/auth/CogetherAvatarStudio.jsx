import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shuffle,
  RotateCcw,
  Undo2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Palette,
  Sparkles
} from 'lucide-react';
import CogetherAvatarRenderer, {
  useAvatarManifest,
  loadSvgInnerContent
} from './CogetherAvatarRenderer';

const STUDIO_CATEGORIES = [
  { id: 'heads', label: 'Head' },
  { id: 'skin', label: 'Skin' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'hair', label: 'Hair' },
  { id: 'clothing', label: 'Clothes' },
  { id: 'eyewear', label: 'Eyewear' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'backgrounds', label: 'Background' },
  { id: 'effects', label: 'Effects' }
];

function VectorThumbnail({ item }) {
  const [innerHtml, setInnerHtml] = useState('');

  useEffect(() => {
    let active = true;
    if (!item?.url) return;
    loadSvgInnerContent(item.url).then((html) => {
      if (active) setInnerHtml(html);
    });
    return () => {
      active = false;
    };
  }, [item?.url]);

  return (
    <svg
      className="studio-thumb-svg"
      viewBox={item.thumbnailViewBox || item.viewBox || '0 0 1024 1024'}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <g dangerouslySetInnerHTML={{ __html: innerHtml }} />
    </svg>
  );
}

/**
 * Computes a shallow semicircular arc transform for each thumbnail
 * relative to the currently selected item index.
 */
function getArcWheelStyle(index, selectedIndex) {
  const effectiveSelected = selectedIndex >= 0 ? selectedIndex : 0;
  const delta = index - effectiveSelected;
  const absDelta = Math.abs(delta);
  const sign = Math.sign(delta);

  if (absDelta === 0) {
    return {
      transform: 'translateY(-5px) scale(1.08) rotateZ(0deg)',
      opacity: 1,
      zIndex: 5
    };
  }
  if (absDelta === 1) {
    return {
      transform: `translateY(2px) scale(0.93) rotateZ(${(sign * 2.6).toFixed(1)}deg)`,
      opacity: 0.9,
      zIndex: 4
    };
  }
  if (absDelta === 2) {
    return {
      transform: `translateY(7px) scale(0.85) rotateZ(${(sign * 4.8).toFixed(1)}deg)`,
      opacity: 0.76,
      zIndex: 3
    };
  }
  return {
    transform: `translateY(11px) scale(0.79) rotateZ(${(sign * 6.8).toFixed(1)}deg)`,
    opacity: 0.6,
    zIndex: 2
  };
}

export default function CogetherAvatarStudio({
  value,
  onChange
}) {
  const { manifest, loading } = useAvatarManifest();
  const [activeCategory, setActiveCategory] = useState('hair');
  const [history, setHistory] = useState([]);
  const galleryRef = useRef(null);
  const itemRefs = useRef({});
  const dragStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const currentConfig = value || manifest?.defaults || {
    headId: 'head-base-01',
    skinToneId: 'skin-01-porcelain',
    eyesId: 'eyes-05-sparkle-wide',
    hairId: 'hair-01-short-messy',
    hairColorId: 'hair-color-charcoal',
    clothingId: 'clothing-01-chibi-crew-tee',
    clothingColorId: 'cloth-color-crimson',
    eyewearId: null,
    accessoryIds: [],
    backgroundId: 'bg-01-obsidian',
    effectsIds: []
  };

  // Push to undo history and apply update
  const applyConfigUpdate = useCallback(
    (patch) => {
      const next = {
        ...currentConfig,
        ...patch
      };
      setHistory((prev) => [...prev.slice(-19), currentConfig]);
      onChange(next);
    },
    [currentConfig, onChange]
  );

  // Undo last change
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    onChange(previous);
  };

  // Reset to manifest defaults
  const handleReset = () => {
    if (!manifest?.defaults) return;
    setHistory((prev) => [...prev.slice(-19), currentConfig]);
    onChange({ ...manifest.defaults });
  };

  // Randomize avatar from actual manifest items
  const handleRandomize = () => {
    if (!manifest) return;
    const isCompat = (item) => Boolean(item && item.compatible !== false);
    const pick = (arr) => {
      const valid = (arr || []).filter(isCompat);
      return valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : null;
    };

    const randHead = pick(manifest.categories?.heads);
    const randSkin = pick(manifest.palettes?.skinTones);
    const randEyes = pick(manifest.categories?.eyes);
    const randHair = pick(manifest.categories?.hair);
    const randHairColor = pick(manifest.palettes?.hairColors);
    const randCloth = pick(manifest.categories?.clothing);
    const randClothColor = pick(manifest.palettes?.clothingColors);
    const randEyewear = Math.random() < 0.35 ? pick(manifest.categories?.eyewear) : null;
    const randAcc = Math.random() < 0.35 ? pick(manifest.categories?.accessories) : null;
    // Effects are strictly optional per Section 3
    const randEff = Math.random() < 0.2 ? pick(manifest.categories?.effects) : null;
    const randBg = pick(manifest.palettes?.studioBackdrops) || pick(manifest.categories?.backgrounds);

    applyConfigUpdate({
      headId: randHead?.id || currentConfig.headId,
      skinToneId: randSkin?.id || currentConfig.skinToneId,
      eyesId: randEyes?.id || currentConfig.eyesId,
      hairId: randHair?.id || currentConfig.hairId,
      hairColorId: randHairColor?.id || currentConfig.hairColorId,
      clothingId: randCloth?.id || currentConfig.clothingId,
      clothingColorId: randClothColor?.id || currentConfig.clothingColorId,
      eyewearId: randEyewear?.id || null,
      accessoryIds: randAcc ? [randAcc.id] : [],
      effectsIds: randEff ? [randEff.id] : [],
      backgroundId: randBg?.id || currentConfig.backgroundId
    });
  };

  // Cycle background preview
  const handleCycleBackground = () => {
    const isCompat = (item) => Boolean(item && item.compatible !== false);
    const vectorBgs = (manifest?.categories?.backgrounds || []).filter(isCompat);
    const studioBgs = manifest?.palettes?.studioBackdrops || [];
    const backdrops = vectorBgs.length > 0 ? [...vectorBgs, ...studioBgs] : studioBgs;
    if (backdrops.length === 0) return;
    const idx = backdrops.findIndex((b) => b.id === currentConfig.backgroundId);
    const nextBg = backdrops[(idx + 1) % backdrops.length];
    applyConfigUpdate({ backgroundId: nextBg.id });
  };

  // Clear accessories
  const handleClearAccessory = () => {
    applyConfigUpdate({ accessoryIds: [], effectsIds: [], eyewearId: null });
  };

  // Get items list and active ID for current category
  const getCategoryItemsAndSelection = useCallback(() => {
    if (!manifest) return { items: [], selectedId: null, fieldKey: null };
    const isCompat = (item) => Boolean(item && item.compatible !== false);
    switch (activeCategory) {
      case 'heads':
        return {
          items: (manifest.categories?.heads || []).filter(isCompat),
          selectedId: currentConfig.headId,
          fieldKey: 'headId'
        };
      case 'skin':
        return {
          items: manifest.palettes?.skinTones || [],
          selectedId: currentConfig.skinToneId,
          fieldKey: 'skinToneId'
        };
      case 'eyes':
        return {
          items: (manifest.categories?.eyes || []).filter(isCompat),
          selectedId: currentConfig.eyesId,
          fieldKey: 'eyesId'
        };
      case 'hair':
        return {
          items: (manifest.categories?.hair || []).filter(isCompat),
          selectedId: currentConfig.hairId,
          fieldKey: 'hairId'
        };
      case 'clothing':
        return {
          items: (manifest.categories?.clothing || []).filter(isCompat),
          selectedId: currentConfig.clothingId,
          fieldKey: 'clothingId'
        };
      case 'eyewear':
        return {
          items: (manifest.categories?.eyewear || []).filter(isCompat),
          selectedId: currentConfig.eyewearId,
          fieldKey: 'eyewearId'
        };
      case 'accessories':
        return {
          items: (manifest.categories?.accessories || []).filter(isCompat),
          selectedId: (currentConfig.accessoryIds || [])[0] || null,
          fieldKey: 'accessoryIds'
        };
      case 'backgrounds': {
        const vectorBgs = (manifest.categories?.backgrounds || []).filter(isCompat);
        const studioBgs = manifest.palettes?.studioBackdrops || [];
        const combined = vectorBgs.length > 0 ? [...vectorBgs, ...studioBgs] : studioBgs;
        return {
          items: combined,
          selectedId: currentConfig.backgroundId,
          fieldKey: 'backgroundId'
        };
      }
      case 'effects':
        return {
          items: (manifest.categories?.effects || []).filter(isCompat),
          selectedId: (currentConfig.effectsIds || [])[0] || null,
          fieldKey: 'effectsIds'
        };
      default:
        return { items: [], selectedId: null, fieldKey: null };
    }
  }, [manifest, activeCategory, currentConfig]);

  const { items: activeItems, selectedId: activeItemId, fieldKey } = getCategoryItemsAndSelection();
  const selectedIndex = activeItems ? activeItems.findIndex((item) => item.id === activeItemId) : -1;

  // Smoothly center the selected item in the curved wheel whenever selection or category changes
  useEffect(() => {
    const container = galleryRef.current;
    const cardEl = activeItemId ? itemRefs.current[activeItemId] : null;
    if (!container || !cardEl) return;

    const targetLeft =
      cardEl.offsetLeft - container.clientWidth / 2 + cardEl.offsetWidth / 2;
    try {
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth'
      });
    } catch (_e) {
      container.scrollLeft = Math.max(0, targetLeft);
    }
  }, [activeItemId, activeCategory]);

  // Previous / Next asset navigation in current category
  const handleStepAsset = useCallback(
    (direction) => {
      if (!activeItems || activeItems.length === 0 || !fieldKey) return;
      const currentIndex = activeItems.findIndex((item) => item.id === activeItemId);
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + activeItems.length) % activeItems.length;
      const chosen = activeItems[nextIndex];
      if (!chosen) return;

      if (fieldKey === 'accessoryIds' || fieldKey === 'effectsIds') {
        applyConfigUpdate({ [fieldKey]: [chosen.id] });
      } else if (fieldKey === 'eyewearId') {
        applyConfigUpdate({ eyewearId: chosen.id });
      } else if (fieldKey === 'headId') {
        // Changing head must NOT override the user's selected skin tone
        applyConfigUpdate({ headId: chosen.id });
      } else {
        applyConfigUpdate({ [fieldKey]: chosen.id });
      }
    },
    [activeItems, activeItemId, fieldKey, applyConfigUpdate]
  );

  // Support keyboard Left/Right navigation across the selection wheel
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepAsset(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepAsset(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStepAsset]);

  const handleSelectItem = (item) => {
    if (dragStateRef.current.moved) return;
    if (!fieldKey) return;
    if (fieldKey === 'eyewearId') {
      const nextId = currentConfig.eyewearId === item.id ? null : item.id;
      applyConfigUpdate({ eyewearId: nextId });
    } else if (fieldKey === 'accessoryIds' || fieldKey === 'effectsIds') {
      const currentArr = currentConfig[fieldKey] || [];
      const exists = currentArr.includes(item.id);
      const nextArr = exists ? currentArr.filter((id) => id !== item.id) : [...currentArr, item.id];
      applyConfigUpdate({ [fieldKey]: nextArr });
    } else if (fieldKey === 'headId') {
      // Changing head must NOT override the user's selected skin tone
      applyConfigUpdate({ headId: item.id });
    } else {
      applyConfigUpdate({ [fieldKey]: item.id });
    }
  };

  // Mouse drag & wheel horizontal scrolling on the curved carousel
  const handleWheelScroll = (e) => {
    if (!galleryRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      galleryRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e) => {
    if (!galleryRef.current) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.pageX - galleryRef.current.offsetLeft,
      scrollLeft: galleryRef.current.scrollLeft,
      moved: false
    };
  };

  const handleMouseMove = (e) => {
    if (!dragStateRef.current.isDown || !galleryRef.current) return;
    const x = e.pageX - galleryRef.current.offsetLeft;
    const walk = (x - dragStateRef.current.startX) * 1.2;
    if (Math.abs(walk) > 5) {
      dragStateRef.current.moved = true;
    }
    galleryRef.current.scrollLeft = dragStateRef.current.scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    dragStateRef.current.isDown = false;
    setTimeout(() => {
      dragStateRef.current.moved = false;
    }, 40);
  };

  if (loading && !manifest) {
    return (
      <div className="avatar-studio-loading">
        <span>Loading CoGether Avatar Studio...</span>
      </div>
    );
  }

  const hairColors = manifest?.palettes?.hairColors || [];
  const clothingColors = manifest?.palettes?.clothingColors || [];

  return (
    <div className="cogether-avatar-studio" data-testid="cogether-avatar-studio">
      {/* ── TOP PREVIEW STAGE & QUICK ACTION TOOLBAR ── */}
      <div className="studio-preview-row">
        <button
          type="button"
          className="studio-step-arrow-btn"
          onClick={() => handleStepAsset(-1)}
          disabled={!activeItems || activeItems.length <= 1}
          title="Previous option in category (Left Arrow)"
          aria-label="Previous option"
          data-testid="studio-prev-asset-btn"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="studio-main-avatar-wrap">
          <CogetherAvatarRenderer
            config={currentConfig}
            size={156}
            animated={true}
            showBackdrop={true}
          />
        </div>

        <button
          type="button"
          className="studio-step-arrow-btn"
          onClick={() => handleStepAsset(1)}
          disabled={!activeItems || activeItems.length <= 1}
          title="Next option in category (Right Arrow)"
          aria-label="Next option"
          data-testid="studio-next-asset-btn"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── INTERACTION CONTROLS BAR ── */}
      <div className="studio-Utility-toolbar" role="toolbar" aria-label="Avatar Controls">
        <button
          type="button"
          className="studio-tool-chip"
          onClick={handleRandomize}
          title="Randomize appearance"
          data-testid="studio-randomize-btn"
        >
          <Shuffle size={13} />
          <span>Randomize</span>
        </button>

        <button
          type="button"
          className="studio-tool-chip"
          onClick={handleUndo}
          disabled={history.length === 0}
          title="Undo last change"
          data-testid="studio-undo-btn"
        >
          <Undo2 size={13} />
          <span>Undo</span>
        </button>

        <button
          type="button"
          className="studio-tool-chip"
          onClick={handleReset}
          title="Reset to default avatar"
          data-testid="studio-reset-btn"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>

        <button
          type="button"
          className="studio-tool-chip"
          onClick={handleCycleBackground}
          title="Preview against different backgrounds"
          data-testid="studio-bg-cycle-btn"
        >
          <Palette size={13} />
          <span>Backdrop</span>
        </button>

        {(activeCategory === 'accessories' ||
          activeCategory === 'effects' ||
          activeCategory === 'eyewear' ||
          currentConfig.eyewearId ||
          (currentConfig.accessoryIds && currentConfig.accessoryIds.length > 0) ||
          (currentConfig.effectsIds && currentConfig.effectsIds.length > 0)) && (
          <button
            type="button"
            className="studio-tool-chip"
            onClick={handleClearAccessory}
            disabled={
              !currentConfig.eyewearId &&
              (!currentConfig.accessoryIds || currentConfig.accessoryIds.length === 0) &&
              (!currentConfig.effectsIds || currentConfig.effectsIds.length === 0)
            }
            title="Clear selected accessory or eyewear"
            data-testid="studio-clear-accessory-btn"
          >
            <XCircle size={13} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* ── HORIZONTALLY SCROLLABLE CATEGORY BAR ── */}
      <div
        className="studio-category-bar"
        role="tablist"
        aria-label="Avatar Customization Categories"
        data-testid="studio-category-bar"
      >
        {STUDIO_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`studio-category-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              data-testid={`studio-tab-${cat.id}`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── CURVED ARC SELECTION WHEEL CAROUSEL (NO VISIBLE SCROLLBAR) ── */}
      <div className="studio-arc-wheel-wrapper">
        <div
          ref={galleryRef}
          className="studio-carousel-container studio-arc-wheel"
          role="tabpanel"
          aria-label={`${activeCategory} options`}
          data-testid={`studio-gallery-${activeCategory}`}
          onWheel={handleWheelScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
        >
          {activeItems && activeItems.length > 0 ? (
            <div className="studio-thumbnail-track studio-arc-track">
              {activeItems.map((item, idx) => {
                const isSelected = activeItemId === item.id;
                const arcStyle = getArcWheelStyle(idx, selectedIndex);

                // Skin Tone Swatch Card
                if (activeCategory === 'skin') {
                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[item.id] = el;
                      }}
                      type="button"
                      className={`studio-thumb-card skin-swatch-card ${isSelected ? 'selected' : ''}`}
                      style={arcStyle}
                      onClick={() => handleSelectItem(item)}
                      title={item.name}
                      aria-label={item.name}
                      aria-pressed={isSelected}
                      data-testid={`studio-item-${item.id}`}
                    >
                      {isSelected && <span className="studio-thumb-reflection" aria-hidden="true" />}
                      <span
                        className="skin-swatch-circle"
                        style={{
                          background: `linear-gradient(135deg, ${item.primary} 0%, ${item.primary} 55%, ${item.shadow} 100%)`
                        }}
                      />
                      <span className="studio-thumb-caption">{item.name.split(' ')[0]}</span>
                    </button>
                  );
                }

                // Background Swatch Card
                if (activeCategory === 'backgrounds') {
                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[item.id] = el;
                      }}
                      type="button"
                      className={`studio-thumb-card bg-swatch-card ${isSelected ? 'selected' : ''}`}
                      style={arcStyle}
                      onClick={() => handleSelectItem(item)}
                      title={item.name}
                      aria-label={item.name}
                      aria-pressed={isSelected}
                      data-testid={`studio-item-${item.id}`}
                    >
                      {isSelected && <span className="studio-thumb-reflection" aria-hidden="true" />}
                      {item.url ? (
                        <div className="studio-thumb-visual">
                          <VectorThumbnail item={item} />
                        </div>
                      ) : (
                        <span
                          className="bg-swatch-preview"
                          style={{ background: item.css }}
                        />
                      )}
                      <span className="studio-thumb-caption">{item.name.split(' ')[0]}</span>
                    </button>
                  );
                }

                // Standard SVG Vector Part Thumbnail (Heads, Eyes, Hair, Clothing, etc.)
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    type="button"
                    className={`studio-thumb-card ${isSelected ? 'selected' : ''}`}
                    style={arcStyle}
                    onClick={() => handleSelectItem(item)}
                    title={item.name}
                    aria-label={item.name}
                    aria-pressed={isSelected}
                    data-testid={`studio-item-${item.id}`}
                  >
                    {isSelected && <span className="studio-thumb-reflection" aria-hidden="true" />}
                    <div className="studio-thumb-visual">
                      <VectorThumbnail item={item} />
                    </div>
                    <span className="studio-thumb-caption">{item.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="studio-empty-category" data-testid="studio-coming-soon">
              <Sparkles size={16} />
              <span>More styles coming soon</span>
            </div>
          )}
        </div>
        {activeItems && activeItems.length > 0 && (
          <div className="studio-arc-Dial-curve" aria-hidden="true" />
        )}
      </div>

      {/* ── OPTIONAL SECONDARY COLOR SWATCH BAR FOR HAIR & CLOTHES ── */}
      {activeCategory === 'hair' && hairColors.length > 0 && (
        <div className="studio-subcolor-row" aria-label="Hair Color Options">
          <span className="subcolor-label">Tint:</span>
          <div className="subcolor-swatches">
            {hairColors.map((hc) => (
              <button
                key={hc.id}
                type="button"
                className={`subcolor-dot ${currentConfig.hairColorId === hc.id ? 'active' : ''}`}
                style={{ background: hc.primary }}
                onClick={() => applyConfigUpdate({ hairColorId: hc.id })}
                title={hc.name}
                aria-label={`Hair color ${hc.name}`}
                data-testid={`hair-color-${hc.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {activeCategory === 'clothing' && clothingColors.length > 0 && (
        <div className="studio-subcolor-row" aria-label="Outfit Color Options">
          <span className="subcolor-label">Color:</span>
          <div className="subcolor-swatches">
            {clothingColors.map((cc) => (
              <button
                key={cc.id}
                type="button"
                className={`subcolor-dot ${currentConfig.clothingColorId === cc.id ? 'active' : ''}`}
                style={{ background: cc.primary }}
                onClick={() => applyConfigUpdate({ clothingColorId: cc.id })}
                title={cc.name}
                aria-label={`Clothing color ${cc.name}`}
                data-testid={`cloth-color-${cc.id}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
