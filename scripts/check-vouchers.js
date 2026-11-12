const fs = require('fs');
const base = 'C:/Users/yasin/AppData/Local/LedgerX/data';
const dirs = fs.readdirSync(base).filter(d => fs.statSync(base + '/' + d).isDirectory());

dirs.forEach(d => {
  const pV = base + '/' + d + '/vouchers.json';
  if (fs.existsSync(pV)) {
    try {
      const v = JSON.parse(fs.readFileSync(pV));
      if (v.length > 0) {
        console.log(`[${d}] has ${v.length} vouchers.`);
        // check if vouchers have inventory items
        const itemNames = new Set();
        v.forEach(vch => {
          if (vch.inventoryEntries) {
            vch.inventoryEntries.forEach(ie => {
              if (ie.itemName) itemNames.add(ie.itemName.trim());
            });
          }
        });
        if (itemNames.size > 0) {
          console.log(`   -> Unique inventory items in vouchers:`, Array.from(itemNames));
        }
      }
    } catch (e) {}
  }
});
