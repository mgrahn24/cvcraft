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

        {/* DaisyUI — component styles + data-theme color variables (for canvas) */}
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css"
          rel="stylesheet"
          type="text/css"
        />
      </head>
      <body>
        {children}

        {/* Gradient @property fix for Tailwind v4 + Tailwind CDN coexistence */}
        <Script
          id="gradient-property-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=document.createElement('style');s.textContent='@property --tw-gradient-from{syntax:"*";inherits:false;initial-value:#0000}@property --tw-gradient-to{syntax:"*";inherits:false;initial-value:#0000}@property --tw-gradient-via{syntax:"*";inherits:false;initial-value:#0000}';document.head.appendChild(s);})();`,
          }}
        />

        {/* Tailwind CDN config — maps DaisyUI color names to CSS vars */}
        <Script
          id="tailwind-cdn-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `tailwind={config:{theme:{extend:{colors:{
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
              'info':'oklch(var(--in) / <alpha-value>)',
              'info-content':'oklch(var(--inc) / <alpha-value>)',
              'success':'oklch(var(--su) / <alpha-value>)',
              'success-content':'oklch(var(--suc) / <alpha-value>)',
              'warning':'oklch(var(--wa) / <alpha-value>)',
              'warning-content':'oklch(var(--wac) / <alpha-value>)',
              'error':'oklch(var(--er) / <alpha-value>)',
              'error-content':'oklch(var(--erc) / <alpha-value>)',
            }}}}};`,
          }}
        />

        {/* Tailwind Play CDN — processes canvas classes dynamically */}
        <Script
          id="tailwind-cdn"
          src="https://cdn.tailwindcss.com"
          strategy="afterInteractive"
        />

        {/* Alpine.js — powers canvas x-data directives */}
        <Script
          id="alpine-cdn"
          src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
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
