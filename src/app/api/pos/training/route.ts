import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  TRAINING_COMPANY,
  TRAINING_USERS,
  INITIAL_TRAINING_STOCK_ITEMS,
  INITIAL_TRAINING_POS_PURCHASE_LIST,
  INITIAL_TRAINING_LEDGERS,
  INITIAL_TRAINING_VOUCHERS,
  INITIAL_TRAINING_UNITS,
  INITIAL_TRAINING_STOCK_GROUPS,
  TRAINING_COMPANY_CODE,
} from '@/lib/pos/posTrainingService';

export const dynamic = 'force-dynamic';

function getTrainingDirs(): string[] {
  const dirs: string[] = [];

  // 1. AppData Local directory: %LocalAppData%\LedgerX\data\TRAINING\
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const appDataTrainingDir = path.join(localAppData, 'LedgerX', 'data', TRAINING_COMPANY_CODE);
  dirs.push(appDataTrainingDir);

  // 2. Project local data directory: <projectRoot>\data\TRAINING\
  const projectTrainingDir = path.join(process.cwd(), 'data', TRAINING_COMPANY_CODE);
  dirs.push(projectTrainingDir);

  return dirs;
}

function ensureSeeded(targetDir: string) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const writeIfMissing = (fileName: string, data: any) => {
    const filePath = path.join(targetDir, fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
  };

  writeIfMissing('company.json', TRAINING_COMPANY);
  writeIfMissing('users.json', TRAINING_USERS);
  writeIfMissing('stock_items.json', INITIAL_TRAINING_STOCK_ITEMS);
  writeIfMissing('pos_purchase_list.json', INITIAL_TRAINING_POS_PURCHASE_LIST);
  writeIfMissing('ledgers.json', INITIAL_TRAINING_LEDGERS);
  writeIfMissing('vouchers.json', INITIAL_TRAINING_VOUCHERS);
  writeIfMissing('units.json', INITIAL_TRAINING_UNITS);
  writeIfMissing('stock_groups.json', INITIAL_TRAINING_STOCK_GROUPS);
}

export async function GET() {
  try {
    const dirs = getTrainingDirs();
    const primaryDir = dirs[0];
    ensureSeeded(primaryDir);

    const readJson = (fileName: string, def: any) => {
      const p = path.join(primaryDir, fileName);
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch (e) {
          return def;
        }
      }
      return def;
    };

    const company = readJson('company.json', TRAINING_COMPANY);
    const users = readJson('users.json', TRAINING_USERS);
    const stockItems = readJson('stock_items.json', INITIAL_TRAINING_STOCK_ITEMS);
    const posPurchaseList = readJson('pos_purchase_list.json', INITIAL_TRAINING_POS_PURCHASE_LIST);
    const ledgers = readJson('ledgers.json', INITIAL_TRAINING_LEDGERS);
    const vouchers = readJson('vouchers.json', INITIAL_TRAINING_VOUCHERS);
    const units = readJson('units.json', INITIAL_TRAINING_UNITS);
    const stockGroups = readJson('stock_groups.json', INITIAL_TRAINING_STOCK_GROUPS);

    return NextResponse.json({
      success: true,
      companyCode: TRAINING_COMPANY_CODE,
      company,
      users,
      stockItems,
      posPurchaseList,
      ledgers,
      vouchers,
      units,
      stockGroups,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dirs = getTrainingDirs();

    for (const targetDir of dirs) {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const writeJson = (fileName: string, data: any) => {
        if (data !== undefined) {
          fs.writeFileSync(path.join(targetDir, fileName), JSON.stringify(data, null, 2), 'utf8');
        }
      };

      if (body.action === 'reset') {
        writeJson('company.json', TRAINING_COMPANY);
        writeJson('users.json', TRAINING_USERS);
        writeJson('stock_items.json', INITIAL_TRAINING_STOCK_ITEMS);
        writeJson('pos_purchase_list.json', INITIAL_TRAINING_POS_PURCHASE_LIST);
        writeJson('ledgers.json', INITIAL_TRAINING_LEDGERS);
        writeJson('vouchers.json', INITIAL_TRAINING_VOUCHERS);
        writeJson('units.json', INITIAL_TRAINING_UNITS);
        writeJson('stock_groups.json', INITIAL_TRAINING_STOCK_GROUPS);
      } else {
        writeJson('company.json', body.company || TRAINING_COMPANY);
        writeJson('users.json', body.users || TRAINING_USERS);
        writeJson('stock_items.json', body.stockItems || INITIAL_TRAINING_STOCK_ITEMS);
        writeJson('pos_purchase_list.json', body.posPurchaseList || INITIAL_TRAINING_POS_PURCHASE_LIST);
        writeJson('ledgers.json', body.ledgers || INITIAL_TRAINING_LEDGERS);
        writeJson('vouchers.json', body.vouchers || INITIAL_TRAINING_VOUCHERS);
        writeJson('units.json', body.units || INITIAL_TRAINING_UNITS);
        writeJson('stock_groups.json', body.stockGroups || INITIAL_TRAINING_STOCK_GROUPS);
      }
    }

    return NextResponse.json({ success: true, message: 'Training data synchronized successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

