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
}

export default nextConfig