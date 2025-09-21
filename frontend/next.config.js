/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dynamic configuration based on build type
  ...(process.env.BUILD_TYPE === 'static' ? {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  } : {}),
  
  webpack: (config) => {
    // Handle PDF.js worker
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  
  // Only add headers for non-static builds
  ...(process.env.BUILD_TYPE !== 'static' ? {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
          ],
        },
      ];
    },
  } : {}),
};

module.exports = nextConfig;