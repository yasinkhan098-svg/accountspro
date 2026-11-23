import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ISO2_TO_COUNTRY: Record<string, string> = {
  IN: 'India',
  JP: 'Japan',
  US: 'USA',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  DE: 'Germany',
  FR: 'France',
  AU: 'Australia',
  CA: 'Canada',
  SG: 'Singapore',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  MY: 'Malaysia',
  BD: 'Bangladesh',
  NP: 'Nepal',
  LK: 'Sri Lanka',
  PK: 'Pakistan',
  ID: 'Indonesia',
  TH: 'Thailand',
  KW: 'Kuwait',
  QA: 'Qatar',
  BH: 'Bahrain',
  OM: 'Oman',
  NG: 'Nigeria',
  KE: 'Kenya',
  ET: 'Ethiopia',
  MX: 'Mexico',
  BR: 'Brazil',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  CH: 'Switzerland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  KR: 'South Korea',
  PH: 'Philippines',
  VN: 'Vietnam',
  EG: 'Egypt',
  TR: 'Turkey',
  RU: 'Russia',
  CN: 'China',
};

export async function GET(req: Request) {
  try {
    const headers = req.headers;
    const cfCountry = headers.get('cf-ipcountry');
    const vercelCountry = headers.get('x-vercel-ip-country');
    const customCountry = headers.get('x-country-code');

    let countryCode = (cfCountry || vercelCountry || customCountry || '').trim().toUpperCase();

    // If server header detected a valid 2-letter country code
    if (countryCode && ISO2_TO_COUNTRY[countryCode]) {
      return NextResponse.json({
        country: ISO2_TO_COUNTRY[countryCode],
        countryCode,
        source: 'header',
      });
    }

    // Try client IP fallback using lightweight free geo IP lookup (1.5s timeout)
    const clientIp = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';

    if (clientIp && !clientIp.startsWith('127.') && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const geoRes = await fetch(`https://api.country.is/${clientIp}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timeout);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData?.country && ISO2_TO_COUNTRY[geoData.country.toUpperCase()]) {
            return NextResponse.json({
              country: ISO2_TO_COUNTRY[geoData.country.toUpperCase()],
              countryCode: geoData.country.toUpperCase(),
              source: 'ip_lookup',
            });
          }
        }
      } catch (_) {}
    }

    return NextResponse.json({
      country: 'India',
      countryCode: 'IN',
      source: 'default',
    });
  } catch (err: any) {
    return NextResponse.json({
      country: 'India',
      countryCode: 'IN',
      source: 'error_fallback',
    });
  }
}
