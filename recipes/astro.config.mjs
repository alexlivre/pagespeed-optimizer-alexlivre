/**
 * Production Astro 5 Master Configuration for 100/100 PageSpeed & Core Web Vitals
 * Part of pagespeed-optimizer-alexlivre (https://alexlivre.dev/)
 */
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 1. Production Site & Trailing Slash Consistency (SEO)
  site: 'https://example.com',
  trailingSlash: 'never',

  // 2. High-Performance Asset & Image Service
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    remotePatterns: [{ protocol: 'https' }],
  },

  // 3. Instant Navigation & Prefetching (starts the next page's load before the click)
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover', // Prefetches link targets on pointer hover
  },

  // 4. Output & Compression
  compressHTML: true,
  build: {
    // 'auto' inlines only stylesheets smaller than Vite's assetsInlineLimit (4 KB by
    // default) — not the 14 KB TCP roundtrip budget. Anything larger ships as a
    // render-blocking <link>, which is the correct behaviour. Read performance.md §8
    // before moving layout CSS to load asynchronously.
    inlineStylesheets: 'auto',
  },
});
