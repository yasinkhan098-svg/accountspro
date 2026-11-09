const fs = require('fs');

const buf = fs.readFileSync('C:/Users/yasin/AppData/Local/LedgerX/Profile/Default/Local Storage/leveldb/000615.ldb');
const str = buf.toString('latin1');

// Find all occurrences of company names or objects
const compIdx = str.indexOf('companies');
if (compIdx !== -1) {
  console.log('--- companies ---');
  // Look for JSON array starting with [
  const start = str.indexOf('[', compIdx);
  if (start !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = start; i < Math.min(str.length, start + 50000); i++) {
      if (str[i] === '[') depth++;
      else if (str[i] === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      const jsonStr = str.substring(start, end + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        console.log('Parsed companies:', parsed.map(c => ({ id: c.id, name: c.name, companyCode: c.companyCode })));
      } catch (e) {
        console.log('Parse error, length:', jsonStr.length, jsonStr.substring(0, 200));
      }
    }
  }
}

// Find allStockItems
const itemIdx = str.indexOf('allStockItems');
if (itemIdx !== -1) {
  console.log('--- allStockItems ---');
  const start = str.indexOf('[', itemIdx);
  if (start !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = start; i < Math.min(str.length, start + 300000); i++) {
      if (str[i] === '[') depth++;
      else if (str[i] === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      const jsonStr = str.substring(start, end + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        console.log('Parsed allStockItems count:', parsed.length);
        console.log('Items sample:', parsed.slice(0, 15).map(i => ({ id: i.id, name: i.name, companyId: i.companyId, barcode: i.barcode, variant: i.variant })));
      } catch (e) {
        console.log('Parse error on stock items, length:', jsonStr.length, jsonStr.substring(0, 200));
      }
    }
  }
}

