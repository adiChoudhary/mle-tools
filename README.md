# DevToolbox

Privacy-first, blazing-fast developer utilities that run **100% client-side**. JSON, CSV, JWT, Base64, hashes, crypto, cron, and more — all processed locally in your browser. No data ever leaves your machine.

- **Stack:** Astro (static) · Tailwind CSS v4 · Vanilla JS · Native Web Workers · Web Crypto API
- **Privacy:** Strict CSP (auto-hashed inline scripts via Astro `security.csp`), zero external requests, no analytics, no persistence of user data
- **Performance:** Each tool lazy-loads its own JS island; heavy computation is offloaded to Web Workers; 50 MB hard input limit with graceful error UI

## Tools

| Tool | Route |
| --- | --- |
| JSON Studio (validate / format / minify / tree view / diff / escape) | `/tools/json-formatter` |
| CSV ↔ JSON ↔ YAML Converter | `/tools/data-converter` |
| JWT Inspector (decode + HMAC/RSA/ECDSA signature verify) | `/tools/jwt-decoder` |
| Base64 Encoder / Decoder | `/tools/base64-encoder` |
| URL Encoder / Decoder + MongoDB ObjectId decoder | `/tools/url-encoder` |
| Hash Generator (MD5, SHA-1, SHA-256, SHA-512) | `/tools/hash-generator` |
| Crypto Hub (AES-GCM, RSA-OAEP) | `/tools/crypto` |
| Epoch / Timestamp Converter | `/tools/timestamp-converter` |
| Crontab Evaluator (next-5 execution times) | `/tools/crontab-evaluator` |
| Data Size & Transfer Rate Converter | `/tools/data-measurement` |
| Regex Tester + Sample Data Generator | `/tools/regex-and-sample-data` |

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Dev server at `http://localhost:4321` (CSP meta is build-only; see note below) |
| `npm run build` | Static production build to `./dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the full Vitest suite (watch mode) |
| `npm run test:run` | Run the full test suite once |

> **CSP note:** Astro's `security.csp` emits the Content-Security-Policy `<meta>` tag only for built pages (dev mode is unsupported by Astro). Test security behavior with `npm run build && npm run preview`. Set `frame-ancestors` / `X-Frame-Options` on your hosting platform — `frame-ancestors` is ignored in meta CSPs.

## Architecture

```
src/
├── components/tools/      # Vanilla JS tool classes (one per tool, zero framework)
├── components/            # CommandPalette (⌘K), ThemeToggle islands
├── layouts/               # BaseLayout (SEO meta, CSP, structured data), ToolLayout
├── pages/                 # One route per tool (SEO: unique title/description/OG/JSON-LD)
├── utils/                 # crypto, jwt, cron, csv/yaml, worker-pool, memory limit, a11y, theme
├── workers/               # data-processor.ts (heavy computation), sw.ts (offline caching)
└── styles/                # global.css (Tailwind v4, class-based dark mode)
```

Key behaviors:

- **Web Workers:** inputs above the threshold are processed off the main thread (`worker-pool.ts`); a non-blocking "processing in background" state is shown for long jobs.
- **50 MB hard limit:** pasting/uploading more shows *"Data exceeds 50MB browser memory limits. Please use a local CLI tool for this operation."*
- **Theming:** system preference by default, manual toggle persisted in `localStorage` (UI preference only — tool data is never persisted). A hashed inline head bootstrap applies the theme before first paint (no FOUC).
- **Accessibility:** WCAG 2.1 AA — keyboard-navigable command palette (⌘K / Ctrl+K), skip links, ARIA labels, live regions, focus management.

## Security model

- **Zero data exfiltration:** no network requests for user data; `connect-src 'self'` enforced via CSP.
- **CSP:** `default-src 'self'`; scripts/styles only from same origin or with valid sha256 hashes (computed by Astro at build time).
- **Crypto:** native Web Crypto API (AES-GCM, RSA-OAEP, HMAC) + a dependency-free MD5/SHA implementation; client-side key management is clearly warned about in the UI.

## Deployment

Any static host (Netlify, Cloudflare Pages, GitHub Pages, S3+CDN…). Before deploying, replace the placeholder domain in:

- `astro.config.mjs` → `site: 'https://devtoolbox.dev'`
- `public/robots.txt` → sitemap URL

And set on the host: `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`).

## Testing

405 tests (Vitest + happy-dom) covering crypto primitives, JWT/cron/CSV logic, worker integration, memory limits, and accessibility utilities.
