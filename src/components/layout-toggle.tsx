"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FolderTree, MessageSquare, MonitorIcon, Code2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./ui/theme";

interface LayoutToggleProps {
	showFileTree: boolean;
	showChat: boolean;
	showPreview: boolean;
	onToggleFileTree: () => void;
	onToggleChat: () => void;
	onTogglePreview: () => void;
}

export function LayoutToggle({
	showFileTree,
	showChat,
	showPreview,
	onToggleFileTree,
	onToggleChat,
	onTogglePreview,
}: LayoutToggleProps) {
	return (
		<div className="border-b px-4 py-2">
			<div className="flex items-center gap-1">
				{/* Panel Toggles */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							onClick={onToggleFileTree}
							className={cn(
								"h-8 w-8 p-0",
								showFileTree && "bg-accent text-accent-foreground",
							)}
						>
							<FolderTree className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Toggle File Tree</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							onClick={onToggleChat}
							className={cn(
								"h-8 w-8 p-0",
								showChat && "bg-accent text-accent-foreground",
							)}
						>
							<MessageSquare className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Toggle Chat</TooltipContent>
				</Tooltip>

				<Separator orientation="vertical" className="mx-1 h-6" />

				{/* View Mode */}
				<div className="flex rounded-md border">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={onTogglePreview}
								className={cn(
									"h-8 w-8 rounded-none rounded-l-md p-0",
									!showPreview && "bg-accent text-accent-foreground",
								)}
							>
								<Code2 className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Show Code</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={onTogglePreview}
								className={cn(
									"h-8 w-8 rounded-none rounded-r-md p-0",
									showPreview && "bg-accent text-accent-foreground",
								)}
							>
								<MonitorIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Show Preview</TooltipContent>
					</Tooltip>
					<ThemeToggle />
				</div>
			</div>
		</div>
	);
}
