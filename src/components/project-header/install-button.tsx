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
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitForkIcon, Loader2 } from "lucide-react";
import { useState } from "react";

export function InstallButton() {
	const [isInstalling, setIsInstalling] = useState(false);
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
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

	return (
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
	);
}
