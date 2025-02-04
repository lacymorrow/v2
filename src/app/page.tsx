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
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { LayoutToggle } from "@/components/layout-toggle";
import { useMediaQuery } from "@/hooks/use-media-query";

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
	const [showFileTree, setShowFileTree] = useState(true);
	const [showChat, setShowChat] = useState(true);
	const [showPreview, setShowPreview] = useState(true);
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

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<ProjectHeader
				onGenerate={handleGenerate}
				isGenerating={isLoading}
				projectName={projectName}
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
					<div className="grid h-full grid-cols-1 lg:grid-cols-12">
						{showFileTree && (
							<div className="col-span-2 border-r">
								<FileExplorer
									selectedFile={selectedFile}
									projectName={projectName}
								/>
							</div>
						)}
						<div
							className={cn(
								"col-span-1",
								showFileTree ? "lg:col-span-7" : "lg:col-span-9",
								showChat ? "" : "lg:col-span-10",
							)}
						>
							{showPreview ? (
								<Preview
									url={projectUrl}
									projectName={projectName ?? undefined}
								/>
							) : (
								<CodeEditor path={selectedFile} content={fileContent} />
							)}
						</div>
						{showChat && (
							<div className="col-span-1 border-l lg:col-span-3">
								<Chat
									onGenerate={handleGenerate}
									isGenerating={isLoading}
									generationStatus={generationStatus}
									projectName={projectName ?? undefined}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
