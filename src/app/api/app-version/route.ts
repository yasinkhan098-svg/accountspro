import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // On Vercel, VERCEL_GIT_COMMIT_SHA changes on every push/deployment.
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.npm_package_version ||
    'v2026.10.07';

  return NextResponse.json(
    {
      version,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
