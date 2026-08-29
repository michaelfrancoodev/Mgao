import type { NextConfig } from 'next'

// Chrome will not attach document.modelContext unless the document is
// origin-isolated and the tools permission is granted. If either header is
// missing the API is just undefined — no warning, no console error, nothing.
// Vercel already gives us HTTPS, but these are sent explicitly so a platform
// change can never switch the whole thing off without anyone noticing.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Origin-Agent-Cluster', value: '?1' },
          { key: 'Permissions-Policy', value: 'tools=(self)' },
        ],
      },
    ]
  },
}

export default nextConfig
