/**
 * Dynamic Multi-Country Tax Engine for LedgerX ERP
 * Supports dynamic tax labels, rates, and structures (GST, VAT, Sales Tax, SST, JCT)
 * based on Company Country & Item Master settings.
 */

export interface CountryTaxConfig {
  country: string;
  taxName: string;            // Short name: 'GST', 'VAT', 'Sales Tax', 'SST', 'Consumption Tax'
  taxLabel: string;           // Display label: 'GST', 'VAT', 'Sales Tax', 'SST'
  structure: 'dual' | 'single'; // 'dual' = India CGST+SGST/IGST; 'single' = flat VAT / Sales Tax
  taxIdLabel: string;         // 'GSTIN', 'TRN', 'VAT Reg No.', 'EIN / Tax ID'
  defaultRate: number;        // Suggested default % (e.g., 18, 5, 20)
}

export const COUNTRY_TAX_MAP: Record<string, CountryTaxConfig> = {
  "India":                { country: "India", taxName: "GST", taxLabel: "GST", structure: "dual", taxIdLabel: "GSTIN", defaultRate: 18 },
  "United Arab Emirates":{ country: "United Arab Emirates", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "TRN", defaultRate: 5 },
  "Saudi Arabia":         { country: "Saudi Arabia", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "VAT Reg No.", defaultRate: 15 },
  "USA":                  { country: "USA", taxName: "Sales Tax", taxLabel: "Sales Tax", structure: "single", taxIdLabel: "EIN / Tax ID", defaultRate: 0 },
  "United States":        { country: "United States", taxName: "Sales Tax", taxLabel: "Sales Tax", structure: "single", taxIdLabel: "EIN / Tax ID", defaultRate: 0 },
  "United Kingdom":       { country: "United Kingdom", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "VAT Reg No.", defaultRate: 20 },
  "UK":                   { country: "UK", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "VAT Reg No.", defaultRate: 20 },
  "Germany":              { country: "Germany", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "USt-IdNr.", defaultRate: 19 },
  "France":               { country: "France", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "TVA", defaultRate: 20 },
  "Canada":               { country: "Canada", taxName: "GST/HST", taxLabel: "GST/HST", structure: "single", taxIdLabel: "BN / GST No.", defaultRate: 5 },
  "Australia":            { country: "Australia", taxName: "GST", taxLabel: "GST", structure: "single", taxIdLabel: "ABN", defaultRate: 10 },
  "New Zealand":          { country: "New Zealand", taxName: "GST", taxLabel: "GST", structure: "single", taxIdLabel: "GST No.", defaultRate: 15 },
  "Singapore":            { country: "Singapore", taxName: "GST", taxLabel: "GST", structure: "single", taxIdLabel: "GST Reg No.", defaultRate: 9 },
  "Malaysia":             { country: "Malaysia", taxName: "SST", taxLabel: "SST", structure: "single", taxIdLabel: "SST Reg No.", defaultRate: 10 },
  "Japan":                { country: "Japan", taxName: "Consumption Tax", taxLabel: "Consumption Tax (JCT)", structure: "single", taxIdLabel: "Invoice Reg No.", defaultRate: 10 },
  "China":                { country: "China", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "Tax ID", defaultRate: 13 },
  "Hungary":              { country: "Hungary", taxName: "VAT", taxLabel: "VAT (ÁFA)", structure: "single", taxIdLabel: "Adószám", defaultRate: 27 },
  "Hong Kong":            { country: "Hong Kong", taxName: "Tax", taxLabel: "Tax", structure: "single", taxIdLabel: "BRN", defaultRate: 0 },
  "Kuwait":               { country: "Kuwait", taxName: "Tax", taxLabel: "Tax", structure: "single", taxIdLabel: "Tax ID", defaultRate: 0 },
  "Qatar":                { country: "Qatar", taxName: "Tax", taxLabel: "Tax", structure: "single", taxIdLabel: "Tax ID", defaultRate: 0 },
  "Bahrain":              { country: "Bahrain", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "VAT Reg No.", defaultRate: 10 },
  "Oman":                 { country: "Oman", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "VAT Reg No.", defaultRate: 5 },
  "South Africa":         { country: "South Africa", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "VAT No.", defaultRate: 15 },
  "Bangladesh":           { country: "Bangladesh", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "BIN", defaultRate: 15 },
  "Nepal":                { country: "Nepal", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "PAN", defaultRate: 13 },
  "Sri Lanka":            { country: "Sri Lanka", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "VAT No.", defaultRate: 18 },
  "Pakistan":             { country: "Pakistan", taxName: "Sales Tax", taxLabel: "Sales Tax", structure: "single", taxIdLabel: "STRN", defaultRate: 18 },
  "Indonesia":            { country: "Indonesia", taxName: "PPN", taxLabel: "PPN (VAT)", structure: "single", taxIdLabel: "NPWP", defaultRate: 11 },
  "Thailand":             { country: "Thailand", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "Tax ID", defaultRate: 7 },
  "Nigeria":              { country: "Nigeria", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "TIN", defaultRate: 7.5 },
  "Kenya":                { country: "Kenya", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "PIN", defaultRate: 16 },
  "Ethiopia":             { country: "Ethiopia", taxName: "VAT", taxLabel: "VAT", structure: "single", taxIdLabel: "TIN", defaultRate: 15 },
  "Mexico":               { country: "Mexico", taxName: "IVA", taxLabel: "IVA", structure: "single", taxIdLabel: "RFC", defaultRate: 16 },
  "Brazil":               { country: "Brazil", taxName: "ICMS", taxLabel: "ICMS", structure: "single", taxIdLabel: "CNPJ", defaultRate: 17 },
};

export interface ResolvedTaxInfo extends CountryTaxConfig {
  isIndiaGst: boolean;
}

/**
 * Returns the resolved tax profile for a given company.
 * If company has a custom taxName, it respects it while keeping other metadata intact.
 */
export function getCompanyTaxInfo(company?: { country?: string; taxName?: string } | null): ResolvedTaxInfo {
  const rawCountry = (company?.country || '').trim();
  const country = rawCountry || 'India';
  const mapping = COUNTRY_TAX_MAP[country] || {
    country,
    taxName: "VAT",
    taxLabel: "VAT",
    structure: "single" as const,
    taxIdLabel: "Tax ID",
    defaultRate: 0,
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
