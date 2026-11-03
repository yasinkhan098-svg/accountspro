import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalizeLedger = (l: any) => ({
  ...l,
  openingBalance: l.openingBal ?? 0,
  balanceType: l.balanceType || 'Dr',
  pan: l.panItNo || '',
  bankHolderName: l.bankHolderName || '',
  setAlterGstDetails: l.setAlterGstDetails || 'No',
  odLimit: l.odLimit ?? null,
});

const STANDARD_DEFAULT_LEDGERS = [
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

const STANDARD_NAMES = new Set(STANDARD_DEFAULT_LEDGERS.map(l => l.name.trim().toLowerCase()));

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
      const existingLedger = existingLedgers.find(l => l.name.trim().toLowerCase() === nameLower);
      if (data.isAutoInit || STANDARD_NAMES.has(nameLower)) {
        return NextResponse.json({ success: true, ledger: normalizeLedger(existingLedger), alreadyExisted: true });
      }
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
        balanceType: data.balanceType || 'Dr',
        odLimit: data.odLimit !== undefined && data.odLimit !== null && data.odLimit !== '' ? parseFloat(data.odLimit) : null
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
         balanceType: data.balanceType || 'Dr',
         odLimit: data.odLimit !== undefined && data.odLimit !== null && data.odLimit !== '' ? parseFloat(data.odLimit) : null
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
    const cid = companyId ? parseInt(companyId) : 0;

    let rawLedgers = await prisma.ledger.findMany({
      where: cid ? { companyId: cid } : undefined
    });

    // Auto-ensure standard ledgers exist in DB for this company once and for all!
    if (cid && rawLedgers.length > 0) {
      const existingNames = new Set(rawLedgers.map((l: any) => l.name.trim().toLowerCase()));
      const missing = STANDARD_DEFAULT_LEDGERS.filter(sl => !existingNames.has(sl.name.trim().toLowerCase()));
      if (missing.length > 0) {
        await prisma.ledger.createMany({
          data: missing.map(m => ({
            companyId: cid,
            name: m.name,
            groupName: m.groupName,
            openingBal: m.openingBal || 0,
            balanceType: m.balanceType
          }))
        });
        rawLedgers = await prisma.ledger.findMany({ where: { companyId: cid } });
      }
    }

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
