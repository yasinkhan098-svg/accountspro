import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalizeLedger = (l: any) => ({
  ...l,
  openingBalance: l.openingBal ?? 0,
  balanceType: l.balanceType || 'Dr',
  pan: l.panItNo || '',
  bankHolderName: l.bankHolderName || '',
  setAlterGstDetails: l.setAlterGstDetails || 'No',
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const cid = data.companyId ? parseInt(data.companyId) : 0;

    if (!data.name || String(data.name).trim() === "") {
      return NextResponse.json({ success: false, error: "Ledger Name is required" }, { status: 400 });
    }

    // Case-insensitive duplicate check
    const existingLedgers = await prisma.ledger.findMany({
      where: { companyId: cid }
    });
    const nameLower = data.name.trim().toLowerCase();
    const isDuplicate = existingLedgers.some(l => l.name.trim().toLowerCase() === nameLower);
    if (isDuplicate) {
      return NextResponse.json({ success: false, error: `Ledger "${data.name}" already exists!` }, { status: 400 });
    }

    const ledger = await prisma.ledger.create({
      data: {
        name: data.name,
        groupName: data.groupName || 'Primary',
        alias: data.alias,
        mailingName: data.mailingName,
        address: data.address,
        state: data.state,
        pinCode: data.pinCode,
        panItNo: data.pan,
        gstin: data.gstin,
        country: data.country,
        phone: data.phone,
        email: data.email,
        registrationType: data.registrationType,
        bankName: data.bankName,
        accountNo: data.accountNo,
        ifsc: data.ifsc,
        companyId: data.companyId,
        bankHolderName: data.bankHolderName,
        setAlterGstDetails: data.setAlterGstDetails || 'No',
        openingBal: data.openingBalance || 0.0,
        balanceType: data.balanceType || 'Dr'
      }
    });

    return NextResponse.json({ success: true, ledger: normalizeLedger(ledger) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
   try {
     const data = await req.json();
     if (!data.id) throw new Error("Ledger ID is required for update.");
 
     if (data.name !== undefined && String(data.name).trim() === "") {
       return NextResponse.json({ success: false, error: "Ledger Name cannot be empty" }, { status: 400 });
     }

     // Case-insensitive duplicate check on rename
     if (data.name !== undefined) {
       const existingLedger = await prisma.ledger.findUnique({ where: { id: parseInt(data.id) } });
       if (existingLedger) {
         const cid = existingLedger.companyId;
         const existingLedgers = await prisma.ledger.findMany({
           where: { companyId: cid }
         });
         const nameLower = data.name.trim().toLowerCase();
         const isDuplicate = existingLedgers.some(l => 
           l.id !== parseInt(data.id) && 
           l.name.trim().toLowerCase() === nameLower
         );
         if (isDuplicate) {
           return NextResponse.json({ success: false, error: `Ledger "${data.name}" already exists!` }, { status: 400 });
         }
       }
     }

     const ledger = await prisma.ledger.update({
       where: { id: parseInt(data.id) },
       data: {
         name: data.name,
         groupName: data.groupName || 'Primary',
         alias: data.alias,
         mailingName: data.mailingName,
         address: data.address,
         state: data.state,
         pinCode: data.pinCode,
         panItNo: data.pan,
         gstin: data.gstin,
         country: data.country,
         phone: data.phone,
         email: data.email,
         registrationType: data.registrationType,
         bankName: data.bankName,
         accountNo: data.accountNo,
         ifsc: data.ifsc,
         bankHolderName: data.bankHolderName,
         setAlterGstDetails: data.setAlterGstDetails || 'No',
         openingBal: data.openingBalance || 0.0,
         balanceType: data.balanceType || 'Dr'
       }
     });
 
     return NextResponse.json({ success: true, ledger: normalizeLedger(ledger) });
   } catch (error: any) {
     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
   }
 }
 
 export async function DELETE(req: Request) {
   try {
     const data = await req.json();
     if (!data.id) throw new Error("Ledger ID is required for deletion.");
 
     await prisma.ledger.delete({
       where: { id: parseInt(data.id) }
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
    const rawLedgers = await prisma.ledger.findMany({
      where: companyId ? { companyId: parseInt(companyId) } : undefined
    });
    // Normalize DB field names to frontend interface field names
    const ledgers = rawLedgers.map((l: any) => ({
      ...l,
      openingBalance: l.openingBal ?? 0,
      balanceType: l.balanceType || 'Dr',
      pan: l.panItNo || '',
    }));
    return NextResponse.json({ success: true, ledgers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
