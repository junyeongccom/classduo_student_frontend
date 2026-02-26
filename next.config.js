/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // In this repo we have multiple lockfiles at the workspace level.
  // Explicitly set the tracing root to the frontend directory to avoid
  // Next.js inferring the wrong workspace root in dev/build.
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async redirects() {
    return [
      {
        source: '/dashboard/:path*',
        destination: '/studyspace/:path*',
        permanent: true,
      },
      {
        source: '/dashboard',
        destination: '/studyspace',
        permanent: true,
      },
    ]
  },
  webpack(config, { isServer }) {
    // Game code obfuscation — production client builds only
    if (!isServer && process.env.NODE_ENV === 'production') {
      try {
        const WebpackObfuscator = require('webpack-obfuscator')
        config.plugins.push(
          new WebpackObfuscator(
            {
              rotateStringArray: true,
              stringArray: true,
              stringArrayThreshold: 0.75,
              identifierNamesGenerator: 'hexadecimal',
              // Keep performance reasonable
              selfDefending: false,
              debugProtection: false,
              disableConsoleOutput: false,
            },
            // Only obfuscate game-related code
            ['**/features/ai-tutor/game/**']
          )
        )
      } catch {
        // webpack-obfuscator not installed — skip
        console.warn('webpack-obfuscator not found, skipping game code obfuscation')
      }
    }
    return config
  },
}

module.exports = nextConfig
