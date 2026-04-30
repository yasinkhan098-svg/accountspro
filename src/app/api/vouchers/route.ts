import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { companyId, type, date, voucherNo, narration, entries = [], inventoryEntries = [] } = data;

    if (!companyId) return NextResponse.json({ success: false, error: "Missing companyId" }, { status: 400 });

    // Use a transaction to ensure all entries and inventory movements are saved together
    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.create({
        data: {
          companyId: parseInt(companyId),
          type,
          date: new Date(date || new Date()),
          voucherNo: voucherNo || "1",
          narration,
          entries: {
            create: entries.map((e: any) => ({
              ledgerId: parseInt(e.ledgerId),
              amount: parseFloat(e.amount),
              entryType: e.entryType // Dr or Cr
            }))
          },
          // Inventory Items mapping
          inventoryEntries: {
            create: inventoryEntries.map((i: any) => ({
              stockItemId: parseInt(i.itemId),
              qty: parseFloat(i.qty),
              rate: parseFloat(i.rate),
              unit: i.unit,
              amount: parseFloat(i.amount)
            }))
          }
        },
        include: { entries: true, inventoryEntries: true }
      });
      return voucher;
    });

    return NextResponse.json({ success: true, voucher: result });
  } catch (error: any) {
    console.error("Voucher Save Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const vouchers = await prisma.voucher.findMany({
    where: companyId ? { companyId: parseInt(companyId) } : undefined,
    include: { entries: true, inventoryEntries: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ success: true, vouchers });
}
