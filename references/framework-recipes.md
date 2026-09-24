# Framework-Specific Master PageSpeed Recipes

Production-ready optimization recipes for Next.js (App Router & Pages Router), Vite/React/Vue, Astro, and Vanilla HTML/CSS/JS.

---

## 1. Next.js (App Router) Master Pattern

### App Router `layout.tsx` Layout & Font Subsetting
```tsx
import { Inter } from 'next/font/google';
import Script from 'next/script';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Next.js 100 PageSpeed Master',
  description: 'Ultra-fast Next.js application optimized for Core Web Vitals and GEO.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <main id="main-content">{children}</main>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

### Next.js Image Component Best Practices
```tsx
import Image from 'next/image';

// Hero / LCP Image
export function HeroImage() {
  return (
    <Image
      src="/hero.png"
      alt="Hero Banner"
      width={1200}
      height={600}
      priority // Automatically sets fetchpriority="high" and eager loading
      sizes="(max-width: 768px) 100vw, 1200px"
      className="w-full h-auto"
    />
  );
}

// Card Image in Responsive Container
export function CardImage() {
  return (
    <div className="relative w-full h-[250px] overflow-hidden rounded-lg">
      <Image
        src="/card.png"
        alt="Card Feature"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        style={{ objectFit: 'cover' }}
        loading="lazy"
      />
    </div>
  );
}
```

---

## 2. Vite (React / Vue / Svelte) Master Pattern

### `vite.config.ts` Code Splitting & Minification
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    minify: 'esbuild',
    modulePreload: {
      polyfill: true, // Injects <link rel="modulepreload"> for critical chunks
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});
```

### SPA Soft Navigations & INP
In single-page applications using `react-router` or `@tanstack/react-router`:
1. Use `startTransition` for state updates triggered by route changes to yield to the main thread (improving INP).
2. Clean up any ongoing timers or WebSockets in `useEffect` cleanup hooks to prevent memory leaks and maintain `bfcache` eligibility.
3. Reserve container heights for async loaded views using CSS skeletons or `min-height` to prevent CLS on soft navigations.

---

## 3. Astro Framework Master Pattern

### Built-in Image & Islands Optimization
```astro
---
import { Image } from 'astro:assets';
import heroImg from '../assets/hero.png';
---

<Image 
  src={heroImg} 
  alt="Hero Banner" 
  width={1200} 
  height={600} 
  loading="eager" 
  fetchpriority="high" 
/>
```

---

## 4. Vanilla HTML / Server Configuration

### `vercel.json` Security Headers & Caching
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-site" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

> **Immutable caching needs changing URLs.** The `/assets/(.*)` rule above sets a 1-year
> immutable cache. That is only safe when those filenames are fingerprinted
> (`app.a1b2c3.css`) or versioned with `?v=<hash>`. On a path that serves stable names —
> a plain `/styles.css`, for instance — a deploy leaves visitors on the old file for a year.

For the full CSP pattern with `strict-dynamic` + nonce, see `references/best-practices.md` section 2.1.

---

## 5. Next.js 15/16 — Partial Prerendering (PPR) and Cache Components

Next.js 15 ships **Partial Prerendering** (stable for the App Router), and Next.js 16 adds **Cache Components** that let the static shell of a page be served instantly while dynamic fragments stream in. Both are the single biggest CWV win available on Next.js in 2026.

### 5.1. Enable PPR (Next.js 15+)

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: 'incremental', // opt-in per route via export const experimental_ppr = true
  },
};

export default nextConfig;
```

Mark a route as fully prerendered:

```tsx
// app/page.tsx
export const experimental_ppr = true;
export const dynamic = 'force-static';

export default function Home() {
  return (
    <>
      <Hero />                       {/* static shell — served immediately */}
      <Suspense fallback={<Spinner />}>
        <PersonalizedGreeting />    {/* dynamic — streams in */}
      </Suspense>
    </>
  );
}
```

### 5.2. Cache Components (Next.js 16)

```tsx
// app/products/[id]/page.tsx
import { cacheLife, cacheTag } from 'next/cache';

async function getProduct(id: string) {
  'use cache';
  cacheLife('hours');
  cacheTag(`product-${id}`);

  const res = await fetch(`https://api.example.com/products/${id}`);
  return res.json();
}

// Next.js 15+ made `params` a Promise: it must be awaited.
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  return <ProductView product={product} />;
}
```

`revalidateTag('product-123')` in a server action or webhook invalidates the cached shell for that specific product.

### 5.3. Image & Font (no change from Next.js 14, still the recommended pattern)

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

---

## 6. View Transitions API (Cross-Document, 2026)

Cross-document View Transitions are **production-ready in Chromium and Safari as of May 2026** (Firefox is partial). They animate between full page navigations with zero JavaScript animation code.

### 6.1. Enable site-wide

```css
/* In your global stylesheet */
@view-transition { navigation: auto; }

/* Customize the duration */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.25s;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

### 6.2. Per-element transitions (named views)

```css
.hero {
  view-transition-name: hero;
}

::view-transition-old(hero),
::view-transition-new(hero) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

Same `view-transition-name` on two pages makes the browser morph the element across the navigation. The result: an app-like SPA feel without any SPA framework overhead.

### 6.3. Progressive enhancement

Browsers that do not support the API simply ignore the `@view-transition` rule and perform a normal navigation. No JS shim, no polyfill needed.

---

## 7. Astro 5 — Image, Islands, and Zero-JS by Default

Astro's default of zero client-side JavaScript makes it the easiest framework to hit 100/100/100/100 on PSI. Use `<Image />` for build-time image optimization and `client:*` directives only on islands that need them.

```astro
---
import { Image } from 'astro:assets';
import InteractiveSearch from '../components/Search.tsx';
import heroImg from '../assets/hero.avif';
---

<Image src={heroImg} alt="Hero" width={1200} height={600} loading="eager" fetchpriority="high" />

<InteractiveSearch client:visible />
```

`client:visible` hydrates the island only when it scrolls into the viewport — better INP than `client:load` and lower TBT than `client:idle`.

---

## 8. Vite — Code Splitting, Compression, and Image Plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    imagetools(),
  ],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});
```

Pair with the `rollup-plugin-visualizer` to inspect bundle composition in CI, and fail the build on any chunk exceeding the budget.

