import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalizeStockItem = (it: any) => ({
  ...it,
  unit: it.unitName,
  under: it.groupName,
  category: it.categoryName
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const cid = data.companyId ? parseInt(data.companyId) : 0;
    const uId = data.unitId ? parseInt(data.unitId) : 0;

    if (!data.name || String(data.name).trim() === "") {
      return NextResponse.json({ success: false, error: "Stock Item Name is required" }, { status: 400 });
    }

    // Case-insensitive duplicate check
    const existingItems = await prisma.stockItem.findMany({
      where: { companyId: cid }
    });
    const nameLower = data.name.trim().toLowerCase();
    const isDuplicate = existingItems.some(it => it.name.trim().toLowerCase() === nameLower);
    if (isDuplicate) {
      return NextResponse.json({ success: false, error: `Stock Item "${data.name}" already exists!` }, { status: 400 });
    }
    
    const item = await prisma.stockItem.create({
      data: { 
        name: data.name, 
        alias: data.alias, 
        groupName: data.under !== undefined ? String(data.under) : 'Primary',
        categoryName: data.category !== undefined ? String(data.category) : 'Not Applicable',
        unitName: data.unit !== undefined ? String(data.unit) : 'Nos',
        ...(uId > 0 ? { unit: { connect: { id: uId } } } : {}),
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
        // showAmtInclTax: !!data.showAmtInclTax, 
        // defaultDiscount: parseFloat(data.defaultDiscount || 0),
        company: { connect: { id: cid } }
      }
    });
    return NextResponse.json({ success: true, item: normalizeStockItem(item) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...data } = await req.json();
    if (!id) throw new Error("Item ID is required");
    
    const cid = data.companyId ? parseInt(data.companyId) : undefined;
    const uId = data.unitId !== undefined ? parseInt(data.unitId) : undefined;

    if (data.name !== undefined && String(data.name).trim() === "") {
      return NextResponse.json({ success: false, error: "Stock Item Name cannot be empty" }, { status: 400 });
    }

    // Case-insensitive duplicate check on rename
    if (data.name !== undefined) {
      let finalCid = cid;
      if (!finalCid) {
        const itemObj = await prisma.stockItem.findUnique({ where: { id: parseInt(id) } });
        if (itemObj) finalCid = itemObj.companyId;
      }
      if (finalCid) {
        const existingItems = await prisma.stockItem.findMany({
          where: { companyId: finalCid }
        });
        const nameLower = data.name.trim().toLowerCase();
        const isDuplicate = existingItems.some(it => 
          it.id !== parseInt(id) && 
          it.name.trim().toLowerCase() === nameLower
        );
        if (isDuplicate) {
          return NextResponse.json({ success: false, error: `Stock Item "${data.name}" already exists!` }, { status: 400 });
        }
      }
    }

    const item = await prisma.stockItem.update({
      where: { 
        id: parseInt(id),
        ...(cid ? { companyId: cid } : {})
      },
      data: { 
        name: data.name, 
        alias: data.alias, 
        groupName: data.under !== undefined ? String(data.under) : undefined,
        categoryName: data.category !== undefined ? String(data.category) : undefined,
        unitName: data.unit !== undefined ? String(data.unit) : undefined,
        ...(uId !== undefined ? (uId > 0 ? { unit: { connect: { id: uId } } } : { unit: { disconnect: true } }) : {}),
        openingQty: data.openingQty !== undefined ? (parseFloat(data.openingQty) || 0) : undefined, 
        openingRate: data.openingRate !== undefined ? (parseFloat(data.openingRate) || 0) : undefined, 
        openingVal: (data.openingQty !== undefined || data.openingRate !== undefined) 
          ? (parseFloat(data.openingQty || 0) * parseFloat(data.openingRate || 0)) 
          : undefined,
        gstRate: data.gstRate !== undefined ? (parseFloat(data.gstRate) || 0) : undefined, 
        hsnCode: data.hsnCode !== undefined ? String(data.hsnCode) : undefined, 
        altUnit: data.altUnit !== undefined ? String(data.altUnit) : undefined,
        gstApplicable: data.gstApplicable !== undefined ? String(data.gstApplicable) : undefined,
        typeOfSupply: data.typeOfSupply !== undefined ? String(data.typeOfSupply) : undefined,
        costingMethod: data.costingMethod !== undefined ? String(data.costingMethod) : undefined,
        marketValuationMethod: data.marketValuationMethod !== undefined ? String(data.marketValuationMethod) : undefined,
        showInclTax: data.showInclTax !== undefined ? !!data.showInclTax : undefined, 
        // showAmtInclTax: data.showAmtInclTax !== undefined ? !!data.showAmtInclTax : undefined,
        // defaultDiscount: data.defaultDiscount !== undefined ? (parseFloat(data.defaultDiscount) || 0) : undefined
      }
    });
    return NextResponse.json({ success: true, item: normalizeStockItem(item) });
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

