import { generateRandomName } from "@/lib/utils";
import { generateApp } from "@/server/services/app-generator";
import { projectQueue } from "@/server/services/project-queue";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET endpoint for queue-based app generation
export async function GET() {
	try {
		const project = await projectQueue.getNextProject();
		return NextResponse.json(project);
	} catch (error) {
		console.error("Failed to generate project:", error);
		return NextResponse.json(
			{ error: "Failed to generate project" },
			{ status: 500 },
		);
	}
}

// POST endpoint for direct app generation
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

		// Generate the app
		const app = await generateApp({
			prompt,
			name: appName,
			template,
		});

		// Return the generated app info
		return NextResponse.json({
			success: true,
			app: {
				name: appName,
				url: app.publicUrl,
				status: app.status,
			}
		});
	} catch (error) {
		console.error("API generation error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Generation failed"
			},
			{ status: 500 }
		);
	}
}
