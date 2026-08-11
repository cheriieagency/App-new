const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_CREATE_BASE_URL: process.env.NEXT_PUBLIC_CREATE_BASE_URL,
    NEXT_PUBLIC_CREATE_HOST: process.env.NEXT_PUBLIC_CREATE_HOST,
    NEXT_PUBLIC_PROJECT_GROUP_ID: process.env.NEXT_PUBLIC_PROJECT_GROUP_ID,
  },
  serverExternalPackages: [
    '@neondatabase/serverless',
    'ws',
    '@better-auth/kysely-adapter',
    'kysely',
  ],
  // Resolve leftover `@auth/create` imports to local shims (see src/__create/@auth/create).
  turbopack: {
    resolveAlias: {
      '@auth/create/react': path.join(
        __dirname,
        'src/__create/@auth/create/react.tsx'
      ),
      '@auth/create': path.join(__dirname, 'src/__create/@auth/create/index.ts'),
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@auth/create/react': path.join(
        __dirname,
        'src/__create/@auth/create/react.tsx'
      ),
      '@auth/create': path.join(__dirname, 'src/__create/@auth/create/index.ts'),
    };
    return config;
  },
  rewrites() {
    return [
      {
        source: '/fontawesome/:path*',
        destination: 'https://ka-p.fontawesome.com/:path*',
      },
      // Vanity bio URLs: clikd.app/@handle → /bio/handle
      {
        source: '/@:handle',
        destination: '/bio/:handle',
      },
    ];
  },
};

module.exports = nextConfig;
