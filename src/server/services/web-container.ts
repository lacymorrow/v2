import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer;

export async function getWebContainer() {
    if (!webcontainerInstance) {
        // Initialize the WebContainer
        webcontainerInstance = await WebContainer.boot();
    }
    return webcontainerInstance;
}

export async function installDependencies(files: Record<string, any>) {
    const webcontainer = await getWebContainer();

    // Write the project files
    await webcontainer.mount(files);

    // Install dependencies
    const install = await webcontainer.spawn('pnpm', ['install']);

    // Wait for install command to exit
    const installExitCode = await install.exit;

    if (installExitCode !== 0) {
        throw new Error('Installation failed');
    }

    return webcontainer;
}

export async function startDevServer(webcontainer: WebContainer) {
    // Start the dev server
    const server = await webcontainer.spawn('pnpm', ['dev']);

    // Wait for server to be ready
    server.output.pipeTo(new WritableStream({
        write(data) {
            if (data.includes('Local:')) {
                // Server is ready
                console.log('Dev server is ready');
            }
        }
    }));

    // Get the URL of the dev server
    const url = await webcontainer.serveHost(4173); // Vite's default preview port
    return url;
}

export async function buildProject(webcontainer: WebContainer) {
    // Run the build command
    const build = await webcontainer.spawn('pnpm', ['build']);

    // Wait for build command to exit
    const buildExitCode = await build.exit;

    if (buildExitCode !== 0) {
        throw new Error('Build failed');
    }

    return webcontainer;
}

export async function getFileFromContainer(webcontainer: WebContainer, path: string) {
    const file = await webcontainer.fs.readFile(path, 'utf-8');
    return file;
}

export async function writeFileToContainer(webcontainer: WebContainer, path: string, contents: string) {
    await webcontainer.fs.writeFile(path, contents);
}
