import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'CVCraft',
  description: 'AI-powered CV generator for consultancies',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=DM+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Nunito:wght@400;600;700&family=Outfit:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Montserrat:wght@400;600;700&family=Oswald:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Raleway:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Merriweather:wght@400;700&family=Lora:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&family=Space+Mono:wght@400;700&family=Pacifico&display=swap"
          rel="stylesheet"
        />

      </head>
      <body>
        {children}

        {/* Tailwind Play CDN — config must run before the CDN script reads window.tailwind.
            Scoped to #cv-canvas-root so it never touches app UI. Preflight disabled
            because the app has its own Tailwind v4 base reset. */}
        <Script
          id="tailwind-cdn-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.tailwind={config:{important:'#cv-canvas-root',corePlugins:{preflight:false},theme:{extend:{colors:{
              'base-100':'oklch(var(--b1) / <alpha-value>)',
              'base-200':'oklch(var(--b2) / <alpha-value>)',
              'base-300':'oklch(var(--b3) / <alpha-value>)',
              'base-content':'oklch(var(--bc) / <alpha-value>)',
              'primary':'oklch(var(--p) / <alpha-value>)',
              'primary-content':'oklch(var(--pc) / <alpha-value>)',
              'secondary':'oklch(var(--s) / <alpha-value>)',
              'secondary-content':'oklch(var(--sc) / <alpha-value>)',
              'accent':'oklch(var(--a) / <alpha-value>)',
              'accent-content':'oklch(var(--ac) / <alpha-value>)',
              'neutral':'oklch(var(--n) / <alpha-value>)',
              'neutral-content':'oklch(var(--nc) / <alpha-value>)',
            }}}}}`,
          }}
        />
        <Script
          id="tailwind-cdn"
          src="https://cdn.tailwindcss.com"
          strategy="afterInteractive"
        />

        {/* Lucide icons — replaces <i data-lucide=""> with SVGs */}
        <Script
          id="lucide-cdn"
          src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
