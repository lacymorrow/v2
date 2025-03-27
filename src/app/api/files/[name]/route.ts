import { getGeneratedAppByName } from "@/server/models/generated-app";
import { BlobStorage } from "@/server/services/storage/blob-storage";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// For production (serverless) environments, use /tmp directory which is writable
// For local development, use the paths within the project
const APP_STORAGE_PATH = process.env.NODE_ENV === 'production'
	? path.join('/tmp', 'generated-apps')
	: process.env.APP_STORAGE_PATH
		? path.join(process.cwd(), process.env.APP_STORAGE_PATH)
		: path.join(process.cwd(), "public", "generated-apps");

function normalizeFilePath(filePath: string): string {
	// Convert Windows paths to forward slashes and ensure no leading slash
	return filePath.split(path.sep).join('/').replace(/^\/+/, '');
}

/**
 * API route handler for getting app files
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { name: string } }
) {
	try {
		// Await params before accessing them
		const { name } = await Promise.resolve(params);
		const isRoot = request.nextUrl.searchParams.has("root");
		const filePath = request.nextUrl.searchParams.get("file") || "";

		const isProd = process.env.NODE_ENV === 'production';

		// In production, try to get files from blob storage
		if (isProd) {
			try {
				// Check if we have this app in the database
				const app = await getGeneratedAppByName(name);
				if (app) {
					const blobStorage = new BlobStorage();

					// If we need the full directory structure
					if (isRoot) {
						const files = await blobStorage.listFiles(name);

						// Convert the blob files to the expected file structure
						const fileStructure: Record<string, any> = {};

						for (const file of files) {
							const pathParts = file.pathname.split('/');
							let current = fileStructure;

							// Build the nested directory structure
							for (let i = 0; i < pathParts.length - 1; i++) {
								const part = pathParts[i];
								current[part] = current[part] || {};

								if (!current[part].kind) {
									current[part].kind = "directory";
									current[part].directory = {};
								}

								current = current[part].directory;
							}

							// Add the file to the structure
							const fileName = pathParts[pathParts.length - 1];
							if (fileName) {
								// Fetch the actual file content
								const response = await fetch(file.url);
								const content = await response.text();

								current[fileName] = {
									kind: "file",
									file: { contents: content }
								};
							}
						}

						return NextResponse.json(fileStructure);
					}

					// If we need a specific file, we can directly fetch it from Blob Storage
					if (filePath) {
						const files = await blobStorage.listFiles(name);
						const file = files.find(f => f.pathname === normalizeFilePath(filePath));

						if (file) {
							const response = await fetch(file.url);
							const content = await response.text();
							return NextResponse.json({ content });
						}
					}
				}
			} catch (error) {
				console.error('Error accessing blob storage:', error);
				// Fallback to local files in case of error
			}
		}

		// Fall back to local filesystem for dev or if blob storage fails
		const appPath = path.join(APP_STORAGE_PATH, name);

		// Check if the app directory exists
		try {
			await fs.access(appPath);
		} catch {
			return NextResponse.json({ error: "App not found" }, { status: 404 });
		}

		// Return the full directory structure for the root
		if (isRoot) {
			const entries = await readDirectoryStructure(appPath);
			return NextResponse.json(entries);
		}

		// Return the content of a specific file
		if (filePath) {
			const fullPath = path.join(appPath, filePath);

			// Validate the path to prevent directory traversal
			if (!isSubPath(appPath, fullPath)) {
				return NextResponse.json(
					{ error: "Invalid file path" },
					{ status: 400 }
				);
			}

			try {
				const content = await fs.readFile(fullPath, "utf-8");
				return NextResponse.json({ content });
			} catch (error) {
				return NextResponse.json(
					{ error: "File not found" },
					{ status: 404 }
				);
			}
		}

		// List the directory contents
		const entries = await fs.readdir(appPath, { withFileTypes: true });
		const files = entries.map((entry) => ({
			name: entry.name,
			type: entry.isDirectory() ? "directory" : "file",
		}));

		return NextResponse.json({ files });
	} catch (error) {
		console.error("Error in files API:", error);
		return NextResponse.json(
			{ error: "Server error" },
			{ status: 500 }
		);
	}
}

/**
 * Read directory structure recursively
 */
async function readDirectoryStructure(dirPath: string): Promise<Record<string, any>> {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	const result: Record<string, any> = {};

	for (const entry of entries) {
		const entryPath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			result[entry.name] = {
				kind: "directory",
				directory: await readDirectoryStructure(entryPath),
			};
		} else {
			const contents = await fs.readFile(entryPath, "utf-8");
			result[entry.name] = {
				kind: "file",
				file: { contents },
			};
		}
	}

	return result;
}

/**
 * Check if childPath is a subpath of parentPath
 */
function isSubPath(parentPath: string, childPath: string): boolean {
	const relativePath = path.relative(parentPath, childPath);
	return !!relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}
