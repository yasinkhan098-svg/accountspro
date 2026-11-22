import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

function extractTrailingNumber(str: string, prefix: string): number {
  if (!str) return 0;
  let clean = String(str).trim();
  if (clean.toUpperCase().startsWith('POS-')) {
    clean = clean.substring(4).trim();
  }
  const prefixUpper = (prefix || '').trim().toUpperCase();
  const cleanUpper = clean.toUpperCase();
  if (prefixUpper && cleanUpper.startsWith(prefixUpper)) {
    clean = clean.substring(prefixUpper.length).replace(/^[-_]/, '');
  } else if (cleanUpper.startsWith('CASH')) {
    clean = clean.substring(4).replace(/^[-_]/, '');
  } else if (cleanUpper.startsWith('TRN')) {
    clean = clean.substring(3).replace(/^[-_]/, '');
  } else {
    // Non-POS vouchers (e.g. F8 sales numeric invoices) must never match POS sequence
    return 0;
  }
  const match = clean.match(/\d+$/) || clean.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('companyCode') || searchParams.get('code') || '10000').toUpperCase().trim();
    const defaultPrefix = code === 'TRAINING' ? 'TRN-' : 'CASH';
    const prefix = searchParams.get('prefix') || defaultPrefix;

    // 1. Try authoritative LedgerX Host Service on port 45454
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const hostRes = await fetch(
        `http://127.0.0.1:45454/api/pos/next-bill-no?code=${encodeURIComponent(code)}&prefix=${encodeURIComponent(prefix)}`,
        { signal: controller.signal, cache: 'no-store' }
      );
      clearTimeout(timeoutId);

      if (hostRes.ok) {
        const json = await hostRes.json().catch(() => null);
        if (json && json.success && json.nextBillNo) {
          return NextResponse.json(json);
        }
      }
    } catch {
      // Host unreachable; gracefully continue to local filesystem fallback
    }

    // 2. Fallback: inspect local disk vouchers.json
    const possibleDirs = [
      path.join(process.env.LOCALAPPDATA || 'C:\\Users\\yasin\\AppData\\Local', 'LedgerX', 'data', code),
      path.join(process.cwd(), 'data', code),
    ];

    let maxSeq = 0;
    for (const dir of possibleDirs) {
      const vFile = path.join(dir, 'vouchers.json');
      if (fs.existsSync(vFile)) {
        try {
          const raw = fs.readFileSync(vFile, 'utf8');
          if (raw.trim()) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              for (const v of list) {
                const isPOS = v?.isPOS ||
                  String(v?.refNo || '').toUpperCase().startsWith('POS-') ||
                  (prefix && String(v?.voucherNo || '').toUpperCase().startsWith(prefix.toUpperCase())) ||
                  String(v?.voucherNo || '').toUpperCase().startsWith('CASH') ||
                  String(v?.narration || '').includes('Retail POS');
                if (!isPOS) continue;
                const vNo = v.voucherNo || v.voucherNumber || v.refNo || '';
                const seq = extractTrailingNumber(vNo, prefix);
                if (seq > maxSeq) maxSeq = seq;
              }
            }
          }
        } catch {}
        break;
      }
    }

    const nextSeq = maxSeq + 1;
    const nextBillNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    return NextResponse.json({
      success: true,
      companyCode: code,
      prefix,
      sequence: nextSeq,
      nextBillNo,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to allocate bill number' }, { status: 500 });
  }
}
