import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");

    if (!project) {
        return NextResponse.json(
            { error: "Missing project parameter" },
            { status: 400 },
        );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            // Keep track of this connection in global event emitter
            const eventId = Date.now().toString();

            // Function to send events to this client
            function sendEvent(data: string) {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Send initial connection event
            sendEvent(JSON.stringify({ type: 'connected', projectName: project }));

            // Store the event handler in global state
            (global as any).fileTreeEventHandlers = (global as any).fileTreeEventHandlers || {};
            (global as any).fileTreeEventHandlers[eventId] = sendEvent;

            // Set up heartbeat to keep connection alive
            const heartbeatInterval = setInterval(() => {
                sendEvent(JSON.stringify({ type: 'heartbeat' }));
            }, 30000); // Send heartbeat every 30 seconds

            // Clean up when the connection is closed
            request.signal.addEventListener("abort", () => {
                clearInterval(heartbeatInterval);
                delete (global as any).fileTreeEventHandlers[eventId];
            });
        }
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
