import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const ledger = await prisma.ledger.create({
      data: {
        name: data.name,
        groupName: data.groupName || 'Primary',
        alias: data.alias,
        mailingName: data.mailingName,
        address: data.address,
        state: data.state,
        pinCode: data.pinCode,
        panItNo: data.panItNo,
        gstin: data.gstin,
        companyId: data.companyId,
        openingBal: 0.0,
        balanceType: 'Dr'
      }
    });

    return NextResponse.json({ success: true, ledger });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
   try {
     const data = await req.json();
     if (!data.id) throw new Error("Ledger ID is required for update.");
 
     const ledger = await prisma.ledger.update({
       where: { id: data.id },
       data: {
         name: data.name,
         groupName: data.groupName || 'Primary',
         alias: data.alias,
         mailingName: data.mailingName,
         address: data.address,
         state: data.state,
         pinCode: data.pinCode,
         panItNo: data.panItNo,
         gstin: data.gstin,
       }
     });
 
     return NextResponse.json({ success: true, ledger });
   } catch (error: any) {
     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
   }
 }
 
 export async function DELETE(req: Request) {
   try {
     const data = await req.json();
     if (!data.id) throw new Error("Ledger ID is required for deletion.");
 
     await prisma.ledger.delete({
       where: { id: data.id }
     });
 
     return NextResponse.json({ success: true });
   } catch (error: any) {
     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
   }
 }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const ledgers = await prisma.ledger.findMany({
      where: companyId ? { companyId: parseInt(companyId) } : undefined
    });
    return NextResponse.json({ success: true, ledgers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
