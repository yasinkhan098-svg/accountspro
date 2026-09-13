import { VirtualFormData } from './types';

/**
 * Standard CA Template:
 * All standard groups and ledgers are populated by default.
 * All amounts are initialized to 0 so they display as clean placeholders (e.g. "0.00")
 * until the user types their values.
 * Users can freely add new ledgers (+ Add) or delete unwanted ones (✕).
 */
export const DEFAULT_TEMPLATE_VIRTUAL_FORM_DATA: VirtualFormData = {
  company: {
    name: '',
    address: '',
    place: '',
    fromDate: '01-Apr-2025',
    toDate: '31-Mar-2026',
    asOnDate: '31.03.2026',
  },
  signatory: {
    caName: '',
    caMno: '',
    caFirmRegNo: '',
    caUdin: '',
    signatoryTitle: 'PARTNER',
  },
  mode: 'actual',
  bsSections: {
    capitalItems: [
      { id: 'p-1', name: 'PARTNER 1', amount: 0 },
      { id: 'p-2', name: 'PARTNER 2', amount: 0 },
    ],
    securedLoans: [
      { id: 'sl-1', name: 'Cc Limit With Bank', amount: 0 },
      { id: 'sl-2', name: 'Icici Bank', amount: 0 },
    ],
    unsecuredLoans: [
      { id: 'ul-1', name: 'Loan From Relatives', amount: 0 },
    ],
    currentLiabilities: [
      { id: 'cl-1', name: 'Sundry Creditors', amount: 0 },
      { id: 'cl-2', name: 'Outstanding Wages A/c', amount: 0 },
      { id: 'cl-3', name: 'Lease Rent Payable A/c', amount: 0 },
      { id: 'cl-4', name: 'Outstanding Rent A/c', amount: 0 },
      { id: 'cl-5', name: 'Outstanding Salary A/c', amount: 0 },
      { id: 'cl-6', name: 'Duties & Taxes', amount: 0 },
    ],
    fixedAssets: [
      { id: 'fa-1', name: 'Machinery', amount: 0 },
      { id: 'fa-2', name: 'Furniture A/c', amount: 0 },
    ],
    securityDeposits: [
      { id: 'sd-1', name: 'Electricity Dept', amount: 0 },
    ],
    currentAssets: [
      { id: 'ca-1', name: 'Sundry Debtors', amount: 0 },
      { id: 'ca-2', name: 'Closing Stock', amount: 0 },
      { id: 'ca-3', name: 'Commission Receivable A/c', amount: 0 },
      { id: 'ca-4', name: 'Cash-in-hand', amount: 0 },
    ],
  },
  plData: {
    trading: {
      openingStock: 0,
      purchases: 0,
      directExpenses: [
        { id: 'de-1', name: 'Freight & Cartage Inward', amount: 0 },
        { id: 'de-2', name: 'Direct Labour / Wages', amount: 0 },
      ],
      sales: 0,
      closingStock: 0,
    },
    indirectIncomes: [
      { id: 'ii-1', name: 'Discount / Rebate Received', amount: 0 },
    ],
    indirectExpenses: [
      { id: 'ie-1', name: 'To Bank Interest & Charges', amount: 0 },
      { id: 'ie-2', name: 'To Audit Fees', amount: 0 },
      { id: 'ie-3', name: 'To Office & Administrative Expenses', amount: 0 },
      { id: 'ie-4', name: 'To Staff Salary', amount: 0 },
    ],
  },
  partners: [
    { id: 'p-1', name: 'PARTNER 1', sharePct: 50, openingBal: 0, addition: 0, salary: 0, interestRate: 12, withdrawalsAmt: 0 },
    { id: 'p-2', name: 'PARTNER 2', sharePct: 50, openingBal: 0, addition: 0, salary: 0, interestRate: 12, withdrawalsAmt: 0 },
  ],
  fixedAssetSchedule: [
    { id: 'fas-1', name: 'Machinery', openingBal: 0, additionBefore: 0, additionAfter: 0, depreciationRate: 15, closingBal: 0 },
    { id: 'fas-2', name: 'Furniture A/c', openingBal: 0, additionBefore: 0, additionAfter: 0, depreciationRate: 10, closingBal: 0 },
  ],
  projectionConfig: {
    horizonYears: 1,
    salesGrowthPct: 25.0,
    gpMarginPct: 15.0,
    stockGrowthPct: 5.0,
    expenseInflationPct: 10.0,
    labourGrowthPct: 15.0,
    deprReductionPct: 15.0,
    ccLimitGrowthPct: 10.0,
    interestRatePct: 8.0,
    drawingsGrowthPct: 20.0,
  },
};

/**
 * Empty Form Data (Blank Slate with no ledgers)
 */
export const EMPTY_VIRTUAL_FORM_DATA: VirtualFormData = {
  company: {
    name: '',
    address: '',
    place: '',
    fromDate: '',
    toDate: '',
    asOnDate: '',
  },
  signatory: {
    caName: '',
    caMno: '',
    caFirmRegNo: '',
    caUdin: '',
    signatoryTitle: 'PARTNER',
  },
  mode: 'actual',
  bsSections: {
    capitalItems: [],
    securedLoans: [],
    unsecuredLoans: [],
    currentLiabilities: [],
    fixedAssets: [],
    securityDeposits: [],
    currentAssets: [],
  },
  plData: {
    trading: {
      openingStock: 0,
      purchases: 0,
      directExpenses: [],
      sales: 0,
      closingStock: 0,
    },
    indirectIncomes: [],
    indirectExpenses: [],
  },
  partners: [],
  fixedAssetSchedule: [],
  projectionConfig: {
    horizonYears: 1,
    salesGrowthPct: 0,
    gpMarginPct: 0,
    stockGrowthPct: 0,
    expenseInflationPct: 0,
    labourGrowthPct: 0,
    deprReductionPct: 0,
    ccLimitGrowthPct: 0,
    interestRatePct: 0,
    drawingsGrowthPct: 0,
  },
};

/**
 * Sample / Demo Form Data with prefilled amounts for testing calculations
 */
export const SAMPLE_VIRTUAL_FORM_DATA: VirtualFormData = {
  company: {
    name: 'AIMAN TRADERS',
    address: 'KHATIMA ROAD NEAR GOVERNMENT HOSPITAL SITARGANJ UDHAM SINGH NAGAR',
    place: 'UTTARAKHAND',
    fromDate: '01-Apr-2026',
    toDate: '31-Mar-2027',
    asOnDate: '31.03.2027',
  },
  signatory: {
    caName: 'RAMESH GUPTA & CO.',
    caMno: '054321',
    caFirmRegNo: '012345N',
    caUdin: '26054321AAAAAA1234',
    signatoryTitle: 'PARTNER',
  },
  mode: 'actual',
  bsSections: {
    capitalItems: [
      { id: 'p-1', name: 'PARTNER 1', amount: 2500000.00 },
      { id: 'p-2', name: 'PARTNER 2', amount: 2500000.00 },
    ],
    securedLoans: [
      { id: 'sl-1', name: 'Cc Limit With Bank', amount: 125000.00 },
      { id: 'sl-2', name: 'Icici Bank', amount: 1005000.00 },
    ],
    unsecuredLoans: [
      { id: 'ul-1', name: 'Loan From Relatives', amount: 50000.00 },
    ],
    currentLiabilities: [
      { id: 'cl-1', name: 'Sundry Creditors', amount: 1721366.00 },
      { id: 'cl-2', name: 'Outstanding Wages A/c', amount: 25000.00 },
      { id: 'cl-3', name: 'Lease Rent Payable A/c', amount: 250000.00 },
      { id: 'cl-4', name: 'Outstanding Rent A/c', amount: 3000.00 },
      { id: 'cl-5', name: 'Outstanding Salary A/c', amount: 350000.00 },
      { id: 'cl-6', name: 'Duties & Taxes', amount: 274116.96 },
    ],
    fixedAssets: [
      { id: 'fa-1', name: 'Machinery', amount: 60000.00 },
      { id: 'fa-2', name: 'Furniture A/c', amount: 25000.00 },
    ],
    securityDeposits: [
      { id: 'sd-1', name: 'Electricity Dept', amount: 45000.00 },
    ],
    currentAssets: [
      { id: 'ca-1', name: 'Sundry Debtors', amount: 733561.50 },
      { id: 'ca-2', name: 'Closing Stock', amount: 2500000.00 },
      { id: 'ca-3', name: 'Commission Receivable A/c', amount: 3500.00 },
      { id: 'ca-4', name: 'Cash-in-hand', amount: 924186.48 },
    ],
  },
  plData: {
    trading: {
      openingStock: 1850000.00,
      purchases: 12500000.00,
      directExpenses: [
        { id: 'de-1', name: 'Freight & Cartage Inward', amount: 65000.00 },
        { id: 'de-2', name: 'Direct Labour / Wages', amount: 120000.00 },
      ],
      sales: 18500000.00,
      closingStock: 2500000.00,
    },
    indirectIncomes: [
      { id: 'ii-1', name: 'Discount / Rebate Received', amount: 35000.00 },
    ],
    indirectExpenses: [
      { id: 'ie-1', name: 'To Bank Interest & Charges', amount: 125000.00 },
      { id: 'ie-2', name: 'To Audit Fees', amount: 25000.00 },
      { id: 'ie-3', name: 'To Office & Administrative Expenses', amount: 185000.00 },
      { id: 'ie-4', name: 'To Staff Salary', amount: 320000.00 },
    ],
  },
  partners: [
    { id: 'p-1', name: 'PARTNER 1', sharePct: 50, openingBal: 2500000.00, addition: 0, salary: 0, interestRate: 12, withdrawalsAmt: 0 },
    { id: 'p-2', name: 'PARTNER 2', sharePct: 50, openingBal: 2500000.00, addition: 0, salary: 0, interestRate: 12, withdrawalsAmt: 0 },
  ],
  fixedAssetSchedule: [
    { id: 'fas-1', name: 'Machinery', openingBal: 70588.24, additionBefore: 0, additionAfter: 0, depreciationRate: 15, closingBal: 60000.00 },
    { id: 'fas-2', name: 'Furniture A/c', openingBal: 27777.78, additionBefore: 0, additionAfter: 0, depreciationRate: 10, closingBal: 25000.00 },
  ],
  projectionConfig: {
    horizonYears: 1,
    salesGrowthPct: 25.0,
    gpMarginPct: 15.0,
    stockGrowthPct: 5.0,
    expenseInflationPct: 10.0,
    labourGrowthPct: 15.0,
    deprReductionPct: 15.0,
    ccLimitGrowthPct: 10.0,
    interestRatePct: 8.0,
    drawingsGrowthPct: 20.0,
  },
};

/**
 * By default, show all standard ledgers with empty amount placeholders
 */
export const DEFAULT_VIRTUAL_FORM_DATA = DEFAULT_TEMPLATE_VIRTUAL_FORM_DATA;
