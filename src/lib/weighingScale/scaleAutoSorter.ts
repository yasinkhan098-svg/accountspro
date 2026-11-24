// ============================================================================
// Automatic Alphabetical (A to Z) Auto-Sorting & Scale Key Allocator Engine
// LedgerX Barcode Weighing Scales Engine
// ============================================================================

import { ScalePLUItem } from './scaleTypes';

/**
 * Checks if an item is strictly a "Loose" scale item based on its variant.
 * Case-insensitive check for 'loose'.
 */
export const isLooseScaleItem = (item: {
  variant?: string;
  variants?: string[];
  unit?: string;
  baseUnit?: string;
}): boolean => {
  if (!item) return false;
  const v = (item.variant || (Array.isArray(item.variants) && item.variants[0]) || '').trim().toLowerCase();
  return v.includes('loose');
};

/**
 * Filters and sorts all Loose items alphabetically from A to Z,
 * and assigns sequential Scale Key (Hotkeys) numbers: 1, 2, 3...
 * and zero-padded 5-digit Barcode / PLU codes: "00001", "00002", etc.
 */
export const extractAndSortScalePLUs = (
  items: any[],
  companyName = 'Store'
): ScalePLUItem[] => {
  if (!Array.isArray(items)) return [];

  // 1. Filter only loose items
  const looseItems = items.filter(isLooseScaleItem);

  // 2. Sort alphabetically by Name (A to Z, case-insensitive)
  looseItems.sort((a, b) => {
    const nameA = String(a.name || '').trim().toLowerCase();
    const nameB = String(b.name || '').trim().toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // 3. Map to sequential ScalePLUItems (Key 1, Key 2, Key 3...)
  return looseItems.map((item, index) => {
    const keyNo = index + 1; // 1-based sequential key
    const formattedCode = String(keyNo).padStart(5, '0'); // e.g. "00001", "00010"

    // If item already has a clean numeric barcode of 1-5 digits, preserve it or use 5-digit PLU
    const rawBarcode = String(item.barcode || '').trim();
    const itemBarcode = rawBarcode && /^\d{1,5}$/.test(rawBarcode)
      ? rawBarcode.padStart(5, '0')
      : formattedCode;

    const rate = Number(item.retailSalePrice) > 0
      ? Number(item.retailSalePrice)
      : (Number(item.openingRate) || Number(item.saleRate) || 0);

    return {
      keyNo,
      plu: keyNo,
      itemCode: itemBarcode,
      name: String(item.name || `Item ${keyNo}`).trim().toUpperCase(),
      retailPrice: Math.round(rate * 100) / 100,
      unit: item.unit || 'Kg',
      barcode: itemBarcode,
      variant: item.variant || 'Loose',
      department: 1,
      tareWeightKg: 0,
      shelfLifeDays: 7,
      originalItemId: item.id,
    };
  });
};

/**
 * Re-indexes all items in the Purchase POS list so that whenever items have variant "Loose",
 * their scale key numbers and barcodes are neatly aligned in alphabetical A-Z order,
 * while leaving non-loose items untouched.
 */
export const syncLooseItemsAlphabeticalKeys = <T extends {
  id: number | string;
  name: string;
  variant?: string;
  variants?: string[];
  barcode?: string;
  scaleKeyNo?: number;
  sNo?: number;
}>(items: T[]): T[] => {
  if (!Array.isArray(items) || items.length === 0) return items;

  // 1. Separate loose items from non-loose items
  const looseList = items.filter(isLooseScaleItem);
  const nonLooseList = items.filter(it => !isLooseScaleItem(it));

  // 2. Sort loose items alphabetically by Name (A to Z, case-insensitive)
  looseList.sort((a, b) => {
    const nameA = String(a.name || '').trim().toLowerCase();
    const nameB = String(b.name || '').trim().toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // 3. Map loose items with sequential Scale Keys 1, 2, 3... and barcodes
  const mappedLoose = looseList.map((it, idx) => {
    const keyNo = idx + 1;
    const formattedCode = String(keyNo).padStart(5, '0');
    const rawBarcode = (it.barcode || '').trim();
    const barcode = !rawBarcode || /^\d{1,5}$/.test(rawBarcode) ? formattedCode : rawBarcode;
    return {
      ...it,
      scaleKeyNo: keyNo,
      barcode,
    };
  });

  // 4. Clean non-loose items (clear scaleKeyNo)
  const cleanedNonLoose = nonLooseList.map(it => ({
    ...it,
    scaleKeyNo: undefined,
  }));

  // 5. Combine: ALL LOOSE ITEMS FIRST (sNo 1, 2, 3... sorted A to Z), followed by non-loose items
  const combined = [...mappedLoose, ...cleanedNonLoose];

  // 6. Assign clean sequential sNo: 1, 2, 3... to EVERY item in the list!
  return combined.map((it, idx) => ({
    ...it,
    sNo: idx + 1,
  }));
};
