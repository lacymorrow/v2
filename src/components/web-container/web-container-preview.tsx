"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { WebContainer } from "@webcontainer/api";

interface WebContainerPreviewProps {
	projectName: string;
}

export function WebContainerPreview({ projectName }: WebContainerPreviewProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [serverUrl, setServerUrl] = useState<string | null>(null);

	useEffect(() => {
		async function initWebContainer() {
			try {
				console.log(
					"🚀 Initializing WebContainer preview for project:",
					projectName,
				);
				setIsLoading(true);
				setError(null);

				// Get template files
				console.log("📦 Fetching template files...");
				const response = await fetch(`/api/templates/${projectName}`);
				if (!response.ok) {
					throw new Error("Failed to fetch template files");
				}
				const files = await response.json();
				console.log("✅ Template files fetched successfully");
				console.log("📂 Files structure:", Object.keys(files));

				// Initialize WebContainer
				console.log("⚡ Loading WebContainer services...");
				const {
					getWebContainer,
					mountFiles,
					installDependencies,
					startDevServer,
				} = await import("@/server/services/webcontainer-service");

				// Get WebContainer instance
				console.log("🔄 Getting WebContainer instance...");
				const container = await getWebContainer();
				console.log("✅ WebContainer instance ready");

				// Mount files
				console.log("📂 Mounting project files...");
				await mountFiles(container, files);
				console.log("✅ Files mounted successfully");

				// Install dependencies
				console.log("📦 Installing dependencies...");
				await installDependencies(container);
				console.log("✅ Dependencies installed successfully");

				// Start dev server
				console.log("🚀 Starting development server...");
				const url = await startDevServer(container);
				console.log("✅ Development server started at:", url);
				setServerUrl(url);

				// Load the URL in the iframe
				if (iframeRef.current) {
					console.log("🖼️ Loading preview in iframe...");
					iframeRef.current.src = url;
				}
			} catch (err) {
				console.error("❌ WebContainer error:", err);
				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to initialize WebContainer";
				console.error("❌ Error details:", errorMessage);
				setError(errorMessage);
			} finally {
				setIsLoading(false);
			}
		}

		initWebContainer();

		// Cleanup function
		return () => {
			console.log("🧹 Cleaning up WebContainer...");
			const { cleanup } = require("@/server/services/webcontainer-service");
			cleanup();
			console.log("✅ Cleanup complete");
		};
	}, [projectName]);

	return (
		<Card className="relative h-[600px] w-full">
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/80">
					<Spinner className="h-8 w-8" />
					<span className="ml-2">Loading preview...</span>
				</div>
			)}

			{error && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
					<p className="mb-4 text-destructive">{error}</p>
					<Button variant="outline" onClick={() => window.location.reload()}>
						Retry
					</Button>
				</div>
			)}

			<iframe
				ref={iframeRef}
				className="h-full w-full border-none"
				title="Project Preview"
				sandbox="allow-same-origin allow-scripts allow-forms"
			/>
		</Card>
	);
}
