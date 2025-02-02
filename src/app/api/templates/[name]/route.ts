import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { transformTemplateFiles } from '@/server/services/template-service';

interface RouteParams {
    params: {
        name: string;
    };
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    try {
        // Await params before using them
        const { name } = await Promise.resolve(params);
        const files = await transformTemplateFiles(name);
        return NextResponse.json(files);
    } catch (error) {
        console.error('Error serving template files:', error);
        return NextResponse.json(
            { error: 'Failed to serve template files' },
            { status: 500 }
        );
    }
}
