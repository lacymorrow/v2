import { defineConfig } from "vite"
import reactSWC from '@vitejs/plugin-react-swc'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [reactSWC()],
	base: './', // Makes assets load correctly when deployed to subdirectories
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		sourcemap: false, // Disable sourcemaps for faster builds
		minify: 'esbuild', // Faster than terser
		target: 'esnext', // Modern browsers only
		rollupOptions: {
			output: {
				manualChunks: {
					'react-vendor': ['react', 'react-dom'],
				},
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	optimizeDeps: {
		disabled: !!process.env.VITE_FAST_BUILD, // Skip dep optimization in fast mode
		include: ['react', 'react-dom'],
	},
	esbuild: {
		target: 'esnext',
		legalComments: 'none',
		treeShaking: true,
	},
})
