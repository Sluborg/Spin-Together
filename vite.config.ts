import { defineConfig } from 'vite';

// `base` is passed per-branch by the Pages workflow:
//   main -> --base=/Spin-Together/      (served at site root)
//   dev  -> --base=/Spin-Together/dev/  (served under /dev/)
// Locally it defaults to '/' so `vite dev` / `vite preview` just work.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true,
  },
});
