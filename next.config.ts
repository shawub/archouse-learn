import type { NextConfig } from 'next'

// ALLOWED_ORIGINS — comma-separated extra origins for Server Actions (e.g. a Cloudflare tunnel hostname).
// localhost:3000 is always included.
const extraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : []

const config: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', ...extraOrigins] },
  },
}

export default config
