/**
 * Dynamic Multi-Country Tax Engine for LedgerX ERP
 * Supports dynamic tax labels, rates, structures, and registration number types
 * (GSTIN, EIN, VRN, TRN, USt-IdNr, TVA, BN, ABN, IRD, UEN, SST, JCT)
 * based on Company Country & Item Master settings.
 */

export interface CountryTaxConfig {
  country: string;
  taxName: string;            // Short name: 'GST', 'VAT', 'Sales Tax', 'SST', 'Consumption Tax'
  taxLabel: string;           // Display label: 'GST', 'VAT', 'Sales Tax', 'SST'
  structure: 'dual' | 'single'; // 'dual' = India CGST+SGST/IGST; 'single' = flat VAT / Sales Tax
  taxIdLabel: string;         // Primary: 'GSTIN', 'TRN', 'EIN / Sales Tax ID', 'VAT Reg. No. (VRN)', etc.
  taxIdPlaceholder?: string;  // e.g. '22AAAAA0000A1Z5', '100123456789003', '12-3456789'
  secondaryIdLabel?: string;  // Secondary: 'PAN No.', 'Trade License No.', 'Company No. (CRN)', 'Steuernummer', etc.
  secondaryIdPlaceholder?: string;
  regTypes: string[];         // Registration type options for Company creation
  defaultRate: number;        // Suggested default % (e.g., 18, 5, 20)
}

export const COUNTRY_TAX_MAP: Record<string, CountryTaxConfig> = {
  "India": {
    country: "India",
    taxName: "GST",
    taxLabel: "GST",
    structure: "dual",
    taxIdLabel: "GSTIN",
    taxIdPlaceholder: "22AAAAA0000A1Z5",
    secondaryIdLabel: "PAN No.",
    secondaryIdPlaceholder: "AAAAA0000A",
    regTypes: ["Regular", "Composition", "Unregistered", "Consumer"],
    defaultRate: 18,
  },
  "United Arab Emirates": {
    country: "United Arab Emirates",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "TRN (Tax Reg. No.)",
    taxIdPlaceholder: "100123456789003",
    secondaryIdLabel: "Trade License No.",
    secondaryIdPlaceholder: "TL-123456",
    regTypes: ["Registered", "Unregistered", "Exempt", "Designated Zone"],
    defaultRate: 5,
  },
  "USA": {
    country: "USA",
    taxName: "Sales Tax",
    taxLabel: "Sales Tax",
    structure: "single",
    taxIdLabel: "EIN / Sales Tax ID",
    taxIdPlaceholder: "12-3456789",
    secondaryIdLabel: "State Permit / Resale No.",
    secondaryIdPlaceholder: "STP-987654",
    regTypes: ["Registered", "Unregistered", "Exempt / Reseller"],
    defaultRate: 0,
  },
  "United States": {
    country: "United States",
    taxName: "Sales Tax",
    taxLabel: "Sales Tax",
    structure: "single",
    taxIdLabel: "EIN / Sales Tax ID",
    taxIdPlaceholder: "12-3456789",
    secondaryIdLabel: "State Permit / Resale No.",
    secondaryIdPlaceholder: "STP-987654",
    regTypes: ["Registered", "Unregistered", "Exempt / Reseller"],
    defaultRate: 0,
  },
  "United Kingdom": {
    country: "United Kingdom",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "VAT Reg. No. (VRN)",
    taxIdPlaceholder: "GB123456789",
    secondaryIdLabel: "Company No. (CRN)",
    secondaryIdPlaceholder: "12345678",
    regTypes: ["Registered", "Unregistered", "Exempt", "Flat Rate Scheme"],
    defaultRate: 20,
  },
  "UK": {
    country: "UK",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "VAT Reg. No. (VRN)",
    taxIdPlaceholder: "GB123456789",
    secondaryIdLabel: "Company No. (CRN)",
    secondaryIdPlaceholder: "12345678",
    regTypes: ["Registered", "Unregistered", "Exempt", "Flat Rate Scheme"],
    defaultRate: 20,
  },
  "Germany": {
    country: "Germany",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "USt-IdNr.",
    taxIdPlaceholder: "DE123456789",
    secondaryIdLabel: "Steuernummer",
    secondaryIdPlaceholder: "12/345/67890",
    regTypes: ["Regelbesteuerung", "Kleinunternehmer", "Nicht Steuerbar"],
    defaultRate: 19,
  },
  "France": {
    country: "France",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "Numéro de TVA",
    taxIdPlaceholder: "FR12345678901",
    secondaryIdLabel: "SIREN / SIRET No.",
    secondaryIdPlaceholder: "123 456 789 00012",
    regTypes: ["Régime Réel Normal", "Régime Réel Simplifié", "Franchise en Base"],
    defaultRate: 20,
  },
  "Canada": {
    country: "Canada",
    taxName: "GST/HST",
    taxLabel: "GST/HST",
    structure: "single",
    taxIdLabel: "BN / GST Reg. No.",
    taxIdPlaceholder: "123456789 RT0001",
    secondaryIdLabel: "PST / QST No.",
    secondaryIdPlaceholder: "PST-1234-5678",
    regTypes: ["Registered", "Unregistered", "Exempt / Zero-Rated"],
    defaultRate: 5,
  },
  "Australia": {
    country: "Australia",
    taxName: "GST",
    taxLabel: "GST",
    structure: "single",
    taxIdLabel: "ABN (Australian Business No.)",
    taxIdPlaceholder: "12 345 678 901",
    secondaryIdLabel: "ACN (Company Number)",
    secondaryIdPlaceholder: "123 456 789",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 10,
  },
  "New Zealand": {
    country: "New Zealand",
    taxName: "GST",
    taxLabel: "GST",
    structure: "single",
    taxIdLabel: "IRD / GST Number",
    taxIdPlaceholder: "123-456-789",
    secondaryIdLabel: "NZBN",
    secondaryIdPlaceholder: "9429000000000",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 15,
  },
  "Singapore": {
    country: "Singapore",
    taxName: "GST",
    taxLabel: "GST",
    structure: "single",
    taxIdLabel: "UEN / GST Reg. No.",
    taxIdPlaceholder: "201234567A",
    secondaryIdLabel: "Business Reg. No.",
    secondaryIdPlaceholder: "T12LL1234A",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 9,
  },
  "Saudi Arabia": {
    country: "Saudi Arabia",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "VAT Reg. No.",
    taxIdPlaceholder: "300123456789003",
    secondaryIdLabel: "CR Number (Commercial Reg.)",
    secondaryIdPlaceholder: "1010123456",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 15,
  },
  "Malaysia": {
    country: "Malaysia",
    taxName: "SST",
    taxLabel: "SST",
    structure: "single",
    taxIdLabel: "SST Reg. No.",
    taxIdPlaceholder: "W10-1808-12345678",
    secondaryIdLabel: "BRN / SSM Reg. No.",
    secondaryIdPlaceholder: "202001012345",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 10,
  },
  "Japan": {
    country: "Japan",
    taxName: "Consumption Tax",
    taxLabel: "Consumption Tax (JCT)",
    structure: "single",
    taxIdLabel: "Invoice Reg. No. (JCT)",
    taxIdPlaceholder: "T1234567890123",
    secondaryIdLabel: "Corporate Number (Hōjin Bangō)",
    secondaryIdPlaceholder: "1234567890123",
    regTypes: ["Qualified Invoice Issuer", "Standard Issuer", "Tax Exempt Enterprise"],
    defaultRate: 10,
  },
  "China": {
    country: "China",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "USCC (Unified Social Credit Code)",
    taxIdPlaceholder: "91110000XXXXXXXXXX",
    secondaryIdLabel: "Tax Identification No.",
    secondaryIdPlaceholder: "110101XXXXXXXXX",
    regTypes: ["General Taxpayer", "Small-scale Taxpayer", "Exempt"],
    defaultRate: 13,
  },
  "Hungary": {
    country: "Hungary",
    taxName: "VAT",
    taxLabel: "VAT (ÁFA)",
    structure: "single",
    taxIdLabel: "Adószám / EU VAT No.",
    taxIdPlaceholder: "HU12345678",
    secondaryIdLabel: "Cégjegyzékszám",
    secondaryIdPlaceholder: "01-09-123456",
    regTypes: ["ÁFA Alany", "Alanyi Adómentes"],
    defaultRate: 27,
  },
  "Hong Kong": {
    country: "Hong Kong",
    taxName: "Tax",
    taxLabel: "Tax",
    structure: "single",
    taxIdLabel: "BRN (Business Reg. No.)",
    taxIdPlaceholder: "12345678-000",
    secondaryIdLabel: "Company Registry No.",
    secondaryIdPlaceholder: "1234567",
    regTypes: ["Registered", "Unregistered"],
    defaultRate: 0,
  },
  "Kuwait": {
    country: "Kuwait",
    taxName: "Tax",
    taxLabel: "Tax",
    structure: "single",
    taxIdLabel: "Tax Card / Reg. No.",
    taxIdPlaceholder: "KW-123456",
    secondaryIdLabel: "Commercial Reg. (CR)",
    secondaryIdPlaceholder: "12345",
    regTypes: ["Registered", "Unregistered"],
    defaultRate: 0,
  },
  "Qatar": {
    country: "Qatar",
    taxName: "Tax",
    taxLabel: "Tax",
    structure: "single",
    taxIdLabel: "TIN (Tax Identification No.)",
    taxIdPlaceholder: "000000000000001",
    secondaryIdLabel: "Commercial Reg. (CR)",
    secondaryIdPlaceholder: "12345",
    regTypes: ["Registered", "Unregistered"],
    defaultRate: 0,
  },
  "Bahrain": {
    country: "Bahrain",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "VAT Account Number",
    taxIdPlaceholder: "200000000000002",
    secondaryIdLabel: "CR Number",
    secondaryIdPlaceholder: "12345-1",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 10,
  },
  "Oman": {
    country: "Oman",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "VAT Identification No.",
    taxIdPlaceholder: "OM1100000000",
    secondaryIdLabel: "CR Number",
    secondaryIdPlaceholder: "1234567",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 5,
  },
  "South Africa": {
    country: "South Africa",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "VAT Registration No.",
    taxIdPlaceholder: "4123456789",
    secondaryIdLabel: "Company Reg. No. (CIPC)",
    secondaryIdPlaceholder: "2020/123456/07",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 15,
  },
  "Bangladesh": {
    country: "Bangladesh",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "BIN (Business ID Number)",
    taxIdPlaceholder: "001234567-0101",
    secondaryIdLabel: "e-TIN No.",
    secondaryIdPlaceholder: "123456789012",
    regTypes: ["Registered", "Unregistered", "Turnover Tax"],
    defaultRate: 15,
  },
  "Nepal": {
    country: "Nepal",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "PAN / VAT No.",
    taxIdPlaceholder: "300123456",
    secondaryIdLabel: "Company Reg. No.",
    secondaryIdPlaceholder: "123456/078/079",
    regTypes: ["VAT Registered", "PAN Only", "Unregistered"],
    defaultRate: 13,
  },
  "Sri Lanka": {
    country: "Sri Lanka",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "TIN / VAT Reg. No.",
    taxIdPlaceholder: "123456789-7000",
    secondaryIdLabel: "Business Reg. No. (BRN)",
    secondaryIdPlaceholder: "PV123456",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 18,
  },
  "Pakistan": {
    country: "Pakistan",
    taxName: "Sales Tax",
    taxLabel: "Sales Tax",
    structure: "single",
    taxIdLabel: "STRN (Sales Tax Reg. No.)",
    taxIdPlaceholder: "12-34-5678-901-23",
    secondaryIdLabel: "NTN (National Tax No.)",
    secondaryIdPlaceholder: "1234567-8",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 18,
  },
  "Indonesia": {
    country: "Indonesia",
    taxName: "PPN",
    taxLabel: "PPN (VAT)",
    structure: "single",
    taxIdLabel: "NPWP / NPPKP",
    taxIdPlaceholder: "01.234.567.8-012.000",
    secondaryIdLabel: "NIB (Nomor Induk Berusaha)",
    secondaryIdPlaceholder: "1234567890123",
    regTypes: ["PKP (Registered)", "Non-PKP", "Exempt"],
    defaultRate: 11,
  },
  "Thailand": {
    country: "Thailand",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "Tax ID (13 Digits)",
    taxIdPlaceholder: "0105558123456",
    secondaryIdLabel: "Branch No.",
    secondaryIdPlaceholder: "00000 (Head Office)",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 7,
  },
  "Nigeria": {
    country: "Nigeria",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "TIN (Tax ID Number)",
    taxIdPlaceholder: "12345678-0001",
    secondaryIdLabel: "CAC / RC Number",
    secondaryIdPlaceholder: "RC-123456",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 7.5,
  },
  "Kenya": {
    country: "Kenya",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "KRA PIN",
    taxIdPlaceholder: "P051234567Z",
    secondaryIdLabel: "Business Reg. No.",
    secondaryIdPlaceholder: "CPR/2020/123456",
    regTypes: ["Registered", "Unregistered", "Exempt"],
    defaultRate: 16,
  },
  "Ethiopia": {
    country: "Ethiopia",
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single",
    taxIdLabel: "TIN / VAT Reg. No.",
    taxIdPlaceholder: "0012345678",
    secondaryIdLabel: "Trade License No.",
    secondaryIdPlaceholder: "TL-12345",
    regTypes: ["Registered", "Unregistered", "TOT"],
    defaultRate: 15,
  },
  "Mexico": {
    country: "Mexico",
    taxName: "IVA",
    taxLabel: "IVA",
    structure: "single",
    taxIdLabel: "RFC (Registro Federal)",
    taxIdPlaceholder: "AAA010101AAA",
    secondaryIdLabel: "CURP / Tax Reg.",
    secondaryIdPlaceholder: "RFC-XXXXXX",
    regTypes: ["General de Ley", "Personas Morales", "Exento"],
    defaultRate: 16,
  },
  "Brazil": {
    country: "Brazil",
    taxName: "ICMS",
    taxLabel: "ICMS",
    structure: "single",
    taxIdLabel: "CNPJ",
    taxIdPlaceholder: "12.345.678/0001-90",
    secondaryIdLabel: "Inscrição Estadual (IE)",
    secondaryIdPlaceholder: "123.456.789.012",
    regTypes: ["Simples Nacional", "Lucro Presumido", "Lucro Real"],
    defaultRate: 17,
  },
};

export interface ResolvedTaxInfo extends CountryTaxConfig {
  isIndiaGst: boolean;
}

const DEFAULT_GLOBAL_TAX: CountryTaxConfig = {
  country: "Other",
  taxName: "VAT",
  taxLabel: "VAT",
  structure: "single",
  taxIdLabel: "Tax Reg. No.",
  taxIdPlaceholder: "TAX-123456",
  secondaryIdLabel: "Business Reg. No.",
  secondaryIdPlaceholder: "BRN-123456",
  regTypes: ["Registered", "Unregistered", "Exempt"],
  defaultRate: 0,
};

/**
 * Returns the resolved tax profile for a given company.
 * If company has a custom taxName, it respects it while keeping other metadata intact.
 */
export function getCompanyTaxInfo(company?: { country?: string; taxName?: string } | null): ResolvedTaxInfo {
  const rawCountry = (company?.country || '').trim();
  const country = rawCountry || 'India';
  const mapping = COUNTRY_TAX_MAP[country] || {
    ...DEFAULT_GLOBAL_TAX,
    country,
  };

  const customTaxName = company?.taxName?.trim();
  const taxName = customTaxName || mapping.taxName;
  const isIndiaGst = (country.toLowerCase() === 'india' || !rawCountry) && taxName.toUpperCase() === 'GST';

  return {
    ...mapping,
    taxName,
    taxLabel: customTaxName || mapping.taxLabel,
    structure: isIndiaGst ? 'dual' : 'single',
    isIndiaGst,
  };
}

/**
 * Resolves the numeric tax rate for a stock item, with backward-compatibility fallbacks.
 */
export function getItemTaxRate(item: any): number {
  if (!item) return 0;
  if (item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== '') {
    const num = Number(item.taxRate);
    if (!isNaN(num)) return num;
  }
  if (item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== '') {
    const num = Number(item.gstRate);
    if (!isNaN(num)) return num;
  }
  return 0;
}

/**
 * Resolves the effective tax name for an item.
 */
export function getItemTaxName(item: any, company?: any): string {
  if (item?.taxName && typeof item.taxName === 'string' && item.taxName.trim()) {
    return item.taxName.trim();
  }
  const coTax = getCompanyTaxInfo(company);
  return coTax.taxName;
}
