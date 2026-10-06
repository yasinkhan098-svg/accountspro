import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyLicenseToken } from '@/lib/licenseEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, machineId, companyId, push, lastSyncedAt } = body;

    if (!token || !companyId) {
      return NextResponse.json({ error: 'Token and Company ID are required' }, { status: 400 });
    }

    const verification = verifyLicenseToken(token, machineId);
    if (!verification.valid || !verification.payload) {
      return NextResponse.json({ error: verification.reason || 'Invalid license token' }, { status: 401 });
    }

    const cId = parseInt(String(companyId));

    // Verify company ownership or permission
    const company = await prisma.company.findFirst({
      where: { id: cId, userId: verification.payload.userId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found or access denied' }, { status: 403 });
    }

    let pushedVouchersCount = 0;

    // 1. Ingest pushed vouchers from offline desktop
    if (push && Array.isArray(push.vouchers) && push.vouchers.length > 0) {
      for (const v of push.vouchers) {
        try {
          const vNo = String(v.voucherNo || v.voucherNumber || '').trim();
          // Check if voucher with this voucherNo already exists in cloud
          const existing = await prisma.voucher.findFirst({
            where: {
              companyId: cId,
              type: v.type,
              voucherNo: vNo,
            },
          });

          if (!existing && vNo) {
            // Create voucher in cloud
            await prisma.voucher.create({
              data: {
                companyId: cId,
                type: v.type,
                voucherNo: vNo,
                date: new Date(v.date || Date.now()),
                narration: v.narration || null,
                partyDetails: v.partyDetails ? JSON.stringify(v.partyDetails) : null,
                dispatchDetails: v.dispatchDetails ? JSON.stringify(v.dispatchDetails) : null,
                entries: {
                  create: (v.entries || []).map((e: any) => ({
                    ledgerId: parseInt(String(e.ledgerId)),
                    ledgerName: e.ledgerName || null,
                    amount: parseFloat(e.amount) || 0,
                    entryType: e.entryType || (e.type === 'Cr' ? 'Cr' : 'Dr'),
                  })),
                },
                inventoryEntries: {
                  create: (v.inventoryEntries || v.inventoryAllocations || []).map((inv: any) => ({
                    stockItemId: parseInt(String(inv.stockItemId)),
                    qty: parseFloat(inv.qty || inv.quantity) || 0,
                    rate: parseFloat(inv.rate) || 0,
                    amount: parseFloat(inv.amount) || 0,
                    unit: inv.unit || 'Nos',
                  })),
                },
              },
            });
            pushedVouchersCount++;
          }
        } catch (vErr) {
          console.error('Error syncing voucher from desktop:', vErr);
        }
      }
    }

    // 2. Fetch updates created on cloud since lastSyncedAt
    const sinceDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

    const cloudVouchers = await prisma.voucher.findMany({
      where: {
        companyId: cId,
        createdAt: { gt: sinceDate },
      },
      include: {
        entries: {
          include: { ledger: true },
        },
        inventoryEntries: {
          include: { stockItem: true },
        },
      },
      take: 200,
    });

    const cloudLedgers = await prisma.ledger.findMany({
      where: {
        companyId: cId,
      },
    });

    const cloudStockItems = await prisma.stockItem.findMany({
      where: {
        companyId: cId,
      },
      include: {
        unit: true,
        group: true,
      },
    });

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      pushedVouchersCount,
      pull: {
        vouchers: cloudVouchers,
        ledgers: cloudLedgers,
        stockItems: cloudStockItems,
      },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error?.message || 'Sync failed' }, { status: 500 });
  }
}
