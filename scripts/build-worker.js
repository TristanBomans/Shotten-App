const esbuild = require('esbuild');

// Standard Node.js built-ins
const nodeBuiltIns = [
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http',
  'http2', 'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm',
  'wasi', 'worker_threads', 'zlib'
];

// Create a list of externals that includes both bare names and node: prefixed names
const externals = [
  ...nodeBuiltIns,
  ...nodeBuiltIns.map(m => `node:${m}`),
  'cloudflare:*'
];

esbuild.build({
  entryPoints: ['.open-next/worker.js'],
  bundle: true,
  outfile: '.open-next/assets/_worker.js',
  format: 'esm',
  target: 'esnext',
  platform: 'node', // Use node platform to better handle node-style code
  external: externals,
  // Inject shims if needed, but nodejs_compat usually handles imports
  // We define a banner to ensure globalThis.process exists if missed
  banner: {
    js: `import { Buffer } from 'node:buffer';
         if (!globalThis.Buffer) globalThis.Buffer = Buffer;
         if (!globalThis.process) globalThis.process = { env: {}, version: 'v18.0.0' };`,
  },
  logLevel: 'info',
}).catch(() => process.exit(1));
