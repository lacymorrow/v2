import { generateApp } from "@/server/services/app-generator";
import { generateRandomName } from "@/lib/utils";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
	const encoder = new TextEncoder();
	const name = generateRandomName();

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
					prompt: "Basic React app",
					name,
					template: "react",
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
			Connection: "keep-alive",
		},
	});
}
