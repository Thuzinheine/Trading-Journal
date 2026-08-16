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
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
