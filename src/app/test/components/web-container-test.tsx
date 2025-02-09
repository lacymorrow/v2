"use client";

import { useEffect, useRef, useState } from "react";
import type { WebContainer, FileSystemTree } from "@webcontainer/api";
import type { WebContainerFiles } from "../utils/template-service";

interface WebContainerTestProps {
	files: WebContainerFiles;
}

export function WebContainerTest({ files }: WebContainerTestProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [status, setStatus] = useState<string>("Loading...");
	const [url, setUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [installOutput, setInstallOutput] = useState<string>("");

	useEffect(() => {
		let webcontainerInstance: WebContainer | null = null;

		async function startDevServer() {
			try {
				setStatus("Booting WebContainer...");
				const { WebContainer } = await import("@webcontainer/api");
				webcontainerInstance = await WebContainer.boot();

				setStatus("Mounting files...");
				await webcontainerInstance.mount(files as unknown as FileSystemTree);

				setStatus("Installing dependencies...");
				// First install Vite and its plugin
				const installViteProcess = await webcontainerInstance.spawn("pnpm", [
					"add",
					"-D",
					"vite@latest",
					"@vitejs/plugin-react@latest",
				]);

				// Stream install output
				installViteProcess.output.pipeTo(
					new WritableStream({
						write(data) {
							console.log("Vite install output:", data);
							setInstallOutput((prev) => prev + data);
						},
					}),
				);

				const viteInstallExitCode = await installViteProcess.exit;
				if (viteInstallExitCode !== 0) {
					throw new Error("Vite installation failed");
				}

				// Then install project dependencies
				const installProcess = await webcontainerInstance.spawn("pnpm", [
					"install",
				]);

				// Stream install output
				installProcess.output.pipeTo(
					new WritableStream({
						write(data) {
							console.log("Install output:", data);
							setInstallOutput((prev) => prev + data);
						},
					}),
				);

				const installExitCode = await installProcess.exit;
				if (installExitCode !== 0) {
					throw new Error("Installation failed");
				}

				setStatus("Starting dev server...");
				const serverProcess = await webcontainerInstance.spawn("pnpm", [
					"dev",
					"--host",
				]);

				// Wait for server to be ready
				webcontainerInstance.on("server-ready", (port, url) => {
					setStatus("Server ready!");
					setUrl(url);
					if (iframeRef.current) {
						iframeRef.current.src = url;
					}
				});

				// Stream server output
				serverProcess.output.pipeTo(
					new WritableStream({
						write(data) {
							console.log("Server output:", data);
							setInstallOutput((prev) => prev + data);
						},
					}),
				);

				// Handle server exit
				serverProcess.exit.then((code) => {
					if (code !== 0) {
						setError(`Server exited with code ${code}`);
						setStatus("Server crashed");
					}
				});
			} catch (err) {
				console.error("Error:", err);
				setError(err instanceof Error ? err.message : "An error occurred");
				setStatus("Failed");
			}
		}

		startDevServer();

		return () => {
			if (webcontainerInstance) {
				webcontainerInstance.teardown();
			}
		};
	}, [files]);

	return (
		<div className="space-y-4">
			<div className="rounded border p-4">
				<p>Status: {status}</p>
				{url && (
					<p>
						Server URL:{" "}
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 hover:underline"
						>
							{url}
						</a>
					</p>
				)}
				{error && <p className="text-red-500">Error: {error}</p>}
			</div>

			<div className="rounded border bg-black p-4 font-mono text-sm text-white">
				<pre className="whitespace-pre-wrap">{installOutput}</pre>
			</div>

			<div className="h-[500px] rounded border">
				<iframe
					ref={iframeRef}
					className="h-full w-full border-none"
					title="WebContainer Preview"
				/>
			</div>
		</div>
	);
}
