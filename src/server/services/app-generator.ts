import type { GeneratedApp } from '@/types/app';
import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import stream from 'node:stream'; // Import stream for piping

const execAsync = promisify(exec);
const pipelineAsync = promisify(stream.pipeline); // For piping streams

interface GenerateAppOptions {
	prompt: string;
	name: string;
	template?: 'react' | 'next';
	onProgress?: (step: string, progress: number) => void;
}

export const APP_STORAGE_PATH = process.env.APP_STORAGE_PATH
	? path.join(process.cwd(), process.env.APP_STORAGE_PATH)
	: path.join(process.cwd(), 'public', 'generated-apps');

export const STATIC_BUILDS_PATH = process.env.STATIC_BUILDS_PATH
	? path.join(process.cwd(), process.env.STATIC_BUILDS_PATH)
	: path.join(process.cwd(), 'public', 'builds');

// Pre-built node_modules path
const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'vite-project');
const CACHED_MODULES_PATH = path.join(TEMPLATE_PATH, 'node_modules');

// Files to exclude when copying template
const EXCLUDE_FROM_TEMPLATE = [
	// Dependencies and package management (KEEP pnpm-lock.yaml)
	'node_modules',
	// 'pnpm-lock.yaml', // Keep this file
	'package-lock.json',
	'yarn.lock',
	'bun.lockb',

	// Build outputs
	'dist',
	'build',
	'out',
	'.next',
	'.nuxt',
	'.output',

	// Cache and temp
	'.cache',
	'tmp',
	'temp',
	'.temp',
	'.tmp',

	// Dev tools and IDE
	'.git',
	'.svn',
	'.idea',
	'.vscode',
	'.DS_Store',
	'thumbs.db',
	'.turbo',

	// Test and coverage
	'coverage',
	'.nyc_output',
	'__tests__',
	'__snapshots__',

	// Logs and debug
	'*.log',
	'npm-debug.log*',
	'yarn-debug.log*',
	'yarn-error.log*',
	'pnpm-debug.log*',

	// Environment and secrets
	'.env*',
	'*.local',
];

function shouldExclude(src: string): boolean {
	// Check if the source path ends with any of the exclusion patterns
	const fileName = path.basename(src);
	return EXCLUDE_FROM_TEMPLATE.some(pattern => {
		if (pattern.startsWith('*.')) {
			// Handle wildcard extensions like *.log
			return fileName.endsWith(pattern.substring(1));
		}
		// Handle directory or exact file names
		return fileName === pattern || src.includes(path.sep + pattern + path.sep) || src.endsWith(path.sep + pattern);
	});
}

// Helper to run command and stream output
async function runCommand(command: string, cwd: string, env: NodeJS.ProcessEnv = process.env) {
	console.log(`Executing command in ${cwd}: ${command}`);
	const process = exec(command, { cwd, env });

	// Pipe stdout and stderr to current process's streams
	if (process.stdout) {
		await pipelineAsync(process.stdout, process.stdout).catch(err => console.error("Stdout pipe failed:", err));;
	}
	if (process.stderr) {
		await pipelineAsync(process.stderr, process.stderr).catch(err => console.error("Stderr pipe failed:", err));;
	}

	// Wait for the process to complete and return exit code
	return new Promise<number>((resolve, reject) => {
		process.on('close', (code) => {
			console.log(`Command "${command}" exited with code ${code}`);
			if (code === 0 || code === null) { // Allow null exit code (graceful exit)
				resolve(code ?? 0);
			} else {
				reject(new Error(`Command failed with exit code ${code}: ${command}`));
			}
		});
		process.on('error', (err) => {
			console.error(`Failed to execute command: ${command}`, err);
			reject(err);
		});
	});
}

export async function generateApp({
	prompt,
	name,
	template = 'react',
	onProgress,
}: GenerateAppOptions): Promise<GeneratedApp> {
	const notify = (step: string, progress: number) => {
		console.log(`${step}: ${progress}%`);
		onProgress?.(step, progress);
	};

	notify("Starting generation", 0);

	const appId = crypto.randomUUID();
	const appPath = path.join(APP_STORAGE_PATH, name);
	const buildPath = path.join(STATIC_BUILDS_PATH, name);
	const publicUrl = `/builds/${name}/index.html`;

	const app: GeneratedApp = {
		id: appId,
		prompt,
		template,
		createdAt: new Date(),
		publicUrl,
		status: 'generating',
		dependencies: [],
		error: undefined, // Ensure error is initially undefined
	};

	try {
		// Ensure clean state
		notify("Cleaning up previous artifacts", 5);
		await fs.rm(appPath, { recursive: true, force: true }).catch(() => { });
		await fs.rm(buildPath, { recursive: true, force: true }).catch(() => { });

		// Create directories in parallel
		notify("Creating directories", 10);
		await Promise.all([
			fs.mkdir(APP_STORAGE_PATH, { recursive: true }),
			fs.mkdir(STATIC_BUILDS_PATH, { recursive: true }),
			fs.mkdir(appPath, { recursive: true }),
		]);

		// Copy template files (including pnpm-lock.yaml)
		notify("Copying template", 30);
		console.log(`Copying template from ${TEMPLATE_PATH} to ${appPath}`);
		await fs.cp(TEMPLATE_PATH, appPath, {
			recursive: true,
			filter: (src) => {
				const exclude = shouldExclude(src);
				// console.log(`Filter: ${src} -> Exclude: ${exclude}`); // Debug logging for filter
				return !exclude;
			},
		});
		console.log('Template copied successfully.');

		// Use cached node_modules if available
		notify("Setting up dependencies", 40);
		const appModulesPath = path.join(appPath, 'node_modules');
		const hasCachedModules = await fs.access(CACHED_MODULES_PATH).then(() => true).catch(() => false);

		if (hasCachedModules) {
			console.log('Cached node_modules found. Copying...');
			await fs.cp(CACHED_MODULES_PATH, appModulesPath, { recursive: true });
			console.log('Cached node_modules copied.');
			// Quick install to ensure everything is linked correctly, using the lockfile
			notify("Running pnpm install (cached)", 50);
			// Use `pnpm install` which respects the lockfile by default
			await runCommand('pnpm install --prefer-offline', appPath, { ...process.env, NODE_ENV: 'production' });
		} else {
			console.log('No cached node_modules found. Performing full install...');
			notify("Running pnpm install (full)", 50);
			await runCommand('pnpm install --prefer-offline', appPath, { ...process.env, NODE_ENV: 'production' });
		}
		notify("Dependencies installed", 60);

		// Build project with optimizations
		notify("Building project", 70);
		const buildEnv = {
			...process.env,
			NODE_ENV: 'production',
			VITE_FAST_BUILD: 'true', // Ensure this is used by your build script if needed
		};
		await runCommand('pnpm build', appPath, buildEnv);
		notify("Project built", 85);

		// Verify and copy build
		const distPath = path.join(appPath, 'dist');
		const distExists = await fs.access(distPath).then(() => true).catch(() => false);
		if (!distExists) {
			console.error(`Build verification failed: dist directory not found at ${distPath}`);
			throw new Error('Build failed: dist directory not created');
		}
		console.log(`Build output found at ${distPath}`);

		// Copy build files but keep source
		notify("Finalizing build artifacts", 90);
		await fs.mkdir(buildPath, { recursive: true });
		await fs.cp(distPath, buildPath, { recursive: true });
		console.log(`Build artifacts copied to ${buildPath}`);

		app.status = 'ready';
		notify("Complete", 100);
	} catch (error) {
		console.error('Error generating app:', error);
		// Cleanup on error
		await Promise.all([
			fs.rm(appPath, { recursive: true, force: true }).catch((e) => console.error("Cleanup failed for appPath:", e)),
			fs.rm(buildPath, { recursive: true, force: true }).catch((e) => console.error("Cleanup failed for buildPath:", e)),
		]);

		app.status = 'error';
		app.error = error instanceof Error ? error.message : 'Unknown error occurred during generation.';
		// Do not re-throw here, return the app object with error status
	}

	return app;
}
