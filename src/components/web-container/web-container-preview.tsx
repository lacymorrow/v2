"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { teardownWebContainer } from "@/server/services/webcontainer-service";
import { Loader2 } from "lucide-react";

interface WebContainerPreviewProps {
	projectName: string;
}

function verifySecurityHeaders(): boolean {
	// Check if crossOriginIsolated is true
	const isIsolated = window.crossOriginIsolated;
	console.log("Security context:", {
		crossOriginIsolated: isIsolated,
		coep: document
			.querySelector('meta[http-equiv="Cross-Origin-Embedder-Policy"]')
			?.getAttribute("content"),
		coop: document
			.querySelector('meta[http-equiv="Cross-Origin-Opener-Policy"]')
			?.getAttribute("content"),
	});
	return isIsolated;
}

export function WebContainerPreview({ projectName }: WebContainerPreviewProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [serverUrl, setServerUrl] = useState<string | null>(null);
	const [iframeLoading, setIframeLoading] = useState(true);
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	// Handle iframe load events
	const handleIframeLoad = useCallback(() => {
		console.log("Iframe loaded:", iframeRef.current?.src);
		setIframeLoading(false);
	}, []);

	const handleIframeError = useCallback(() => {
		console.error("Iframe failed to load:", iframeRef.current?.src);
		setError(
			"Failed to load preview. The development server may not be running correctly.",
		);
		setIframeLoading(false);
	}, []);

	const initWebContainer = useCallback(async () => {
		console.log("Initializing WebContainer for project:", projectName);
		try {
			if (!mounted.current) return;
			setIsLoading(true);
			setError(null);

			// Verify security headers
			if (!verifySecurityHeaders()) {
				throw new Error(
					"Cross-Origin Isolation is not enabled. SharedArrayBuffer cannot be used.",
				);
			}

			// Clean up any existing instance
			console.log("Cleaning up existing WebContainer instance");
			await teardownWebContainer();

			// Get template files
			console.log("Fetching template files");
			const response = await fetch(`/api/templates/${projectName}`);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error("Template fetch failed:", {
					status: response.status,
					statusText: response.statusText,
					headers: Object.fromEntries(response.headers.entries()),
					error: errorData,
				});
				throw new Error(errorData.error || "Failed to fetch template files");
			}
			const files = await response.json();
			console.log("Template files fetched successfully", {
				fileCount: Object.keys(files).length,
			});

			// Initialize WebContainer
			console.log("Importing WebContainer services");
			const { getWebContainer, installDependencies, startDevServer } =
				await import("@/server/services/webcontainer-service");

			console.log("Getting WebContainer instance");
			await getWebContainer();

			console.log("Installing dependencies");
			await installDependencies(files);

			console.log("Starting dev server");
			const url = await startDevServer();
			console.log("Dev server started at:", url);

			if (!mounted.current) return;
			setServerUrl(url);

			// Load the URL in the iframe
			if (iframeRef.current) {
				console.log("Loading URL in iframe:", url);
				iframeRef.current.src = url;
			}
		} catch (err) {
			console.error("WebContainer initialization error:", {
				error: err,
				errorMessage: err instanceof Error ? err.message : "Unknown error",
				errorStack: err instanceof Error ? err.stack : undefined,
				projectName,
			});

			if (!mounted.current) return;
			setError(
				err instanceof Error
					? err.message
					: "Failed to initialize WebContainer",
			);
			// Clean up on error
			await teardownWebContainer();
		} finally {
			if (mounted.current) {
				setIsLoading(false);
			}
		}
	}, [projectName]);

	useEffect(() => {
		initWebContainer();

		// Cleanup on unmount
		return () => {
			teardownWebContainer().catch(console.error);
		};
	}, [initWebContainer]);

	if (error) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-center">
					<p className="mb-4 text-destructive">{error}</p>
					<Button onClick={initWebContainer}>Retry</Button>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-center">
					<Loader2 className="mb-4 h-6 w-6 animate-spin" />
					<p className="text-muted-foreground">
						Starting development server...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full">
			{/* Debug Panel */}
			<div className="absolute left-4 top-4 z-10 rounded-md bg-background/80 p-4 shadow-sm backdrop-blur">
				<div className="space-y-2 text-sm">
					<p>Status: {iframeLoading ? "Loading Preview" : "Ready"}</p>
					<p>Server URL: {serverUrl || "Not started"}</p>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								if (serverUrl) {
									window.open(serverUrl, "_blank");
								}
							}}
							disabled={!serverUrl}
						>
							Open in New Tab
						</Button>
						<Button size="sm" variant="outline" onClick={initWebContainer}>
							Restart Server
						</Button>
					</div>
				</div>
			</div>

			{iframeLoading && serverUrl && (
				<div className="absolute inset-0 flex items-center justify-center bg-background">
					<div className="text-center">
						<Loader2 className="mb-4 h-6 w-6 animate-spin" />
						<p className="text-muted-foreground">
							Loading preview at {serverUrl}...
						</p>
					</div>
				</div>
			)}
			<iframe
				ref={iframeRef}
				className="h-full w-full border-none"
				title="WebContainer Preview"
				onLoad={handleIframeLoad}
				onError={handleIframeError}
				src={serverUrl || "about:blank"}
			/>
		</div>
	);
}
