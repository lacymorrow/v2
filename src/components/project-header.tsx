"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, GitForkIcon, Loader2, Plus } from "lucide-react";
import { useState } from "react";

interface ProjectHeaderProps {
	onGenerate: () => Promise<void>;
	isGenerating: boolean;
}

export function ProjectHeader({
	onGenerate,
	isGenerating,
}: ProjectHeaderProps) {
	const [isInstalling, setIsInstalling] = useState(false);

	async function handleInstall() {
		setIsInstalling(true);
		try {
			// TODO: Implement shadcn install command
			await new Promise((resolve) => setTimeout(resolve, 1000));
		} finally {
			setIsInstalling(false);
		}
	}

	async function handleDownload() {
		// TODO: Implement project download
		console.log("Downloading project...");
	}

	return (
		<div className="flex items-center justify-between border-b px-4 py-3">
			<h1 className="text-lg font-semibold">React App Generator</h1>
			<div className="flex gap-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button onClick={handleDownload} size="sm" variant="outline">
								<Download className="mr-2 h-4 w-4" />
								Download
							</Button>
						</TooltipTrigger>
						<TooltipContent>Download project files</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								onClick={handleInstall}
								size="sm"
								variant="outline"
								disabled={isInstalling}
							>
								{isInstalling ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Installing...
									</>
								) : (
									<>
										<GitForkIcon className="mr-2 h-4 w-4" />
										Add to Codebase
									</>
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>Install components to your project</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button onClick={onGenerate} disabled={isGenerating} size="sm">
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
						</TooltipTrigger>
						<TooltipContent>Generate a new project</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}
