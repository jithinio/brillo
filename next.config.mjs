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
  // Optimize for Vercel hobby plan
  poweredByHeader: false,
  compress: true,

  // Server-side external packages
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Conservative experimental features for hobby plan
  experimental: {
    // Only stable features that work well on hobby plan
    optimizePackageImports: ['lucide-react'],
  },

  // Handle external packages
  transpilePackages: ['@tanstack/react-table'],

  // Single, optimized webpack configuration
  webpack: (config, { isServer }) => {
    // Handle ES modules properly
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    })

    return config
  },

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Essential security headers only
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig