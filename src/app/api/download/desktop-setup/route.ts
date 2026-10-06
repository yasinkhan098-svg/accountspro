import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'downloads', 'LedgerX-Setup.exe');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Installer file not found on server' }, { status: 404 });
    }

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
