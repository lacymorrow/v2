import { APP_STORAGE_PATH } from "@/server/services/app-generator";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

async function getFileTree(dir: string): Promise<any> {
	const items = await fs.readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		items.map(async (item) => {
			const filePath = path.join(dir, item.name);
			if (item.isDirectory()) {
				return {
					name: item.name,
					type: "directory",
					children: await getFileTree(filePath),
				};
			}
			return {
				name: item.name,
				type: "file",
				path: path.relative(APP_STORAGE_PATH, filePath),
			};
		}),
	);
	return files;
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const projectName = searchParams.get("project");

		if (!projectName) {
			return NextResponse.json(
				{ error: "Project name is required" },
				{ status: 400 },
			);
		}

		const projectPath = path.join(APP_STORAGE_PATH, projectName);
		const tree = await getFileTree(projectPath);

		return NextResponse.json(tree);
	} catch (error) {
		console.error("Failed to get file tree:", error);
		return NextResponse.json(
			{ error: "Failed to get file tree" },
			{ status: 500 },
		);
	}
}
