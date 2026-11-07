/**
 * POS AI Product Image Generator Service (v6 Ultra-Realistic Hardware, Produce & FMCG)
 * Generates realistic, vibrant, colorful vector illustrations based on product names and categories.
 * Covers:
 * 1. Computer & Electronics Hardware (RAM, Motherboard, SMPS, HDD, SSD, CPU, GPU, Cabinet, Monitor, Keyboard, Mouse, Printer, etc.)
 * 2. Fresh Vegetables (Tomato, Potato, Onion, Garlic, Ginger, Carrot, Radish, Chilli, Lemon, Peas, Brinjal, Gobhi, Bhindi, Kheera, Lauki, Palak, Mushroom, Corn, Beetroot)
 * 3. Fresh Fruits (Apple, Banana, Mango, Orange, Grapes, Papaya, Watermelon, Pomegranate, Pineapple, Coconut, Guava, Strawberry)
 * 4. Grains, Dals & Pulses (Rice, Wheat, Atta, Chana, Moong, Urad, Toor, Masoor, Rajma, Besan, Maida, Suji, Oats, Bajra)
 * 5. FMCG, Dairy, Confectionery & Beverages (Chocolate, Noodles, Chips, Soap, Toothpaste, Milk, Oil, Salt, Biscuits, Bread, Tea, Coffee)
 * 6. Industrial Coatings & Polymers (Paints, Sealers, Primers, Hardeners, Thinners, PP Granules, PP Raffia, TT Powder, Strapping Rolls)
 * 100% offline, zero latency, renders as standard data:image/svg+xml.
 */

export const posAIProductImageService = {
  isLegacyAIImage(url?: string): boolean {
    if (!url) return false;
    // Upgrade if older than v7
    return !url.includes('ai-product-v7');
  },

  generateImage(item: any): string {
    const rawName = String(item?.name || item?.itemName || '').trim();
    const name = rawName.toUpperCase();
    const rawVariant = String(item?.variant || (Array.isArray(item?.variants) && item?.variants[0]) || item?.stockGroup || item?.group || item?.category || '').trim();
    const variant = rawVariant.toUpperCase();
    const idStr = String(item?.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '');
    const cleanTitle = rawName.slice(0, 18);
    const context = `${variant} ${name}`;

    // Standard wrapper: 160x160 SVG with soft backdrop, drop shadow and vibrant floating name pill
    const wrapSvg = (artContent: string, badgeBg = '#0f172a', badgeText = cleanTitle, bgTint = '#f8fafc') => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%">
  <!-- ai-product-v7 -->
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

    // =========================================================================
    // ================= 1. COMPUTER & ELECTRONICS HARDWARE ===================
    // =========================================================================

    // --- RAM / Memory Modules ---
    if (
      name.includes('RAM') ||
      name.includes('DDR3') ||
      name.includes('DDR4') ||
      name.includes('DDR5') ||
      name.includes('DDR ') ||
      name.includes('SODIMM') ||
      name.includes('DIMM') ||
      name.includes('MEMORY')
    ) {
      const art = `
      <defs>
        <linearGradient id="ramPcb_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#15803d" />
          <stop offset="50%" stop-color="#166534" />
          <stop offset="100%" stop-color="#14532d" />
        </linearGradient>
        <linearGradient id="goldPins_${idStr}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
      </defs>
      <!-- RAM PCB Module -->
      <rect x="22" y="54" width="116" height="52" rx="4" fill="url(#ramPcb_${idStr})" stroke="#052e16" stroke-width="1.4" />
      <!-- Top Notches -->
      <polygon points="30,54 34,58 38,54" fill="#f8fafc" />
      <polygon points="122,54 126,58 130,54" fill="#f8fafc" />
      <!-- Center Heat Spreader / Metallic Bar -->
      <rect x="28" y="60" width="104" height="22" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <!-- DDR Memory IC Chips -->
      <rect x="34" y="64" width="12" height="14" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="0.8" />
      <rect x="50" y="64" width="12" height="14" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="0.8" />
      <rect x="66" y="64" width="12" height="14" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="0.8" />
      <rect x="82" y="64" width="12" height="14" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="0.8" />
      <rect x="98" y="64" width="12" height="14" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="0.8" />
      <rect x="114" y="64" width="12" height="14" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="0.8" />
      <!-- Spec Label -->
      <rect x="36" y="86" width="88" height="10" rx="1.5" fill="#f8fafc" opacity="0.9" />
      <text x="80" y="94" font-size="6.5" font-weight="900" fill="#0f172a" text-anchor="middle" font-family="monospace">DDR4 RAM MODULE</text>
      <!-- Gold Connector Pins Bottom -->
      <rect x="26" y="102" width="48" height="6" fill="url(#goldPins_${idStr})" />
      <rect x="74" y="102" width="4" height="6" fill="#14532d" /> <!-- Key Notch -->
      <rect x="80" y="102" width="54" height="6" fill="url(#goldPins_${idStr})" />`;
      return wrapSvg(art, '#166534', '💾 ' + cleanTitle, '#f0fdf4');
    }

    // --- Motherboard / Mobo ---
    if (
      name.includes('MOTHERBOARD') ||
      name.includes('MATHERBOARD') ||
      name.includes('MOBO') ||
      name.includes('MAINBOARD') ||
      name.includes('SYSTEM BOARD')
    ) {
      const art = `
      <defs>
        <linearGradient id="moboGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <!-- ATX Mainboard PCB -->
      <rect x="32" y="32" width="96" height="88" rx="6" fill="url(#moboGrad_${idStr})" stroke="#38bdf8" stroke-width="1.5" />
      <!-- Circuit Traces Lines -->
      <line x1="40" y1="40" x2="65" y2="40" stroke="#38bdf8" stroke-width="0.8" opacity="0.7" />
      <line x1="65" y1="40" x2="65" y2="55" stroke="#38bdf8" stroke-width="0.8" opacity="0.7" />
      <line x1="40" y1="105" x2="75" y2="105" stroke="#38bdf8" stroke-width="0.8" opacity="0.7" />
      <!-- Square CPU Socket -->
      <rect x="42" y="44" width="34" height="34" rx="3" fill="#cbd5e1" stroke="#475569" stroke-width="1.2" />
      <rect x="47" y="49" width="24" height="24" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8" />
      <rect x="54" y="56" width="10" height="10" fill="#94a3b8" />
      <!-- CPU Lever Handle -->
      <line x1="77" y1="44" x2="77" y2="78" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
      <!-- RAM Slots (Dual Channel) -->
      <rect x="84" y="42" width="7" height="38" rx="1.5" fill="#2563eb" stroke="#1d4ed8" stroke-width="0.8" />
      <rect x="94" y="42" width="7" height="38" rx="1.5" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />
      <rect x="104" y="42" width="7" height="38" rx="1.5" fill="#2563eb" stroke="#1d4ed8" stroke-width="0.8" />
      <rect x="114" y="42" width="7" height="38" rx="1.5" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />
      <!-- Heatsink Chipset / VRM -->
      <rect x="40" y="86" width="22" height="26" rx="2" fill="#ef4444" stroke="#b91c1c" stroke-width="1" />
      <line x1="45" y1="90" x2="45" y2="108" stroke="#ffffff" stroke-width="1.5" />
      <line x1="51" y1="90" x2="51" y2="108" stroke="#ffffff" stroke-width="1.5" />
      <line x1="57" y1="90" x2="57" y2="108" stroke="#ffffff" stroke-width="1.5" />
      <!-- PCIe x16 Slot (Graphics Card) -->
      <rect x="68" y="88" width="54" height="6" rx="1.5" fill="#eab308" stroke="#ca8a04" stroke-width="1" />
      <!-- PCIe x1 Slot -->
      <rect x="68" y="100" width="30" height="5" rx="1.2" fill="#334155" />
      <!-- Gold Capacitors -->
      <circle cx="38" cy="48" r="3" fill="#facc15" stroke="#ca8a04" stroke-width="0.7" />
      <circle cx="38" cy="58" r="3" fill="#facc15" stroke="#ca8a04" stroke-width="0.7" />
      <circle cx="38" cy="68" r="3" fill="#facc15" stroke="#ca8a04" stroke-width="0.7" />`;
      return wrapSvg(art, '#0284c7', '🎛️ ' + cleanTitle, '#f0f9ff');
    }

    // --- SMPS / Power Supply ---
    if (
      name.includes('SMPS') ||
      name.includes('POWER SUPPLY') ||
      name.includes('PSU') ||
      name.includes('POWER UNIT')
    ) {
      const art = `
      <defs>
        <linearGradient id="smpsBody_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="40%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <!-- SMPS Outer Metal Casing -->
      <rect x="30" y="38" width="94" height="78" rx="6" fill="url(#smpsBody_${idStr})" stroke="#0f172a" stroke-width="1.6" />
      <!-- 120mm Circular Cooling Fan Grill -->
      <circle cx="68" cy="74" r="28" fill="#0f172a" stroke="#64748b" stroke-width="1.8" />
      <circle cx="68" cy="74" r="22" fill="none" stroke="#475569" stroke-width="1.2" />
      <circle cx="68" cy="74" r="16" fill="none" stroke="#475569" stroke-width="1.2" />
      <circle cx="68" cy="74" r="8" fill="#38bdf8" />
      <!-- Fan Blades -->
      <path d="M 68 56 Q 74 65 68 74 Q 62 65 68 56 Z" fill="#64748b" />
      <path d="M 68 92 Q 74 83 68 74 Q 62 83 68 92 Z" fill="#64748b" />
      <path d="M 50 74 Q 59 80 68 74 Q 59 68 50 74 Z" fill="#64748b" />
      <path d="M 86 74 Q 77 80 68 74 Q 77 68 86 74 Z" fill="#64748b" />
      <!-- 80 Plus / Wattage Badge -->
      <rect x="100" y="46" width="18" height="24" rx="2" fill="#eab308" stroke="#ca8a04" stroke-width="0.8" />
      <text x="109" y="58" font-size="5.5" font-weight="900" fill="#78350f" text-anchor="middle">80+</text>
      <text x="109" y="66" font-size="5" font-weight="900" fill="#78350f" text-anchor="middle">GOLD</text>
      <!-- Power Switch & AC Inlet -->
      <rect x="102" y="78" width="16" height="12" rx="2" fill="#020617" stroke="#475569" stroke-width="0.8" />
      <rect x="105" y="81" width="10" height="6" fill="#dc2626" />
      <!-- Colorful Bundle of DC Output Cables -->
      <path d="M 30 92 Q 18 94 14 104" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
      <path d="M 30 96 Q 16 98 12 110" fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round" />
      <path d="M 30 100 Q 20 102 16 114" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
      <path d="M 30 104 Q 22 108 18 118" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" />`;
      return wrapSvg(art, '#b45309', '⚡ ' + cleanTitle, '#fefce8');
    }

    // --- HDD / Hard Disk Drive ---
    if (
      name.includes('HDD') ||
      name.includes('HARD DISK') ||
      name.includes('HARD DRIVE') ||
      name.includes('SEAGATE') ||
      name.includes('WD BLUE') ||
      name.includes('WD BLACK')
    ) {
      const art = `
      <defs>
        <linearGradient id="hddCasing_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="50%" stop-color="#64748b" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
        <radialGradient id="platterGrad_${idStr}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#e2e8f0" />
          <stop offset="70%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#94a3b8" />
        </radialGradient>
      </defs>
      <!-- HDD 3.5 Casing -->
      <rect x="36" y="32" width="88" height="92" rx="6" fill="url(#hddCasing_${idStr})" stroke="#1e293b" stroke-width="1.6" />
      <!-- Recessed Platter Well -->
      <rect x="42" y="38" width="76" height="80" rx="4" fill="#1e293b" />
      <!-- Magnetic Mirror Disk Platter -->
      <circle cx="78" cy="72" r="32" fill="url(#platterGrad_${idStr})" stroke="#64748b" stroke-width="1.2" />
      <circle cx="78" cy="72" r="10" fill="#475569" stroke="#cbd5e1" stroke-width="1.5" />
      <circle cx="78" cy="72" r="4" fill="#0f172a" />
      <!-- Platter Specular Rainbow Sheen -->
      <path d="M 78 72 L 54 50 A 32 32 0 0 1 102 50 Z" fill="#38bdf8" opacity="0.3" />
      <!-- Actuator Arm & Read/Write Magnetic Head -->
      <circle cx="106" cy="100" r="7" fill="#64748b" stroke="#cbd5e1" stroke-width="1" />
      <polygon points="106,97 68,76 70,72 106,95" fill="#f8fafc" stroke="#475569" stroke-width="0.8" />
      <rect x="66" y="72" width="4" height="3" fill="#eab308" />
      <!-- Bottom Corner Mounting Screws -->
      <circle cx="42" cy="38" r="2.5" fill="#cbd5e1" />
      <circle cx="118" cy="38" r="2.5" fill="#cbd5e1" />
      <circle cx="42" cy="118" r="2.5" fill="#cbd5e1" />
      <circle cx="118" cy="118" r="2.5" fill="#cbd5e1" />`;
      return wrapSvg(art, '#334155', '💽 ' + cleanTitle, '#f8fafc');
    }

    // --- SSD / NVMe Solid State Drive ---
    if (
      name.includes('SSD') ||
      name.includes('NVME') ||
      name.includes('M.2') ||
      name.includes('SOLID STATE')
    ) {
      const art = `
      <defs>
        <linearGradient id="ssdGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <!-- Sleek 2.5 Inch Brushed SSD Drive -->
      <rect x="36" y="42" width="88" height="74" rx="6" fill="url(#ssdGrad_${idStr})" stroke="#38bdf8" stroke-width="1.5" />
      <rect x="44" y="50" width="72" height="42" rx="3" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
      <!-- Speed Lightning Emblem -->
      <path d="M 82 54 L 72 70 L 80 70 L 76 86 L 88 68 L 80 68 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8" />
      <text x="80" y="104" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">SOLID STATE DRIVE</text>
      <text x="80" y="112" font-size="6" font-weight="800" fill="#38bdf8" text-anchor="middle" font-family="sans-serif">NVMe HIGH SPEED</text>
      <!-- SATA / NVMe Golden Pins -->
      <rect x="48" y="116" width="30" height="3" fill="#facc15" />
      <rect x="84" y="116" width="16" height="3" fill="#facc15" />`;
      return wrapSvg(art, '#0369a1', '🚀 ' + cleanTitle, '#f0f9ff');
    }

    // --- CPU / Processor ---
    if (
      name.includes('CPU') ||
      name.includes('PROCESSOR') ||
      name.includes('INTEL') ||
      name.includes('AMD') ||
      name.includes('RYZEN') ||
      name.includes('CORE I')
    ) {
      const art = `
      <defs>
        <linearGradient id="ihsGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="50%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
      </defs>
      <!-- Green Substrate Board -->
      <rect x="42" y="40" width="76" height="76" rx="4" fill="#15803d" stroke="#052e16" stroke-width="1.5" />
      <!-- Gold Triangle Pin 1 Indicator -->
      <polygon points="44,42 50,42 44,48" fill="#facc15" />
      <!-- Metallic Integrated Heat Spreader (IHS) -->
      <rect x="48" y="46" width="64" height="64" rx="4" fill="url(#ihsGrad_${idStr})" stroke="#475569" stroke-width="1.2" />
      <rect x="52" y="50" width="56" height="56" rx="2" fill="none" stroke="#64748b" stroke-width="0.8" />
      <!-- Laser Etched Processor Logo -->
      <circle cx="80" cy="70" r="14" fill="#0f172a" />
      <text x="80" y="74" font-size="9" font-weight="900" fill="#38bdf8" text-anchor="middle" font-family="sans-serif">CPU</text>
      <text x="80" y="94" font-size="6" font-weight="800" fill="#334155" text-anchor="middle" font-family="monospace">OCTA-CORE</text>`;
      return wrapSvg(art, '#1e293b', '🧠 ' + cleanTitle, '#f1f5f9');
    }

    // --- GPU / Graphics Card ---
    if (
      name.includes('GPU') ||
      name.includes('GRAPHICS CARD') ||
      name.includes('GRAPHIC CARD') ||
      name.includes('VGA') ||
      name.includes('RTX') ||
      name.includes('GTX') ||
      name.includes('RADEON') ||
      name.includes('GEFORCE')
    ) {
      const art = `
      <defs>
        <linearGradient id="gpuGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <!-- Dual-Fan Gaming Graphics Card -->
      <rect x="26" y="48" width="108" height="56" rx="6" fill="url(#gpuGrad_${idStr})" stroke="#6366f1" stroke-width="1.6" />
      <!-- Fan 1 Left -->
      <circle cx="56" cy="74" r="19" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
      <circle cx="56" cy="74" r="6" fill="#6366f1" />
      <line x1="56" y1="58" x2="56" y2="90" stroke="#94a3b8" stroke-width="1.8" />
      <line x1="40" y1="74" x2="72" y2="74" stroke="#94a3b8" stroke-width="1.8" />
      <!-- Fan 2 Right -->
      <circle cx="98" cy="74" r="19" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
      <circle cx="98" cy="74" r="6" fill="#6366f1" />
      <line x1="98" y1="58" x2="98" y2="90" stroke="#94a3b8" stroke-width="1.8" />
      <line x1="82" y1="74" x2="114" y2="74" stroke="#94a3b8" stroke-width="1.8" />
      <!-- PCIe Gold Teeth Connector -->
      <rect x="42" y="104" width="46" height="5" fill="#facc15" />
      <rect x="92" y="104" width="14" height="5" fill="#facc15" />
      <!-- Metal Bracket Left -->
      <rect x="22" y="44" width="6" height="64" rx="1.5" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8" />`;
      return wrapSvg(art, '#4338ca', '🎮 ' + cleanTitle, '#eef2ff');
    }

    // --- Desktop Cabinet / Tower PC ---
    if (
      name.includes('CABINET') ||
      name.includes('DESKTOP') ||
      name.includes('COMPUTER') ||
      name.includes('TOWER') ||
      name.includes('PC ')
    ) {
      const art = `
      <defs>
        <linearGradient id="cabGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <!-- Gaming Desktop PC Tower -->
      <rect x="48" y="28" width="64" height="92" rx="6" fill="url(#cabGrad_${idStr})" stroke="#38bdf8" stroke-width="1.6" />
      <!-- Front Mesh Panel with RGB Fans -->
      <rect x="52" y="36" width="38" height="76" rx="3" fill="#020617" stroke="#1e293b" stroke-width="1" />
      <!-- RGB Fan 1 Top -->
      <circle cx="71" cy="54" r="14" fill="#0f172a" stroke="#ec4899" stroke-width="2.5" />
      <circle cx="71" cy="54" r="4" fill="#ec4899" />
      <!-- RGB Fan 2 Bottom -->
      <circle cx="71" cy="88" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
      <circle cx="71" cy="88" r="4" fill="#38bdf8" />
      <!-- Side Glass Bevel -->
      <rect x="94" y="36" width="14" height="76" rx="1" fill="#38bdf8" opacity="0.15" />
      <!-- Power Button & USB ports -->
      <circle cx="101" cy="32" r="2.5" fill="#38bdf8" />
      <rect x="98" y="42" width="6" height="2" fill="#64748b" />
      <rect x="98" y="48" width="6" height="2" fill="#64748b" />`;
      return wrapSvg(art, '#0f172a', '🖥️ ' + cleanTitle, '#f8fafc');
    }

    // --- Monitor / Screen / LED Display ---
    if (
      name.includes('MONITOR') ||
      name.includes('DISPLAY') ||
      name.includes('LED MONITOR') ||
      name.includes('LCD') ||
      name.includes('SCREEN')
    ) {
      const art = `
      <defs>
        <linearGradient id="screenGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="50%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#9333ea" />
        </linearGradient>
      </defs>
      <!-- Bezel Outer Frame -->
      <rect x="28" y="36" width="104" height="66" rx="4" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
      <!-- Widescreen LED Active Display -->
      <rect x="32" y="40" width="96" height="56" rx="2" fill="url(#screenGrad_${idStr})" />
      <!-- Screen Horizon Wallpaper Graphic -->
      <polygon points="32,96 68,68 88,80 110,60 128,96" fill="#0f172a" opacity="0.5" />
      <circle cx="110" cy="52" r="6" fill="#facc15" />
      <!-- Monitor Stand & Base -->
      <rect x="74" y="102" width="12" height="12" fill="#64748b" stroke="#334155" stroke-width="1" />
      <ellipse cx="80" cy="116" rx="28" ry="4" fill="#334155" stroke="#1e293b" stroke-width="1.2" />`;
      return wrapSvg(art, '#1e293b', '🖥️ ' + cleanTitle, '#f0f9ff');
    }

    // --- Keyboard & Mouse ---
    if (
      name.includes('KEYBOARD') ||
      name.includes('KEY BOARD') ||
      name.includes('MOUSE') ||
      name.includes('MOUSEPAD')
    ) {
      const isMouseOnly = name.includes('MOUSE') && !name.includes('KEYBOARD');
      if (isMouseOnly) {
        const art = `
        <defs>
          <linearGradient id="mouseGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#475569" />
            <stop offset="50%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
        </defs>
        <!-- Ergonomic Optical Gaming Mouse -->
        <path d="M 60 46 C 60 30, 100 30, 100 46 L 104 90 C 104 114, 56 114, 56 90 Z" fill="url(#mouseGrad_${idStr})" stroke="#6366f1" stroke-width="1.6" />
        <!-- Split Button Seam -->
        <line x1="80" y1="34" x2="80" y2="62" stroke="#64748b" stroke-width="1.5" />
        <!-- Illuminated Scroll Wheel -->
        <rect x="76" y="44" width="8" height="14" rx="3" fill="#38bdf8" stroke="#0284c7" stroke-width="1" />
        <!-- Ergonomic Thumb Rest -->
        <path d="M 56 68 Q 48 80 56 94" fill="none" stroke="#6366f1" stroke-width="2" />
        <circle cx="80" cy="88" r="4" fill="#6366f1" />`;
        return wrapSvg(art, '#312e81', '🖱️ ' + cleanTitle, '#eef2ff');
      } else {
        const art = `
        <defs>
          <linearGradient id="kbGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
        </defs>
        <!-- Mechanical Keyboard Base Frame -->
        <rect x="22" y="52" width="116" height="56" rx="6" fill="url(#kbGrad_${idStr})" stroke="#38bdf8" stroke-width="1.5" />
        <!-- Key Rows Grid -->
        <g fill="#1e293b" stroke="#475569" stroke-width="0.8">
          <rect x="28" y="58" width="10" height="8" rx="1.5" />
          <rect x="42" y="58" width="10" height="8" rx="1.5" />
          <rect x="56" y="58" width="10" height="8" rx="1.5" />
          <rect x="70" y="58" width="10" height="8" rx="1.5" />
          <rect x="84" y="58" width="10" height="8" rx="1.5" />
          <rect x="98" y="58" width="10" height="8" rx="1.5" />
          <rect x="112" y="58" width="20" height="8" rx="1.5" fill="#38bdf8" />
          
          <rect x="28" y="70" width="14" height="8" rx="1.5" />
          <rect x="46" y="70" width="10" height="8" rx="1.5" />
          <rect x="60" y="70" width="10" height="8" rx="1.5" />
          <rect x="74" y="70" width="10" height="8" rx="1.5" />
          <rect x="88" y="70" width="10" height="8" rx="1.5" />
          <rect x="102" y="70" width="10" height="8" rx="1.5" />
          <rect x="116" y="70" width="16" height="8" rx="1.5" />

          <!-- Spacebar Row -->
          <rect x="28" y="82" width="18" height="8" rx="1.5" />
          <rect x="50" y="82" width="56" height="8" rx="2" fill="#38bdf8" />
          <rect x="110" y="82" width="22" height="8" rx="1.5" />
        </g>`;
        return wrapSvg(art, '#0f172a', '⌨️ ' + cleanTitle, '#f0f9ff');
      }
    }

    // --- Printer / Scanner / Cartridge ---
    if (
      name.includes('PRINTER') ||
      name.includes('SCANNER') ||
      name.includes('CARTRIDGE') ||
      name.includes('TONER')
    ) {
      const art = `
      <defs>
        <linearGradient id="printGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#f1f5f9" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
      </defs>
      <!-- Printer Body -->
      <rect x="34" y="52" width="92" height="52" rx="6" fill="url(#printGrad_${idStr})" stroke="#64748b" stroke-width="1.6" />
      <!-- Paper Infeed Top -->
      <rect x="50" y="34" width="60" height="20" rx="2" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />
      <!-- Output Paper Sheet -->
      <rect x="52" y="84" width="56" height="28" rx="2" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
      <line x1="58" y1="92" x2="102" y2="92" stroke="#64748b" stroke-width="1.5" />
      <line x1="58" y1="98" x2="94" y2="98" stroke="#64748b" stroke-width="1.5" />
      <line x1="58" y1="104" x2="88" y2="104" stroke="#64748b" stroke-width="1.5" />
      <!-- Control Panel & Status LED -->
      <circle cx="114" cy="62" r="3" fill="#22c55e" />
      <rect x="106" y="68" width="14" height="6" rx="1.5" fill="#0f172a" />`;
      return wrapSvg(art, '#475569', '🖨️ ' + cleanTitle, '#f8fafc');
    }

    // --- Pen Drive / USB / Cables / Network Router ---
    if (
      name.includes('PENDRIVE') ||
      name.includes('PEN DRIVE') ||
      name.includes('FLASH DRIVE') ||
      name.includes('ROUTER') ||
      name.includes('CABLE') ||
      name.includes('USB') ||
      name.includes('HDMI')
    ) {
      const art = `
      <defs>
        <linearGradient id="usbGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
      </defs>
      <!-- USB Flash Drive Body -->
      <rect x="58" y="56" width="44" height="58" rx="5" fill="url(#usbGrad_${idStr})" stroke="#0284c7" stroke-width="1.4" />
      <circle cx="80" cy="100" r="5" fill="#f8fafc" stroke="#0369a1" stroke-width="1" />
      <!-- Metallic USB Connector Head -->
      <rect x="64" y="32" width="32" height="26" rx="2" fill="#cbd5e1" stroke="#64748b" stroke-width="1.2" />
      <rect x="70" y="36" width="6" height="8" rx="1" fill="#1e293b" />
      <rect x="84" y="36" width="6" height="8" rx="1" fill="#1e293b" />
      <text x="80" y="82" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">USB 3.0</text>`;
      return wrapSvg(art, '#0369a1', '🔌 ' + cleanTitle, '#f0f9ff');
    }

    // --- Cooling Fan / CPU Fan / Cabinet Fan / M Fan ---
    if (
      name.includes('M FAN') ||
      name.includes('FAN') ||
      name.includes('COOLER') ||
      context.includes('COOLING') ||
      (variant.includes('COMPUTER') && name.includes('FAN'))
    ) {
      const art = `
      <defs>
        <linearGradient id="fanFrame_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="50%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <!-- Square Outer Fan Housing -->
      <rect x="36" y="36" width="88" height="88" rx="8" fill="url(#fanFrame_${idStr})" stroke="#0284c7" stroke-width="1.6" />
      <!-- Mounting Screw Holes at 4 corners -->
      <circle cx="44" cy="44" r="3.5" fill="#f8fafc" stroke="#475569" stroke-width="0.8" />
      <circle cx="116" cy="44" r="3.5" fill="#f8fafc" stroke="#475569" stroke-width="0.8" />
      <circle cx="44" cy="116" r="3.5" fill="#f8fafc" stroke="#475569" stroke-width="0.8" />
      <circle cx="116" cy="116" r="3.5" fill="#f8fafc" stroke="#475569" stroke-width="0.8" />
      <!-- Inner Circular Vent & RGB Neon Ring -->
      <circle cx="80" cy="80" r="36" fill="#020617" stroke="#38bdf8" stroke-width="2.5" />
      <circle cx="80" cy="80" r="32" fill="#0f172a" />
      <!-- Central Motor Hub -->
      <circle cx="80" cy="80" r="13" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
      <circle cx="80" cy="80" r="5" fill="#38bdf8" />
      <!-- Curved Aerodynamic Fan Blades -->
      <path d="M 80 67 C 72 52, 92 48, 80 44 C 68 52, 74 65, 80 67 Z" fill="#64748b" />
      <path d="M 80 93 C 72 108, 92 112, 80 116 C 68 108, 74 95, 80 93 Z" fill="#64748b" />
      <path d="M 67 80 C 52 72, 48 92, 44 80 C 52 68, 65 74, 67 80 Z" fill="#64748b" />
      <path d="M 93 80 C 108 72, 112 92, 116 80 C 108 68, 95 74, 93 80 Z" fill="#64748b" />
      <path d="M 70 70 C 58 60, 70 50, 56 56 C 60 70, 68 68, 70 70 Z" fill="#64748b" />
      <path d="M 90 90 C 102 100, 90 110, 104 104 C 100 90, 92 92, 90 90 Z" fill="#64748b" />
      <path d="M 70 90 C 60 102, 50 90, 56 104 C 70 100, 68 92, 70 90 Z" fill="#64748b" />
      <path d="M 90 70 C 100 58, 90 48, 104 54 C 90 60, 92 68, 90 70 Z" fill="#64748b" />`;
      return wrapSvg(art, '#0284c7', '💨 ' + cleanTitle, '#f0f9ff');
    }

    // --- DVD Writer / Optical Disc Drive ---
    if (
      name.includes('DVD') ||
      name.includes('CD') ||
      name.includes('WRITER') ||
      name.includes('OPTICAL') ||
      name.includes('BLURAY')
    ) {
      const art = `
      <defs>
        <linearGradient id="dvdBody_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#cbd5e1" />
          <stop offset="50%" stop-color="#94a3b8" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>
      </defs>
      <!-- Metallic 5.25 Inch Optical Drive Enclosure -->
      <rect x="30" y="46" width="100" height="68" rx="5" fill="url(#dvdBody_${idStr})" stroke="#334155" stroke-width="1.6" />
      <!-- Top Cover Stamping Indentations -->
      <rect x="42" y="52" width="76" height="20" rx="2" fill="none" stroke="#64748b" stroke-width="1" />
      <!-- Front Loading Tray Bezel Faceplate -->
      <rect x="28" y="76" width="104" height="34" rx="3" fill="#0f172a" stroke="#1e293b" stroke-width="1.4" />
      <!-- Sliding Disc Tray Seam -->
      <rect x="34" y="80" width="92" height="18" rx="2" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
      <text x="56" y="92" font-size="6.5" font-weight="900" fill="#cbd5e1" font-family="sans-serif">DVD R/RW</text>
      <!-- Activity Green LED & Eject Button -->
      <circle cx="106" cy="90" r="2" fill="#22c55e" />
      <rect x="112" y="86" width="10" height="7" rx="1.5" fill="#475569" stroke="#64748b" stroke-width="0.8" />
      <!-- Emergency Pin Hole -->
      <circle cx="100" cy="90" r="0.8" fill="#ffffff" />`;
      return wrapSvg(art, '#334155', '💿 ' + cleanTitle, '#f8fafc');
    }

    // =========================================================================
    // ================= 2. FRESH VEGETABLES (HAR EK VEG) ======================
    // =========================================================================

    // Tomato (Tomato, Tammato, Tamato, Tamatar)
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
      <circle cx="80" cy="82" r="38" fill="url(#tomGrad_${idStr})" stroke="#7f1d1d" stroke-width="1.2" />
      <ellipse cx="66" cy="66" rx="14" ry="8" transform="rotate(-35 66 66)" fill="#ffffff" opacity="0.65" />
      <ellipse cx="62" cy="64" rx="6" ry="3" transform="rotate(-35 62 64)" fill="#ffffff" opacity="0.9" />
      <path d="M 80 48 L 70 36 L 77 46 L 64 47 L 74 53 L 68 62 L 78 55 L 82 55 L 92 62 L 86 53 L 96 47 L 83 46 L 90 36 Z" fill="url(#calyxGrad_${idStr})" stroke="#14532d" stroke-width="0.8" />
      <path d="M 80 46 Q 84 28 98 26" fill="none" stroke="#16a34a" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 80 46 Q 84 28 98 26" fill="none" stroke="#14532d" stroke-width="1.5" stroke-linecap="round" />`;
      return wrapSvg(art, '#b91c1c', '🍅 ' + cleanTitle, '#fef2f2');
    }

    // Potato / Aloo / Aaloo / Batata
    if (name.includes('POTATO') || name.includes('ALOO') || name.includes('AALOO') || name.includes('BATATA')) {
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

    // Onion / Pyaz / Kanda
    if (name.includes('ONION') || name.includes('PYAZ') || name.includes('PIYAZ') || name.includes('KANDA')) {
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

    // Garlic / Lehsun
    if (name.includes('GARLIC') || name.includes('LEHSUN') || name.includes('LAHSUN')) {
      const art = `
      <defs>
        <radialGradient id="garGrad_${idStr}" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#f1f5f9" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </radialGradient>
      </defs>
      <!-- Garlic Bulb Claves -->
      <path d="M 80 34 L 80 24" stroke="#ca8a04" stroke-width="3" stroke-linecap="round" />
      <path d="M 80 36 C 96 36, 114 60, 110 88 C 106 108, 80 114, 80 114 C 80 114, 54 108, 50 88 C 46 60, 64 36, 80 36 Z" fill="url(#garGrad_${idStr})" stroke="#94a3b8" stroke-width="1.2" />
      <path d="M 80 36 Q 66 68 80 114" fill="none" stroke="#cbd5e1" stroke-width="1.5" />
      <path d="M 80 36 Q 94 68 80 114" fill="none" stroke="#cbd5e1" stroke-width="1.5" />`;
      return wrapSvg(art, '#475569', '🧄 ' + cleanTitle, '#f8fafc');
    }

    // Ginger / Adrak
    if (name.includes('GINGER') || name.includes('ADRAK')) {
      const art = `
      <defs>
        <radialGradient id="gingGrad_${idStr}" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#d97706" />
          <stop offset="100%" stop-color="#92400e" />
        </radialGradient>
      </defs>
      <!-- Knobby Ginger Root -->
      <path d="M 52 82 C 46 68, 56 50, 72 54 C 82 42, 98 44, 104 60 C 116 62, 118 78, 108 92 C 100 106, 78 114, 62 104 C 52 98, 48 90, 52 82 Z" fill="url(#gingGrad_${idStr})" stroke="#78350f" stroke-width="1.4" />
      <path d="M 64 68 Q 74 72 84 66" stroke="#78350f" stroke-width="1.5" fill="none" opacity="0.6" />
      <path d="M 76 86 Q 88 90 98 84" stroke="#78350f" stroke-width="1.5" fill="none" opacity="0.6" />`;
      return wrapSvg(art, '#92400e', '🫚 ' + cleanTitle, '#fefce8');
    }

    // Carrot / Gajar
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

    // Radish / Mooli
    if (name.includes('RADISH') || name.includes('MOOLI') || name.includes('MULI')) {
      const art = `
      <defs>
        <linearGradient id="radGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="60%" stop-color="#f1f5f9" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
      </defs>
      <!-- Green Leaves -->
      <path d="M 80 42 Q 68 18 58 20 M 80 42 Q 80 14 84 12 M 80 42 Q 92 18 102 20" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round" fill="none" />
      <!-- White Crisp Radish Body -->
      <path d="M 66 44 Q 80 40 94 44 L 82 122 Q 80 126 78 122 Z" fill="url(#radGrad_${idStr})" stroke="#94a3b8" stroke-width="1.2" />`;
      return wrapSvg(art, '#475569', '🌱 ' + cleanTitle, '#f8fafc');
    }

    // Chilli / Mirch / Capsicum
    if (
      name.includes('CHILLI') ||
      name.includes('CHILI') ||
      name.includes('MIRCH') ||
      name.includes('PEPPER') ||
      name.includes('CAPSICUM') ||
      name.includes('SHIMLA')
    ) {
      const isGreen = name.includes('GREEN') || name.includes('HARI') || name.includes('CAPSICUM') || name.includes('SHIMLA');
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

    // Lemon / Nimbu
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

    // Peas / Matar
    if (name.includes('PEAS') || name.includes('MATAR') || name.includes('PEA')) {
      const art = `
      <defs>
        <linearGradient id="podGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#86efac" />
          <stop offset="50%" stop-color="#22c55e" />
          <stop offset="100%" stop-color="#15803d" />
        </linearGradient>
      </defs>
      <!-- Curved Green Pod -->
      <path d="M 44 88 C 50 50, 110 50, 118 84 C 100 94, 60 96, 44 88 Z" fill="url(#podGrad_${idStr})" stroke="#166534" stroke-width="1.4" />
      <!-- Round Sweet Peas inside -->
      <circle cx="58" cy="74" r="8" fill="#4ade80" stroke="#166534" stroke-width="1" />
      <circle cx="76" cy="71" r="8.5" fill="#4ade80" stroke="#166534" stroke-width="1" />
      <circle cx="94" cy="72" r="8" fill="#4ade80" stroke="#166534" stroke-width="1" />
      <circle cx="108" cy="76" r="6" fill="#4ade80" stroke="#166534" stroke-width="1" />`;
      return wrapSvg(art, '#166534', '🫛 ' + cleanTitle, '#f0fdf4');
    }

    // Brinjal / Baingan / Eggplant
    if (name.includes('BRINJAL') || name.includes('BAINGAN') || name.includes('EGGPLANT') || name.includes('AUBERGINE')) {
      const art = `
      <defs>
        <radialGradient id="brinGrad_${idStr}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#c084fc" />
          <stop offset="40%" stop-color="#9333ea" />
          <stop offset="80%" stop-color="#581c87" />
          <stop offset="100%" stop-color="#3b0764" />
        </radialGradient>
      </defs>
      <!-- Plump Glossy Purple Brinjal -->
      <path d="M 72 48 C 64 62, 50 82, 54 100 C 60 120, 100 120, 106 100 C 110 82, 94 62, 86 48 Z" fill="url(#brinGrad_${idStr})" stroke="#3b0764" stroke-width="1.4" />
      <ellipse cx="70" cy="75" rx="8" ry="18" transform="rotate(-15 70 75)" fill="#ffffff" opacity="0.45" />
      <!-- Green Calyx Cap and Stem -->
      <path d="M 80 48 L 74 36 L 79 46 L 68 49 L 77 54 L 84 54 L 92 49 L 81 46 L 86 36 Z" fill="#22c55e" stroke="#15803d" stroke-width="1" />
      <path d="M 80 44 Q 84 26 94 22" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" />`;
      return wrapSvg(art, '#581c87', '🍆 ' + cleanTitle, '#f3e8ff');
    }

    // Cauliflower & Cabbage / Gobhi / Patta Gobhi
    if (
      name.includes('CAULIFLOWER') ||
      name.includes('CABBAGE') ||
      name.includes('GOBHI') ||
      name.includes('GOBI') ||
      name.includes('PATTA GOBHI') ||
      name.includes('BAND GOBHI')
    ) {
      const isCabbage = name.includes('CABBAGE') || name.includes('PATTA') || name.includes('BAND');
      const floretsCol = isCabbage ? '#4ade80' : '#fef9c3';
      const art = `
      <!-- Cauliflower / Cabbage Head with Green Wrapper Leaves -->
      <path d="M 44 80 C 40 106, 120 106, 116 80 C 120 54, 40 54, 44 80 Z" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
      <!-- Center Florets Mound -->
      <circle cx="80" cy="74" r="28" fill="${floretsCol}" stroke="#ca8a04" stroke-width="1.2" />
      <circle cx="68" cy="66" r="10" fill="${floretsCol}" stroke="#a16207" stroke-width="0.8" />
      <circle cx="92" cy="66" r="10" fill="${floretsCol}" stroke="#a16207" stroke-width="0.8" />
      <circle cx="80" cy="84" r="11" fill="${floretsCol}" stroke="#a16207" stroke-width="0.8" />`;
      return wrapSvg(art, '#15803d', '🥦 ' + cleanTitle, '#f0fdf4');
    }

    // Ladyfinger / Okra / Bhindi
    if (name.includes('BHINDI') || name.includes('OKRA') || name.includes('LADYFINGER') || name.includes('LADY FINGER')) {
      const art = `
      <!-- Slender Ridged Green Okra / Bhindi -->
      <path d="M 78 30 L 82 30 L 80 20 Z" fill="#15803d" />
      <path d="M 70 38 L 90 38 L 82 120 Q 80 124 78 120 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.4" />
      <line x1="76" y1="38" x2="79" y2="120" stroke="#166534" stroke-width="1.5" />
      <line x1="84" y1="38" x2="81" y2="120" stroke="#166534" stroke-width="1.5" />`;
      return wrapSvg(art, '#166534', '🌿 ' + cleanTitle, '#f0fdf4');
    }

    // Cucumber / Kheera
    if (name.includes('CUCUMBER') || name.includes('KHEERA') || name.includes('KHIRA') || name.includes('KAKDI')) {
      const art = `
      <defs>
        <linearGradient id="cucGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#86efac" />
          <stop offset="50%" stop-color="#22c55e" />
          <stop offset="100%" stop-color="#15803d" />
        </linearGradient>
      </defs>
      <!-- Cylindrical Crisp Green Cucumber -->
      <path d="M 48 88 C 42 66, 114 44, 118 72 C 122 96, 54 110, 48 88 Z" fill="url(#cucGrad_${idStr})" stroke="#14532d" stroke-width="1.4" />
      <line x1="60" y1="80" x2="108" y2="68" stroke="#f0fdf4" stroke-width="2" stroke-linecap="round" opacity="0.6" />`;
      return wrapSvg(art, '#15803d', '🥒 ' + cleanTitle, '#f0fdf4');
    }

    // Gourds: Lauki, Kaddu, Pumpkin, Karela
    if (
      name.includes('LAUKI') ||
      name.includes('LOKI') ||
      name.includes('GHIYA') ||
      name.includes('KADDU') ||
      name.includes('PUMPKIN') ||
      name.includes('KARELA') ||
      name.includes('TORI') ||
      name.includes('TURAI')
    ) {
      const isPumpkin = name.includes('KADDU') || name.includes('PUMPKIN');
      const bgCol = isPumpkin ? '#ea580c' : '#15803d';
      const fillCol = isPumpkin ? '#f97316' : '#22c55e';
      const art = `
      <!-- Bottle Gourd / Pumpkin -->
      <circle cx="80" cy="80" r="36" fill="${fillCol}" stroke="${bgCol}" stroke-width="1.8" />
      <path d="M 80 44 L 80 28 Q 84 22 90 24" fill="none" stroke="#166534" stroke-width="4" stroke-linecap="round" />
      <path d="M 64 48 Q 54 80 64 112" fill="none" stroke="${bgCol}" stroke-width="1.8" />
      <path d="M 96 48 Q 106 80 96 112" fill="none" stroke="${bgCol}" stroke-width="1.8" />`;
      return wrapSvg(art, bgCol, (isPumpkin ? '🎃 ' : '🥒 ') + cleanTitle, '#f0fdf4');
    }

    // Leafy Greens: Spinach / Palak / Coriander / Dhaniya / Mint / Pudina / Methi
    if (
      name.includes('SPINACH') ||
      name.includes('PALAK') ||
      name.includes('CORIANDER') ||
      name.includes('DHANIYA') ||
      name.includes('MINT') ||
      name.includes('PUDINA') ||
      name.includes('METHI') ||
      name.includes('LEAF') ||
      name.includes('SAAG')
    ) {
      const art = `
      <!-- Lush Vibrant Green Leaves Bundle -->
      <path d="M 80 96 C 50 78, 52 46, 78 38 C 84 62, 82 82, 80 96 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.2" />
      <path d="M 80 96 C 110 78, 108 46, 82 38 C 76 62, 78 82, 80 96 Z" fill="#16a34a" stroke="#14532d" stroke-width="1.2" />
      <line x1="80" y1="96" x2="80" y2="44" stroke="#86efac" stroke-width="2" stroke-linecap="round" />
      <path d="M 76 96 L 76 114 M 80 96 L 80 118 M 84 96 L 84 114" stroke="#15803d" stroke-width="2.5" stroke-linecap="round" />`;
      return wrapSvg(art, '#15803d', '🥬 ' + cleanTitle, '#f0fdf4');
    }

    // Mushroom / Corn / Beetroot
    if (name.includes('MUSHROOM')) {
      const art = `
      <!-- Creamy Mushroom Cap & Stem -->
      <rect x="72" y="74" width="16" height="36" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
      <path d="M 46 76 C 46 44, 114 44, 114 76 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.4" />
      <circle cx="64" cy="62" r="3" fill="#cbd5e1" />
      <circle cx="80" cy="56" r="3.5" fill="#cbd5e1" />
      <circle cx="96" cy="62" r="3" fill="#cbd5e1" />`;
      return wrapSvg(art, '#64748b', '🍄 ' + cleanTitle, '#f8fafc');
    }

    if (name.includes('CORN') || name.includes('BHUTTA') || name.includes('SWEET CORN') || name.includes('MAIZE')) {
      const art = `
      <!-- Golden Sweet Corn with Green Husks -->
      <path d="M 68 40 C 60 70, 70 110, 80 116 C 90 110, 100 70, 92 40 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.4" />
      <!-- Corn Kernels Grid -->
      <line x1="80" y1="44" x2="80" y2="112" stroke="#eab308" stroke-width="1.5" />
      <line x1="74" y1="46" x2="74" y2="110" stroke="#eab308" stroke-width="1.5" />
      <line x1="86" y1="46" x2="86" y2="110" stroke="#eab308" stroke-width="1.5" />
      <!-- Green Leaves Peeling Back -->
      <path d="M 64 68 Q 48 90 54 116 Q 72 108 72 96" fill="#22c55e" stroke="#15803d" stroke-width="1.2" />
      <path d="M 96 68 Q 112 90 106 116 Q 88 108 88 96" fill="#22c55e" stroke="#15803d" stroke-width="1.2" />`;
      return wrapSvg(art, '#ca8a04', '🌽 ' + cleanTitle, '#fefce8');
    }

    if (name.includes('BEETROOT') || name.includes('CHUKANDAR') || name.includes('BEET')) {
      const art = `
      <!-- Deep Red Beetroot -->
      <circle cx="80" cy="80" r="34" fill="#881337" stroke="#4c0519" stroke-width="1.5" />
      <path d="M 80 114 L 80 126" stroke="#4c0519" stroke-width="3" stroke-linecap="round" />
      <path d="M 80 46 Q 74 24 64 20 M 80 46 Q 86 24 96 20" stroke="#15803d" stroke-width="3" stroke-linecap="round" fill="none" />`;
      return wrapSvg(art, '#881337', '🟣 ' + cleanTitle, '#ffe4e6');
    }

    // =========================================================================
    // ==================== 3. FRESH FRUITS (HAR EK FRUIT) =====================
    // =========================================================================

    // Apple / Seb
    if (name.includes('APPLE') || name.includes('SEB') || name.includes('SAIB')) {
      const art = `
      <defs>
        <radialGradient id="appGrad_${idStr}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#f87171" />
          <stop offset="40%" stop-color="#ef4444" />
          <stop offset="85%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#991b1b" />
        </radialGradient>
      </defs>
      <!-- Juicy Crisp Red Apple -->
      <path d="M 80 50 C 72 44, 48 48, 48 76 C 48 104, 72 118, 80 118 C 88 118, 112 104, 112 76 C 112 48, 88 44, 80 50 Z" fill="url(#appGrad_${idStr})" stroke="#7f1d1d" stroke-width="1.4" />
      <ellipse cx="64" cy="66" rx="10" ry="6" transform="rotate(-30 64 66)" fill="#ffffff" opacity="0.6" />
      <!-- Apple Stem and Leaf -->
      <path d="M 80 50 Q 84 32 92 28" fill="none" stroke="#78350f" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 84 38 Q 98 32 102 44 Q 88 44 84 38 Z" fill="#22c55e" stroke="#15803d" stroke-width="0.8" />`;
      return wrapSvg(art, '#b91c1c', '🍎 ' + cleanTitle, '#fef2f2');
    }

    // Banana / Kela
    if (name.includes('BANANA') || name.includes('KELA')) {
      const art = `
      <defs>
        <linearGradient id="banGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef9c3" />
          <stop offset="40%" stop-color="#facc15" />
          <stop offset="85%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
      </defs>
      <!-- Curved Golden Yellow Banana -->
      <path d="M 50 48 C 50 88, 76 116, 118 106 C 104 112, 70 102, 54 74 C 48 64, 48 54, 50 48 Z" fill="url(#banGrad_${idStr})" stroke="#a16207" stroke-width="1.4" />
      <rect x="48" y="44" width="6" height="8" rx="2" fill="#15803d" />
      <rect x="116" y="102" width="5" height="5" rx="1" fill="#78350f" />`;
      return wrapSvg(art, '#ca8a04', '🍌 ' + cleanTitle, '#fefce8');
    }

    // Mango / Aam
    if (name.includes('MANGO') || name.includes('AAM')) {
      const art = `
      <defs>
        <radialGradient id="manGrad_${idStr}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="40%" stop-color="#fb923c" />
          <stop offset="85%" stop-color="#ea580c" />
          <stop offset="100%" stop-color="#c2410c" />
        </radialGradient>
      </defs>
      <!-- Plump Alphonso Mango -->
      <path d="M 80 44 C 108 44, 118 78, 102 108 C 88 122, 60 114, 54 94 C 46 68, 62 44, 80 44 Z" fill="url(#manGrad_${idStr})" stroke="#9a3412" stroke-width="1.4" />
      <path d="M 80 44 L 80 30" stroke="#78350f" stroke-width="3" stroke-linecap="round" />
      <path d="M 80 34 Q 96 26 98 38 Q 88 40 80 34 Z" fill="#22c55e" />`;
      return wrapSvg(art, '#ea580c', '🥭 ' + cleanTitle, '#fff7ed');
    }

    // Orange / Mosambi / Santra
    if (
      name.includes('ORANGE') ||
      name.includes('SANTRA') ||
      name.includes('MOSAMBI') ||
      name.includes('KINNOW') ||
      name.includes('CITRUS')
    ) {
      const art = `
      <defs>
        <radialGradient id="orGrad_${idStr}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#fdba74" />
          <stop offset="40%" stop-color="#f97316" />
          <stop offset="85%" stop-color="#ea580c" />
          <stop offset="100%" stop-color="#c2410c" />
        </radialGradient>
      </defs>
      <!-- Bright Round Juicy Orange -->
      <circle cx="80" cy="80" r="38" fill="url(#orGrad_${idStr})" stroke="#9a3412" stroke-width="1.4" />
      <ellipse cx="66" cy="64" rx="12" ry="7" transform="rotate(-30 66 64)" fill="#ffffff" opacity="0.55" />
      <circle cx="80" cy="44" r="3" fill="#15803d" />
      <path d="M 80 44 Q 90 34 94 40 Q 86 44 80 44 Z" fill="#22c55e" />`;
      return wrapSvg(art, '#ea580c', '🍊 ' + cleanTitle, '#fff7ed');
    }

    // Grapes / Angoor
    if (name.includes('GRAPES') || name.includes('ANGOOR') || name.includes('GRAPE')) {
      const isBlack = name.includes('BLACK') || name.includes('KALA');
      const grapeCol = isBlack ? '#581c87' : '#22c55e';
      const art = `
      <!-- Bunch of Juicy Grapes -->
      <path d="M 80 36 L 80 24" stroke="#78350f" stroke-width="3" stroke-linecap="round" />
      <circle cx="68" cy="48" r="10" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />
      <circle cx="92" cy="48" r="10" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />
      <circle cx="80" cy="54" r="11" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />
      <circle cx="62" cy="68" r="10.5" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />
      <circle cx="80" cy="72" r="11.5" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />
      <circle cx="98" cy="68" r="10.5" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />
      <circle cx="70" cy="90" r="10" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />
      <circle cx="90" cy="90" r="10" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />
      <circle cx="80" cy="106" r="9" fill="${grapeCol}" stroke="#0f172a" stroke-width="0.8" />`;
      return wrapSvg(art, isBlack ? '#581c87' : '#15803d', '🍇 ' + cleanTitle, '#f3e8ff');
    }

    // Papaya / Papita
    if (name.includes('PAPAYA') || name.includes('PAPITA')) {
      const art = `
      <defs>
        <radialGradient id="papGrad_${idStr}" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="40%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#ea580c" />
        </radialGradient>
      </defs>
      <!-- Pear-shaped Sweet Papaya -->
      <path d="M 80 42 C 94 42, 102 56, 98 74 C 110 88, 108 112, 80 118 C 52 112, 50 88, 62 74 C 58 56, 66 42, 80 42 Z" fill="url(#papGrad_${idStr})" stroke="#c2410c" stroke-width="1.4" />
      <path d="M 80 42 L 80 30" stroke="#15803d" stroke-width="3.5" stroke-linecap="round" />`;
      return wrapSvg(art, '#ea580c', '🍈 ' + cleanTitle, '#fff7ed');
    }

    // Watermelon / Tarbooz / Melon
    if (
      name.includes('WATERMELON') ||
      name.includes('TARBOOZ') ||
      name.includes('TARBUZ') ||
      name.includes('MELON') ||
      name.includes('KHARBOOZA')
    ) {
      const art = `
      <!-- Juicy Watermelon Slice -->
      <path d="M 38 60 C 50 118, 110 118, 122 60 Z" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
      <path d="M 44 64 C 54 110, 106 110, 116 64 Z" fill="#ffffff" />
      <path d="M 48 66 C 56 106, 104 106, 112 66 Z" fill="#ef4444" />
      <!-- Black Seeds -->
      <circle cx="68" cy="78" r="2" fill="#0f172a" />
      <circle cx="80" cy="88" r="2.2" fill="#0f172a" />
      <circle cx="92" cy="78" r="2" fill="#0f172a" />
      <circle cx="80" cy="72" r="2" fill="#0f172a" />`;
      return wrapSvg(art, '#dc2626', '🍉 ' + cleanTitle, '#fef2f2');
    }

    // Pomegranate / Anar
    if (name.includes('POMEGRANATE') || name.includes('ANAR')) {
      const art = `
      <!-- Ruby Red Pomegranate with Crown -->
      <circle cx="80" cy="82" r="36" fill="#be123c" stroke="#881337" stroke-width="1.5" />
      <!-- Calyx Crown Top -->
      <polygon points="74,48 70,36 76,42 80,34 84,42 90,36 86,48" fill="#be123c" stroke="#881337" stroke-width="1" />
      <ellipse cx="66" cy="68" rx="10" ry="6" transform="rotate(-30 66 68)" fill="#ffffff" opacity="0.5" />`;
      return wrapSvg(art, '#881337', '🍎 ' + cleanTitle, '#ffe4e6');
    }

    // Pineapple / Ananas
    if (name.includes('PINEAPPLE') || name.includes('ANANAS')) {
      const art = `
      <!-- Tropical Pineapple with Spiky Crown Leaves -->
      <path d="M 80 48 L 74 26 L 80 36 L 86 24 L 88 38 L 96 28 L 88 48" fill="#15803d" stroke="#14532d" stroke-width="1" />
      <rect x="54" y="48" width="52" height="66" rx="20" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" />
      <!-- Diamond Texture -->
      <line x1="58" y1="62" x2="102" y2="100" stroke="#b45309" stroke-width="1.5" />
      <line x1="58" y1="84" x2="90" y2="112" stroke="#b45309" stroke-width="1.5" />
      <line x1="102" y1="62" x2="58" y2="100" stroke="#b45309" stroke-width="1.5" />
      <line x1="102" y1="84" x2="70" y2="112" stroke="#b45309" stroke-width="1.5" />`;
      return wrapSvg(art, '#b45309', '🍍 ' + cleanTitle, '#fefce8');
    }

    // Coconut / Nariyal
    if (name.includes('COCONUT') || name.includes('NARIYAL')) {
      const art = `
      <!-- Fresh Tender / Brown Coconut -->
      <circle cx="80" cy="80" r="36" fill="#78350f" stroke="#451a03" stroke-width="1.8" />
      <circle cx="72" cy="66" r="3.5" fill="#451a03" />
      <circle cx="88" cy="66" r="3.5" fill="#451a03" />
      <circle cx="80" cy="76" r="3.5" fill="#451a03" />`;
      return wrapSvg(art, '#78350f', '🥥 ' + cleanTitle, '#fefce8');
    }

    // Guava / Amrood
    if (name.includes('GUAVA') || name.includes('AMROOD') || name.includes('AMRUD')) {
      const art = `
      <!-- Sweet Green Guava -->
      <circle cx="80" cy="80" r="36" fill="#84cc16" stroke="#4d7c0f" stroke-width="1.5" />
      <circle cx="80" cy="46" r="3" fill="#4d7c0f" />
      <path d="M 80 46 L 80 34" stroke="#78350f" stroke-width="3" stroke-linecap="round" />`;
      return wrapSvg(art, '#4d7c0f', '🍈 ' + cleanTitle, '#f7fee7');
    }

    // Strawberry / Berries
    if (name.includes('STRAWBERRY') || name.includes('BERRY') || name.includes('CHERRY')) {
      const art = `
      <!-- Sweet Red Strawberry with Seeds -->
      <path d="M 80 48 L 74 36 L 79 44 L 70 42 L 78 50 L 86 50 L 92 42 L 83 44 L 88 36 Z" fill="#15803d" />
      <path d="M 54 52 C 50 82, 70 114, 80 118 C 90 114, 110 82, 106 52 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.4" />
      <!-- Golden Strawberry Seeds -->
      <circle cx="68" cy="64" r="1.5" fill="#fde047" />
      <circle cx="80" cy="68" r="1.5" fill="#fde047" />
      <circle cx="92" cy="64" r="1.5" fill="#fde047" />
      <circle cx="74" cy="82" r="1.5" fill="#fde047" />
      <circle cx="86" cy="82" r="1.5" fill="#fde047" />
      <circle cx="80" cy="98" r="1.5" fill="#fde047" />`;
      return wrapSvg(art, '#b91c1c', '🍓 ' + cleanTitle, '#fef2f2');
    }

    // =========================================================================
    // ================= 4. GRAINS, DALS & PULSES (HAR EK GRAIN/DAL) ============
    // =========================================================================

    // Rice / Chawal / Basmati / Poha
    if (
      name.includes('RICE') ||
      name.includes('CHAWAL') ||
      name.includes('BASMATI') ||
      name.includes('POHA') ||
      name.includes('SELA') ||
      name.includes('BIRYANI RICE')
    ) {
      const art = `
      <defs>
        <linearGradient id="riceGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>
      </defs>
      <!-- Traditional Jute Burlap Rice Sack -->
      <path d="M 48 46 L 112 46 L 118 118 C 118 124, 42 124, 42 118 Z" fill="#d97706" stroke="#92400e" stroke-width="1.5" />
      <rect x="44" y="40" width="72" height="10" rx="3" fill="#b45309" stroke="#78350f" stroke-width="1" />
      <!-- Label Banner -->
      <rect x="52" y="66" width="56" height="34" rx="4" fill="url(#riceGrad_${idStr})" stroke="#94a3b8" stroke-width="1" />
      <text x="80" y="80" font-size="8.5" font-weight="900" fill="#92400e" text-anchor="middle" font-family="sans-serif">BASMATI</text>
      <text x="80" y="92" font-size="6.5" font-weight="800" fill="#b45309" text-anchor="middle" font-family="sans-serif">ROYAL RICE</text>
      <!-- Pure White Rice Grains Spilling -->
      <ellipse cx="64" cy="38" rx="6" ry="2.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.7" transform="rotate(-20 64 38)" />
      <ellipse cx="80" cy="36" rx="7" ry="2.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.7" />
      <ellipse cx="96" cy="38" rx="6" ry="2.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.7" transform="rotate(20 96 38)" />`;
      return wrapSvg(art, '#92400e', '🌾 ' + cleanTitle, '#fefce8');
    }

    // Wheat, Atta, Maida, Suji, Besan, Flour
    if (
      name.includes('ATTA') ||
      name.includes('WHEAT') ||
      name.includes('GEHUN') ||
      name.includes('GEHU') ||
      name.includes('FLOUR') ||
      name.includes('MAIDA') ||
      name.includes('BESAN') ||
      name.includes('SUJI') ||
      name.includes('SOOJI') ||
      name.includes('RAVA') ||
      name.includes('DALIA')
    ) {
      const art = `
      <defs>
        <linearGradient id="flourGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fed7aa" />
          <stop offset="60%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#c2410c" />
        </linearGradient>
      </defs>
      <!-- Kraft Paper Sack -->
      <path d="M 52 44 L 108 44 L 114 118 C 114 122, 46 122, 46 118 Z" fill="url(#flourGrad_${idStr})" stroke="#9a3412" stroke-width="1.4" />
      <rect x="48" y="38" width="64" height="8" rx="2" fill="#c2410c" />
      <circle cx="80" cy="80" r="16" fill="#ffffff" />
      <text x="80" y="84" font-size="12" text-anchor="middle">🌾</text>
      <text x="80" y="94" font-size="6.5" font-weight="900" fill="#9a3412" text-anchor="middle" font-family="sans-serif">CHAKKI FRESH</text>`;
      return wrapSvg(art, '#9a3412', '🌾 ' + cleanTitle, '#fff7ed');
    }

    // Dals & Pulses: Chana, Moong, Urad, Toor, Arhar, Masoor, Rajma, Chole
    if (
      name.includes('DAL') ||
      name.includes('DAAL') ||
      name.includes('CHANA') ||
      name.includes('MOONG') ||
      name.includes('URAD') ||
      name.includes('TOOR') ||
      name.includes('ARHAR') ||
      name.includes('MASOOR') ||
      name.includes('RAJMA') ||
      name.includes('CHOLE') ||
      name.includes('CHHOLE') ||
      name.includes('PULSE')
    ) {
      let dalCol = '#facc15';
      let dalTag = 'SHUDH DAL';
      if (name.includes('MOONG')) {
        dalCol = '#4ade80';
        dalTag = 'MOONG DAL';
      } else if (name.includes('URAD')) {
        dalCol = '#1e293b';
        dalTag = 'URAD DAL';
      } else if (name.includes('MASOOR')) {
        dalCol = '#fb923c';
        dalTag = 'MASOOR DAL';
      } else if (name.includes('RAJMA')) {
        dalCol = '#881337';
        dalTag = 'ROYAL RAJMA';
      } else if (name.includes('CHANA') || name.includes('CHOLE')) {
        dalCol = '#f59e0b';
        dalTag = 'CHANA DAL';
      }

      const art = `
      <!-- Pouch with Transparent Window Showing Pulses -->
      <path d="M 50 42 L 110 42 L 114 118 C 114 122, 46 122, 46 118 Z" fill="#047857" stroke="#064e3b" stroke-width="1.4" />
      <rect x="46" y="36" width="68" height="8" rx="2" fill="#065f46" />
      <!-- Transparent Window with Dal Grains -->
      <circle cx="80" cy="80" r="22" fill="#ffffff" stroke="#ca8a04" stroke-width="1.5" />
      <circle cx="80" cy="80" r="18" fill="${dalCol}" />
      <circle cx="74" cy="74" r="3" fill="#ffffff" opacity="0.6" />
      <circle cx="84" cy="74" r="3" fill="#ffffff" opacity="0.6" />
      <circle cx="78" cy="84" r="3" fill="#ffffff" opacity="0.6" />
      <text x="80" y="110" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${dalTag}</text>`;
      return wrapSvg(art, '#047857', '🍲 ' + cleanTitle, '#ecfdf5');
    }

    // Oats, Millets, Bajra, Jowar, Barley, Ragi
    if (
      name.includes('OATS') ||
      name.includes('OATMEAL') ||
      name.includes('BARLEY') ||
      name.includes('BAJRA') ||
      name.includes('JOWAR') ||
      name.includes('RAGI')
    ) {
      const art = `
      <!-- Healthy Cereal Box / Canister -->
      <rect x="52" y="40" width="56" height="78" rx="5" fill="#ca8a04" stroke="#854d0e" stroke-width="1.5" />
      <circle cx="80" cy="74" r="18" fill="#ffffff" />
      <text x="80" y="78" font-size="14" text-anchor="middle">🥣</text>
      <text x="80" y="104" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">100% WHOLE GRAIN</text>`;
      return wrapSvg(art, '#854d0e', '🌾 ' + cleanTitle, '#fefce8');
    }

    // =========================================================================
    // ================= 5. FMCG, DAIRY, CONFECTIONERY & BEVERAGES =============
    // =========================================================================

    // Chocolates & Confectionery
    if (
      name.includes('CHOCOLATE') ||
      name.includes('CADBURY') ||
      name.includes('SILK') ||
      name.includes('KITKAT') ||
      name.includes('CANDY') ||
      name.includes('TOFFEE')
    ) {
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
      <rect x="54" y="32" width="52" height="36" rx="4" fill="url(#chocBar_${idStr})" stroke="#291002" stroke-width="1" />
      <rect x="58" y="36" width="20" height="13" rx="2" fill="#5c2406" stroke="#291002" stroke-width="0.8" />
      <rect x="82" y="36" width="20" height="13" rx="2" fill="#5c2406" stroke="#291002" stroke-width="0.8" />
      <polygon points="52,62 108,62 104,70 56,70" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <rect x="50" y="66" width="60" height="52" rx="4" fill="url(#chocWrap_${idStr})" stroke="#3b0764" stroke-width="1.2" />
      <ellipse cx="80" cy="90" rx="20" ry="10" fill="#eab308" opacity="0.9" />
      <text x="80" y="93" font-size="7.5" font-weight="900" fill="#3b0764" text-anchor="middle" font-family="sans-serif">SILK</text>`;
      return wrapSvg(art, '#581c87', '🍫 ' + cleanTitle, '#f3e8ff');
    }

    // Noodles & Pasta
    if (
      name.includes('MAGGI') ||
      name.includes('NOODLE') ||
      name.includes('PASTA') ||
      name.includes('CHOWMEIN') ||
      name.includes('MACARONI') ||
      name.includes('YIPPEE')
    ) {
      const art = `
      <defs>
        <linearGradient id="noodBowl_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444" />
          <stop offset="60%" stop-color="#b91c1c" />
          <stop offset="100%" stop-color="#7f1d1d" />
        </linearGradient>
      </defs>
      <path d="M 44 68 C 44 110, 116 110, 116 68 Z" fill="url(#noodBowl_${idStr})" stroke="#991b1b" stroke-width="1.5" />
      <ellipse cx="80" cy="68" rx="36" ry="10" fill="#fde047" stroke="#ca8a04" stroke-width="1.5" />
      <path d="M 52 66 Q 60 56 68 64 Q 76 54 84 64 Q 92 56 100 64" fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round" />
      <path d="M 56 60 Q 64 50 72 58 Q 80 48 88 58 Q 96 50 104 58" fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="68" cy="64" r="3" fill="#16a34a" />
      <circle cx="88" cy="62" r="3" fill="#16a34a" />
      <line x1="90" y1="36" x2="124" y2="24" stroke="#78350f" stroke-width="2.8" stroke-linecap="round" />
      <line x1="86" y1="42" x2="120" y2="30" stroke="#78350f" stroke-width="2.8" stroke-linecap="round" />`;
      return wrapSvg(art, '#b91c1c', '🍜 ' + cleanTitle, '#fef08a');
    }

    // Snacks, Namkeen & Chips
    if (
      name.includes('HALDIRAM') ||
      name.includes('MIXTURE') ||
      name.includes('BHUJIA') ||
      name.includes('NAMKEEN') ||
      name.includes('SEV') ||
      name.includes('CHIPS') ||
      name.includes('LAYS') ||
      name.includes('KURKURE') ||
      name.includes('WAFERS') ||
      name.includes('SNACK')
    ) {
      const art = `
      <defs>
        <linearGradient id="pouchGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="40%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#dc2626" />
        </linearGradient>
      </defs>
      <path d="M 54 36 L 106 36 L 114 116 C 114 120, 46 120, 46 116 Z" fill="url(#pouchGrad_${idStr})" stroke="#b45309" stroke-width="1.2" />
      <rect x="52" y="32" width="56" height="6" rx="2" fill="#c2410c" />
      <circle cx="80" cy="74" r="20" fill="#ffffff" stroke="#f59e0b" stroke-width="1.5" />
      <text x="80" y="80" font-size="16" text-anchor="middle">🍿</text>
      <rect x="58" y="96" width="44" height="12" rx="3" fill="#78350f" />
      <text x="80" y="105" font-size="6.5" font-weight="900" fill="#fef08a" text-anchor="middle" font-family="sans-serif">CRISPY</text>`;
      return wrapSvg(art, '#c2410c', '🍿 ' + cleanTitle, '#fff7ed');
    }

    // Soap & Personal Care
    if (
      name.includes('SOAP') ||
      name.includes('SABUN') ||
      name.includes('DETTOL') ||
      name.includes('LIFEBUOY') ||
      name.includes('LUX') ||
      name.includes('DOVE') ||
      name.includes('PEARS') ||
      name.includes('BATH')
    ) {
      const art = `
      <defs>
        <linearGradient id="soapGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a7f3d0" />
          <stop offset="40%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
      </defs>
      <path d="M 50 68 C 44 48, 116 48, 110 68 L 112 94 C 116 114, 44 114, 48 94 Z" fill="url(#soapGrad_${idStr})" stroke="#065f46" stroke-width="1.2" />
      <ellipse cx="80" cy="78" rx="22" ry="10" fill="none" stroke="#ecfdf5" stroke-width="1.5" />
      <text x="80" y="81.5" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">SOAP</text>
      <circle cx="108" cy="50" r="7" fill="#ffffff" opacity="0.65" stroke="#99f6e4" stroke-width="1" />
      <circle cx="118" cy="42" r="4.5" fill="#ffffff" opacity="0.65" stroke="#99f6e4" stroke-width="1" />`;
      return wrapSvg(art, '#047857', '🧼 ' + cleanTitle, '#ecfdf5');
    }

    // Toothpaste
    if (
      name.includes('TOOTHPASTE') ||
      name.includes('COLGATE') ||
      name.includes('PEPSODENT') ||
      name.includes('CLOSEUP') ||
      name.includes('BRUSH') ||
      name.includes('DANT')
    ) {
      const art = `
      <defs>
        <linearGradient id="pasteGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#dc2626" />
          <stop offset="50%" stop-color="#ef4444" />
          <stop offset="100%" stop-color="#b91c1c" />
        </linearGradient>
      </defs>
      <path d="M 44 40 L 116 40 L 104 116 C 104 120, 56 120, 56 116 Z" fill="url(#pasteGrad_${idStr})" stroke="#991b1b" stroke-width="1.2" />
      <rect x="66" y="28" width="28" height="12" rx="3" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />
      <path d="M 52 64 Q 80 84 108 64 Q 80 94 52 74 Z" fill="#ffffff" opacity="0.95" />
      <text x="80" y="104" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">MAX FRESH</text>`;
      return wrapSvg(art, '#b91c1c', '🪥 ' + cleanTitle, '#fee2e2');
    }

    // Beverages & Cold Drinks
    if (
      name.includes('COCA') ||
      name.includes('COLA') ||
      name.includes('PEPSI') ||
      name.includes('SPRITE') ||
      name.includes('THUMS') ||
      name.includes('FANTA') ||
      name.includes('LIMCA') ||
      name.includes('JUICE') ||
      name.includes('COLD DRINK') ||
      name.includes('SOFT DRINK') ||
      name.includes('SODA') ||
      name.includes('BEVERAGE')
    ) {
      const art = `
      <defs>
        <linearGradient id="canGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444" />
          <stop offset="50%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#991b1b" />
        </linearGradient>
      </defs>
      <rect x="58" y="44" width="44" height="74" rx="8" fill="url(#canGrad_${idStr})" stroke="#b91c1c" stroke-width="1.2" />
      <ellipse cx="80" cy="44" rx="22" ry="6" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <ellipse cx="80" cy="118" rx="22" ry="6" fill="#991b1b" />
      <path d="M 58 74 Q 80 88 102 74 L 102 86 Q 80 100 58 86 Z" fill="#ffffff" opacity="0.9" />`;
      return wrapSvg(art, '#b91c1c', '🥤 ' + cleanTitle, '#fee2e2');
    }

    // Milk & Dairy
    if (
      name.includes('MILK') ||
      name.includes('DOODH') ||
      name.includes('TAAZA') ||
      name.includes('TONED') ||
      name.includes('AMUL') ||
      name.includes('DAIRY')
    ) {
      const art = `
      <defs>
        <linearGradient id="milkGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#e2e8f0" />
          <stop offset="40%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
      </defs>
      <path d="M 68 34 L 92 34 L 92 48 L 104 62 L 104 120 C 104 124, 56 124, 56 120 L 56 62 L 68 48 Z" fill="url(#milkGrad_${idStr})" stroke="#94a3b8" stroke-width="1.2" />
      <rect x="66" y="28" width="28" height="8" rx="2" fill="#0284c7" />
      <circle cx="80" cy="85" r="16" fill="#0284c7" />
      <path d="M 80 75 Q 86 85 80 92 Q 74 85 80 75 Z" fill="#ffffff" />
      <text x="80" y="112" font-size="7" font-weight="900" fill="#0284c7" text-anchor="middle" font-family="sans-serif">PURE MILK</text>`;
      return wrapSvg(art, '#0284c7', '🥛 ' + cleanTitle, '#f0f9ff');
    }

    // Cooking Oil & Ghee
    if (
      name.includes('OIL') ||
      name.includes('GHEE') ||
      name.includes('SUNLITE') ||
      name.includes('FORTUNE') ||
      name.includes('REFINED') ||
      name.includes('MUSTARD') ||
      name.includes('SOYA') ||
      name.includes('TEL')
    ) {
      const art = `
      <defs>
        <linearGradient id="oilGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
      </defs>
      <path d="M 68 36 L 92 36 L 92 48 L 104 64 L 104 120 C 104 124, 56 124, 56 120 L 56 64 L 68 48 Z" fill="url(#oilGrad_${idStr})" opacity="0.95" stroke="#a16207" stroke-width="1.2" />
      <rect x="66" y="28" width="28" height="9" rx="2" fill="#ca8a04" />
      <circle cx="80" cy="88" r="15" fill="#ffffff" />
      <path d="M 80 78 Q 86 88 80 96 Q 74 88 80 78 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1" />
      <text x="80" y="112" font-size="6.5" font-weight="900" fill="#a16207" text-anchor="middle" font-family="sans-serif">REFINED OIL</text>`;
      return wrapSvg(art, '#a16207', '🛢️ ' + cleanTitle, '#fefce8');
    }

    // Salt & Seasoning
    if (name.includes('SALT') || name.includes('NAMAK') || name.includes('SENDHA')) {
      const art = `
      <defs>
        <linearGradient id="saltGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0c4a6e" />
        </linearGradient>
      </defs>
      <path d="M 52 46 L 108 46 L 114 116 C 114 120, 46 120, 46 116 Z" fill="url(#saltGrad_${idStr})" stroke="#075985" stroke-width="1.2" />
      <ellipse cx="80" cy="80" rx="20" ry="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />
      <polygon points="80,62 94,80 66,80" fill="#ffffff" />
      <text x="80" y="104" font-size="7.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">100% PURE SALT</text>`;
      return wrapSvg(art, '#0369a1', '🧂 ' + cleanTitle, '#f0f9ff');
    }

    // Biscuits & Cookies
    if (
      name.includes('BISCUIT') ||
      name.includes('PARLE') ||
      name.includes('COOKIE') ||
      name.includes('GOOD DAY') ||
      name.includes('OREO') ||
      name.includes('MARIE') ||
      name.includes('RUSK')
    ) {
      const art = `
      <defs>
        <radialGradient id="cookGrad_${idStr}" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="40%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#92400e" />
        </radialGradient>
      </defs>
      <rect x="44" y="44" width="72" height="72" rx="14" fill="url(#cookGrad_${idStr})" stroke="#78350f" stroke-width="1.8" />
      <rect x="52" y="52" width="56" height="56" rx="10" fill="none" stroke="#b45309" stroke-width="1.2" stroke-dasharray="4 3" />
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

    // Bread & Bakery
    if (
      name.includes('BREAD') ||
      name.includes('PAV') ||
      name.includes('ROTI') ||
      name.includes('BUN') ||
      name.includes('TOAST') ||
      name.includes('CAKE') ||
      name.includes('BAKERY')
    ) {
      const art = `
      <defs>
        <linearGradient id="breadGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#78350f" />
        </linearGradient>
      </defs>
      <path d="M 44 80 C 44 48, 116 48, 116 80 L 112 114 C 112 118, 48 118, 48 114 Z" fill="url(#breadGrad_${idStr})" stroke="#78350f" stroke-width="1.5" />
      <path d="M 58 64 Q 68 56 74 68" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M 76 60 Q 86 52 92 64" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none" />`;
      return wrapSvg(art, '#78350f', '🍞 ' + cleanTitle, '#fffbeb');
    }

    // Tea & Coffee
    if (
      name.includes('COFFEE') ||
      name.includes('NESCAFE') ||
      name.includes('BRU') ||
      name.includes('TEA') ||
      name.includes('CHAI') ||
      name.includes('TAJ MAHAL') ||
      name.includes('RED LABEL')
    ) {
      const art = `
      <defs>
        <linearGradient id="cofGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#78350f" />
          <stop offset="50%" stop-color="#451a03" />
          <stop offset="100%" stop-color="#291002" />
        </linearGradient>
      </defs>
      <rect x="54" y="44" width="52" height="74" rx="8" fill="url(#cofGrad_${idStr})" stroke="#451a03" stroke-width="1.2" />
      <rect x="58" y="36" width="44" height="10" rx="3" fill="#dc2626" />
      <rect x="58" y="68" width="44" height="30" rx="3" fill="#fbbf24" />
      <text x="80" y="82" font-size="8" font-weight="900" fill="#78350f" text-anchor="middle" font-family="sans-serif">CHAI / COFFEE</text>`;
      return wrapSvg(art, '#451a03', '☕ ' + cleanTitle, '#fffbeb');
    }

    // =========================================================================
    // ================= 6. INDUSTRIAL COATINGS, CHEMICALS & POLYMERS ==========
    // =========================================================================

    // Industrial Paints, Sealers, Primers & Hardeners
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
      <path d="M 46 48 L 48 120 C 48 126, 112 126, 112 120 L 114 48 Z" fill="url(#canBody_${idStr})" stroke="#1e293b" stroke-width="1.2" />
      <ellipse cx="80" cy="48" rx="34" ry="7" fill="#cbd5e1" stroke="#64748b" stroke-width="1" />
      <path d="M 44 50 C 44 24, 116 24, 116 50" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
      <rect x="52" y="66" width="56" height="42" rx="4" fill="#ffffff" opacity="0.96" stroke="#cbd5e1" stroke-width="0.8" />
      <text x="80" y="78" font-size="7" font-weight="900" fill="${secColor}" text-anchor="middle" font-family="sans-serif">INDUSTRIAL</text>
      <circle cx="80" cy="90" r="7.5" fill="${swatchColor}" stroke="#334155" stroke-width="1.2" />
      <rect x="58" y="99" width="44" height="8" rx="2" fill="${mainColor}" />
      <text x="80" y="105.5" font-size="5.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${tag}</text>`;
      return wrapSvg(art, secColor, '🎨 ' + cleanTitle, '#f1f5f9');
    }

    // Granules / Pellets (P.P GRAULES, PP GRANULES, POLYMER PELLETS)
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
      <path d="M 48 50 L 112 50 L 118 118 C 118 124, 42 124, 42 118 Z" fill="url(#sackGrad_${idStr})" stroke="#475569" stroke-width="1.5" />
      <rect x="52" y="66" width="56" height="32" rx="4" fill="#0284c7" />
      <text x="80" y="80" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">PP PELLETS</text>
      <text x="80" y="92" font-size="6.5" font-weight="800" fill="#bae6fd" text-anchor="middle" font-family="sans-serif">RAW GRANULES</text>
      <circle cx="56" cy="44" r="5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="68" cy="40" r="5.5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="80" cy="38" r="6" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="92" cy="40" r="5.5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />
      <circle cx="104" cy="44" r="5" fill="url(#beadGrad_${idStr})" stroke="#0284c7" stroke-width="0.8" />`;
      return wrapSvg(art, '#0369a1', '🔹 ' + cleanTitle, '#f0f9ff');
    }

    // PP Raffia
    if (name.includes('RAFFIA')) {
      const art = `
      <defs>
        <linearGradient id="rafGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ecfdf5" />
          <stop offset="50%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
      </defs>
      <path d="M 50 46 L 110 46 L 116 118 C 116 123, 44 123, 44 118 Z" fill="url(#rafGrad_${idStr})" stroke="#064e3b" stroke-width="1.4" />
      <line x1="50" y1="52" x2="110" y2="52" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="4 2" />
      <line x1="44" y1="114" x2="116" y2="114" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="4 2" />
      <rect x="56" y="66" width="48" height="34" rx="4" fill="#ffffff" opacity="0.95" />
      <text x="80" y="80" font-size="8.5" font-weight="900" fill="#047857" text-anchor="middle" font-family="sans-serif">PP RAFFIA</text>
      <text x="80" y="93" font-size="6.5" font-weight="900" fill="#065f46" text-anchor="middle" font-family="sans-serif">HIGH TENACITY</text>`;
      return wrapSvg(art, '#047857', '🌾 ' + cleanTitle, '#ecfdf5');
    }

    // TT Powder
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

    // Strapping Rolls, Tape
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

    // =========================================================================
    // ================= 6B. CONSTRUCTION, STEEL & BUILDING MATERIALS =========
    // =========================================================================

    // --- Cement Bags (50 KG) ---
    if (
      name.includes('CEMENT') ||
      name.includes('ULTRATECH') ||
      name.includes('ACC ') ||
      name.includes('AMBUJA') ||
      name.includes('BIRLA') ||
      (variant.includes('CEMENT') || variant.includes('CONSTRUCTION'))
    ) {
      const art = `
      <defs>
        <linearGradient id="cementGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="45%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
      </defs>
      <!-- 50KG Woven Poly Cement Bag -->
      <path d="M 46 44 L 114 44 L 118 118 C 118 123, 42 123, 42 118 Z" fill="url(#cementGrad_${idStr})" stroke="#475569" stroke-width="1.6" />
      <line x1="46" y1="48" x2="114" y2="48" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 2" />
      <line x1="42" y1="114" x2="118" y2="114" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 2" />
      <rect x="52" y="60" width="56" height="38" rx="4" fill="#dc2626" stroke="#991b1b" stroke-width="1" />
      <text x="80" y="74" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">CEMENT</text>
      <text x="80" y="84" font-size="6" font-weight="800" fill="#fef08a" text-anchor="middle" font-family="sans-serif">50 KG NETT</text>
      <circle cx="80" cy="91" r="3.5" fill="#ffffff" />
      <rect x="88" y="100" width="18" height="9" rx="1.5" fill="#1e293b" />
      <text x="97" y="106.5" font-size="5" font-weight="900" fill="#ffffff" text-anchor="middle">ISI</text>`;
      return wrapSvg(art, '#b91c1c', '🧱 ' + cleanTitle, '#f8fafc');
    }

    // --- TMT Rebar / Steel Rods ---
    if (
      name.includes('TMT') ||
      name.includes('BAR') ||
      name.includes('SARIA') ||
      name.includes('REBAR') ||
      name.includes('STEEL ROD') ||
      name.includes('IRON ROD')
    ) {
      const art = `
      <defs>
        <linearGradient id="tmtGrad_${idStr}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="50%" stop-color="#64748b" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
      </defs>
      <!-- Heavy Ribbed Steel TMT Rebars Bundle -->
      <rect x="36" y="58" width="88" height="12" rx="3" fill="url(#tmtGrad_${idStr})" stroke="#1e293b" stroke-width="1.2" />
      <rect x="36" y="74" width="88" height="12" rx="3" fill="url(#tmtGrad_${idStr})" stroke="#1e293b" stroke-width="1.2" />
      <rect x="36" y="90" width="88" height="12" rx="3" fill="url(#tmtGrad_${idStr})" stroke="#1e293b" stroke-width="1.2" />
      <!-- Diagonal Rib Grips on Bars -->
      <g stroke="#ffffff" stroke-width="1.6" opacity="0.6">
        <line x1="46" y1="58" x2="52" y2="70" /><line x1="60" y1="58" x2="66" y2="70" /><line x1="74" y1="58" x2="80" y2="70" /><line x1="88" y1="58" x2="94" y2="70" /><line x1="102" y1="58" x2="108" y2="70" />
        <line x1="46" y1="74" x2="52" y2="86" /><line x1="60" y1="74" x2="66" y2="86" /><line x1="74" y1="74" x2="80" y2="86" /><line x1="88" y1="74" x2="94" y2="86" /><line x1="102" y1="74" x2="108" y2="86" />
        <line x1="46" y1="90" x2="52" y2="102" /><line x1="60" y1="90" x2="66" y2="102" /><line x1="74" y1="90" x2="80" y2="102" /><line x1="88" y1="90" x2="94" y2="102" /><line x1="102" y1="90" x2="108" y2="102" />
      </g>
      <!-- Blue Steel Strapping Binding Bands -->
      <rect x="52" y="54" width="8" height="52" rx="1.5" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />
      <rect x="100" y="54" width="8" height="52" rx="1.5" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />
      <rect x="66" y="66" width="28" height="16" rx="2" fill="#eab308" stroke="#ca8a04" stroke-width="0.8" />
      <text x="80" y="77" font-size="6" font-weight="900" fill="#78350f" text-anchor="middle">Fe 550D</text>`;
      return wrapSvg(art, '#334155', '🏗️ ' + cleanTitle, '#f8fafc');
    }

    // --- Aluminium Section / Architectural Channel ---
    if (
      name.includes('ALUMIN') ||
      name.includes('SECTION') ||
      name.includes('SACTION') ||
      name.includes('CHANNEL') ||
      name.includes('PROFILE') ||
      name.includes('EXTRUSION')
    ) {
      const art = `
      <defs>
        <linearGradient id="alumGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#e2e8f0" />
          <stop offset="70%" stop-color="#94a3b8" />
          <stop offset="100%" stop-color="#64748b" />
        </linearGradient>
      </defs>
      <!-- 3D Hollow Extruded Architectural Aluminium Box Section -->
      <path d="M 42 66 L 82 42 L 122 66 L 82 90 Z" fill="#ffffff" stroke="#64748b" stroke-width="1.4" />
      <path d="M 54 66 L 82 50 L 110 66 L 82 82 Z" fill="#334155" stroke="#475569" stroke-width="1" />
      <path d="M 42 66 L 82 90 L 82 118 L 42 94 Z" fill="url(#alumGrad_${idStr})" stroke="#475569" stroke-width="1.4" />
      <path d="M 82 90 L 122 66 L 122 94 L 82 118 Z" fill="#64748b" stroke="#334155" stroke-width="1.4" />
      <line x1="58" y1="76" x2="58" y2="104" stroke="#ffffff" stroke-width="2" opacity="0.6" stroke-linecap="round" />
      <text x="80" y="110" font-size="6" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">ANODIZED</text>`;
      return wrapSvg(art, '#475569', '📐 ' + cleanTitle, '#f8fafc');
    }

    // =========================================================================
    // ================= 6C. VARIANT GROUP CONTEXTUAL FALLBACKS ===============
    // =========================================================================
    // 1. Computer Hardware / Electronics Variant Group
    if (
      variant.includes('COMPUTER') ||
      variant.includes('HARDWARE') ||
      variant.includes('ELECTRONIC') ||
      variant.includes('IT ') ||
      variant.includes('PC ')
    ) {
      const art = `
      <defs>
        <linearGradient id="hwGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <!-- High-Tech Hardware Component PCB Box with Golden Contacts -->
      <rect x="36" y="42" width="88" height="76" rx="6" fill="#0f172a" stroke="#0284c7" stroke-width="1.6" />
      <rect x="42" y="48" width="76" height="42" rx="3" fill="#1e293b" />
      <rect x="68" y="56" width="24" height="24" rx="2" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
      <circle cx="80" cy="68" r="5" fill="#38bdf8" />
      <line x1="48" y1="68" x2="68" y2="68" stroke="#38bdf8" stroke-width="1.2" />
      <line x1="92" y1="68" x2="112" y2="68" stroke="#38bdf8" stroke-width="1.2" />
      <line x1="80" y1="48" x2="80" y2="56" stroke="#38bdf8" stroke-width="1.2" />
      <line x1="80" y1="80" x2="80" y2="90" stroke="#38bdf8" stroke-width="1.2" />
      <text x="80" y="104" font-size="7.5" font-weight="900" fill="#38bdf8" text-anchor="middle" font-family="monospace">HARDWARE</text>
      <rect x="46" y="118" width="68" height="4" fill="#facc15" />`;
      return wrapSvg(art, '#0284c7', '💻 ' + cleanTitle, '#f0f9ff');
    }

    // 2. Fresh Vegetables Variant Group
    if (variant.includes('VEG') || variant.includes('SABZI') || variant.includes('PRODUCE')) {
      const art = `
      <circle cx="80" cy="80" r="36" fill="#15803d" stroke="#14532d" stroke-width="1.4" />
      <ellipse cx="68" cy="68" rx="14" ry="8" fill="#4ade80" />
      <ellipse cx="92" cy="72" rx="12" ry="7" fill="#86efac" />
      <circle cx="80" cy="84" r="14" fill="#22c55e" />
      <path d="M 80 44 Q 80 24 86 20" stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round" />`;
      return wrapSvg(art, '#15803d', '🥦 ' + cleanTitle, '#f0fdf4');
    }

    // 3. Fruits Variant Group
    if (variant.includes('FRUIT') || variant.includes('FAL')) {
      const art = `
      <circle cx="70" cy="82" r="26" fill="#ef4444" stroke="#b91c1c" stroke-width="1.2" />
      <circle cx="94" cy="78" r="24" fill="#f97316" stroke="#c2410c" stroke-width="1.2" />
      <ellipse cx="64" cy="74" rx="8" ry="4" fill="#ffffff" opacity="0.6" />
      <path d="M 70 56 Q 74 44 80 40" stroke="#78350f" stroke-width="2.5" fill="none" stroke-linecap="round" />
      <path d="M 80 44 Q 92 38 94 48 Z" fill="#22c55e" />`;
      return wrapSvg(art, '#c2410c', '🍎 ' + cleanTitle, '#fff7ed');
    }

    // 4. Grains & Pulses Variant Group
    if (variant.includes('GRAIN') || variant.includes('DAL') || variant.includes('PULSE') || variant.includes('KIRANA') || variant.includes('GROCERY')) {
      const art = `
      <path d="M 50 46 L 110 46 L 116 118 C 116 123, 44 123, 44 118 Z" fill="#d97706" stroke="#92400e" stroke-width="1.4" />
      <rect x="46" y="40" width="68" height="8" rx="2" fill="#b45309" />
      <circle cx="80" cy="80" r="16" fill="#ffffff" />
      <text x="80" y="85" font-size="12" text-anchor="middle">🌾</text>
      <text x="80" y="106" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">GRAINS</text>`;
      return wrapSvg(art, '#92400e', '🌾 ' + cleanTitle, '#fefce8');
    }

    // 5. Industrial Paints / Chemicals Variant Group
    if (variant.includes('PAINT') || variant.includes('COATING') || variant.includes('CHEMICAL')) {
      const art = `
      <path d="M 46 48 L 48 120 C 48 126, 112 126, 112 120 L 114 48 Z" fill="#0284c7" stroke="#1e293b" stroke-width="1.2" />
      <ellipse cx="80" cy="48" rx="34" ry="7" fill="#cbd5e1" stroke="#64748b" stroke-width="1" />
      <rect x="52" y="66" width="56" height="42" rx="4" fill="#ffffff" opacity="0.96" />
      <text x="80" y="80" font-size="7" font-weight="900" fill="#0284c7" text-anchor="middle" font-family="sans-serif">COATING</text>
      <circle cx="80" cy="92" r="7" fill="#0284c7" />`;
      return wrapSvg(art, '#0369a1', '🎨 ' + cleanTitle, '#f1f5f9');
    }

    // =========================================================================
    // ================= 7. DYNAMIC PROCEDURAL PALETTE (FALLBACK) ==============
    // =========================================================================
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
    <circle cx="80" cy="76" r="14" fill="#ffffff" stroke="${pal.primary}" stroke-width="2" />
    <text x="80" y="80.5" font-size="10" font-weight="900" fill="${pal.tag}" text-anchor="middle" font-family="sans-serif">${cleanTitle.slice(0, 2).toUpperCase()}</text>`;
    return wrapSvg(art, pal.tag, pal.icon + ' ' + cleanTitle, pal.tint);
  }
};
