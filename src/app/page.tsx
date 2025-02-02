"use client";

import { CodeEditor } from "@/components/code-editor";
import { FileExplorer } from "@/components/file-explorer";
import { Preview } from "@/components/preview";
import { ProjectHeader } from "@/components/project-header";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/hooks/use-project-store";
import { Progress } from "@/components/ui/progress";
import { Chat } from "@/components/chat";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ResizablePanels } from "@/components/resizable-panels";
import { useMediaQuery } from "@/hooks/use-media-query";
import { LayoutToggle } from "@/components/layout-toggle";

export default function HomePage() {
	const {
		projectName,
		projectUrl,
		selectedFile,
		fileContent,
		isLoading,
		generationStatus,
		setProject,
		setLoading,
		setGenerationStatus,
		reset,
	} = useProjectStore();
	const [isChatCollapsed, setIsChatCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
	const [showFileTree, setShowFileTree] = useState(true);
	const [showChat, setShowChat] = useState(true);
	const [showPreview, setShowPreview] = useState(true);
	const [useWebContainer, setUseWebContainer] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 1024px)");

	// Reset loading state on mount
	useEffect(() => {
		setLoading(false);
	}, [setLoading]);

	async function handleGenerate(prompt: string) {
		if (!prompt || isLoading) return;

		try {
			setLoading(true);
			setGenerationStatus(null);

			const eventSource = new EventSource(
				`/api/generate/events?prompt=${encodeURIComponent(prompt)}`,
			);

			return new Promise<void>((resolve, reject) => {
				eventSource.addEventListener("start", (e) => {
					const data = JSON.parse(e.data);
					console.log("Generation started:", data);
				});

				eventSource.addEventListener("progress", (e) => {
					const data = JSON.parse(e.data);
					setGenerationStatus(data);
				});

				eventSource.addEventListener("complete", (e) => {
					const data = JSON.parse(e.data);
					setProject(data.name, data.url);
					setLoading(false);
					eventSource.close();
					resolve();
				});

				eventSource.addEventListener("error", (e) => {
					console.error("Generation failed:", e);
					setLoading(false);
					eventSource.close();
					reject(new Error("Generation failed"));
				});

				// Add cleanup on unmount
				return () => {
					eventSource.close();
					setLoading(false);
				};
			});
		} catch (error) {
			console.error("Generation error:", error);
			setLoading(false);
			throw error;
		}
	}

	// Build the panels array based on what's visible
	const panels = [
		showFileTree && (
			<div key="file-tree" className="h-full">
				<FileExplorer selectedFile={selectedFile} projectName={projectName} />
			</div>
		),
		<div key="main" className="h-full">
			{showPreview ? (
				<Preview
					url={projectUrl}
					projectName={projectName}
					useWebContainer={useWebContainer}
				/>
			) : (
				<CodeEditor path={selectedFile} content={fileContent} />
			)}
		</div>,
		showChat && (
			<div key="chat" className="h-full">
				<Chat
					onGenerate={handleGenerate}
					isGenerating={isLoading}
					generationStatus={generationStatus}
					projectName={projectName}
				/>
			</div>
		),
	].filter(Boolean);

	// Calculate default sizes based on visible panels
	const defaultSizes = (() => {
		const count = panels.length;
		if (count === 1) return [100];
		if (count === 2) return [20, 80];
		return [15, 65, 20];
	})();

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<ProjectHeader
				onGenerate={handleGenerate}
				isGenerating={isLoading}
				projectName={projectName}
				onToggleWebContainer={() => setUseWebContainer(!useWebContainer)}
				useWebContainer={useWebContainer}
			/>
			<LayoutToggle
				showFileTree={showFileTree}
				showChat={showChat}
				showPreview={showPreview}
				onToggleFileTree={() => setShowFileTree(!showFileTree)}
				onToggleChat={() => setShowChat(!showChat)}
				onTogglePreview={() => setShowPreview(!showPreview)}
			/>
			<div className="flex-1 overflow-hidden p-4">
				<div className="h-full overflow-hidden rounded-lg border bg-card">
					<ResizablePanels
						axis={isDesktop ? "x" : "y"}
						defaultSizes={defaultSizes}
					>
						{panels}
					</ResizablePanels>
				</div>
			</div>
		</div>
	);
}
