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
}>(items: T[]): T[] => {
  if (!Array.isArray(items) || items.length === 0) return items;

  // Find all loose items and sort them alphabetically
  const looseList = items.filter(isLooseScaleItem);
  looseList.sort((a, b) => {
    const nameA = String(a.name || '').trim().toLowerCase();
    const nameB = String(b.name || '').trim().toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Map each loose item ID to its sequential Scale Key (1, 2, 3...)
  const keyMap = new Map<string | number, { keyNo: number; barcode: string }>();
  looseList.forEach((it, idx) => {
    const keyNo = idx + 1;
    const code = String(keyNo).padStart(5, '0');
    keyMap.set(it.id, { keyNo, barcode: code });
  });

  // Return new array with assigned scaleKeyNo and updated barcode for loose items
  return items.map(item => {
    if (keyMap.has(item.id)) {
      const { keyNo, barcode } = keyMap.get(item.id)!;
      // If barcode is empty or matches an old 5-digit PLU sequence, update it to matched key
      const currentBarcode = (item.barcode || '').trim();
      const shouldUpdateBarcode = !currentBarcode || /^\d{1,5}$/.test(currentBarcode);
      return {
        ...item,
        scaleKeyNo: keyNo,
        barcode: shouldUpdateBarcode ? barcode : currentBarcode,
      };
    }
    return {
      ...item,
      scaleKeyNo: undefined,
    };
  });
};
