"use client";

import { FileExplorer } from "@/components/file-explorer";
import { Preview } from "@/components/preview";
import { ProjectHeader } from "@/components/project-header";
import { ResizablePanels } from "@/components/resizable-panels";
import { Card } from "@/components/ui/card";
import { generateRandomName } from "@/lib/utils";
import { useState } from "react";

export default function HomePage() {
	const [isGenerating, setIsGenerating] = useState(false);
	const [selectedFile, setSelectedFile] = useState<string | null>(null);
	const [projectUrl, setProjectUrl] = useState<string | null>(null);

	async function handleGenerate() {
		setIsGenerating(true);
		try {
			const response = await fetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: "Basic React app",
					name: generateRandomName(),
				}),
			});

			const data = await response.json();
			if (data.error) throw new Error(data.error);
			if (data.publicUrl) setProjectUrl(data.publicUrl);
		} catch (error) {
			console.error("Failed to generate project:", error);
		} finally {
			setIsGenerating(false);
		}
	}

	return (
		<div className="flex h-screen flex-col">
			<ProjectHeader onGenerate={handleGenerate} isGenerating={isGenerating} />
			<div className="flex-1 p-4">
				<Card className="h-full">
					<ResizablePanels>
						<FileExplorer
							selectedFile={selectedFile}
							onSelectFile={setSelectedFile}
						/>
						<Preview url={projectUrl} />
					</ResizablePanels>
				</Card>
			</div>
		</div>
	);
}
