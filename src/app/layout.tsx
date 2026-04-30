import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LedgerX ERP - Accounts Management',
  description: 'Enterprise level accounting software with keyboard first navigation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
