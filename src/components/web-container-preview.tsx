"use client";

import { useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, RefreshCcw } from "lucide-react";
import Convert from "ansi-to-html";

const convert = new Convert();

function AnsiOutput({ text }: { text: string }) {
	return (
		<div
			className="whitespace-pre-wrap font-mono"
			dangerouslySetInnerHTML={{ __html: convert.toHtml(text) }}
		/>
	);
}

interface WebContainerPreviewProps {
	projectName?: string | null;
}

type Status = {
	message: string;
	error?: string;
};

interface FileEntry {
	kind: "file";
	file: {
		contents: string;
	};
}

interface DirectoryEntry {
	kind: "directory";
	directory: Record<string, FileEntry | DirectoryEntry>;
}

type FileSystemEntry = FileEntry | DirectoryEntry;

// WebContainer singleton manager
class WebContainerManager {
	private static instance: WebContainerManager | null = null;
	private container: WebContainer | null = null;
	private isBooting = false;

	private constructor() {}

	static getInstance(): WebContainerManager {
		if (!WebContainerManager.instance) {
			WebContainerManager.instance = new WebContainerManager();
		}
		return WebContainerManager.instance;
	}

	async getContainer(): Promise<WebContainer> {
		if (this.container) {
			return this.container;
		}

		if (this.isBooting) {
			throw new Error("WebContainer is already booting");
		}

		try {
			this.isBooting = true;
			this.container = await WebContainer.boot();
			return this.container;
		} finally {
			this.isBooting = false;
		}
	}

	async teardown() {
		if (this.container) {
			await this.container.teardown();
			this.container = null;
		}
	}
}

export function WebContainerPreview({ projectName }: WebContainerPreviewProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isIframeLoading, setIsIframeLoading] = useState(true);
	const [status, setStatus] = useState<Status>({ message: "Initializing..." });
	const [serverUrl, setServerUrl] = useState<string | null>(null);
	const containerManager = useRef(WebContainerManager.getInstance());
	const isInitialMount = useRef(true);
	const lastFileContent = useRef<Record<string, string>>({});

	// Initialize from sessionStorage on mount
	useEffect(() => {
		const stored = sessionStorage.getItem(`webcontainer-url-${projectName}`);
		if (stored) {
			setServerUrl(stored);
			setIsLoading(false);
			setStatus({ message: "Loading preview..." });
		}
	}, [projectName]);

	// Only cleanup on component unmount if navigating away
	useEffect(() => {
		const handleBeforeUnload = () => {
			containerManager.current.teardown();
			sessionStorage.removeItem(`webcontainer-url-${projectName}`);
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [projectName]);

	// Effect to update iframe src when serverUrl changes
	useEffect(() => {
		if (serverUrl && iframeRef.current) {
			console.log("Updating iframe src to:", serverUrl);
			setIsIframeLoading(true);
			iframeRef.current.src = serverUrl;
			// Store URL in sessionStorage
			sessionStorage.setItem(`webcontainer-url-${projectName}`, serverUrl);
		}
	}, [serverUrl, projectName]);

	// File watching effect
	useEffect(() => {
		if (!projectName) return;

		let isWatching = true;
		const watchInterval = 1000; // 1 second

		async function checkForChanges() {
			if (!isWatching) return;

			try {
				const response = await fetch(`/api/files/${projectName}`);
				if (!response.ok) return;
				const files = (await response.json()) as Record<
					string,
					FileSystemEntry
				>;

				const instance = await containerManager.current.getContainer();

				// Recursively process files and check for changes
				async function processFiles(
					entries: Record<string, FileSystemEntry>,
					basePath = "",
				) {
					for (const [name, entry] of Object.entries(entries)) {
						const fullPath = basePath ? `${basePath}/${name}` : name;

						if (entry.kind === "file") {
							const newContent = entry.file.contents;
							const oldContent = lastFileContent.current[fullPath];

							if (oldContent !== newContent) {
								console.log(`File changed: ${fullPath}`);
								await instance.fs.writeFile(fullPath, newContent);
								lastFileContent.current[fullPath] = newContent;
							}
						} else if (entry.kind === "directory") {
							await processFiles(entry.directory, fullPath);
						}
					}
				}

				await processFiles(files);
			} catch (error) {
				console.error("Error checking for file changes:", error);
			}

			if (isWatching) {
				setTimeout(checkForChanges, watchInterval);
			}
		}

		// Start watching
		checkForChanges();

		return () => {
			isWatching = false;
		};
	}, [projectName]);

	// Handle iframe load events
	const handleIframeLoad = () => {
		console.log("Iframe loaded");
		setIsIframeLoading(false);
		setStatus({ message: "Preview ready!" });
	};

	useEffect(() => {
		if (!projectName || !isInitialMount.current) return;
		isInitialMount.current = false;

		// Check sessionStorage on mount
		const stored = sessionStorage.getItem(`webcontainer-url-${projectName}`);
		if (stored) {
			setServerUrl(stored);
			setIsLoading(false);
			setStatus({ message: "Server ready!" });
			return;
		}

		let isActive = true;
		async function startDevServer() {
			try {
				if (!isActive) return;
				setIsLoading(true);
				setStatus({ message: "Initializing WebContainer..." });

				const instance = await containerManager.current.getContainer();

				// Load project files from the generated app directory
				setStatus({ message: "Loading project files..." });
				const response = await fetch(`/api/files/${projectName}`);
				if (!response.ok) {
					throw new Error(
						`Failed to load project files: ${response.statusText}`,
					);
				}
				const files = (await response.json()) as Record<
					string,
					FileSystemEntry
				>;

				// Mount the project files
				setStatus({ message: "Mounting project files..." });
				try {
					console.log("Files to be mounted:", JSON.stringify(files, null, 2));
					await instance.mount(files);

					// Store initial file contents for change detection
					async function storeInitialContent(
						entries: Record<string, FileSystemEntry>,
						basePath = "",
					) {
						for (const [name, entry] of Object.entries(entries)) {
							const fullPath = basePath ? `${basePath}/${name}` : name;
							if (entry.kind === "file") {
								lastFileContent.current[fullPath] = entry.file.contents;
							} else if (entry.kind === "directory") {
								await storeInitialContent(entry.directory, fullPath);
							}
						}
					}
					await storeInitialContent(files);

					// Add directory listing after mounting
					const dirList = await instance.fs.readdir("/", {
						withFileTypes: true,
					});
					console.log("Mounted directory structure:", dirList);

					// Specifically check for main.tsx
					try {
						const mainExists = await instance.fs.readFile(
							"/src/main.tsx",
							"utf-8",
						);
						console.log("main.tsx exists and contains:", mainExists);
					} catch (error) {
						console.error("Error reading main.tsx:", error);
					}
				} catch (error) {
					console.error("Mount error:", error);
					throw new Error(
						`Failed to mount files: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}

				// Install dependencies
				setStatus({ message: "Installing dependencies..." });

				// First install Vite and its plugin
				const installViteProcess = await instance.spawn("pnpm", [
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
							setStatus({ message: `Installing Vite and plugins...\n${data}` });
						},
					}),
				);

				const viteInstallExitCode = await installViteProcess.exit;
				if (viteInstallExitCode !== 0) {
					throw new Error("Vite installation failed");
				}

				// Then install project dependencies
				const installProcess = await instance.spawn("pnpm", ["install"]);

				// Stream install output
				installProcess.output.pipeTo(
					new WritableStream({
						write(data) {
							console.log("Install output:", data);
							setStatus({ message: `Installing dependencies...\n${data}` });
						},
					}),
				);

				const installExitCode = await installProcess.exit;
				if (installExitCode !== 0) {
					throw new Error("Installation failed");
				}

				setStatus({ message: "Starting development server..." });
				const devProcess = await instance.spawn("pnpm", [
					"run",
					"dev",
					"--host",
				]);

				// Stream server output
				devProcess.output.pipeTo(
					new WritableStream({
						write(data) {
							console.log("Server output:", data);
							setStatus({ message: `Starting development server...\n${data}` });
						},
					}),
				);

				// Wait for the server to be ready
				instance.on("server-ready", (port, url) => {
					console.log("Server ready:", port, url);
					if (!isActive) return;

					// Update iframe source via state
					const iframeUrl = url.replace("localhost", "0.0.0.0");
					console.log("Setting server URL to:", iframeUrl);
					setServerUrl(iframeUrl);
					setIsLoading(false);
					setStatus({ message: "Server ready!" });
				});

				// Handle server exit
				devProcess.exit.then((code) => {
					if (code !== 0) {
						setStatus({ message: "Server crashed" });
					}
				});
			} catch (error) {
				if (!isActive) return;
				console.error("Failed to start WebContainer:", error);
				setIsLoading(false);
				setStatus({
					message: "Failed to start development server",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		startDevServer();

		return () => {
			isActive = false;
		};
	}, [projectName]);

	async function handleRefresh() {
		try {
			const instance = await containerManager.current.getContainer();
			setIsRefreshing(true);
			setStatus({ message: "Restarting development server..." });

			// Restart the dev server
			const devProcess = await instance.spawn("pnpm", ["run", "dev"]);

			// Listen for dev server output
			const reader = devProcess.output.getReader();
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					console.log("Dev server output:", value);
				}
			} finally {
				reader.releaseLock();
			}

			setStatus({ message: "Development server is running" });
		} catch (error) {
			console.error("Failed to refresh:", error);
			setStatus({
				message: "Failed to restart development server",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setIsRefreshing(false);
		}
	}

	if (!projectName) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				Generate a project to see the preview
			</div>
		);
	}

	return (
		<div className="relative h-full">
			<div className="absolute right-4 top-4 z-10 flex gap-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant="outline"
								onClick={handleRefresh}
								disabled={isLoading || isRefreshing}
							>
								{isRefreshing ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCcw className="h-4 w-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>Restart dev server</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			<div className="relative h-full overflow-hidden border-l">
				<div className="grid h-full [grid-template-areas:'stack']">
					{/* Base layer: iframe */}
					<iframe
						ref={iframeRef}
						key={serverUrl}
						className="h-full w-full border-none bg-transparent [grid-area:stack]"
						title="Project Preview"
						onLoad={handleIframeLoad}
						src={serverUrl || "about:blank"}
					/>

					{/* Loading layer */}
					{(isLoading || isIframeLoading || !serverUrl || status.error) && (
						<div className="z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm [grid-area:stack]">
							{(isLoading || isIframeLoading) && (
								<Loader2 className="h-6 w-6 animate-spin" />
							)}
							<span className="mt-2 text-center">
								<AnsiOutput text={status.message} />
								{status.error && (
									<div className="mt-2 max-w-md text-sm text-red-500">
										{status.error}
									</div>
								)}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
