"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileExplorerHeaderProps {
	onRefresh: () => Promise<void>;
	isRefreshing: boolean;
	isConnected: boolean;
}

export function FileExplorerHeader({
	onRefresh,
	isRefreshing,
	isConnected,
}: FileExplorerHeaderProps) {
	return (
		<div className="flex items-center justify-between border-b p-2">
			<span className="text-sm font-medium">Files</span>
			<div className="flex items-center gap-2">
				{!isConnected && (
					<span className="text-xs text-yellow-500">⚠️ Reconnecting...</span>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onClick={onRefresh}
					disabled={isRefreshing}
				>
					<RefreshCw
						className={cn("h-4 w-4", isRefreshing && "animate-spin")}
					/>
				</Button>
			</div>
		</div>
	);
}
