import { APP_STORAGE_PATH } from "./app-generator";
import fs from "fs/promises";
import { join } from "path";

export async function readFileContent(projectName: string, filePath: string) {
	try {
		const fullPath = join(APP_STORAGE_PATH, projectName, filePath);
		return await fs.readFile(fullPath, "utf-8");
	} catch (error) {
		console.error("Failed to read file:", error);
		return "// Failed to read file contents";
	}
}
