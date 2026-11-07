/**
 * POS AI Product Image Generator Service (v5 Ultra-Realistic & Name-Specific)
 * Generates realistic, vibrant, colorful vector illustrations based on product names and categories.
 * Covers all grocery, FMCG, produce, packaged food, confectionery, personal care,
 * industrial chemicals, strapping rolls, and custom retail items.
 * 100% offline, zero latency, renders as standard data:image/svg+xml.
 */

export const posAIProductImageService = {
  isLegacyAIImage(url?: string): boolean {
    if (!url) return false;
    // Upgrade if legacy paint bucket or older v1/v2/v3/v4 without v5 realistic palette
    return !url.includes('ai-product-v5');
  },

  generateImage(item: any): string {
    const rawName = String(item?.name || item?.itemName || '').trim();
    const name = rawName.toUpperCase();
    const idStr = String(item?.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '');
    const cleanTitle = rawName.slice(0, 18);

    // Standard wrapper: 160x160 SVG with soft backdrop, drop shadow and vibrant floating name pill
    const wrapSvg = (artContent: string, badgeBg = '#0f172a', badgeText = cleanTitle, bgTint = '#f8fafc') => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%">
  <!-- ai-product-v5 -->
  <defs>
    <filter id="f_${idStr}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.8" flood-color="#0f172a" flood-opacity="0.28" />
    </filter>
    <linearGradient id="podGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98" />
      <stop offset="60%" stop-color="${bgTint}" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#e2e8f0" stop-opacity="0.7" />
    </linearGradient>
  </defs>
  <!-- Background Soft Radial Pod -->
  <rect x="4" y="4" width="152" height="152" rx="16" fill="url(#podGrad_${idStr})" stroke="#cbd5e1" stroke-width="1.2" />
  <ellipse cx="80" cy="118" rx="46" ry="7.5" fill="#64748b" opacity="0.3" />
  
  <!-- Artwork -->
  <g filter="url(#f_${idStr})">
    ${artContent}
  </g>

  <!-- Bottom Floating High-Contrast Name Badge -->
  <rect x="8" y="126" width="144" height="26" rx="7" fill="${badgeBg}" opacity="0.96" stroke="#ffffff" stroke-width="1.2" />
  <text x="80" y="143" font-size="9.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" letter-spacing="0.3">
    ${badgeText.length > 18 ? badgeText.slice(0, 18) + '..' : badgeText}
  </text>
</svg>`;
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    };

    // ==================== 1. CHOCOLATES & CONFECTIONERY (Match BEFORE Milk!) ====================
    if (name.includes('CHOCOLATE') || name.includes('CADBURY') || name.includes('SILK') || name.includes('KITKAT') || name.includes('CANDY') || name.includes('TOFFEE')) {
      const art = `
      <defs>
        <linearGradient id="chocWrap_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#9333ea" />
          <stop offset="50%" stop-color="#6b21a8" />
          <stop offset="100%" stop-color="#3b0764" />
        </linearGradient>
        <linearGradient id="chocBar_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#451a03" />
          <stop offset="50%" stop-color="#78350f" />
          <stop offset="100%" stop-color="#451a03" />
        </linearGradient>
      </defs>
      <!-- Chocolate Bar exposed top -->
      <rect x="54" y="32" width="52" height="36" rx="4" fill="url(#chocBar_${idStr})" stroke="#291002" stroke-width="1" />
      <rect x="58" y="36" width="20" height="13" rx="2" fill="#5c2406" stroke="#291002" stroke-width="0.8" />
      <rect x="82" y="36" width="20" height="13" rx="2" fill="#5c2406" stroke="#291002" stroke-width="0.8" />
      <!-- Silver Foil Edge -->
      <polygon points="52,62 108,62 104,70 56,70" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <!-- Purple Cadbury Foil Wrapper -->
      <rect x="50" y="66" width="60" height="52" rx="4" fill="url(#chocWrap_${idStr})" stroke="#3b0764" stroke-width="1.2" />
      <ellipse cx="80" cy="90" rx="20" ry="10" fill="#eab308" opacity="0.9" />
      <text x="80" y="93" font-size="7.5" font-weight="900" fill="#3b0764" text-anchor="middle" font-family="sans-serif">SILK</text>`;
      return wrapSvg(art, '#581c87', '🍫 ' + cleanTitle, '#f3e8ff');
    }

    // ==================== 2. NOODLES & PASTA ====================
    if (name.includes('MAGGI') || name.includes('NOODLE') || name.includes('PASTA') || name.includes('CHOWMEIN') || name.includes('MACARONI') || name.includes('YIPPEE')) {
      const art = `
      <defs>
        <linearGradient id="noodBowl_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444" />
          <stop offset="60%" stop-color="#b91c1c" />
          <stop offset="100%" stop-color="#7f1d1d" />
        </linearGradient>
      </defs>
      <!-- Steaming Noodle Bowl -->
      <path d="M 44 68 C 44 110, 116 110, 116 68 Z" fill="url(#noodBowl_${idStr})" stroke="#991b1b" stroke-width="1.5" />
      <!-- Yellow Wavy Noodles -->
      <ellipse cx="80" cy="68" rx="36" ry="10" fill="#fde047" stroke="#ca8a04" stroke-width="1.5" />
      <path d="M 52 66 Q 60 56 68 64 Q 76 54 84 64 Q 92 56 100 64" fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round" />
      <path d="M 56 60 Q 64 50 72 58 Q 80 48 88 58 Q 96 50 104 58" fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" />
      <!-- Peas & Veggies -->
      <circle cx="68" cy="64" r="3" fill="#16a34a" />
      <circle cx="88" cy="62" r="3" fill="#16a34a" />
      <circle cx="78" cy="60" r="2.5" fill="#dc2626" />
      <!-- Chopsticks -->
      <line x1="90" y1="36" x2="124" y2="24" stroke="#78350f" stroke-width="2.8" stroke-linecap="round" />
      <line x1="86" y1="42" x2="120" y2="30" stroke="#78350f" stroke-width="2.8" stroke-linecap="round" />`;
      return wrapSvg(art, '#b91c1c', '🍜 ' + cleanTitle, '#fef08a');
    }

    // ==================== 3. SNACKS, NAMKEEN & CHIPS ====================
    if (name.includes('HALDIRAM') || name.includes('MIXTURE') || name.includes('BHUJIA') || name.includes('NAMKEEN') || name.includes('SEV') || name.includes('CHIPS') || name.includes('LAYS') || name.includes('KURKURE') || name.includes('WAFERS') || name.includes('SNACK')) {
      const art = `
      <defs>
        <linearGradient id="pouchGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="40%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#dc2626" />
        </linearGradient>
      </defs>
      <!-- Snack Pouch Bag -->
      <path d="M 54 36 L 106 36 L 114 116 C 114 120, 46 120, 46 116 Z" fill="url(#pouchGrad_${idStr})" stroke="#b45309" stroke-width="1.2" />
      <rect x="52" y="32" width="56" height="6" rx="2" fill="#c2410c" />
      <!-- Golden Crispy Snack Burst Circle -->
      <circle cx="80" cy="74" r="20" fill="#ffffff" stroke="#f59e0b" stroke-width="1.5" />
      <text x="80" y="80" font-size="16" text-anchor="middle">🍿</text>
      <rect x="58" y="96" width="44" height="12" rx="3" fill="#78350f" />
      <text x="80" y="105" font-size="6.5" font-weight="900" fill="#fef08a" text-anchor="middle" font-family="sans-serif">CRISPY</text>`;
      return wrapSvg(art, '#c2410c', '🍿 ' + cleanTitle, '#fff7ed');
    }

    // ==================== 4. PERSONAL CARE: SOAPS ====================
    if (name.includes('SOAP') || name.includes('SABUN') || name.includes('DETTOL') || name.includes('LIFEBUOY') || name.includes('LUX') || name.includes('DOVE') || name.includes('PEARS') || name.includes('BATH')) {
      const art = `
      <defs>
        <linearGradient id="soapGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a7f3d0" />
          <stop offset="40%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
      </defs>
      <!-- Ergonomic Curved Soap Bar -->
      <path d="M 50 68 C 44 48, 116 48, 110 68 L 112 94 C 116 114, 44 114, 48 94 Z" fill="url(#soapGrad_${idStr})" stroke="#065f46" stroke-width="1.2" />
      <!-- Embossed Brand Crest -->
      <ellipse cx="80" cy="78" rx="22" ry="10" fill="none" stroke="#ecfdf5" stroke-width="1.5" />
      <text x="80" y="81.5" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">SOAP</text>
      <!-- Translucent Lather Bubbles -->
      <circle cx="108" cy="50" r="7" fill="#ffffff" opacity="0.65" stroke="#99f6e4" stroke-width="1" />
      <circle cx="118" cy="42" r="4.5" fill="#ffffff" opacity="0.65" stroke="#99f6e4" stroke-width="1" />
      <circle cx="48" cy="56" r="6" fill="#ffffff" opacity="0.6" stroke="#99f6e4" stroke-width="1" />`;
      return wrapSvg(art, '#047857', '🧼 ' + cleanTitle, '#ecfdf5');
    }

    // ==================== 5. PERSONAL CARE: TOOTHPASTE ====================
    if (name.includes('TOOTHPASTE') || name.includes('COLGATE') || name.includes('PEPSODENT') || name.includes('CLOSEUP') || name.includes('BRUSH') || name.includes('DANT')) {
      const art = `
      <defs>
        <linearGradient id="pasteGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#dc2626" />
          <stop offset="50%" stop-color="#ef4444" />
          <stop offset="100%" stop-color="#b91c1c" />
        </linearGradient>
      </defs>
      <!-- Tube Body -->
      <path d="M 44 40 L 116 40 L 104 116 C 104 120, 56 120, 56 116 Z" fill="url(#pasteGrad_${idStr})" stroke="#991b1b" stroke-width="1.2" />
      <!-- White & Blue Cap -->
      <rect x="66" y="28" width="28" height="12" rx="3" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />
      <rect x="72" y="32" width="16" height="4" fill="#0284c7" />
      <!-- Dynamic Swirled Toothpaste Stripe -->
      <path d="M 52 64 Q 80 84 108 64 Q 80 94 52 74 Z" fill="#ffffff" opacity="0.95" />
      <path d="M 56 70 Q 80 88 104 70" fill="none" stroke="#38bdf8" stroke-width="3" />
      <text x="80" y="104" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">MAX FRESH</text>`;
      return wrapSvg(art, '#b91c1c', '🪥 ' + cleanTitle, '#fee2e2');
    }

    // ==================== 6. BEVERAGES & COLD DRINKS (Match BEFORE Detergent!) ====================
    if (name.includes('COCA') || name.includes('COLA') || name.includes('PEPSI') || name.includes('SPRITE') || name.includes('THUMS') || name.includes('FANTA') || name.includes('LIMCA') || name.includes('JUICE') || name.includes('COLD DRINK') || name.includes('SOFT DRINK') || name.includes('SODA') || name.includes('WATER') || name.includes('BEVERAGE')) {
      const art = `
      <defs>
        <linearGradient id="canGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444" />
          <stop offset="35%" stop-color="#f87171" />
          <stop offset="70%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#991b1b" />
        </linearGradient>
      </defs>
      <!-- Soda Can -->
      <rect x="58" y="44" width="44" height="74" rx="8" fill="url(#canGrad_${idStr})" stroke="#b91c1c" stroke-width="1.2" />
      <ellipse cx="80" cy="44" rx="22" ry="6" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <ellipse cx="80" cy="118" rx="22" ry="6" fill="#991b1b" />
      <path d="M 58 74 Q 80 88 102 74 L 102 86 Q 80 100 58 86 Z" fill="#ffffff" opacity="0.9" />
      <circle cx="80" cy="62" r="2.5" fill="#ffffff" opacity="0.7" />`;
      return wrapSvg(art, '#b91c1c', '🥤 ' + cleanTitle, '#fee2e2');
    }

    // ==================== 7. LAUNDRY & CLEANING DETERGENT ====================
    if (name.includes('SURF') || name.includes('DETERGENT') || name.includes('TIDE') || name.includes('ARIEL') || name.includes('WASHING') || name.includes(' RIN') || name.includes('RIN ') || name.includes('WHEEL') || name.includes('CLEAN')) {
      const art = `
      <defs>
        <linearGradient id="surfGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="50%" stop-color="#2563eb" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
      <!-- Detergent Pouch Box -->
      <path d="M 50 40 L 110 40 L 114 118 C 114 122, 46 122, 46 118 Z" fill="url(#surfGrad_${idStr})" stroke="#1e40af" stroke-width="1.2" />
      <!-- Multi-Color Sparkle Wave -->
      <path d="M 48 70 Q 80 90 112 66 L 114 84 Q 80 108 46 88 Z" fill="#f59e0b" />
      <path d="M 48 76 Q 80 96 112 72 L 114 88 Q 80 112 46 92 Z" fill="#ef4444" />
      <!-- Washing Powder Sparkles -->
      <polygon points="80,52 83,58 89,59 84,63 86,69 80,66 74,69 76,63 71,59 77,58" fill="#ffffff" />
      <circle cx="62" cy="54" r="2.5" fill="#ffffff" opacity="0.85" />
      <circle cx="98" cy="56" r="3" fill="#ffffff" opacity="0.85" />
      <text x="80" y="112" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">DETERGENT</text>`;
      return wrapSvg(art, '#1d4ed8', '🫧 ' + cleanTitle, '#eff6ff');
    }

    // ==================== 7. SALT & SEASONINGS ====================
    if (name.includes('SALT') || name.includes('NAMAK') || name.includes('SENDHA')) {
      const art = `
      <defs>
        <linearGradient id="saltGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="50%" stop-color="#0369a1" />
          <stop offset="100%" stop-color="#0c4a6e" />
        </linearGradient>
      </defs>
      <!-- Blue Salt Dispenser / Pouch -->
      <path d="M 52 46 L 108 46 L 114 116 C 114 120, 46 120, 46 116 Z" fill="url(#saltGrad_${idStr})" stroke="#075985" stroke-width="1.2" />
      <!-- Salt Crystals Mound -->
      <ellipse cx="80" cy="80" rx="20" ry="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />
      <polygon points="80,62 94,80 66,80" fill="#ffffff" />
      <circle cx="76" cy="74" r="1.5" fill="#0284c7" />
      <circle cx="84" cy="74" r="1.5" fill="#0284c7" />
      <text x="80" y="104" font-size="7.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">100% PURE SALT</text>`;
      return wrapSvg(art, '#0369a1', '🧂 ' + cleanTitle, '#f0f9ff');
    }

    // ==================== 8. BISCUITS & COOKIES ====================
    if (name.includes('BISCUIT') || name.includes('PARLE') || name.includes('COOKIE') || name.includes('GOOD DAY') || name.includes('OREO') || name.includes('MARIE') || name.includes('CRACKER') || name.includes('RUSK')) {
      const art = `
      <defs>
        <radialGradient id="cookGrad_${idStr}" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="40%" stop-color="#f59e0b" />
          <stop offset="85%" stop-color="#d97706" />
          <stop offset="100%" stop-color="#92400e" />
        </radialGradient>
      </defs>
      <!-- Golden Fluted Biscuit -->
      <rect x="44" y="44" width="72" height="72" rx="14" fill="url(#cookGrad_${idStr})" stroke="#78350f" stroke-width="1.8" />
      <rect x="52" y="52" width="56" height="56" rx="10" fill="none" stroke="#b45309" stroke-width="1.2" stroke-dasharray="4 3" />
      <!-- Dot Matrix Texture -->
      <circle cx="62" cy="62" r="2.5" fill="#78350f" />
      <circle cx="80" cy="62" r="2.5" fill="#78350f" />
      <circle cx="98" cy="62" r="2.5" fill="#78350f" />
      <circle cx="62" cy="80" r="2.5" fill="#78350f" />
      <circle cx="80" cy="80" r="3.2" fill="#78350f" />
      <circle cx="98" cy="80" r="2.5" fill="#78350f" />
      <circle cx="62" cy="98" r="2.5" fill="#78350f" />
      <circle cx="80" cy="98" r="2.5" fill="#78350f" />
      <circle cx="98" cy="98" r="2.5" fill="#78350f" />`;
      return wrapSvg(art, '#78350f', '🍪 ' + cleanTitle, '#fefce8');
    }

    // ==================== 9. BREAD & BAKERY ====================
    if (name.includes('BREAD') || name.includes('PAV') || name.includes('ROTI') || name.includes('BUN') || name.includes('TOAST') || name.includes('CAKE') || name.includes('BAKERY')) {
      const art = `
      <defs>
        <linearGradient id="breadGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="40%" stop-color="#f59e0b" />
          <stop offset="80%" stop-color="#b45309" />
          <stop offset="100%" stop-color="#78350f" />
        </linearGradient>
      </defs>
      <!-- Baked Loaf with Crust Cuts -->
      <path d="M 44 80 C 44 48, 116 48, 116 80 L 112 114 C 112 118, 48 118, 48 114 Z" fill="url(#breadGrad_${idStr})" stroke="#78350f" stroke-width="1.5" />
      <path d="M 58 64 Q 68 56 74 68" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M 76 60 Q 86 52 92 64" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M 94 62 Q 102 56 106 68" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none" />`;
      return wrapSvg(art, '#78350f', '🍞 ' + cleanTitle, '#fffbeb');
    }

    // ==================== 10. MILK & DAIRY ====================
    if (name.includes('MILK') || name.includes('DOODH') || name.includes('TAAZA') || name.includes('TONED') || name.includes('AMUL') || name.includes('DAIRY')) {
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
      <path d="M 68 34 L 92 34 L 92 48 L 104 62 L 104 120 C 104 124, 56 124, 56 120 L 56 62 L 68 48 Z" fill="url(#milkGrad_${idStr})" stroke="#94a3b8" stroke-width="1.2" />
      <!-- Blue Cap -->
      <rect x="66" y="28" width="28" height="8" rx="2" fill="#0284c7" />
      <!-- Blue Dairy Brand Crest -->
      <circle cx="80" cy="85" r="16" fill="#0284c7" />
      <path d="M 80 75 Q 86 85 80 92 Q 74 85 80 75 Z" fill="#ffffff" />
      <text x="80" y="112" font-size="7" font-weight="900" fill="#0284c7" text-anchor="middle" font-family="sans-serif">PURE MILK</text>`;
      return wrapSvg(art, '#0284c7', '🥛 ' + cleanTitle, '#f0f9ff');
    }

    // ==================== 11. COOKING OIL & GHEE ====================
    if (name.includes('OIL') || name.includes('GHEE') || name.includes('SUNLITE') || name.includes('FORTUNE') || name.includes('REFINED') || name.includes('MUSTARD') || name.includes('SOYA') || name.includes('TEL')) {
      const art = `
      <defs>
        <linearGradient id="oilGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
      </defs>
      <!-- Translucent Amber Bottle -->
      <path d="M 68 36 L 92 36 L 92 48 L 104 64 L 104 120 C 104 124, 56 124, 56 120 L 56 64 L 68 48 Z" fill="url(#oilGrad_${idStr})" opacity="0.95" stroke="#a16207" stroke-width="1.2" />
      <rect x="66" y="28" width="28" height="9" rx="2" fill="#ca8a04" />
      <circle cx="80" cy="88" r="15" fill="#ffffff" />
      <path d="M 80 78 Q 86 88 80 96 Q 74 88 80 78 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1" />
      <text x="80" y="112" font-size="6.5" font-weight="900" fill="#a16207" text-anchor="middle" font-family="sans-serif">REFINED OIL</text>`;
      return wrapSvg(art, '#a16207', '🛢️ ' + cleanTitle, '#fefce8');
    }

    // ==================== 12. ATTA, FLOUR & GRAINS ====================
    if (name.includes('ATTA') || name.includes('AASHIRVAAD') || name.includes('WHEAT') || name.includes('FLOUR') || name.includes('MAIDA') || name.includes('BESAN') || name.includes('SUJI')) {
      const art = `
      <defs>
        <linearGradient id="attaGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fed7aa" />
          <stop offset="60%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#c2410c" />
        </linearGradient>
      </defs>
      <!-- Kraft Paper Sack -->
      <path d="M 52 44 L 108 44 L 114 118 C 114 122, 46 122, 46 118 Z" fill="url(#attaGrad_${idStr})" stroke="#9a3412" stroke-width="1.2" />
      <rect x="48" y="38" width="64" height="8" rx="2" fill="#c2410c" />
      <circle cx="80" cy="80" r="16" fill="#ffffff" />
      <text x="80" y="84" font-size="12" text-anchor="middle">🌾</text>
      <text x="80" y="94" font-size="6.5" font-weight="900" fill="#9a3412" text-anchor="middle" font-family="sans-serif">SHUDH ATTA</text>`;
      return wrapSvg(art, '#9a3412', '🌾 ' + cleanTitle, '#fff7ed');
    }

    // ==================== 13. COFFEE & TEA ====================
    if (name.includes('COFFEE') || name.includes('NESCAFE') || name.includes('BRU') || name.includes('TEA') || name.includes('CHAI') || name.includes('TAJ MAHAL') || name.includes('RED LABEL')) {
      const art = `
      <defs>
        <linearGradient id="cofGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#78350f" />
          <stop offset="50%" stop-color="#451a03" />
          <stop offset="100%" stop-color="#291002" />
        </linearGradient>
      </defs>
      <!-- Glass Coffee Jar with Red Cap -->
      <rect x="54" y="44" width="52" height="74" rx="8" fill="url(#cofGrad_${idStr})" stroke="#451a03" stroke-width="1.2" />
      <rect x="58" y="36" width="44" height="10" rx="3" fill="#dc2626" />
      <!-- Label Banner -->
      <rect x="58" y="68" width="44" height="30" rx="3" fill="#fbbf24" />
      <text x="80" y="82" font-size="8" font-weight="900" fill="#78350f" text-anchor="middle" font-family="sans-serif">COFFEE</text>
      <ellipse cx="80" cy="92" rx="4" ry="2.5" fill="#451a03" />`;
      return wrapSvg(art, '#451a03', '☕ ' + cleanTitle, '#fffbeb');
    }


    // ==================== 15. VEGETABLES & FRESH PRODUCE ====================
    // Tomato (Handles all variations including Tammato, Tamato, Tamatar)
    if (
      name.includes('TOMATO') ||
      name.includes('TAMMATO') ||
      name.includes('TAMATO') ||
      name.includes('TOMATTO') ||
      name.includes('TAMATAR') ||
      name.includes('TAMAT')
    ) {
      const art = `
      <defs>
        <radialGradient id="tomGrad_${idStr}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#ff6b6b" />
          <stop offset="35%" stop-color="#ef4444" />
          <stop offset="75%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#991b1b" />
        </radialGradient>
        <linearGradient id="calyxGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4ade80" />
          <stop offset="50%" stop-color="#16a34a" />
          <stop offset="100%" stop-color="#14532d" />
        </linearGradient>
      </defs>
      <!-- Juicy Plump Red Tomato -->
      <circle cx="80" cy="82" r="38" fill="url(#tomGrad_${idStr})" stroke="#7f1d1d" stroke-width="1.2" />
      <!-- Specular Gloss Highlights -->
      <ellipse cx="66" cy="66" rx="14" ry="8" transform="rotate(-35 66 66)" fill="#ffffff" opacity="0.65" />
      <ellipse cx="62" cy="64" rx="6" ry="3" transform="rotate(-35 62 64)" fill="#ffffff" opacity="0.9" />
      <!-- Star-shaped Green Calyx Sepals -->
      <path d="M 80 48 L 70 36 L 77 46 L 64 47 L 74 53 L 68 62 L 78 55 L 82 55 L 92 62 L 86 53 L 96 47 L 83 46 L 90 36 Z" fill="url(#calyxGrad_${idStr})" stroke="#14532d" stroke-width="0.8" />
      <!-- Curved Green Vine Stem -->
      <path d="M 80 46 Q 84 28 98 26" fill="none" stroke="#16a34a" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 80 46 Q 84 28 98 26" fill="none" stroke="#14532d" stroke-width="1.5" stroke-linecap="round" />`;
      return wrapSvg(art, '#b91c1c', '🍅 ' + cleanTitle, '#fef2f2');
    }

    // Potato / Aloo
    if (name.includes('POTATO') || name.includes('ALOO') || name.includes('AALOO')) {
      const art = `
      <defs>
        <radialGradient id="potGrad_${idStr}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="40%" stop-color="#eab308" />
          <stop offset="80%" stop-color="#ca8a04" />
          <stop offset="100%" stop-color="#854d0e" />
        </radialGradient>
      </defs>
      <path d="M 52 80 C 46 56, 70 44, 98 48 C 118 52, 122 84, 108 108 C 92 124, 58 116, 52 80 Z" fill="url(#potGrad_${idStr})" stroke="#713f12" stroke-width="1.2" />
      <ellipse cx="72" cy="62" rx="4" ry="2" fill="#713f12" opacity="0.4" />
      <ellipse cx="94" cy="74" rx="3" ry="1.5" fill="#713f12" opacity="0.4" />
      <ellipse cx="78" cy="96" rx="4" ry="2" fill="#713f12" opacity="0.4" />
      <ellipse cx="64" cy="84" rx="2" ry="1" fill="#713f12" opacity="0.3" />`;
      return wrapSvg(art, '#854d0e', '🥔 ' + cleanTitle, '#fefce8');
    }

    // Onion / Pyaz
    if (name.includes('ONION') || name.includes('PYAZ') || name.includes('PIYAZ')) {
      const art = `
      <defs>
        <radialGradient id="onGrad_${idStr}" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#f472b6" />
          <stop offset="40%" stop-color="#db2777" />
          <stop offset="80%" stop-color="#9d174d" />
          <stop offset="100%" stop-color="#700732" />
        </radialGradient>
      </defs>
      <path d="M 80 46 Q 80 20 76 16 M 80 46 Q 86 24 92 18" stroke="#16a34a" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M 80 44 C 114 44, 120 102, 80 114 C 40 102, 46 44, 80 44 Z" fill="url(#onGrad_${idStr})" stroke="#500724" stroke-width="1.2" />
      <path d="M 76 114 L 72 122 M 80 114 L 80 125 M 84 114 L 88 122" stroke="#ca8a04" stroke-width="2" stroke-linecap="round" />`;
      return wrapSvg(art, '#9d174d', '🧅 ' + cleanTitle, '#fdf2f8');
    }

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
      <path d="M 80 42 Q 72 20 62 18 M 80 42 Q 80 16 80 14 M 80 42 Q 88 20 98 18" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round" fill="none" />
      <path d="M 64 44 Q 80 40 96 44 L 84 120 Q 80 124 76 120 Z" fill="url(#carrGrad_${idStr})" />
      <path d="M 68 56 Q 80 58 90 55 M 71 72 Q 80 74 88 71" stroke="#c2410c" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.75" />`;
      return wrapSvg(art, '#c2410c', '🥕 ' + cleanTitle, '#fff7ed');
    }

    if (name.includes('CHILLI') || name.includes('CHILI') || name.includes('MIRCH') || name.includes('PEPPER')) {
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
      <path d="M 88 34 Q 98 22 108 24" fill="none" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 78 44 C 76 75, 52 95, 78 122 C 84 124, 88 120, 84 114 C 74 95, 96 75, 96 44 Z" fill="url(#chiliGrad_${idStr})" />
      <path d="M 82 48 C 82 70, 68 85, 78 112" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.55" />`;
      return wrapSvg(art, isGreen ? '#15803d' : '#b91c1c', '🌶️ ' + cleanTitle, isGreen ? '#f0fdf4' : '#fef2f2');
    }

    if (name.includes('LEMON') || name.includes('NIMBU') || name.includes('NEEMBU')) {
      const art = `
      <defs>
        <radialGradient id="lemGrad_${idStr}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#fef9c3" />
          <stop offset="40%" stop-color="#facc15" />
          <stop offset="85%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </radialGradient>
      </defs>
      <path d="M 52 80 C 46 60, 62 46, 80 46 C 104 46, 120 62, 114 84 C 108 106, 76 114, 52 80 Z" fill="url(#lemGrad_${idStr})" stroke="#a16207" stroke-width="1.2" />
      <ellipse cx="68" cy="62" rx="12" ry="6" transform="rotate(-30 68 62)" fill="#ffffff" opacity="0.6" />`;
      return wrapSvg(art, '#ca8a04', '🍋 ' + cleanTitle, '#fefce8');
    }

    // ==================== 16. INDUSTRIAL PAINTS, SEALERS, PRIMERS & HARDENERS ====================
    if (
      name.includes('SIRCA') ||
      name.includes('SEALER') ||
      name.includes('HARDENER') ||
      name.includes('HARDNER') ||
      name.includes('THINNER') ||
      name.includes('PAINT') ||
      name.includes('PU ') ||
      name.includes('PRIMER') ||
      name.includes('APACESPRCCOL') ||
      name.includes('APACEXTEML') ||
      name.includes('APEX') ||
      name.includes('ENAMEL') ||
      name.includes('DISTEMPER') ||
      name.includes('EMULSION')
    ) {
      let mainColor = '#0284c7';
      let secColor = '#0369a1';
      let accentCol = '#38bdf8';
      let tag = 'PAINT';

      if (name.includes('HARDENER') || name.includes('HARDNER')) {
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
        tag = 'SEALER';
      } else if (name.includes('PRIMER')) {
        tag = 'PRIMER';
      }

      // Color-coding based on product color variant in name
      let swatchColor = '#0284c7';
      if (name.includes('RED') || name.includes('SIG RED')) {
        swatchColor = '#dc2626';
      } else if (name.includes('SPRTYYLW') || name.includes('YELLOW') || name.includes('YLW')) {
        swatchColor = '#eab308';
      } else if (name.includes('SUNRISE')) {
        swatchColor = '#f59e0b';
      } else if (name.includes('ULT DEEP') || name.includes('DEEP') || name.includes('DARK GREY')) {
        swatchColor = '#1e3a8a';
      } else if (name.includes('ULTWHT') || name.includes('WHT') || name.includes('WHITE')) {
        swatchColor = '#ffffff';
      } else if (name.includes('GREY') || name.includes('GRAY')) {
        swatchColor = '#64748b';
      } else if (name.includes('CLEAR')) {
        swatchColor = '#38bdf8';
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
      <!-- Metallic Container Body -->
      <path d="M 46 48 L 48 120 C 48 126, 112 126, 112 120 L 114 48 Z" fill="url(#canBody_${idStr})" stroke="#1e293b" stroke-width="1.2" />
      <ellipse cx="80" cy="48" rx="34" ry="7" fill="#cbd5e1" stroke="#64748b" stroke-width="1" />
      <path d="M 44 50 C 44 24, 116 24, 116 50" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
      <!-- High-Gloss Front Label -->
      <rect x="52" y="66" width="56" height="42" rx="4" fill="#ffffff" opacity="0.96" stroke="#cbd5e1" stroke-width="0.8" />
      <text x="80" y="78" font-size="7" font-weight="900" fill="${secColor}" text-anchor="middle" font-family="sans-serif">INDUSTRIAL</text>
      <!-- Color Swatch Droplet -->
      <circle cx="80" cy="90" r="7.5" fill="${swatchColor}" stroke="#334155" stroke-width="1.2" />
      <rect x="58" y="99" width="44" height="8" rx="2" fill="${mainColor}" />
      <text x="80" y="105.5" font-size="5.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${tag}</text>`;
      return wrapSvg(art, secColor, '🎨 ' + cleanTitle, '#f1f5f9');
    }

    // ==================== 17. PACKAGING & POLYMER RAW MATERIALS ====================
    // Granules / Pellets (Handles P.P GRAULES, PP GRANULES, POLYMER PELLETS)
    if (
      name.includes('GRAULE') ||
      name.includes('GRANULE') ||
      name.includes('PELLET') ||
      name.includes('P.P GRAULES')
    ) {
      const art = `
      <defs>
        <linearGradient id="sackGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="50%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
        <radialGradient id="beadGrad_${idStr}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="45%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </radialGradient>
      </defs>
      <!-- Heavy-duty Polymer Sack -->
      <path d="M 48 50 L 112 50 L 118 118 C 118 124, 42 124, 42 118 Z" fill="url(#sackGrad_${idStr})" stroke="#475569" stroke-width="1.5" />
      <rect x="52" y="66" width="56" height="32" rx="4" fill="#0284c7" />
      <text x="80" y="80" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">PP PELLETS</text>
      <text x="80" y="92" font-size="6.5" font-weight="800" fill="#bae6fd" text-anchor="middle" font-family="sans-serif">RAW GRANULES</text>
      <!-- Spilling Crystal Granules Beads -->
      <circle cx="56" cy="44" r="5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="68" cy="40" r="5.5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="80" cy="38" r="6" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="92" cy="40" r="5.5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="104" cy="44" r="5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="74" cy="47" r="4.5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="86" cy="47" r="4.5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />`;
      return wrapSvg(art, '#0369a1', '🔹 ' + cleanTitle, '#f0f9ff');
    }

    if (name.includes('RAFFIA')) {
      const art = `
      <defs>
        <linearGradient id="rafGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ecfdf5" />
          <stop offset="50%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
      </defs>
      <!-- Woven Raffia Sack with Stitch Lines -->
      <path d="M 50 46 L 110 46 L 116 118 C 116 123, 44 123, 44 118 Z" fill="url(#rafGrad_${idStr})" stroke="#064e3b" stroke-width="1.4" />
      <line x1="50" y1="52" x2="110" y2="52" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="4 2" />
      <line x1="44" y1="114" x2="116" y2="114" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="4 2" />
      <rect x="56" y="66" width="48" height="34" rx="4" fill="#ffffff" opacity="0.95" />
      <text x="80" y="80" font-size="8.5" font-weight="900" fill="#047857" text-anchor="middle" font-family="sans-serif">PP RAFFIA</text>
      <text x="80" y="93" font-size="6.5" font-weight="900" fill="#065f46" text-anchor="middle" font-family="sans-serif">HIGH TENACITY</text>`;
      return wrapSvg(art, '#047857', '🌾 ' + cleanTitle, '#ecfdf5');
    }

    if (name.includes('POWDER') || name.includes('TT POWDER')) {
      const art = `
      <defs>
        <linearGradient id="powGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="50%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <path d="M 52 46 L 108 46 L 114 118 C 114 122, 46 122, 46 118 Z" fill="url(#powGrad_${idStr})" stroke="#047857" stroke-width="1.3" />
      <polygon points="80,64 96,80 80,96 64,80" fill="#ffffff" opacity="0.95" />
      <text x="80" y="83" font-size="8" font-weight="900" fill="#047857" text-anchor="middle" font-family="sans-serif">TT</text>
      <text x="80" y="108" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">MINERAL</text>`;
      return wrapSvg(art, '#047857', '🧪 ' + cleanTitle, '#ecfdf5');
    }

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
      <circle cx="80" cy="80" r="38" fill="url(#spoolGrad_${idStr})" stroke="#1e1b4b" stroke-width="1.5" />
      <circle cx="80" cy="80" r="30" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-dasharray="6 3" />
      <circle cx="80" cy="80" r="14" fill="#0f172a" stroke="#ffffff" stroke-width="2" />
      <text x="80" y="83" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">ROLL</text>`;
      return wrapSvg(art, '#312e81', '📦 ' + cleanTitle, '#eef2ff');
    }

    // ==================== 18. DYNAMIC ULTRA-COLORFUL PROCEDURAL PALETTE FOR ALL OTHER ITEMS ====================
    // Compute deterministic color palette from name hash
    const PALETTES = [
      { primary: '#e11d48', secondary: '#9f1239', accent: '#fda4af', tag: '#881337', tint: '#ffe4e6', icon: '💎' },
      { primary: '#7c3aed', secondary: '#5b21b6', accent: '#c4b5fd', tag: '#4c1d95', tint: '#f3e8ff', icon: '✨' },
      { primary: '#059669', secondary: '#047857', accent: '#6ee7b7', tag: '#064e3b', tint: '#d1fae5', icon: '🌿' },
      { primary: '#0284c7', secondary: '#0369a1', accent: '#7dd3fc', tag: '#0c4a6e', tint: '#e0f2fe', icon: '⭐' },
      { primary: '#ea580c', secondary: '#c2410c', accent: '#fed7aa', tag: '#7c2d12', tint: '#ffedd5', icon: '🔥' },
      { primary: '#c026d3', secondary: '#9333ea', accent: '#f5d0fe', tag: '#701a75', tint: '#fae8ff', icon: '🔮' },
      { primary: '#d97706', secondary: '#b45309', accent: '#fde68a', tag: '#78350f', tint: '#fef3c7', icon: '👑' },
      { primary: '#4f46e5', secondary: '#3730a3', accent: '#c7d2fe', tag: '#312e81', tint: '#e0e7ff', icon: '⚡' },
      { primary: '#0d9488', secondary: '#0f766e', accent: '#99f6e4', tag: '#134e4a', tint: '#ccfbf1', icon: '🍀' },
    ];
    let hash = 0;
    for (let i = 0; i < rawName.length; i++) {
      hash = (hash << 5) - hash + rawName.charCodeAt(i);
      hash |= 0;
    }
    const pal = PALETTES[Math.abs(hash) % PALETTES.length];

    const art = `
    <defs>
      <linearGradient id="dynGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.accent}" />
        <stop offset="50%" stop-color="${pal.primary}" />
        <stop offset="100%" stop-color="${pal.secondary}" />
      </linearGradient>
    </defs>
    <!-- Vibrant 3D Retail Product Package with Gold Foil Ribbon -->
    <path d="M 48 58 L 80 40 L 112 58 L 80 76 Z" fill="${pal.accent}" stroke="${pal.primary}" stroke-width="1.2" />
    <path d="M 48 58 L 80 76 L 80 118 L 48 100 Z" fill="url(#dynGrad_${idStr})" stroke="${pal.secondary}" stroke-width="1.2" />
    <path d="M 80 76 L 112 58 L 112 100 L 80 118 Z" fill="${pal.secondary}" stroke="${pal.tag}" stroke-width="1.2" />
    <!-- Center Emblem & Initials -->
    <circle cx="80" cy="76" r="14" fill="#ffffff" stroke="${pal.primary}" stroke-width="2" />
    <text x="80" y="80.5" font-size="10" font-weight="900" fill="${pal.tag}" text-anchor="middle" font-family="sans-serif">${cleanTitle.slice(0, 2).toUpperCase()}</text>`;
    return wrapSvg(art, pal.tag, pal.icon + ' ' + cleanTitle, pal.tint);
  }
};
