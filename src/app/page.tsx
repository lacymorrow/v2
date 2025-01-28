"use client";

import { CodeEditor } from "@/components/code-editor";
import { FileExplorer } from "@/components/file-explorer";
import { Preview } from "@/components/preview";
import { ProjectHeader } from "@/components/project-header";
import { ResizablePanels } from "@/components/resizable-panels";
import { Card } from "@/components/ui/card";
import { useProjectStore } from "@/hooks/use-project-store";
import { useState } from "react";

export default function HomePage() {
	const [isGenerating, setIsGenerating] = useState(false);
	const { projectName, projectUrl, selectedFile, fileContent, setProject, setFile } =
		useProjectStore();

	async function handleGenerate() {
		setIsGenerating(true);
		try {
			const response = await fetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			const data = await response.json();
			if (data.error) throw new Error(data.error);
			setProject(data.name, data.publicUrl);
		} catch (error) {
			console.error("Failed to generate project:", error);
		} finally {
			setIsGenerating(false);
		}
	}

	async function handleFileSelect(path: string) {
		if (!projectName) return;

		try {
			const response = await fetch(
				`/api/files?path=${encodeURIComponent(path)}&project=${projectName}`,
			);
			const data = await response.json();
			if (data.error) throw new Error(data.error);
			setFile(path, data.content);
		} catch (error) {
			console.error("Failed to load file:", error);
			setFile(path, "// Failed to load file contents");
		}
	}

	return (
		<div className="flex h-screen flex-col">
			<ProjectHeader
				onGenerate={handleGenerate}
				isGenerating={isGenerating}
				projectName={projectName}
			/>
			<div className="flex-1 p-4">
				<Card className="h-full">
					<ResizablePanels>
						<FileExplorer
							selectedFile={selectedFile}
							onSelectFile={handleFileSelect}
							projectName={projectName}
						/>
						<ResizablePanels>
							<CodeEditor path={selectedFile} content={fileContent} />
							<Preview url={projectUrl} />
						</ResizablePanels>
					</ResizablePanels>
				</Card>
			</div>
		</div>
	);
}
