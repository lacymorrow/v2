import fs from "fs/promises";
import path from "path";

// Base directory for all file operations
const BASE_DIR = process.cwd();

/**
 * Read a file's contents
 */
export async function readFile(filePath: string): Promise<string> {
	const fullPath = path.join(BASE_DIR, filePath);
	try {
		return await fs.readFile(fullPath, "utf-8");
	} catch (error) {
		console.error(`Failed to read file ${filePath}:`, error);
		throw new Error(`Failed to read file ${filePath}`);
	}
}

/**
 * Edit a file's contents
 */
export async function editFile(filePath: string, content: string): Promise<void> {
	const fullPath = path.join(BASE_DIR, filePath);
	try {
		// Ensure the directory exists
		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, content);
	} catch (error) {
		console.error(`Failed to edit file ${filePath}:`, error);
		throw new Error(`Failed to edit file ${filePath}`);
	}
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
	const fullPath = path.join(BASE_DIR, filePath);
	try {
		await fs.unlink(fullPath);
	} catch (error) {
		console.error(`Failed to delete file ${filePath}:`, error);
		throw new Error(`Failed to delete file ${filePath}`);
	}
}

/**
 * List files in a directory
 */
export async function listFiles(dirPath: string): Promise<string[]> {
	const fullPath = path.join(BASE_DIR, dirPath);
	try {
		return await fs.readdir(fullPath);
	} catch (error) {
		console.error(`Failed to list files in ${dirPath}:`, error);
		throw new Error(`Failed to list files in ${dirPath}`);
	}
}
