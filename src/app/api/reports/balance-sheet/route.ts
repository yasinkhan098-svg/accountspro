import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Tally Group → Balance Sheet Section Mapping
const CAPITAL_GROUPS = ['Capital Account', 'Reserves & Surplus', 'Retained Earnings'];
const SECURED_LOAN_GROUPS = ['Secured Loans', 'Bank OD A/c', 'Bank OCC A/c'];
const UNSECURED_LOAN_GROUPS = ['Unsecured Loans'];
const CURRENT_LIABILITY_GROUPS = ['Sundry Creditors', 'Current Liabilities', 'Provisions', 'Duties & Taxes'];
const FIXED_ASSET_GROUPS = ['Fixed Assets'];
const INVESTMENT_GROUPS = ['Investments', 'Deposits (Asset)', 'Misc. Expenses (ASSET)'];
const CURRENT_ASSET_GROUPS = [
  'Stock-in-hand', 'Sundry Debtors', 'Cash-in-hand',
  'Bank Accounts', 'Loans & Advances (Asset)', 'Current Assets'
];

function parseReportDate(d: string | null | undefined, endOfDay = false): Date | null {
  if (!d) return null;
  const s = String(d).trim();
  if (!s) return null;
  const months: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };
  const parts = s.replace(/[\.\/]/g, '-').split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parseInt(parts[0]);
      const m = (parseInt(parts[1]) || 1) - 1;
      const day = parseInt(parts[2]) || 1;
      return new Date(y, m, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    } else {
      const day = parseInt(parts[0]) || 1;
      const mKey = parts[1].toLowerCase().slice(0, 3);
      const m = months[mKey] ?? ((parseInt(parts[1]) || 1) - 1);
      const y = parseInt(parts[2]) || new Date().getFullYear();
      return new Date(y, m, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    if (endOfDay) parsed.setHours(23, 59, 59, 999);
    else parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  return null;
}

function getLedgerBalance(ledger: any, vouchers: any[]) {
  let dr = ledger.balanceType === 'Dr' ? (ledger.openingBal ?? 0) : 0;
  let cr = ledger.balanceType === 'Cr' ? (ledger.openingBal ?? 0) : 0;
  for (const v of vouchers) {
    for (const e of v.entries) {
      if (e.ledgerId === ledger.id) {
        if (e.entryType === 'Dr') dr += e.amount;
        else cr += e.amount;
      }
    }
  }
  const net = dr - cr;
  return net >= 0 ? { balance: net, type: 'Dr' } : { balance: Math.abs(net), type: 'Cr' };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const asOnDate = searchParams.get('asOnDate');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId required' }, { status: 400 });
    }

    const cid = parseInt(companyId);
    const company = await prisma.company.findUnique({ where: { id: cid } });
    if (!company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    const ledgers = await prisma.ledger.findMany({
      where: { companyId: cid },
      select: {
        id: true,
        name: true,
        groupName: true,
        openingBal: true,
        balanceType: true,
      }
    });
    const parsedAsOn = parseReportDate(asOnDate, true);
    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId: cid,
        ...(parsedAsOn ? { date: { lte: parsedAsOn } } : {}),
      },
      select: {
        id: true,
        type: true,
        date: true,
        entries: {
          select: {
            id: true,
            ledgerId: true,
            amount: true,
            entryType: true,
          }
        }
      }
    });

    const buildSection = (groups: string[], normalSide: 'Dr' | 'Cr') => {
      return ledgers
        .filter((l) => groups.includes(l.groupName))
        .map((l) => {
          const { balance, type } = getLedgerBalance(l, vouchers);
          let amt = balance;
          if (normalSide === 'Cr' && type === 'Dr') amt = -balance;
          if (normalSide === 'Dr' && type === 'Cr') amt = -balance;
          return { name: l.name, amount: amt, group: l.groupName };
        })
        .filter((i) => Math.abs(i.amount) > 0.001);
    };

    const capitalItems        = buildSection(CAPITAL_GROUPS,           'Cr');
    const securedLoanItems    = buildSection(SECURED_LOAN_GROUPS,      'Cr');
    const unsecuredLoanItems  = buildSection(UNSECURED_LOAN_GROUPS,    'Cr');
    const currentLiabItems    = buildSection(CURRENT_LIABILITY_GROUPS, 'Cr');
    const fixedAssetItems     = buildSection(FIXED_ASSET_GROUPS,       'Dr');
    const investmentItems     = buildSection(INVESTMENT_GROUPS,        'Dr');
    const currentAssetItems   = buildSection(CURRENT_ASSET_GROUPS,     'Dr');

    const sum = (arr: any[]) => arr.reduce((s, i) => s + i.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        company: {
          name: company.name,
          mailingName: company.mailingName || company.name,
          address: company.address || '',
          state: company.state || '',
          pinCode: company.pinCode || '',
        },
        asOnDate: asOnDate || new Date().toISOString().split('T')[0],
        liabilities: {
          capitalAccount:    { items: capitalItems,     total: sum(capitalItems) },
          securedLoans:      { items: securedLoanItems,   total: sum(securedLoanItems) },
          unsecuredLoans:    { items: unsecuredLoanItems, total: sum(unsecuredLoanItems) },
          currentLiabilities:{ items: currentLiabItems,  total: sum(currentLiabItems) },
          total: sum([...capitalItems, ...securedLoanItems, ...unsecuredLoanItems, ...currentLiabItems]),
        },
        assets: {
          fixedAssets:   { items: fixedAssetItems,   total: sum(fixedAssetItems) },
          investments:   { items: investmentItems,   total: sum(investmentItems) },
          currentAssets: { items: currentAssetItems, total: sum(currentAssetItems) },
          total: sum([...fixedAssetItems, ...investmentItems, ...currentAssetItems]),
        },
      },
    });
  } catch (err: any) {
    console.error('Balance Sheet Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

