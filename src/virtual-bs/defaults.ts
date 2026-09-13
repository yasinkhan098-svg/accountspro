import { VirtualFormData } from './types';

export const DEFAULT_VIRTUAL_FORM_DATA: VirtualFormData = {
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
    signatoryTitle: 'PARTNER',
  },
  mode: 'actual',
  bsSections: {
    capitalItems: [
      { id: 'cap-1', name: 'Capital Account', amount: 5000000.00 }
    ],
    securedLoans: [
      { id: 'sl-1', name: 'Cc Limit With Bank', amount: 125000.00 },
      { id: 'sl-2', name: 'Icici Bank', amount: 1005000.00 }
    ],
    unsecuredLoans: [
      { id: 'ul-1', name: 'Loan From Relatives', amount: 50000.00 }
    ],
    currentLiabilities: [
      { id: 'cl-1', name: 'Sundry Creditors', amount: 1721366.00 },
      { id: 'cl-2', name: 'Outstanding Wages A/c', amount: 25000.00 },
      { id: 'cl-3', name: 'Lease Rent Payable A/c', amount: 250000.00 },
      { id: 'cl-4', name: 'Outstanding Rent A/c', amount: 3000.00 },
      { id: 'cl-5', name: 'Outstanding Salary A/c', amount: 350000.00 },
      { id: 'cl-6', name: 'Duties & Taxes', amount: 274116.96 }
    ],
    fixedAssets: [
      { id: 'fa-1', name: 'Machinery', amount: 60000.00 },
      { id: 'fa-2', name: 'Furniture A/c', amount: 25000.00 }
    ],
    securityDeposits: [
      { id: 'sd-1', name: 'Electricity Dept', amount: 45000.00 }
    ],
    currentAssets: [
      { id: 'ca-1', name: 'Sundry Debtors', amount: 733561.50 },
      { id: 'ca-2', name: 'Closing Stock', amount: 2500000.00 },
      { id: 'ca-3', name: 'Commission Receivable A/c', amount: 3500.00 },
      { id: 'ca-4', name: 'Cash-in-hand', amount: 924186.48 }
    ],
  },
  plData: {
    trading: {
      openingStock: 1850000.00,
      purchases: 12500000.00,
      directExpenses: [
        { id: 'de-1', name: 'Freight & Cartage Inward', amount: 65000.00 },
        { id: 'de-2', name: 'Direct Labour / Wages', amount: 120000.00 }
      ],
      sales: 18500000.00,
      closingStock: 2500000.00,
    },
    indirectIncomes: [
      { id: 'ii-1', name: 'Discount / Rebate Received', amount: 35000.00 }
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
    { id: 'p-2', name: 'PARTNER 2', sharePct: 50, openingBal: 2500000.00, addition: 0, salary: 0, interestRate: 12, withdrawalsAmt: 0 }
  ],
  fixedAssetSchedule: [
    { id: 'fas-1', name: 'Machinery', openingBal: 70588.24, additionBefore: 0, additionAfter: 0, depreciationRate: 15, closingBal: 60000.00 },
    { id: 'fas-2', name: 'Furniture A/c', openingBal: 27777.78, additionBefore: 0, additionAfter: 0, depreciationRate: 10, closingBal: 25000.00 }
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
  }
};
