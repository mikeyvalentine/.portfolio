/** @type {import('next').NextConfig} */
const nextConfig = {
  // three ships untranspiled ESM in places; transpiling keeps the 3D deps happy.
  transpilePackages: ['three', 'postprocessing', 'n8ao'],
  headers: async () => [
    {
      // Long-cache the immutable asset payloads. Bust by filename, not by header.
      source: '/models/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/hdri/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
};
export default nextConfig;
