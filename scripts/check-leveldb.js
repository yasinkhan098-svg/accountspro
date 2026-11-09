const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/yasin/AppData/Local/LedgerX/Profile/Default/Local Storage/leveldb';
if (!fs.existsSync(dir)) {
  console.log('Dir does not exist:', dir);
  process.exit(0);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));
for (const file of files) {
  const full = path.join(dir, file);
  const buf = fs.readFileSync(full);
  const str = buf.toString('latin1');
  
  // Search for pos_purchase_list or allStockItems
  const keys = ['ledgerx_pos_purchase_list', 'allStockItems', 'companies', 'activeCompany'];
  for (const k of keys) {
    const idx = str.indexOf(k);
    if (idx !== -1) {
      console.log(`Found "${k}" in ${file} at index ${idx}!`);
      // print snippet
      const snippet = str.substring(idx, Math.min(str.length, idx + 400));
      console.log('Snippet:', snippet.replace(/[^\x20-\x7E]/g, ' '));
    }
  }
}

