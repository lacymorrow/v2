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
}

// Use path.join for cross-platform compatibility
export const APP_STORAGE_PATH = process.env.APP_STORAGE_PATH
	? path.join(process.cwd(), process.env.APP_STORAGE_PATH)
	: path.join(process.cwd(), 'generated-apps');

export const STATIC_BUILDS_PATH = process.env.STATIC_BUILDS_PATH
	? path.join(process.cwd(), process.env.STATIC_BUILDS_PATH)
	: path.join(process.cwd(), 'public', 'builds');

export async function generateApp({ prompt, name, template = 'react' }: GenerateAppOptions): Promise<GeneratedApp> {
	console.log(`\n🚀 Starting app generation for "${name}"`);
	console.log(`📝 Template: ${template}`);
	console.log(`🔍 Prompt: ${prompt}`);

	const appId = crypto.randomUUID();
	const appPath = path.join(APP_STORAGE_PATH, name);
	const buildPath = path.join(STATIC_BUILDS_PATH, name);
	const publicUrl = `/builds/${name}/index.html`;  // Add index.html to the URL

	// Create initial app metadata
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
		// Ensure directories exist
		console.log('📂 Creating directories...');
		await fs.mkdir(APP_STORAGE_PATH, { recursive: true });
		await fs.mkdir(STATIC_BUILDS_PATH, { recursive: true });

		// Copy template files
		console.log('📋 Copying template files...');
		await fs.cp(path.join(process.cwd(), 'vite-project'), appPath, {
			recursive: true,
			filter: (src) => !src.includes('node_modules') && !src.includes('.git'),
		});

		// Install dependencies
		console.log('📦 Installing dependencies...');
		const installStart = Date.now();
		const { stdout: installOutput } = await execAsync('pnpm install', { cwd: appPath });
		console.log(`✅ Dependencies installed in ${((Date.now() - installStart) / 1000).toFixed(2)}s`);
		console.log(installOutput);

		// Build the app
		console.log('🏗️ Building static files...');
		const buildStart = Date.now();
		const { stdout: buildOutput } = await execAsync('pnpm build', { cwd: appPath });
		console.log(`✅ Build completed in ${((Date.now() - buildStart) / 1000).toFixed(2)}s`);
		console.log(buildOutput);

		// Copy build output to public directory
		console.log('📦 Copying build files to static hosting...');
		await fs.cp(
			path.join(appPath, 'dist'),
			buildPath,
			{ recursive: true }
		);

		// Cleanup source files (optional)
		console.log('🧹 Cleaning up source files...');
		await fs.rm(appPath, { recursive: true, force: true });

		app.status = 'ready';
		console.log('✨ App generation completed successfully!');
	} catch (error) {
		console.error('❌ Error generating app:', error);
		app.status = 'error';
		app.error = error instanceof Error ? error.message : 'Unknown error';
	}

	return app;
}
