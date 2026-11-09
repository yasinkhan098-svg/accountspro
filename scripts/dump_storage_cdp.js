const http = require('http');
const { spawn } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = 'C:\\Users\\yasin\\AppData\\Local\\LedgerX\\Profile';

console.log('Starting Edge in headless remote debugging mode...');
const edgeProc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${profileDir}`,
  'http://127.0.0.1:45454'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    console.log('Discovered tabs:', tabs.length);
    const targetTab = tabs.find(t => t.url.includes('45454') || t.type === 'page') || tabs[0];
    if (!targetTab || !targetTab.webSocketDebuggerUrl) {
      console.log('No tab found', tabs);
      edgeProc.kill();
      process.exit(1);
    }

    console.log('Connecting to debugger:', targetTab.webSocketDebuggerUrl);
    // Use raw WebSocket in Node 20+
    const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
    ws.onopen = () => {
      console.log('WS opened, evaluating localStorage...');
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: '(() => { const res = {}; for(let i=0; i<localStorage.length; i++) { const k = localStorage.key(i); res[k] = localStorage.getItem(k); } return JSON.stringify(res); })()',
          returnByValue: true
        }
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) {
        const valStr = msg.result?.result?.value;
        if (valStr) {
          const storage = JSON.parse(valStr);
          console.log('\n=== LOCALSTORAGE DUMP SUCCESSFUL! ===');
          console.log('Keys:', Object.keys(storage));
          const fs = require('fs');
          fs.writeFileSync('C:/Users/yasin/AppData/Local/LedgerX/dumped_localstorage.json', valStr, 'utf8');
          console.log('Wrote full localStorage dump to dumped_localstorage.json');
        } else {
          console.log('Evaluate result empty:', msg);
        }
        ws.close();
        edgeProc.kill();
        process.exit(0);
      }
    };

    ws.onerror = (e) => {
      console.error('WS error:', e);
      edgeProc.kill();
      process.exit(1);
    };

  } catch (err) {
    console.error('Error querying CDP:', err);
    edgeProc.kill();
    process.exit(1);
  }
}, 3000);
