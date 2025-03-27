"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WebContainer } from "@webcontainer/api";
import Convert from "ansi-to-html";
import { Hammer, Loader2, RefreshCcw, Bug } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

// Enhanced debugging function
const debugLog = (context: string, message: any) => {
	const prefix = `[WebContainer Debug][${context}]`;
	if (typeof message === "object") {
		console.log(prefix, JSON.stringify(message, null, 2));
	} else {
		console.log(prefix, message);
	}
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
		if (typeof window !== "undefined") {
			window.addEventListener("beforeunload", () => {
				if (this.mountedFiles) {
					sessionStorage.setItem("webcontainer-files", JSON.stringify(this.mountedFiles));
				}
			});
		}
	}

	public static getInstance(): WebContainerManager {
		if (!WebContainerManager.instance) {
			WebContainerManager.instance = new WebContainerManager();
		}
		return WebContainerManager.instance;
	}

	public setMountedFiles(files: Record<string, FileSystemEntry>): void {
		this.mountedFiles = files;
	}

	public getMountedFiles(): Record<string, FileSystemEntry> | null {
		if (this.mountedFiles) return this.mountedFiles;

		if (typeof window === "undefined") return null;

		const stored = sessionStorage.getItem("webcontainer-files");
		if (stored) {
			this.mountedFiles = JSON.parse(stored);
			return this.mountedFiles;
		}
		return null;
	}

	public async getContainer(): Promise<WebContainer | null> {
		if (typeof window === "undefined") return null;

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
			const files = this.getMountedFiles();
			if (files) {
				await this.container.mount(files);
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

	public async teardown(): Promise<void> {
		if (typeof window === "undefined") return;

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

// Fix how we handle terminal output HTML
function SafeHtmlOutput({ html }: { html: string }) {
	// Use a ref to access the container element
	const containerRef = useRef<HTMLDivElement>(null);

	// Update the HTML content safely using the ref
	useEffect(() => {
		if (containerRef.current) {
			containerRef.current.innerHTML = html;
		}
	}, [html]);

	return <div ref={containerRef} className="whitespace-pre-wrap font-mono text-sm" />;
}

// Add this diagnostic function near the top with other helper functions
async function inspectCriticalFiles(instance: WebContainer) {
	try {
		// Check package.json
		try {
			const packageJson = await instance.fs.readFile("/package.json", "utf-8");
			const parsed = JSON.parse(packageJson);
			console.log("Package.json check:", {
				name: parsed.name,
				dependencies: Object.keys(parsed.dependencies || {}).length,
				devDependencies: Object.keys(parsed.devDependencies || {}).length,
				scripts: parsed.scripts || {},
			});
		} catch (error) {
			console.error("Error reading package.json:", error);
		}

		// Check if pnpm-lock.yaml exists
		try {
			await instance.fs.readFile("/pnpm-lock.yaml", "utf-8");
			console.log("pnpm-lock.yaml exists");
		} catch (error) {
			console.log("pnpm-lock.yaml not found");
		}

		// Check if node_modules exists
		try {
			const nodeModules = await instance.fs.readdir("/node_modules");
			console.log(`node_modules contains ${nodeModules.length} entries`);
		} catch (error) {
			console.log("node_modules not found or empty");
		}

		// List root directory files
		try {
			const rootFiles = await instance.fs.readdir("/");
			console.log("Root directory contains:", rootFiles);
		} catch (error) {
			console.error("Error reading root directory:", error);
		}
	} catch (error) {
		console.error("Error during filesystem inspection:", error);
	}
}

// Helper function to send input to a terminal
// async function sendInputToProcess(process: any, input: string) {
//   // The WebContainer API doesn't directly expose stdin
//   // We'll use a workaround with a virtual file
//   try {
//     // Write input to a file
//     await process.write(`${input}\n`);
//     debugLog("Input", `Successfully sent input: ${input}`);
//     return true;
//   } catch (error) {
//     debugLog("Input Error", `Failed to send input: ${error}`);
//     return false;
//   }
// }

// Add this improved URL detection helper function at the top of the file, near other utility functions
function extractServerUrl(text: string): string | null {
	// First strip ANSI control sequences for better matching
	const stripped = stripControlSequences(text);

	// Log the stripped text for debugging
	console.log("Stripped output for URL detection:", stripped);

	// Try different patterns to extract the URL
	const patterns = [
		/Local:\s+http:\/\/localhost:[0-9]+\//,     // Vite specific format
		/http:\/\/localhost:[0-9]+\//,              // Generic localhost URL
		/http:\/\/localhost:[0-9]+/,                // URL without trailing slash
	];

	for (const pattern of patterns) {
		const match = stripped.match(pattern);
		if (match?.length && match[0]) {
			let url = match[0];

			// If we matched "Local: ", remove it
			if (url.startsWith("Local:")) {
				url = url.substring(url.indexOf("http"));
			}

			// Keep only the port number, since we need to transform this for WebContainer
			const portMatch = url.match(/localhost:([0-9]+)/);
			if (portMatch?.[1]) {
				// Return the port number for WebContainer URL handling
				return portMatch[1];
			}

			return url.trim();
		}
	}

	return null;
}

// Modify iframe URL handling to use WebContainer-specific approach
function forceIframeToLoadUrl(iframe: HTMLIFrameElement | null, urlOrPort: string | null) {
	if (!iframe || !urlOrPort) return;

	// If it's just a port number, format as WebContainer URL
	if (/^\d+$/.test(urlOrPort)) {
		// Transform port to WebContainer URL format
		console.log(`Using WebContainer port: ${urlOrPort}`);
		// Don't set directly - WebContainer requires its proxy
	} else {
		console.log(`Forcing iframe to load URL: ${urlOrPort}`);
		try {
			iframe.src = urlOrPort;
		} catch (error) {
			console.error("Error setting iframe src:", error);
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
	const [isDebugging, setIsDebugging] = useState(false);

	// Handle iframe loading events
	const handleIframeLoad = () => {
		setIsIframeLoading(false);
	};

	// Handle refreshing the WebContainer instance
	const handleRefresh = async () => {
		if (isRefreshing || isLoading || !projectName) return;

		setIsRefreshing(true);
		setIsIframeLoading(true);
		setStatus({ message: "Restarting dev server..." });

		try {
			// Clear server URL to trigger a full reload
			sessionStorage.removeItem(`webcontainer-url-${projectName}`);
			setServerUrl(null);

			// Wait a bit to let the current container clean up
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Restart the container
			await containerManager.current.teardown();
			isInitialMount.current = true;
		} catch (error) {
			console.error("Error refreshing WebContainer:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			setStatus({
				message: "Failed to refresh WebContainer",
				error: errorMessage,
			});
		} finally {
			setIsRefreshing(false);
		}
	};

	// Handle rebuilding the project
	const handleRebuild = async () => {
		if (isRebuilding || isLoading || !projectName) return;

		setIsRebuilding(true);
		setStatus({ message: "Rebuilding project..." });

		// Define local variables for this function scope
		let localOutputLog = "";
		const isActive = true;

		try {
			const instance = await containerManager.current.getContainer();
			if (!instance) {
				throw new Error("WebContainer not initialized");
			}

			// Run diagnostics first
			await inspectCriticalFiles(instance);

			// First check if package.json exists
			try {
				const packageJsonContent = await instance.fs.readFile("/package.json", "utf-8");
				console.log(`package.json exists: ${packageJsonContent.substring(0, 100)}...`);
			} catch (error) {
				console.error("Error reading package.json:", error);
				setStatus({
					message: "Error reading package.json",
					error: "Make sure package.json exists in the project root",
				});
				setIsRebuilding(false);
				return;
			}

			// Check node_modules directory
			try {
				const nodeModulesExists = await instance.fs
					.readdir("/node_modules")
					.then(() => true)
					.catch(() => false);
				console.log("node_modules exists:", nodeModulesExists);
			} catch (error) {
				console.log("node_modules directory check failed:", error);
				// This is expected if node_modules doesn't exist yet
			}

			// Run npm/pnpm install to rebuild dependencies
			setStatus({ message: "Installing dependencies..." });

			// Try running with verbose flag for more info
			const terminal = await instance.spawn("pnpm", ["install", "--verbose"]);

			let outputText = "";

			// Handle output
			await terminal.output.pipeTo(
				new WritableStream({
					write(data) {
						outputText += data;
						const htmlOutput = convertAnsiToHtml(data);
						setStatus({
							message: "Build output",
							isHtml: true,
							error: htmlOutput,
						});
					},
				})
			);

			// Wait for completion
			const exitCode = await terminal.exit;

			if (exitCode !== 0) {
				console.error("Build failed with output:", outputText);
				throw new Error(
					`Build failed with exit code ${exitCode}. Check the terminal output for details.`
				);
			}

			setStatus({ message: "Dependencies installed. Starting dev server..." });

			// Now start the dev server again
			const devTerminal = await instance.spawn("npx", [
				"--yes",
				"--legacy-peer-deps",
				"vite",
				"--host",
			]);
			debugLog("Terminal", "Terminal spawned with npx vite");

			// Set up output handling
			await devTerminal.output.pipeTo(
				new WritableStream({
					write(data) {
						// Store output for debugging
						localOutputLog += data;

						// Check for prompts that need input
						if (
							data.includes("Do you want to continue?") ||
							data.includes("[y/N]") ||
							data.includes("[Y/n]") ||
							data.includes("(y/N)") ||
							data.includes("(Y/n)") ||
							data.includes("proceed? (y)")
						) {
							debugLog("Rebuild Prompt", `Input prompt detected: ${data}`);

							// Cannot send input directly - log warning
							debugLog("Input Warning", "WebContainer API doesn't support direct stdin input");

							// Kill and restart the process if it's stuck in a prompt
							setTimeout(async () => {
								try {
									if (!isActive) return;

									// Kill the current process if it's stuck
									devTerminal.kill();
									debugLog("Process", "Killed stuck process with prompt");

									// Start a new process with --yes flag to auto-confirm prompts
									const newTerminal = await instance.spawn("npx", [
										"--yes",
										"--legacy-peer-deps",
										"vite",
										"--host",
									]);
									debugLog(
										"Process",
										"Started new process with --yes and --legacy-peer-deps flags"
									);

									// Handle the new terminal output
									await newTerminal.output.pipeTo(
										new WritableStream({
											write(data) {
												// Updated to use the local variables
												if (!isActive) return;

												// Store output locally
												localOutputLog += data;

												// Use improved URL detection
												if (data.includes("Local:") || data.includes("localhost")) {
													const url = extractServerUrl(data);
													if (url) {
														debugLog("Server URL", `Detected server URL: ${url}`);

														// Force URL to ensure it gets set
														setServerUrl(url);
														sessionStorage.setItem(`webcontainer-url-${projectName}`, url);
														setIsLoading(false);

														// Directly force the iframe to use this URL
														if (iframeRef.current) {
															debugLog("Iframe", "Forcing iframe to load URL");
															setTimeout(() => {
																if (iframeRef.current) {
																	iframeRef.current.src = url;
																}
															}, 500);
														}
													}
												}

												// Process the output text
												setStatus({
													message: "Server output",
													error: data,
													isHtml: false,
												});
											},
										})
									);
								} catch (error) {
									debugLog("Process Error", `Error restarting process: ${error}`);
								}
							}, 5000);
						}

						// Check for blob-related errors
						if (data.includes("blob") || data.includes("storage")) {
							debugLog("Blob Storage", `Detected blob/storage in output: ${data}`);
						}

						// Look for detailed error information
						if (data.includes("ELIFECYCLE") || data.includes("ERR!") || data.includes("Error:")) {
							debugLog("Error Detected", data);

							// Extract more context around the error
							const lines = localOutputLog.split("\n");
							const errorIndex = lines.findIndex(
								(line) =>
									line.includes("ELIFECYCLE") || line.includes("ERR!") || line.includes("Error:")
							);

							if (errorIndex >= 0) {
								// Get 5 lines before and after for context
								const startLine = Math.max(0, errorIndex - 5);
								const endLine = Math.min(lines.length, errorIndex + 5);
								const errorContext = lines.slice(startLine, endLine).join("\n");
								debugLog("Error Context", errorContext);
							}
						}

						// Look for server URL in the output
						if (data.includes("Local:") && data.includes("http")) {
							const match: RegExpMatchArray | null = data.match(/(https?:\/\/localhost:[0-9]+)/);
							if (match?.[1]) {
								const url = match[1];
								setServerUrl(url);
								sessionStorage.setItem(`webcontainer-url-${projectName}`, url);
								setIsLoading(false);
							}
						}

						// Process the output text directly - don't make it HTML
						setStatus({
							message: "Server output",
							error: data,
							isHtml: false,
						});
					},
				})
			);

			// Handle server exit
			devTerminal.exit.then((code) => {
				if (!isActive) return;
				debugLog("Terminal Exit", { code, outputLength: localOutputLog.length });

				if (code !== 0) {
					debugLog("Error Exit", "Server exited with non-zero code");
					// Output the last 50 lines for context
					const lines = localOutputLog.split("\n");
					const lastLines = lines.slice(Math.max(0, lines.length - 50)).join("\n");
					debugLog("Last Output Lines", lastLines);

					setStatus({
						message: `Server exited with code ${code}`,
						error: "The development server crashed. Check console for detailed logs.",
					});
					setIsLoading(false);
				}
			});
		} catch (error) {
			console.error("Error rebuilding project:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			setStatus({
				message: "Failed to rebuild project",
				error: errorMessage,
			});
			setIsRebuilding(false);
		}

		return () => {
			// This is the cleanup function - variables can be marked for cleanup here
			// but we don't assign to the original isActive constant
			// Instead we simply return, and the component using this hook will clean itself up
		};
	};

	// Handle debug for blob storage issues
	const handleDebugBlobStorage = async () => {
		if (isDebugging || !projectName) return;

		setIsDebugging(true);
		setStatus({ message: "Analyzing blob storage configuration..." });

		try {
			const instance = await containerManager.current.getContainer();
			if (!instance) {
				throw new Error("WebContainer not initialized");
			}

			// Check for key files related to blob storage
			const debugInfo: Record<string, any> = {
				time: new Date().toISOString(),
				project: projectName,
				files: {},
			};

			// Check for .env files
			try {
				const envFiles = [];
				const rootFiles = await instance.fs.readdir("/");

				for (const file of rootFiles) {
					if (file.startsWith(".env")) {
						try {
							const content = await instance.fs.readFile(`/${file}`, "utf-8");
							// Filter out lines containing storage/blob config
							const blobLines = content
								.split("\n")
								.filter(
									(line) =>
										line.includes("STORAGE") ||
										line.includes("BLOB") ||
										line.includes("AZURE") ||
										line.includes("AWS") ||
										line.includes("S3")
								);

							if (blobLines.length > 0) {
								envFiles.push({
									file,
									config: blobLines.map((line) =>
										// Mask sensitive values
										line.replace(/(=|:)([^;]+)/, "$1***REDACTED***")
									),
								});
							}
						} catch (error) {
							envFiles.push({ file, error: "Could not read file" });
						}
					}
				}

				debugInfo.files.envFiles = envFiles;
			} catch (error) {
				debugInfo.files.envFilesError = "Could not read environment files";
			}

			// Check for next.config.js
			try {
				const nextConfigExists = await instance.fs
					.readFile("/next.config.js", "utf-8")
					.then(() => true)
					.catch(() => false);
				debugInfo.files.nextConfig = nextConfigExists;
			} catch (error) {
				debugInfo.files.nextConfigError = "Could not check next.config.js";
			}

			// Check for blob-related packages in package.json
			try {
				const packageJson = await instance.fs.readFile("/package.json", "utf-8");
				const pkg = JSON.parse(packageJson);

				const blobPackages: Record<string, string> = {};
				const allDeps: Record<string, string> = {
					...(pkg.dependencies || {}),
					...(pkg.devDependencies || {}),
				};

				const blobRelatedKeywords = ["blob", "storage", "s3", "azure", "upload", "file", "aws"];

				for (const [dep, version] of Object.entries(allDeps)) {
					if (blobRelatedKeywords.some((keyword) => dep.toLowerCase().includes(keyword))) {
						blobPackages[dep] = version;
					}
				}

				debugInfo.files.blobPackages = blobPackages;
			} catch (error) {
				debugInfo.files.packageJsonError = "Could not check package.json";
			}

			// Output the debug info
			const debugOutput = JSON.stringify(debugInfo, null, 2);
			console.log("[Blob Storage Debug]", debugOutput);

			setStatus({
				message: "Blob Storage Debug Information",
				error: debugOutput,
				isHtml: false,
			});
		} catch (error) {
			console.error("Debug error:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			setStatus({
				message: "Failed to debug blob storage",
				error: errorMessage,
			});
		} finally {
			setIsDebugging(false);
		}
	};

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

	// The main effect for starting the WebContainer
	useEffect(() => {
		if (!projectName || !isInitialMount.current) return;
		isInitialMount.current = false;

		// If we already have a server URL from session storage, we don't need to start again
		if (serverUrl) return;

		const isActive = true;
		let fullOutputLog = ""; // Store full output for debugging

		async function startDevServer() {
			try {
				setIsLoading(true);
				setStatus({ message: "Loading WebContainer..." });

				// 1. Initialize the WebContainer
				const instance = await containerManager.current.getContainer();
				if (!instance || !isActive) {
					throw new Error("Failed to initialize WebContainer");
				}

				debugLog("Container", "WebContainer initialized successfully");

				// 2. Fetch project files from API
				setStatus({ message: "Loading project files..." });
				debugLog("Files", `Fetching files for project: ${projectName}`);
				const response = await fetch(`/api/files/${projectName}?root=true`);

				if (!response.ok) {
					const errorText = await response.text();
					debugLog("API Error", `Failed to load files: ${response.status} - ${errorText}`);
					throw new Error(`Failed to load project files: ${response.status} - ${errorText}`);
				}

				const entries = await response.json();
				debugLog("Files", `Received ${Object.keys(entries).length} top-level entries`);

				if (!entries || Object.keys(entries).length === 0) {
					throw new Error("No files found for this project");
				}

				// Check for critical files
				const hasPackageJson = entries["package.json"] !== undefined;
				const hasNextConfig = entries["next.config.js"] !== undefined;
				debugLog("Critical Files", { hasPackageJson, hasNextConfig });

				// 3. Mount project files in WebContainer
				setStatus({ message: "Mounting files..." });
				try {
					await instance.mount(entries);
					containerManager.current.setMountedFiles(entries);
					debugLog("Mount", "Files mounted successfully");
				} catch (mountError) {
					debugLog("Mount Error", mountError);
					throw mountError;
				}

				// List root directory contents for debugging
				try {
					const rootFiles = await instance.fs.readdir("/");
					debugLog("Root Directory", rootFiles);
				} catch (fsError) {
					debugLog("FS Error", fsError);
				}

				// Store initial content for later comparison
				await storeInitialContent(entries);

				// 4. Pre-install vite to avoid prompts
				setStatus({ message: "Installing dependencies..." });
				debugLog("Dependencies", "Pre-installing vite to avoid prompts");

				try {
					// First install vite explicitly to avoid the prompt - use legacy-peer-deps to bypass conflicts
					const installTerminal = await instance.spawn("npm", [
						"install",
						"vite@latest",
						"--no-save",
						"--legacy-peer-deps",
					]);

					// Process the install output
					await installTerminal.output.pipeTo(
						new WritableStream({
							write(data) {
								if (!isActive) return;
								fullOutputLog += data;
								debugLog("Install Output", data);

								setStatus({
									message: "Installing Vite...",
									error: data,
									isHtml: false,
								});

								// Direct detection of npm completion messages
								if (data.includes("added") && data.includes("packages in")) {
									debugLog("Install Detection", "Detected npm install completion pattern");

									// Force continuation to the next step
									setTimeout(async () => {
										if (!isActive || serverUrl) return; // Skip if already handled

										try {
											debugLog("Install Success", "Forcing continuation after npm completion");

											// Kill the current install process if it's stuck
											try {
												installTerminal.kill();
												debugLog("Process", "Killed potentially stuck install process");
											} catch (err) {
												debugLog("Kill Error", `Error killing install process: ${err}`);
											}

											// Install necessary Vite plugins before starting the server
											debugLog("Dependencies", "Installing required Vite plugins");
											setStatus({ message: "Installing Vite plugins..." });

											try {
												const pluginsInstall = await instance.spawn("npm", [
													"install",
													"--legacy-peer-deps",
													"@vitejs/plugin-react",
													"vite-plugin-node-polyfills",
												]);

												// Set a fallback timeout to ensure we continue even if the process hangs
												const pluginTimeoutId = setTimeout(() => {
													if (!isActive || serverUrl) return;

													debugLog(
														"Timeout",
														"Plugin installation timed out - forcing continuation"
													);
													try {
														pluginsInstall.kill();
													} catch (err) {
														debugLog("Kill Error", `Error killing plugin install: ${err}`);
													}

													// Force continue to server start
													startDevServer();
												}, 20000); // 20 second timeout

												// Flag to track if we've already handled completion
												let pluginInstallHandled = false;

												// Function to start dev server (extracted for reuse)
												async function startDevServer() {
													if (pluginInstallHandled) return;
													pluginInstallHandled = true;
													clearTimeout(pluginTimeoutId);

													debugLog("Server", "Starting dev server after plugin installation");
													setStatus({ message: "Starting dev server..." });

													// Check that instance exists
													if (!instance) {
														debugLog("Error", "WebContainer instance is null");
														setStatus({
															message: "Failed to start dev server",
															error: "WebContainer instance is null",
														});
														setIsLoading(false);
														return;
													}

													try {
														// List the node_modules/.bin directory to see what's available
														try {
															const binContents = await instance.fs.readdir("node_modules/.bin");
															debugLog("Available Bins", binContents);
														} catch (err) {
															debugLog("Bin Check Error", `Could not read .bin directory: ${err}`);
														}

														// Create terminal for output - use direct path to vite binary
														// Try different approaches to find and run vite
														let devTerminal: Awaited<ReturnType<typeof instance.spawn>>;

														try {
															// First try: direct path to vite executable in node_modules
															debugLog("Attempt", "Trying direct path to vite binary");
															devTerminal = await instance.spawn("node", [
																"./node_modules/vite/bin/vite.js",
																"--host",
															]);
														} catch (err) {
															debugLog("Vite Error 1", `Error running vite directly: ${err}`);

															try {
																// Second try: use npx with direct path
																debugLog("Attempt", "Trying npx with direct path");
																devTerminal = await instance.spawn("npx", [
																	"--no",
																	"vite",
																	"--host",
																]);
															} catch (err) {
																debugLog("Vite Error 2", `Error with npx approach: ${err}`);

																// Final fallback: try with shell script
																debugLog("Attempt", "Trying shell script approach");
																devTerminal = await instance.spawn("sh", [
																	"-c",
																	"node ./node_modules/vite/bin/vite.js --host",
																]);
															}
														}

														debugLog("Terminal", "Force-spawned dev server with vite binary");

														// Set up output handling
														devTerminal.output.pipeTo(
															new WritableStream({
																write(data) {
																	if (!isActive) return;

																	// Store complete output for debugging
																	fullOutputLog += data;
																	debugLog("Server Output", data);

																	// Use improved URL detection
																	if (data.includes("Local:") || data.includes("localhost")) {
																		const portOrUrl = extractServerUrl(data);
																		if (portOrUrl) {
																			debugLog("Server URL", `Detected server URL: ${portOrUrl}`);

																			// Force URL to ensure it gets set
																			setServerUrl(portOrUrl);
																			sessionStorage.setItem(
																				`webcontainer-url-${projectName}`,
																				portOrUrl
																			);
																			setIsLoading(false);

																			// Directly force the iframe to use this URL
																			if (iframeRef.current) {
																				debugLog("Iframe", "Forcing iframe to load URL");
																				setTimeout(() => {
																					if (iframeRef.current) {
																						iframeRef.current.src = portOrUrl;
																					}
																				}, 500);
																			}
																		}
																	}

																	// Process the output text
																	setStatus({
																		message: "Server output",
																		error: data,
																		isHtml: false,
																	});
																},
															})
														);
													} catch (error) {
														console.error("WebContainer error:", error);
														debugLog("Fatal Error", error);

														if (!isActive) return;

														const errorMessage =
															error instanceof Error ? error.message : "Unknown error";
														setStatus({
															message: "Failed to start WebContainer",
															error: errorMessage,
														});
														setIsLoading(false);
													}
												}

												// Wait for plugin installation to complete
												await pluginsInstall.output.pipeTo(
													new WritableStream({
														write(data) {
															if (!isActive) return;
															fullOutputLog += data;
															debugLog("Plugin Install", data);
															setStatus({
																message: "Installing plugins...",
																error: data,
																isHtml: false,
															});

															// Detect completion pattern in the output
															if (data.includes("added") && data.includes("packages in")) {
																debugLog(
																	"Plugin Detection",
																	"Detected plugin installation completion"
																);

																// Small delay before starting server to ensure everything is settled
																setTimeout(() => {
																	if (!isActive || serverUrl) return;
																	startDevServer();
																}, 1000);
															}
														},
													})
												);
											} catch (error) {
												debugLog("Plugin Error", `Error installing plugins: ${error}`);

												// Continue with server startup even if plugin install fails
												setStatus({ message: "Starting dev server..." });

												// Create terminal for output
												const devTerminal = await instance.spawn("npx", [
													"--yes",
													"--legacy-peer-deps",
													"vite",
													"--host",
												]);
												debugLog("Terminal", "Force-spawned dev server after plugin failure");

												// Set up output handling
												devTerminal.output.pipeTo(
													new WritableStream({
														write(data) {
															if (!isActive) return;

															// Store complete output for debugging
															fullOutputLog += data;
															debugLog("Server Output", data);

															// Use improved URL detection
															if (data.includes("Local:") || data.includes("localhost")) {
																const portOrUrl = extractServerUrl(data);
																if (portOrUrl) {
																	debugLog("Server URL", `Detected server URL: ${portOrUrl}`);

																	// Force URL to ensure it gets set
																	setServerUrl(portOrUrl);
																	sessionStorage.setItem(`webcontainer-url-${projectName}`, portOrUrl);
																	setIsLoading(false);

																	// Directly force the iframe to use this URL
																	if (iframeRef.current) {
																		debugLog("Iframe", "Forcing iframe to load URL");
																		setTimeout(() => {
																			if (iframeRef.current) {
																				iframeRef.current.src = portOrUrl;
																			}
																		}, 500);
																	}
																}
															}

															// Process the output text
															setStatus({
																message: "Server output",
																error: data,
																isHtml: false,
															});
														},
													})
												);
											}
										} catch (error) {
											debugLog(
												"Force Continue Error",
												`Error during forced continuation: ${error}`
											);
											setStatus({
												message: "Failed to start dev server",
												error: error instanceof Error ? error.message : "Unknown error",
											});
											setIsLoading(false);
										}
									}, 1000); // Short delay before forcing continuation
								}
							},
						})
					);

					// Wait for the install to complete - this is a backup approach, may not be needed
					const exitCode = await installTerminal.exit;
					debugLog("Install Complete", `Exit code: ${exitCode}`);

					// If we get here and haven't started the dev server, do it now
					if (isActive && !serverUrl) {
						debugLog(
							"Install Backup",
							"Backup approach for starting dev server after install exit"
						);
						setStatus({ message: "Starting dev server..." });

						// Create terminal for output - explicitly use npx with legacy-peer-deps to run vite
						const terminal = await instance.spawn("npx", [
							"--yes",
							"--legacy-peer-deps",
							"vite",
							"--host",
						]);
						debugLog("Terminal", "Terminal spawned with npx vite (backup approach)");

						// Handle output similar to above
						terminal.output.pipeTo(
							new WritableStream({
								write(data) {
									if (!isActive) return;

									// Store complete output for debugging
									fullOutputLog += data;
									debugLog("Server Output", data);

									// Use improved URL detection
									if (data.includes("Local:") || data.includes("localhost")) {
										const portOrUrl = extractServerUrl(data);
										if (portOrUrl) {
											debugLog("Server URL", `Detected server URL: ${portOrUrl}`);

											// Force URL to ensure it gets set
											setServerUrl(portOrUrl);
											sessionStorage.setItem(`webcontainer-url-${projectName}`, portOrUrl);
											setIsLoading(false);

											// Directly force the iframe to use this URL
											if (iframeRef.current) {
												debugLog("Iframe", "Forcing iframe to load URL");
												setTimeout(() => {
													if (iframeRef.current) {
														iframeRef.current.src = portOrUrl;
													}
												}, 500);
											}
										}
									}

									// Process the output text
									setStatus({
										message: "Server output",
										error: data,
										isHtml: false,
									});
								},
							})
						);
					}
				} catch (error) {
					console.error("WebContainer error:", error);
					debugLog("Fatal Error", error);

					if (!isActive) return;

					const errorMessage = error instanceof Error ? error.message : "Unknown error";
					setStatus({
						message: "Failed to start WebContainer",
						error: errorMessage,
					});
					setIsLoading(false);
				}
			} catch (error) {
				console.error("WebContainer error:", error);
				debugLog("Fatal Error", error);

				if (!isActive) return;

				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				setStatus({
					message: "Failed to start WebContainer",
					error: errorMessage,
				});
				setIsLoading(false);
			}
		}

		startDevServer();

		return () => {
			// This is the cleanup function - variables can be marked for cleanup here
			// but we don't assign to the original isActive constant
			// Instead we simply return, and the component using this hook will clean itself up
		};
	}, [projectName, serverUrl]);

	// Function to store initial file content for change detection
	async function storeInitialContent(entries: Record<string, FileSystemEntry>, basePath = "") {
		if (!entries) return;

		for (const [name, entry] of Object.entries(entries)) {
			const fullPath = basePath ? `${basePath}/${name}` : name;

			if (entry.kind === "file" && entry.file.contents) {
				lastFileContent.current[fullPath] = entry.file.contents;
			} else if (entry.kind === "directory" && entry.directory) {
				await storeInitialContent(entry.directory, fullPath);
			}
		}
	}

	// Helper function to convert ANSI to HTML
	const convertAnsiToHtml = (text: string) => {
		try {
			const cleanText = stripControlSequences(text);
			const html = `<div class="dark:hidden">${lightConverter.toHtml(cleanText)}</div>
						 <div class="hidden dark:block">${darkConverter.toHtml(cleanText)}</div>`;
			return html;
		} catch (error) {
			console.error("Error converting ANSI to HTML:", error);
			return text;
		}
	};

	// Add this to the component to force the iframe to load after a delay
	useEffect(() => {
		// If we have a server URL but the iframe isn't showing it, force it after a delay
		if (serverUrl && iframeRef.current) {
			const timer = setTimeout(() => {
				debugLog("Iframe Failsafe", "Forcing iframe to load URL after timeout");
				forceIframeToLoadUrl(iframeRef.current, serverUrl);
			}, 2000);

			return () => clearTimeout(timer);
		}
	}, [serverUrl]);

	// Fallback: If server is running but the iframe isn't loading,
	// use a timeout to force it to use the default Vite URL
	useEffect(() => {
		if (isLoading && !serverUrl) {
			const fallbackTimer = setTimeout(() => {
				// If we've been loading for over 45 seconds but don't have a URL,
				// assume Vite is running on the default port and force it
				debugLog("Fallback", "No URL detected after 45s - using fallback URL");
				const fallbackUrl = "http://localhost:5173/";
				setServerUrl(fallbackUrl);
				sessionStorage.setItem(
					`webcontainer-url-${projectName}`,
					fallbackUrl
				);
				setIsLoading(false);

				// Force the iframe to load the URL
				if (iframeRef.current) {
					iframeRef.current.src = fallbackUrl;
				}
			}, 45000);

			return () => clearTimeout(fallbackTimer);
		}
	}, [isLoading, serverUrl, projectName]);

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
							onClick={handleDebugBlobStorage}
							disabled={isLoading || isRefreshing || isDebugging}
						>
							{isDebugging ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Bug className="h-4 w-4" />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>Debug Blob Storage</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							variant="outline"
							onClick={handleRebuild}
							disabled={isLoading || isRefreshing || isRebuilding || isDebugging}
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
							disabled={isLoading || isRefreshing || isRebuilding || isDebugging}
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
						src={serverUrl ?
							// If it's a port number, use direct port reference (WebContainer handles the rest)
							/^\d+$/.test(serverUrl) ? `http://localhost:${serverUrl}/` : serverUrl
							: "about:blank"}
					/>

					{/* Loading layer */}
					{(isLoading || isIframeLoading || !serverUrl || status.error) && (
						<div className="z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm [grid-area:stack]">
							{(isLoading || isIframeLoading) && <Loader2 className="h-6 w-6 animate-spin" />}
							<div className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap text-center font-mono dark:text-white">
								{status.isHtml ? (
									<SafeHtmlOutput html={status.message} />
								) : (
									<span className="whitespace-pre-wrap font-mono text-sm">{status.message}</span>
								)}
								{status.error && (
									<div className="mt-2 max-w-md text-sm text-red-500 dark:text-red-400">
										{status.isHtml ? <SafeHtmlOutput html={status.error} /> : status.error}
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
