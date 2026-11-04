import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Server-side in-memory cache
const cloudUsersCache = new Map<string, any[]>();

let tableChecked = false;
async function ensureLANUserTable() {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LANUserRecord" (
        "id"                   TEXT PRIMARY KEY,
        "companyCode"          TEXT NOT NULL,
        "username"             TEXT NOT NULL,
        "fullName"             TEXT DEFAULT '',
        "password"             TEXT DEFAULT '',
        "isAdmin"              INTEGER DEFAULT 0,
        "isActive"             INTEGER DEFAULT 1,
        "assignedCompanyCodes" TEXT DEFAULT '[]',
        "permissions"          TEXT DEFAULT '{}',
        "createdAt"            DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"            DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_lan_user_code" ON "LANUserRecord" ("companyCode")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_lan_user_uname" ON "LANUserRecord" ("username")
    `);
    tableChecked = true;
  } catch (e) {
    console.warn("Could not ensure LANUserRecord table (offline or read-only DB):", e);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || searchParams.get('companyCode') || '10000').toUpperCase().trim();

    let diskUsers: any[] = [];

    // 1. Try reading from filesystem (%LocalAppData%\LedgerX\data\<code >\users.json or process.cwd())
    try {
      const candidates: string[] = [];
      if (process.env.LOCALAPPDATA) {
        candidates.push(path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data', code, 'users.json'));
      }
      candidates.push(path.join(process.cwd(), 'data', code, 'users.json'));

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            diskUsers = parsed;
            break;
          }
        }
      }
    } catch (fsErr) {
      // Non-blocking in serverless environments
    }

    // 2. Try reading from Database table
    let dbUsers: any[] = [];
    try {
      await ensureLANUserTable();
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "LANUserRecord" WHERE "companyCode" = ? ORDER BY "createdAt" ASC`,
        code
      );
      if (Array.isArray(rows) && rows.length > 0) {
        dbUsers = rows.map((r: any) => {
          let perms = {};
          let compCodes: string[] = [];
          try {
            if (r.permissions) perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
          } catch (_) {}
          try {
            if (r.assignedCompanyCodes) compCodes = typeof r.assignedCompanyCodes === 'string' ? JSON.parse(r.assignedCompanyCodes) : r.assignedCompanyCodes;
          } catch (_) {}
          return {
            id: r.id,
            username: r.username,
            fullName: r.fullName || r.username,
            password: r.password || '',
            isAdmin: Boolean(r.isAdmin),
            isActive: Boolean(r.isActive),
            assignedCompanyCodes: compCodes.length > 0 ? compCodes : [code],
            permissions: perms,
            createdAt: r.createdAt,
          };
        });
      }
    } catch (dbErr) {
      // Database read failure fallback
    }

    // Merge DB users and disk users
    const userMap = new Map<string, any>();
    diskUsers.forEach((u: any) => {
      if (u && u.username) userMap.set(u.username.toLowerCase(), u);
    });
    dbUsers.forEach((u: any) => {
      if (u && u.username) userMap.set(u.username.toLowerCase(), u);
    });

    if (userMap.size > 0) {
      const mergedList = Array.from(userMap.values());
      cloudUsersCache.set(code, mergedList);
      return NextResponse.json({ success: true, companyCode: code, users: mergedList });
    }

    // 2.5 Fallback: Check root users.json (%LocalAppData%\LedgerX\data\users.json)
    try {
      const rootCandidates: string[] = [];
      if (process.env.LOCALAPPDATA) {
        rootCandidates.push(path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data', 'users.json'));
      }
      rootCandidates.push(path.join(process.cwd(), 'data', 'users.json'));
      for (const rp of rootCandidates) {
        if (fs.existsSync(rp)) {
          const rootRaw = fs.readFileSync(rp, 'utf-8');
          const rootParsed = JSON.parse(rootRaw);
          if (Array.isArray(rootParsed) && rootParsed.length > 0) {
            rootParsed.forEach((u: any) => {
              if (u && u.username) userMap.set(u.username.toLowerCase(), u);
            });
            break;
          }
        }
      }
    } catch (_) {}

    if (userMap.size > 0) {
      const mergedList = Array.from(userMap.values());
      cloudUsersCache.set(code, mergedList);
      return NextResponse.json({ success: true, companyCode: code, users: mergedList });
    }

    // 3. Check cloud memory cache
    if (cloudUsersCache.has(code) && cloudUsersCache.get(code)!.length > 0) {
      return NextResponse.json({ success: true, companyCode: code, users: cloudUsersCache.get(code) });
    }

    // 4. Return default starter admin and cashier users
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
          vouchers: { Purchase: true, Sales: true, Payment: true, Receipt: true, Contra: true, Journal: true, 'Debit Note': true, 'Credit Note': true, 'Sales Quotation': true, 'POS Sale': true, 'Purchase POS List': true },
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
          vouchers: { Purchase: false, Sales: true, Payment: false, Receipt: true, Contra: false, Journal: false, 'Debit Note': false, 'Credit Note': false, 'Sales Quotation': true, 'POS Sale': true, 'Purchase POS List': true },
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
    const code = (body.companyCode || body.code || '10000').toUpperCase().trim();
    const users = Array.isArray(body.users) ? body.users : [];

    // Store in cloud memory cache
    cloudUsersCache.set(code, users);

    // 1. Try saving to filesystem
    try {
      const targetDirs: string[] = [];
      if (process.env.LOCALAPPDATA) {
        targetDirs.push(path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data', code));
      }
      targetDirs.push(path.join(process.cwd(), 'data', code));

      for (const d of targetDirs) {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
        const file = path.join(d, 'users.json');
        fs.writeFileSync(file, JSON.stringify(users, null, 2), 'utf-8');
      }

      // Also update root master users.json
      const rootDirs: string[] = [];
      if (process.env.LOCALAPPDATA) {
        rootDirs.push(path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data'));
      }
      rootDirs.push(path.join(process.cwd(), 'data'));
      for (const rd of rootDirs) {
        const rootFile = path.join(rd, 'users.json');
        let existingMaster: any[] = [];
        if (fs.existsSync(rootFile)) {
          try {
            existingMaster = JSON.parse(fs.readFileSync(rootFile, 'utf-8'));
          } catch (_) {}
        }
        const masterMap = new Map<string, any>();
        if (Array.isArray(existingMaster)) {
          existingMaster.forEach((u: any) => {
            if (u && u.username) masterMap.set(u.username.toLowerCase(), u);
          });
        }
        users.forEach((u: any) => {
          if (u && u.username) masterMap.set(u.username.toLowerCase(), u);
        });
        if (!fs.existsSync(rd)) fs.mkdirSync(rd, { recursive: true });
        fs.writeFileSync(rootFile, JSON.stringify(Array.from(masterMap.values()), null, 2), 'utf-8');
      }
    } catch (fsErr) {
      console.warn("Local users file write error (non-fatal):", fsErr);
    }

    // 2. Upsert into Database table LANUserRecord
    try {
      await ensureLANUserTable();
      await prisma.$executeRawUnsafe(
        `DELETE FROM "LANUserRecord" WHERE "companyCode" = ?`,
        code
      );

      for (const u of users) {
        const uId = String(u.id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
        const username = String(u.username || '').trim().toLowerCase();
        const fullName = String(u.fullName || username).trim();
        const pwd = String(u.password || '').trim();
        const isAdmin = u.isAdmin ? 1 : 0;
        const isActive = u.isActive !== false ? 1 : 0;
        const assignedCodes = JSON.stringify(u.assignedCompanyCodes || [code]);
        const perms = JSON.stringify(u.permissions || {});

        await prisma.$executeRawUnsafe(
          `INSERT INTO "LANUserRecord" (
            "id", "companyCode", "username", "fullName", "password",
            "isAdmin", "isActive", "assignedCompanyCodes", "permissions", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          uId, code, username, fullName, pwd,
          isAdmin, isActive, assignedCodes, perms
        );
      }
    } catch (dbErr) {
      console.warn("Database user upsert error (non-fatal):", dbErr);
    }

    return NextResponse.json({ success: true, companyCode: code, count: users.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
