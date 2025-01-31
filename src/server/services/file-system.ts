import fs from "node:fs/promises";
import path from "node:path";
import { APP_STORAGE_PATH } from "./app-generator";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface TreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	children: Record<string, TreeNode>;
}

/**
 * Recursively builds a file tree from a directory
 */
async function buildFileTree(dirPath: string, relativePath = ""): Promise<TreeNode> {
	console.log(`Building file tree for directory: ${dirPath}`);
	console.log(`Relative path: ${relativePath}`);

	const name = path.basename(dirPath);
	const node: TreeNode = {
		name,
		path: relativePath,
		type: "directory",
		children: {},
	};

	try {
		// Create directory if it doesn't exist
		await fs.mkdir(dirPath, { recursive: true });
		console.log(`Reading directory contents: ${dirPath}`);
		const entries = await fs.readdir(dirPath, { withFileTypes: true });
		console.log(`Found ${entries.length} entries in ${dirPath}`);

		for (const entry of entries) {
			const childPath = path.join(dirPath, entry.name);
			const childRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

			console.log(`Processing entry: ${entry.name} (${entry.isDirectory() ? 'directory' : 'file'})`);
			console.log(`Child path: ${childPath}`);
			console.log(`Child relative path: ${childRelativePath}`);

			if (entry.isDirectory()) {
				node.children[entry.name] = await buildFileTree(childPath, childRelativePath);
			} else {
				node.children[entry.name] = {
					name: entry.name,
					path: childRelativePath,
					type: "file",
					children: {},
				};
			}
		}

		console.log(`Completed directory ${dirPath}, found children:`, Object.keys(node.children));
	} catch (error) {
		console.error(`Error building file tree for ${dirPath}:`, error);
		console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
		// Return empty directory node on error
		return node;
	}

	return node;
}

/**
 * Gets the file tree for a project
 */
export async function getProjectFileTree(projectName: string): Promise<TreeNode> {
	console.log(`Getting file tree for project: ${projectName}`);
	const projectPath = path.join(APP_STORAGE_PATH, projectName);
	console.log(`Full project path: ${projectPath}`);

	try {
		const exists = await fs.access(projectPath).then(() => true).catch(() => false);
		console.log(`Project directory exists: ${exists}`);

		if (exists) {
			const stats = await fs.stat(projectPath);
			console.log(`Project directory stats:`, {
				isDirectory: stats.isDirectory(),
				size: stats.size,
				created: stats.birthtime,
				modified: stats.mtime
			});
		}
	} catch (error) {
		console.error(`Error checking project directory:`, error);
	}

	const tree = await buildFileTree(projectPath);
	console.log(`Complete file tree for ${projectName}:`, JSON.stringify(tree, null, 2));
	return tree;
}

/**
 * Reads a file from a project
 */
export async function readProjectFile(projectName: string, filePath: string): Promise<string> {
	const fullPath = path.join(APP_STORAGE_PATH, projectName, filePath);
	try {
		return await fs.readFile(fullPath, "utf-8");
	} catch (error) {
		console.error(`Failed to read file ${filePath}:`, error);
		throw new Error(`Failed to read file ${filePath}`);
	}
}

/**
 * Writes a file to a project and triggers a rebuild
 */
export async function writeProjectFile(projectName: string, filePath: string, content: string): Promise<void> {
	const projectPath = path.join(APP_STORAGE_PATH, projectName);
	const fullPath = path.join(projectPath, filePath);

	try {
		// Ensure the project exists and has the correct structure
		const projectExists = await fs.access(projectPath).then(() => true).catch(() => false);
		if (!projectExists) {
			throw new Error(`Project ${projectName} does not exist. Please generate the project first.`);
		}

		// Create directory structure if needed
		await fs.mkdir(path.dirname(fullPath), { recursive: true });

		// Write the file
		await fs.writeFile(fullPath, content);

		// Trigger a rebuild
		console.log(`Rebuilding project ${projectName}...`);
		const { stdout: buildOutput } = await execAsync('pnpm build', {
			cwd: projectPath,
			env: {
				...process.env,
				NODE_ENV: 'production',
				VITE_FAST_BUILD: 'true',
			},
		});
		console.log('Build output:', buildOutput);

		// Copy the new build to the static builds directory
		const distPath = path.join(projectPath, 'dist');
		const buildPath = path.join(process.cwd(), 'public', 'builds', projectName);
		await fs.mkdir(buildPath, { recursive: true });
		await fs.cp(distPath, buildPath, { recursive: true });

	} catch (error) {
		console.error(`Failed to write and rebuild file ${filePath}:`, error);
		throw new Error(`Failed to write and rebuild file ${filePath}`);
	}
}

/**
 * Deletes a file from a project
 */
export async function deleteProjectFile(projectName: string, filePath: string): Promise<void> {
	const fullPath = path.join(APP_STORAGE_PATH, projectName, filePath);
	try {
		await fs.unlink(fullPath);
	} catch (error) {
		console.error(`Failed to delete file ${filePath}:`, error);
		throw new Error(`Failed to delete file ${filePath}`);
	}
}

