import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get the response
    const response = NextResponse.next();

    // Add security headers
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

    // Log headers for debugging
    console.log('Middleware headers:', {
        coep: response.headers.get('Cross-Origin-Embedder-Policy'),
        coop: response.headers.get('Cross-Origin-Opener-Policy'),
        url: request.url
    });

    return response;
}

// Configure which routes the middleware applies to
export const config = {
    matcher: [
        // Apply to all routes
        '/:path*',
    ],
};
