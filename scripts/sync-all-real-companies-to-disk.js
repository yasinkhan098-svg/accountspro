const fs = require('fs');
const path = require('path');
const https = require('https');

const token = 'admin_b89b39a19a8a2fd6896166c62921f27ead30115b2d09a5cbfbce9a4e8aac9f29';
const baseDataDir = 'C:\\Users\\yasin\\AppData\\Local\\LedgerX\\data';

function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'ledgerx-tawny.vercel.app',
      path: endpoint,
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch(e) {
          resolve({});
        }
      });
    }).on('error', reject);
  });
}

async function syncAll() {
  console.log('Fetching all companies from user account...');
  const res = await apiGet('/api/companies');
  const companies = res.companies || [];
  console.log(`Found ${companies.length} authentic companies.`);

  for (const c of companies) {
    const rawCode = String(c.companyCode || c.code || '').trim();
    const is5Digit = /^\d{5}$/.test(rawCode);
    const id = Number(c.id) || 4;
    const code = is5Digit ? rawCode : String(10000 + Math.max(0, id - 4));

    const cDir = path.join(baseDataDir, code);
    if (!fs.existsSync(cDir)) {
      fs.mkdirSync(cDir, { recursive: true });
    }

    const companyData = {
      ...c,
      id: id,
      companyCode: code,
      code: code,
    };
    fs.writeFileSync(path.join(cDir, 'company.json'), JSON.stringify(companyData, null, 2), 'utf8');

    // Fetch and save real ledgers
    try {
      const lRes = await apiGet(`/api/ledgers?companyId=${id}`);
      if (Array.isArray(lRes.ledgers) && lRes.ledgers.length > 0) {
        fs.writeFileSync(path.join(cDir, 'ledgers.json'), JSON.stringify(lRes.ledgers, null, 2), 'utf8');
      }
    } catch (_) {}

    // Fetch and save real vouchers
    try {
      const vRes = await apiGet(`/api/vouchers?companyId=${id}`);
      if (Array.isArray(vRes.vouchers) && vRes.vouchers.length > 0) {
        fs.writeFileSync(path.join(cDir, 'vouchers.json'), JSON.stringify(vRes.vouchers, null, 2), 'utf8');
      }
    } catch (_) {}

    // Fetch and save real stock items if present
    try {
      const sRes = await apiGet(`/api/stock-items?companyId=${id}`);
      if (Array.isArray(sRes.stockItems) && sRes.stockItems.length > 0) {
        const targetPath = path.join(cDir, 'stock_items.json');
        if (!fs.existsSync(targetPath)) {
          fs.writeFileSync(targetPath, JSON.stringify(sRes.stockItems, null, 2), 'utf8');
        }
      }
    } catch (_) {}

    // Ensure users.json exists
    const usersPath = path.join(cDir, 'users.json');
    if (!fs.existsSync(usersPath)) {
      const defaultUsers = [
        {
          id: `usr_admin_${code}`,
          username: 'admin',
          fullName: `Company Administrator (${c.name})`,
          password: '',
          assignedCompanyCodes: [code],
          companyCode: code,
          isAdmin: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          permissions: {
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
              'POS Sale': true,
              'Purchase POS List': true
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
              'Quotation Register': true
            },
            modules: { BOM: true, Manufacturing: true, BankStatement: true, PurchaseOrder: true },
            reports: { BalanceSheet: true, ProfitLoss: true, TrialBalance: true, StockSummary: true, GSTReports: true, AuditTrail: true },
            masters: { createLedger: true, alterLedger: true, createStockItem: true, alterStockItem: true, deleteMaster: true, deleteVoucher: true }
          }
        },
        {
          id: `usr_cashier_${code}`,
          username: 'cashier',
          fullName: `Counter Cashier (${c.name})`,
          password: '',
          assignedCompanyCodes: [code],
          companyCode: code,
          isAdmin: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          permissions: {
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
          }
        }
      ];
      fs.writeFileSync(usersPath, JSON.stringify(defaultUsers, null, 2), 'utf8');
    }

    console.log(`Synced company [${code}] ${c.name}`);
  }

  console.log('All authentic companies successfully synced to local data directory!');
}

syncAll().catch(console.error);

