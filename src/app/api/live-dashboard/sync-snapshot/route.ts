import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDashboardColumns } from '@/lib/ensureDashboardColumns';
import { enforceStorageQuota } from '@/lib/storageQuotaService';
import { verifyLicenseToken } from '@/lib/licenseEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await ensureDashboardColumns();

    const body = await req.json();
    const { token, companyId, companyName, snapshot, licenseToken, machineId } = body;

    if (!token && !licenseToken) {
      return NextResponse.json({ error: 'Dashboard token or license token is required' }, { status: 400 });
    }

    if (!snapshot || typeof snapshot !== 'object') {
      return NextResponse.json({ error: 'Valid snapshot payload is required' }, { status: 400 });
    }

    // 1. Locate target company by dashboardToken or local link
    let company: any = null;
    if (token) {
      company = await prisma.company.findFirst({
        where: { dashboardToken: String(token).trim() },
      });
    }

    // Fallback: If not found by dashboardToken, attempt resolution via licenseToken & companyId
    if (!company && licenseToken) {
      const ver = verifyLicenseToken(licenseToken, machineId);
      if (ver.valid && ver.payload?.userId) {
        const uid = ver.payload.userId;
        if (companyId) {
          company = await prisma.company.findFirst({
            where: { id: Number(companyId), userId: uid },
          });
        }
        if (!company && companyName) {
          company = await prisma.company.findFirst({
            where: { name: String(companyName).trim(), userId: uid },
          });
        }
        // If company does not yet exist in cloud for this desktop installation, create a lightweight record
        if (!company && companyName) {
          const freshToken = token || `dsh_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
          company = await prisma.company.create({
            data: {
              userId: uid,
              name: String(companyName).trim(),
              dashboardToken: freshToken,
              dashboardEnabled: true,
              financialYearStart: new Date(snapshot.company?.financialYearStart || '2026-04-01'),
              booksBeginFrom: new Date(snapshot.company?.booksBeginFrom || '2026-04-01'),
              currencySymbol: snapshot.company?.currencySymbol || '₹',
            },
          });
        }
      }
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found or invalid live dashboard link token' },
        { status: 404 }
      );
    }

    // 2. Strict 10 MB Storage Quota Guard (FIFO rolling buffer)
    if (company.userId) {
      try {
        await enforceStorageQuota(company.userId);
      } catch (quotaErr) {
        console.warn('[LiveDashboardSync] Quota check warning:', quotaErr);
      }
    }

    // 3. Compact & Save snapshot JSON
    const snapshotStr = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
    const nowIso = new Date().toISOString();

    await prisma.company.update({
      where: { id: company.id },
      data: {
        dashboardSnapshot: snapshotStr,
        dashboardSnapshotAt: nowIso,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      token: company.dashboardToken,
      syncedAt: nowIso,
      sizeBytes: snapshotStr.length,
    });
  } catch (err: any) {
    console.error('[LiveDashboardSync] Snapshot sync error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to sync executive dashboard snapshot' },
      { status: 500 }
    );
  }
}
