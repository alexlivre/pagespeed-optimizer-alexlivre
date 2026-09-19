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

  // 3. Instant Navigation & Prefetching (0s LCP on internal links)
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover', // Prefetches link targets on pointer hover
  },

  // 4. Output & Compression
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto', // Inlines critical CSS (<14KB) automatically
  },
});
