import { readFileContent } from "@/server/services/file-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const project = searchParams.get("project");

    if (!path || !project) {
        return NextResponse.json(
            { error: "Missing path or project parameter" },
            { status: 400 },
        );
    }

    try {
        const content = await readFileContent(project, path);
        return NextResponse.json({ content });
    } catch (error) {
        console.error("Failed to read file:", error);
        return NextResponse.json(
            { error: "Failed to read file" },
            { status: 500 },
        );
    }
}
