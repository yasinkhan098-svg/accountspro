// ============================================================================
// Scale Brand File Format Generators (Raintech, Rongta, Essae, CAS, DIGI, Universal)
// LedgerX Barcode Weighing Scales Engine
// ============================================================================

import { ScaleBrand, ScaleExportOptions, ScalePLUItem } from './scaleTypes';

/**
 * Clean sanitization for scale ASCII fields
 */
const sanitizeScaleText = (text: string, maxLen = 28): string => {
  return String(text || '')
    .replace(/[,\r\n\t"]/g, ' ')
    .trim()
    .slice(0, maxLen);
};

/**
 * 1. Raintech & Rongta RLS-1000 / RLS-1100 Format
 * Output format: PLU,Code,Name,Price,Unit,BarcodeType,Department,Tare,ShelfLife
 */
export const generateRaintechFormat = (
  items: ScalePLUItem[],
  options: ScaleExportOptions
): string => {
  const lines: string[] = [];
  const store = sanitizeScaleText(options.companyName || 'STORE', 30);
  const footer = sanitizeScaleText(options.tagline || '* Thank You & Visit Again *', 32);

  // Header meta instructions for Raintech scale management
  lines.push(`# RAINTECH / RONGTA PLU EXPORT - ${store}`);
  lines.push(`# STORE_HEADER: ${store}`);
  lines.push(`# STORE_FOOTER: ${footer}`);
  lines.push(`PLU,Code,Name,Price,Unit,BarcodeType,Dept,Tare,ShelfLife`);

  items.forEach(it => {
    const plu = it.plu;
    const code = it.itemCode || String(plu).padStart(5, '0');
    const name = sanitizeScaleText(it.name, 24);
    const price = it.retailPrice.toFixed(2);
    const unit = it.unit.toUpperCase().includes('GM') ? 'g' : 'kg';
    const barcodeType = options.barcodeType === '13_digit' ? '13' : '10';
    const dept = it.department || 1;
    const tare = (it.tareWeightKg || 0).toFixed(3);
    const shelfLife = it.shelfLifeDays || 0;

    lines.push(`${plu},${code},"${name}",${price},${unit},${barcodeType},${dept},${tare},${shelfLife}`);
  });

  return lines.join('\r\n');
};

/**
 * 2. Essae PR-85 / DS-852 PLU Format
 */
export const generateEssaeFormat = (
  items: ScalePLUItem[],
  options: ScaleExportOptions
): string => {
  const lines: string[] = [];
  lines.push(`ItemCode,ItemName,UnitPrice,Unit,DeptNo,TaxRate`);

  items.forEach(it => {
    const code = it.itemCode || String(it.plu).padStart(5, '0');
    const name = sanitizeScaleText(it.name, 20);
    const price = it.retailPrice.toFixed(2);
    const unit = 'Kg';
    lines.push(`${code},"${name}",${price},${unit},1,0.00`);
  });

  return lines.join('\r\n');
};

/**
 * 3. CAS CL-5000 / CL-5200 Format (CL-Works CSV)
 */
export const generateCasFormat = (
  items: ScalePLUItem[],
  options: ScaleExportOptions
): string => {
  const lines: string[] = [];
  lines.push(`PLU_NO,ITEM_CODE,NAME_1,UNIT_PRICE,DEPT_NO,BARCODE_TYPE`);

  items.forEach(it => {
    const plu = it.plu;
    const code = it.itemCode || String(plu).padStart(5, '0');
    const name = sanitizeScaleText(it.name, 28);
    const price = it.retailPrice.toFixed(2);
    lines.push(`${plu},${code},"${name}",${price},1,0`);
  });

  return lines.join('\r\n');
};

/**
 * 4. DIGI SM-100 / SM-500 Format
 */
export const generateDigiFormat = (
  items: ScalePLUItem[],
  options: ScaleExportOptions
): string => {
  const lines: string[] = [];
  lines.push(`// DIGI PLU FILE - ${sanitizeScaleText(options.companyName, 30)}`);

  items.forEach(it => {
    const plu = String(it.plu).padStart(6, '0');
    const code = String(it.itemCode || it.plu).padStart(6, '0');
    const name = sanitizeScaleText(it.name, 24);
    const price = Math.round(it.retailPrice * 100); // DIGI often takes price in paise
    lines.push(`${plu}\t${code}\t${name}\t${price}\t1`);
  });

  return lines.join('\r\n');
};

/**
 * 5. Universal Standard Retail PLU CSV
 */
export const generateUniversalCsvFormat = (
  items: ScalePLUItem[],
  options: ScaleExportOptions
): string => {
  const lines: string[] = [];
  const store = sanitizeScaleText(options.companyName || 'STORE', 40);
  lines.push(`Scale_Key_No,PLU_No,Item_Code,Item_Name,Retail_Rate_Per_Kg,Unit,Variant,Store_Name`);

  items.forEach(it => {
    const key = it.keyNo;
    const plu = it.plu;
    const code = it.itemCode || String(plu).padStart(5, '0');
    const name = sanitizeScaleText(it.name, 40);
    const price = it.retailPrice.toFixed(2);
    const unit = it.unit || 'Kg';
    const variant = it.variant || 'Loose';
    lines.push(`${key},${plu},${code},"${name}",${price},${unit},"${variant}","${store}"`);
  });

  return lines.join('\r\n');
};

/**
 * Master dispatcher that generates file content based on chosen brand
 */
export const formatScalePLUData = (
  brand: ScaleBrand,
  items: ScalePLUItem[],
  options: ScaleExportOptions
): { content: string; filename: string; mimeType: string } => {
  const safeCompName = (options.companyName || 'Store')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 16);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  switch (brand) {
    case 'raintech':
    case 'rongta': {
      const content = generateRaintechFormat(items, options);
      return {
        content,
        filename: `${safeCompName}_raintech_plu_${dateStr}.txt`,
        mimeType: 'text/plain;charset=utf-8',
      };
    }
    case 'essae': {
      const content = generateEssaeFormat(items, options);
      return {
        content,
        filename: `${safeCompName}_essae_plu_${dateStr}.csv`,
        mimeType: 'text/csv;charset=utf-8',
      };
    }
    case 'cas': {
      const content = generateCasFormat(items, options);
      return {
        content,
        filename: `${safeCompName}_cas_cl5000_plu_${dateStr}.csv`,
        mimeType: 'text/csv;charset=utf-8',
      };
    }
    case 'digi': {
      const content = generateDigiFormat(items, options);
      return {
        content,
        filename: `${safeCompName}_digi_plu_${dateStr}.txt`,
        mimeType: 'text/plain;charset=utf-8',
      };
    }
    case 'universal_csv':
    default: {
      const content = generateUniversalCsvFormat(items, options);
      return {
        content,
        filename: `${safeCompName}_scale_loose_items_${dateStr}.csv`,
        mimeType: 'text/csv;charset=utf-8',
      };
    }
  }
};

/**
 * Triggers native browser download for scale file (Windows & macOS compatible)
 */
export const triggerScaleFileDownload = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
