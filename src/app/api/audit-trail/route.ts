import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuditChain, ensureAuditTrailTable } from '@/lib/auditTrail';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureAuditTrailTable();
    const { searchParams } = new URL(req.url);
    const companyIdStr = searchParams.get('companyId');
    const mode = searchParams.get('mode') || 'list'; // 'list' | 'verify'

    if (!companyIdStr) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    const companyId = parseInt(companyIdStr);
    if (isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid companyId' }, { status: 400 });
    }

    // 1. VERIFICATION MODE
    if (mode === 'verify') {
      const verification = await verifyAuditChain(companyId);
      return NextResponse.json({ success: true, verification });
    }

    // 2. LISTING MODE (Paginated + Filtered)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50')));
    const search = searchParams.get('search')?.trim() || '';
    const filterAction = searchParams.get('filterAction') || '';
    const filterType = searchParams.get('filterType') || '';

    const where: any = { companyId };
    if (filterAction && filterAction !== 'ALL') {
      where.action = filterAction;
    }
    if (filterType && filterType !== 'ALL') {
      where.voucherType = filterType;
    }
    if (search) {
      where.OR = [
        { voucherNo: { contains: search } },
        { narration: { contains: search } },
        { performedBy: { contains: search } }
      ];
    }

    const [totalCount, logs, actionCounts] = await Promise.all([
      prisma.auditTrail.count({ where }),
      prisma.auditTrail.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditTrail.groupBy({
        by: ['action'],
        where: { companyId },
        _count: { action: true }
      })
    ]);

    const stats = {
      total: 0,
      creates: 0,
      updates: 0,
      deletes: 0
    };

    for (const item of actionCounts) {
      stats.total += item._count.action;
      if (item.action === 'CREATE') stats.creates = item._count.action;
      if (item.action === 'UPDATE') stats.updates = item._count.action;
      if (item.action === 'DELETE') stats.deletes = item._count.action;
    }

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats
    });
  } catch (error: any) {
    console.error('Audit Trail API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
