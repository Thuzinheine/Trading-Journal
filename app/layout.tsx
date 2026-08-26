import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'iTrading Journal',
  description: 'A professional Trading Journal and Notes dashboard integrated with Google Sheets and Google Docs.',
  openGraph: {
    title: 'iTrading Journal',
    description: 'A professional Trading Journal and Notes dashboard integrated with Google Sheets and Google Docs.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iTrading Journal',
    description: 'A professional Trading Journal and Notes dashboard integrated with Google Sheets and Google Docs.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-slate-900 text-slate-100 antialiased selection:bg-teal-500 selection:text-white min-h-screen font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var target = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
                  if (target) {
                    var ownDesc = Object.getOwnPropertyDescriptor(target, 'fetch');
                    var protoDesc = !ownDesc && Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), 'fetch');
                    var desc = ownDesc || protoDesc;
                    if (desc) {
                      var isConfigurable = ownDesc ? (ownDesc.configurable !== false) : true;
                      if (isConfigurable && (!desc.set || !desc.writable)) {
                        var originalFetch = target.fetch;
                        var customFetch = originalFetch;
                        Object.defineProperty(target, 'fetch', {
                          get: function() { return customFetch; },
                          set: function(val) { customFetch = val; },
                          configurable: true,
                          enumerable: true
                        });
                      }
                    }
                  }
                } catch (e) {
                  console.warn('Sandbox fetch setter polyfill error:', e);
                }
              })();
            `
          }}
        />
        {children}
      </body>
    </html>
  );
}
