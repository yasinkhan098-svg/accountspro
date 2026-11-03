import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const extractUnitString = (data: any, fallback = 'Nos'): string => {
  if (typeof data?.unit === 'string' && data.unit.trim()) return data.unit.trim();
  if (typeof data?.unitName === 'string' && data.unitName.trim()) return data.unitName.trim();
  if (data?.unit && typeof data.unit === 'object') {
    const sym = data.unit.symbol || data.unit.name;
    if (typeof sym === 'string' && sym.trim()) return sym.trim();
  }
  return fallback;
};

const normalizeStockItem = (it: any) => {
  const u = it.unitName || (typeof it.unit === 'string' ? it.unit : (it.unit?.name || it.unit?.symbol)) || 'Nos';
  return {
    ...it,
    unit: u,
    unitName: u,
    under: it.groupName || it.under || 'Primary',
    groupName: it.groupName || it.under || 'Primary',
    category: it.categoryName || it.category || 'Not Applicable',
    categoryName: it.categoryName || it.category || 'Not Applicable'
  };
};

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const cid = data.companyId ? parseInt(data.companyId) : 0;
    const uId = data.unitId ? parseInt(data.unitId) : 0;

    if (!data.name || String(data.name).trim() === "") {
      return NextResponse.json({ success: false, error: "Stock Item Name is required" }, { status: 400 });
    }

    const resolvedUnit = extractUnitString(data, 'Nos');

    // Case-insensitive duplicate check
    const existingItems = await prisma.stockItem.findMany({
      where: { companyId: cid }
    });
    const nameLower = data.name.trim().toLowerCase();
    const isDuplicate = existingItems.some(it => it.name.trim().toLowerCase() === nameLower);
    if (isDuplicate) {
      return NextResponse.json({ success: false, error: `Stock Item "${data.name}" already exists!` }, { status: 400 });
    }

    // Resolve or connect Unit relation if possible
    let finalUnitConnect: any = undefined;
    if (uId > 0) {
      finalUnitConnect = { connect: { id: uId } };
    } else if (cid > 0 && resolvedUnit && resolvedUnit !== 'Nos') {
      const u = await prisma.unit.findFirst({
        where: { companyId: cid, name: resolvedUnit }
      });
      if (u) finalUnitConnect = { connect: { id: u.id } };
    }
    
    const item = await prisma.stockItem.create({
      data: { 
        name: data.name, 
        alias: data.alias, 
        groupName: data.under !== undefined ? String(data.under) : (data.groupName || 'Primary'),
        categoryName: data.category !== undefined ? String(data.category) : (data.categoryName || 'Not Applicable'),
        unitName: resolvedUnit,
        ...(finalUnitConnect ? { unit: finalUnitConnect } : {}),
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
        defaultDiscount: parseFloat(data.defaultDiscount || 0),
        enableDescription: !!data.enableDescription,
        descLine1: !!data.descLine1,
        descLine2: !!data.descLine2,
        descLine3: !!data.descLine3,
        company: { connect: { id: cid } }
      },
      include: { unit: true }
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

    let resolvedUnit: string | undefined = undefined;
    if (data.unit !== undefined || data.unitName !== undefined) {
      resolvedUnit = extractUnitString(data, 'Nos');
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

    let finalUnitConnect: any = undefined;
    if (uId !== undefined) {
      if (uId > 0) finalUnitConnect = { connect: { id: uId } };
      else finalUnitConnect = { disconnect: true };
    } else if (cid && resolvedUnit && resolvedUnit !== 'Nos') {
      const u = await prisma.unit.findFirst({
        where: { companyId: cid, name: resolvedUnit }
      });
      if (u) finalUnitConnect = { connect: { id: u.id } };
    }

    const item = await prisma.stockItem.update({
      where: { 
        id: parseInt(id),
        ...(cid ? { companyId: cid } : {})
      },
      data: { 
        name: data.name, 
        alias: data.alias, 
        groupName: data.under !== undefined ? String(data.under) : (data.groupName !== undefined ? String(data.groupName) : undefined),
        categoryName: data.category !== undefined ? String(data.category) : (data.categoryName !== undefined ? String(data.categoryName) : undefined),
        unitName: resolvedUnit !== undefined ? resolvedUnit : undefined,
        ...(finalUnitConnect ? { unit: finalUnitConnect } : {}),
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
        showAmtInclTax: data.showAmtInclTax !== undefined ? !!data.showAmtInclTax : undefined,
        defaultDiscount: data.defaultDiscount !== undefined ? (parseFloat(data.defaultDiscount) || 0) : undefined,
        enableDescription: data.enableDescription !== undefined ? !!data.enableDescription : undefined,
        descLine1: data.descLine1 !== undefined ? !!data.descLine1 : undefined,
        descLine2: data.descLine2 !== undefined ? !!data.descLine2 : undefined,
        descLine3: data.descLine3 !== undefined ? !!data.descLine3 : undefined
      },
      include: { unit: true }
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
    const purchaseRate = searchParams.get('purchaseRate');
    const stockItemId = searchParams.get('stockItemId');

    // --- Fetch last purchase rate for a specific stock item ---
    if (purchaseRate === '1' && stockItemId && companyId) {
      const itemId = parseInt(stockItemId);
      const cid = parseInt(companyId);

      // Find the latest Purchase voucher that has this stock item in inventoryEntries
      const lastEntry = await prisma.inventoryEntry.findFirst({
        where: {
          stockItemId: itemId,
          voucher: {
            companyId: cid,
            type: 'Purchase',
          },
        },
        orderBy: { id: 'desc' },
        select: { rate: true },
      });

      if (lastEntry && lastEntry.rate > 0) {
        return NextResponse.json({ success: true, rate: lastEntry.rate });
      }

      // Fallback: use openingRate from the stock item
      const item = await prisma.stockItem.findFirst({ where: { id: itemId, companyId: cid } });
      return NextResponse.json({ success: true, rate: item?.openingRate ?? 0, fallback: true });
    }

    // --- Default: list all stock items ---
    const rawItems = await prisma.stockItem.findMany({
      where: companyId ? { companyId: parseInt(companyId) } : undefined,
      include: { unit: true }
    });
    const items = rawItems.map(it => {
      const u = it.unitName || it.unit?.name || (it as any).unit?.symbol || 'Nos';
      return {
        ...it,
        unit: u,
        unitName: u,
        under: it.groupName || 'Primary',
        groupName: it.groupName || 'Primary',
        category: it.categoryName || 'Not Applicable',
        categoryName: it.categoryName || 'Not Applicable'
      };
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
