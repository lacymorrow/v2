"use client";

import { CodeEditor } from "@/components/code-editor";
import { FileExplorer } from "@/components/file-explorer";
import { Preview } from "@/components/preview";
import { ProjectHeader } from "@/components/project-header";
import { ResizablePanels } from "@/components/resizable-panels";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/hooks/use-project-store";
import { Progress } from "@/components/ui/progress";
import { Chat } from "@/components/chat";
import { cn } from "@/lib/utils";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useState } from "react";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	} = useProjectStore();
	const [isChatCollapsed, setIsChatCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
	const [showFileTree, setShowFileTree] = useState(true);
	const [showChat, setShowChat] = useState(true);
	const [showPreview, setShowPreview] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 1024px)");

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
		<div className="flex h-screen flex-col">
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
			<div className="flex-1 p-4">
				<div className="h-full overflow-hidden rounded-lg border bg-card">
					<ResizablePanelGroup
						direction={isDesktop ? "horizontal" : "vertical"}
					>
						{showFileTree && (
							<>
								<ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
									<FileExplorer
										selectedFile={selectedFile}
										projectName={projectName}
									/>
								</ResizablePanel>
								<ResizableHandle withHandle />
							</>
						)}
						<ResizablePanel defaultSize={showPreview ? 65 : 80}>
							{showPreview ? (
								<Preview url={projectUrl} />
							) : (
								<CodeEditor path={selectedFile} content={fileContent} />
							)}
						</ResizablePanel>
						{showChat && (
							<>
								<ResizableHandle withHandle />
								<ResizablePanel defaultSize={20}>
									<Chat
										onGenerate={handleGenerate}
										isGenerating={isLoading}
										generationStatus={generationStatus}
									/>
								</ResizablePanel>
							</>
						)}
					</ResizablePanelGroup>
				</div>
			</div>
		</div>
	);
}
