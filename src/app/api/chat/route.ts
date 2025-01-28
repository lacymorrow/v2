import { streamChat } from "@/server/services/chat-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
	const { messages, model } = await req.json();

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				for await (const chunk of streamChat(messages, { model })) {
					controller.enqueue(encoder.encode(chunk));
				}
			} catch (error) {
				console.error("Stream error:", error);
				controller.enqueue(
					encoder.encode("\nError: Failed to generate response.")
				);
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
