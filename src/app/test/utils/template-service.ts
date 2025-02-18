import fs from 'node:fs/promises';
import path from 'node:path';

export interface FileEntry {
	file: {
		contents: string;
	};
	kind: 'file';
}

export interface DirectoryEntry {
	directory: Record<string, FileEntry | DirectoryEntry>;
	kind: 'directory';
}

export type WebContainerFiles = Record<string, FileEntry | DirectoryEntry>;

const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', 'vite');

/**
 * Recursively builds a directory entry for WebContainer
 */
async function buildDirectoryEntry(dirPath: string): Promise<DirectoryEntry> {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	const directory: Record<string, FileEntry | DirectoryEntry> = {};

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);

		// Skip node_modules and hidden directories
		if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
			continue;
		}

		if (entry.isDirectory()) {
			directory[entry.name] = await buildDirectoryEntry(fullPath);
		} else {
			try {
				const contents = await fs.readFile(fullPath, 'utf-8');
				directory[entry.name] = {
					kind: 'file',
					file: {
						contents,
					},
				};
			} catch (error) {
				console.warn(`Failed to read file ${entry.name}:`, error);
			}
		}
	}

	return {
		kind: 'directory',
		directory,
	};
}

/**
 * Gets template files while maintaining directory structure
 */
export async function getTemplateFiles(templatePath: string = TEMPLATE_PATH): Promise<WebContainerFiles> {
	const rootEntry = await buildDirectoryEntry(templatePath);
	return rootEntry.directory;
}

