interface ViteConfigOptions {
    appId: string;
    dependencies: string[];
}

export function generateViteConfig({ appId, dependencies }: ViteConfigOptions): string {
    return `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ${JSON.stringify(dependencies)},
  },
});
`;
}
