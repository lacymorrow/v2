"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import type { TreeNode } from "@/server/services/file-system";
import { FileTreeNode } from "./file-tree-node";
import { FileExplorerHeader } from "./file-explorer-header";
import {
	FileExplorerEmpty,
	FileExplorerLoading,
} from "./file-explorer-loading";
import { loadFileTree, setupFileTreeEvents } from "./file-explorer-service";

export interface FileExplorerProps {
	selectedFile?: string | null;
	projectName?: string | null;
	initialTree?: TreeNode | null;
}

export function FileExplorer({
	selectedFile,
	projectName,
	initialTree,
}: FileExplorerProps) {
	const [fileTree, setFileTree] = useState<TreeNode | null>(
		initialTree ?? null,
	);
	const [isLoading, setIsLoading] = useState(!initialTree);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isConnected, setIsConnected] = useState(false);

	// Load file tree on project change
	useEffect(() => {
		async function fetchFileTree() {
			if (!projectName) {
				setFileTree(null);
				return;
			}

			setIsLoading(true);
			try {
				const tree = await loadFileTree(projectName);
				setFileTree(tree);
			} catch (error) {
				console.error("Failed to load file tree:", error);
			} finally {
				setIsLoading(false);
			}
		}

		fetchFileTree();
	}, [projectName]);

	// Setup SSE for file tree updates
	useEffect(() => {
		if (!projectName) return;

		const cleanup = setupFileTreeEvents(
			projectName,
			() => setIsConnected(true),
			() => setIsConnected(false),
			refreshFileTree,
		);

		return cleanup;
	}, [projectName]);

	// Handler for manually refreshing the file tree
	async function refreshFileTree() {
		if (!projectName || isRefreshing) return;

		setIsRefreshing(true);
		try {
			const tree = await loadFileTree(projectName);
			setFileTree(tree);
		} catch (error) {
			console.error("Failed to refresh file tree:", error);
		} finally {
			setIsRefreshing(false);
		}
	}

	// Render loading state
	if (!projectName || isLoading) {
		return <FileExplorerLoading isLoading={isLoading} />;
	}

	// Render empty state
	if (!fileTree) {
		return <FileExplorerEmpty />;
	}

	// Render file tree
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<FileExplorerHeader
				onRefresh={refreshFileTree}
				isRefreshing={isRefreshing}
				isConnected={isConnected}
			/>
			<ScrollArea className="flex-1">
				<div className="p-2">
					<FileTreeNode
						node={fileTree}
						selectedFile={selectedFile}
						projectName={projectName}
					/>
				</div>
			</ScrollArea>
		</div>
	);
}
