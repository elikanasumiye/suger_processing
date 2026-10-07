import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        react(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    server: {
        host: '127.0.0.1',
        hmr: { host: '127.0.0.1', port: 5173 },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    preview: {
        host: '127.0.0.1',
    },
});
