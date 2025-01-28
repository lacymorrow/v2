import react from '@vitejs/plugin-react'
import path from "path"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
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
		// Disable type checking during build
		typescript: {
			noEmit: true,
			skipLibCheck: true,
			skipDefaultLibCheck: true,
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
