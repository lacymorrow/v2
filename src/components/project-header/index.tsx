"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DownloadButton } from "./download-button";
import { InstallButton } from "./install-button";
import { GenerateButton } from "./generate-button";
import { PromptInput } from "./prompt-input";

export interface ProjectHeaderProps {
	onGenerate: (prompt: string) => Promise<void>;
	isGenerating: boolean;
	projectName?: string | null;
}

export function ProjectHeader({
	onGenerate,
	isGenerating,
	projectName,
}: ProjectHeaderProps) {
	const [prompt, setPrompt] = useState("Basic React app");

	const handleGenerate = async () => {
		if (prompt.trim()) {
			await onGenerate(prompt);
		}
	};

	return (
		<div className="flex items-center justify-between gap-4 border-b px-4 py-3">
			<div className="flex flex-1 items-center gap-4">
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">React App Generator</h1>
					{projectName && (
						<span className="text-sm text-muted-foreground">{projectName}</span>
					)}
				</div>
				<div className="flex-1">
					<PromptInput
						value={prompt}
						onChange={setPrompt}
						disabled={isGenerating}
					/>
				</div>
			</div>
			<div className="flex gap-2">
				<TooltipProvider>
					<DownloadButton projectName={projectName} />
					<InstallButton />
					<GenerateButton
						onGenerate={handleGenerate}
						isGenerating={isGenerating}
						disabled={!prompt.trim()}
					/>
				</TooltipProvider>
			</div>
		</div>
	);
}
