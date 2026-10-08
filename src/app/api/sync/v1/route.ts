import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyLicenseToken } from '@/lib/licenseEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, machineId, companyId, push, lastSyncedAt } = body;

    if (!token || !companyId) {
      return NextResponse.json({ error: 'Token and Company ID are required' }, { status: 400 });
    }

    // 1. Verify License Token or Session Token
    let userId: number | null = null;
    const verification = verifyLicenseToken(token, machineId);
    if (verification.valid && verification.payload) {
      userId = verification.payload.userId;
    } else {
      // Fallback: check if it is a session token from User table
      const user = await prisma.user.findFirst({
        where: { sessionToken: token },
      });
      if (user) {
        userId = user.id;
      } else {
        return NextResponse.json(
          { error: verification.reason || 'Invalid license or session token' },
          { status: 401 }
        );
      }
    }

    // Check if this machine was deactivated from user account portal
    if (machineId && userId) {
      try {
        const devRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT "isActive" FROM "DeviceActivation" WHERE "userId" = ? AND "machineId" = ? ORDER BY "activatedAt" DESC LIMIT 1`,
          userId,
          String(machineId).trim()
        );
        if (devRows && devRows.length > 0 && (devRows[0].isActive === 0 || devRows[0].isActive === false)) {
          return NextResponse.json({
            error: 'DEVICE_DEACTIVATED',
            message: 'This device was unlinked from your web account portal. License has been transferred to another computer.',
          }, { status: 403 });
        }
      } catch (e) {
        // Ignore DB error
      }
    }

    const cId = parseInt(String(companyId), 10);

    // Verify company exists
    const company = await prisma.company.findFirst({
      where: { id: cId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found or access denied' }, { status: 403 });
    }

    let pushedVouchersCount = 0;
    let pushedLedgersCount = 0;
    let pushedStockItemsCount = 0;

    // ==================== 2. INGEST PUSHED MASTERS ====================

    // A. Ledgers
    if (push && Array.isArray(push.ledgers) && push.ledgers.length > 0) {
      for (const l of push.ledgers) {
        try {
          const lName = String(l.name || '').trim();
          if (!lName) continue;

          const existingLedger = await prisma.ledger.findFirst({
            where: { companyId: cId, name: lName },
          });

          if (!existingLedger) {
            await prisma.ledger.create({
              data: {
                companyId: cId,
                name: lName,
                groupName: l.groupName || 'Suspense A/c',
                alias: l.alias || null,
                mailingName: l.mailingName || null,
                openingBal: parseFloat(String(l.openingBal ?? l.openingBalance ?? 0)) || 0,
                balanceType: l.balanceType || 'Dr',
                address: l.address || null,
                state: l.state || null,
                pinCode: l.pinCode || null,
                panItNo: l.panItNo || null,
                gstin: l.gstin || null,
                country: l.country || 'India',
                phone: l.phone || null,
                email: l.email || null,
                bankName: l.bankName || null,
                accountNo: l.accountNo || null,
                ifsc: l.ifsc || null,
                bankHolderName: l.bankHolderName || null,
                odLimit: l.odLimit ? parseFloat(String(l.odLimit)) : null,
              },
            });
            pushedLedgersCount++;
          }
        } catch (lErr) {
          console.error('Error syncing ledger from desktop:', lErr);
        }
      }
    }

    // B. Stock Groups
    if (push && Array.isArray(push.stockGroups) && push.stockGroups.length > 0) {
      for (const sg of push.stockGroups) {
        try {
          const sgName = String(sg.name || '').trim();
          if (!sgName) continue;
          const existingSG = await prisma.stockGroup.findFirst({
            where: { companyId: cId, name: sgName },
          });
          if (!existingSG) {
            await prisma.stockGroup.create({
              data: { companyId: cId, name: sgName },
            });
          }
        } catch (sgErr) {
          console.error('Error syncing stock group:', sgErr);
        }
      }
    }

    // C. Units
    if (push && Array.isArray(push.units) && push.units.length > 0) {
      for (const u of push.units) {
        try {
          const uName = String(u.name || '').trim();
          if (!uName) continue;
          const existingU = await prisma.unit.findFirst({
            where: { companyId: cId, name: uName },
          });
          if (!existingU) {
            await prisma.unit.create({
              data: {
                companyId: cId,
                name: uName,
                formalName: u.formalName || null,
                decimalPlaces: parseInt(String(u.decimalPlaces || 0), 10) || 0,
              },
            });
          }
        } catch (uErr) {
          console.error('Error syncing unit:', uErr);
        }
      }
    }

    // D. Stock Items
    if (push && Array.isArray(push.stockItems) && push.stockItems.length > 0) {
      for (const si of push.stockItems) {
        try {
          const siName = String(si.name || '').trim();
          if (!siName) continue;
          const existingSI = await prisma.stockItem.findFirst({
            where: { companyId: cId, name: siName },
          });
          if (!existingSI) {
            await prisma.stockItem.create({
              data: {
                companyId: cId,
                name: siName,
                openingQty: parseFloat(String(si.openingQty || 0)) || 0,
                openingVal: parseFloat(String(si.openingVal || 0)) || 0,
                openingRate: parseFloat(String(si.openingRate || 0)) || 0,
                groupName: si.groupName || null,
                categoryName: si.categoryName || null,
                unitName: si.unitName || null,
                gstApplicable: si.gstApplicable || 'Applicable',
                gstRate: parseFloat(String(si.gstRate || 18)) || 18,
                hsnCode: si.hsnCode || null,
                showInclTax: !!si.showInclTax,
                showAmtInclTax: !!si.showAmtInclTax,
                defaultDiscount: parseFloat(String(si.defaultDiscount || 0)) || 0,
              },
            });
            pushedStockItemsCount++;
          }
        } catch (siErr) {
          console.error('Error syncing stock item:', siErr);
        }
      }
    }

    // ==================== 3. INGEST PUSHED VOUCHERS ====================

    // Handle voucher deletions from offline
    if (push && Array.isArray(push.deletedVoucherIds) && push.deletedVoucherIds.length > 0) {
      for (const vId of push.deletedVoucherIds) {
        try {
          const numId = parseInt(String(vId), 10);
          if (numId && numId < 1000000000000) {
            await prisma.voucherEntry.deleteMany({ where: { voucherId: numId } });
            await prisma.inventoryEntry.deleteMany({ where: { voucherId: numId } });
            await prisma.voucher.deleteMany({ where: { id: numId, companyId: cId } });
          }
        } catch (delErr) {
          console.error('Error deleting voucher during sync:', delErr);
        }
      }
    }

    // Handle voucher creation/upsert
    if (push && Array.isArray(push.vouchers) && push.vouchers.length > 0) {
      // Pre-fetch all ledgers & items for fast ID resolution
      const allCurrentLedgers = await prisma.ledger.findMany({ where: { companyId: cId } });
      const ledgerMap = new Map<string, number>(allCurrentLedgers.map(l => [l.name.toLowerCase().trim(), l.id]));
      const allCurrentItems = await prisma.stockItem.findMany({ where: { companyId: cId } });
      const itemMap = new Map<string, number>(allCurrentItems.map(item => [item.name.toLowerCase().trim(), item.id]));

      for (const v of push.vouchers) {
        try {
          const vNo = String(v.voucherNo || v.voucherNumber || '').trim();
          if (!vNo) continue;

          const existing = await prisma.voucher.findFirst({
            where: {
              companyId: cId,
              type: v.type,
              voucherNo: vNo,
            },
          });

          if (!existing) {
            // Resolve ledger entries
            const entriesToCreate = (v.entries || []).map((e: any) => {
              let lId = parseInt(String(e.ledgerId || 0), 10);
              const lName = (e.ledgerName || e.ledger?.name || '').trim();
              if ((!lId || lId <= 0 || lId >= 1000000000000) && lName) {
                const matchedId = ledgerMap.get(lName.toLowerCase());
                if (matchedId) lId = matchedId;
              }
              // If ledger still doesn't exist, fallback to first available ledger
              if (!lId || lId <= 0) {
                lId = allCurrentLedgers[0]?.id || 1;
              }
              return {
                ledgerId: lId,
                ledgerName: lName || null,
                amount: parseFloat(String(e.amount || 0)) || 0,
                entryType: e.entryType || (e.type === 'Cr' ? 'Cr' : 'Dr'),
              };
            });

            // Resolve inventory entries
            const inventoryToCreate = (v.inventoryEntries || v.inventoryAllocations || []).map((inv: any) => {
              let sId = parseInt(String(inv.stockItemId || inv.itemId || 0), 10);
              const iName = (inv.itemName || inv.stockItem?.name || '').trim();
              if ((!sId || sId <= 0 || sId >= 1000000000000) && iName) {
                const matchedId = itemMap.get(iName.toLowerCase());
                if (matchedId) sId = matchedId;
              }
              if (!sId || sId <= 0) {
                sId = allCurrentItems[0]?.id || 1;
              }
              return {
                stockItemId: sId,
                qty: parseFloat(String(inv.qty || inv.quantity || 0)) || 0,
                rate: parseFloat(String(inv.rate || 0)) || 0,
                rateInclTax: parseFloat(String(inv.rateInclTax || 0)) || 0,
                amountInclTax: parseFloat(String(inv.amountInclTax || 0)) || 0,
                amount: parseFloat(String(inv.amount || 0)) || 0,
                unit: inv.unit || 'Nos',
                discountPerc: parseFloat(String(inv.discountPerc || 0)) || 0,
                discountAmt: parseFloat(String(inv.discountAmt || 0)) || 0,
                taxableAmount: parseFloat(String(inv.taxableAmount || 0)) || 0,
                gstRate: parseFloat(String(inv.gstRate || 18)) || 18,
                hsnCode: inv.hsnCode || null,
              };
            });

            await prisma.voucher.create({
              data: {
                companyId: cId,
                type: v.type,
                voucherNo: vNo,
                date: new Date(v.date || Date.now()),
                narration: v.narration || null,
                partyDetails: v.partyDetails ? (typeof v.partyDetails === 'string' ? v.partyDetails : JSON.stringify(v.partyDetails)) : null,
                dispatchDetails: v.dispatchDetails ? (typeof v.dispatchDetails === 'string' ? v.dispatchDetails : JSON.stringify(v.dispatchDetails)) : null,
                entries: { create: entriesToCreate },
                inventoryEntries: { create: inventoryToCreate },
              },
            });
            pushedVouchersCount++;
          }
        } catch (vErr) {
          console.error('Error creating voucher from sync push:', vErr);
        }
      }
    }

    // ==================== 4. PULL CLOUD DATA TO DESKTOP ====================

    const sinceDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

    const cloudVouchers = await prisma.voucher.findMany({
      where: { companyId: cId },
      include: {
        entries: {
          include: { ledger: true },
        },
        inventoryEntries: {
          include: { stockItem: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const cloudLedgers = await prisma.ledger.findMany({
      where: { companyId: cId },
      orderBy: { name: 'asc' },
    });

    const cloudStockItems = await prisma.stockItem.findMany({
      where: { companyId: cId },
      include: {
        unit: true,
        group: true,
      },
      orderBy: { name: 'asc' },
    });

    const cloudStockGroups = await prisma.stockGroup.findMany({
      where: { companyId: cId },
      orderBy: { name: 'asc' },
    });

    const cloudUnits = await prisma.unit.findMany({
      where: { companyId: cId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      counts: {
        pushedVouchers: pushedVouchersCount,
        pushedLedgers: pushedLedgersCount,
        pushedStockItems: pushedStockItemsCount,
      },
      pull: {
        vouchers: cloudVouchers,
        ledgers: cloudLedgers,
        stockItems: cloudStockItems,
        stockGroups: cloudStockGroups,
        units: cloudUnits,
      },
    });
  } catch (error: any) {
    console.error('Sync API Error:', error);
    return NextResponse.json({ error: error?.message || 'Sync failed' }, { status: 500 });
  }
}
