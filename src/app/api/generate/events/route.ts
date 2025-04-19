import { generateRandomName } from "@/lib/utils";
import { generateApp } from "@/server/services/app-generator";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET endpoint that streams server-sent events for app generation progress
 * This is used for real-time progress updates during app generation
 */
export async function GET(request: Request) {
	// Parse query parameters from URL
	const url = new URL(request.url);
	const prompt = url.searchParams.get('prompt') || 'Basic React app';
	const template = url.searchParams.get('template') || 'react';
	const providedName = url.searchParams.get('name');

	const name = providedName || generateRandomName();
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			function sendEvent(event: string, data: any) {
				controller.enqueue(
					encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
				);
			}

			try {
				sendEvent("start", { name });

				// Generate the app with progress updates
				const app = await generateApp({
					prompt,
					name,
					template: template as 'react' | 'next',
					onProgress: (step: string, progress: number) => {
						sendEvent("progress", { step, progress });
					},
				});

				sendEvent("complete", {
					name,
					url: app.publicUrl,
				});
			} catch (error) {
				console.error("Generation failed:", error);
				sendEvent("error", {
					message: error instanceof Error ? error.message : "Generation failed",
				});
			} finally {
				controller.close();
			}
		},
	});

	return new NextResponse(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
		},
	});
}

/**
 * POST endpoint for initiating app generation with progress streaming
 * The client should connect to the returned stream URL to receive progress updates
 */
export async function POST(req: Request) {
	try {
		// Parse the request body
		const body = await req.json();
		const { prompt, name, template = 'react' } = body;

		// Validate required fields
		if (!prompt) {
			return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
		}

		// Use provided name or generate a random one
		const appName = name || generateRandomName();

		// Return information needed to connect to the event stream
		// The client will need to connect to this URL to receive progress updates
		const eventStreamUrl = `/api/generate/events?name=${encodeURIComponent(appName)}&prompt=${encodeURIComponent(prompt)}&template=${encodeURIComponent(template)}`;

		return NextResponse.json({
			success: true,
			name: appName,
			eventStreamUrl,
			message: "Connect to the event stream URL to receive real-time progress updates"
		});
	} catch (error) {
		console.error("API error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Request failed"
			},
			{ status: 500 }
		);
	}
}
