const esbuild = require('esbuild');
const path = require('path');

// List of Node.js built-ins that need to be external and prefixed with node:
// Cloudflare with nodejs_compat expects "node:fs", not "fs".
const nodeBuiltIns = [
  'async_hooks', 'assert', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http',
  'http2', 'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm',
  'wasi', 'worker_threads', 'zlib'
];

// Create a plugin to redirect bare node imports to node: prefixed imports
const nodeProtocolPlugin = {
  name: 'node-protocol',
  setup(build) {
    build.onResolve({ filter: new RegExp(`^(${nodeBuiltIns.join('|')})$`) }, args => {
      return { path: `node:${args.path}`, external: true };
    });
    
    // Also mark existing node: imports as external
    build.onResolve({ filter: /^node:/ }, args => {
      return { path: args.path, external: true };
    });
    
    // Mark cloudflare: imports as external
    build.onResolve({ filter: /^cloudflare:/ }, args => {
      return { path: args.path, external: true };
    });
  },
};

esbuild.build({
  entryPoints: ['.open-next/worker.js'],
  bundle: true,
  outfile: '.open-next/assets/_worker.js',
  format: 'esm',
  target: 'esnext',
  platform: 'browser', // Use browser platform to avoid esbuild injecting its own node polyfills
  plugins: [nodeProtocolPlugin],
  logLevel: 'info',
}).catch(() => process.exit(1));
