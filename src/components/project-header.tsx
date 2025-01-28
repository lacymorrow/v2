"use client";

import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, GitForkIcon, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProjectHeaderProps {
	onGenerate: (prompt: string) => Promise<void>;
	isGenerating: boolean;
	projectName?: string | null;
}

export function ProjectHeader({
	onGenerate,
	isGenerating,
	projectName,
}: ProjectHeaderProps) {
	const [isInstalling, setIsInstalling] = useState(false);
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const [prompt, setPrompt] = useState("Basic React app");

	const installCommand = 'npx shadcn@latest add "https://cli.bones.sh"';

	async function handleInstall() {
		setIsInstalling(true);
		try {
			// Copy command to clipboard
			await navigator.clipboard.writeText(installCommand);
			// Keep popover open for a moment
			await new Promise((resolve) => setTimeout(resolve, 1000));
		} finally {
			setIsInstalling(false);
			setIsPopoverOpen(false);
		}
	}

	async function handleDownload() {
		if (!projectName) return;

		try {
			const response = await fetch("/api/download", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: projectName }),
			});

			if (!response.ok) throw new Error("Download failed");

			// Create a download link
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${projectName}.zip`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success("Project downloaded successfully");
		} catch (error) {
			console.error("Failed to download project:", error);
			toast.error("Failed to download project");
		}
	}

	return (
		<div className="flex items-center justify-between gap-4 border-b px-4 py-3">
			<div className="flex flex-1 items-center gap-4">
				<h1 className="text-lg font-semibold">React App Generator</h1>
				<div className="flex-1">
					<Input
						placeholder="Describe your app..."
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						disabled={isGenerating}
						className="max-w-xl"
					/>
				</div>
			</div>
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
							<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
								<PopoverTrigger asChild>
									<Button size="sm" variant="outline" disabled={isInstalling}>
										{isInstalling ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Copying...
											</>
										) : (
											<>
												<GitForkIcon className="mr-2 h-4 w-4" />
												Add to Codebase
											</>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-4" align="end">
									<div className="flex flex-col gap-4">
										<div className="text-sm">
											Run this command in your project directory:
										</div>
										<div className="relative">
											<pre className="rounded bg-muted px-4 py-3 font-mono text-sm">
												{installCommand}
											</pre>
											<Button
												size="sm"
												className="absolute right-2 top-2"
												onClick={handleInstall}
											>
												{isInstalling ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													"Copy"
												)}
											</Button>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</TooltipTrigger>
						<TooltipContent>Install components to your project</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								onClick={() => onGenerate(prompt)}
								disabled={isGenerating || !prompt.trim()}
								size="sm"
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
						</TooltipTrigger>
						<TooltipContent>Generate a new project</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}
