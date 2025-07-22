/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable output optimization for serverless
  output: 'standalone',
  // Optimize for serverless functions
  poweredByHeader: false,
  compress: true,

  // Server-side external packages (moved from experimental)
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Vercel-specific optimizations (stable version compatible)
  experimental: {
    // Optimize package imports (stable feature)
    optimizePackageImports: ['framer-motion', 'lucide-react'],
    // Enable web vitals attribution (stable feature)
    webVitalsAttribution: ['CLS', 'LCP'],
  },

  // Webpack configuration to handle ES modules
  webpack: (config, { isServer }) => {
    // Handle ES modules properly
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    })

    // Ensure @tanstack/react-table is transpiled
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      }
    }

    return config
  },

  // Handle external packages
  transpilePackages: ['@tanstack/react-table'],

  // Bundle analyzer for optimization insights
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'async',
            enforce: true,
          },
        },
      }
    }

    // Add custom webpack optimizations
    config.plugins.push(
      new webpack.DefinePlugin({
        __VERCEL__: JSON.stringify(true),
        __BUILD_ID__: JSON.stringify(buildId),
      })
    )

    return config
  },

  // Optimize performance (swcMinify is now default in Next.js 15)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Strict transport security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://api.resend.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; '),
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig