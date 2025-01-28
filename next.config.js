/** @type {import('next').NextConfig} */
const nextConfig = {
    // Other config options...

    // Configure static file serving
    async headers() {
        return [
            {
                source: '/builds/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
