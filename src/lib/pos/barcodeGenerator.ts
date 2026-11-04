/**
 * LedgerX High-Resolution Vector Code-128 Barcode Generator & Label Printing Engine
 * 100% Offline, Zero external dependencies, Pixel-perfect SVG & CSS Print Rendering.
 */

// Code 128 Patterns (Table B)
// Each pattern represents 6 widths (bar, space, bar, space, bar, space) summing to 11 modules
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is STOP)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encodes an ASCII string into Code128B pattern
 */
export function encodeCode128B(text: string): { modules: number[]; checksum: number } {
  const clean = text.replace(/[^\x20-\x7E]/g, '');
  const charCodes: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    charCodes.push(code);
    checksum += code * (i + 1);
  }

  const checkValue = checksum % 103;
  charCodes.push(checkValue);
  charCodes.push(STOP_CODE);

  // Convert pattern strings to module widths
  const modules: number[] = [];
  for (const c of charCodes) {
    const pat = CODE128_PATTERNS[c] || CODE128_PATTERNS[0];
    for (let j = 0; j < pat.length; j++) {
      modules.push(parseInt(pat[j], 10));
    }
  }

  return { modules, checksum: checkValue };
}

/**
 * Generates an SVG string representation of a Code-128 Barcode
 */
export function generateBarcodeSvg(
  text: string,
  options: {
    height?: number;
    moduleWidth?: number;
    showText?: boolean;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    background?: string;
  } = {}
): string {
  const {
    height = 50,
    moduleWidth = 2,
    showText = true,
    fontSize = 11,
    fontFamily = 'monospace',
    color = '#000000',
    background = '#ffffff',
  } = options;

  const cleanText = (text || '').trim();
  if (!cleanText) return '';

  const { modules } = encodeCode128B(cleanText);

  // Calculate total modules
  const quietZone = 10; // 10 modules on each side
  const totalBarModules = modules.reduce((a, b) => a + b, 0);
  const totalModules = totalBarModules + quietZone * 2;
  const width = totalModules * moduleWidth;
  const textHeight = showText ? fontSize + 4 : 0;
  const totalHeight = height + textHeight;

  let x = quietZone * moduleWidth;
  let rects = '';
  let isBar = true;

  for (const m of modules) {
    const barW = m * moduleWidth;
    if (isBar) {
      rects += `<rect x="${x}" y="0" width="${barW}" height="${height}" fill="${color}" />`;
    }
    x += barW;
    isBar = !isBar;
  }

  const textElement = showText
    ? `<text x="${width / 2}" y="${height + fontSize}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="${color}" letter-spacing="2">${cleanText}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}" style="background:${background};display:block;margin:0 auto;">${rects}${textElement}</svg>`;
}

/**
 * Automatically calculates the next unique 7-digit numeric barcode
 * Matches image format (e.g. 1000256, 1000257...)
 */
export function generateNextUniqueBarcode(existingBarcodes: (string | number | undefined)[]): string {
  const numericCodes: number[] = [];
  for (const b of existingBarcodes) {
    if (!b) continue;
    const str = String(b).trim();
    if (/^\d{6,8}$/.test(str)) {
      numericCodes.push(parseInt(str, 10));
    }
  }

  if (numericCodes.length === 0) {
    return '1000256';
  }

  const maxCode = Math.max(...numericCodes);
  return String(Math.max(1000256, maxCode + 1));
}

export interface BarcodeLabelData {
  companyName: string;
  productName: string;
  barcode: string;
  mrp: number;
  retailPrice: number;
  expiryDate?: string;
  unit?: string;
  count?: number;
}

/**
 * Triggers browser print preview for a single item sticker or bulk catalog
 */
export function printBarcodeLabels(
  labels: BarcodeLabelData[],
  layout: 'roll_50x25' | 'a4_sheet' = 'roll_50x25'
) {
  if (typeof window === 'undefined') return;

  // Flatten based on count (e.g. if user wants 5 stickers of an item)
  const flattened: BarcodeLabelData[] = [];
  for (const item of labels) {
    const qty = Math.max(1, Math.min(500, Number(item.count) || 1));
    for (let i = 0; i < qty; i++) {
      flattened.push(item);
    }
  }

  if (flattened.length === 0) {
    alert('No items to print!');
    return;
  }

  const isRoll = layout === 'roll_50x25';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print Barcode Labels</title>
  <style>
    @page {
      size: ${isRoll ? '50mm 25mm' : 'A4 portrait'};
      margin: ${isRoll ? '0mm' : '8mm'};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, sans-serif;
      background: #ffffff;
      color: #000000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .labels-container {
      ${
        isRoll
          ? 'display: block;'
          : 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5mm; width: 100%;'
      }
    }
    .barcode-label {
      width: ${isRoll ? '50mm' : '100%'};
      height: ${isRoll ? '25mm' : '36mm'};
      padding: 1.5mm 2mm;
      border: ${isRoll ? 'none' : '1px dashed #cbd5e1'};
      page-break-inside: avoid;
      break-inside: avoid;
      ${isRoll ? 'page-break-after: always; break-after: page;' : ''}
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      overflow: hidden;
      background: #ffffff;
    }
    .company-title {
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .product-title {
      font-size: 8pt;
      font-weight: 900;
      color: #000000;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .barcode-img {
      max-width: 100%;
      height: ${isRoll ? '11mm' : '15mm'};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .barcode-img svg {
      max-width: 100%;
      height: 100%;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      font-size: 7pt;
      font-weight: bold;
      line-height: 1.1;
      border-top: 0.5px solid #000000;
      padding-top: 0.5mm;
    }
    .mrp-strike {
      color: #333333;
    }
    .retail-highlight {
      font-size: 7.5pt;
      font-weight: 900;
      color: #000000;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      font-size: 6pt;
      color: #222222;
      line-height: 1;
    }
  </style>
</head>
<body>
  <div class="labels-container">
    ${flattened
      .map(item => {
        const svg = generateBarcodeSvg(item.barcode, {
          height: isRoll ? 28 : 36,
          moduleWidth: 1.2,
          showText: true,
          fontSize: 9,
          color: '#000000',
        });
        const hasDiscount = item.mrp > item.retailPrice;
        return `
      <div class="barcode-label">
        <div class="company-title">${item.companyName || 'STORE'}</div>
        <div class="product-title">${item.productName}</div>
        <div class="barcode-img">${svg}</div>
        <div class="price-row">
          <span class="mrp-strike">MRP: ₹${Number(item.mrp || 0).toFixed(2)}</span>
          <span class="retail-highlight">OUR: ₹${Number(item.retailPrice || 0).toFixed(2)}</span>
        </div>
        <div class="meta-row">
          <span>${item.expiryDate ? 'EXP: ' + item.expiryDate : 'Incl. all taxes'}</span>
          <span>${hasDiscount ? 'SAVE ₹' + (item.mrp - item.retailPrice).toFixed(0) : ''}</span>
        </div>
      </div>
    `;
      })
      .join('')}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
`;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

