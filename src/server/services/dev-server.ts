import type { ChildProcess } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DevServer {
	process: ChildProcess;
	port: number;
	url: string;
}

const servers = new Map<string, DevServer>();
let nextPort = 5173; // Default Vite port

export async function startDevServer(projectPath: string): Promise<string> {
	const port = nextPort++;
	console.log(`🔌 Starting dev server on port ${port}`);

	const process = exec(`pnpm dev --port ${port} --host`, {
		cwd: projectPath,
	});

	// Capture server output for debugging
	process.stdout?.on('data', (data) => {
		console.log(`[Dev Server ${port}]:`, data.toString());
	});

	process.stderr?.on('data', (data) => {
		console.error(`[Dev Server ${port} Error]:`, data.toString());
	});

	const url = `http://localhost:${port}`;

	servers.set(projectPath, {
		process,
		port,
		url,
	});

	// Wait for server to start
	await new Promise((resolve) => setTimeout(resolve, 3000));

	return url;
}

export async function stopDevServer(projectPath: string): Promise<void> {
	const server = servers.get(projectPath);
	if (server) {
		server.process.kill();
		servers.delete(projectPath);
	}
}
