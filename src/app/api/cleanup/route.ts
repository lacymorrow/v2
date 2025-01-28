import { cleanupOldBuilds } from '@/server/services/cleanup';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        await cleanupOldBuilds();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to cleanup builds' },
            { status: 500 }
        );
    }
}
