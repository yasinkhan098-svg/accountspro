/**
 * Permission Guard & Role-Based Access Control (RBAC) System
 * For 100% Offline Multi-User Operation across Local Area Network (LAN)
 */

export type VoucherTypeKey = 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase' | 'Credit Note' | 'Debit Note' | 'Sales Quotation';

export interface VoucherPermissions {
  Purchase: boolean;
  Sales: boolean;
  Payment: boolean;
  Receipt: boolean;
  Contra: boolean;
  Journal: boolean;
  'Debit Note': boolean;
  'Credit Note': boolean;
  'Sales Quotation': boolean;
}

export interface RegisterPermissions {
  'Purchase Register': boolean;
  'Sales Register': boolean;
  'Day Book': boolean;
  'Payment Register': boolean;
  'Receipt Register': boolean;
  'Journal Register': boolean;
  'Contra Register': boolean;
  'Debit Note Register': boolean;
  'Credit Note Register': boolean;
  'Quotation Register': boolean;
}

export interface ModulePermissions {
  BOM: boolean;
  Manufacturing: boolean;
  BankStatement: boolean;
  PurchaseOrder: boolean;
}

export interface ReportPermissions {
  BalanceSheet: boolean;
  ProfitLoss: boolean;
  TrialBalance: boolean;
  StockSummary: boolean;
  GSTReports: boolean;
  AuditTrail: boolean;
}

export interface MasterPermissions {
  createLedger: boolean;
  alterLedger: boolean;
  createStockItem: boolean;
  alterStockItem: boolean;
  deleteMaster: boolean;
  deleteVoucher: boolean;
}

export interface UserPermissions {
  vouchers: VoucherPermissions;
  registers: RegisterPermissions;
  modules: ModulePermissions;
  reports: ReportPermissions;
  masters: MasterPermissions;
}

export interface LANUser {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  assignedCompanyCodes: string[]; // empty array = all companies
  isAdmin?: boolean;
  isActive: boolean;
  createdAt: string;
  permissions: UserPermissions;
}

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  vouchers: {
    Purchase: true,
    Sales: true,
    Payment: true,
    Receipt: true,
    Contra: true,
    Journal: true,
    'Debit Note': true,
    'Credit Note': true,
    'Sales Quotation': true,
  },
  registers: {
    'Purchase Register': true,
    'Sales Register': true,
    'Day Book': true,
    'Payment Register': true,
    'Receipt Register': true,
    'Journal Register': true,
    'Contra Register': true,
    'Debit Note Register': true,
    'Credit Note Register': true,
    'Quotation Register': true,
  },
  modules: {
    BOM: true,
    Manufacturing: true,
    BankStatement: true,
    PurchaseOrder: true,
  },
  reports: {
    BalanceSheet: true,
    ProfitLoss: true,
    TrialBalance: true,
    StockSummary: true,
    GSTReports: true,
    AuditTrail: true,
  },
  masters: {
    createLedger: true,
    alterLedger: true,
    createStockItem: true,
    alterStockItem: true,
    deleteMaster: true,
    deleteVoucher: true,
  },
};

export const DEFAULT_OPERATOR_PERMISSIONS: UserPermissions = {
  vouchers: {
    Purchase: false,
    Sales: true,
    Payment: false,
    Receipt: true,
    Contra: false,
    Journal: false,
    'Debit Note': false,
    'Credit Note': false,
    'Sales Quotation': true,
  },
  registers: {
    'Purchase Register': false,
    'Sales Register': true,
    'Day Book': true,
    'Payment Register': false,
    'Receipt Register': true,
    'Journal Register': false,
    'Contra Register': false,
    'Debit Note Register': false,
    'Credit Note Register': false,
    'Quotation Register': true,
  },
  modules: {
    BOM: false,
    Manufacturing: false,
    BankStatement: false,
    PurchaseOrder: false,
  },
  reports: {
    BalanceSheet: false,
    ProfitLoss: false,
    TrialBalance: false,
    StockSummary: true,
    GSTReports: false,
    AuditTrail: false,
  },
  masters: {
    createLedger: false,
    alterLedger: false,
    createStockItem: true,
    alterStockItem: false,
    deleteMaster: false,
    deleteVoucher: false,
  },
};

class PermissionGuardService {
  private currentUser: LANUser | null = null;
  private listeners: ((user: LANUser | null) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSavedSession();
    }
  }

  private loadSavedSession() {
    try {
      const raw = localStorage.getItem('ledgerx_active_lan_user');
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch (e) {
      this.currentUser = null;
    }
  }

  public getCurrentUser(): LANUser | null {
    if (!this.currentUser && typeof window !== 'undefined') {
      this.loadSavedSession();
    }
    return this.currentUser;
  }

  public setCurrentUser(user: LANUser | null) {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('ledgerx_active_lan_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('ledgerx_active_lan_user');
      }
    }
    this.notifyListeners();
  }

  public subscribe(listener: (user: LANUser | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try { listener(this.currentUser); } catch (e) {}
    }
  }

  /**
   * Checks if current user has permission for a specific Voucher Type (e.g. 'Purchase', 'Sales')
   */
  public canAccessVoucher(voucherType: string): boolean {
    if (!this.currentUser) return true; // Standalone single-user admin by default
    if (this.currentUser.isAdmin) return true;

    const vKey = voucherType as keyof VoucherPermissions;
    return !!this.currentUser.permissions?.vouchers?.[vKey];
  }

  /**
   * Checks if current user has permission for a specific screen or report
   */
  public canAccessScreen(screen: string): boolean {
    if (!this.currentUser) return true;
    if (this.currentUser.isAdmin) return true;

    const perms = this.currentUser.permissions;
    if (!perms) return true;

    switch (screen) {
      case 'BALANCE_SHEET':
        return !!perms.reports?.BalanceSheet;
      case 'PROFIT_LOSS':
        return !!perms.reports?.ProfitLoss;
      case 'TRIAL_BALANCE':
        return !!perms.reports?.TrialBalance;
      case 'STOCK_SUMMARY':
        return !!perms.reports?.StockSummary;
      case 'GSTR1_REPORT':
      case 'GSTR3B_REPORT':
        return !!perms.reports?.GSTReports;
      case 'AUDIT_TRAIL':
        return !!perms.reports?.AuditTrail;

      case 'BOM_MODULE':
        return !!perms.modules?.BOM || !!perms.modules?.Manufacturing;
      case 'BANK_STATEMENT_ENTRY':
        return !!perms.modules?.BankStatement;
      case 'PURCHASE_ORDER_ENTRY':
      case 'PURCHASE_ORDER_REGISTER':
        return !!perms.modules?.PurchaseOrder;

      case 'SALES_REGISTER':
        return !!perms.registers?.['Sales Register'];
      case 'PURCHASE_REGISTER':
        return !!perms.registers?.['Purchase Register'];
      case 'DAY_BOOK':
        return !!perms.registers?.['Day Book'];
      case 'PAYMENT_REGISTER':
        return !!perms.registers?.['Payment Register'];
      case 'RECEIPT_REGISTER':
        return !!perms.registers?.['Receipt Register'];
      case 'JOURNAL_REGISTER':
        return !!perms.registers?.['Journal Register'];
      case 'CONTRA_REGISTER':
        return !!perms.registers?.['Contra Register'];
      case 'DEBIT_NOTE_REGISTER':
        return !!perms.registers?.['Debit Note Register'];
      case 'CREDIT_NOTE_REGISTER':
        return !!perms.registers?.['Credit Note Register'];
      case 'QUOTATION_REGISTER':
        return !!perms.registers?.['Quotation Register'];

      case 'USER_ROLES':
        return !!this.currentUser.isAdmin; // Only Admin can manage roles

      case 'LEDGER_CREATION':
        return !!perms.masters?.createLedger;
      case 'STOCK_ITEM_CREATION':
        return !!perms.masters?.createStockItem;

      default:
        return true;
    }
  }

  /**
   * Checks if current user can delete records
   */
  public canDelete(type: 'master' | 'voucher' = 'voucher'): boolean {
    if (!this.currentUser) return true;
    if (this.currentUser.isAdmin) return true;
    if (type === 'master') return !!this.currentUser.permissions?.masters?.deleteMaster;
    return !!this.currentUser.permissions?.masters?.deleteVoucher;
  }

  /**
   * Checks if current user is allowed to access a specific company code
   */
  public canAccessCompany(companyCode: string): boolean {
    if (!this.currentUser) return true;
    if (this.currentUser.isAdmin) return true;
    const assigned = this.currentUser.assignedCompanyCodes;
    if (!assigned || assigned.length === 0) return true; // Allowed all if none restricted
    return assigned.includes(companyCode.toUpperCase().trim());
  }

  /**
   * Checks if current user can access a menu item by label
   */
  public canAccessMenuItem(label: string): boolean {
    if (!this.currentUser) return true;
    if (this.currentUser.isAdmin) return true;
    const perms = this.currentUser.permissions;
    if (!perms) return true;

    const lower = label.toLowerCase().trim();
    if (lower === 'quit' || lower === '') return true;

    // Reports
    if (lower.includes('balance sheet')) return !!perms.reports?.BalanceSheet;
    if (lower.includes('profit & loss')) return !!perms.reports?.ProfitLoss;
    if (lower.includes('trial balance')) return !!perms.reports?.TrialBalance;
    if (lower.includes('stock summary')) return !!perms.reports?.StockSummary;
    if (lower.includes('gstr')) return !!perms.reports?.GSTReports;
    if (lower.includes('audit trail')) return !!perms.reports?.AuditTrail;

    // User Roles (Admin only)
    if (lower.includes('user roles') || lower.includes('role management')) return !!this.currentUser.isAdmin;

    // Vouchers
    if (lower === 'vouchers') {
      const v = perms.vouchers;
      return !!v && Object.values(v).some(Boolean);
    }

    // Registers
    if (lower.includes('day book')) return !!perms.registers?.['Day Book'];
    if (lower.includes('sales register')) return !!perms.registers?.['Sales Register'];
    if (lower.includes('purchase register')) return !!perms.registers?.['Purchase Register'];
    if (lower.includes('payment register')) return !!perms.registers?.['Payment Register'];
    if (lower.includes('receipt register')) return !!perms.registers?.['Receipt Register'];
    if (lower.includes('journal register')) return !!perms.registers?.['Journal Register'];
    if (lower.includes('contra register')) return !!perms.registers?.['Contra Register'];
    if (lower.includes('debit note register')) return !!perms.registers?.['Debit Note Register'];
    if (lower.includes('credit note register')) return !!perms.registers?.['Credit Note Register'];
    if (lower.includes('quotation register')) return !!perms.registers?.['Quotation Register'];
    if (lower.includes('purchase order register')) return !!perms.modules?.PurchaseOrder;

    // Masters
    if (lower === 'create') {
      return !!perms.masters?.createLedger || !!perms.masters?.createStockItem;
    }
    if (lower === 'alter') {
      return !!perms.masters?.alterLedger || !!perms.masters?.alterStockItem;
    }
    if (lower === 'ledger' && !lower.includes('register')) return !!perms.masters?.createLedger || !!perms.masters?.alterLedger;
    if (lower === 'stock item') return !!perms.masters?.createStockItem || !!perms.masters?.alterStockItem;

    return true;
  }
}

export const permissionGuard = new PermissionGuardService();
