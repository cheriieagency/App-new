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
  images: {
    // Creator uploads + social CDNs (avatars, covers, Meta/TikTok thumbnails).
    // TikTok rotates regional hosts (tiktokcdn.com, tiktokcdn-eu.com, …).
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: '*.supabase.in', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dicebear.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.fbcdn.net', pathname: '/**' },
      { protocol: 'https', hostname: '*.cdninstagram.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.tiktokcdn.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.tiktokcdn-eu.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.tiktokcdn-us.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.tiktokcdn-row.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.ttlivecdn.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.tiktok.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.ggpht.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'yt3.ggpht.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media.licdn.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.licdn.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.pinimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/**' },
    ],
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
