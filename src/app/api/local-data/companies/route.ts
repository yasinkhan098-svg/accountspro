import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDataDir(): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const dataDir = path.join(localAppData, 'LedgerX', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

export async function GET() {
  try {
    const dataDir = getDataDir();
    const entries = fs.readdirSync(dataDir, { withFileTypes: true });
    const companies: { companyCode: string; company: any }[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const companyFolder = path.join(dataDir, entry.name);
        const companyJsonPath = path.join(companyFolder, 'company.json');
        if (fs.existsSync(companyJsonPath)) {
          try {
            const raw = fs.readFileSync(companyJsonPath, 'utf8');
            const companyObj = JSON.parse(raw);
            companies.push({
              companyCode: entry.name.toUpperCase(),
              company: {
                ...companyObj,
                companyCode: entry.name.toUpperCase(),
              },
            });
          } catch (readErr) {
            console.warn(`Error reading company.json in ${entry.name}:`, readErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true, companies, dataDir });
  } catch (error: any) {
    return NextResponse.json({ success: false, companies: [], error: error.message }, { status: 500 });
  }
}
