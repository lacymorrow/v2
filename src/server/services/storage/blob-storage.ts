import { del, list, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * BlobStorage service for storing and retrieving files in Vercel Blob Storage
 * Used for persisting generated app files across serverless function invocations
 */
export class BlobStorage {
	private readonly prefix: string;
	private readonly isTokenValid: boolean;

	constructor(prefix = "generated-apps") {
		this.prefix = prefix;
		// Check if we have a valid token
		this.isTokenValid = !!process.env.BLOB_READ_WRITE_TOKEN &&
			process.env.BLOB_READ_WRITE_TOKEN !== "null" &&
			process.env.BLOB_READ_WRITE_TOKEN !== "";

		if (!this.isTokenValid) {
			console.warn("BLOB_READ_WRITE_TOKEN is not set or is invalid. Blob storage operations will be skipped.");
		}
	}

	/**
	 * Upload a file to Blob Storage
	 * @param filePath Relative path of the file within the app
	 * @param content File content as string
	 * @param appName The app's name
	 * @returns URL of the uploaded blob
	 */
	async uploadFile(filePath: string, content: string | Buffer, appName: string): Promise<string> {
		if (!this.isTokenValid) {
			return `/builds/${appName}/${this.normalizePath(filePath)}`;
		}

		const normalizedPath = this.normalizePath(filePath);
		const blobPath = `${this.prefix}/${appName}/${normalizedPath}`;

		try {
			const contentType = this.getContentType(normalizedPath);

			// Use Buffer for binary content types
			const contentToUpload = typeof content === "string" ? content : content;

			const blob = await put(blobPath, contentToUpload, {
				contentType,
				access: "public",
			});

			return blob.url;
		} catch (error) {
			console.error(`Error uploading file ${blobPath}:`, error);
			throw new Error(
				`Failed to upload file to blob storage: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Upload a directory to Blob Storage recursively
	 * @param dirPath Local directory path
	 * @param appName The app's name
	 * @returns Map of file paths to their blob URLs
	 */
	async uploadDirectory(dirPath: string, appName: string): Promise<Map<string, string>> {
		const results = new Map<string, string>();

		// If no valid token, return local paths
		if (!this.isTokenValid) {
			try {
				const entries = await fs.readdir(dirPath, { withFileTypes: true });
				for (const entry of entries) {
					if (!entry.isDirectory()) {
						const localPath = path.join(dirPath, entry.name).split(path.sep).join("/");
						const relativePath = localPath.replace(dirPath, "").replace(/^\/+/, "");
						results.set(relativePath, `/builds/${appName}/${relativePath}`);

						// Make sure to set index.html specially
						if (entry.name === "index.html") {
							results.set("index.html", `/builds/${appName}/index.html`);
						}
					}
				}
			} catch (error) {
				console.error(`Error creating local file map for ${dirPath}:`, error);
			}
			return results;
		}

		try {
			// Check if directory exists
			await fs.access(dirPath);

			// Recursively process directory
			await this.processDirectory(dirPath, appName, results, "");

			return results;
		} catch (error) {
			console.error(`Error uploading directory ${dirPath}:`, error);
			throw new Error(
				`Failed to upload directory to blob storage: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * List all files for a specific app
	 * @param appName The app's name
	 * @returns Array of blob objects
	 */
	async listFiles(appName: string): Promise<Array<{ url: string; pathname: string }>> {
		if (!this.isTokenValid) {
			console.warn("Skipping listFiles operation - no valid token");
			return [];
		}

		try {
			const blobs = await list({
				prefix: `${this.prefix}/${appName}/`,
			});

			return blobs.blobs.map((blob) => ({
				url: blob.url,
				pathname: blob.pathname.replace(`${this.prefix}/${appName}/`, ""),
			}));
		} catch (error) {
			console.error(`Error listing files for app ${appName}:`, error);
			throw new Error(
				`Failed to list files from blob storage: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Delete an app's files from Blob Storage
	 * @param appName The app's name
	 */
	async deleteApp(appName: string): Promise<void> {
		if (!this.isTokenValid) {
			console.warn("Skipping deleteApp operation - no valid token");
			return;
		}

		try {
			const blobs = await list({
				prefix: `${this.prefix}/${appName}/`,
			});

			// Delete all blobs for this app
			await Promise.all(blobs.blobs.map((blob) => del(blob.url)));
		} catch (error) {
			console.error(`Error deleting app ${appName}:`, error);
			throw new Error(
				`Failed to delete app from blob storage: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Get file URLs for WebContainer
	 * @param appName The app's name
	 * @returns Map of file paths to their blob URLs
	 */
	async getWebContainerUrls(appName: string): Promise<Map<string, string>> {
		const results = new Map<string, string>();

		if (!this.isTokenValid) {
			// Generate local URLs for development
			return this.getLocalUrls(appName);
		}

		try {
			const blobs = await list({
				prefix: `${this.prefix}/${appName}/`,
			});

			for (const blob of blobs.blobs) {
				const filePath = blob.pathname.replace(`${this.prefix}/${appName}/`, "");
				results.set(filePath, blob.url);
			}

			return results;
		} catch (error) {
			console.error(`Error getting URLs for app ${appName}:`, error);
			throw new Error(
				`Failed to get URLs from blob storage: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Generate local URLs for development environment
	 */
	private async getLocalUrls(appName: string): Promise<Map<string, string>> {
		const results = new Map<string, string>();
		const buildPath = path.join(process.cwd(), "public", "builds", appName);

		try {
			const files = await this.getFilesRecursively(buildPath);

			for (const file of files) {
				const relativePath = file.replace(buildPath, "").replace(/^\/+/, "");
				results.set(relativePath, `/builds/${appName}/${relativePath}`);
			}

			return results;
		} catch (error) {
			console.warn(`Error generating local URLs: ${error}`);
			return results;
		}
	}

	/**
	 * Get all files in a directory recursively
	 */
	private async getFilesRecursively(dir: string): Promise<string[]> {
		let files: string[] = [];

		try {
			const entries = await fs.readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					files = files.concat(await this.getFilesRecursively(fullPath));
				} else {
					files.push(fullPath);
				}
			}
		} catch (error) {
			console.error(`Error reading directory ${dir}:`, error);
		}

		return files;
	}

	/**
	 * Process directory recursively to upload all files
	 */
	private async processDirectory(
		dirPath: string,
		appName: string,
		results: Map<string, string>,
		relativePath: string
	): Promise<void> {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = path.join(dirPath, entry.name);
			const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

			if (entry.isDirectory()) {
				// Process subdirectory recursively
				await this.processDirectory(entryPath, appName, results, entryRelativePath);
			} else {
				// Upload file
				const content = await fs.readFile(entryPath);
				const url = await this.uploadFile(entryRelativePath, content, appName);
				results.set(entryRelativePath, url);
			}
		}
	}

	/**
	 * Get content type for a file based on its extension
	 */
	private getContentType(filePath: string): string {
		const ext = path.extname(filePath).toLowerCase();
		const contentTypes: Record<string, string> = {
			".html": "text/html",
			".css": "text/css",
			".js": "application/javascript",
			".json": "application/json",
			".png": "image/png",
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".gif": "image/gif",
			".svg": "image/svg+xml",
			".ico": "image/x-icon",
			".txt": "text/plain",
			".md": "text/markdown",
			".tsx": "text/plain",
			".ts": "text/plain",
			".jsx": "text/plain",
		};

		return contentTypes[ext] || "application/octet-stream";
	}

	/**
	 * Normalize file path to use forward slashes
	 */
	private normalizePath(filePath: string): string {
		return filePath.split(path.sep).join("/").replace(/^\/+/, "");
	}
}
