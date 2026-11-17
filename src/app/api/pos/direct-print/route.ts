import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Try local LedgerX Host Service on port 45454
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const hostRes = await fetch('http://127.0.0.1:45454/api/pos/direct-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (hostRes.ok) {
        const json = await hostRes.json().catch(() => null);
        if (json && json.success) {
          return NextResponse.json({ success: true, message: 'Printed via LedgerX Host' });
        }
      }
    } catch (hostErr) {
      // Host not responding; try auto-launching host service in background
      try {
        const localApp = process.env.LOCALAPPDATA || 'C:\\Users\\yasin\\AppData\\Local';
        const exePath = path.join(localApp, 'LedgerX', 'LedgerX.exe');
        if (fs.existsSync(exePath)) {
          exec(`wmic process call create '"${exePath}" --service'`);
          // Wait briefly for host to initialize and retry
          await new Promise(r => setTimeout(r, 600));
          const retryRes = await fetch('http://127.0.0.1:45454/api/pos/direct-print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (retryRes.ok) {
            const retryJson = await retryRes.json().catch(() => null);
            if (retryJson && retryJson.success) {
              return NextResponse.json({ success: true, message: 'Printed via restarted LedgerX Host' });
            }
          }
        }
      } catch (launchErr) {
        // Fall through to error response
      }
    }

    return NextResponse.json({ success: false, error: 'Direct thermal printer host is not currently running.' }, { status: 503 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Print processing failed' }, { status: 500 });
  }
}
