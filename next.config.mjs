/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // konva tries to require the node "canvas" package on the server
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};
export default nextConfig;
