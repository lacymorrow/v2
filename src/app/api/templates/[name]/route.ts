import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { transformTemplateFiles } from '@/server/services/template-service';
import type { WebContainerFiles, FileEntry, DirectoryEntry } from '@/server/services/template-service';

interface RouteParams {
	params: Promise<{
		name: string;
	}>;
}

export const runtime = 'nodejs';

// Add headers required for SharedArrayBuffer
export const headers = {
	'Cross-Origin-Embedder-Policy': 'require-corp',
	'Cross-Origin-Opener-Policy': 'same-origin'
};

// Type guard to check if an entry is a file or directory
function isValidEntry(entry: unknown): entry is FileEntry | DirectoryEntry {
	return entry != null && typeof entry === 'object' && 'kind' in entry;
}

export async function GET(
	request: NextRequest,
	{ params }: RouteParams
): Promise<NextResponse> {
	const { name } = await params;
	if (!name) {
		return NextResponse.json(
			{ error: 'Project name is required' },
			{ status: 400 }
		);
	}

	console.log('Template request received for project:', name);

	try {
		console.log('Transforming template files for:', name);

		const files = await transformTemplateFiles(name);
		if (!files || typeof files !== 'object') {
			throw new Error('Failed to transform template files');
		}

		// Verify the files object structure
		const fileEntries = Object.entries(files).reduce<WebContainerFiles>((acc, [key, value]) => {
			if (isValidEntry(value)) {
				acc[key] = value;
			}
			return acc;
		}, {});

		console.log('Template files transformed successfully', {
			fileCount: Object.keys(fileEntries).length,
			fileTypes: Object.keys(fileEntries).map(key => ({
				name: key,
				type: fileEntries[key].kind
			}))
		});

		const response = NextResponse.json(fileEntries);

		// Add COOP/COEP headers
		response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
		response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

		return response;
	} catch (error) {
		console.error('Error serving template files:', {
			error,
			projectName: name,
			errorMessage: error instanceof Error ? error.message : 'Unknown error',
			errorStack: error instanceof Error ? error.stack : undefined
		});

		const errorResponse = NextResponse.json(
			{ error: 'Failed to serve template files' },
			{ status: 500 }
		);

		// Add COOP/COEP headers even on error
		errorResponse.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
		errorResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

		return errorResponse;
	}
}
