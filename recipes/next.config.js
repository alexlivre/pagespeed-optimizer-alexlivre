/**
 * Production Next.js 15/16 Master Configuration for 100/100 PageSpeed & Core Web Vitals
 * Part of pagespeed-optimizer-alexlivre (https://alexlivre.dev/)
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  // 1. Image Optimization for LCP & CLS
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year cache for optimized images
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },

  // 2. Production Compiler Optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // 3. Performance & Output Bundling
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  // 4. Package Import Optimizations (bypasses deep module indexing)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash-es',
    ],
  },

  // 5. Security & Isolation Headers (100 Best Practices)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), unload=()',
          },
        ],
      },
      // 1-Year Immutable Cache for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
