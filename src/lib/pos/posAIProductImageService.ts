/**
 * POS AI Product Image Generator Service
 * Generates realistic, beautiful vector illustrations based on product names and categories.
 * Covers vegetables, fruits, dairy, staples, snacks, beverages, household, industrial paints,
 * strapping rolls, polymers, and generic retail products.
 * 100% offline, zero latency, renders as standard data:image/svg+xml.
 */

export const posAIProductImageService = {
  isLegacyAIImage(url?: string): boolean {
    if (!url) return false;
    // Upgrade if legacy paint bucket OR older v1/v2 without prominent name badge
    return !url.includes('ai-product-v3');
  },

  generateImage(item: any): string {
    const rawName = String(item?.name || item?.itemName || '').trim();
    const name = rawName.toUpperCase();
    const idStr = String(item?.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '');
    const cleanTitle = rawName.slice(0, 18);
    const unitText = item?.unit || 'NOS';

    // Helper to wrap content inside standard 160x160 SVG frame with shadow filter
    const wrapSvg = (artContent: string, badgeBg = '#0f172a', badgeText = cleanTitle) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%">
  <!-- ai-product-v3 -->
  <defs>
    <filter id="f_${idStr}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3.5" flood-color="#0f172a" flood-opacity="0.25" />
    </filter>
    <linearGradient id="podGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#f1f5f9" stop-opacity="0.75" />
    </linearGradient>
  </defs>
  <!-- Background Soft Radial Pod -->
  <rect x="4" y="4" width="152" height="152" rx="14" fill="url(#podGrad_${idStr})" stroke="#cbd5e1" stroke-width="1.2" />
  <ellipse cx="80" cy="116" rx="44" ry="7" fill="#94a3b8" opacity="0.32" />
  
  <!-- Artwork -->
  <g filter="url(#f_${idStr})">
    ${artContent}
  </g>

  <!-- Bottom Floating High-Contrast Name Badge -->
  <rect x="10" y="126" width="140" height="26" rx="7" fill="${badgeBg}" opacity="0.95" stroke="#ffffff" stroke-width="1.2" />
  <text x="80" y="143" font-size="9.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" letter-spacing="0.3">
    ${badgeText.length > 18 ? badgeText.slice(0, 18) + '..' : badgeText}
  </text>
</svg>`;
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    };

    // ==================== 1. VEGETABLES ====================

    // TOMATO / TAMATAR
    if (name.includes('TOMATO') || name.includes('TAMATAR')) {
      const art = `
      <defs>
        <radialGradient id="tomGrad_${idStr}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#ff6b6b" />
          <stop offset="45%" stop-color="#ef4444" />
          <stop offset="85%" stop-color="#b91c1c" />
          <stop offset="100%" stop-color="#7f1d1d" />
        </radialGradient>
        <linearGradient id="calyxGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#86efac" />
          <stop offset="60%" stop-color="#16a34a" />
          <stop offset="100%" stop-color="#14532d" />
        </linearGradient>
      </defs>
      <!-- Plump Tomato Shape -->
      <path d="M 50 75 C 40 40, 80 40, 80 50 C 80 40, 120 40, 110 75 C 105 115, 55 115, 50 75 Z" fill="url(#tomGrad_${idStr})" />
      <circle cx="80" cy="80" r="38" fill="url(#tomGrad_${idStr})" />
      <!-- Calyx Leaf Star on Top -->
      <path d="M 80 48 L 72 38 L 78 46 L 68 47 L 76 52 L 72 58 L 80 53 L 88 58 L 84 52 L 92 47 L 82 46 L 88 38 Z" fill="url(#calyxGrad_${idStr})" />
      <!-- Curving Stem -->
      <path d="M 80 46 Q 84 32 94 30" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round" />
      <!-- Glossy Light Glare -->
      <ellipse cx="68" cy="68" rx="10" ry="6" transform="rotate(-30 68 68)" fill="#ffffff" opacity="0.55" />
      <circle cx="88" cy="88" r="3" fill="#ffffff" opacity="0.3" />`;
      return wrapSvg(art, '#b91c1c', '🍅 ' + cleanTitle);
    }

    // CARROT / GAJAR
    if (name.includes('CARROT') || name.includes('GAJAR')) {
      const art = `
      <defs>
        <linearGradient id="carrGrad_${idStr}" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stop-color="#fed7aa" />
          <stop offset="30%" stop-color="#fb923c" />
          <stop offset="70%" stop-color="#ea580c" />
          <stop offset="100%" stop-color="#9a3412" />
        </linearGradient>
      </defs>
      <!-- Green Bushy Foliage Top -->
      <path d="M 80 42 Q 72 20 62 18 M 80 42 Q 80 16 80 14 M 80 42 Q 88 20 98 18" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round" fill="none" />
      <path d="M 76 34 Q 65 24 58 28 M 84 34 Q 95 24 102 28" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <!-- Tapered Carrot Root -->
      <path d="M 64 44 Q 80 40 96 44 L 84 120 Q 80 124 76 120 Z" fill="url(#carrGrad_${idStr})" />
      <!-- Horizontal Grooves -->
      <path d="M 68 56 Q 80 58 90 55 M 71 72 Q 80 74 88 71 M 73 88 Q 80 90 86 87 M 76 104 Q 80 105 83 103" stroke="#c2410c" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.75" />
      <!-- Highlight -->
      <path d="M 70 48 L 76 112" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.4" />`;
      return wrapSvg(art, '#c2410c', '🥕 ' + cleanTitle);
    }

    // CHILLI / MIRCH / PEPPER
    if (name.includes('CHILLI') || name.includes('CHILI') || name.includes('MIRCH') || name.includes('PEPPER') || name.includes('JALAPENO')) {
      const isGreen = name.includes('GREEN') || name.includes('HARI');
      const baseCol1 = isGreen ? '#86efac' : '#fca5a5';
      const baseCol2 = isGreen ? '#22c55e' : '#ef4444';
      const baseCol3 = isGreen ? '#15803d' : '#b91c1c';
      const art = `
      <defs>
        <linearGradient id="chiliGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseCol1}" />
          <stop offset="40%" stop-color="${baseCol2}" />
          <stop offset="100%" stop-color="${baseCol3}" />
        </linearGradient>
      </defs>
      <!-- Cap & Stem -->
      <path d="M 88 34 Q 98 22 108 24" fill="none" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 76 38 C 76 34, 98 34, 98 38 L 94 45 L 80 45 Z" fill="#15803d" />
      <!-- Curved Chilli Body -->
      <path d="M 78 44 C 76 75, 52 95, 78 122 C 84 124, 88 120, 84 114 C 74 95, 96 75, 96 44 Z" fill="url(#chiliGrad_${idStr})" />
      <!-- Glossy Reflection Sheen -->
      <path d="M 82 48 C 82 70, 68 85, 78 112" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.55" />`;
      return wrapSvg(art, isGreen ? '#15803d' : '#b91c1c', '🌶️ ' + cleanTitle);
    }

    // POTATO / ALOO
    if (name.includes('POTATO') || name.includes('ALOO')) {
      const art = `
      <defs>
        <radialGradient id="potGrad_${idStr}" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="40%" stop-color="#d97706" />
          <stop offset="85%" stop-color="#b45309" />
          <stop offset="100%" stop-color="#78350f" />
        </radialGradient>
      </defs>
      <!-- Organic Potato Body -->
      <path d="M 46 76 C 40 50, 75 42, 106 46 C 126 50, 126 88, 114 104 C 98 120, 60 118, 46 100 C 40 92, 48 84, 46 76 Z" fill="url(#potGrad_${idStr})" />
      <!-- Dimple Eyes -->
      <circle cx="68" cy="62" r="2.2" fill="#78350f" opacity="0.65" />
      <path d="M 66 61 Q 70 63 74 61" stroke="#92400e" stroke-width="1.2" fill="none" />
      <circle cx="94" cy="74" r="2.5" fill="#78350f" opacity="0.65" />
      <circle cx="78" cy="94" r="2" fill="#78350f" opacity="0.65" />
      <ellipse cx="64" cy="54" rx="12" ry="5" transform="rotate(-15 64 54)" fill="#ffffff" opacity="0.35" />`;
      return wrapSvg(art, '#92400e', '🥔 ' + cleanTitle);
    }

    // ONION / PYAZ
    if (name.includes('ONION') || name.includes('PYAZ')) {
      const art = `
      <defs>
        <radialGradient id="onGrad_${idStr}" cx="40%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#f472b6" />
          <stop offset="45%" stop-color="#c026d3" />
          <stop offset="80%" stop-color="#86198f" />
          <stop offset="100%" stop-color="#4a044e" />
        </radialGradient>
      </defs>
      <!-- Root whiskers -->
      <path d="M 76 118 L 74 126 M 80 118 L 80 128 M 84 118 L 86 126" stroke="#ca8a04" stroke-width="1.5" stroke-linecap="round" />
      <!-- Bulb -->
      <path d="M 80 40 C 50 48, 40 85, 52 106 C 62 120, 98 120, 108 106 C 120 85, 110 48, 80 40 Z" fill="url(#onGrad_${idStr})" />
      <!-- Papery Layer Ribs -->
      <path d="M 80 40 Q 64 80 76 118" fill="none" stroke="#fbcfe8" stroke-width="1.4" opacity="0.6" />
      <path d="M 80 40 Q 96 80 84 118" fill="none" stroke="#fbcfe8" stroke-width="1.4" opacity="0.6" />
      <path d="M 80 40 L 80 118" fill="none" stroke="#f472b6" stroke-width="1.2" opacity="0.5" />
      <!-- Top sprout shoot -->
      <path d="M 80 40 Q 82 28 88 26" fill="none" stroke="#84cc16" stroke-width="2.5" stroke-linecap="round" />`;
      return wrapSvg(art, '#701a75', '🧅 ' + cleanTitle);
    }

    // LEMON / NIMBU / LIME
    if (name.includes('LEMON') || name.includes('NIMBU') || name.includes('LIME')) {
      const art = `
      <defs>
        <radialGradient id="lemGrad_${idStr}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="40%" stop-color="#facc15" />
          <stop offset="80%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#a16207" />
        </radialGradient>
      </defs>
      <!-- Green Leaf -->
      <path d="M 80 46 C 70 30, 95 24, 108 30 C 104 42, 88 44, 80 46 Z" fill="#22c55e" stroke="#15803d" stroke-width="1" />
      <!-- Oval Lemon with Nipples -->
      <path d="M 46 80 C 42 78, 40 82, 46 84 C 54 108, 106 108, 114 84 C 120 82, 118 78, 114 80 C 106 56, 54 56, 46 80 Z" fill="url(#lemGrad_${idStr})" />
      <ellipse cx="72" cy="70" rx="14" ry="6" transform="rotate(-15 72 70)" fill="#ffffff" opacity="0.45" />`;
      return wrapSvg(art, '#854d0e', '🍋 ' + cleanTitle);
    }

    // GINGER / ADRAK / GARLIC / LAHSUN
    if (name.includes('GINGER') || name.includes('ADRAK') || name.includes('GARLIC') || name.includes('LAHSUN') || name.includes('LAHSOON')) {
      const isGarlic = name.includes('GARLIC') || name.includes('LAHSUN');
      const art = isGarlic ? `
      <defs>
        <radialGradient id="garGrad_${idStr}" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="60%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </radialGradient>
      </defs>
      <!-- Garlic Bulb & Cloves -->
      <path d="M 80 42 C 54 50, 48 88, 56 108 C 66 120, 94 120, 104 108 C 112 88, 106 50, 80 42 Z" fill="url(#garGrad_${idStr})" stroke="#cbd5e1" stroke-width="1.2" />
      <path d="M 80 42 Q 68 80 72 116" fill="none" stroke="#94a3b8" stroke-width="1.4" />
      <path d="M 80 42 Q 92 80 88 116" fill="none" stroke="#94a3b8" stroke-width="1.4" />
      <path d="M 80 42 L 80 34" stroke="#a16207" stroke-width="2.5" stroke-linecap="round" />` : `
      <defs>
        <linearGradient id="ginGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fed7aa" />
          <stop offset="50%" stop-color="#d4a373" />
          <stop offset="100%" stop-color="#8c5836" />
        </linearGradient>
      </defs>
      <!-- Knobby Ginger Root -->
      <path d="M 52 86 C 45 66, 68 56, 74 68 C 80 50, 106 52, 102 74 C 116 70, 122 92, 108 102 C 98 114, 62 116, 52 86 Z" fill="url(#ginGrad_${idStr})" stroke="#78350f" stroke-width="1" />
      <circle cx="68" cy="64" r="8" fill="url(#ginGrad_${idStr})" />
      <circle cx="94" cy="68" r="9" fill="url(#ginGrad_${idStr})" />`;
      return wrapSvg(art, isGarlic ? '#475569' : '#78350f', (isGarlic ? '🧄 ' : '🥔 ') + cleanTitle);
    }

    // PEAS / MATAR / CORIANDER / DHANIYA / MINT / PUDINA / CABBAGE / GOBHI / CAPSICUM
    if (name.includes('PEAS') || name.includes('MATAR') || name.includes('CORIANDER') || name.includes('DHANIYA') || name.includes('MINT') || name.includes('GOBHI') || name.includes('CABBAGE') || name.includes('CAPSICUM')) {
      const art = `
      <defs>
        <linearGradient id="peaGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4ade80" />
          <stop offset="60%" stop-color="#16a34a" />
          <stop offset="100%" stop-color="#14532d" />
        </linearGradient>
      </defs>
      <!-- Open Pea Pod -->
      <path d="M 42 98 C 60 118, 110 114, 126 66 C 114 74, 64 78, 42 98 Z" fill="url(#peaGrad_${idStr})" />
      <!-- Round Plump Peas -->
      <circle cx="62" cy="94" r="7.5" fill="#86efac" stroke="#16a34a" stroke-width="1" />
      <circle cx="78" cy="90" r="7.5" fill="#86efac" stroke="#16a34a" stroke-width="1" />
      <circle cx="94" cy="84" r="7.5" fill="#86efac" stroke="#16a34a" stroke-width="1" />
      <circle cx="108" cy="76" r="6.5" fill="#86efac" stroke="#16a34a" stroke-width="1" />
      <!-- Leaf Vein Accents -->
      <path d="M 42 98 Q 32 102 28 106" stroke="#15803d" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
      return wrapSvg(art, '#15803d', '🥬 ' + cleanTitle);
    }

    // ==================== 2. FRUITS ====================

    // APPLE / SEB
    if (name.includes('APPLE') || name.includes('SEB')) {
      const art = `
      <defs>
        <radialGradient id="appGrad_${idStr}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#f87171" />
          <stop offset="45%" stop-color="#dc2626" />
          <stop offset="90%" stop-color="#991b1b" />
          <stop offset="100%" stop-color="#450a0a" />
        </radialGradient>
      </defs>
      <!-- Leaf & Stem -->
      <path d="M 80 48 Q 84 32 92 30" fill="none" stroke="#78350f" stroke-width="3" stroke-linecap="round" />
      <path d="M 84 38 C 96 32, 104 38, 102 44 C 94 48, 86 44, 84 38 Z" fill="#22c55e" />
      <!-- Heart-indented Apple -->
      <path d="M 80 52 C 64 38, 42 54, 46 84 C 50 114, 76 122, 80 120 C 84 122, 110 114, 114 84 C 118 54, 96 38, 80 52 Z" fill="url(#appGrad_${idStr})" />
      <ellipse cx="64" cy="68" rx="8" ry="14" transform="rotate(-25 64 68)" fill="#ffffff" opacity="0.4" />`;
      return wrapSvg(art, '#991b1b', '🍎 ' + cleanTitle);
    }

    // BANANA / KELA
    if (name.includes('BANANA') || name.includes('KELA')) {
      const art = `
      <defs>
        <linearGradient id="banGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
      </defs>
      <!-- Banana Cluster -->
      <path d="M 52 38 C 42 78, 62 116, 118 108 C 88 114, 58 84, 62 44 Z" fill="url(#banGrad_${idStr})" stroke="#a16207" stroke-width="1.2" />
      <path d="M 64 36 C 54 74, 76 112, 126 102 C 98 108, 70 80, 74 42 Z" fill="url(#banGrad_${idStr})" stroke="#a16207" stroke-width="1.2" />
      <!-- Crown Cap -->
      <rect x="54" y="32" width="12" height="8" rx="2" fill="#15803d" />
      <path d="M 126 102 L 130 104" stroke="#78350f" stroke-width="3" stroke-linecap="round" />`;
      return wrapSvg(art, '#854d0e', '🍌 ' + cleanTitle);
    }

    // MANGO / AAM / ORANGE / FRUITS
    if (name.includes('MANGO') || name.includes('AAM') || name.includes('ORANGE') || name.includes('SANTRA') || name.includes('GRAPES') || name.includes('ANAR')) {
      const art = `
      <defs>
        <radialGradient id="manGrad_${idStr}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="45%" stop-color="#f97316" />
          <stop offset="85%" stop-color="#ea580c" />
          <stop offset="100%" stop-color="#9a3412" />
        </radialGradient>
      </defs>
      <!-- Stem & Leaf -->
      <path d="M 80 44 Q 86 30 94 28" fill="none" stroke="#78350f" stroke-width="3" stroke-linecap="round" />
      <path d="M 84 36 C 98 30, 106 38, 102 44 C 94 48, 86 42, 84 36 Z" fill="#16a34a" />
      <!-- Mango Silhouette -->
      <path d="M 80 44 C 54 46, 42 78, 54 104 C 68 126, 108 124, 114 96 C 120 72, 102 44, 80 44 Z" fill="url(#manGrad_${idStr})" />
      <ellipse cx="66" cy="68" rx="8" ry="14" transform="rotate(-20 66 68)" fill="#ffffff" opacity="0.45" />`;
      return wrapSvg(art, '#c2410c', '🥭 ' + cleanTitle);
    }

    // ==================== 3. DAIRY & BAKERY ====================

    // MILK / DOODH / DAIRY
    if (name.includes('MILK') || name.includes('DOODH') || name.includes('DAIRY')) {
      const art = `
      <defs>
        <linearGradient id="milkGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#e2e8f0" />
          <stop offset="40%" stop-color="#ffffff" />
          <stop offset="80%" stop-color="#f1f5f9" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
      </defs>
      <!-- Milk Bottle / Pouch -->
      <path d="M 68 34 L 92 34 L 92 48 L 102 62 L 102 120 C 102 124, 58 124, 58 120 L 58 62 L 68 48 Z" fill="url(#milkGrad_${idStr})" stroke="#94a3b8" stroke-width="1.2" />
      <!-- Blue Cap -->
      <rect x="66" y="28" width="28" height="8" rx="2" fill="#0284c7" />
      <!-- Blue Dairy Brand Crest -->
      <circle cx="80" cy="85" r="16" fill="#0284c7" />
      <path d="M 80 75 Q 86 85 80 92 Q 74 85 80 75 Z" fill="#ffffff" />
      <text x="80" y="112" font-size="7" font-weight="900" fill="#0284c7" text-anchor="middle" font-family="sans-serif">PURE MILK</text>`;
      return wrapSvg(art, '#0284c7', '🥛 ' + cleanTitle);
    }

    // BUTTER / PANEER / CHEESE / BREAD / BAKERY
    if (name.includes('BUTTER') || name.includes('MAKHAN') || name.includes('CHEESE') || name.includes('PANEER') || name.includes('BREAD') || name.includes('PAV') || name.includes('ROTI') || name.includes('BAKERY')) {
      const art = `
      <defs>
        <linearGradient id="butGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="60%" stop-color="#facc15" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
      </defs>
      <!-- Butter / Cheese 3D Block -->
      <path d="M 44 74 L 88 56 L 124 74 L 80 94 Z" fill="#fde047" stroke="#eab308" stroke-width="1" />
      <path d="M 44 74 L 80 94 L 80 116 L 44 96 Z" fill="url(#butGrad_${idStr})" stroke="#ca8a04" stroke-width="1" />
      <path d="M 80 94 L 124 74 L 124 96 L 80 116 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1" />
      <ellipse cx="62" cy="85" rx="4" ry="2" fill="#ca8a04" opacity="0.4" />
      <ellipse cx="98" cy="88" rx="5" ry="3" fill="#a16207" opacity="0.4" />`;
      return wrapSvg(art, '#a16207', '🧈 ' + cleanTitle);
    }

    // ==================== 4. GRAINS, STAPLES & OIL ====================

    // RICE / CHAWAL / BASMATI
    if (name.includes('RICE') || name.includes('CHAWAL') || name.includes('BASMATI')) {
      const art = `
      <defs>
        <linearGradient id="sackGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="50%" stop-color="#d97706" />
          <stop offset="100%" stop-color="#92400e" />
        </linearGradient>
      </defs>
      <!-- Jute Grain Sack -->
      <path d="M 52 64 C 52 54, 108 54, 108 64 L 114 116 C 114 122, 46 122, 46 116 Z" fill="url(#sackGrad_${idStr})" stroke="#78350f" stroke-width="1.2" />
      <!-- Tied Sack Neck -->
      <ellipse cx="80" cy="62" rx="28" ry="8" fill="#ffffff" stroke="#b45309" stroke-width="1.2" />
      <path d="M 54 64 Q 80 72 106 64" fill="none" stroke="#78350f" stroke-width="2.5" />
      <!-- Golden Grain Sheaf Emblem -->
      <circle cx="80" cy="90" r="14" fill="#ffffff" opacity="0.9" />
      <text x="80" y="93.5" font-size="10" text-anchor="middle">🌾</text>
      <text x="80" y="102" font-size="6" font-weight="900" fill="#78350f" text-anchor="middle" font-family="sans-serif">RICE</text>`;
      return wrapSvg(art, '#92400e', '🌾 ' + cleanTitle);
    }

    // ATTA / FLOUR / MAIDA / BESAN / SUJI
    if (name.includes('ATTA') || name.includes('FLOUR') || name.includes('MAIDA') || name.includes('BESAN') || name.includes('SUJI')) {
      const art = `
      <defs>
        <linearGradient id="attaGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fed7aa" />
          <stop offset="60%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#c2410c" />
        </linearGradient>
      </defs>
      <!-- Flour Bag Pouch -->
      <path d="M 54 44 L 106 44 L 112 118 C 112 122, 48 122, 48 118 Z" fill="url(#attaGrad_${idStr})" stroke="#9a3412" stroke-width="1.2" />
      <rect x="50" y="38" width="60" height="8" rx="2" fill="#c2410c" />
      <circle cx="80" cy="80" r="16" fill="#ffffff" />
      <text x="80" y="84" font-size="12" text-anchor="middle">🌾</text>
      <text x="80" y="94" font-size="6.5" font-weight="900" fill="#9a3412" text-anchor="middle" font-family="sans-serif">WHEAT</text>`;
      return wrapSvg(art, '#9a3412', '🌾 ' + cleanTitle);
    }

    // COOKING OIL / GHEE / MUSTARD / TEL
    if (name.includes('OIL') || name.includes('GHEE') || name.includes('TEL') || name.includes('MUSTARD') || name.includes('REFINED')) {
      const art = `
      <defs>
        <linearGradient id="oilGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
      </defs>
      <!-- Oil Bottle Translucent Body -->
      <path d="M 68 36 L 92 36 L 92 48 L 104 64 L 104 120 C 104 124, 56 124, 56 120 L 56 64 L 68 48 Z" fill="url(#oilGrad_${idStr})" opacity="0.9" stroke="#a16207" stroke-width="1.2" />
      <!-- Golden Cap -->
      <rect x="66" y="28" width="28" height="9" rx="2" fill="#ca8a04" />
      <!-- Pure Golden Oil Drop Badge -->
      <circle cx="80" cy="88" r="15" fill="#ffffff" />
      <path d="M 80 78 Q 86 88 80 96 Q 74 88 80 78 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1" />
      <text x="80" y="112" font-size="6.5" font-weight="900" fill="#a16207" text-anchor="middle" font-family="sans-serif">100% PURE</text>`;
      return wrapSvg(art, '#a16207', '🛢️ ' + cleanTitle);
    }

    // TEA / CHAI / COFFEE / SUGAR / SALT / SPICES / MASALA
    if (name.includes('TEA') || name.includes('CHAI') || name.includes('COFFEE') || name.includes('SUGAR') || name.includes('SALT') || name.includes('MASALA') || name.includes('SPICE') || name.includes('HALDI')) {
      const art = `
      <defs>
        <linearGradient id="cupGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef3c7" />
          <stop offset="50%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#b45309" />
        </linearGradient>
      </defs>
      <!-- Steaming Hot Cup / Jar -->
      <ellipse cx="80" cy="116" rx="42" ry="6" fill="#cbd5e1" />
      <path d="M 52 64 L 108 64 L 100 110 C 100 116, 60 116, 60 110 Z" fill="url(#cupGrad_${idStr})" stroke="#92400e" stroke-width="1.2" />
      <!-- Handle -->
      <path d="M 104 72 C 120 72, 120 96, 102 98" fill="none" stroke="#b45309" stroke-width="4" stroke-linecap="round" />
      <!-- Aromatic Steam Swirls -->
      <path d="M 70 54 Q 66 42 74 34 M 80 52 Q 86 40 80 30 M 90 54 Q 96 42 88 34" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" />`;
      return wrapSvg(art, '#92400e', '☕ ' + cleanTitle);
    }

    // ==================== 5. SNACKS, DRINKS & FMCG ====================

    // BISCUIT / COOKIE / SNACKS / CHIPS / NAMKEEN / CHOCOLATE
    if (name.includes('BISCUIT') || name.includes('COOKIE') || name.includes('CHIPS') || name.includes('NAMKEEN') || name.includes('SNACK') || name.includes('CHOCOLATE')) {
      const art = `
      <defs>
        <radialGradient id="cookGrad_${idStr}" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="60%" stop-color="#d97706" />
          <stop offset="100%" stop-color="#92400e" />
        </radialGradient>
      </defs>
      <!-- Golden Baked Cookie with Scalloped Edge -->
      <circle cx="80" cy="80" r="36" fill="url(#cookGrad_${idStr})" stroke="#78350f" stroke-width="1.5" />
      <!-- Chocolate Chips -->
      <circle cx="66" cy="68" r="4.5" fill="#451a03" />
      <circle cx="94" cy="72" r="5" fill="#451a03" />
      <circle cx="74" cy="94" r="4" fill="#451a03" />
      <circle cx="90" cy="92" r="3.5" fill="#451a03" />
      <circle cx="80" cy="78" r="4" fill="#451a03" />`;
      return wrapSvg(art, '#78350f', '🍪 ' + cleanTitle);
    }

    // COLD DRINK / SODA / COLA / JUICE / WATER
    if (name.includes('COLD DRINK') || name.includes('SODA') || name.includes('COLA') || name.includes('PEPSI') || name.includes('COKE') || name.includes('WATER') || name.includes('JUICE') || name.includes('BEVERAGE')) {
      const art = `
      <defs>
        <linearGradient id="canGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444" />
          <stop offset="35%" stop-color="#f87171" />
          <stop offset="70%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#991b1b" />
        </linearGradient>
      </defs>
      <!-- Chilled Soda Can -->
      <rect x="58" y="44" width="44" height="74" rx="8" fill="url(#canGrad_${idStr})" stroke="#b91c1c" stroke-width="1.2" />
      <ellipse cx="80" cy="44" rx="22" ry="6" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <ellipse cx="80" cy="118" rx="22" ry="6" fill="#991b1b" />
      <!-- Dynamic Wave Stripe -->
      <path d="M 58 74 Q 80 88 102 74 L 102 86 Q 80 100 58 86 Z" fill="#ffffff" opacity="0.9" />
      <circle cx="80" cy="62" r="2.5" fill="#ffffff" opacity="0.7" />
      <circle cx="72" cy="70" r="2" fill="#ffffff" opacity="0.7" />
      <circle cx="88" cy="70" r="2" fill="#ffffff" opacity="0.7" />`;
      return wrapSvg(art, '#b91c1c', '🥤 ' + cleanTitle);
    }

    // ==================== 6. INDUSTRIAL, CHEMICAL & PACKAGING (USER INVENTORY) ====================

    // SIRCA / PU / SEALER / HARDENER / THINNER / PAINT / COATING
    if (name.includes('SIRCA') || name.includes('SEALER') || name.includes('HARDENER') || name.includes('THINNER') || name.includes('PAINT') || name.includes('PU ') || name.includes('COATING') || name.includes('1LT') || name.includes('4LT')) {
      let mainColor = '#0284c7';
      let secColor = '#0369a1';
      let accentCol = '#38bdf8';
      let tag = 'CAN';

      if (name.includes('HARDENER')) {
        mainColor = '#ea580c';
        secColor = '#9a3412';
        accentCol = '#fb923c';
        tag = 'HARDENER';
      } else if (name.includes('THINNER')) {
        mainColor = '#8b5cf6';
        secColor = '#6d28d9';
        accentCol = '#c4b5fd';
        tag = 'THINNER';
      } else if (name.includes('SEALER')) {
        mainColor = '#059669';
        secColor = '#065f46';
        accentCol = '#34d399';
        tag = 'SEALER';
      } else if (name.includes('WHITE') || name.includes('CLEAR')) {
        mainColor = '#475569';
        secColor = '#1e293b';
        accentCol = '#94a3b8';
      }

      const art = `
      <defs>
        <linearGradient id="canBody_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${secColor}" />
          <stop offset="35%" stop-color="${accentCol}" />
          <stop offset="70%" stop-color="${mainColor}" />
          <stop offset="100%" stop-color="${secColor}" />
        </linearGradient>
      </defs>
      <!-- Metal Paint Can Body -->
      <path d="M 46 48 L 48 120 C 48 126, 112 126, 112 120 L 114 48 Z" fill="url(#canBody_${idStr})" stroke="#334155" stroke-width="1.2" />
      <!-- Rim & Handle -->
      <ellipse cx="80" cy="48" rx="34" ry="7" fill="#cbd5e1" stroke="#64748b" stroke-width="1" />
      <path d="M 44 50 C 44 24, 116 24, 116 50" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
      <!-- Product Label Banner -->
      <rect x="52" y="68" width="56" height="38" rx="4" fill="#ffffff" opacity="0.95" />
      <rect x="54" y="70" width="52" height="34" rx="3" fill="none" stroke="${mainColor}" stroke-width="1" />
      <text x="80" y="82" font-size="7" font-weight="900" fill="${secColor}" text-anchor="middle" font-family="sans-serif">SIRCA PU</text>
      <rect x="60" y="86" width="40" height="12" rx="3" fill="${mainColor}" />
      <text x="80" y="94.5" font-size="6" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${tag}</text>`;
      return wrapSvg(art, secColor, '🎨 ' + cleanTitle);
    }

    // STRAPPING / TAPE / ROLL / PP STRAPING
    if (name.includes('STRAP') || name.includes('TAPE') || name.includes('ROLL')) {
      const art = `
      <defs>
        <radialGradient id="spoolGrad_${idStr}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#e0e7ff" />
          <stop offset="85%" stop-color="#4f46e5" />
          <stop offset="100%" stop-color="#312e81" />
        </radialGradient>
      </defs>
      <!-- Circular Strapping Coil Roll -->
      <circle cx="80" cy="80" r="38" fill="url(#spoolGrad_${idStr})" stroke="#1e1b4b" stroke-width="1.5" />
      <!-- Wound Band Layers -->
      <circle cx="80" cy="80" r="30" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-dasharray="6 3" />
      <circle cx="80" cy="80" r="22" fill="none" stroke="#a5b4fc" stroke-width="2" />
      <!-- Center Spool Core Hole -->
      <circle cx="80" cy="80" r="14" fill="#0f172a" stroke="#ffffff" stroke-width="2" />
      <text x="80" y="83" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">CORE</text>`;
      return wrapSvg(art, '#312e81', '📦 ' + cleanTitle);
    }

    // RAFFIA / PLASTIC / GRANULE / POWDER
    if (name.includes('RAFFIA') || name.includes('PLASTIC') || name.includes('POWDER') || name.includes('POLYMER')) {
      const art = `
      <defs>
        <linearGradient id="polyGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ecfdf5" />
          <stop offset="50%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
      </defs>
      <!-- Industrial Polymer Woven Bag -->
      <path d="M 52 46 L 108 46 L 114 118 C 114 122, 46 122, 46 118 Z" fill="url(#polyGrad_${idStr})" stroke="#065f46" stroke-width="1.2" />
      <!-- Diamond Quality Seal -->
      <polygon points="80,64 96,80 80,96 64,80" fill="#ffffff" opacity="0.95" />
      <text x="80" y="83" font-size="8" font-weight="900" fill="#047857" text-anchor="middle" font-family="sans-serif">PP</text>
      <text x="80" y="108" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">GRADE A</text>`;
      return wrapSvg(art, '#065f46', '🏭 ' + cleanTitle);
    }

    // ==================== 7. GENERAL / DEFAULT PRODUCT ====================
    const art = `
    <defs>
      <linearGradient id="genGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#075985" />
      </linearGradient>
    </defs>
    <!-- Modern 3D Retail Product Package Box -->
    <path d="M 48 58 L 80 40 L 112 58 L 80 76 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="1" />
    <path d="M 48 58 L 80 76 L 80 118 L 48 100 Z" fill="url(#genGrad_${idStr})" stroke="#0369a1" stroke-width="1" />
    <path d="M 80 76 L 112 58 L 112 100 L 80 118 Z" fill="#0369a1" stroke="#075985" stroke-width="1" />
    <!-- Barcode & Star Accent -->
    <rect x="85" y="86" width="22" height="12" rx="1.5" fill="#ffffff" />
    <path d="M 88 88 L 88 96 M 91 88 L 91 96 M 93 88 L 93 96 M 97 88 L 97 96 M 101 88 L 101 96 M 104 88 L 104 96" stroke="#0f172a" stroke-width="1" />
    <circle cx="64" cy="88" r="8" fill="#ffffff" opacity="0.9" />
    <text x="64" y="91" font-size="9" font-weight="900" fill="#0284c7" text-anchor="middle" font-family="sans-serif">★</text>`;
    return wrapSvg(art, '#0369a1', '✨ ' + cleanTitle);
  }
};

