import esbuild from 'esbuild';
import pinoPlugin from 'esbuild-plugin-pino';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

try {
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: 'dist/index.mjs',
    sourcemap: true,
    minify: !isDev,
    plugins: [],
    external: ['node:*', 'pg-native', 'canvas', 'fsevents'],
    banner: {
      js: "import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url'; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);",
    },
  });
  console.log('Build successful');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
