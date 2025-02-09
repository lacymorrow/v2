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

interface WebContainerPreviewProps {
	projectName?: string | null;
}

type Status = {
	message: string;
	error?: string;
};

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
	const [status, setStatus] = useState<Status>({ message: "Initializing..." });
	const containerManager = useRef(WebContainerManager.getInstance());

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			containerManager.current.teardown();
		};
	}, []);

	useEffect(() => {
		if (!projectName) return;

		let isActive = true;
		async function startDevServer() {
			try {
				if (!isActive) return;
				setIsLoading(true);
				setStatus({ message: "Initializing WebContainer..." });

				// Get WebContainer instance
				const instance = await containerManager.current.getContainer();

				// Load project files from the generated app directory
				setStatus({ message: "Loading project files..." });
				const response = await fetch(`/api/files/${projectName}`);
				if (!response.ok) {
					throw new Error(
						`Failed to load project files: ${response.statusText}`,
					);
				}
				const files = await response.json();

				// Mount the project files
				setStatus({ message: "Mounting project files..." });
				try {
					await instance.mount(files);
				} catch (error) {
					console.error("Mount error:", error);
					throw new Error(
						`Failed to mount files: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}

				// Install dependencies
				setStatus({ message: "Installing dependencies..." });
				const installProcess = await instance.spawn("pnpm", ["install"]);

				// Capture install output
				const reader = installProcess.output.getReader();
				let installOutput = "";
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						installOutput += value;
						console.log("Install output:", value);
					}
				} finally {
					reader.releaseLock();
				}

				const installExitCode = await installProcess.exit;
				if (installExitCode !== 0) {
					throw new Error(
						`Installation failed with exit code ${installExitCode}. Output: ${installOutput}`,
					);
				}

				// Start the dev server
				setStatus({ message: "Starting development server..." });
				const devProcess = await instance.spawn("pnpm", ["run", "dev"]);

				// Wait for the server to be ready
				instance.on("server-ready", (port, url) => {
					if (!isActive) return;
					if (iframeRef.current) {
						iframeRef.current.src = url;
					}
					setIsLoading(false);
					setStatus({ message: "Development server is running" });
				});

				// Listen for dev server output
				const devReader = devProcess.output.getReader();
				try {
					while (true) {
						const { done, value } = await devReader.read();
						if (done) break;
						console.log("Dev server output:", value);
					}
				} finally {
					devReader.releaseLock();
				}
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

			<div className="h-full overflow-hidden border-l">
				{isLoading || status.error ? (
					<div className="flex h-full flex-col items-center justify-center gap-2">
						{isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
						<span className="text-center">
							{status.message}
							{status.error && (
								<div className="mt-2 max-w-md text-sm text-red-500">
									{status.error}
								</div>
							)}
						</span>
					</div>
				) : (
					<iframe
						ref={iframeRef}
						className="h-full w-full border-none"
						sandbox="allow-scripts allow-same-origin"
						title="Project Preview"
					/>
				)}
			</div>
		</div>
	);
}
