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
	const name = params.name;
	const root = request.nextUrl.searchParams.get("root") === "true";

	try {
		const blobStorage = new BlobStorage("generated-apps");

		// Check for files in blob storage first
		try {
			const blobFiles = await blobStorage.listFiles(name);

			if (blobFiles.length > 0) {
				console.log(`Found ${blobFiles.length} files in blob storage for ${name}`);

				// Build file structure from blob URLs
				const fileStructure: Record<string, any> = {};

				for (const blobFile of blobFiles) {
					const { pathname, url } = blobFile;

					if (root) {
						// Build path to this file
						const pathParts = pathname.split("/");
						let current = fileStructure;

						for (let i = 0; i < pathParts.length - 1; i++) {
							const part = pathParts[i];
							if (!current[part]) {
								current[part] = {
									kind: "directory",
									directory: {}
								};
							}
							current = current[part].directory;
						}

						// Add file entry with URL reference
						const fileName = pathParts[pathParts.length - 1];
						current[fileName] = {
							kind: "file",
							file: {
								contents: `// This file will be loaded from Blob Storage: ${url}`
							},
							blobUrl: url
						};
					} else if (pathname === name) {
						// If specific file requested, fetch and return it
						const response = await fetch(url);
						const content = await response.text();
						return NextResponse.json({ content });
					}
				}

				if (root) {
					return NextResponse.json(fileStructure);
				}
			}
		} catch (error) {
			console.warn("Error accessing blob storage:", error);
			// Fall back to local filesystem
		}

		// Fall back to local file system
		const basePath = path.join(process.cwd(), "public", "builds", name);

		if (root) {
			// Return entire file structure for mounting
			const structure = await buildFileStructure(basePath);
			return NextResponse.json(structure);
		}

		// Return specific file
		const filePath = path.join(basePath, name);
		const content = await fs.readFile(filePath, "utf-8");
		return NextResponse.json({ content });
	} catch (error) {
		console.error(`Error serving files for ${name}:`, error);
		return NextResponse.json(
			{ error: `Failed to load files: ${error instanceof Error ? error.message : String(error)}` },
			{ status: 500 }
		);
	}
}

/**
 * A promise with timeout capability
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error(errorMessage));
		}, timeoutMs);

		promise
			.then(result => {
				clearTimeout(timeoutId);
				resolve(result);
			})
			.catch(err => {
				clearTimeout(timeoutId);
				reject(err);
			});
	});
}

// Helper to build file structure from local filesystem
async function buildFileStructure(dirPath: string): Promise<Record<string, any>> {
	const result: Record<string, any> = {};
	const DIRECTORY_READ_TIMEOUT = 5000; // 5 seconds
	const FILE_READ_TIMEOUT = 2000; // 2 seconds

	try {
		// Add timeout to directory reading
		const entries = await withTimeout(
			fs.readdir(dirPath, { withFileTypes: true }),
			DIRECTORY_READ_TIMEOUT,
			`Timeout reading directory ${dirPath}`
		);

		for (const entry of entries) {
			const entryPath = path.join(dirPath, entry.name);

			// Skip node_modules to prevent freezing
			if (entry.name === 'node_modules') {
				result[entry.name] = {
					kind: "directory",
					directory: { "...": { kind: "file", file: { contents: "Directory contents omitted for performance" } } }
				};
				continue;
			}

			if (entry.isDirectory()) {
				try {
					result[entry.name] = {
						kind: "directory",
						directory: await buildFileStructure(entryPath)
					};
				} catch (error) {
					// If a subdirectory times out, just note it and continue
					console.warn(`Error processing directory ${entryPath}: ${error}`);
					result[entry.name] = {
						kind: "directory",
						directory: { "error.txt": { kind: "file", file: { contents: `Error: ${error instanceof Error ? error.message : String(error)}` } } }
					};
				}
			} else {
				try {
					// Add timeout to file reading
					const content = await withTimeout(
						fs.readFile(entryPath, "utf-8"),
						FILE_READ_TIMEOUT,
						`Timeout reading file ${entryPath}`
					);
					result[entry.name] = {
						kind: "file",
						file: {
							contents: content
						}
					};
				} catch (error) {
					console.warn(`Error reading file ${entryPath}: ${error}`);
					result[entry.name] = {
						kind: "file",
						file: {
							contents: `Error reading file: ${error instanceof Error ? error.message : String(error)}`
						}
					};
				}
			}
		}
	} catch (error) {
		console.error(`Error building file structure for ${dirPath}:`, error);
		// Return at least some information to the client
		result["error.txt"] = {
			kind: "file",
			file: {
				contents: `Error processing directory: ${error instanceof Error ? error.message : String(error)}`
			}
		};
	}

	return result;
}

/**
 * Read directory structure recursively
 */
async function readDirectoryStructure(dirPath: string): Promise<Record<string, any>> {
	const result: Record<string, any> = {};
	const DIRECTORY_READ_TIMEOUT = 5000; // 5 seconds
	const FILE_READ_TIMEOUT = 2000; // 2 seconds

	try {
		const entries = await withTimeout(
			fs.readdir(dirPath, { withFileTypes: true }),
			DIRECTORY_READ_TIMEOUT,
			`Timeout reading directory ${dirPath}`
		);

		for (const entry of entries) {
			const entryPath = path.join(dirPath, entry.name);

			// Skip node_modules to prevent freezing
			if (entry.name === 'node_modules') {
				result[entry.name] = {
					kind: "directory",
					directory: { "...": { kind: "file", file: { contents: "Directory contents omitted for performance" } } }
				};
				continue;
			}

			if (entry.isDirectory()) {
				try {
					result[entry.name] = {
						kind: "directory",
						directory: await readDirectoryStructure(entryPath),
					};
				} catch (error) {
					console.warn(`Error processing directory ${entryPath}: ${error}`);
					result[entry.name] = {
						kind: "directory",
						directory: { "error.txt": { kind: "file", file: { contents: `Error: ${error instanceof Error ? error.message : String(error)}` } } }
					};
				}
			} else {
				try {
					const contents = await withTimeout(
						fs.readFile(entryPath, "utf-8"),
						FILE_READ_TIMEOUT,
						`Timeout reading file ${entryPath}`
					);
					result[entry.name] = {
						kind: "file",
						file: { contents },
					};
				} catch (error) {
					console.warn(`Error reading file ${entryPath}: ${error}`);
					result[entry.name] = {
						kind: "file",
						file: { contents: `Error reading file: ${error instanceof Error ? error.message : String(error)}` }
					};
				}
			}
		}
	} catch (error) {
		console.error(`Error reading directory structure for ${dirPath}:`, error);
		result["error.txt"] = {
			kind: "file",
			file: { contents: `Error processing directory: ${error instanceof Error ? error.message : String(error)}` }
		};
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
