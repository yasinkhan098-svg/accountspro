/**
 * Multi-Country Print Configuration Types for LedgerX ERP
 * Supports dynamic country presets, custom user-defined fields,
 * enable/disable toggles per field, and empty-value xxxxx fallbacks.
 */

export interface PrintFieldConfig {
  id?: string;
  key?: string;
  label: string;
  value: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface CompanyPrintConfig {
  companyCode: string;
  country: string;

  // Header & Tagline
  storeTagline: PrintFieldConfig;         // e.g. "LEDGERX SMART POINT"
  customerCarePhone: PrintFieldConfig;    // e.g. "18008910001"

  // Legal & Regulatory Identifiers (Country-Specific)
  businessId: PrintFieldConfig;           // e.g. CIN / CR / Trade License / USCC
  foodLicense: PrintFieldConfig;          // e.g. FSSAI / Municipality Food / Health Dept Permit

  // Customer & Loyalty Details
  customerCard: PrintFieldConfig;         // e.g. "ROne Card No." (populated by POS customer mobile)
  customerBalance: PrintFieldConfig;      // e.g. "ROne Bal(Amount)"

  // Online & Support Details
  website: PrintFieldConfig;              // e.g. "www.ledgerxretail.com"
  email: PrintFieldConfig;                // e.g. "customercare@ledgerx.com"
  privacyPolicy: PrintFieldConfig;        // e.g. "https://ledgerxretail.com/privacy-policy.html"

  // User-Defined Custom Dynamic Fields
  customFields: PrintFieldConfig[];

  // F8 Sales Voucher Specific Print Configuration (International & India)
  f8SalesConfig?: F8SalesPrintConfig;

  // POS Retail Bill Series & Print Copies Configuration
  posBillConfig?: POSBillConfig;

  updatedAt: string;
}

export interface POSBillConfig {
  billPrefix: string;          // e.g. "CASH" or "HPL-26-" or "BILL-"
  startingNumber: number;      // e.g. 1
  padDigits: number;           // e.g. 4 -> "0001"
  printCopies: number;         // e.g. 1 (default), 2, 3
}

export interface F8SalesPrintConfig {
  documentTitle: PrintFieldConfig;         // e.g. "TAX INVOICE"
  sellerTradeLicense: PrintFieldConfig;    // e.g. "TL-894920"
  buyerTradeLicense: PrintFieldConfig;     // e.g. "TL-990422"
  paymentTerms: PrintFieldConfig;          // e.g. "30 Days Credit"
  placeOfSupply: PrintFieldConfig;         // e.g. "Dubai, UAE"
  salesperson: PrintFieldConfig;           // e.g. "Mohammed Tariq"
  vehicleRoute: PrintFieldConfig;          // e.g. "DXB-Van-04 (Business Bay)"
  bankName: PrintFieldConfig;              // e.g. "EMIRATES NBD, Dubai"
  accountName: PrintFieldConfig;           // e.g. "Al Baraka General Trading LLC"
  iban: PrintFieldConfig;                  // e.g. "AE45026000001015483231402"
  swift: PrintFieldConfig;                 // e.g. "EBILAEAD"
  showStampSignature: PrintFieldConfig;    // Receiver's Stamp & Signature Box
  showAuthorisedSignatory: PrintFieldConfig; // Authorised Signatory Box
  showLpoNo: PrintFieldConfig;             // LPO / PO No
  showDeliveryNoteNo: PrintFieldConfig;    // Delivery Note No
  customInvoiceSeries?: {
    enabled: boolean;
    prefix: string;          // e.g. "INV/26/" or "HPL-26-"
    startingNumber: number;  // e.g. 1
    padDigits: number;       // e.g. 4 -> "0001"
  };
  customFields?: PrintFieldConfig[];
}

export interface CountryPrintPreset {
  country: string;
  businessIdLabel: string;
  businessIdPlaceholder: string;
  foodLicenseLabel: string;
  foodLicensePlaceholder: string;
  taxIdLabel: string;
  taxIdPlaceholder: string;
}
