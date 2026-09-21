import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDashboardColumns } from '@/lib/ensureDashboardColumns';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureDashboardColumns();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const pin = req.headers.get('x-dashboard-pin') || searchParams.get('pin');

    if (!token) {
      return NextResponse.json({ error: "Dashboard token is required" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { dashboardToken: token },
      include: {
        vouchers: {
          include: {
            entries: true,
            inventoryEntries: true,
          }
        },
        ledgers: true,
        stockItems: true
      }
    });

    if (!company) {
      return NextResponse.json({ 
        error: "This live dashboard link is invalid or has expired." 
      }, { status: 404 });
    }

    if (company.dashboardEnabled === false) {
      return NextResponse.json({ 
        error: "Access to this live dashboard has been temporarily disabled by the administrator." 
      }, { status: 403 });
    }

    // Check if 4-digit PIN is configured
    const hasPin = Boolean(company.dashboardPin && company.dashboardPin.trim());
    if (hasPin) {
      if (!pin || pin.trim() !== company.dashboardPin?.trim()) {
        return NextResponse.json({
          requiresPin: true,
          companyName: company.name,
          error: pin ? "Incorrect 4-digit PIN. Please try again." : undefined
        });
      }
    }

    // Filter out non-financial vouchers like quotations
    const validVouchers = (company.vouchers || []).filter((v: any) => 
      v.type !== 'Sales Quotation' && v.type !== 'Quotation'
    );

    // Format vouchers to match the structure expected by RealtimeDashboardModal
    const formattedVouchers = validVouchers.map((v: any) => {
      const partySide = ['Sales', 'Payment', 'Debit Note'].includes(v.type) ? 'Dr' : 'Cr';
      const partyEntry = (v.entries || []).find((e: any) => e.entryType === partySide);
      const computedTotal = partyEntry?.amount || (v.entries || []).reduce((max: number, e: any) => Math.max(max, Number(e.amount) || 0), 0) || 0;

      return {
        ...v,
        date: v.date ? new Date(v.date).toISOString().split('T')[0] : '',
        total: Number(computedTotal) || 0,
        entries: (v.entries || []).map((e: any) => ({
          ...e,
          ledgerId: Number(e.ledgerId) || 0,
          amount: Number(e.amount) || 0
        })),
        inventoryEntries: (v.inventoryEntries || []).map((ie: any) => ({
          ...ie,
          stockItemId: Number(ie.stockItemId || ie.itemId) || 0,
          itemId: Number(ie.stockItemId || ie.itemId) || 0,
          qty: Number(ie.qty) || 0,
          rate: Number(ie.rate) || 0,
          amount: Number(ie.amount) || 0
        }))
      };
    });

    // Format financial year period
    const startYear = company.financialYearStart ? new Date(company.financialYearStart).getFullYear() : 2026;
    const currentPeriod = {
      start: `01-Apr-${startYear}`,
      end: `31-Mar-${startYear + 1}`
    };

    return NextResponse.json({
      success: true,
      requiresPin: false,
      company: {
        id: company.id,
        name: company.name,
        currencySymbol: company.currencySymbol || '₹',
        financialYearStart: company.financialYearStart,
        booksBeginFrom: company.booksBeginFrom
      },
      vouchers: formattedVouchers,
      ledgers: company.ledgers || [],
      stockItems: company.stockItems || [],
      currentPeriod,
      lastSyncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("Live dashboard data error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
