import { del, list, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * BlobStorage service for storing and retrieving files in Vercel Blob Storage
 * Used for persisting generated app files across serverless function invocations
 */
export class BlobStorage {
    private readonly prefix: string;

    constructor(prefix = "generated-apps") {
        this.prefix = prefix;
    }

    /**
     * Upload a file to Blob Storage
     * @param filePath Relative path of the file within the app
     * @param content File content as string
     * @param appName The app's name
     * @returns URL of the uploaded blob
     */
    async uploadFile(filePath: string, content: string | Buffer, appName: string): Promise<string> {
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
