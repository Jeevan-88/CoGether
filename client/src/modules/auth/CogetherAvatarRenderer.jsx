import React, { useState, useEffect, useMemo } from 'react';

const MANIFEST_URL = '/assets/avatars/cogether/manifest.json';

export const DEFAULT_AVATAR_CONFIG = {
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

let cachedManifest = null;
let manifestPromise = null;
const svgLayerCache = new Map();

export async function loadAvatarManifest() {
  if (cachedManifest) return cachedManifest;
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load avatar manifest');
        return res.json();
      })
      .then((data) => {
        cachedManifest = data;
        return data;
      })
      .catch((err) => {
        manifestPromise = null;
        throw err;
      });
  }
  return manifestPromise;
}

export async function loadSvgInnerContent(url) {
  if (!url) return '';
  if (svgLayerCache.has(url)) return svgLayerCache.get(url);

  const res = await fetch(url);
  if (!res.ok) return '';
  const raw = await res.text();
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');
  svgLayerCache.set(url, inner);
  return inner;
}

export function useAvatarManifest() {
  const [manifest, setManifest] = useState(cachedManifest);
  const [loading, setLoading] = useState(!cachedManifest);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (cachedManifest) {
      setManifest(cachedManifest);
      setLoading(false);
      return;
    }
    loadAvatarManifest()
      .then((data) => {
        if (active) {
          setManifest(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { manifest, loading, error };
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function recolorBodySvg(svgInner, skinTone) {
  if (!svgInner || !skinTone) return svgInner;
  return svgInner
    .replace(/fill="#F4E8D3"/gi, 'fill="__BODY_SKIN_PRIMARY__"')
    .replace(/fill="#FEDF9B"/gi, 'fill="__BODY_SKIN_PRIMARY__"')
    .replace(/fill="#F6E3C8"/gi, 'fill="__BODY_SKIN_PRIMARY__"')
    .replace(/fill="#FAEFDF"/gi, 'fill="__BODY_SKIN_PRIMARY__"')
    .replace(/fill="#F8E7D2"/gi, 'fill="__BODY_SKIN_PRIMARY__"')
    .replace(/fill="#DAC9B1"/gi, 'fill="__BODY_SKIN_SHADOW__"')
    .replace(/fill="#AEA792"/gi, 'fill="__BODY_SKIN_SHADOW__"')
    .replace(/fill="#B6AA93"/gi, 'fill="__BODY_SKIN_SHADOW__"')
    .replace(/fill="#D4AF94"/gi, 'fill="__BODY_SKIN_SHADOW__"')
    .replace(/fill="#D9A68A"/gi, 'fill="__BODY_SKIN_SHADOW__"')
    .replace(/fill="__BODY_SKIN_PRIMARY__"/g, `fill="${skinTone.primary}"`)
    .replace(/fill="__BODY_SKIN_SHADOW__"/g, `fill="${skinTone.shadow}"`);
}

export function recolorHeadSvg(svgInner, headMeta, skinTone) {
  if (!svgInner || !skinTone) return svgInner;
  let out = svgInner;

  const origPrimary = headMeta?.primarySkinFill;
  const origShadow = headMeta?.shadowSkinFill;

  // Use temporary placeholders so swapping two colors never collides
  if (origPrimary) {
    out = out.replace(new RegExp(`fill="${escapeRegExp(origPrimary)}"`, 'gi'), 'fill="__SKIN_PRIMARY__"');
  }
  if (origShadow && origShadow !== origPrimary) {
    out = out.replace(new RegExp(`fill="${escapeRegExp(origShadow)}"`, 'gi'), 'fill="__SKIN_SHADOW__"');
  }
  if (Array.isArray(headMeta?.fills)) {
    headMeta.fills.forEach((f, idx) => {
      if (idx === 0) {
        out = out.replace(new RegExp(`fill="${escapeRegExp(f)}"`, 'gi'), 'fill="__SKIN_PRIMARY__"');
      } else {
        out = out.replace(new RegExp(`fill="${escapeRegExp(f)}"`, 'gi'), 'fill="__SKIN_SHADOW__"');
      }
    });
  }

  // Base character and common skin fills
  out = out
    .replace(/fill="#F4E8D3"/gi, 'fill="__SKIN_PRIMARY__"')
    .replace(/fill="#FEDF9B"/gi, 'fill="__SKIN_PRIMARY__"')
    .replace(/fill="#F3E7D5"/gi, 'fill="__SKIN_PRIMARY__"')
    .replace(/fill="#F2E1CD"/gi, 'fill="__SKIN_PRIMARY__"')
    .replace(/fill="#DAC9B1"/gi, 'fill="__SKIN_SHADOW__"')
    .replace(/fill="#E2C6A5"/gi, 'fill="__SKIN_SHADOW__"')
    .replace(/fill="#CCA57F"/gi, 'fill="__SKIN_SHADOW__"');

  return out
    .replace(/fill="__SKIN_PRIMARY__"/g, `fill="${skinTone.primary}"`)
    .replace(/fill="__SKIN_SHADOW__"/g, `fill="${skinTone.shadow}"`);
}

export function recolorClothingSvg(svgInner, clothingMeta, clothingColor) {
  if (!svgInner || !clothingColor) return svgInner;
  let out = svgInner;

  const defPrimary = clothingMeta?.defaultColors?.primary;
  const defShadow = clothingMeta?.defaultColors?.shadow;
  if (defPrimary) {
    out = out.replace(new RegExp(`fill="${escapeRegExp(defPrimary)}"`, 'gi'), 'fill="__CLOTH_PRIMARY__"');
  }
  out = out
    .replace(/fill="#B1232D"/gi, 'fill="__CLOTH_PRIMARY__"')
    .replace(/fill="#C2283C"/gi, 'fill="__CLOTH_PRIMARY__"')
    .replace(/fill="#BF2646"/gi, 'fill="__CLOTH_PRIMARY__"')
    .replace(/fill="#C11F43"/gi, 'fill="__CLOTH_PRIMARY__"')
    .replace(/fill="#FB324C"/gi, 'fill="__CLOTH_PRIMARY__"')
    .replace(/fill="#DD253E"/gi, 'fill="__CLOTH_PRIMARY__"')
    .replace(/fill="#5F7088"/gi, 'fill="__CLOTH_PRIMARY__"')
    .replace(/fill="#7B7D9F"/gi, 'fill="__CLOTH_PRIMARY__"');

  if (defShadow) {
    out = out.replace(new RegExp(`fill="${escapeRegExp(defShadow)}"`, 'gi'), 'fill="__CLOTH_SHADOW__"');
  }
  out = out
    .replace(/fill="#8E1B26"/gi, 'fill="__CLOTH_SHADOW__"')
    .replace(/fill="#5F1626"/gi, 'fill="__CLOTH_SHADOW__"')
    .replace(/fill="__CLOTH_PRIMARY__"/g, `fill="${clothingColor.primary}"`)
    .replace(/fill="__CLOTH_SHADOW__"/g, `fill="${clothingColor.shadow}"`);

  return out;
}

export function recolorHairSvg(svgInner, hairColor) {
  if (!svgInner || !hairColor) return svgInner;
  return svgInner
    .replace(/fill="#5A5655"/gi, `fill="${hairColor.primary}"`)
    .replace(/fill="#938E8D"/gi, `fill="${hairColor.highlight}"`)
    .replace(/fill="#363536"/gi, `fill="${hairColor.primary}"`)
    .replace(/fill="#4A4A52"/gi, `fill="${hairColor.primary}"`)
    .replace(/fill="#616061"/gi, `fill="${hairColor.primary}"`)
    .replace(/fill="#696869"/gi, `fill="${hairColor.primary}"`)
    .replace(/fill="#838182"/gi, `fill="${hairColor.highlight}"`)
    .replace(/fill="#ADAAAD"/gi, `fill="${hairColor.highlight}"`);
}

export default function CogetherAvatarRenderer({
  config = {},
  size = 220,
  className = '',
  animated = true,
  showBackdrop = true,
  svgRef = null,
  ariaLabel = 'CoGether Custom Avatar'
}) {
  const { manifest } = useAvatarManifest();
  const [layers, setLayers] = useState({
    background: '',
    hairBack: '',
    baseBody: '',
    clothing: '',
    head: '',
    eyes: '',
    closedEyes: '',
    hair: '',
    eyewear: '',
    accessories: [],
    effects: []
  });
  const [isBlinking, setIsBlinking] = useState(false);

  const effectiveConfig = useMemo(() => {
    const defs = manifest?.defaults || {
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
    return {
      ...defs,
      ...(config || {})
    };
  }, [manifest, config]);

  // Lookup active item metadata
  const activeMeta = useMemo(() => {
    if (!manifest) return {};
    const heads = manifest.categories?.heads || [];
    const eyes = manifest.categories?.eyes || [];
    const hairs = manifest.categories?.hair || [];
    const clothes = manifest.categories?.clothing || [];
    const eywears = manifest.categories?.eyewear || [];
    const accessories = manifest.categories?.accessories || [];
    const effects = manifest.categories?.effects || [];
    const vectorBgs = manifest.categories?.backgrounds || [];

    const skinTones = manifest.palettes?.skinTones || [];
    const hairColors = manifest.palettes?.hairColors || [];
    const clothingColors = manifest.palettes?.clothingColors || [];
    const backdrops = manifest.palettes?.studioBackdrops || [];

    const headItem = heads.find((h) => h.id === effectiveConfig.headId) || heads[0];
    const eyeItem = eyes.find((e) => e.id === effectiveConfig.eyesId) || eyes[0];
    const closedEyeItem = eyes.find((e) => e.isClosedVariant) || null;
    const hairItem = hairs.find((h) => h.id === effectiveConfig.hairId) || hairs[0];
    const clothingItem = clothes.find((c) => c.id === effectiveConfig.clothingId) || clothes[0];
    const eyewearItem = eywears.find((ew) => ew.id === effectiveConfig.eyewearId) || null;
    const vectorBgItem = vectorBgs.find((b) => b.id === effectiveConfig.backgroundId) || null;

    const skinTone = skinTones.find((s) => s.id === effectiveConfig.skinToneId) || skinTones[0];
    const hairColor = hairColors.find((c) => c.id === effectiveConfig.hairColorId) || hairColors[0];
    const clothingColor = clothingColors.find((c) => c.id === effectiveConfig.clothingColorId) || clothingColors[0];
    const backdrop = backdrops.find((b) => b.id === effectiveConfig.backgroundId) || backdrops[0];

    const selectedAccessories = (effectiveConfig.accessoryIds || [])
      .map((id) => accessories.find((a) => a.id === id))
      .filter(Boolean);

    const selectedEffects = (effectiveConfig.effectsIds || [])
      .map((id) => effects.find((e) => e.id === id))
      .filter(Boolean);

    return {
      headItem,
      eyeItem,
      closedEyeItem,
      hairItem,
      clothingItem,
      eyewearItem,
      vectorBgItem,
      skinTone,
      hairColor,
      clothingColor,
      backdrop,
      selectedAccessories,
      selectedEffects
    };
  }, [manifest, effectiveConfig]);

  // Load SVG layer strings when selection changes
  useEffect(() => {
    let mounted = true;
    if (!manifest) return;

    async function fetchAllLayers() {
      const [bgRaw, hairBackRaw, bodyRaw, clothingRaw, headRaw, eyesRaw, closedEyesRaw, hairRaw, eyewearRaw, accRaws, effRaws] = await Promise.all([
        activeMeta.vectorBgItem ? loadSvgInnerContent(activeMeta.vectorBgItem.url) : Promise.resolve(''),
        activeMeta.hairItem?.backUrl ? loadSvgInnerContent(activeMeta.hairItem.backUrl) : Promise.resolve(''),
        loadSvgInnerContent(manifest.baseBody?.url || '/assets/avatars/cogether/base/base-body.svg'),
        loadSvgInnerContent(activeMeta.clothingItem?.url),
        loadSvgInnerContent(activeMeta.headItem?.url),
        loadSvgInnerContent(activeMeta.eyeItem?.url),
        activeMeta.closedEyeItem ? loadSvgInnerContent(activeMeta.closedEyeItem.url) : Promise.resolve(''),
        loadSvgInnerContent(activeMeta.hairItem?.url),
        activeMeta.eyewearItem ? loadSvgInnerContent(activeMeta.eyewearItem.url) : Promise.resolve(''),
        Promise.all((activeMeta.selectedAccessories || []).map((a) => loadSvgInnerContent(a.url))),
        Promise.all((activeMeta.selectedEffects || []).map((e) => loadSvgInnerContent(e.url)))
      ]);

      if (!mounted) return;
      setLayers({
        background: bgRaw,
        hairBack: hairBackRaw,
        baseBody: bodyRaw,
        clothing: clothingRaw,
        head: headRaw,
        eyes: eyesRaw,
        closedEyes: closedEyesRaw,
        hair: hairRaw,
        eyewear: eyewearRaw,
        accessories: accRaws,
        effects: effRaws
      });
    }

    fetchAllLayers();
    return () => {
      mounted = false;
    };
  }, [manifest, activeMeta]);

  // Periodic natural blink when open eyes are selected and animated is enabled
  useEffect(() => {
    if (!animated || !activeMeta.closedEyeItem || activeMeta.eyeItem?.isClosedVariant) {
      setIsBlinking(false);
      return;
    }

    let timeoutId;
    const intervalId = setInterval(() => {
      setIsBlinking(true);
      timeoutId = setTimeout(() => {
        setIsBlinking(false);
      }, 160);
    }, 4200);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [animated, activeMeta.closedEyeItem, activeMeta.eyeItem]);

  const coloredBody = useMemo(
    () => recolorBodySvg(layers.baseBody, activeMeta.skinTone),
    [layers.baseBody, activeMeta.skinTone]
  );

  const coloredClothing = useMemo(
    () => recolorClothingSvg(layers.clothing, activeMeta.clothingItem, activeMeta.clothingColor),
    [layers.clothing, activeMeta.clothingItem, activeMeta.clothingColor]
  );

  const coloredHead = useMemo(
    () => recolorHeadSvg(layers.head, activeMeta.headItem, activeMeta.skinTone),
    [layers.head, activeMeta.headItem, activeMeta.skinTone]
  );

  const coloredHair = useMemo(
    () => recolorHairSvg(layers.hair, activeMeta.hairColor),
    [layers.hair, activeMeta.hairColor]
  );

  const coloredHairBack = useMemo(
    () => recolorHairSvg(layers.hairBack, activeMeta.hairColor),
    [layers.hairBack, activeMeta.hairColor]
  );

  const activeEyesMarkup = isBlinking && layers.closedEyes ? layers.closedEyes : layers.eyes;

  const backdropStyle = showBackdrop && activeMeta.backdrop
    ? { background: activeMeta.backdrop.css }
    : { background: 'transparent' };

  return (
    <div
      className={`cogether-avatar-stage ${animated ? 'is-animated' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        ...backdropStyle
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        ref={svgRef}
        className="cogether-avatar-svg"
        viewBox="0 0 1024 1024"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="avatar-breathing-group">
          {/* Layer 1: Background */}
          {layers.background && (
            <g
              className="avatar-layer avatar-layer-background"
              dangerouslySetInnerHTML={{ __html: layers.background }}
            />
          )}

          {/* Layer 2: Back Hair */}
          {layers.hairBack && (
            <g
              className="avatar-layer avatar-layer-hair-back"
              dangerouslySetInnerHTML={{ __html: coloredHairBack }}
            />
          )}

          {/* Layer 3: Base body */}
          {layers.baseBody && (
            <g
              className="avatar-layer avatar-layer-body"
              dangerouslySetInnerHTML={{ __html: coloredBody }}
            />
          )}

          {/* Layer 4: Selected clothing */}
          <g
            className="avatar-layer avatar-layer-clothing"
            dangerouslySetInnerHTML={{ __html: coloredClothing }}
          />

          {/* Layer 5: Head and ears */}
          <g
            className="avatar-layer avatar-layer-head"
            dangerouslySetInnerHTML={{ __html: coloredHead }}
          />

          {/* Layer 6: Eyes, eyebrows and expression */}
          <g
            className="avatar-layer avatar-layer-eyes"
            dangerouslySetInnerHTML={{ __html: activeEyesMarkup }}
          />

          {/* Layer 7: Front / full hairstyle */}
          <g
            className="avatar-layer avatar-layer-hair avatar-layer-hair-front"
            dangerouslySetInnerHTML={{ __html: coloredHair }}
          />

          {/* Layer 8: Eyewear */}
          {layers.eyewear && (
            <g
              className="avatar-layer avatar-layer-eyewear"
              dangerouslySetInnerHTML={{ __html: layers.eyewear }}
            />
          )}

          {/* Layer 9: Hats, headphones and other accessories */}
          {layers.accessories.map((accHtml, idx) => (
            <g
              key={`acc-${idx}`}
              className="avatar-layer avatar-layer-accessory"
              dangerouslySetInnerHTML={{ __html: accHtml }}
            />
          ))}

          {/* Layer 10: Optional visual effects */}
          {layers.effects.map((effHtml, idx) => (
            <g
              key={`eff-${idx}`}
              className="avatar-layer avatar-layer-effect"
              dangerouslySetInnerHTML={{ __html: effHtml }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
