import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'ledgerx-tawny.vercel.app';
    const fullUrl = `${proto}://${host}`;

    return NextResponse.json({
      isHostRunning: true,
      hostName: 'LedgerX Cloud Gateway',
      localIps: [host],
      port: proto === 'https' ? 443 : 80,
      dataDir: 'Cloud Storage & Database',
      lanUrl: fullUrl,
    });
  } catch (err: any) {
    return NextResponse.json({
      isHostRunning: true,
      hostName: 'LedgerX Cloud',
      localIps: ['127.0.0.1'],
      port: 443,
      dataDir: 'Cloud Storage',
      lanUrl: 'https://ledgerx-tawny.vercel.app',
    });
  }
}

