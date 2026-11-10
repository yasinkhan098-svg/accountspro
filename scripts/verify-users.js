const fs = require('fs');
const path = require('path');

const localApp = process.env.LOCALAPPDATA;
const base = path.join(localApp, 'LedgerX', 'data');

// 1. Check 10000
const u10000 = JSON.parse(fs.readFileSync(path.join(base, '10000', 'users.json'), 'utf-8'));
console.log("10000 users:", u10000.map(u => ({ username: u.username, pwd: u.password, perms: Object.keys(u.permissions?.vouchers || {}).filter(k => u.permissions.vouchers[k]) })));

// 2. Check 10001
let u10001 = JSON.parse(fs.readFileSync(path.join(base, '10001', 'users.json'), 'utf-8'));
if (!u10001.some(u => u.username === 'harish001')) {
  u10001.push({
    id: 'usr_harish001',
    username: 'harish001',
    fullName: 'Harish',
    password: '123',
    assignedCompanyCodes: ['10001'],
    companyCode: '10001',
    isAdmin: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: {
      vouchers: {
        Purchase: false, Sales: false, Payment: false, Receipt: false, Contra: false, Journal: false,
        'Debit Note': false, 'Credit Note': false, 'Sales Quotation': false, 'POS Sale': true, 'Purchase POS List': true
      },
      registers: { 'Purchase Register': false, 'Sales Register': false, 'Day Book': false, 'Payment Register': false, 'Receipt Register': false, 'Journal Register': false, 'Contra Register': false, 'Debit Note Register': false, 'Credit Note Register': false, 'Quotation Register': false },
      modules: { BOM: false, Manufacturing: false, BankStatement: false, PurchaseOrder: false },
      reports: { BalanceSheet: false, ProfitLoss: false, TrialBalance: false, StockSummary: false, GSTReports: false, AuditTrail: false },
      masters: { createLedger: false, alterLedger: false, createStockItem: false, alterStockItem: false, deleteMaster: false, deleteVoucher: false }
    }
  });
  fs.writeFileSync(path.join(base, '10001', 'users.json'), JSON.stringify(u10001, null, 2), 'utf-8');
}
console.log("10001 users:", u10001.map(u => ({ username: u.username, pwd: u.password })));

// 3. Check 10002
let u10002 = JSON.parse(fs.readFileSync(path.join(base, '10002', 'users.json'), 'utf-8'));
console.log("10002 users:", u10002.map(u => ({ username: u.username, pwd: u.password, perms: Object.keys(u.permissions?.vouchers || {}).filter(k => u.permissions.vouchers[k]) })));

