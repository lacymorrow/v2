import type { GeneratedApp } from '@/types/app';
import { exec } from 'child_process';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GenerateAppOptions {
	prompt: string;
	name: string;
	template?: 'react' | 'next';
	onProgress?: (step: string, progress: number) => void;
}

export const APP_STORAGE_PATH = process.env.APP_STORAGE_PATH
	? path.join(process.cwd(), process.env.APP_STORAGE_PATH)
	: path.join(process.cwd(), 'generated-apps');

export const STATIC_BUILDS_PATH = process.env.STATIC_BUILDS_PATH
	? path.join(process.cwd(), process.env.STATIC_BUILDS_PATH)
	: path.join(process.cwd(), 'public', 'builds');

// Pre-built node_modules path
const TEMPLATE_PATH = path.join(process.cwd(), 'vite-project');
const CACHED_MODULES_PATH = path.join(TEMPLATE_PATH, 'node_modules');

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

		// Copy template files
		notify("Copying template", 30);
		await fs.cp(TEMPLATE_PATH, appPath, {
			recursive: true,
			filter: (src) => !src.includes('node_modules') && !src.includes('.git'),
		});

		// Install dependencies
		notify("Installing dependencies", 50);
		const { stdout: installOutput } = await execAsync('pnpm install --prefer-offline', {
			cwd: appPath,
			env: {
				...process.env,
				NODE_ENV: 'production',
			},
		});
		console.log('Install output:', installOutput);

		// Build project
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

		// Verify dist directory exists
		const distPath = path.join(appPath, 'dist');
		const distExists = await fs.access(distPath).then(() => true).catch(() => false);
		if (!distExists) {
			throw new Error('Build failed: dist directory not created');
		}

		// Copy build files and cleanup
		notify("Finalizing", 90);
		await fs.mkdir(buildPath, { recursive: true });
		await fs.cp(distPath, buildPath, { recursive: true });
		await fs.rm(appPath, { recursive: true, force: true });

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
