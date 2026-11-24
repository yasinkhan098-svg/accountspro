// ============================================================================
// Scale Integration Types & Interfaces (Strictly Isolated Architecture)
// LedgerX Barcode Label Printing Weighing Scales Engine
// ============================================================================

export type ScaleBrand =
  | 'raintech'      // Raintech RLS-1000 / RLS-1100 Series
  | 'rongta'        // Rongta RLS-1000 / RLS-1100 Series
  | 'essae'         // Essae PR-85, DS-215, DS-852 (PLU Commander format)
  | 'cas'           // CAS CL-5000 / CL-5200 (CL-Works CSV/DAT format)
  | 'digi'          // DIGI SM-100, SM-300, SM-500 Series
  | 'universal_csv';// Universal Standard Retail PLU CSV

export interface ScaleBrandMeta {
  id: ScaleBrand;
  name: string;
  defaultExt: string;
  mimeType: string;
  maxHotkeys: number;
  description: string;
}

export const SCALE_BRANDS: ScaleBrandMeta[] = [
  {
    id: 'raintech',
    name: 'Raintech RLS-1000 / RLS-1100',
    defaultExt: 'txt',
    mimeType: 'text/plain',
    maxHotkeys: 112,
    description: 'Direct PLU text export for Raintech Scale Label Software & USB Pen Drive.',
  },
  {
    id: 'rongta',
    name: 'Rongta RLS-1000',
    defaultExt: 'txt',
    mimeType: 'text/plain',
    maxHotkeys: 112,
    description: 'Standard Rongta scale PLU exchange format.',
  },
  {
    id: 'essae',
    name: 'Essae PR-85 / DS-852',
    defaultExt: 'csv',
    mimeType: 'text/csv',
    maxHotkeys: 84,
    description: 'Essae PLU Commander format for direct pen drive loading.',
  },
  {
    id: 'cas',
    name: 'CAS CL-5000 / CL-5200',
    defaultExt: 'csv',
    mimeType: 'text/csv',
    maxHotkeys: 144,
    description: 'CAS CL-Works compatible CSV exchange format.',
  },
  {
    id: 'digi',
    name: 'DIGI SM-100 / SM-500',
    defaultExt: 'txt',
    mimeType: 'text/plain',
    maxHotkeys: 112,
    description: 'DIGI standard PLU ASCII format.',
  },
  {
    id: 'universal_csv',
    name: 'Universal Retail Scale CSV',
    defaultExt: 'csv',
    mimeType: 'text/csv',
    maxHotkeys: 224,
    description: 'Clean standardized CSV format compatible with any generic scale.',
  },
];

export interface ScalePLUItem {
  keyNo: number;             // Physical scale hotkey number: 1, 2, 3...
  plu: number;               // Scale PLU memory address: 1, 2, 3...
  itemCode: string;          // 5-digit zero-padded item code: "00001", "00010"...
  name: string;              // Item name (e.g. "TOMATO", "ALMONDS", "KAJU KATLI")
  retailPrice: number;       // Unit rate per Kg (from Purchase POS List)
  unit: string;              // Unit (Kg, Gm, Nos)
  barcode: string;           // Exact barcode from Purchase POS list or generated PLU code
  variant: string;           // Variant (must contain 'Loose')
  department: number;        // Scale Department (default 1)
  tareWeightKg?: number;     // Tare weight (default 0)
  shelfLifeDays?: number;    // Shelf life days (default 0 or 7)
  originalItemId?: number | string;
}

export interface ScaleExportOptions {
  brand: ScaleBrand;
  companyName: string;       // Active company name (prints at top of sticker)
  tagline?: string;          // Store footer (e.g. "* Thank You & Visit Again *")
  barcodeType?: '10_digit' | '13_digit'; // 10-digit (0001000110) or 13-digit EAN-13
}

export interface ParsedScaleBarcode {
  isScaleBarcode: boolean;
  itemCode: string;          // Decoded Item Code / PLU (e.g. "00010" or "10")
  weightKg: number;          // Decoded Weight in Kilograms (e.g. 0.110)
  weightGrams: number;       // Weight in grams (e.g. 110)
  format: '10_digit' | '13_digit_ean' | 'none';
  rawBarcode: string;
}
