import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

function extractTrailingNumber(str: string, prefix: string): number {
  if (!str) return 0;
  let clean = String(str).trim();
  if (clean.toUpperCase().startsWith('POS-')) {
    clean = clean.substring(4).trim();
  }
  if (prefix && clean.toUpperCase().startsWith(prefix.toUpperCase())) {
    clean = clean.substring(prefix.length).replace(/^[-_]/, '');
  } else if (clean.toUpperCase().startsWith('CASH')) {
    clean = clean.substring(4).replace(/^[-_]/, '');
  } else if (clean.toUpperCase().startsWith('TRN')) {
    clean = clean.substring(3).replace(/^[-_]/, '');
  }
  const match = clean.match(/\d+$/) || clean.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = (body.companyCode || body.code || '10000').toUpperCase().trim();
    const voucher = body.voucher || body;
    let customPrefix = body.prefix || '';
    if (!customPrefix && voucher?.voucherNo) {
      const m = String(voucher.voucherNo).match(/^[^\d]+/);
      if (m) customPrefix = m[0];
    }
    const defaultPrefix = customPrefix || (code === 'TRAINING' ? 'TRN-' : 'CASH');

    // 1. Try authoritative LedgerX Host Service on port 45454
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const hostRes = await fetch('http://127.0.0.1:45454/api/pos/commit-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: code,
          voucher,
          inventoryEntries: body.inventoryEntries || voucher.inventoryEntries || [],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (hostRes.ok) {
        const json = await hostRes.json().catch(() => null);
        if (json && json.success) {
          return NextResponse.json(json);
        }
      }
    } catch {
      // Host unreachable; fallback to local filesystem atomic commit
    }

    // 2. Direct filesystem atomic fallback
    const possibleDirs = [
      path.join(process.env.LOCALAPPDATA || 'C:\\Users\\yasin\\AppData\\Local', 'LedgerX', 'data', code),
      path.join(process.cwd(), 'data', code),
    ];

    let targetDir = possibleDirs[0];
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        targetDir = dir;
        break;
      }
    }
    if (!fs.existsSync(targetDir)) {
      try { fs.mkdirSync(targetDir, { recursive: true }); } catch {}
    }

    const vFile = path.join(targetDir, 'vouchers.json');
    let list: any[] = [];
    const existingBillNos = new Set<string>();
    const existingIds = new Set<string>();
    let maxSeq = 0;

    if (fs.existsSync(vFile)) {
      try {
        const raw = fs.readFileSync(vFile, 'utf8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const itemId = String(item.id || '');
              if (itemId && existingIds.has(itemId)) {
                // Deduplicate stale identical items on disk
                continue;
              }
              if (itemId) existingIds.add(itemId);

              const vNo = String(item.voucherNo || item.voucherNumber || item.refNo || '').trim();
              if (vNo) {
                existingBillNos.add(vNo.toUpperCase());
                if (vNo.toUpperCase().startsWith('POS-')) {
                  existingBillNos.add(vNo.substring(4).toUpperCase());
                }
                const seq = extractTrailingNumber(vNo, defaultPrefix);
                if (seq > maxSeq) maxSeq = seq;
              }
              list.push(item);
            }
          }
        }
      } catch {}
    }

    // Ensure unique voucher ID
    let vId = voucher.id ? String(voucher.id) : '';
    if (!vId || existingIds.has(vId)) {
      vId = String(Date.now());
      voucher.id = Number(vId) || vId;
    }

    // Ensure collision-proof sequential bill number
    let reqBillNo = String(voucher.voucherNo || '').trim();
    if (!reqBillNo || existingBillNos.has(reqBillNo.toUpperCase())) {
      const nextSeq = maxSeq + 1;
      reqBillNo = `${defaultPrefix}${String(nextSeq).padStart(4, '0')}`;
      maxSeq = nextSeq;
    } else {
      const seq = extractTrailingNumber(reqBillNo, defaultPrefix);
      if (seq > maxSeq) maxSeq = seq;
    }

    voucher.voucherNo = reqBillNo;
    voucher.refNo = `POS-${reqBillNo}`;
    voucher.number = list.length + 1;
    voucher.isPOS = true;
    voucher.companyCode = code;

    list.push(voucher);

    // Save atomically via temp file
    const tmpFile = `${vFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(list, null, 2), 'utf8');
    if (fs.existsSync(vFile)) fs.unlinkSync(vFile);
    fs.renameSync(tmpFile, vFile);

    return NextResponse.json({
      success: true,
      finalBillNo: reqBillNo,
      companyCode: code,
      voucher,
      totalVouchers: list.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to commit POS sale' }, { status: 500 });
  }
}
