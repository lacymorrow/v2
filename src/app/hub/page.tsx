"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateRandomName } from "@/lib/utils";
import { Loader2, Play, Plus } from "lucide-react";
import { useState } from "react";
import { FileExplorer } from "./components/file-explorer";
import { Preview } from "./components/preview";
import { ResizablePanels } from "./components/resizable-panels";

export default function HubPage() {
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
		<div className="flex h-screen flex-col gap-4 p-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Project Hub</h1>
				<div className="flex gap-2">
					<Button
						onClick={handleGenerate}
						disabled={isGenerating}
						size="sm"
						variant="outline"
					>
						{isGenerating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Generating...
							</>
						) : (
							<>
								<Plus className="mr-2 h-4 w-4" />
								New Project
							</>
						)}
					</Button>
					<Button size="sm" variant="default">
						<Play className="mr-2 h-4 w-4" />
						Run Project
					</Button>
				</div>
			</div>

			<Card className="flex-1">
				<ResizablePanels>
					<FileExplorer
						selectedFile={selectedFile}
						onSelectFile={setSelectedFile}
					/>
					<Preview url={projectUrl} />
				</ResizablePanels>
			</Card>
		</div>
	);
}
