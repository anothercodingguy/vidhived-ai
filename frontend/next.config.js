/** @type {import('next').NextConfig} */
const nextConfig = {
  // Simplified configuration for faster builds
  webpack: (config) => {
    // Handle PDF.js worker
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;