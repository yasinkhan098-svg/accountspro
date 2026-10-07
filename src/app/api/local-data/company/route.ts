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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '').toUpperCase().trim();
    if (!code) {
      return NextResponse.json({ error: 'Company code is required' }, { status: 400 });
    }

    const dataDir = getDataDir();
    const folderPath = path.join(dataDir, code);
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ error: `Company folder ${code} not found` }, { status: 404 });
    }

    const readJson = (fileName: string, def: any = []) => {
      const p = path.join(folderPath, fileName);
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch (e) {
          return def;
        }
      }
      return def;
    };

    const company = readJson('company.json', null);
    if (!company) {
      return NextResponse.json({ error: 'company.json not found in folder' }, { status: 404 });
    }

    const ledgers = readJson('ledgers.json', []);
    const vouchers = readJson('vouchers.json', []);
    const stockItems = readJson('stock_items.json', []);
    const stockGroups = readJson('stock_groups.json', []);
    const units = readJson('units.json', []);
    const groups = readJson('groups.json', []);
    const voucherTypes = readJson('voucher_types.json', []);

    return NextResponse.json({
      success: true,
      companyCode: code,
      company,
      ledgers,
      vouchers,
      stockItems,
      stockGroups,
      units,
      groups,
      voucherTypes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyCode, company, ledgers, vouchers, stockItems, stockGroups, units, groups, voucherTypes } = body;

    const code = (companyCode || company?.companyCode || '10001').toUpperCase().trim();
    const dataDir = getDataDir();
    const folderPath = path.join(dataDir, code);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const writeJson = (fileName: string, data: any) => {
      fs.writeFileSync(path.join(folderPath, fileName), JSON.stringify(data ?? [], null, 2), 'utf8');
    };

    const cleanCompany = {
      ...company,
      companyCode: code,
      updatedAt: new Date().toISOString(),
    };

    writeJson('company.json', cleanCompany);
    if (ledgers !== undefined) writeJson('ledgers.json', ledgers);
    if (vouchers !== undefined) writeJson('vouchers.json', vouchers);
    if (stockItems !== undefined) writeJson('stock_items.json', stockItems);
    if (stockGroups !== undefined) writeJson('stock_groups.json', stockGroups);
    if (units !== undefined) writeJson('units.json', units);
    if (groups !== undefined) writeJson('groups.json', groups);
    if (voucherTypes !== undefined) writeJson('voucher_types.json', voucherTypes);

    return NextResponse.json({
      success: true,
      message: `Company ${code} saved to folder successfully`,
      companyCode: code,
      folderPath,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
