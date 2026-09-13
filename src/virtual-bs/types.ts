// ─── Virtual Financial Statements Type Definitions ──────────────────────────

export interface VirtualCompanyDetails {
  name: string;
  address: string;
  place: string;
  fromDate: string;
  toDate: string;
  asOnDate: string;
}

export interface VirtualSignatoryDetails {
  caName: string;
  caMno: string;
  signatoryTitle: string; // 'PARTNER' | 'PROPRIETOR' | 'DIRECTOR' | 'AUTH. SIGNATORY'
}

export interface VirtualFinancialItem {
  id: string;
  name: string;
  amount: number;
}

export interface VirtualPartnerItem {
  id: string;
  name: string;
  sharePct: number;
  openingBal: number;
  addition: number;
  salary: number;
  interestRate: number;
  interestAmt?: number;
  withdrawalsAmt: number;
  withdrawalsNature?: string;
  profitShare?: number;
  total?: number;
  closingBal?: number;
}

export interface VirtualAssetItem {
  id: string;
  name: string;
  openingBal: number;
  additionBefore: number;
  additionAfter: number;
  depreciationRate: number;
  depreciation?: number;
  closingBal?: number;
}

export interface VirtualTradingData {
  openingStock: number;
  purchases: number;
  directExpenses: VirtualFinancialItem[];
  sales: number;
  closingStock: number;
}

export interface VirtualPLData {
  trading: VirtualTradingData;
  indirectIncomes: VirtualFinancialItem[];
  indirectExpenses: VirtualFinancialItem[];
}

export interface VirtualBSSections {
  capitalItems: VirtualFinancialItem[];
  securedLoans: VirtualFinancialItem[];
  unsecuredLoans: VirtualFinancialItem[];
  currentLiabilities: VirtualFinancialItem[];
  fixedAssets: VirtualFinancialItem[];
  securityDeposits: VirtualFinancialItem[];
  currentAssets: VirtualFinancialItem[];
}

export interface VirtualProjectionConfig {
  horizonYears: number; // 1, 2, 3
  salesGrowthPct: number;
  gpMarginPct: number;
  stockGrowthPct: number;
  expenseInflationPct: number;
  labourGrowthPct: number;
  deprReductionPct: number;
  ccLimitGrowthPct: number;
  interestRatePct?: number;
  drawingsGrowthPct?: number;
}

export interface VirtualFormData {
  company: VirtualCompanyDetails;
  signatory: VirtualSignatoryDetails;
  mode: 'actual' | 'provisional';
  bsSections: VirtualBSSections;
  plData: VirtualPLData;
  partners: VirtualPartnerItem[];
  fixedAssetSchedule: VirtualAssetItem[];
  projectionConfig: VirtualProjectionConfig;
  customProjDates?: {
    fromDate?: string;
    toDate?: string;
    asOnDate?: string;
  };
}

export interface CalculatedVirtualFinancials {
  // Trading & P&L
  directExpTotal: number;
  indirectExpTotal: number;
  indirectIncTotal: number;
  grossProfit: number;
  netProfit: number;
  tradingDebitTotal: number;
  tradingCreditTotal: number;
  plDebitTotal: number;
  plCreditTotal: number;

  // Annexure A
  calculatedPartners: VirtualPartnerItem[];
  totalClosingCapital: number;

  // Annexure B
  calculatedFASchedule: VirtualAssetItem[];
  totalClosingFA: number;

  // Balance Sheet Sections
  capitalTotal: number;
  securedTotal: number;
  unsecuredTotal: number;
  currLiabTotal: number;
  totalLiabilities: number;

  fixedAssetTotal: number;
  securityDepositsTotal: number;
  currAssetTotal: number;
  balancingCash: number;
  totalAssets: number;

  isBalanced: boolean;
  diff: number;
}

export interface VirtualProjectedYearResult extends CalculatedVirtualFinancials {
  yearNumber: number;
  yearLabel: string;
  fromDateStr: string;
  toDateStr: string;
  asOnDateStr: string;
  salesTotal: number;
  purchaseTotal: number;
  openingStock: number;
  closingStock: number;
}
