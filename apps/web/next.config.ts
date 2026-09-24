import type { NextConfig } from 'next';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnvironment = join(__dirname, '../../.env');
if (existsSync(rootEnvironment)) process.loadEnvFile(rootEnvironment);

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(__dirname, '../..')
};

export default nextConfig;
