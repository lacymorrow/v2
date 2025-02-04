import fs from 'node:fs/promises';
import path from 'node:path';

// Files that should be transformed into a WebContainer-compatible format
const TEMPLATE_PATH = path.join(process.cwd(), 'templates/vite');

export interface FileEntry {
	file: Record<string, any>;
	kind: 'file';
}

export interface DirectoryEntry {
	directory: Record<string, FileEntry | DirectoryEntry>;
	kind: 'directory';
}

export type WebContainerFiles = Record<string, FileEntry | DirectoryEntry>;

/**
 * Reads a directory and returns a WebContainer-compatible file structure
 */
export async function getTemplateFiles(templatePath: string = TEMPLATE_PATH): Promise<WebContainerFiles> {
	const files: WebContainerFiles = {};

	async function processDirectory(currentPath: string, currentFiles: WebContainerFiles) {
		const entries = await fs.readdir(currentPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(currentPath, entry.name);
			const relativePath = path.relative(templatePath, fullPath);

			if (entry.isDirectory()) {
				// Skip node_modules and other unnecessary directories
				if (entry.name === 'node_modules' || entry.name === '.git') {
					continue;
				}

				const directory: DirectoryEntry = {
					kind: 'directory',
					directory: {}
				};

				await processDirectory(fullPath, directory.directory);
				currentFiles[entry.name] = directory;
			} else {
				// Read file content
				const content = await fs.readFile(fullPath, 'utf-8');
				currentFiles[entry.name] = {
					kind: 'file',
					file: {
						contents: content
					}
				};
			}
		}
	}

	await processDirectory(templatePath, files);
	return files;
}

/**
 * Transforms the template files for a specific project
 */
export async function transformTemplateFiles(projectName: string): Promise<WebContainerFiles> {
	const files = await getTemplateFiles();

	// Transform package.json
	if ('package.json' in files) {
		const packageJson = JSON.parse((files['package.json'] as FileEntry).file.contents);
		packageJson.name = projectName;
		(files['package.json'] as FileEntry).file.contents = JSON.stringify(packageJson, null, 2);
	}

	return files;
}
