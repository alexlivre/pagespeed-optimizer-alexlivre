# Best Practices & Security Master Reference Guide

Target: **100/100 Best Practices Score** on PageSpeed Insights & Google Lighthouse 13+.

---

## 1. Document Hygiene & HTML Standard

- **DOCTYPE**: Must be the very first line of HTML files, exactly as shown, with no leading whitespace:
  ```html
  <!DOCTYPE html>
  ```
- **Language Attribute**: HTML element must specify valid language code:
  ```html
  <html lang="en">
  ```
- **Charset Encoding**: Declare UTF-8 in initial `<head>`:
  ```html
  <meta charset="UTF-8">
  ```

---

## 2. HTTP Security & Response Headers

Ensure all production deployments (Vercel, Netlify, Nginx, Cloudflare) serve the following security headers:

```json
{
  "headers": [
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
    { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
    { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()" },
    { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
    { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
    { "key": "Cross-Origin-Resource-Policy", "value": "same-site" },
    {
      "key": "Content-Security-Policy",
      "value": "default-src 'self'; script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; report-uri https://example.com/csp-report"
    }
  ]
}
```

### 2.1. CSP with `strict-dynamic` (Modern Pattern)

Traditional CSP whitelists every CDN host. That breaks the moment a vendor changes their CDN. `strict-dynamic` solves this by trusting scripts that the browser already trusts (via a nonce or hash), and letting them load further scripts without host allow-listing.

Generate a per-request nonce on the server and inject it into every `<script>` tag:

```js
// Express middleware
import crypto from 'node:crypto';

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${res.locals.cspNonce}' 'strict-dynamic'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: https:`,
      `connect-src 'self'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `frame-ancestors 'none'`,
      `form-action 'self'`,
    ].join('; ')
  );
  next();
});
```

```html
<script nonce="<%= cspNonce %>">
  // Inline runtime config. Anything this script dynamically inserts is allowed.
  window.__APP_CONFIG__ = { env: 'production' };
</script>
```

**Key rules**:
- `'strict-dynamic'` ignores host whitelists and `https:` when present. Pair with a nonce (preferred) or a hash.
- `'unsafe-inline'` is ignored in modern browsers when `'strict-dynamic'` or a nonce/hash is present — but you still need to remove it from older browsers with `Content-Security-Policy-Report-Only` first.
- Always ship a `report-uri` (or `report-to`) so CSP violations land in your monitoring.
- Start in `Content-Security-Policy-Report-Only` mode for at least a week before enforcing.

### 2.2. Cross-Origin Isolation (COOP + COEP)

`Cross-Origin-Opener-Policy: same-origin` plus `Cross-Origin-Embedder-Policy: require-corp` enables `crossOriginIsolated` mode. Required for high-precision timers, `SharedArrayBuffer`, and some future APIs. **Caveat**: any third-party iframe or worker that does not send `Cross-Origin-Resource-Policy: cross-origin` will be blocked. Audit all embeds (YouTube, Vimeo, Stripe, etc.) before enabling.

```html
<!-- Cross-origin embed: explicitly opt in to being loaded by isolated pages -->
<iframe
  src="https://www.youtube.com/embed/..."
  credentialless
  title="..."
></iframe>
```

The `credentialless` attribute is the simplest way to embed third-party content on a cross-origin-isolated page without negotiating CORP headers.

---

## 3. Console & Error Hygiene

- **Zero Console Errors**: Eliminate unhandled JavaScript errors, missing resource 404s, CORS violations, or failed fetch calls.
- **Zero-404 Inline Vector Image Fallbacks**: Prevent 404 console errors and broken-image CLS caused by failing CDN assets or hotlinked graphics by installing an inline SVG error fallback:
  ```javascript
  const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23f1f5f9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2364748b'>Image Unavailable</text></svg>";

  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('referrerpolicy')) {
      img.setAttribute('referrerpolicy', 'no-referrer');
    }
    img.addEventListener('error', () => {
      if (img.src !== fallbackSvg) {
        img.src = fallbackSvg;
        img.style.objectFit = 'cover';
      }
    });
  });
  ```
- **Remove Debug Logs**: Strip all `console.log()` statements during build steps.
- **Source Maps**: Either upload source maps to your error monitor (Sentry, Datadog) and serve them only to authenticated users, or generate them but do not publish them. Lighthouse penalizes both 404s on `.map` requests and exposed production source maps.
- **External Links Security**: All `<a href="..." target="_blank">` MUST include `rel="noopener noreferrer"`.
- **Eliminate `unload` Listeners (Chrome Deprecation)**: Chrome is actively deprecating the `unload` event across stable releases. It breaks the Back/Forward Cache (bfcache). Replace any `window.addEventListener('unload', ...)` with `pagehide` or `document.addEventListener('visibilitychange', ...)`. Set header `Permissions-Policy: unload=()` to enforce absence across third-party scripts.
- **Back/Forward Cache (bfcache) Compliance**: Pass Lighthouse `bf-cache` audit:
  1. No `unload` listeners.
  2. Release IndexedDB transactions and Web Locks on `pagehide`.
  3. Close or re-establish WebSockets gracefully during page navigation.
  4. Ensure `Cache-Control` allows caching where sensitive user data is not present.
- **Passive Event Listeners**: Always pass `{ passive: true }` to `touchstart`, `touchmove`, and `wheel` event listeners to prevent main-thread scroll blocking.

> Note: Lighthouse 13 removed the `uses-passive-event-listeners` audit, but the practice still improves INP and scroll smoothness.

---

## 3.1. Local Development Gotcha: BP Score on HTTP

On `http://localhost:3000` (or any HTTP origin), the **only** Best Practices audit that fails is `is-on-https` (weight 5 of 26 total). Expect a ceiling of **~81/100** until you serve over HTTPS, even if every other audit passes. **A 95+ BP score on HTTP is not possible** — do not chase it.

For accurate BP scores during development:
- Use a local HTTPS server with a self-signed cert, or
- Deploy a staging environment behind HTTPS (Vercel, Netlify, Cloudflare all do this for free).

Other audits that show as `FAIL` in local reports (`unminified-javascript`, `unused-javascript`, `bf-cache`, `render-blocking-insight`) belong to the **Performance** category and do **not** affect the BP score. Do not interpret them as BP failures.

> Note: a `FAIL` on `render-blocking-insight` is often *correct and desired* — see `performance.md` §8. A render-blocking layout stylesheet is frequently the fix for late-CSS CLS, so do not chase that audit to zero.

---

## 3.2. A Service Worker Can Silently Defeat `Cache-Control: no-cache`

If you ship a service worker whose **stale-while-revalidate** cache includes the HTML, it answers the first navigation after a deploy with the *previous* document before the network response arrives. Your `Cache-Control: no-cache, must-revalidate` on the HTML never gets to act, so users keep the old page until their second visit.

**Symptoms:** a deploy reports success, hard-reload shows the new version, yet real users still get the old page — and "the fix didn't work" in production.

**Fix:** make document navigations network-first and leave stale-while-revalidate to immutable assets.

```js
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Documents revalidate against the network; assets keep the fast path.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // ...stale-while-revalidate for everything else
});
```

Also bump `CACHE_NAME` on every deploy that changes the HTML or the CSS, or the previous cache entry keeps winning. And keep hashed/immutable assets out of the precache list, so they are never served stale.

---

## 4. Image Format & Aspect-Ratio Rules

- **Modern formats only**: Serve AVIF (preferred) or WebP. Fall back to JPEG/PNG via `<picture>` only when the browser lacks support.
- **Correct aspect ratio**: An image displayed at a different aspect ratio than its source file triggers a Lighthouse warning. Either crop/resize the source or use `object-fit: cover` in CSS.
- **No oversized images**: An image served at 2× its display size wastes bandwidth. Use `srcset` with width descriptors and `sizes` matching the layout.
