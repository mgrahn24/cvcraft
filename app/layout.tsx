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
