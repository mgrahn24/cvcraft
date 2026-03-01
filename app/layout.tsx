import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blitz — Page Builder',
  description: 'AI-powered visual page builder',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — pre-load all curated font families */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=DM+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Nunito:wght@400;600;700&family=Outfit:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Montserrat:wght@400;600;700&family=Oswald:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Raleway:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Merriweather:wght@400;700&family=Lora:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&family=Space+Mono:wght@400;700&family=Pacifico&display=swap"
          rel="stylesheet"
        />

        {/*
          DaisyUI CSS — provides all component styles (btn, card, navbar, hero, etc.)
          and data-theme scoped color variables.
          Load as a CSS link (not a JS plugin) — simplest and most reliable approach.
        */}
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css"
          rel="stylesheet"
          type="text/css"
        />
      </head>
      <body>
        {children}

        {/*
          Gradient @property fix — Tailwind v4 PostCSS declares
          --tw-gradient-from/to/via with syntax:"<color>", which rejects the
          Tailwind v3 CDN's color-stop values that include a position suffix
          (e.g. "oklch(...) 0%"). Those rejected values fall back to #0000
          (transparent), making all gradients appear as plain grey in the editor.
          This script appends a <style> tag AFTER the compiled CSS link so our
          @property re-declarations (with syntax:"*") win the cascade and allow
          any value, restoring gradients in the canvas.
        */}
        <Script
          id="gradient-property-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=document.createElement('style');s.textContent='@property --tw-gradient-from{syntax:"*";inherits:false;initial-value:#0000}@property --tw-gradient-to{syntax:"*";inherits:false;initial-value:#0000}@property --tw-gradient-via{syntax:"*";inherits:false;initial-value:#0000}';document.head.appendChild(s);})();`,
          }}
        />

        {/*
          Tailwind CDN config — must be defined BEFORE the CDN script loads.
          Maps DaisyUI semantic colors to their CSS variable expressions so that
          gradient utilities (from-primary, to-base-200, bg-gradient-*, etc.)
          generate correct CSS. Without this the CDN doesn't know these color
          names and either skips them or emits an empty rule that overrides
          DaisyUI's own gradient CSS (CDN <style> appears after DaisyUI <link>).
        */}
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

        {/*
          Tailwind Play CDN — processes utility classes on the full DOM,
          including dynamically injected canvas content, via MutationObserver.
          Loaded after DaisyUI CSS so both coexist without conflicts.
        */}
        <Script
          id="tailwind-cdn"
          src="https://cdn.tailwindcss.com"
          strategy="beforeInteractive"
        />

        {/*
          Alpine.js — auto-initialises x-data elements (including dynamically added ones)
          via MutationObserver. Deferred so it runs after the DOM is ready.
        */}
        <Script
          id="alpine-cdn"
          src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
          strategy="afterInteractive"
        />

        {/*
          Lucide icons — replaces <i data-lucide="icon-name"> elements with clean SVGs.
          canvasManager calls window.lucide.createIcons() after each innerHTML update.
        */}
        <Script
          id="lucide-cdn"
          src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
