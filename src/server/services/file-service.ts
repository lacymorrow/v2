import { APP_STORAGE_PATH } from "./app-generator";
import fs from "fs/promises";
import { join } from "path";

export async function readFileContent(projectName: string, filePath: string) {
	try {
		const fullPath = join(APP_STORAGE_PATH, projectName, filePath);
		const exists = await fs.access(fullPath).then(() => true).catch(() => false);

		if (!exists) {
			return `// File not found: ${filePath}`;
		}

		const content = await fs.readFile(fullPath, "utf-8");
		return content || `// Empty file: ${filePath}`;
	} catch (error) {
		console.error("Failed to read file:", error);
		return `// Error reading file: ${filePath}\n// ${error instanceof Error ? error.message : 'Unknown error'}`;
	}
}
