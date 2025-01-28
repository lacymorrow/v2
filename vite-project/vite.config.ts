import react from '@vitejs/plugin-react-swc'
import path from "path"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	base: './', // Makes assets load correctly when deployed to subdirectories
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		sourcemap: true,
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
		include: ['@radix-ui/react-icons', 'lucide-react'],
	},
})
