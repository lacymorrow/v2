import { projectQueue } from "@/server/services/project-queue";
import { NextResponse } from "next/server";

export async function POST() {
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
