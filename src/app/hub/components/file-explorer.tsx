"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { File, Folder } from "lucide-react";

interface FileExplorerProps {
	selectedFile: string | null;
	onSelectFile: (file: string) => void;
}

export function FileExplorer({
	selectedFile,
	onSelectFile,
}: FileExplorerProps) {
	return (
		<ScrollArea className="h-full">
			<div className="p-2">
				<div className="flex items-center gap-2 p-2 text-sm font-medium">
					<Folder className="h-4 w-4" />
					<span>src</span>
				</div>
				<div className="ml-4">
					<FileItem
						name="App.tsx"
						selected={selectedFile === "App.tsx"}
						onClick={() => onSelectFile("App.tsx")}
					/>
					<FileItem
						name="main.tsx"
						selected={selectedFile === "main.tsx"}
						onClick={() => onSelectFile("main.tsx")}
					/>
				</div>
			</div>
		</ScrollArea>
	);
}

interface FileItemProps {
	name: string;
	selected?: boolean;
	onClick?: () => void;
}

function FileItem({ name, selected, onClick }: FileItemProps) {
	return (
		<div
			className={cn(
				"flex cursor-pointer items-center gap-2 rounded p-2 text-sm",
				"hover:bg-accent",
				selected && "bg-accent",
			)}
			onClick={onClick}
		>
			<File className="h-4 w-4" />
			<span>{name}</span>
		</div>
	);
}
