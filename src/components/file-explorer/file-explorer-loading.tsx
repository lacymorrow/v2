"use client";

import { Loader2 } from "lucide-react";

interface FileExplorerLoadingProps {
	isLoading: boolean;
	message?: string;
}

export function FileExplorerLoading({
	isLoading,
	message = "Generate a project to view files",
}: FileExplorerLoadingProps) {
	return (
		<div className="flex h-full items-center justify-center text-muted-foreground">
			<div className="flex flex-col items-center gap-2">
				<Loader2 className="h-8 w-8 animate-spin" />
				<span>{isLoading ? "Loading files..." : message}</span>
			</div>
		</div>
	);
}

export function FileExplorerEmpty() {
	return (
		<div className="flex h-full items-center justify-center text-muted-foreground">
			<span>No files found</span>
		</div>
	);
}
