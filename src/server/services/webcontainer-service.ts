import type { WebContainer, FileSystemTree } from '@webcontainer/api';
import type { FileEntry, WebContainerFiles } from './template-service';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * Check if WebContainer is currently booted
 */
export function isWebContainerBooted(): boolean {
	return webcontainerInstance !== null;
}

/**
 * Initialize and return a WebContainer instance
 */
export async function getWebContainer(): Promise<WebContainer> {
	if (webcontainerInstance) {
		console.log('🔄 Reusing existing WebContainer instance');
		return webcontainerInstance;
	}

	// If already booting, return the existing promise
	if (bootPromise) {
		console.log('⏳ WebContainer is currently booting, waiting...');
		return bootPromise;
	}

	console.log('🚀 Starting WebContainer boot process...');

	// Create a new boot promise
	bootPromise = (async () => {
		try {
			// Ensure we're in a browser environment
			if (typeof window === 'undefined') {
				throw new Error('WebContainer can only be initialized in a browser environment');
			}

			console.log('📦 Loading WebContainer API...');
			const { WebContainer } = await import('@webcontainer/api');

			console.log('⚡ Booting WebContainer...');
			const instance = await WebContainer.boot({
				workdirName: 'my-project',
				// Ensure proper isolation
				coep: 'require-corp',
			});

			// Test if the instance is properly initialized
			if (!instance || typeof instance.spawn !== 'function') {
				throw new Error('WebContainer failed to initialize properly');
			}

			console.log('✅ WebContainer booted successfully');
			webcontainerInstance = instance;
			return instance;
		} catch (error) {
			console.error('❌ Failed to boot WebContainer:', error);
			// Clear the boot promise so we can try again
			bootPromise = null;
			webcontainerInstance = null;
			throw error;
		}
	})();

	return bootPromise;
}

/**
 * Install dependencies in the WebContainer
 */
export async function installDependencies(container: WebContainer): Promise<void> {
	if (!container || typeof container.spawn !== 'function') {
		throw new Error('Invalid WebContainer instance provided');
	}

	console.log('📦 Starting dependency installation...');

	try {
		// First, check if package.json exists
		const packageJson = await container.fs.readFile('package.json', 'utf-8');
		console.log('📄 package.json contents:', packageJson);

		// Create a clean node_modules directory
		try {
			await container.fs.rm('node_modules', { recursive: true, force: true });
			console.log('🧹 Cleaned up existing node_modules');
		} catch (error) {
			console.log('No existing node_modules to clean up');
		}

		// Install with pnpm and handle peer dependencies
		console.log('📦 Installing dependencies with pnpm...');
		const installProcess = await container.spawn('pnpm', [
			'install',
			'--shamefully-hoist',
			'--strict-peer-dependencies=false'
		]);

		// Create a promise that resolves when the process exits
		const installPromise = new Promise<void>((resolve, reject) => {
			// Log the installation output
			installProcess.output.pipeTo(new WritableStream({
				write(data) {
					console.log('📦 [pnpm install]:', data);
				}
			}));

			installProcess.exit.then((code) => {
				if (code === 0) {
					resolve();
				} else {
					// If the first attempt fails, try again with legacy peer deps
					console.log('⚠️ First install attempt failed, trying with legacy peer deps...');
					container.spawn('pnpm', [
						'install',
						'--shamefully-hoist',
						'--strict-peer-dependencies=false',
						'--legacy-peer-deps'
					]).then((secondAttempt) => {
						secondAttempt.exit.then((secondCode) => {
							if (secondCode === 0) {
								resolve();
							} else {
								reject(new Error(`Installation failed with exit code ${secondCode}`));
							}
						});
					});
				}
			});
		});

		// Add a timeout
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Installation timed out after 60 seconds')), 60000);
		});

		// Wait for installation or timeout
		await Promise.race([installPromise, timeoutPromise]);
		console.log('✅ Dependencies installed successfully');

		// Start dev server with npm
		console.log('🚀 Starting development server with npm...');
	} catch (error) {
		console.error('❌ Error during dependency installation:', error);
		throw new Error('Failed to install dependencies');
	}
}

/**
 * Test server connectivity through WebContainer
 */
async function testServerConnectivity(container: WebContainer, port: string): Promise<boolean> {
	try {
		console.log('🔌 Testing server on port:', port);

		// Try using nc (netcat) to test the port
		const testProcess = await container.spawn('sh', ['-c', `echo -n > /dev/tcp/localhost/${port}`]);

		return new Promise((resolve) => {
			testProcess.exit.then((code) => {
				const isSuccess = code === 0;
				console.log(`${isSuccess ? '✅' : '❌'} Connection test ${isSuccess ? 'succeeded' : 'failed'} (exit code: ${code})`);
				resolve(isSuccess);
			});
		});
	} catch (error) {
		console.error('❌ Connection test failed:', error);
		return false;
	}
}

/**
 * Start the development server in the WebContainer
 */
export async function startDevServer(container: WebContainer): Promise<string> {
	if (!container || typeof container.spawn !== 'function') {
		throw new Error('Invalid WebContainer instance provided');
	}

	console.log('🚀 Starting development server...');

	try {
		// Create a temporary Vite config
		const tempViteConfig = `
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		host: '0.0.0.0',
		port: 5174,
		strictPort: true,
		cors: {
			origin: '*',
			methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
			credentials: true
		},
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Resource-Policy': 'cross-origin'
		},
		hmr: {
			clientPort: 443,
			path: '/_hmr',
			timeout: 5000
		}
	}
});`;

		// Write the temporary config
		await container.fs.writeFile('vite.config.temp.ts', tempViteConfig);
		console.log('📝 Created temporary Vite config');

		// Start the dev server with the temporary config
		const serverProcess = await container.spawn('pnpm', [
			'run',
			'dev',
			'--',
			'--config',
			'vite.config.temp.ts'
		]);

		let detectedPort: string | null = null;

		// Split the stream into two branches
		const [logStream, urlStream] = serverProcess.output.tee();

		// Log all server output
		logStream.pipeTo(new WritableStream({
			write(data) {
				console.log('🌐 [dev server]:', data);
			}
		}));

		return new Promise((resolve, reject) => {
			let hasResolved = false;
			let retryCount = 0;
			const MAX_RETRIES = 5;

			// Add a timeout for the entire server startup process
			const timeoutId = setTimeout(async () => {
				if (!hasResolved) {
					// Clean up temp config before rejecting
					try {
						await container.fs.rm('vite.config.temp.ts');
						console.log('🧹 Cleaned up temporary Vite config');
					} catch (error) {
						console.log('Failed to clean up temporary Vite config:', error);
					}
					reject(new Error('Server startup timed out after 30 seconds'));
				}
			}, 30000);

			// Listen for the server URL in the output
			urlStream.pipeTo(new WritableStream({
				async write(data: string) {
					if (hasResolved) return;

					console.log('🔍 Raw server output:', data);

					// Strip ANSI color codes and clean the output
					const cleanData = data.replace(/\x1B\[\d+m/g, '');
					console.log('🧹 Cleaned output:', cleanData);

					// Only detect port once to ensure consistency
					if (!detectedPort) {
						// Try to find Local URL first, then Network URL
						const localMatch = cleanData.match(/Local:\s+http:\/\/localhost:(\d+)/);
						if (localMatch?.[1]) {
							detectedPort = localMatch[1];
							console.log('📌 Detected port from Local URL:', detectedPort);
							testConnection();
						}
					}
				}
			}));

			// Function to test connectivity with retries
			async function testConnection() {
				if (hasResolved || !detectedPort) return;

				if (await testServerConnectivity(container, detectedPort)) {
					// Clean up temp config on success
					try {
						await container.fs.rm('vite.config.temp.ts');
						console.log('🧹 Cleaned up temporary Vite config');
					} catch (error) {
						console.log('Failed to clean up temporary Vite config:', error);
					}

					// Ensure we use the first detected port consistently
					const hostname = window.location.hostname.split('.')[0];
					const webContainerUrl = `https://${detectedPort}-${hostname}.preview.webcontainer.io`;
					console.log('🔗 Server is accessible at:', webContainerUrl);
					hasResolved = true;
					clearTimeout(timeoutId);
					resolve(webContainerUrl);
				} else if (retryCount < MAX_RETRIES) {
					retryCount++;
					console.log(`⏳ Retry ${retryCount}/${MAX_RETRIES} - waiting for server to be ready...`);
					setTimeout(testConnection, 1000);
				} else {
					// Clean up temp config on failure
					try {
						await container.fs.rm('vite.config.temp.ts');
						console.log('🧹 Cleaned up temporary Vite config');
					} catch (error) {
						console.log('Failed to clean up temporary Vite config:', error);
					}
					clearTimeout(timeoutId);
					reject(new Error('Server not responding after maximum retries'));
				}
			}
		});
	} catch (error) {
		console.error('❌ Error starting development server:', error);
		throw error;
	}
}

/**
 * Build the project in the WebContainer
 */
export async function buildProject(container: WebContainer): Promise<void> {
	const buildProcess = await container.spawn('pnpm', ['build']);

	const buildExitCode = await buildProcess.exit;

	if (buildExitCode !== 0) {
		throw new Error('Failed to build project');
	}
}

/**
 * Read a file from the WebContainer
 */
export async function getFileFromContainer(
	container: WebContainer,
	filePath: string
): Promise<string> {
	try {
		const file = await container.fs.readFile(filePath, 'utf-8');
		return file;
	} catch (error) {
		console.error(`Error reading file ${filePath}:`, error);
		throw error;
	}
}

/**
 * Write a file to the WebContainer
 */
export async function writeFileToContainer(
	container: WebContainer,
	filePath: string,
	contents: string
): Promise<void> {
	try {
		await container.fs.writeFile(filePath, contents, {
			encoding: 'utf-8',
		});
	} catch (error) {
		console.error(`Error writing file ${filePath}:`, error);
		throw error;
	}
}

/**
 * Mount files to the WebContainer
 */
export async function mountFiles(
	container: WebContainer,
	files: WebContainerFiles
): Promise<void> {
	try {
		console.log('📂 Mounting files to WebContainer...');
		console.log('Files to mount:', Object.keys(files));
		await container.mount(files as unknown as FileSystemTree);
		console.log('✅ Files mounted successfully');
	} catch (error) {
		console.error('❌ Error mounting files:', error);
		throw error;
	}
}

/**
 * Clean up WebContainer resources
 */
export function cleanup(): void {
	if (webcontainerInstance) {
		console.log('🧹 Cleaning up WebContainer resources...');
		webcontainerInstance.teardown();
		webcontainerInstance = null;
		bootPromise = null;
		console.log('✅ Cleanup complete');
	}
}
