/**
 * POS Training Mode Service (Dedicated Sandbox Data & Storage)
 * 
 * Provides a 100% ISOLATED environment for POS cashier training:
 * - Completely separate folder: %LocalAppData%\LedgerX\data\TRAINING\ (and local data/TRAINING/)
 * - ZERO real company records (no real company name, no real stock, no real vouchers, no real users)
 * - Pre-loaded with 15 realistic FMCG products with barcodes 1000001 - 1000015
 * - Full functional parity: barcode scanning, cart calculation, payment, receipts, stock deduction, and POS list
 * - Any sales made in Training Mode persist ONLY in the TRAINING folder and can be reset anytime
 */

import { LANUser, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_OPERATOR_PERMISSIONS } from '@/lib/permissionGuard';
import { getBridgeBaseUrl } from '@/lib/companyDataFolderService';

export const TRAINING_COMPANY_CODE = 'TRAINING';

export const TRAINING_COMPANY = {
  id: 'TRAINING',
  companyCode: TRAINING_COMPANY_CODE,
  name: 'LEDGERX RETAIL STORE (TRAINING DEMO)',
  mailingName: 'LEDGERX RETAIL STORE (DEMO)',
  address: 'Plot 42, Demo Market, Retail Zone, Training City - 110001',
  state: 'Delhi',
  country: 'India',
  pincode: '110001',
  telephone: '011-98765432',
  mobile: '9876543210',
  email: 'training@ledgerxretail.demo',
  currencySymbol: '₹',
  formalName: 'INR',
  financialYearFrom: '2025-04-01',
  booksBeginningFrom: '2025-04-01',
  gstApplicable: true,
  gstin: '07AAAAA0000A1Z5',
  upiId: 'ledgerxtraining@okhdfcbank',
  isTraining: true,
};

export const TRAINING_USERS: LANUser[] = [
  {
    id: 'train_cashier1',
    username: 'trainee1',
    fullName: 'Trainee Cashier (Neha Sharma)',
    password: '',
    isAdmin: false,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    assignedCompanyCodes: [TRAINING_COMPANY_CODE],
    permissions: {
      ...DEFAULT_OPERATOR_PERMISSIONS,
      vouchers: {
        ...DEFAULT_OPERATOR_PERMISSIONS.vouchers,
        'Purchase POS List': true,
        'POS Sale': true,
      },
    },
  },
  {
    id: 'train_cashier2',
    username: 'trainee2',
    fullName: 'Trainee Cashier (Rahul Verma)',
    password: '',
    isAdmin: false,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    assignedCompanyCodes: [TRAINING_COMPANY_CODE],
    permissions: {
      ...DEFAULT_OPERATOR_PERMISSIONS,
      vouchers: {
        ...DEFAULT_OPERATOR_PERMISSIONS.vouchers,
        'Purchase POS List': true,
        'POS Sale': true,
      },
    },
  },
  {
    id: 'train_admin',
    username: 'trainer',
    fullName: 'Supervisor Demo (Admin)',
    password: '',
    isAdmin: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    assignedCompanyCodes: [TRAINING_COMPANY_CODE],
    permissions: DEFAULT_ADMIN_PERMISSIONS,
  },
];

export const INITIAL_TRAINING_STOCK_ITEMS: any[] = [
  {
    id: 1001,
    name: 'Parle-G Gold Biscuit (250g)',
    partNumber: '1000001',
    group: 'Packaged Foods',
    unit: 'PKT',
    openingQty: 50,
    openingRate: 20.95,
    rateInclTax: 22.00,
    purchasePrice: 22.00,
    mrp: 30.00,
    retailSalePrice: 28.00,
    discountPerc: 6.67,
    discountAmt: 2.00,
    gstRate: 5,
    cessRate: 0,
    expiryDate: '31/12/2026',
    barcode: '1000001',
  },
  {
    id: 1002,
    name: 'Amul Taaza Milk Pouch (500ml)',
    partNumber: '1000002',
    group: 'Dairy & Bakery',
    unit: 'PKT',
    openingQty: 30,
    openingRate: 25.00,
    rateInclTax: 25.00,
    purchasePrice: 25.00,
    mrp: 28.00,
    retailSalePrice: 28.00,
    discountPerc: 0,
    discountAmt: 0,
    gstRate: 0,
    cessRate: 0,
    expiryDate: '10/12/2026',
    barcode: '1000002',
  },
  {
    id: 1003,
    name: 'Britannia Whole Wheat Bread (400g)',
    partNumber: '1000003',
    group: 'Dairy & Bakery',
    unit: 'PKT',
    openingQty: 40,
    openingRate: 34.29,
    rateInclTax: 36.00,
    purchasePrice: 36.00,
    mrp: 45.00,
    retailSalePrice: 42.00,
    discountPerc: 6.67,
    discountAmt: 3.00,
    gstRate: 5,
    cessRate: 0,
    expiryDate: '15/12/2026',
    barcode: '1000003',
  },
  {
    id: 1004,
    name: 'Tata Salt Vacuum Evaporated (1kg)',
    partNumber: '1000004',
    group: 'Grocery',
    unit: 'PKT',
    openingQty: 100,
    openingRate: 22.00,
    rateInclTax: 22.00,
    purchasePrice: 22.00,
    mrp: 28.00,
    retailSalePrice: 26.00,
    discountPerc: 7.14,
    discountAmt: 2.00,
    gstRate: 0,
    cessRate: 0,
    expiryDate: '30/11/2027',
    barcode: '1000004',
  },
  {
    id: 1005,
    name: 'Maggi 2-Minute Masala Noodles (70g)',
    partNumber: '1000005',
    group: 'Packaged Foods',
    unit: 'PKT',
    openingQty: 120,
    openingRate: 10.27,
    rateInclTax: 11.50,
    purchasePrice: 11.50,
    mrp: 14.00,
    retailSalePrice: 14.00,
    discountPerc: 0,
    discountAmt: 0,
    gstRate: 12,
    cessRate: 0,
    expiryDate: '28/02/2027',
    barcode: '1000005',
  },
  {
    id: 1006,
    name: 'Coca-Cola Soft Drink Bottle (500ml)',
    partNumber: '1000006',
    group: 'Beverages',
    unit: 'BTL',
    openingQty: 60,
    openingRate: 25.00,
    rateInclTax: 32.00,
    purchasePrice: 32.00,
    mrp: 40.00,
    retailSalePrice: 38.00,
    discountPerc: 5.00,
    discountAmt: 2.00,
    gstRate: 28,
    cessRate: 0,
    expiryDate: '15/09/2026',
    barcode: '1000006',
  },
  {
    id: 1007,
    name: 'Dettol Original Bath Soap (75g)',
    partNumber: '1000007',
    group: 'Personal Care',
    unit: 'PCS',
    openingQty: 80,
    openingRate: 29.66,
    rateInclTax: 35.00,
    purchasePrice: 35.00,
    mrp: 45.00,
    retailSalePrice: 40.00,
    discountPerc: 11.11,
    discountAmt: 5.00,
    gstRate: 18,
    cessRate: 0,
    expiryDate: '30/06/2027',
    barcode: '1000007',
  },
  {
    id: 1008,
    name: 'Fortune Sunlite Refined Oil (1L)',
    partNumber: '1000008',
    group: 'Grocery',
    unit: 'PKT',
    openingQty: 40,
    openingRate: 131.43,
    rateInclTax: 138.00,
    purchasePrice: 138.00,
    mrp: 165.00,
    retailSalePrice: 155.00,
    discountPerc: 6.06,
    discountAmt: 10.00,
    gstRate: 5,
    cessRate: 0,
    expiryDate: '31/01/2027',
    barcode: '1000008',
  },
  {
    id: 1009,
    name: 'Colgate MaxFresh Toothpaste (150g)',
    partNumber: '1000009',
    group: 'Personal Care',
    unit: 'PCS',
    openingQty: 45,
    openingRate: 62.71,
    rateInclTax: 74.00,
    purchasePrice: 74.00,
    mrp: 95.00,
    retailSalePrice: 88.00,
    discountPerc: 7.37,
    discountAmt: 7.00,
    gstRate: 18,
    cessRate: 0,
    expiryDate: '31/08/2027',
    barcode: '1000009',
  },
  {
    id: 1010,
    name: 'Aashirvaad Superior MP Atta (5kg)',
    partNumber: '1000010',
    group: 'Grocery',
    unit: 'BAG',
    openingQty: 30,
    openingRate: 215.00,
    rateInclTax: 215.00,
    purchasePrice: 215.00,
    mrp: 265.00,
    retailSalePrice: 245.00,
    discountPerc: 7.55,
    discountAmt: 20.00,
    gstRate: 0,
    cessRate: 0,
    expiryDate: '30/04/2027',
    barcode: '1000010',
  },
  {
    id: 1011,
    name: 'Surf Excel Detergent Powder (1kg)',
    partNumber: '1000011',
    group: 'Household',
    unit: 'PKT',
    openingQty: 35,
    openingRate: 91.53,
    rateInclTax: 108.00,
    purchasePrice: 108.00,
    mrp: 140.00,
    retailSalePrice: 130.00,
    discountPerc: 7.14,
    discountAmt: 10.00,
    gstRate: 18,
    cessRate: 0,
    expiryDate: '31/12/2027',
    barcode: '1000011',
  },
  {
    id: 1012,
    name: 'Cadbury Dairy Milk Silk (60g)',
    partNumber: '1000012',
    group: 'Confectionery',
    unit: 'PCS',
    openingQty: 50,
    openingRate: 52.54,
    rateInclTax: 62.00,
    purchasePrice: 62.00,
    mrp: 80.00,
    retailSalePrice: 75.00,
    discountPerc: 6.25,
    discountAmt: 5.00,
    gstRate: 18,
    cessRate: 0,
    expiryDate: '31/05/2026',
    barcode: '1000012',
  },
  {
    id: 1013,
    name: 'Nescafe Classic Coffee Jar (50g)',
    partNumber: '1000013',
    group: 'Beverages',
    unit: 'BTL',
    openingQty: 40,
    openingRate: 120.34,
    rateInclTax: 142.00,
    purchasePrice: 142.00,
    mrp: 180.00,
    retailSalePrice: 165.00,
    discountPerc: 8.33,
    discountAmt: 15.00,
    gstRate: 18,
    cessRate: 0,
    expiryDate: '30/11/2027',
    barcode: '1000013',
  },
  {
    id: 1014,
    name: 'Lays Tomato Tango Chips (50g)',
    partNumber: '1000014',
    group: 'Packaged Foods',
    unit: 'PKT',
    openingQty: 90,
    openingRate: 14.29,
    rateInclTax: 16.00,
    purchasePrice: 16.00,
    mrp: 20.00,
    retailSalePrice: 20.00,
    discountPerc: 0,
    discountAmt: 0,
    gstRate: 12,
    cessRate: 0,
    expiryDate: '31/07/2026',
    barcode: '1000014',
  },
  {
    id: 1015,
    name: 'Haldiram All In One Mixture (200g)',
    partNumber: '1000015',
    group: 'Packaged Foods',
    unit: 'PKT',
    openingQty: 60,
    openingRate: 37.50,
    rateInclTax: 42.00,
    purchasePrice: 42.00,
    mrp: 55.00,
    retailSalePrice: 50.00,
    discountPerc: 9.09,
    discountAmt: 5.00,
    gstRate: 12,
    cessRate: 0,
    expiryDate: '31/10/2026',
    barcode: '1000015',
  },
];

export const INITIAL_TRAINING_POS_PURCHASE_LIST: any[] = INITIAL_TRAINING_STOCK_ITEMS.map((item, idx) => ({
  id: idx + 1,
  sNo: idx + 1,
  name: item.name,
  purchasePrice: item.purchasePrice,
  newPurchasePrice: item.purchasePrice,
  expiryDate: item.expiryDate,
  cessPerc: 0,
  openingStock: item.openingQty,
  barcode: item.barcode,
  mrp: item.mrp,
  discountPerc: item.discountPerc,
  discountAmt: item.discountAmt,
  retailSalePrice: item.retailSalePrice,
  unit: item.unit,
  gstRate: item.gstRate,
}));

export const INITIAL_TRAINING_LEDGERS: any[] = [
  { id: 101, name: 'Cash', group: 'Cash-in-Hand', openingBalance: 10000, type: 'Cash' },
  { id: 102, name: 'Demo Bank Account (HDFC)', group: 'Bank Accounts', openingBalance: 50000, type: 'Bank' },
  { id: 103, name: 'Retail Sales A/c', group: 'Sales Accounts', openingBalance: 0 },
  { id: 104, name: 'Output CGST', group: 'Duties & Taxes', openingBalance: 0 },
  { id: 105, name: 'Output SGST', group: 'Duties & Taxes', openingBalance: 0 },
  { id: 106, name: 'Output IGST', group: 'Duties & Taxes', openingBalance: 0 },
  { id: 107, name: 'Discount Allowed', group: 'Indirect Expenses', openingBalance: 0 },
  { id: 108, name: 'Round Off', group: 'Indirect Expenses', openingBalance: 0 },
  { id: 109, name: 'Walk-in Customer', group: 'Sundry Debtors', openingBalance: 0 },
];

export const INITIAL_TRAINING_VOUCHERS: any[] = [
  {
    id: 9001,
    voucherNumber: 'TRN-0001',
    type: 'Sales',
    date: new Date().toISOString().split('T')[0],
    partyLedgerName: 'Cash',
    amount: 140.00,
    narration: 'Training Demo Sale - Parle-G & Milk',
    inventoryEntries: [
      { itemId: 1001, itemName: 'Parle-G Gold Biscuit (250g)', qty: 2, rate: 28.00, amount: 56.00, gstRate: 5 },
      { itemId: 1002, itemName: 'Amul Taaza Milk Pouch (500ml)', qty: 3, rate: 28.00, amount: 84.00, gstRate: 0 },
    ],
  },
];

export const INITIAL_TRAINING_UNITS = [
  { id: 1, name: 'PKT', formalName: 'Packets' },
  { id: 2, name: 'BTL', formalName: 'Bottles' },
  { id: 3, name: 'PCS', formalName: 'Pieces' },
  { id: 4, name: 'BAG', formalName: 'Bags' },
  { id: 5, name: 'KG', formalName: 'Kilograms' },
];

export const INITIAL_TRAINING_STOCK_GROUPS = [
  { id: 1, name: 'Packaged Foods' },
  { id: 2, name: 'Dairy & Bakery' },
  { id: 3, name: 'Grocery' },
  { id: 4, name: 'Beverages' },
  { id: 5, name: 'Personal Care' },
  { id: 6, name: 'Household' },
  { id: 7, name: 'Confectionery' },
];

export interface TrainingDataPackage {
  companyCode: string;
  company: any;
  users: LANUser[];
  stockItems: any[];
  posPurchaseList: any[];
  ledgers: any[];
  vouchers: any[];
  units: any[];
  stockGroups: any[];
}

const LOCAL_STORAGE_CACHE_KEY = 'ledgerx_pos_training_data_cache_v1';

class POSTrainingService {
  private memoryCache: TrainingDataPackage | null = null;

  public isTrainingCompany(company: any): boolean {
    if (!company) return false;
    const code = String(company.companyCode || company.code || company.id || '').toUpperCase().trim();
    return code === TRAINING_COMPANY_CODE || Boolean(company.isTraining);
  }

  /**
   * Retrieves the full isolated training data package.
   * If not found on disk / cache, creates and seeds the TRAINING folder.
   */
  public async getTrainingData(): Promise<TrainingDataPackage> {
    if (this.memoryCache) {
      return this.memoryCache;
    }

    // 1. Check C# Launcher bridge for TRAINING folder
    try {
      const bridgeUrl = getBridgeBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${bridgeUrl}/api/company?code=${TRAINING_COMPANY_CODE}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && json.company && json.company.name) {
          const pkg = this.normalizePackage(json);
          this.memoryCache = pkg;
          this.saveToLocalCache(pkg);
          return pkg;
        }
      }
    } catch (_) {}

    // 2. Check Next.js API /api/pos/training
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/pos/training', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && json.company && json.company.name) {
          const pkg = this.normalizePackage(json);
          this.memoryCache = pkg;
          this.saveToLocalCache(pkg);
          return pkg;
        }
      }
    } catch (_) {}

    // 3. Check localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.company && parsed.company.name) {
            this.memoryCache = parsed;
            // Background persist to disk if possible
            this.persistToDisk(parsed).catch(() => {});
            return parsed;
          }
        }
      } catch (_) {}
    }

    // 4. Fallback: Seed brand new default training dataset
    const freshPkg = this.getDefaultPackage();
    this.memoryCache = freshPkg;
    this.saveToLocalCache(freshPkg);
    await this.persistToDisk(freshPkg);
    return freshPkg;
  }

  public getDefaultPackage(): TrainingDataPackage {
    return {
      companyCode: TRAINING_COMPANY_CODE,
      company: { ...TRAINING_COMPANY },
      users: [...TRAINING_USERS],
      stockItems: JSON.parse(JSON.stringify(INITIAL_TRAINING_STOCK_ITEMS)),
      posPurchaseList: JSON.parse(JSON.stringify(INITIAL_TRAINING_POS_PURCHASE_LIST)),
      ledgers: JSON.parse(JSON.stringify(INITIAL_TRAINING_LEDGERS)),
      vouchers: JSON.parse(JSON.stringify(INITIAL_TRAINING_VOUCHERS)),
      units: JSON.parse(JSON.stringify(INITIAL_TRAINING_UNITS)),
      stockGroups: JSON.parse(JSON.stringify(INITIAL_TRAINING_STOCK_GROUPS)),
    };
  }

  private normalizePackage(raw: any): TrainingDataPackage {
    return {
      companyCode: TRAINING_COMPANY_CODE,
      company: raw.company || TRAINING_COMPANY,
      users: Array.isArray(raw.users) && raw.users.length > 0 ? raw.users : TRAINING_USERS,
      stockItems: Array.isArray(raw.stockItems) && raw.stockItems.length > 0 ? raw.stockItems : INITIAL_TRAINING_STOCK_ITEMS,
      posPurchaseList: Array.isArray(raw.posPurchaseList) && raw.posPurchaseList.length > 0 ? raw.posPurchaseList : INITIAL_TRAINING_POS_PURCHASE_LIST,
      ledgers: Array.isArray(raw.ledgers) && raw.ledgers.length > 0 ? raw.ledgers : INITIAL_TRAINING_LEDGERS,
      vouchers: Array.isArray(raw.vouchers) ? raw.vouchers : INITIAL_TRAINING_VOUCHERS,
      units: Array.isArray(raw.units) ? raw.units : INITIAL_TRAINING_UNITS,
      stockGroups: Array.isArray(raw.stockGroups) ? raw.stockGroups : INITIAL_TRAINING_STOCK_GROUPS,
    };
  }

  private saveToLocalCache(pkg: TrainingDataPackage): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(pkg));
    } catch (_) {}
  }

  /**
   * Persists the package strictly to the TRAINING folder on disk via C# bridge and Next API
   */
  public async persistToDisk(pkg: TrainingDataPackage): Promise<boolean> {
    this.memoryCache = pkg;
    this.saveToLocalCache(pkg);

    // 1. C# Bridge stream save
    try {
      const bridgeUrl = getBridgeBaseUrl();
      const files: [string, any][] = [
        ['company.json', pkg.company],
        ['users.json', pkg.users],
        ['stock_items.json', pkg.stockItems],
        ['pos_purchase_list.json', pkg.posPurchaseList],
        ['ledgers.json', pkg.ledgers],
        ['vouchers.json', pkg.vouchers],
        ['units.json', pkg.units],
        ['stock_groups.json', pkg.stockGroups],
      ];

      for (const [file, content] of files) {
        fetch(`${bridgeUrl}/api/save-file?code=${TRAINING_COMPANY_CODE}&file=${encodeURIComponent(file)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content),
        }).catch(() => {});
      }
    } catch (_) {}

    // 2. Next.js API save
    try {
      await fetch('/api/pos/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg),
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Records a finalized POS sale inside Training Mode:
   * - Deducts quantity from training stock items and training POS purchase list
   * - Appends training sales voucher to training vouchers
   * - Persists into TRAINING folder ONLY
   */
  public async recordTrainingSale(params: {
    billNo: string;
    items: any[];
    totals: any;
    payment: any;
    customer?: any;
    cashierName?: string;
  }): Promise<{ success: boolean; voucher: any; updatedStock: any[] }> {
    const pkg = await this.getTrainingData();

    // 1. Deduct stock from training stock items
    const updatedStock = pkg.stockItems.map(item => {
      const sold = params.items.find(
        ci => ci.id === item.id || (ci.name && item.name && ci.name.trim().toLowerCase() === item.name.trim().toLowerCase())
      );
      if (sold) {
        const currentQty = Number(item.openingQty) || 0;
        return {
          ...item,
          openingQty: Math.max(0, currentQty - (Number(sold.qty) || 1)),
        };
      }
      return item;
    });

    // 2. Deduct stock from training POS purchase list
    const updatedPOSList = (pkg.posPurchaseList || []).map(pi => {
      const sold = params.items.find(
        ci => ci.id === pi.id || (ci.name && pi.name && ci.name.trim().toLowerCase() === pi.name.trim().toLowerCase())
      );
      if (sold) {
        const currentQty = Number(pi.openingStock) || 0;
        return {
          ...pi,
          openingStock: Math.max(0, currentQty - (Number(sold.qty) || 1)),
        };
      }
      return pi;
    });

    // 3. Build training voucher
    const newVoucher = {
      id: Date.now(),
      voucherNumber: params.billNo || `TRN-${String(pkg.vouchers.length + 1).padStart(4, '0')}`,
      type: 'Sales',
      date: new Date().toISOString().split('T')[0],
      partyLedgerName: params.payment?.method === 'Cash' ? 'Cash' : (params.customer?.name || 'Walk-in Customer'),
      amount: Number(params.totals?.grandTotal) || 0,
      narration: `*** TRAINING DEMO SALE *** Cashier: ${params.cashierName || 'Trainee'}. Paid via ${params.payment?.method || 'Cash'}.`,
      isTraining: true,
      inventoryEntries: params.items.map(ci => ({
        itemId: ci.id,
        itemName: ci.name,
        qty: Number(ci.qty) || 1,
        rate: Number(ci.retailSalePrice || ci.rate) || 0,
        amount: (Number(ci.qty) || 1) * (Number(ci.retailSalePrice || ci.rate) || 0),
        gstRate: Number(ci.taxRate || ci.gstRate) || 0,
      })),
      createdAt: new Date().toISOString(),
    };

    const updatedPkg: TrainingDataPackage = {
      ...pkg,
      stockItems: updatedStock,
      posPurchaseList: updatedPOSList,
      vouchers: [...pkg.vouchers, newVoucher],
    };

    await this.persistToDisk(updatedPkg);

    return {
      success: true,
      voucher: newVoucher,
      updatedStock,
    };
  }

  /**
   * Resets training data back to initial fresh dummy state (stock reset to default, test vouchers cleared)
   */
  public async resetTrainingData(): Promise<TrainingDataPackage> {
    const defaultPkg = this.getDefaultPackage();
    this.memoryCache = defaultPkg;
    this.saveToLocalCache(defaultPkg);
    await this.persistToDisk(defaultPkg);
    return defaultPkg;
  }
}

export const posTrainingService = new POSTrainingService();

