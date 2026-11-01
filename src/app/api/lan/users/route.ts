import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Server-side in-memory cache for cloud environments (like Vercel serverless)
const cloudUsersCache = new Map<string, any[]>();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '10000').toUpperCase().trim();

    // 1. Try reading from filesystem if available
    try {
      const localAppDir = process.env.LOCALAPPDATA 
        ? path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data', code, 'users.json')
        : null;
      const cwdDir = path.join(process.cwd(), 'data', code, 'users.json');

      if (localAppDir && fs.existsSync(localAppDir)) {
        const data = fs.readFileSync(localAppDir, 'utf-8');
        const parsed = JSON.parse(data);
        return NextResponse.json({ success: true, companyCode: code, users: parsed });
      }
      if (fs.existsSync(cwdDir)) {
        const data = fs.readFileSync(cwdDir, 'utf-8');
        const parsed = JSON.parse(data);
        return NextResponse.json({ success: true, companyCode: code, users: parsed });
      }
    } catch (fsErr) {
      // Non-blocking in serverless environments
    }

    // 2. Check cloud memory cache
    if (cloudUsersCache.has(code)) {
      return NextResponse.json({ success: true, companyCode: code, users: cloudUsersCache.get(code) });
    }

    // 3. Return starter company admin and cashier users
    const defaultUsers = [
      {
        id: `usr_admin_${code}`,
        username: 'admin',
        fullName: 'Company Administrator',
        password: '',
        assignedCompanyCodes: [code],
        isAdmin: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        permissions: {
          vouchers: { Purchase: true, Sales: true, Payment: true, Receipt: true, Contra: true, Journal: true, 'Debit Note': true, 'Credit Note': true, 'Sales Quotation': true, 'POS Sale': true },
          registers: { 'Purchase Register': true, 'Sales Register': true, 'Day Book': true, 'Payment Register': true, 'Receipt Register': true, 'Journal Register': true, 'Contra Register': true, 'Debit Note Register': true, 'Credit Note Register': true, 'Quotation Register': true },
          modules: { BOM: true, Manufacturing: true, BankStatement: true, PurchaseOrder: true },
          reports: { BalanceSheet: true, ProfitLoss: true, TrialBalance: true, StockSummary: true, GSTReports: true, AuditTrail: true },
          masters: { createLedger: true, alterLedger: true, createStockItem: true, alterStockItem: true, deleteMaster: true, deleteVoucher: true }
        }
      },
      {
        id: `usr_cashier_${code}`,
        username: 'cashier',
        fullName: 'Counter Cashier',
        password: '',
        assignedCompanyCodes: [code],
        isAdmin: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        permissions: {
          vouchers: { Purchase: false, Sales: true, Payment: false, Receipt: true, Contra: false, Journal: false, 'Debit Note': false, 'Credit Note': false, 'Sales Quotation': true, 'POS Sale': true },
          registers: { 'Purchase Register': false, 'Sales Register': true, 'Day Book': true, 'Payment Register': false, 'Receipt Register': true, 'Journal Register': false, 'Contra Register': false, 'Debit Note Register': false, 'Credit Note Register': false, 'Quotation Register': true },
          modules: { BOM: false, Manufacturing: false, BankStatement: false, PurchaseOrder: false },
          reports: { BalanceSheet: false, ProfitLoss: false, TrialBalance: false, StockSummary: true, GSTReports: false, AuditTrail: false },
          masters: { createLedger: false, alterLedger: false, createStockItem: true, alterStockItem: false, deleteMaster: false, deleteVoucher: false }
        }
      }
    ];
    cloudUsersCache.set(code, defaultUsers);
    return NextResponse.json({ success: true, companyCode: code, users: defaultUsers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = (body.companyCode || '10000').toUpperCase().trim();
    const users = Array.isArray(body.users) ? body.users : [];

    // Store in cloud memory cache
    cloudUsersCache.set(code, users);

    // Try saving to filesystem if writable
    try {
      const targetDirs = [
        path.join(process.cwd(), 'data', code),
      ];
      if (process.env.LOCALAPPDATA) {
        targetDirs.push(path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data', code));
      }

      for (const d of targetDirs) {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
        const file = path.join(d, 'users.json');
        fs.writeFileSync(file, JSON.stringify(users, null, 2), 'utf-8');
      }
    } catch (fsErr) {
      // Serverless read-only filesystem fallback
    }

    return NextResponse.json({ success: true, companyCode: code, count: users.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

