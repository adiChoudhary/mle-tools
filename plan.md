# Product Requirements Document (PRD): DevToolbox

## 1. Product Vision & Objective
**DevToolbox** is a blazing-fast, SEO-optimized, 100% client-side developer utility suite. It provides essential tools for software, data, and machine learning engineers to format, decode, convert, and analyze data securely.

The core value proposition is **privacy and performance**: all data processing occurs locally in the user's browser, ensuring sensitive payloads (tokens, PII, proprietary JSON) never leave their machine, while Web Workers guarantee the UI remains responsive even when processing massive datasets.

## 2. Target Audience & Success Metrics
*   **Target Audience**: Software engineers, data engineers, MLEs, and DevOps professionals who frequently manipulate data formats, debug APIs, and manage pipelines.
*   **Deployment**: Public web application.
*   **Monetization**: No ads initially. Future monetization strategies (e.g., premium tiers, API access) will be evaluated post-adoption.
*   **Primary Success Metric (MVP)**: Daily Active Users (DAU) and user retention.
*   **Secondary Success Metric**: Lighthouse performance scores (>95) and zero reported security/privacy incidents.

## 3. Technical Architecture & Stack (Locked)
To achieve maximum lightness, SEO compatibility, and strict client-side execution, the following stack is locked for the MVP:

*   **Framework**: **Astro** (Islands Architecture, Static Site Generation for perfect SEO and zero-JS default).
*   **Interactive Logic**: **Vanilla JavaScript** (Direct DOM manipulation, native `CustomEvent`, no framework overhead).
*   **Build Tool**: **Vite** (Native Web Worker support via `?worker` imports).
*   **Styling**: **Tailwind CSS** (Utility-first, purges unused CSS for microscopic stylesheets).
*   **Background Processing**: **Native Web Workers** (Offloads all heavy computation to prevent main-thread blocking).
*   **Cryptography**: **Native Web Crypto API** (`window.crypto.subtle`) to avoid bloating the bundle with external crypto libraries.

## 4. Core Feature Scope (MVP)

### 4.1 Data Formatting & Validation
*   **JSON Studio**: Validate, beautify, minify, tree view, diff/comparison, byte size calculation, escape/unescape.
*   **CSV ↔ JSON ↔ YAML Converter**: Bidirectional conversion with edge-case handling (e.g., escaped commas in CSV).

### 4.2 Decoding & Inspection
*   **JWT Inspector**: Decode header/payload, verify signature (HMAC/RSA/ECDSA), check expiration status.
*   **Base64 & URL Encoder/Decoder**: Encode/decode strings, files, and URL query parameters.
*   **MongoDB ObjectId Decoder**: Validate 24-hex-char format, extract and display the embedded 4-byte UTC timestamp.

### 4.3 Cryptography & Hashing
*   **Crypto & Hashing Hub**:
    *   *Hashing*: MD5, SHA-1, SHA-256, SHA-512.
    *   *Encryption/Decryption*: AES-GCM, RSA (with clear UI warnings about client-side key management).

### 4.4 Time & Scheduling
*   **Epoch / Timestamp Converter**: Bidirectional conversion between Unix Epoch (seconds/milliseconds), ISO 8601, and human-readable local/UTC dates.
*   **Crontab Evaluator**: Syntax validation, human-readable translation, and visualization of the next 5 execution times in the user's local timezone.

### 4.5 Unit & Data Conversions
*   **Data Size Converter**: Bytes (B) to Petabytes (PB), including binary (KiB, MiB) vs. decimal (KB, MB) distinctions.
*   **Data Transfer Rate Converter**: bps, Kbps, Mbps, Gbps.

### 4.6 MLE / Data Pipeline Utilities
*   **Regex Tester**: Real-time match highlighting with pre-loaded common data-cleaning patterns (IPs, UUIDs, emails, log formats).
*   **Sample Data Generator**: Generate mock JSON/CSV data (e.g., 100 rows of fake users, timestamps, metrics) for pipeline testing.

## 5. Non-Functional Requirements (NFRs)

### 5.1 Security & Privacy
*   **Zero Data Exfiltration**: 100% of user input processing must occur in the browser memory. No network requests for payload data.
*   **Content Security Policy (CSP)**: Implement a strict CSP blocking all external script executions, inline scripts (unless hashed), and unauthorized network connections.
*   **No Persistence**: No local storage or cookies for user data. Data is wiped on tab close/refresh.

### 5.2 Performance & Large Data Handling
*   **Web Worker Mandate**: Any operation on data > 10MB must automatically route to a Web Worker.
*   **UI Responsiveness**: The main thread must never freeze. If a Web Worker takes > 500ms, a non-blocking loading state (e.g., "Processing in background...") must be displayed.
*   **Hard Memory Limit**: Implement a strict **50MB hard limit** for in-browser processing to prevent mobile/low-RAM browser crashes.
    *   *Fallback UI*: If a user pastes/uploads >50MB, display a graceful error: *"Data exceeds 50MB browser memory limits. Please use a local CLI tool for this operation."*
*   **Initial Load**: Initial Lighthouse Performance score must be > 95. Tools must lazy-load (Astro Islands) so users only download the JS for the tool they are actively using.

### 5.3 SEO & Discoverability
*   **Routing**: Each tool must reside on its own distinct route (e.g., `/tools/json-formatter`, `/tools/jwt-decoder`).
*   **Meta Tags**: Unique `<title>`, `<meta description>`, and Open Graph tags for every tool page.
*   **Structured Data**: Implement Schema.org structured data where applicable for rich search results.

### 5.4 UX & Accessibility
*   **Navigation**: Global `Cmd+K` / `Ctrl+K` command palette for instant tool search and navigation.
*   **Theming**: Native Dark/Light mode support based on system preferences, with manual toggle.
*   **Accessibility**: WCAG 2.1 AA compliant (fully keyboard navigable, proper ARIA labels, sufficient color contrast).

## 6. Out of Scope (for MVP)
*   User accounts, authentication, or saved snippet history.
*   Server-side API endpoints or backend processing.
*   Analytics, telemetry, or instrumentation (deferred to V2).
*   Binary file parsing (e.g., Parquet, Avro, Iceberg) due to browser memory and WASM complexity constraints.
*   Monetization features, ads, or premium paywalls.

## 7. Future Considerations (V2)
*   Integration of analytics (e.g., Plausible or PostHog) to track DAU and tool usage.
*   Optional, encrypted, server-side snippet saving (requires backend architecture).
*   PWA (Progressive Web App) support for offline usage.
*   Advanced MLE tools: Parquet/Avro schema viewers via WebAssembly (WASM).