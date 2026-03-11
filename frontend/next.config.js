/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  transpilePackages: ['starknet'],
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
        permanent: false,
      },
    ];
  },
  webpack: (config) => {
    // Force starknet to use its CJS build.
    // The package's "browser" export condition points to index.global.js,
    // an IIFE with no module exports, making WalletAccount undefined at runtime.
    config.resolve.alias['starknet'] = path.resolve(
      __dirname,
      'node_modules/starknet/dist/index.js'
    );
    return config;
  },
};

module.exports = nextConfig;
