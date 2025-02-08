"use client";

import { WebContainerPreview } from "@/components/web-container/web-container-preview";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Code2 } from "lucide-react";
import { useState, useEffect } from "react";
import { teardownWebContainer } from "@/server/services/webcontainer-service";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface PreviewProps {
	url?: string | null;
	projectName?: string;
}

export function Preview({ url, projectName }: PreviewProps) {
	const [useWebContainer, setUseWebContainer] = useState(true);

	// Clean up WebContainer when toggling or unmounting
	useEffect(() => {
		return () => {
			console.log("Preview component unmounting, cleaning up WebContainer");
			teardownWebContainer().catch(console.error);
		};
	}, []);

	async function handleToggleWebContainer() {
		if (useWebContainer) {
			// Clean up before disabling
			console.log("Cleaning up WebContainer before disabling");
			await teardownWebContainer();
		}
		setUseWebContainer(!useWebContainer);
	}

	if (!url && !projectName) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				<span>Generate a project to see a preview</span>
			</div>
		);
	}

	return (
		<div className="relative h-full">
			{/* Preview Controls */}
			<div className="absolute right-4 top-4 z-10 flex gap-2">
				<TooltipProvider>
					{projectName && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant={useWebContainer ? "default" : "outline"}
									onClick={handleToggleWebContainer}
								>
									<Code2 className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{useWebContainer
									? "Using WebContainer (Live)"
									: "Switch to WebContainer"}
							</TooltipContent>
						</Tooltip>
					)}

					{url && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button size="icon" variant="outline" asChild>
									<a href={url} target="_blank" rel="noopener noreferrer">
										<ExternalLink className="h-4 w-4" />
									</a>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Open in new window</TooltipContent>
						</Tooltip>
					)}
				</TooltipProvider>
			</div>

			{/* Preview Content */}
			{useWebContainer && projectName ? (
				<WebContainerPreview
					key={`webcontainer-${projectName}-${Date.now()}`}
					projectName={projectName}
				/>
			) : (
				<Card className="h-full w-full overflow-hidden">
					<iframe
						src={url ?? "about:blank"}
						className="h-full w-full border-none"
						title="Project Preview"
					/>
				</Card>
			)}
		</div>
	);
}
