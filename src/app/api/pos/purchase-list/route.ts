import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getDataDir(): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const dataDir = path.join(localAppData, 'LedgerX', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

let tableChecked = false;
async function ensureDatabaseTable() {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "POSPurchaseItem" (
        "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
        "companyCode"     TEXT NOT NULL,
        "companyId"       INTEGER DEFAULT 0,
        "stockItemId"     INTEGER DEFAULT 0,
        "sNo"             INTEGER DEFAULT 1,
        "name"            TEXT NOT NULL,
        "purchasePrice"   REAL DEFAULT 0,
        "newPurchasePrice" REAL DEFAULT 0,
        "expiryDate"      TEXT DEFAULT '',
        "cessPerc"        REAL DEFAULT 0,
        "openingStock"    REAL DEFAULT 0,
        "barcode"         TEXT DEFAULT '',
        "mrp"             REAL DEFAULT 0,
        "discountPerc"    REAL DEFAULT 0,
        "discountAmt"     REAL DEFAULT 0,
        "retailSalePrice" REAL DEFAULT 0,
        "unit"            TEXT DEFAULT 'NOS',
        "gstRate"         REAL DEFAULT 18,
        "variants"        TEXT DEFAULT '[]',
        "updatedAt"       DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_pos_purchase_code" ON "POSPurchaseItem" ("companyCode")
    `);
    tableChecked = true;
  } catch (e) {
    console.warn("Could not ensure POSPurchaseItem table (offline or read-only DB):", e);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('companyCode') || searchParams.get('code') || '10000').toUpperCase().trim();
    const companyId = parseInt(searchParams.get('companyId') || '0', 10);

    let diskItems: any[] = [];
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, code, 'pos_purchase_list.json');
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          diskItems = parsed;
        }
      } catch (e) {}
    }

    // Try reading from Online/Database table
    let dbItems: any[] = [];
    try {
      await ensureDatabaseTable();
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "POSPurchaseItem" WHERE "companyCode" = ? ORDER BY "sNo" ASC, "id" ASC`,
        code
      );
      if (Array.isArray(rows) && rows.length > 0) {
        dbItems = rows.map((r: any) => {
          let parsedVars: string[] = [];
          try {
            if (r.variants) parsedVars = JSON.parse(r.variants);
          } catch (_) {}
          return {
            id: r.stockItemId || r.id,
            sNo: r.sNo,
            name: r.name,
            purchasePrice: Number(r.purchasePrice) || 0,
            newPurchasePrice: Number(r.newPurchasePrice) || 0,
            expiryDate: r.expiryDate || '',
            cessPerc: Number(r.cessPerc) || 0,
            openingStock: Number(r.openingStock) || 0,
            barcode: r.barcode || '',
            mrp: Number(r.mrp) || 0,
            discountPerc: Number(r.discountPerc) || 0,
            discountAmt: Number(r.discountAmt) || 0,
            retailSalePrice: Number(r.retailSalePrice) || 0,
            unit: r.unit || 'NOS',
            gstRate: Number(r.gstRate) || 18,
            variants: parsedVars,
          };
        });
      }
    } catch (dbErr) {
      // Database read failure fallback to diskItems
    }

    // Priority: DB items if present, otherwise disk items
    const finalItems = dbItems.length > 0 ? dbItems : diskItems;

    return NextResponse.json({
      success: true,
      companyCode: code,
      items: finalItems,
      source: dbItems.length > 0 ? 'database' : (diskItems.length > 0 ? 'disk' : 'empty'),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyCode, code, companyId, items } = body;
    const targetCode = (companyCode || code || '10000').toUpperCase().trim();
    const cId = Number(companyId) || 0;
    const itemsList: any[] = Array.isArray(items) ? items : [];

    // 1. OFFLINE STORAGE: Save to local pos_purchase_list.json
    try {
      const dataDir = getDataDir();
      const folderPath = path.join(dataDir, targetCode);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const listFile = path.join(folderPath, 'pos_purchase_list.json');
      fs.writeFileSync(listFile, JSON.stringify(itemsList, null, 2), 'utf8');

      // Sync into stock_items.json
      const stockItemsFile = path.join(folderPath, 'stock_items.json');
      if (fs.existsSync(stockItemsFile)) {
        try {
          const rawSi = fs.readFileSync(stockItemsFile, 'utf8');
          const stockItems = JSON.parse(rawSi);
          if (Array.isArray(stockItems)) {
            const merged = stockItems.map((si: any) => {
              const found = itemsList.find((it: any) => it.id === si.id || it.name === si.name);
              if (found) {
                return {
                  ...si,
                  barcode: found.barcode,
                  mrp: found.mrp,
                  discountPerc: found.discountPerc,
                  discountAmt: found.discountAmt,
                  retailSalePrice: found.retailSalePrice,
                  expiryDate: found.expiryDate,
                  cessPerc: found.cessPerc,
                };
              }
              return si;
            });
            fs.writeFileSync(stockItemsFile, JSON.stringify(merged, null, 2), 'utf8');
          }
        } catch (e) {}
      }
    } catch (fileErr) {
      console.warn("Local disk file write failed (non-fatal):", fileErr);
    }

    // 2. ONLINE DATABASE STORAGE: Upsert into POSPurchaseItem table
    try {
      await ensureDatabaseTable();
      // Clear existing records for this companyCode and replace with fresh list
      await prisma.$executeRawUnsafe(
        `DELETE FROM "POSPurchaseItem" WHERE "companyCode" = ?`,
        targetCode
      );

      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        const sNo = item.sNo !== undefined ? item.sNo : (i + 1);
        const name = String(item.name || '').trim();
        const purchasePrice = Number(item.purchasePrice) || 0;
        const newPurchasePrice = Number(item.newPurchasePrice) || 0;
        const expiryDate = String(item.expiryDate || '');
        const cessPerc = Number(item.cessPerc) || 0;
        const openingStock = Number(item.openingStock) || 0;
        const barcode = String(item.barcode || '').trim();
        const mrp = Number(item.mrp) || 0;
        const discountPerc = Number(item.discountPerc) || 0;
        const discountAmt = Number(item.discountAmt) || 0;
        const retailSalePrice = Number(item.retailSalePrice) || 0;
        const unit = String(item.unit || 'NOS');
        const gstRate = Number(item.gstRate) || 18;
        const variantsJson = JSON.stringify(item.variants || []);
        const stockItemId = Number(item.id) || 0;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "POSPurchaseItem" (
            "companyCode", "companyId", "stockItemId", "sNo", "name",
            "purchasePrice", "newPurchasePrice", "expiryDate", "cessPerc", "openingStock",
            "barcode", "mrp", "discountPerc", "discountAmt", "retailSalePrice",
            "unit", "gstRate", "variants", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          targetCode, cId, stockItemId, sNo, name,
          purchasePrice, newPurchasePrice, expiryDate, cessPerc, openingStock,
          barcode, mrp, discountPerc, discountAmt, retailSalePrice,
          unit, gstRate, variantsJson
        );
      }
    } catch (dbErr) {
      console.warn("Online database save error (non-fatal):", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'POS Purchase List saved successfully to database & local storage',
      companyCode: targetCode,
      count: itemsList.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
