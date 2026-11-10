const fs = require('fs');
const path = require('path');
const base = path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data');

const posPermissionsOnlyPOS = {
  vouchers: {
    Purchase: false,
    Sales: false,
    Payment: false,
    Receipt: false,
    Contra: false,
    Journal: false,
    'Debit Note': false,
    'Credit Note': false,
    'Sales Quotation': false,
    'POS Sale': true,
    'Purchase POS List': true
  },
  registers: {
    'Purchase Register': false,
    'Sales Register': false,
    'Day Book': false,
    'Payment Register': false,
    'Receipt Register': false,
    'Journal Register': false,
    'Contra Register': false,
    'Debit Note Register': false,
    'Credit Note Register': false,
    'Quotation Register': false
  },
  modules: { BOM: false, Manufacturing: false, BankStatement: false, PurchaseOrder: false },
  reports: { BalanceSheet: false, ProfitLoss: false, TrialBalance: false, StockSummary: false, GSTReports: false, AuditTrail: false },
  masters: { createLedger: false, alterLedger: false, createStockItem: false, alterStockItem: false, deleteMaster: false, deleteVoucher: false }
};

const adminPermissions = {
  vouchers: { Purchase: true, Sales: true, Payment: true, Receipt: true, Contra: true, Journal: true, 'Debit Note': true, 'Credit Note': true, 'Sales Quotation': true, 'POS Sale': true, 'Purchase POS List': true },
  registers: { 'Purchase Register': true, 'Sales Register': true, 'Day Book': true, 'Payment Register': true, 'Receipt Register': true, 'Journal Register': true, 'Contra Register': true, 'Debit Note Register': true, 'Credit Note Register': true, 'Quotation Register': true },
  modules: { BOM: true, Manufacturing: true, BankStatement: true, PurchaseOrder: true },
  reports: { BalanceSheet: true, ProfitLoss: true, TrialBalance: true, StockSummary: true, GSTReports: true, AuditTrail: true },
  masters: { createLedger: true, alterLedger: true, createStockItem: true, alterStockItem: true, deleteMaster: true, deleteVoucher: true }
};

for (let c = 10001; c <= 10006; c++) {
  if (c === 10002) continue;
  const pUsers = path.join(base, String(c), 'users.json');
  const code = String(c);
  const defUsers = [
    {
      id: 'usr_admin_' + code,
      username: 'admin',
      fullName: 'Company Administrator',
      password: '',
      assignedCompanyCodes: [code],
      companyCode: code,
      isAdmin: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      permissions: adminPermissions
    },
    {
      id: 'usr_cashier_' + code,
      username: 'cashier',
      fullName: 'Counter Cashier',
      password: '',
      assignedCompanyCodes: [code],
      companyCode: code,
      isAdmin: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      permissions: posPermissionsOnlyPOS
    }
  ];
  fs.writeFileSync(pUsers, JSON.stringify(defUsers, null, 2), 'utf-8');
  console.log(code, 'default users saved');
}
console.log('All companies initialized with users successfully');

