import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Tally Group Mappings for P&L
const SALES_GROUPS       = ['Sales Accounts', 'Direct Incomes', 'Income (Direct)'];
const PURCHASE_GROUPS    = ['Purchase Accounts'];
const DIRECT_EXP_GROUPS  = ['Direct Expenses', 'Expenses (Direct)'];
const CLOSING_STOCK_GROUPS = ['Stock-in-hand'];
const INDIRECT_EXP_GROUPS = ['Indirect Expenses', 'Expenses (Indirect)'];
const INDIRECT_INC_GROUPS = ['Indirect Incomes', 'Income (Indirect)'];

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
    const fromDate  = searchParams.get('fromDate');
    const toDate    = searchParams.get('toDate');

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
    const parsedFrom = parseReportDate(fromDate, false);
    const parsedTo   = parseReportDate(toDate, true);

    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId: cid,
        ...(parsedFrom || parsedTo ? {
          date: {
            ...(parsedFrom ? { gte: parsedFrom } : {}),
            ...(parsedTo ? { lte: parsedTo } : {})
          }
        } : {}),
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

    // Build ledger balance for P&L (income group = Cr normal, expense group = Dr normal)
    const buildExpenseSection = (groups: string[]) => {
      return ledgers
        .filter((l) => groups.includes(l.groupName))
        .map((l) => {
          const { balance, type } = getLedgerBalance(l, vouchers);
          // Expenses: Dr balance = positive amount
          const amt = type === 'Dr' ? balance : -balance;
          return { name: l.name, amount: amt, group: l.groupName };
        })
        .filter((i) => Math.abs(i.amount) > 0.001);
    };

    const buildIncomeSection = (groups: string[]) => {
      return ledgers
        .filter((l) => groups.includes(l.groupName))
        .map((l) => {
          const { balance, type } = getLedgerBalance(l, vouchers);
          // Income: Cr balance = positive amount
          const amt = type === 'Cr' ? balance : -balance;
          return { name: l.name, amount: amt, group: l.groupName };
        })
        .filter((i) => Math.abs(i.amount) > 0.001);
    };

    // Opening stock: Stock-in-hand ledgers' opening balance (start of year)
    const stockLedgers = ledgers.filter((l) => CLOSING_STOCK_GROUPS.includes(l.groupName));

    const openingStockTotal = stockLedgers.reduce((s, l) => {
      const ob = l.openingBal ?? 0;
      return s + (l.balanceType === 'Dr' ? ob : -ob);
    }, 0);

    // Closing stock = current balance of stock ledgers
    const closingStockItems = stockLedgers.map((l) => {
      const { balance, type } = getLedgerBalance(l, vouchers);
      const amt = type === 'Dr' ? balance : -balance;
      return { name: l.name, amount: amt };
    });
    const closingStockTotal = closingStockItems.reduce((s, i) => s + i.amount, 0);

    // Trading Account
    const salesItems      = buildIncomeSection(SALES_GROUPS);
    const purchaseItems   = buildExpenseSection(PURCHASE_GROUPS);
    const directExpItems  = buildExpenseSection(DIRECT_EXP_GROUPS);

    const salesTotal      = salesItems.reduce((s, i) => s + i.amount, 0);
    const purchaseTotal   = purchaseItems.reduce((s, i) => s + i.amount, 0);
    const directExpTotal  = directExpItems.reduce((s, i) => s + i.amount, 0);

    const tradingDebitTotal  = openingStockTotal + purchaseTotal + directExpTotal;
    const tradingCreditTotal = salesTotal + closingStockTotal;
    const grossProfit = tradingCreditTotal - tradingDebitTotal; // positive = profit

    // P&L Account
    const indirectExpItems = buildExpenseSection(INDIRECT_EXP_GROUPS);
    const indirectIncItems = buildIncomeSection(INDIRECT_INC_GROUPS);

    const indirectExpTotal = indirectExpItems.reduce((s, i) => s + i.amount, 0);
    const indirectIncTotal = indirectIncItems.reduce((s, i) => s + i.amount, 0);

    const netProfit = grossProfit + indirectIncTotal - indirectExpTotal;

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
        fromDate: fromDate || (company.financialYearStart ? new Date(company.financialYearStart).toISOString().split('T')[0] : ''),
        toDate: toDate || new Date().toISOString().split('T')[0],
        trading: {
          debit: {
            openingStock: openingStockTotal,
            purchases: { items: purchaseItems, total: purchaseTotal },
            directExpenses: { items: directExpItems, total: directExpTotal },
            grossProfit: grossProfit > 0 ? grossProfit : 0,
            total: openingStockTotal + purchaseTotal + directExpTotal + (grossProfit > 0 ? grossProfit : 0),
          },
          credit: {
            sales: { items: salesItems, total: salesTotal },
            closingStock: closingStockTotal,
            grossLoss: grossProfit < 0 ? Math.abs(grossProfit) : 0,
            total: salesTotal + closingStockTotal + (grossProfit < 0 ? Math.abs(grossProfit) : 0),
          },
          grossProfit,
        },
        profitLoss: {
          debit: {
            indirectExpenses: { items: indirectExpItems, total: indirectExpTotal },
            netProfit: netProfit > 0 ? netProfit : 0,
            total: indirectExpTotal + (netProfit > 0 ? netProfit : 0),
          },
          credit: {
            grossProfit: grossProfit > 0 ? grossProfit : 0,
            indirectIncomes: { items: indirectIncItems, total: indirectIncTotal },
            netLoss: netProfit < 0 ? Math.abs(netProfit) : 0,
            total: (grossProfit > 0 ? grossProfit : 0) + indirectIncTotal + (netProfit < 0 ? Math.abs(netProfit) : 0),
          },
          netProfit,
        },
      },
    });
  } catch (err: any) {
    console.error('P&L Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

