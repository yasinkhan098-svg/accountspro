const fs = require('fs');
const base = 'C:/Users/yasin/AppData/Local/LedgerX/data';
const dirs = fs.readdirSync(base).filter(d => fs.statSync(base + '/' + d).isDirectory() && d !== 'TRAINING');

dirs.forEach(d => {
  const pStock = base + '/' + d + '/stock_items.json';
  const pPOS = base + '/' + d + '/pos_purchase_list.json';
  const pCo = base + '/' + d + '/company.json';
  const sItems = fs.existsSync(pStock) ? JSON.parse(fs.readFileSync(pStock)) : [];
  const pItems = fs.existsSync(pPOS) ? JSON.parse(fs.readFileSync(pPOS)) : [];
  const co = fs.existsSync(pCo) ? JSON.parse(fs.readFileSync(pCo)) : {};
  console.log(`[${d}] "${co.name}" (id: ${co.id}) => stock_items: ${sItems.length}, pos_purchase_list: ${pItems.length}`);
});

