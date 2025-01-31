import { readProjectFile } from "@/server/services/file-system";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const path = searchParams.get("path");

    if (!project || !path) {
        return NextResponse.json(
            { error: "Missing project or path parameter" },
            { status: 400 },
        );
    }

    try {
        const content = await readProjectFile(project, path);
        return NextResponse.json({ content });
    } catch (error) {
        console.error("Failed to read file:", error);
        return NextResponse.json(
            { error: "Failed to read file" },
            { status: 500 },
        );
    }
}
