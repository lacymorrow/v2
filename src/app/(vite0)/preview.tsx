"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExternalLink, Loader2, RefreshCcw } from "lucide-react";
import { useState } from "react";

interface PreviewProps {
	url?: string | null;
}

export function Preview({ url }: PreviewProps) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [key, setKey] = useState(0);

	if (!url) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				Generate a project to see the preview
			</div>
		);
	}

	async function handleRefresh() {
		setIsRefreshing(true);
		setKey((prev) => prev + 1);
		await new Promise((resolve) => setTimeout(resolve, 500));
		setIsRefreshing(false);
	}

	return (
		<div className="relative h-full">
			<div className="absolute right-4 top-4 z-10 flex gap-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant="outline"
								onClick={handleRefresh}
								disabled={isRefreshing}
							>
								{isRefreshing ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCcw className="h-4 w-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>Refresh preview</TooltipContent>
					</Tooltip>

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
				</TooltipProvider>
			</div>

			<div className="h-full overflow-hidden border-l">
				<iframe
					key={key}
					src={url}
					className="h-full w-full border-none"
					sandbox="allow-scripts allow-same-origin"
				/>
			</div>
		</div>
	);
}
