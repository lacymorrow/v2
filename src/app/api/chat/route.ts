import { streamChat } from "@/server/services/chat-service";
import { NextResponse } from "next/server";
import { editFile, readFile } from "@/server/services/file-service";

export const runtime = "nodejs";

interface FileOperation {
	type: "read" | "edit";
	path: string;
	content?: string;
}

export async function POST(req: Request) {
	const { messages, model, fileOperation } = await req.json();

	// Handle file operations if present
	if (fileOperation) {
		try {
			switch (fileOperation.type) {
				case "read": {
					const content = await readFile(fileOperation.path);
					return NextResponse.json({ content });
				}
				case "edit": {
					if (!fileOperation.content) {
						throw new Error("Content is required for edit operation");
					}
					await editFile(fileOperation.path, fileOperation.content);
					return NextResponse.json({ success: true });
				}
				default:
					throw new Error("Invalid file operation type");
			}
		} catch (error) {
			console.error("File operation error:", error);
			return NextResponse.json(
				{ error: "Failed to perform file operation" },
				{ status: 500 }
			);
		}
	}

	// Handle chat messages
	const encoder = new TextEncoder();
	let buffer = "";

	const stream = new ReadableStream({
		async start(controller) {
			function sendEvent(data: string) {
				// Split into lines and send each non-empty line as a separate event
				const lines = data.split('\n');
				for (const line of lines) {
					if (line.trim()) {
						controller.enqueue(encoder.encode(`data: ${line}\n\n`));
					}
				}
			}

			try {
				for await (const chunk of streamChat(messages, { model })) {
					if (!chunk) continue;

					// If chunk contains a newline, process buffer
					if (chunk.includes('\n')) {
						const parts = (buffer + chunk).split('\n');
						// Process all complete lines
						for (let i = 0; i < parts.length - 1; i++) {
							const line = parts[i];
							if (line?.trim()) {
								sendEvent(line);
							}
						}
						// Keep the last part as the new buffer
						buffer = parts[parts.length - 1] ?? '';
					} else {
						buffer += chunk;
						// If buffer gets too large, send it
						if (buffer.length > 100) {
							sendEvent(buffer);
							buffer = "";
						}
					}
				}
				// Send any remaining buffer
				if (buffer.trim()) {
					sendEvent(buffer);
				}
			} catch (error) {
				console.error("Stream error:", error);
				sendEvent("Error: Failed to generate response.");
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
