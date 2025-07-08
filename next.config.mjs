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
  // Serverless optimizations
  serverExternalPackages: ['puppeteer-core'],
  // Optimize bundle size
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Only externalize puppeteer-core, keep @sparticuz/chromium bundled
      config.externals = [...config.externals, 'puppeteer-core']
    }
    return config
  },
  // Enable output optimization for serverless
  output: 'standalone',
  // Optimize for serverless functions
  poweredByHeader: false,
  compress: true,
}

export default nextConfig