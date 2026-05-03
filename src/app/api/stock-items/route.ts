import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const item = await prisma.stockItem.create({
      data: {
        name: data.name,
        companyId: parseInt(data.companyId),
        groupId: data.groupId ? parseInt(data.groupId) : null,
        unitId: data.unitId ? parseInt(data.unitId) : null,
        openingQty: parseFloat(data.openingQty || 0),
        openingVal: parseFloat(data.openingVal || 0),
        gstApplicable: data.gstApplicable || "Applicable"
      }
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
    const item = await prisma.stockItem.update({
      where: { id: parseInt(data.id) },
      data: {
        name: data.name,
        groupId: data.groupId ? parseInt(data.groupId) : null,
        unitId: data.unitId ? parseInt(data.unitId) : null,
        openingQty: parseFloat(data.openingQty || 0),
        openingVal: parseFloat(data.openingVal || 0),
        gstApplicable: data.gstApplicable || "Applicable"
      }
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
      where: companyId ? { companyId: parseInt(companyId) } : undefined
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

