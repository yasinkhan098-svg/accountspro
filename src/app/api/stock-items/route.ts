import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    let finalUnitId = data.unitId ? parseInt(data.unitId) : null;
    
    if (data.unit && data.companyId) {
      const existing = await prisma.unit.findFirst({ where: { companyId: parseInt(data.companyId), name: data.unit } });
      if (existing) {
         finalUnitId = existing.id;
      } else {
         const nu = await prisma.unit.create({ data: { name: data.unit, formalName: data.unit, companyId: parseInt(data.companyId) }});
         finalUnitId = nu.id;
      }
    }

    const item = await prisma.stockItem.create({
      data: {
        name: data.name,
        companyId: parseInt(data.companyId),
        groupId: data.groupId ? parseInt(data.groupId) : null,
        unitId: finalUnitId,
        openingQty: parseFloat(data.openingQty || 0),
        openingVal: parseFloat(data.openingVal || 0),
        openingRate: parseFloat(data.openingRate || 0),
        gstApplicable: data.gstApplicable || "Applicable",
        gstRate: data.gstRate ? parseFloat(data.gstRate) : 18,
        hsnCode: data.hsnCode || null
      },
      include: { unit: true }
    });
    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) throw new Error("Item ID is required");
    
    let finalUnitId = data.unitId ? parseInt(data.unitId) : null;
    if (data.unit && data.companyId) {
      const existing = await prisma.unit.findFirst({ where: { companyId: parseInt(data.companyId), name: data.unit } });
      if (existing) {
         finalUnitId = existing.id;
      } else {
         const nu = await prisma.unit.create({ data: { name: data.unit, formalName: data.unit, companyId: parseInt(data.companyId) }});
         finalUnitId = nu.id;
      }
    }

    const item = await prisma.stockItem.update({
      where: { id: parseInt(data.id) },
      data: {
        name: data.name,
        groupId: data.groupId ? parseInt(data.groupId) : null,
        unitId: finalUnitId,
        openingQty: parseFloat(data.openingQty || 0),
        openingVal: parseFloat(data.openingVal || 0),
        openingRate: parseFloat(data.openingRate || 0),
        gstApplicable: data.gstApplicable || "Applicable",
        gstRate: data.gstRate ? parseFloat(data.gstRate) : 18,
        hsnCode: data.hsnCode || null
      },
      include: { unit: true }
    });
    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const items = await prisma.stockItem.findMany({
      where: companyId ? { companyId: parseInt(companyId) } : undefined,
      include: { unit: true }
    });
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) throw new Error("Item ID is required");
    await prisma.stockItem.delete({
      where: { id: parseInt(data.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

