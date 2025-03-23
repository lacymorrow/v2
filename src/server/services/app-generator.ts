import type { GeneratedApp } from '@/types/app';
import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface GenerateAppOptions {
	prompt: string;
	name: string;
	template?: 'react' | 'next';
	onProgress?: (step: string, progress: number) => void;
}

// For production (serverless) environments, use /tmp directory which is writable
// For local development, use the paths within the project
export const APP_STORAGE_PATH = process.env.NODE_ENV === 'production'
	? path.join('/tmp', 'generated-apps')
	: process.env.APP_STORAGE_PATH
		? path.join(process.cwd(), process.env.APP_STORAGE_PATH)
		: path.join(process.cwd(), 'public', 'generated-apps');

export const STATIC_BUILDS_PATH = process.env.NODE_ENV === 'production'
	? path.join('/tmp', 'builds')
	: process.env.STATIC_BUILDS_PATH
		? path.join(process.cwd(), process.env.STATIC_BUILDS_PATH)
		: path.join(process.cwd(), 'public', 'builds');

// Pre-built node_modules path - this should still be in the project directory in both environments
const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'vite-project');
const CACHED_MODULES_PATH = path.join(TEMPLATE_PATH, 'node_modules');

// Files to exclude when copying template
const EXCLUDE_FROM_TEMPLATE = [
	// Dependencies and package management
	'node_modules',
	'pnpm-lock.yaml',
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
	return EXCLUDE_FROM_TEMPLATE.some(pattern => src.includes(pattern));
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
	};

	try {
		// Ensure clean state
		await fs.rm(appPath, { recursive: true, force: true });
		await fs.rm(buildPath, { recursive: true, force: true });

		// Create directories in parallel
		notify("Creating directories", 10);
		await Promise.all([
			fs.mkdir(APP_STORAGE_PATH, { recursive: true }),
			fs.mkdir(STATIC_BUILDS_PATH, { recursive: true }),
			fs.mkdir(appPath, { recursive: true }),
		]);

		// Copy template files (excluding node_modules and other unnecessary files)
		notify("Copying template", 30);
		await fs.cp(TEMPLATE_PATH, appPath, {
			recursive: true,
			filter: (src) => !shouldExclude(src),
		});

		// Use cached node_modules if available
		notify("Setting up dependencies", 40);
		const appModulesPath = path.join(appPath, 'node_modules');
		const hasCachedModules = await fs.access(CACHED_MODULES_PATH).then(() => true).catch(() => false);

		if (hasCachedModules) {
			console.log('Using cached node_modules');
			await fs.cp(CACHED_MODULES_PATH, appModulesPath, { recursive: true });
			// Quick install to ensure everything is linked correctly
			await execAsync('pnpm install --prefer-offline --no-frozen-lockfile', {
				cwd: appPath,
				env: { ...process.env, NODE_ENV: 'production' },
			});
		} else {
			console.log('No cached node_modules, performing full install');
			await execAsync('pnpm install --prefer-offline', {
				cwd: appPath,
				env: { ...process.env, NODE_ENV: 'production' },
			});
		}

		// Build project with optimizations
		notify("Building project", 70);
		const { stdout: buildOutput } = await execAsync('pnpm build', {
			cwd: appPath,
			env: {
				...process.env,
				NODE_ENV: 'production',
				VITE_FAST_BUILD: 'true',
			},
		});
		console.log('Build output:', buildOutput);

		// Verify and copy build
		const distPath = path.join(appPath, 'dist');
		const distExists = await fs.access(distPath).then(() => true).catch(() => false);
		if (!distExists) {
			throw new Error('Build failed: dist directory not created');
		}

		// Copy build files but keep source
		notify("Finalizing", 90);
		await fs.mkdir(buildPath, { recursive: true });
		await fs.cp(distPath, buildPath, { recursive: true });

		app.status = 'ready';
		notify("Complete", 100);
	} catch (error) {
		console.error('Error generating app:', error);
		// Cleanup on error
		await Promise.all([
			fs.rm(appPath, { recursive: true, force: true }).catch(() => { }),
			fs.rm(buildPath, { recursive: true, force: true }).catch(() => { }),
		]);

		app.status = 'error';
		app.error = error instanceof Error ? error.message : 'Unknown error';
		throw error;
	}

	return app;
}
