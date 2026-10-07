import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
    const dataDir = path.join(localAppData, 'LedgerX', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (process.platform === 'win32') {
      exec(`explorer.exe "${dataDir}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${dataDir}"`);
    } else {
      exec(`xdg-open "${dataDir}"`);
    }

    return NextResponse.json({ success: true, dataDir });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
