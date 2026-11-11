import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'LedgerX ERP - Accounts Management',
  description: 'Enterprise level accounting software with keyboard first navigation',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script src="/vendor/exceljs.min.js" defer></script>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                var isClient = window.location.search.indexOf('lan_client=1') !== -1 ||
                               window.location.search.indexOf('client_mode=1') !== -1 ||
                               window.location.search.indexOf('online_client=1') !== -1 ||
                               (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname.indexOf('vercel.app') === -1 && window.location.hostname.indexOf('ledgerxerp.com') === -1);
                
                if (isClient) {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
                    }).catch(function() {});
                  }
                  if ('caches' in window) {
                    caches.keys().then(function(keys) {
                      for (var i = 0; i < keys.length; i++) { caches.delete(keys[i]); }
                    }).catch(function() {});
                  }
                } else if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                      .then(function(reg) {
                        if (reg) reg.update();
                      })
                      .catch(function() {});
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
