import 'dotenv/config'; // Load environment variables from .env file

let userConfig = undefined;
try {
  userConfig = await import('./v0-user-next.config');
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    ADMIN_SOLANA_ADDRESS: process.env.ADMIN_SOLANA_ADDRESS,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    DEFAULT_FEE: process.env.DEFAULT_FEE,
    FEE_ADDRESS: process.env.FEE_ADDRESS,
  },
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return;
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

export default nextConfig;
