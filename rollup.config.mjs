// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    entryFileNames: '[name].mjs',
    chunkFileNames: '[name].mjs',
    format: 'es',
    sourcemap: true
  },
  context: "this",   // needed only for MariaDB module
  plugins: [typescript(), json(), commonjs(), nodeResolve()]
};
