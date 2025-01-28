import { generateApp } from '@/server/services/app-generator';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	console.log('\n📥 Received app generation request');

	try {
		const body = await request.json();
		const { prompt, name } = body;

		console.log('📋 Request details:', { prompt, name });

		if (!prompt || !name) {
			console.error('❌ Missing required fields');
			return NextResponse.json(
				{ error: 'Prompt and name are required' },
				{ status: 400 }
			);
		}

		console.log('🏗️ Starting app generation...');
		const app = await generateApp({ prompt, name });

		console.log(`✅ Generation ${app.status === 'ready' ? 'completed' : 'failed'}`);
		return NextResponse.json(app);
	} catch (error) {
		console.error('❌ Error in generation route:', error);
		return NextResponse.json(
			{ error: 'Failed to generate app' },
			{ status: 500 }
		);
	}
}
