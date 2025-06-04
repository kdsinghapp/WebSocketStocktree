/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove experimental.appDir as it's now the default in Next.js 13+
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    SMARTAPI_KEY: process.env.SMARTAPI_KEY,
    CLIENT_CODE: process.env.CLIENT_CODE,
    MPIN: process.env.MPIN,
    TOTP_SECRET: process.env.TOTP_SECRET,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
