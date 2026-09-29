import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================
// BOM (Bill of Materials) API
// Tables are created via raw SQL since we can't run migrations
// ============================================================

async function ensureBOMTables() {
  try {
    // BOM header table - stores BOM templates per finished product
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BOM" (
        "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
        "companyId"       INTEGER NOT NULL,
        "name"            TEXT NOT NULL,
        "finishedItemId"  INTEGER NOT NULL,
        "finishedItemName" TEXT NOT NULL,
        "outputQty"       REAL NOT NULL DEFAULT 1,
        "outputUnit"      TEXT NOT NULL DEFAULT 'Nos',
        "narration"       TEXT,
        "createdAt"       DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"       DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // BOM raw material items
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BOMItem" (
        "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
        "bomId"       INTEGER NOT NULL,
        "stockItemId" INTEGER NOT NULL,
        "itemName"    TEXT NOT NULL,
        "qty"         REAL NOT NULL DEFAULT 0,
        "unit"        TEXT NOT NULL DEFAULT 'Nos',
        "rate"        REAL NOT NULL DEFAULT 0,
        "amount"      REAL NOT NULL DEFAULT 0,
        "seq"         INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY ("bomId") REFERENCES "BOM"("id") ON DELETE CASCADE
      )
    `);

    // Manufacturing Journal table - actual production records
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ManufacturingJournal" (
        "id"                INTEGER PRIMARY KEY AUTOINCREMENT,
        "companyId"         INTEGER NOT NULL,
        "journalNo"         TEXT NOT NULL,
        "date"              DATETIME NOT NULL,
        "bomId"             INTEGER,
        "bomName"           TEXT,
        "finishedItemId"    INTEGER NOT NULL,
        "finishedItemName"  TEXT NOT NULL,
        "outputQty"         REAL NOT NULL,
        "outputUnit"        TEXT NOT NULL DEFAULT 'Nos',
        "outputRate"        REAL NOT NULL DEFAULT 0,
        "totalRawCost"      REAL NOT NULL DEFAULT 0,
        "totalDirectExpenses" REAL NOT NULL DEFAULT 0,
        "totalCost"         REAL NOT NULL DEFAULT 0,
        "costPerUnit"       REAL NOT NULL DEFAULT 0,
        "wastageType"       TEXT DEFAULT 'None',
        "wastageQty"        REAL DEFAULT 0,
        "wastageUnit"       TEXT DEFAULT 'Nos',
        "wastageValue"      REAL DEFAULT 0,
        "narration"         TEXT,
        "status"            TEXT DEFAULT 'Draft',
        "createdAt"         DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Manufacturing journal raw material consumption
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MJRawMaterial" (
        "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
        "journalId"   INTEGER NOT NULL,
        "stockItemId" INTEGER NOT NULL,
        "itemName"    TEXT NOT NULL,
        "requiredQty" REAL NOT NULL DEFAULT 0,
        "actualQty"   REAL NOT NULL DEFAULT 0,
        "unit"        TEXT NOT NULL DEFAULT 'Nos',
        "rate"        REAL NOT NULL DEFAULT 0,
        "amount"      REAL NOT NULL DEFAULT 0,
        "seq"         INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY ("journalId") REFERENCES "ManufacturingJournal"("id") ON DELETE CASCADE
      )
    `);

    // Manufacturing journal direct expenses
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MJDirectExpense" (
        "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
        "journalId"   INTEGER NOT NULL,
        "ledgerId"    INTEGER,
        "ledgerName"  TEXT NOT NULL,
        "method"      TEXT NOT NULL DEFAULT 'Amount',
        "percentage"  REAL DEFAULT 0,
        "amount"      REAL NOT NULL DEFAULT 0,
        "seq"         INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY ("journalId") REFERENCES "ManufacturingJournal"("id") ON DELETE CASCADE
      )
    `);

  } catch (e) {
    // Tables may already exist - that's fine
    console.log('BOM table init:', e);
  }
}

// ============================================================
// GET: list BOMs or get single BOM
// ============================================================
export async function GET(req: Request) {
  await ensureBOMTables();
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const id = searchParams.get('id');
  const type = searchParams.get('type'); // 'bom' | 'journal' | 'journals'

  try {
    if (type === 'journal' && id) {
      const journal = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "ManufacturingJournal" WHERE "id" = ?`, parseInt(id)
      );
      const rawMaterials = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "MJRawMaterial" WHERE "journalId" = ? ORDER BY "seq"`, parseInt(id)
      );
      const directExpenses = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "MJDirectExpense" WHERE "journalId" = ? ORDER BY "seq"`, parseInt(id)
      );
      return NextResponse.json({ success: true, journal: journal[0], rawMaterials, directExpenses });
    }

    if (type === 'journals' && companyId) {
      const journals = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "ManufacturingJournal" WHERE "companyId" = ? ORDER BY "date" DESC, "id" DESC`,
        parseInt(companyId)
      );
      return NextResponse.json({ success: true, journals });
    }

    if (id) {
      const bom = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "BOM" WHERE "id" = ?`, parseInt(id)
      );
      const items = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "BOMItem" WHERE "bomId" = ? ORDER BY "seq"`, parseInt(id)
      );
      return NextResponse.json({ success: true, bom: bom[0], items });
    }

    if (companyId) {
      const boms = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "BOM" WHERE "companyId" = ? ORDER BY "name"`,
        parseInt(companyId)
      );
      return NextResponse.json({ success: true, boms });
    }

    return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ============================================================
// POST: Save BOM template OR Manufacturing Journal
// ============================================================
export async function POST(req: Request) {
  await ensureBOMTables();
  const body = await req.json();
  const { saveType } = body;

  try {
    // --- Save BOM Template ---
    if (saveType === 'bom') {
      const { companyId, name, finishedItemId, finishedItemName, outputQty, outputUnit, narration, items } = body;

      // Check duplicate BOM name
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM "BOM" WHERE "companyId" = ? AND lower("name") = lower(?)`,
        parseInt(companyId), name
      );
      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: `BOM "${name}" already exists` }, { status: 400 });
      }

      const result = await prisma.$executeRawUnsafe(
        `INSERT INTO "BOM" ("companyId","name","finishedItemId","finishedItemName","outputQty","outputUnit","narration","updatedAt")
         VALUES (?,?,?,?,?,?,?,datetime('now'))`,
        parseInt(companyId), name, parseInt(finishedItemId), finishedItemName,
        parseFloat(outputQty), outputUnit, narration || null
      );

      // Get the new BOM id
      const newBom = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM "BOM" WHERE "companyId" = ? AND lower("name") = lower(?) ORDER BY id DESC LIMIT 1`,
        parseInt(companyId), name
      );
      const bomId = newBom[0]?.id;

      // Insert BOM items
      if (items && bomId) {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (!it.itemName?.trim()) continue;
          await prisma.$executeRawUnsafe(
            `INSERT INTO "BOMItem" ("bomId","stockItemId","itemName","qty","unit","rate","amount","seq")
             VALUES (?,?,?,?,?,?,?,?)`,
            bomId, parseInt(it.stockItemId || 0), it.itemName,
            parseFloat(it.qty || 0), it.unit || 'Nos',
            parseFloat(it.rate || 0), parseFloat(it.amount || 0), i
          );
        }
      }

      return NextResponse.json({ success: true, bomId });
    }

    // --- Save Manufacturing Journal ---
    if (saveType === 'journal') {
      const {
        companyId, journalNo, date, bomId, bomName,
        finishedItemId, finishedItemName, outputQty, outputUnit, outputRate,
        totalRawCost, totalDirectExpenses, totalCost, costPerUnit,
        wastageType, wastageQty, wastageUnit, wastageValue,
        narration, rawMaterials, directExpenses
      } = body;

      // Generate journal number if not provided
      let jNo = journalNo;
      if (!jNo) {
        const last = await prisma.$queryRawUnsafe<any[]>(
          `SELECT journalNo FROM "ManufacturingJournal" WHERE "companyId" = ? ORDER BY id DESC LIMIT 1`,
          parseInt(companyId)
        );
        const lastNum = last[0]?.journalNo ? parseInt(last[0].journalNo.replace(/\D/g, '')) || 0 : 0;
        jNo = `MFG-${String(lastNum + 1).padStart(4, '0')}`;
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO "ManufacturingJournal"
          ("companyId","journalNo","date","bomId","bomName","finishedItemId","finishedItemName",
           "outputQty","outputUnit","outputRate","totalRawCost","totalDirectExpenses","totalCost","costPerUnit",
           "wastageType","wastageQty","wastageUnit","wastageValue","narration","status")
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Posted')`,
        parseInt(companyId), jNo,
        new Date(date).toISOString(),
        bomId ? parseInt(bomId) : null, bomName || null,
        parseInt(finishedItemId), finishedItemName,
        parseFloat(outputQty), outputUnit, parseFloat(outputRate || 0),
        parseFloat(totalRawCost || 0), parseFloat(totalDirectExpenses || 0),
        parseFloat(totalCost || 0), parseFloat(costPerUnit || 0),
        wastageType || 'None', parseFloat(wastageQty || 0), wastageUnit || 'Nos', parseFloat(wastageValue || 0),
        narration || null
      );

      const newJ = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM "ManufacturingJournal" WHERE "companyId" = ? AND "journalNo" = ? ORDER BY id DESC LIMIT 1`,
        parseInt(companyId), jNo
      );
      const journalId = newJ[0]?.id;

      if (journalId) {
        // Insert raw materials
        if (rawMaterials) {
          for (let i = 0; i < rawMaterials.length; i++) {
            const rm = rawMaterials[i];
            if (!rm.itemName?.trim()) continue;
            await prisma.$executeRawUnsafe(
              `INSERT INTO "MJRawMaterial" ("journalId","stockItemId","itemName","requiredQty","actualQty","unit","rate","amount","seq")
               VALUES (?,?,?,?,?,?,?,?,?)`,
              journalId, parseInt(rm.stockItemId || 0), rm.itemName,
              parseFloat(rm.requiredQty || rm.qty || 0),
              parseFloat(rm.actualQty || rm.qty || 0),
              rm.unit || 'Nos',
              parseFloat(rm.rate || 0), parseFloat(rm.amount || 0), i
            );
          }
        }

        // Insert direct expenses
        if (directExpenses) {
          for (let i = 0; i < directExpenses.length; i++) {
            const de = directExpenses[i];
            if (!de.ledgerName?.trim()) continue;
            await prisma.$executeRawUnsafe(
              `INSERT INTO "MJDirectExpense" ("journalId","ledgerId","ledgerName","method","percentage","amount","seq")
               VALUES (?,?,?,?,?,?,?)`,
              journalId, de.ledgerId ? parseInt(de.ledgerId) : null,
              de.ledgerName, de.method || 'Amount',
              parseFloat(de.percentage || 0), parseFloat(de.amount || 0), i
            );
          }
        }

        // Update stock: add finished goods to stock (update openingQty + openingRate via weighted average)
        // In a real manufacturing system this updates the stock item's quantity
        await updateStockAfterManufacture(parseInt(companyId), parseInt(finishedItemId), parseFloat(outputQty), parseFloat(costPerUnit || 0));
      }

      return NextResponse.json({ success: true, journalId, journalNo: jNo });
    }

    return NextResponse.json({ success: false, error: 'Invalid saveType' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ============================================================
// PUT: Update BOM
// ============================================================
export async function PUT(req: Request) {
  await ensureBOMTables();
  const body = await req.json();
  const { id, saveType } = body;

  try {
    if (saveType === 'bom' && id) {
      const { name, finishedItemId, finishedItemName, outputQty, outputUnit, narration, items } = body;

      await prisma.$executeRawUnsafe(
        `UPDATE "BOM" SET "name"=?,"finishedItemId"=?,"finishedItemName"=?,"outputQty"=?,"outputUnit"=?,"narration"=?,"updatedAt"=datetime('now')
         WHERE "id"=?`,
        name, parseInt(finishedItemId), finishedItemName, parseFloat(outputQty), outputUnit, narration || null, parseInt(id)
      );

      // Delete old items and re-insert
      await prisma.$executeRawUnsafe(`DELETE FROM "BOMItem" WHERE "bomId"=?`, parseInt(id));
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (!it.itemName?.trim()) continue;
          await prisma.$executeRawUnsafe(
            `INSERT INTO "BOMItem" ("bomId","stockItemId","itemName","qty","unit","rate","amount","seq")
             VALUES (?,?,?,?,?,?,?,?)`,
            parseInt(id), parseInt(it.stockItemId || 0), it.itemName,
            parseFloat(it.qty || 0), it.unit || 'Nos',
            parseFloat(it.rate || 0), parseFloat(it.amount || 0), i
          );
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid saveType or missing id' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ============================================================
// DELETE: Delete BOM
// ============================================================
export async function DELETE(req: Request) {
  await ensureBOMTables();
  const { id, type } = await req.json();
  try {
    if (type === 'journal') {
      await prisma.$executeRawUnsafe(`DELETE FROM "MJRawMaterial" WHERE "journalId"=?`, parseInt(id));
      await prisma.$executeRawUnsafe(`DELETE FROM "MJDirectExpense" WHERE "journalId"=?`, parseInt(id));
      await prisma.$executeRawUnsafe(`DELETE FROM "ManufacturingJournal" WHERE "id"=?`, parseInt(id));
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM "BOMItem" WHERE "bomId"=?`, parseInt(id));
      await prisma.$executeRawUnsafe(`DELETE FROM "BOM" WHERE "id"=?`, parseInt(id));
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ============================================================
// Helper: Update stock quantity after manufacturing
// ============================================================
async function updateStockAfterManufacture(companyId: number, itemId: number, addQty: number, newRate: number) {
  try {
    const item = await prisma.stockItem.findFirst({ where: { id: itemId, companyId } });
    if (!item) return;
    const currentQty = item.openingQty || 0;
    const currentRate = item.openingRate || 0;
    // Weighted average cost
    const totalVal = currentQty * currentRate + addQty * newRate;
    const totalQty = currentQty + addQty;
    const avgRate = totalQty > 0 ? totalVal / totalQty : newRate;
    await prisma.stockItem.update({
      where: { id: itemId },
      data: { openingQty: totalQty, openingRate: avgRate, openingVal: totalVal }
    });
  } catch (e) {
    console.error('Stock update error:', e);
  }
}
