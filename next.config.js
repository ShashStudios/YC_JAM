/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Ignore type errors in scripts folder during build
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    // Exclude scripts from webpack compilation
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

module.exports = nextConfig;

