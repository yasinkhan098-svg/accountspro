import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();

    const company = await prisma.company.create({
      data: {
        ...(user.id !== -1 ? { user: { connect: { id: user.id } } } : {}),
        name: data.name || 'New Company',
        mailingName: data.mailingName || data.name || '',
        address: data.address || '',
        state: data.state || '',
        pinCode: data.pinCode || '',
        telephone: data.telephone || '',
        mobile: data.mobile || '',
        email: data.email || '',
        website: data.website || '',
        showMobile: data.showMobile ?? true,
        showEmail: data.showEmail ?? true,
        showWebsite: data.showWebsite ?? true,
        logo: data.logo || null,
        showLogo: data.showLogo ?? false,
        currencySymbol: data.currencySymbol || '₹',
        currencyName: data.currencyName || 'INR',
        gstin: data.gstin || '',
        bankName: data.bankName || '',
        bankHolderName: data.bankHolderName || '',
        accountNo: data.accountNo || '',
        ifsc: data.ifsc || '',
        swiftCode: data.swiftCode || '',
        financialYearStart: new Date(data.financialYearStart || '2026-04-01'),
        booksBeginFrom: new Date(data.booksBeginFrom || '2026-04-01'),
        registrationType: data.registrationType || 'Regular',
        pan: data.pan || '',
        securityControl: data.securityControl || false,
        password: data.password || null
      }
    });

    // Auto-create standard ledgers in the database for the new company
    const standardLedgers = [
      { name: 'Cash', groupName: 'Cash-in-hand', openingBal: 0, balanceType: 'Dr' },
      { name: 'Profit & Loss A/c', groupName: 'Primary', openingBal: 0, balanceType: 'Cr' },
      { name: 'Round Off', groupName: 'Indirect Expenses', openingBal: 0, balanceType: 'Dr' },
      { name: 'Discount Given', groupName: 'Indirect Expenses', openingBal: 0, balanceType: 'Dr' },
      { name: 'Discount Received', groupName: 'Indirect Incomes', openingBal: 0, balanceType: 'Cr' },
      { name: 'Transportation Charges', groupName: 'Direct Expenses', openingBal: 0, balanceType: 'Dr' },
      { name: 'Freight Charges', groupName: 'Direct Expenses', openingBal: 0, balanceType: 'Dr' },
      { name: 'CGST Payable', groupName: 'Duties & Taxes', openingBal: 0, balanceType: 'Cr' },
      { name: 'SGST Payable', groupName: 'Duties & Taxes', openingBal: 0, balanceType: 'Cr' },
      { name: 'IGST Payable', groupName: 'Duties & Taxes', openingBal: 0, balanceType: 'Cr' },
      { name: 'Sales A/c', groupName: 'Sales Accounts', openingBal: 0, balanceType: 'Cr' },
      { name: 'Purchase A/c', groupName: 'Purchase Accounts', openingBal: 0, balanceType: 'Dr' },
    ];

    await prisma.ledger.createMany({
      data: standardLedgers.map(l => ({
        companyId: company.id,
        name: l.name,
        groupName: l.groupName,
        openingBal: l.openingBal,
        balanceType: l.balanceType
      }))
    });

    // Auto-create default units in the database for the new company
    const initUnits = [
      { name: "Nos", symbol: "Nos", formalName: "Numbers", decimalPlaces: 0 },
      { name: "Pcs", symbol: "Pcs", formalName: "Pieces", decimalPlaces: 0 },
      { name: "Kg", symbol: "Kg", formalName: "Kilogram", decimalPlaces: 2 },
      { name: "Gms", symbol: "Gms", formalName: "Grams", decimalPlaces: 0 },
      { name: "Ltr", symbol: "Ltr", formalName: "Litre", decimalPlaces: 2 },
      { name: "Mtr", symbol: "Mtr", formalName: "Meter", decimalPlaces: 2 },
      { name: "Set", symbol: "Set", formalName: "Set", decimalPlaces: 0 },
      { name: "Bdl", symbol: "Bdl", formalName: "Bundle", decimalPlaces: 0 },
      { name: "Cft", symbol: "Cft", formalName: "Cubic Feet", decimalPlaces: 2 },
      { name: "Sqft", symbol: "Sqft", formalName: "Square Feet", decimalPlaces: 2 },
      { name: "Box", symbol: "Box", formalName: "Boxes", decimalPlaces: 0 },
      { name: "Dzn", symbol: "Dzn", formalName: "Dozen", decimalPlaces: 0 },
      { name: "Btl", symbol: "Btl", formalName: "Bottles", decimalPlaces: 0 },
      { name: "Bag", symbol: "Bag", formalName: "Bags", decimalPlaces: 0 },
      { name: "Tons", symbol: "Tons", formalName: "Metric Tons", decimalPlaces: 2 },
      { name: "Kits", symbol: "Kits", formalName: "Kits", decimalPlaces: 0 },
      { name: "Pack", symbol: "Pack", formalName: "Packs", decimalPlaces: 0 },
      { name: "Rol", symbol: "Rol", formalName: "Rolls", decimalPlaces: 0 },
      { name: "Ctn", symbol: "Ctn", formalName: "Cartons", decimalPlaces: 0 },
      { name: "Pair", symbol: "Pair", formalName: "Pairs", decimalPlaces: 0 }
    ];

    await prisma.unit.createMany({
      data: initUnits.map(u => ({
        companyId: company.id,
        name: u.name,
        formalName: u.formalName,
        decimalPlaces: u.decimalPlaces
      }))
    });

    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error("Company Creation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    if (!data.id) throw new Error("Company ID is required for update.");

    // Admin ke liye direct update (ownership check skip)
    if (user.id !== -1) {
      const existingCompany = await prisma.company.findFirst({ where: { id: data.id, userId: user.id } });
      if (!existingCompany) return NextResponse.json({ error: "Company not found or unauthorized" }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id: data.id },
      data: {
        name: data.name || 'New Company',
        mailingName: data.mailingName || data.name || '',
        address: data.address || '',
        state: data.state || '',
        pinCode: data.pinCode || '',
        telephone: data.telephone || '',
        mobile: data.mobile || '',
        email: data.email || '',
        website: data.website || '',
        showMobile: data.showMobile ?? true,
        showEmail: data.showEmail ?? true,
        showWebsite: data.showWebsite ?? true,
        logo: data.logo || null,
        showLogo: data.showLogo ?? false,
        currencySymbol: data.currencySymbol || '₹',
        currencyName: data.currencyName || 'INR',
        gstin: data.gstin || '',
        bankName: data.bankName || '',
        bankHolderName: data.bankHolderName || '',
        accountNo: data.accountNo || '',
        ifsc: data.ifsc || '',
        swiftCode: data.swiftCode || '',
        financialYearStart: new Date(data.financialYearStart || '2026-04-01'),
        booksBeginFrom: new Date(data.booksBeginFrom || '2026-04-01'),
        registrationType: data.registrationType || 'Regular',
        pan: data.pan || '',
        securityControl: data.securityControl || false,
        password: data.password || null
      }
    });
    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    if (!data.id) throw new Error("Company ID is required for deletion.");

    // Admin ke liye direct delete (ownership check skip)
    if (user.id !== -1) {
      const existingCompany = await prisma.company.findFirst({ where: { id: data.id, userId: user.id } });
      if (!existingCompany) return NextResponse.json({ error: "Company not found or unauthorized" }, { status: 404 });
    }

    await prisma.company.delete({
      where: { id: data.id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Admin ke liye saari companies
    const companies = user.id === -1
      ? await prisma.company.findMany()
      : await prisma.company.findMany({ where: { userId: user.id } });

    return NextResponse.json({ companies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
