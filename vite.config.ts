import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5174,
        strictPort: true,
        cors: {
            origin: '*',
            methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
            credentials: true
        },
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'cross-origin'
        },
        hmr: {
            clientPort: 443,
            path: '/_hmr',
            timeout: 5000
        }
    },
    preview: {
        port: 5174,
        strictPort: true,
        host: true
    }
});
