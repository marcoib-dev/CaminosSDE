import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// En desarrollo las variables viven en el .env de la raíz del monorepo.
// En producción (Vercel) llegan por el entorno y este archivo no existe.
try {
  loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // Sin archivo local: se usan las variables del entorno.
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sde/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
