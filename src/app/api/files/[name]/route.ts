import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const APP_STORAGE_PATH = process.env.APP_STORAGE_PATH
	? path.join(process.cwd(), process.env.APP_STORAGE_PATH)
	: path.join(process.cwd(), "generated-apps");

function normalizeFilePath(filePath: string): string {
	// Convert Windows paths to forward slashes and ensure no leading slash
	return filePath.split(path.sep).join('/').replace(/^\/+/, '');
}

type FileSystemTree = {
	[key: string]: {
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
			// For directories, create a nested structure
			const dirFiles = await readDirRecursive(fullPath, projectRoot);
			if (Object.keys(dirFiles).length > 0) {
				// For root-level directories, use the directory name as the key
				if (path.dirname(relativePath) === '.') {
					files[entry.name] = {
						directory: dirFiles
					};
				} else {
					// For nested directories, maintain the path structure
					const parentPath = path.dirname(relativePath);
					const parentParts = parentPath.split('/');
					let current = files;

					// Create or traverse the directory structure
					for (const part of parentParts) {
						if (!current[part] || !current[part].directory) {
							current[part] = { directory: {} };
						}
						current = current[part].directory as FileSystemTree;
					}

					// Add the current directory
					current[entry.name] = {
						directory: dirFiles
					};
				}
			}
		} else {
			// For files, maintain the directory structure
			const content = await fs.readFile(fullPath, "utf-8");
			const dirPath = path.dirname(relativePath);

			if (dirPath === '.') {
				// Root-level files
				files[entry.name] = {
					file: {
						contents: content
					}
				};
			} else {
				// Nested files
				const parts = dirPath.split('/');
				let current = files;

				// Create or traverse the directory structure
				for (const part of parts) {
					if (!current[part] || !current[part].directory) {
						current[part] = { directory: {} };
					}
					current = current[part].directory as FileSystemTree;
				}

				// Add the file
				current[entry.name] = {
					file: {
						contents: content
					}
				};
			}
		}
	}

	return files;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ name: string }> }
) {
	try {
		const { name } = await params;
		const projectPath = path.join(APP_STORAGE_PATH, name);

		// Check if project exists
		try {
			await fs.access(projectPath);
		} catch {
			return NextResponse.json(
				{ error: "Project not found" },
				{ status: 404 }
			);
		}

		// Read all project files recursively, using project path as root
		const files = await readDirRecursive(projectPath, projectPath);

		return NextResponse.json(files);
	} catch (error) {
		console.error("Error serving project files:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
