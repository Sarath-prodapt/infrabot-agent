import path from 'path';
import { fileURLToPath } from 'url';

let userConfig = undefined
try {
  // try to import ESM first
  userConfig = await import('./infrabot.config.mjs')
} catch (e) {
  try {
    // fallback to CJS import
    userConfig = await import("./infrabot.config");
  } catch (innerError) {
    // ignore error
  }
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
  webpack: (config) => {
    // Get the directory name in an ES module context
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    config.resolve.alias['@'] = path.resolve(currentDir);
    return config
  },
}

if (userConfig) {
  // ESM imports will have a "default" property
  const config = userConfig.default || userConfig

  for (const key in config) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...config[key],
      }
    } else {
      nextConfig[key] = config[key]
    }
  }
}

export default nextConfig
