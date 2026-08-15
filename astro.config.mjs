// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date(),
    })
  ],
  vite: {
    plugins: [tailwindcss()],
    // Enable source maps for debugging
    build: {
      sourcemap: true,
    },
    // Optimize for performance
    ssr: {
      noExternal: ['uuid', 'js-yaml', 'papaparse', 'jose']
    }
  },
  // SEO and Performance optimizations
  site: 'https://devtoolbox.dev', // Replace with actual domain
  // Content Security Policy (PRD NFR 5.1). Astro emits a <meta> CSP tag on every
  // built page with auto-computed sha256 hashes for all bundled scripts and
  // styles, so no inline script or style is ever allowed unhashed.
  // Not applied in dev mode (build/preview only). Set frame-ancestors /
  // X-Frame-Options on the hosting platform — `frame-ancestors` is ignored in
  // meta CSPs.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "worker-src 'self' blob:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      // Theme bootstrap in <head> (BaseLayout.astro) is an `is:inline` script —
      // Astro does not hash it, so pin its hash here. Recompute if that script
      // changes: sha256 of the exact script body.
      scriptDirective: {
        hashes: ['sha256-j0iCfqWVpTvpHe0FYcNNXubToEMIPFd537hwo88NlZg='],
      },
    },
  },
  // Security headers for `astro dev` / `astro preview` (CSP is delivered via
  // Astro's built-in security.csp meta tag in built pages instead)
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    }
  },
  // Configure for static site generation
  output: 'static',
  // Optimize images
  image: {
    // Disable remote images for security
    domains: [],
    remotePatterns: []
  }
});