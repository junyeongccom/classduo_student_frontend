/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../'),
  typescript: {
    // ⚠️ Vercel 빌드 시 TypeScript 에러 무시 (주의: 프로덕션에서는 권장하지 않음)
    ignoreBuildErrors: false, // 에러 발생 시 빌드 중단 (안전)
  },
  eslint: {
    // ⚠️ Vercel 빌드 시 ESLint 에러 무시 (주의: 프로덕션에서는 권장하지 않음)
    ignoreDuringBuilds: false, // 에러 발생 시 빌드 중단 (안전)
  },
}

module.exports = nextConfig


