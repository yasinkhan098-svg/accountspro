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

  updatedAt: string;
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
