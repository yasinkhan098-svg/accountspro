import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalizeDate = (d: any): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  const s = String(d);
  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  const parts = s.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = months[parts[1]] ?? 0;
    const year = parseInt(parts[2]);
    if (!isNaN(day) && !isNaN(year)) return new Date(year, month, day);
  }
  const date = new Date(s);
  return isNaN(date.getTime()) ? new Date() : date;
};

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { companyId, type, date, voucherNo, narration, entries = [], inventoryEntries = [] } = data;

    if (!companyId) return NextResponse.json({ success: false, error: "Missing companyId" }, { status: 400 });

    // Use a transaction to ensure all entries and inventory movements are saved together
    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.create({
        data: {
          companyId: parseInt(String(companyId)),
          type,
          date: normalizeDate(date),
          voucherNo: String(voucherNo || "1"),
          narration: narration || "",
          entries: {
            create: entries.filter((e:any) => e.ledgerId && !isNaN(parseInt(String(e.ledgerId)))).map((e: any) => ({
              ledgerId: parseInt(String(e.ledgerId)),
              amount: Math.abs(parseFloat(String(e.amount)) || 0),
              entryType: e.entryType || 'Dr'
            }))
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
              hsnCode: String(i.hsnCode || '')
            }))
          }
        },
        include: { entries: { include: { ledger: true } }, inventoryEntries: { include: { stockItem: true } } }
      });
      return voucher;
    });

    return NextResponse.json({ success: true, voucher: result });
  } catch (error: any) {
    console.error("Voucher Save Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const { id, companyId, type, date, voucherNo, narration, entries = [], inventoryEntries = [] } = data;

    if (!id) return NextResponse.json({ success: false, error: "Missing voucher ID" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      // Delete existing entries and inventoryEntries first
      await tx.voucherEntry.deleteMany({ where: { voucherId: parseInt(id) } });
      await tx.inventoryEntry.deleteMany({ where: { voucherId: parseInt(id) } });

      const voucher = await tx.voucher.update({
        where: { id: parseInt(id) },
        data: {
          companyId: parseInt(String(companyId)),
          type,
          date: normalizeDate(date),
          voucherNo: String(voucherNo || "1"),
          narration: narration || "",
          entries: {
            create: entries.filter((e:any) => e.ledgerId && !isNaN(parseInt(String(e.ledgerId)))).map((e: any) => ({
              ledgerId: parseInt(String(e.ledgerId)),
              amount: Math.abs(parseFloat(String(e.amount)) || 0),
              entryType: e.entryType || 'Dr'
            }))
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
              hsnCode: String(i.hsnCode || '')
            }))
          }
        },
        include: { entries: { include: { ledger: true } }, inventoryEntries: { include: { stockItem: true } } }
      });
      return voucher;
    });

    return NextResponse.json({ success: true, voucher: result });
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
  return NextResponse.json({ success: true, vouchers });
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
