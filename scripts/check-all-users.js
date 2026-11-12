const fs = require('fs');
const base = 'C:/Users/yasin/AppData/Local/LedgerX/data';
const dirs = fs.readdirSync(base).filter(d => fs.statSync(base + '/' + d).isDirectory() && d !== 'TRAINING');

dirs.forEach(d => {
  const pU = base + '/' + d + '/users.json';
  if (fs.existsSync(pU)) {
    try {
      const users = JSON.parse(fs.readFileSync(pU));
      console.log(`[${d}] has ${users.length} users:`, users.map(u => ({ username: u.username, isAdmin: u.isAdmin, posPerm: u.permissions?.vouchers?.['Purchase POS List'] })));
    } catch (e) {
      console.log(`[${d}] Error reading users.json:`, e.message);
    }
  } else {
    console.log(`[${d}] NO users.json!`);
  }
});

