import type { WebContainer, FileSystemTree } from '@webcontainer/api';
import type { WebContainerFiles } from './template-service';

let webcontainerInstance: WebContainer | null = null;
let isBooting = false;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * Gets or creates a WebContainer instance
 * Uses a singleton pattern with proper cleanup
 */
export async function getWebContainer(): Promise<WebContainer> {
    console.log('getWebContainer called', {
        hasInstance: !!webcontainerInstance,
        isBooting,
        hasBootPromise: !!bootPromise
    });

    // If we already have an instance, return it
    if (webcontainerInstance) {
        console.log('Returning existing WebContainer instance');
        return webcontainerInstance;
    }

    // If we're already booting, return the boot promise
    if (bootPromise) {
        console.log('Returning existing boot promise');
        return bootPromise;
    }

    // Start the boot process
    console.log('Starting WebContainer boot process');
    isBooting = true;
    bootPromise = (async () => {
        try {
            const { WebContainer } = await import('@webcontainer/api');
            console.log('WebContainer API imported successfully');

            webcontainerInstance = await WebContainer.boot();
            console.log('WebContainer booted successfully');

            return webcontainerInstance;
        } catch (error) {
            console.error('WebContainer boot error:', {
                error,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        } finally {
            isBooting = false;
            bootPromise = null;
        }
    })();

    return bootPromise;
}

/**
 * Tears down the WebContainer instance
 */
export async function teardownWebContainer(): Promise<void> {
    console.log('Tearing down WebContainer', {
        hasInstance: !!webcontainerInstance,
        isBooting,
        hasBootPromise: !!bootPromise
    });

    if (webcontainerInstance) {
        // Add any cleanup needed
        webcontainerInstance = null;
    }
    bootPromise = null;
    isBooting = false;
    console.log('WebContainer teardown complete');
}

/**
 * Mounts files and installs dependencies
 */
export async function installDependencies(files: WebContainerFiles): Promise<void> {
    console.log('Installing dependencies', {
        fileCount: Object.keys(files).length,
        hasPackageJson: 'package.json' in files,
        packageJsonContent: files['package.json'] && 'file' in files['package.json']
            ? files['package.json'].file.contents
            : null
    });

    const webcontainer = await getWebContainer();

    try {
        // Mount the files
        console.log('Mounting files to WebContainer');
        await webcontainer.mount(files as unknown as FileSystemTree);
        console.log('Files mounted successfully');

        // List files to verify mounting
        const ls = await webcontainer.spawn('ls', ['-la']);
        let output = '';
        await ls.output.pipeTo(new WritableStream({
            write(data) {
                output += data;
            }
        }));
        console.log('Directory contents after mounting:', output);

        // Install dependencies with detailed output
        console.log('Starting dependency installation');
        const installProcess = await webcontainer.spawn('pnpm', ['install', '--no-frozen-lockfile']);

        // Stream install output with more detailed logging
        let installOutput = '';
        await installProcess.output.pipeTo(new WritableStream({
            write(data) {
                installOutput += data;
                // Log each line of output separately for better debugging
                const lines = data.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        console.log('Install output:', line.trim());
                    }
                }
            }
        }));

        // Wait for install to complete
        const installExitCode = await installProcess.exit;
        console.log('Installation process completed', {
            exitCode: installExitCode,
            fullOutput: installOutput
        });

        if (installExitCode !== 0) {
            // List node_modules to check what was installed
            const lsNodeModules = await webcontainer.spawn('ls', ['-la', 'node_modules']);
            let nodeModulesOutput = '';
            await lsNodeModules.output.pipeTo(new WritableStream({
                write(data) {
                    nodeModulesOutput += data;
                }
            }));
            console.log('node_modules contents:', nodeModulesOutput);

            // Try to get more detailed error information
            const npmDebugLog = await webcontainer.fs.readFile('npm-debug.log', 'utf-8').catch(() => null);
            if (npmDebugLog) {
                console.error('npm debug log:', npmDebugLog);
            }

            throw new Error(`Installation failed with exit code ${installExitCode}. Check the logs for details.`);
        }

        // Verify vite and its plugins are installed
        const lsVite = await webcontainer.spawn('ls', ['-la', 'node_modules/@vitejs']);
        let viteOutput = '';
        await lsVite.output.pipeTo(new WritableStream({
            write(data) {
                viteOutput += data;
            }
        }));
        console.log('@vitejs modules:', viteOutput);

        // Verify the vite config
        const viteConfig = await webcontainer.fs.readFile('vite.config.ts', 'utf-8');
        console.log('Vite config contents:', viteConfig);

    } catch (error) {
        console.error('Installation error:', {
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            files: Object.keys(files)
        });
        // If something goes wrong, teardown the instance
        await teardownWebContainer();
        throw error;
    }
}

// Helper function to convert ReadableStream to string
async function streamToString(stream: ReadableStream<string>): Promise<string> {
    let result = '';
    const reader = stream.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += value;
        }
        return result;
    } finally {
        reader.releaseLock();
    }
}

/**
 * Starts the development server
 */
export async function startDevServer(): Promise<string> {
    console.log('Starting development server');
    const webcontainer = await getWebContainer();

    try {
        // Start the dev server
        console.log('Spawning dev server process');
        const devProcess = await webcontainer.spawn('pnpm', ['dev', '--host']);
        console.log('Dev server process spawned');

        // Wait for the server to be ready
        return new Promise<string>((resolve, reject) => {
            let serverOutput = '';
            const timeout = setTimeout(() => {
                console.error('Server start timeout reached. Full output:', serverOutput);
                reject(new Error('Server start timeout'));
            }, 30000); // 30 second timeout

            console.log('Waiting for server ready message');

            // Handle process exit before ready
            devProcess.exit.then((code) => {
                if (code !== 0) {
                    clearTimeout(timeout);
                    console.error('Dev server process exited early with code:', code);
                    console.error('Server output before exit:', serverOutput);
                    reject(new Error(`Server process exited with code ${code}`));
                }
            });

            // Stream server output
            devProcess.output.pipeTo(new WritableStream({
                write(data) {
                    serverOutput += data;
                    console.log('Server output:', data);

                    // Check for common error messages
                    if (data.includes('EADDRINUSE')) {
                        clearTimeout(timeout);
                        reject(new Error('Port is already in use'));
                        return;
                    }

                    if (data.includes('ERR_MODULE_NOT_FOUND')) {
                        clearTimeout(timeout);
                        reject(new Error(`Module not found: ${data}`));
                        return;
                    }

                    // Check for server ready message
                    if (data.includes('Local:')) {
                        const match = data.match(/Local:\s+(http:\/\/[^\s]+)/);
                        if (match?.[1]) {
                            console.log('Server ready at URL:', match[1]);
                            clearTimeout(timeout);
                            resolve(match[1]);
                        }
                    }
                }
            })).catch(error => {
                clearTimeout(timeout);
                console.error('Error processing server output:', error);
                reject(error);
            });
        });
    } catch (error) {
        console.error('Server start error:', {
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined
        });
        // If something goes wrong, teardown the instance
        await teardownWebContainer();
        throw error;
    }
}

/**
 * Builds the project
 */
export async function buildProject(): Promise<boolean> {
    console.log('Starting project build');
    const webcontainer = await getWebContainer();

    try {
        // Run the build command
        console.log('Spawning build process');
        const buildProcess = await webcontainer.spawn('pnpm', ['build']);

        // Stream build output
        buildProcess.output.pipeTo(new WritableStream({
            write(data) {
                console.log('Build output:', data);
            }
        }));

        // Wait for build to complete
        const buildExitCode = await buildProcess.exit;
        console.log('Build process completed', { exitCode: buildExitCode });

        return buildExitCode === 0;
    } catch (error) {
        console.error('Build error:', {
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined
        });
        // If something goes wrong, teardown the instance
        await teardownWebContainer();
        throw error;
    }
}

/**
 * Gets a file from the WebContainer
 */
export async function getFileFromContainer(filePath: string): Promise<string> {
    console.log('Reading file from container:', filePath);
    const webcontainer = await getWebContainer();
    const content = await webcontainer.fs.readFile(filePath, 'utf-8');
    console.log('File read successfully', { filePath, contentLength: content.length });
    return content;
}

/**
 * Writes a file to the WebContainer
 */
export async function writeFileToContainer(filePath: string, contents: string): Promise<void> {
    console.log('Writing file to container:', { filePath, contentLength: contents.length });
    const webcontainer = await getWebContainer();
    await webcontainer.fs.writeFile(filePath, contents);
    console.log('File written successfully:', filePath);
}
