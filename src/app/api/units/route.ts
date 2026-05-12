import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalizeUnit = (u: any) => ({
  ...u,
  symbol: u.name
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const unit = await prisma.unit.create({
      data: {
        name: data.name,
        formalName: data.formalName,
        decimalPlaces: parseInt(data.decimalPlaces || 0),
        companyId: parseInt(data.companyId)
      }
    });
    return NextResponse.json({ success: true, unit: normalizeUnit(unit) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const rawUnits = await prisma.unit.findMany({
      where: companyId ? { companyId: parseInt(companyId) } : undefined
    });
    const units = rawUnits.map(normalizeUnit);
    return NextResponse.json({ success: true, units });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) throw new Error("Unit ID is required");
    const unit = await prisma.unit.update({
      where: { id: parseInt(data.id) },
      data: {
        name: data.name,
        formalName: data.formalName,
        decimalPlaces: data.decimalPlaces !== undefined ? parseInt(data.decimalPlaces || 0) : undefined
      }
    });
    return NextResponse.json({ success: true, unit: normalizeUnit(unit) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) throw new Error("Unit ID is required");
    await prisma.unit.delete({
      where: { id: parseInt(data.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

