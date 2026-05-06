import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const item = await prisma.stockItem.create({
      data: { 
        name: data.name, 
        alias: data.alias, 
        groupName: data.under || 'Primary',
        categoryName: data.category || 'Not Applicable',
        unitName: data.unit || 'Nos',
        unitId: data.unitId ? parseInt(data.unitId) : undefined,
        openingQty: parseFloat(data.openingQty || 0), 
        openingRate: parseFloat(data.openingRate || 0), 
        openingVal: (parseFloat(data.openingQty || 0)) * (parseFloat(data.openingRate || 0)), 
        gstRate: parseFloat(data.gstRate || 18), 
        hsnCode: data.hsnCode, 
        altUnit: data.altUnit,
        gstApplicable: data.gstApplicable || 'Applicable',
        typeOfSupply: data.typeOfSupply || 'Goods',
        costingMethod: data.costingMethod || 'Average Cost',
        marketValuationMethod: data.marketValuationMethod || 'Average Price',
        showInclTax: !!data.showInclTax, 
        showAmtInclTax: !!data.showAmtInclTax, 
        companyId: parseInt(data.companyId) 
      }
    });
    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...data } = await req.json();
    if (!id) throw new Error("Item ID is required");
    
    const item = await prisma.stockItem.update({
      where: { id: parseInt(id) },
      data: { 
        name: data.name, 
        alias: data.alias, 
        groupName: data.under || 'Primary',
        categoryName: data.category || 'Not Applicable',
        unitName: data.unit || 'Nos',
        unitId: data.unitId ? parseInt(data.unitId) : undefined,
        openingQty: parseFloat(data.openingQty || 0), 
        openingRate: parseFloat(data.openingRate || 0), 
        openingVal: (parseFloat(data.openingQty || 0)) * (parseFloat(data.openingRate || 0)), 
        gstRate: parseFloat(data.gstRate || 18), 
        hsnCode: data.hsnCode, 
        altUnit: data.altUnit,
        gstApplicable: data.gstApplicable || 'Applicable',
        typeOfSupply: data.typeOfSupply || 'Goods',
        costingMethod: data.costingMethod || 'Average Cost',
        marketValuationMethod: data.marketValuationMethod || 'Average Price',
        showInclTax: !!data.showInclTax, 
        showAmtInclTax: !!data.showAmtInclTax 
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
    const rawItems = await prisma.stockItem.findMany({
      where: companyId ? { companyId: parseInt(companyId) } : undefined
    });
    const items = rawItems.map(it => ({
      ...it,
      unit: it.unitName, // Map DB field back to frontend field
      under: it.groupName,
      category: it.categoryName
    }));
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

