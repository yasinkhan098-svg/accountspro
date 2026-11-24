// ============================================================================
// Universal Dynamic Scale Barcode Parser (For ANY Item, ANY Weight, ANY Rate)
// LedgerX Barcode Weighing Scales Engine
// ============================================================================

import { ParsedScaleBarcode } from './scaleTypes';

/**
 * Universal Parser for Barcode Label Printing Weighing Scales:
 * 
 * Supports:
 * 1. 10-Digit Format (Raintech / Rongta sticker format):
 *    e.g. "0001000110" -> Item Code: "00010" (PLU 10) | Weight: 110g (0.110 Kg)
 * 
 * 2. 13-Digit EAN Format (Standard Retail Weighed Prefix 20-29):
 *    e.g. "2000010001107" -> Item Code: "00010" (PLU 10) | Weight: 110g (0.110 Kg)
 */
export const parseScaleBarcode = (barcode: string): ParsedScaleBarcode => {
  const emptyResult: ParsedScaleBarcode = {
    isScaleBarcode: false,
    itemCode: '',
    weightKg: 0,
    weightGrams: 0,
    format: 'none',
    rawBarcode: barcode || '',
  };

  if (!barcode) return emptyResult;
  const clean = String(barcode).trim();

  // 1. Check for 10-digit Raintech / Rongta scale barcode (e.g. 0001000110)
  if (/^\d{10}$/.test(clean)) {
    const itemCodePart = clean.slice(0, 5);      // "00010"
    const weightPart = clean.slice(5, 10);       // "00110"
    const weightGrams = parseInt(weightPart, 10);
    const weightKg = Math.round((weightGrams / 1000) * 1000) / 1000;

    // A valid scale weight is between 0.001 Kg (1g) and 150.000 Kg
    if (weightGrams > 0 && weightGrams <= 150000) {
      return {
        isScaleBarcode: true,
        itemCode: itemCodePart,
        weightKg,
        weightGrams,
        format: '10_digit',
        rawBarcode: clean,
      };
    }
  }

  // 2. Check for 13-digit standard EAN Weighed Barcode (Prefix 20-29)
  // e.g. 20 00010 00110 7
  if (/^2[0-9]\d{11}$/.test(clean)) {
    const itemCodePart = clean.slice(2, 7);      // 5 digits: item code
    const weightPart = clean.slice(7, 12);       // 5 digits: weight in grams
    const weightGrams = parseInt(weightPart, 10);
    const weightKg = Math.round((weightGrams / 1000) * 1000) / 1000;

    if (weightGrams > 0 && weightGrams <= 150000) {
      return {
        isScaleBarcode: true,
        itemCode: itemCodePart,
        weightKg,
        weightGrams,
        format: '13_digit_ean',
        rawBarcode: clean,
      };
    }
  }

  return emptyResult;
};

/**
 * Dynamically resolves an item from the active catalog using the decoded scale Item Code.
 * Checks against:
 * 1. Exact item barcode (e.g. "00010" or "10")
 * 2. Numeric scale key (e.g. 10)
 * 3. PLU code or stock item ID
 */
export const findCatalogItemByScaleCode = (
  itemCode: string,
  catalogItems: any[]
): any | null => {
  if (!itemCode || !Array.isArray(catalogItems)) return null;

  const paddedCode = itemCode.trim();
  const numericCode = parseInt(paddedCode, 10);

  // 1. Direct match by exact barcode (e.g. "00010" or "10")
  const exactBarcodeMatch = catalogItems.find(it => {
    const b = (it.barcode || '').trim();
    if (!b) return false;
    return b === paddedCode || b === String(numericCode);
  });
  if (exactBarcodeMatch) return exactBarcodeMatch;

  // 2. Match by scaleKeyNo assigned during alphabetical loose sort
  const scaleKeyMatch = catalogItems.find(it => {
    return Number(it.scaleKeyNo) === numericCode;
  });
  if (scaleKeyMatch) return scaleKeyMatch;

  // 3. Match by plu / pluCode if present
  const pluMatch = catalogItems.find(it => {
    return Number(it.plu || it.pluCode) === numericCode;
  });
  if (pluMatch) return pluMatch;

  // 4. Match by item ID if numerical
  const idMatch = catalogItems.find(it => {
    return Number(it.id) === numericCode;
  });
  if (idMatch) return idMatch;

  return null;
};
