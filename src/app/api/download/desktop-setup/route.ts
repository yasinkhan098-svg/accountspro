import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const osType = (searchParams.get('os') || 'windows').toLowerCase();

    if (osType === 'mac') {
      const macPath = path.join(process.cwd(), 'public', 'downloads', 'LedgerX-Setup.dmg');
      if (fs.existsSync(macPath)) {
        const fileBuffer = fs.readFileSync(macPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-apple-diskimage',
            'Content-Disposition': 'attachment; filename="LedgerX-Setup.dmg"',
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // If dmg file not yet generated locally, return friendly download payload
      return new NextResponse(
        JSON.stringify({
          platform: 'macOS (Apple Silicon & Intel)',
          message: 'LedgerX macOS Package (.dmg) is ready for download.',
          downloadMirror: 'https://github.com/yasinkhan098-svg/accountspro/releases/latest/download/LedgerX-Setup.dmg',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Windows (.exe)
    const filePath = path.join(process.cwd(), 'public', 'downloads', 'LedgerX-Setup.exe');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Installer file not found on server' }, { status: 404 });
    }

    // Detect originating Server URL (Vercel, custom domain, or localhost)
    const explicitServerUrl = searchParams.get('serverUrl');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const resolvedServerUrl = explicitServerUrl || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:3000');

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Disposition': 'attachment; filename="LedgerX-Setup.exe"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Download route error:', error);
    return NextResponse.json({ error: 'Internal server error while serving file' }, { status: 500 });
  }
}
