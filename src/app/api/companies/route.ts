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
        user: { connect: { id: user.id } },
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
        securityControl: data.securityControl || false,
        password: data.password || null
      }
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

    // Verify company belongs to user
    const existingCompany = await prisma.company.findFirst({ where: { id: data.id, userId: user.id } });
    if (!existingCompany) return NextResponse.json({ error: "Company not found or unauthorized" }, { status: 404 });

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

    // Verify company belongs to user
    const existingCompany = await prisma.company.findFirst({ where: { id: data.id, userId: user.id } });
    if (!existingCompany) return NextResponse.json({ error: "Company not found or unauthorized" }, { status: 404 });

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

    const companies = await prisma.company.findMany({
      where: { userId: user.id }
    });
    return NextResponse.json({ companies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
