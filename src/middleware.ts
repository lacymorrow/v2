import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to add required headers for WebContainer cross-origin isolation
 */
export function middleware(request: NextRequest) {
    // Skip static files and API routes
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)
    ) {
        return NextResponse.next();
    }

    // Clone the response and add the required headers
    const response = NextResponse.next();

    // Add Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

    return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * 1. _next/static (static files)
         * 2. _next/image (image optimization files)
         * 3. favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
