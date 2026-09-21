import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { randomBytes } from 'crypto';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) return NextResponse.json({ error: "Company ID is required" }, { status: 400 });

    let company = await prisma.company.findFirst({
      where: user.id !== -1 
        ? { id: Number(companyId), OR: [{ userId: user.id }, { userId: null }] }
        : { id: Number(companyId) }
    });
    if (!company) {
      company = await prisma.company.findUnique({ where: { id: Number(companyId) } });
    }
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    // Auto-generate token if not yet created
    if (!company.dashboardToken) {
      const newToken = 'dsh_' + randomBytes(12).toString('hex');
      company = await prisma.company.update({
        where: { id: company.id },
        data: { dashboardToken: newToken }
      });
    }

    return NextResponse.json({
      success: true,
      token: company.dashboardToken,
      hasPin: Boolean(company.dashboardPin && company.dashboardPin.trim()),
      enabled: company.dashboardEnabled ?? true,
      companyName: company.name
    });
  } catch (err: any) {
    console.error("Live dashboard manage GET error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const { action, companyId, pin, enabled } = data;

    if (!companyId) return NextResponse.json({ error: "Company ID is required" }, { status: 400 });

    let company = await prisma.company.findFirst({
      where: user.id !== -1 
        ? { id: Number(companyId), OR: [{ userId: user.id }, { userId: null }] }
        : { id: Number(companyId) }
    });
    if (!company) {
      company = await prisma.company.findUnique({ where: { id: Number(companyId) } });
    }
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    if (action === 'reset') {
      const newToken = 'dsh_' + randomBytes(12).toString('hex');
      const updated = await prisma.company.update({
        where: { id: company.id },
        data: { dashboardToken: newToken }
      });
      return NextResponse.json({
        success: true,
        token: updated.dashboardToken,
        hasPin: Boolean(updated.dashboardPin && updated.dashboardPin.trim()),
        enabled: updated.dashboardEnabled ?? true,
        message: "Dashboard link has been reset successfully. Previous link is now expired."
      });
    }

    if (action === 'set_pin') {
      const cleanPin = pin ? String(pin).trim() : null;
      if (cleanPin && cleanPin.length !== 4) {
        return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
      }
      const updated = await prisma.company.update({
        where: { id: company.id },
        data: { dashboardPin: cleanPin }
      });
      return NextResponse.json({
        success: true,
        hasPin: Boolean(cleanPin),
        message: cleanPin ? "4-Digit PIN has been set successfully" : "PIN protection has been removed"
      });
    }

    if (action === 'toggle_enabled') {
      const isEnabled = enabled !== undefined ? Boolean(enabled) : !company.dashboardEnabled;
      const updated = await prisma.company.update({
        where: { id: company.id },
        data: { dashboardEnabled: isEnabled }
      });
      return NextResponse.json({
        success: true,
        enabled: updated.dashboardEnabled,
        message: isEnabled ? "Live dashboard link enabled" : "Live dashboard link disabled"
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Live dashboard manage POST error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
