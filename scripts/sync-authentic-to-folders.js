const fs = require('fs');
const path = require('path');

const DATA_DIR = 'C:/Users/yasin/AppData/Local/LedgerX/data';

// 1. Load the 65 authentic items extracted for 10000
const posFile = fs.readdirSync('scripts').find(f => f.startsWith('ledgerx_pos_purchase_list_10000'));
const pos10000 = JSON.parse(fs.readFileSync(path.join('scripts', posFile), 'utf8'));
console.log(`Loaded ${pos10000.length} authentic POS items for 10000`);

// 2. Load all real stock items from LevelDB
const allRealStockItems = JSON.parse(fs.readFileSync('scripts/leveldb_tally_u10_allStockItems.json', 'utf8'));
console.log(`Loaded ${allRealStockItems.length} total real stock items from LevelDB`);

// Mapping of folder code to companyId
const folderCodeToId = {
  '10000': 4,
  '10001': 5,
  '10002': 6,
  '10003': 7,
  '10005': 9,
  '10006': 10,
  '10007': 11,
  '10008': 12,
  '10009': 13,
  '10011': 15,
  '10012': 16,
  '10013': 17,
  '10014': 18,
  '10015': 19,
};

// Update 10000 specifically with the 65 authentic items:
const p10000_pos_path = path.join(DATA_DIR, '10000', 'pos_purchase_list.json');
const p10000_stock_path = path.join(DATA_DIR, '10000', 'stock_items.json');

// Convert POS list to stockItems
const stock10000 = pos10000.map((it, idx) => {
  // Find matching master item if available to retain hsnCode, etc.
  const master = allRealStockItems.find(m => Number(m.companyId) === 4 && (m.id === it.id || (m.name && m.name.trim().toLowerCase() === it.name.trim().toLowerCase())));
  return {
    id: it.id || (idx + 1),
    companyId: 4,
    companyCode: '10000',
    name: it.name,
    alias: it.barcode || (master?.alias || ''),
    partNumber: it.barcode || (master?.partNumber || ''),
    barcode: it.barcode || '',
    groupName: it.variant || master?.groupName || 'Primary',
    categoryName: master?.categoryName || 'Not Applicable',
    unit: it.unit || master?.unit || 'Nos',
    unitName: it.unit || master?.unitName || 'Nos',
    gstRate: Number(it.gstRate ?? master?.gstRate ?? 18),
    cessRate: Number(it.cessPerc ?? master?.cessRate ?? 0),
    mrp: Number(it.mrp || 0),
    retailSalePrice: Number(it.retailSalePrice || 0),
    rateInclTax: Number(it.retailSalePrice || 0),
    openingQty: Number(it.openingStock || 0),
    openingRate: Number(it.purchasePrice || it.newPurchasePrice || 0),
    openingValue: Math.round(Number(it.openingStock || 0) * Number(it.purchasePrice || it.newPurchasePrice || 0) * 100) / 100,
    variant: it.variant || '',
    variants: it.variants || (it.variant ? [it.variant] : []),
    expiryDate: it.expiryDate || '',
    under: master?.under || 'Primary',
    category: master?.category || 'Not Applicable',
    hsnCode: master?.hsnCode || '',
    typeOfSupply: master?.typeOfSupply || 'Goods',
  };
});

fs.writeFileSync(p10000_pos_path, JSON.stringify(pos10000, null, 2), 'utf8');
fs.writeFileSync(p10000_stock_path, JSON.stringify(stock10000, null, 2), 'utf8');
console.log(`Updated 10000 with ${pos10000.length} authentic POS items and ${stock10000.length} stock items.`);

// Now process other folders:
Object.entries(folderCodeToId).forEach(([code, cid]) => {
  if (code === '10000') return; // already done

  const folder = path.join(DATA_DIR, code);
  if (!fs.existsSync(folder)) return;

  const cStock = allRealStockItems.filter(si => Number(si.companyId) === cid);
  const posList = cStock.map((si, idx) => ({
    id: si.id,
    sNo: idx + 1,
    name: si.name,
    purchasePrice: Number(si.openingRate || 0),
    newPurchasePrice: 0,
    expiryDate: si.expiryDate || '',
    cessPerc: Number(si.cessRate || si.cessPerc || 0),
    openingStock: Number(si.openingQty || 0),
    barcode: si.barcode || String(1000256 + idx),
    mrp: Number(si.mrp || 0),
    discountPerc: Number(si.defaultDiscount || 0),
    discountAmt: 0,
    retailSalePrice: Number(si.retailSalePrice || si.mrp || 0),
    unit: si.unit || si.unitName || 'Nos',
    gstRate: Number(si.gstRate || 18),
    variant: si.variant || '',
    variants: si.variants || (si.variant ? [si.variant] : []),
    companyCode: code,
    companyId: cid,
  }));

  const stockPath = path.join(folder, 'stock_items.json');
  const posPath = path.join(folder, 'pos_purchase_list.json');

  fs.writeFileSync(stockPath, JSON.stringify(cStock, null, 2), 'utf8');
  fs.writeFileSync(posPath, JSON.stringify(posList, null, 2), 'utf8');
  console.log(`Updated ${code} (cid ${cid}): ${cStock.length} authentic items.`);
});

console.log('ALL COMPANY FOLDERS SYNCHRONIZED WITH AUTHENTIC DATA!');
