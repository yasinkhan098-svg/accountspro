import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const osType = (searchParams.get('os') || 'windows').toLowerCase();
    const clientType = (searchParams.get('type') || searchParams.get('client') || 'host').toLowerCase();
    const format = (searchParams.get('format') || '').toLowerCase();

    const isMac = osType === 'mac' || osType === 'macos' || osType === 'darwin' || osType.includes('apple');
    const wantsZip = format === 'zip' || osType.includes('zip');

    let targetFilename = '';
    if (clientType === 'client' || clientType === 'lan' || clientType === 'lan-client') {
      if (isMac) {
        targetFilename = wantsZip ? 'LedgerX-Client-macOS.zip' : 'LedgerX-Client-Setup.dmg';
      } else {
        targetFilename = 'LedgerX-Client-Setup.exe';
      }
    } else if (clientType === 'online-client' || clientType === 'online' || clientType === 'cloud') {
      if (isMac) {
        targetFilename = wantsZip ? 'LedgerX-Online-Client-macOS.zip' : 'LedgerX-Online-Client.dmg';
      } else {
        targetFilename = 'LedgerX-Online-Client.exe';
      }
    } else {
      if (isMac) {
        targetFilename = wantsZip ? 'LedgerX-macOS.zip' : 'LedgerX-Setup.dmg';
      } else {
        targetFilename = 'LedgerX-Setup.exe';
      }
    }

    const filePath = path.join(process.cwd(), 'public', 'downloads', targetFilename);

    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      let contentType = 'application/octet-stream';
      if (targetFilename.endsWith('.dmg')) {
        contentType = 'application/x-apple-diskimage';
      } else if (targetFilename.endsWith('.zip')) {
        contentType = 'application/zip';
      } else if (targetFilename.endsWith('.exe')) {
        contentType = 'application/vnd.microsoft.portable-executable';
      }

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${targetFilename}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Fallback redirect to GitHub release mirror
    const mirrorUrl = `https://github.com/yasinkhan098-svg/accountspro/releases/latest/download/${targetFilename}`;
    return NextResponse.redirect(mirrorUrl, 302);
  } catch (error: any) {
    console.error('Download route error:', error);
    return NextResponse.json({ error: 'Internal server error while serving file' }, { status: 500 });
  }
}
