import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const APP_STORAGE_PATH = process.env.NODE_ENV === 'production'
	? path.join('/tmp', 'generated-apps')
	: process.env.APP_STORAGE_PATH
		? path.join(process.cwd(), process.env.APP_STORAGE_PATH)
		: path.join(process.cwd(), "public", "generated-apps");

function normalizeFilePath(filePath: string): string {
	// Convert Windows paths to forward slashes and ensure no leading slash
	return filePath.split(path.sep).join('/').replace(/^\/+/, '');
}

type FileSystemTree = {
	[key: string]: {
		kind: string;
		file?: {
			contents: string;
		};
		directory?: FileSystemTree;
	};
};

async function readDirRecursive(dir: string, projectRoot: string): Promise<FileSystemTree> {
	const files: FileSystemTree = {};
	const entries = await fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name === "node_modules" || entry.name === ".git") {
			continue;
		}

		const fullPath = path.join(dir, entry.name);
		const relativePath = normalizeFilePath(path.relative(projectRoot, fullPath));

		if (entry.isDirectory()) {
			const dirFiles = await readDirRecursive(fullPath, projectRoot);
			if (Object.keys(dirFiles).length > 0) {
				files[entry.name] = {
					kind: 'directory',
					directory: dirFiles
				};
			}
		} else {
			const content = await fs.readFile(fullPath, "utf-8");
			files[entry.name] = {
				kind: 'file',
				file: {
					contents: content
				}
			};
		}
	}

	return files;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ name: string }> },
) {
	const name = (await params).name;
	try {
		const projectPath = path.join(APP_STORAGE_PATH, name);
		console.log("projectPath", projectPath);

		// Check if the project directory exists
		try {
			await fs.access(projectPath);
		} catch {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const files = await readDirRecursive(projectPath, projectPath);
		return NextResponse.json(files);
	} catch (error) {
		console.error("Error reading project files:", error);
		return NextResponse.json(
			{ error: "Failed to read project files" },
			{ status: 500 },
		);
	}
}
