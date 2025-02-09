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
import { Loader2, RefreshCcw, Hammer } from "lucide-react";
import Convert from "ansi-to-html";

// Create two converters for light and dark modes with appropriate colors
const stripControlSequences = (text: string) => {
	return (
		text
			// Remove cursor hide/show
			.replace(/\[\?25[hl]/g, "")
			// Remove cursor movement
			.replace(/\[\d*[ABCDEFGJKST]/g, "")
			// Remove screen clear
			.replace(/\[\d*[JKsu]/g, "")
			// Remove terminal title sequences
			.replace(/\]0;[^\a\u001b]*(?:\a|\u001b\\)/g, "")
			// Remove other common control sequences
			.replace(/\[\d*[^A-Za-z\d\[\];]/g, "")
	);
};

const lightConverter = new Convert({
	fg: "#000",
	bg: "#fff",
	newline: true,
	escapeXML: true,
	stream: false,
	colors: {
		0: "#000000", // Black
		1: "#E34234", // Red
		2: "#107C10", // Green
		3: "#825A00", // Yellow
		4: "#0063B1", // Blue
		5: "#881798", // Magenta
		6: "#007A7C", // Cyan
		7: "#6E6E6E", // Light gray
		8: "#767676", // Dark gray
		9: "#E81123", // Bright red
		10: "#16C60C", // Bright green
		11: "#B7410E", // Bright yellow
		12: "#0037DA", // Bright blue
		13: "#B4009E", // Bright magenta
		14: "#00B7C3", // Bright cyan
		15: "#000000", // Bright white
	},
});

const darkConverter = new Convert({
	fg: "#fff",
	bg: "#000",
	newline: true,
	escapeXML: true,
	stream: false,
	colors: {
		0: "#FFFFFF", // White
		1: "#FF5555", // Red
		2: "#50FA7B", // Green
		3: "#F1FA8C", // Yellow
		4: "#6272A4", // Blue
		5: "#FF79C6", // Magenta
		6: "#8BE9FD", // Cyan
		7: "#F8F8F2", // Light gray
		8: "#6272A4", // Dark gray
		9: "#FF6E6E", // Bright red
		10: "#69FF94", // Bright green
		11: "#FFFFA5", // Bright yellow
		12: "#D6ACFF", // Bright blue
		13: "#FF92DF", // Bright magenta
		14: "#A4FFFF", // Bright cyan
		15: "#FFFFFF", // Bright white
	},
});

interface WebContainerPreviewProps {
	projectName?: string | null;
}

type Status = {
	message: string;
	error?: string;
	isHtml?: boolean;
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
	private bootPromise: Promise<WebContainer> | null = null;
	private mountedFiles: Record<string, FileSystemEntry> | null = null;

	private constructor() {
		// Try to restore mounted files from sessionStorage
		const storedFiles = sessionStorage.getItem("webcontainer-files");
		if (storedFiles) {
			try {
				this.mountedFiles = JSON.parse(storedFiles);
			} catch (error) {
				console.error("Failed to restore mounted files:", error);
			}
		}
	}

	static getInstance(): WebContainerManager {
		if (!WebContainerManager.instance) {
			WebContainerManager.instance = new WebContainerManager();
		}
		return WebContainerManager.instance;
	}

	async getContainer(): Promise<WebContainer> {
		// If we already have a container, return it
		if (this.container) {
			return this.container;
		}

		// If we're already booting, return the existing boot promise
		if (this.bootPromise) {
			return this.bootPromise;
		}

		// Start the boot process
		try {
			this.isBooting = true;
			this.bootPromise = WebContainer.boot();
			this.container = await this.bootPromise;

			// If we have stored files, remount them
			if (this.mountedFiles) {
				await this.container.mount(this.mountedFiles);
			}

			return this.container;
		} catch (error) {
			// Clear state on error
			this.container = null;
			this.bootPromise = null;
			throw error;
		} finally {
			this.isBooting = false;
			this.bootPromise = null;
		}
	}

	async mount(files: Record<string, FileSystemEntry>) {
		const instance = await this.getContainer();
		await instance.mount(files);
		// Store files in sessionStorage
		this.mountedFiles = files;
		sessionStorage.setItem("webcontainer-files", JSON.stringify(files));
	}

	async teardown() {
		if (this.container) {
			try {
				await this.container.teardown();
			} catch (error) {
				console.error("Error during teardown:", error);
			} finally {
				this.container = null;
				this.bootPromise = null;
				this.mountedFiles = null;
				sessionStorage.removeItem("webcontainer-files");
			}
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
	const [isRebuilding, setIsRebuilding] = useState(false);

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
					await containerManager.current.mount(files);

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
							setStatus({ message: data });
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
							setStatus({ message: data });
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
			const devProcess = await instance.spawn("pnpm", ["run", "dev", "--host"]);

			// Stream server output
			devProcess.output.pipeTo(
				new WritableStream({
					write(data) {
						console.log("Dev server output:", data);
						setStatus({ message: data });
					},
				}),
			);

			// Wait for server to be ready
			instance.on("server-ready", (port, url) => {
				console.log("Server ready:", port, url);
				const iframeUrl = url.replace("localhost", "0.0.0.0");
				setServerUrl(iframeUrl);
				setIsRefreshing(false);
				setStatus({ message: "Server ready!" });
			});

			// Handle server exit
			devProcess.exit.then((code) => {
				if (code !== 0) {
					setStatus({ message: "Server crashed" });
				}
				setIsRefreshing(false);
			});
		} catch (error) {
			console.error("Failed to refresh:", error);
			setStatus({
				message: "Failed to restart development server",
				error: error instanceof Error ? error.message : "Unknown error",
			});
			setIsRefreshing(false);
		}
	}

	async function handleRebuild() {
		try {
			const instance = await containerManager.current.getContainer();
			setIsRebuilding(true);
			setStatus({ message: "Rebuilding project..." });

			// Clean install
			const cleanProcess = await instance.spawn("pnpm", ["clean"]);
			await cleanProcess.exit;

			// Reinstall dependencies
			const installProcess = await instance.spawn("pnpm", ["install"]);

			// Stream install output
			installProcess.output.pipeTo(
				new WritableStream({
					write(data) {
						console.log("Install output:", data);
						setStatus({ message: data });
					},
				}),
			);

			const installExitCode = await installProcess.exit;
			if (installExitCode !== 0) {
				throw new Error("Installation failed");
			}

			// Start dev server
			const devProcess = await instance.spawn("pnpm", ["run", "dev", "--host"]);

			// Stream server output
			devProcess.output.pipeTo(
				new WritableStream({
					write(data) {
						console.log("Server output:", data);
						setStatus({ message: data });
					},
				}),
			);

			// Wait for server to be ready
			instance.on("server-ready", (port, url) => {
				console.log("Server ready:", port, url);
				const iframeUrl = url.replace("localhost", "0.0.0.0");
				setServerUrl(iframeUrl);
				setIsRebuilding(false);
				setStatus({ message: "Server ready!" });
			});

			// Handle server exit
			devProcess.exit.then((code) => {
				if (code !== 0) {
					setStatus({ message: "Server crashed" });
				}
				setIsRebuilding(false);
			});
		} catch (error) {
			console.error("Failed to rebuild:", error);
			setStatus({
				message: "Failed to rebuild project",
				error: error instanceof Error ? error.message : "Unknown error",
			});
			setIsRebuilding(false);
		}
	}

	// Helper function to convert ANSI to HTML
	const convertAnsiToHtml = (text: string) => {
		try {
			const cleanText = stripControlSequences(text);
			const html = `<div class="dark:hidden">${lightConverter.toHtml(cleanText)}</div>
			             <div class="hidden dark:block">${darkConverter.toHtml(cleanText)}</div>`;
			return { __html: html };
		} catch (error) {
			console.error("Error converting ANSI to HTML:", error);
			return { __html: text };
		}
	};

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
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							variant="outline"
							onClick={handleRebuild}
							disabled={isLoading || isRefreshing || isRebuilding}
						>
							{isRebuilding ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Hammer className="h-4 w-4" />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>Rebuild project</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							variant="outline"
							onClick={handleRefresh}
							disabled={isLoading || isRefreshing || isRebuilding}
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
						<div className="z-10 flex flex-col items-center justify-center bg-background/10 backdrop-blur-sm [grid-area:stack]">
							{(isLoading || isIframeLoading) && (
								<Loader2 className="h-6 w-6 animate-spin" />
							)}
							<div className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap text-center font-mono text-primary">
								<div
									dangerouslySetInnerHTML={convertAnsiToHtml(status.message)}
								/>
								{status.error && (
									<div className="mt-2 max-w-md text-sm text-red-500 dark:text-red-400">
										{status.error}
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
