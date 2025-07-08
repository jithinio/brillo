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
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  // Optimize bundle size
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize puppeteer-core and chromium to reduce bundle size
      config.externals = [...config.externals, 'puppeteer-core', '@sparticuz/chromium']
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