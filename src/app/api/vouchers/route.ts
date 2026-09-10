import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalizeDate = (d: any): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  const s = String(d).trim();
  if (!s) return new Date();

  // Normalize delimiters (/ and . and whitespace -> -)
  const normalized = s.replace(/[\.\/\s]+/g, '-').trim();
  const months: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'sept': 8, 'oct': 9, 'nov': 10, 'dec': 11,
    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'june': 5,
    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
  };
  const parts = normalized.split('-');
  if (parts.length === 3) {
    const p1 = parts[0].trim();
    const p2 = parts[1].trim();
    const p3 = parts[2].trim();

    // Check if ISO format: YYYY-MM-DD
    if (p1.length === 4 && !isNaN(parseInt(p1))) {
      const year = parseInt(p1);
      const month = (parseInt(p2) || 1) - 1;
      const day = parseInt(p3) || 1;
      return new Date(year, month, day, 12, 0, 0);
    }

    // Standard DD-MM-YYYY or DD-Mon-YYYY
    const day = parseInt(p1) || 1;
    let month = -1;
    const p2Lower = p2.toLowerCase();
    if (months[p2Lower] !== undefined) {
      month = months[p2Lower];
    } else {
      for (const [mName, mVal] of Object.entries(months)) {
        if (p2Lower.startsWith(mName)) {
          month = mVal;
          break;
        }
      }
      if (month === -1) {
        const mNum = parseInt(p2);
        if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
          month = mNum - 1;
        }
      }
    }
    if (month === -1) month = 0;

    let year = parseInt(p3) || new Date().getFullYear();
    if (year < 100) year += 2000;
    return new Date(year, month, day, 12, 0, 0);
  }

  const date = new Date(s);
  return isNaN(date.getTime()) ? new Date() : date;
};

// Helper to ensure all entries have valid ledgerId by resolving by name or creating missing ledger
async function resolveVoucherEntries(tx: any, companyId: number, type: string, entries: any[]) {
  const resolved = [];
  for (const e of entries) {
    let lid = parseInt(String(e.ledgerId));
    const ledgerName = (e.ledgerName || e.ledger?.name || '').trim();

    if ((!lid || isNaN(lid) || lid <= 0) && ledgerName) {
      // Find existing ledger by name in this company
      const allCompanyLedgers = await tx.ledger.findMany({
        where: { companyId }
      });
      let found = allCompanyLedgers.find((lx: any) => lx.name.trim().toLowerCase() === ledgerName.toLowerCase());

      if (!found) {
        // Auto-create ledger with appropriate group
        let defaultGroup = e.groupName || 'Sundry Creditors';
        const eType = e.entryType || 'Dr';
        const isExpName = /exp|expense|wages|freight|power|fuel|factory|rent|duty|charges|cartage|manufacturing/i.test(ledgerName);
        if (e.groupName) {
          defaultGroup = e.groupName;
        } else if (type === 'Sales' || type === 'Sales Quotation' || type === 'Credit Note') {
          defaultGroup = eType === 'Dr' ? 'Sundry Debtors' : 'Sales Accounts';
        } else if (type === 'Purchase' || type === 'Debit Note') {
          defaultGroup = eType === 'Cr' ? 'Sundry Creditors' : (isExpName ? 'Direct Expenses' : 'Purchase Accounts');
        } else if (type === 'Receipt') {
          defaultGroup = eType === 'Cr' ? (isExpName ? 'Indirect Incomes' : 'Sundry Debtors') : 'Cash-in-hand';
        } else if (type === 'Payment') {
          defaultGroup = eType === 'Dr' ? (isExpName ? 'Direct Expenses' : 'Sundry Creditors') : 'Bank Accounts';
        } else if (type === 'Journal') {
          defaultGroup = isExpName ? 'Direct Expenses' : (eType === 'Dr' ? 'Sundry Debtors' : 'Sundry Creditors');
        }

        found = await tx.ledger.create({
          data: {
            companyId,
            name: ledgerName,
            groupName: defaultGroup,
            openingBal: 0,
            balanceType: 'Dr'
          }
        });
      }
      if (found) lid = found.id;
    }

    if (lid > 0 && !isNaN(lid)) {
      resolved.push({
        ledgerId: lid,
        ledgerName: ledgerName || '',
        amount: Math.abs(parseFloat(String(e.amount)) || 0),
        entryType: e.entryType || 'Dr'
      });
    }
  }
  return resolved;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { companyId, type, date, voucherNo, narration, partyDetails, dispatchDetails, entries = [], inventoryEntries = [] } = data;

    if (!companyId) return NextResponse.json({ success: false, error: "Missing companyId" }, { status: 400 });
    const cid = parseInt(String(companyId));

    // Use a transaction to ensure all entries and inventory movements are saved together
    const result = await prisma.$transaction(async (tx) => {
      const resolvedEntries = await resolveVoucherEntries(tx, cid, type, entries);

      const voucher = await tx.voucher.create({
        data: {
          companyId: cid,
          type,
          date: normalizeDate(date),
          voucherNo: String(voucherNo || "1"),
          narration: narration || "",
          partyDetails: partyDetails ? JSON.stringify(partyDetails) : null,
          dispatchDetails: dispatchDetails ? JSON.stringify(dispatchDetails) : null,
          entries: {
            create: resolvedEntries
          },
          inventoryEntries: {
            create: inventoryEntries.filter((i:any) => i.itemId && !isNaN(parseInt(String(i.itemId)))).map((i: any) => ({
              stockItemId: parseInt(String(i.itemId)),
              qty: parseFloat(String(i.qty)) || 0,
              rate: parseFloat(String(i.rate)) || 0,
              rateInclTax: parseFloat(String(i.rateInclTax || 0)),
              amountInclTax: parseFloat(String(i.amountInclTax || 0)),
              unit: String(i.unit || 'Nos'),
              amount: parseFloat(String(i.amount)) || 0,
              discountPerc: parseFloat(String(i.discountPerc || 0)),
              discountAmt: parseFloat(String(i.discountAmt || 0)),
              taxableAmount: parseFloat(String(i.taxableAmount || i.amount || 0)),
              gstRate: parseFloat(String(i.gstRate || 18)),
              hsnCode: String(i.hsnCode || ''),
              desc1: i.desc1 ? String(i.desc1) : undefined,
              desc2: i.desc2 ? String(i.desc2) : undefined,
              desc3: i.desc3 ? String(i.desc3) : undefined
            }))
          }
        },
        include: { entries: { include: { ledger: true } }, inventoryEntries: { include: { stockItem: true } } }
      });
      return voucher;
    });

    const parsedVoucher = {
      ...result,
      partyDetails: result.partyDetails ? JSON.parse(result.partyDetails) : null,
      dispatchDetails: result.dispatchDetails ? JSON.parse(result.dispatchDetails) : null,
    };
    return NextResponse.json({ success: true, voucher: parsedVoucher });
  } catch (error: any) {
    console.error("Voucher Save Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const { id, companyId, type, date, voucherNo, narration, partyDetails, dispatchDetails, entries = [], inventoryEntries = [] } = data;

    if (!id) return NextResponse.json({ success: false, error: "Missing voucher ID" }, { status: 400 });
    const cid = parseInt(String(companyId));

    const result = await prisma.$transaction(async (tx) => {
      // Delete existing entries and inventoryEntries first
      await tx.voucherEntry.deleteMany({ where: { voucherId: parseInt(id) } });
      await tx.inventoryEntry.deleteMany({ where: { voucherId: parseInt(id) } });

      const resolvedEntries = await resolveVoucherEntries(tx, cid, type, entries);

      const voucher = await tx.voucher.update({
        where: { id: parseInt(id) },
        data: {
          companyId: cid,
          type,
          date: normalizeDate(date),
          voucherNo: String(voucherNo || "1"),
          narration: narration || "",
          partyDetails: partyDetails ? JSON.stringify(partyDetails) : null,
          dispatchDetails: dispatchDetails ? JSON.stringify(dispatchDetails) : null,
          entries: {
            create: resolvedEntries
          },
          inventoryEntries: {
            create: inventoryEntries.filter((i:any) => i.itemId && !isNaN(parseInt(String(i.itemId)))).map((i: any) => ({
              stockItemId: parseInt(String(i.itemId)),
              qty: parseFloat(String(i.qty)) || 0,
              rate: parseFloat(String(i.rate)) || 0,
              rateInclTax: parseFloat(String(i.rateInclTax || 0)),
              amountInclTax: parseFloat(String(i.amountInclTax || 0)),
              unit: String(i.unit || 'Nos'),
              amount: parseFloat(String(i.amount)) || 0,
              discountPerc: parseFloat(String(i.discountPerc || 0)),
              discountAmt: parseFloat(String(i.discountAmt || 0)),
              taxableAmount: parseFloat(String(i.taxableAmount || i.amount || 0)),
              gstRate: parseFloat(String(i.gstRate || 18)),
              hsnCode: String(i.hsnCode || ''),
              desc1: i.desc1 ? String(i.desc1) : undefined,
              desc2: i.desc2 ? String(i.desc2) : undefined,
              desc3: i.desc3 ? String(i.desc3) : undefined
            }))
          }
        },
        include: { entries: { include: { ledger: true } }, inventoryEntries: { include: { stockItem: true } } }
      });
      return voucher;
    });

    const parsedVoucher = {
      ...result,
      partyDetails: result.partyDetails ? JSON.parse(result.partyDetails) : null,
      dispatchDetails: result.dispatchDetails ? JSON.parse(result.dispatchDetails) : null,
    };
    return NextResponse.json({ success: true, voucher: parsedVoucher });
  } catch (error: any) {
    console.error("Voucher Update Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const vouchers = await prisma.voucher.findMany({
    where: companyId ? { companyId: parseInt(companyId) } : undefined,
    include: { entries: { include: { ledger: true } }, inventoryEntries: { include: { stockItem: true } } },
    orderBy: { createdAt: 'desc' }
  });
  const parsedVouchers = vouchers.map(v => ({
    ...v,
    partyDetails: v.partyDetails ? JSON.parse(v.partyDetails) : null,
    dispatchDetails: v.dispatchDetails ? JSON.parse(v.dispatchDetails) : null,
  }));
  return NextResponse.json({ success: true, vouchers: parsedVouchers });
}
export async function DELETE(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) throw new Error("Voucher ID is required");
    await prisma.voucher.delete({
      where: { id: parseInt(data.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
