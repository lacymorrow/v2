import { getProjectFileTree } from "@/server/services/file-system";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");

    if (!project) {
        return NextResponse.json(
            { error: "Missing project parameter" },
            { status: 400 },
        );
    }

    try {
        const tree = await getProjectFileTree(project);
        return NextResponse.json({ tree });
    } catch (error) {
        console.error("Failed to get file tree:", error);
        return NextResponse.json(
            { error: "Failed to get file tree" },
            { status: 500 },
        );
    }
}
