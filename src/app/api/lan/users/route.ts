import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Server-side in-memory cache for cloud environments (like Vercel serverless)
const cloudUsersCache = new Map<string, any[]>();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '10000').toUpperCase().trim();

    // 1. Try reading from filesystem if available
    try {
      const localAppDir = process.env.LOCALAPPDATA 
        ? path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data', code, 'users.json')
        : null;
      const cwdDir = path.join(process.cwd(), 'data', code, 'users.json');

      if (localAppDir && fs.existsSync(localAppDir)) {
        const data = fs.readFileSync(localAppDir, 'utf-8');
        const parsed = JSON.parse(data);
        return NextResponse.json({ success: true, companyCode: code, users: parsed });
      }
      if (fs.existsSync(cwdDir)) {
        const data = fs.readFileSync(cwdDir, 'utf-8');
        const parsed = JSON.parse(data);
        return NextResponse.json({ success: true, companyCode: code, users: parsed });
      }
    } catch (fsErr) {
      // Non-blocking in serverless environments
    }

    // 2. Check cloud memory cache
    if (cloudUsersCache.has(code)) {
      return NextResponse.json({ success: true, companyCode: code, users: cloudUsersCache.get(code) });
    }

    // 3. Return empty or default
    return NextResponse.json({ success: true, companyCode: code, users: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = (body.companyCode || '10000').toUpperCase().trim();
    const users = Array.isArray(body.users) ? body.users : [];

    // Store in cloud memory cache
    cloudUsersCache.set(code, users);

    // Try saving to filesystem if writable
    try {
      const targetDirs = [
        path.join(process.cwd(), 'data', code),
      ];
      if (process.env.LOCALAPPDATA) {
        targetDirs.push(path.join(process.env.LOCALAPPDATA, 'LedgerX', 'data', code));
      }

      for (const d of targetDirs) {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
        const file = path.join(d, 'users.json');
        fs.writeFileSync(file, JSON.stringify(users, null, 2), 'utf-8');
      }
    } catch (fsErr) {
      // Serverless read-only filesystem fallback
    }

    return NextResponse.json({ success: true, companyCode: code, count: users.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

