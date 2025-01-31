import { getProjectFileTree } from "@/server/services/file-system";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    console.log(`File tree requested for project: ${project}`);

    if (!project) {
        console.log('Missing project parameter in request');
        return NextResponse.json(
            { error: "Missing project parameter" },
            { status: 400 },
        );
    }

    try {
        console.log(`Fetching file tree for project: ${project}`);
        const tree = await getProjectFileTree(project);
        console.log(`Successfully retrieved file tree for ${project}`);
        console.log('Tree structure:', {
            rootName: tree.name,
            childCount: Object.keys(tree.children).length,
            children: Object.keys(tree.children)
        });

        return NextResponse.json({ tree });
    } catch (error) {
        console.error("Failed to get file tree:", error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json(
            { error: "Failed to get file tree" },
            { status: 500 },
        );
    }
}
