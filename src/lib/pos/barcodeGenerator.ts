/**
 * Pure TypeScript Code128 Barcode Generator & Label Printing Engine
 * 100% Offline, Zero External Dependencies, Works natively in Browser & Desktop
 */

// Code128 Auto/B pattern table (107 patterns)
// Each number represents widths of 3 bars and 3 spaces (sum of digits = 11, except stop pattern)
const CODE128_PATTERNS: number[] = [
  212222, 222122, 222221, 121223, 121322, 131222, 122213, 122312, 132212, 221213, // 0 - 9
  221312, 231212, 112232, 122132, 122231, 113222, 123122, 123221, 223211, 221132, // 10 - 19
  221231, 213212, 223112, 312131, 311222, 321122, 321221, 312212, 322112, 322211, // 20 - 29
  212123, 212321, 232121, 111323, 131123, 131321, 112313, 132113, 132311, 211313, // 30 - 39
  231113, 231311, 112133, 112331, 132131, 113123, 113321, 133121, 313121, 211331, // 40 - 49
  231131, 213113, 213311, 213131, 311123, 311321, 331121, 312113, 312311, 332111, // 50 - 59
  314111, 221411, 431111, 111224, 111422, 121124, 121421, 141122, 141221, 112214, // 60 - 69
  112412, 122114, 122411, 142112, 142211, 241211, 221114, 413111, 241112, 134111, // 70 - 79
  111242, 121142, 121241, 114212, 124112, 124211, 411212, 421112, 421211, 212141, // 80 - 89
  214121, 412121, 111143, 111341, 131141, 114113, 114311, 411113, 411311, 113141, // 90 - 99
  114131, 311141, 411131, 211412, 211214, 211232, 233111, // 100 - 106 (Start A, Start B, Start C, Stop)
];

const STOP_PATTERN = 2331112; // 7 digits for stop pattern

export interface BarcodeSvgOptions {
  height?: number;       // Height of bars in px (default 32)
  moduleWidth?: number;  // Width of single bar unit in px (default 1.2)
  showText?: boolean;    // Whether to display text beneath barcode (default true)
  fontSize?: number;     // Font size for text (default 10)
  color?: string;        // Barcode color (default '#000000')
  background?: string;   // Background color (default 'transparent')
}

/**
 * Encodes an alphanumeric string into Code128 bar/space sequence
 */
export function encodeCode128(text: string): { modules: number[]; encodedString: string } {
  const clean = String(text || '').trim();
  if (!clean) return { modules: [], encodedString: '' };

  const values: number[] = [];
  // Use Code 128 Set B (Start Code B = 104)
  values.push(104);

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      values.push(code - 32);
    } else {
      values.push(0); // Fallback space
    }
  }

  // Calculate checksum: (Start Code + sum(i * value[i])) % 103
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) {
    checksum += i * values[i];
  }
  values.push(checksum % 103);
  values.push(106); // Stop code

  // Convert values into 1s (bars) and 0s (spaces)
  const modules: number[] = [];
  for (let idx = 0; idx < values.length; idx++) {
    const v = values[idx];
    const pattern = idx === values.length - 1 ? STOP_PATTERN : CODE128_PATTERNS[v];
    const digits = String(pattern).split('').map(Number);
    let isBar = true;
    for (const width of digits) {
      for (let w = 0; w < width; w++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
  }

  return { modules, encodedString: clean };
}

/**
 * Generates an SVG string representation of Code128 barcode
 */
export function generateBarcodeSvg(text: string, options: BarcodeSvgOptions = {}): string {
  const {
    height = 30,
    moduleWidth = 1.1,
    showText = true,
    fontSize = 9,
    color = '#000000',
    background = 'transparent',
  } = options;

  const { modules, encodedString } = encodeCode128(text);
  if (modules.length === 0) return '';

  const quietZone = 6; // quiet zone in module units
  const totalModules = modules.length + quietZone * 2;
  const width = Math.ceil(totalModules * moduleWidth);
  const textHeight = showText ? fontSize + 3 : 0;
  const totalHeight = height + textHeight;

  // Build SVG rects for consecutive bars
  let rects = '';
  let inBar = false;
  let barStart = 0;

  for (let i = 0; i < modules.length; i++) {
    const isBar = modules[i] === 1;
    if (isBar && !inBar) {
      inBar = true;
      barStart = i;
    } else if (!isBar && inBar) {
      inBar = false;
      const x = (barStart + quietZone) * moduleWidth;
      const w = (i - barStart) * moduleWidth;
      rects += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="${color}" />`;
    }
  }
  if (inBar) {
    const x = (barStart + quietZone) * moduleWidth;
    const w = (modules.length - barStart) * moduleWidth;
    rects += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="${color}" />`;
  }

  const textElement = showText
    ? `<text x="${width / 2}" y="${totalHeight - 1}" font-family="Arial, monospace" font-size="${fontSize}" font-weight="bold" fill="${color}" text-anchor="middle" letter-spacing="1">${encodedString}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}" style="background:${background};display:block;margin:0 auto;max-width:100%;">${rects}${textElement}</svg>`;
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

export type BarcodePrintLayout =
  | 'a4_40_up'   // A4 Sheet: 40 Stickers per page (4 columns × 10 rows, 48.5mm × 25.4mm)
  | 'a4_24_up'   // A4 Sheet: 24 Stickers per page (3 columns × 8 rows, 64mm × 33.8mm)
  | 'roll_50x25' // Barcode Thermal Roll: 50mm × 25mm (2" × 1" Single continuous sticker)
  | 'roll_38x25' // Barcode Thermal Roll: 38mm × 25mm (1.5" × 1" Single continuous sticker)
  | 'a4_sheet';  // Backward-compatible alias for a4_40_up

/**
 * Triggers clean browser printing for barcode stickers.
 * Completely eliminates "about:blank", date/time, and page headers/footers.
 * For A4: Multiple stickers fit on a single A4 page in a grid.
 * For Thermal Roll: Paper size is set to the exact sticker size (50mm × 25mm).
 */
export function printBarcodeLabels(
  labels: BarcodeLabelData[],
  layoutInput: BarcodePrintLayout = 'a4_40_up'
) {
  if (typeof window === 'undefined') return;

  const layout: BarcodePrintLayout = layoutInput === 'a4_sheet' ? 'a4_40_up' : layoutInput;

  // Flatten based on count (e.g. 10 stickers of an item)
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

  const isRoll = layout === 'roll_50x25' || layout === 'roll_38x25';
  const isA4_40 = layout === 'a4_40_up';
  const isA4_24 = layout === 'a4_24_up';
  const isRoll38 = layout === 'roll_38x25';

  // Specific sizing parameters
  let pageCss = '';
  let containerCss = '';
  let labelCss = '';
  let barcodeHeight = 26;
  let barcodeWidthMod = 1.05;

  if (isRoll38) {
    // 38mm × 25mm Thermal Roll
    pageCss = `
      @page {
        size: 38mm 25mm;
        margin: 0mm !important;
      }
    `;
    containerCss = `
      display: block;
      width: 38mm;
      margin: 0 auto;
      padding: 0;
    `;
    labelCss = `
      width: 38mm;
      height: 25mm;
      max-height: 25mm;
      padding: 0.8mm 1mm;
      border: none;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      box-sizing: border-box;
    `;
    barcodeHeight = 22;
    barcodeWidthMod = 0.9;
  } else if (isRoll) {
    // 50mm × 25mm Thermal Barcode Roll (1 sticker per feed)
    pageCss = `
      @page {
        size: 50mm 25mm;
        margin: 0mm !important;
      }
    `;
    containerCss = `
      display: block;
      width: 50mm;
      margin: 0 auto;
      padding: 0;
    `;
    labelCss = `
      width: 50mm;
      height: 25mm;
      max-height: 25mm;
      padding: 1mm 1.5mm;
      border: none;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      box-sizing: border-box;
    `;
    barcodeHeight = 26;
    barcodeWidthMod = 1.05;
  } else if (isA4_24) {
    // A4 Sheet: 24 Labels (3 Columns × 8 Rows, 64mm × 33.8mm each)
    pageCss = `
      @page {
        size: A4 portrait;
        margin: 6mm 4mm !important;
      }
    `;
    containerCss = `
      display: grid;
      grid-template-columns: repeat(3, 64mm);
      grid-auto-rows: 33.8mm;
      gap: 2mm 3mm;
      justify-content: center;
      width: 100%;
      margin: 0 auto;
      padding: 0;
    `;
    labelCss = `
      width: 64mm;
      height: 33.8mm;
      max-height: 33.8mm;
      padding: 1.5mm 2mm;
      border: 0.5px dashed #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      box-sizing: border-box;
    `;
    barcodeHeight = 30;
    barcodeWidthMod = 1.15;
  } else {
    // A4 Sheet: 40 Labels (4 Columns × 10 Rows, 48.5mm × 25.4mm each - standard 50×25 sticker size on A4)
    pageCss = `
      @page {
        size: A4 portrait;
        margin: 6mm 4mm !important;
      }
    `;
    containerCss = `
      display: grid;
      grid-template-columns: repeat(4, 48.5mm);
      grid-auto-rows: 25.4mm;
      gap: 1.5mm 1.5mm;
      justify-content: center;
      width: 100%;
      margin: 0 auto;
      padding: 0;
    `;
    labelCss = `
      width: 48.5mm;
      height: 25.4mm;
      max-height: 25.4mm;
      padding: 0.8mm 1.2mm;
      border: 0.5px dashed #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      box-sizing: border-box;
    `;
    barcodeHeight = 24;
    barcodeWidthMod = 1.0;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <style>
    ${pageCss}
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
      color: #000000;
      font-family: Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .labels-container {
      ${containerCss}
    }
    .barcode-label {
      ${labelCss}
    }
    ${isRoll ? '.barcode-label:last-child { page-break-after: avoid !important; break-after: avoid !important; }' : ''}
    
    .company-title {
      font-size: ${isRoll38 ? '6pt' : '7pt'};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      text-align: center;
    }
    .product-title {
      font-size: ${isRoll38 ? '6.5pt' : (isA4_24 ? '8.5pt' : '7.5pt')};
      font-weight: 900;
      color: #000000;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      text-align: center;
    }
    .barcode-img {
      max-width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0.5mm 0;
    }
    .barcode-img svg {
      max-width: 100%;
      height: auto;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      font-size: ${isRoll38 ? '6pt' : (isA4_24 ? '8pt' : '6.5pt')};
      font-weight: bold;
      line-height: 1.1;
      border-top: 0.5px solid #000000;
      padding-top: 0.3mm;
    }
    .mrp-strike {
      color: #333333;
    }
    .retail-highlight {
      font-size: ${isRoll38 ? '6.5pt' : (isA4_24 ? '8.5pt' : '7.5pt')};
      font-weight: 900;
      color: #000000;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      font-size: ${isRoll38 ? '5pt' : '5.5pt'};
      color: #333333;
      line-height: 1;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="labels-container">
    ${flattened
      .map(item => {
        const svg = generateBarcodeSvg(item.barcode, {
          height: barcodeHeight,
          moduleWidth: barcodeWidthMod,
          showText: true,
          fontSize: isRoll38 ? 8 : (isA4_24 ? 9 : 8.5),
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
</body>
</html>
`;

  // Use invisible iframe to print directly from current document (eliminates "about:blank" and headers/footers)
  try {
    let printFrame = document.getElementById('barcode-silent-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'barcode-silent-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (printErr) {
          console.warn("Iframe print error, falling back to popup:", printErr);
          fallbackWindowPrint(html);
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn("Could not use iframe printing:", err);
  }

  // Fallback if iframe fails
  fallbackWindowPrint(html);
}

function fallbackWindowPrint(html: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 350);
  }
}
