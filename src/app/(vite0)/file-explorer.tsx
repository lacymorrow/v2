"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectStore } from "@/app/(vite0)/use-project-store";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/server/services/file-system";
import {
	ChevronDown,
	ChevronRight,
	File,
	Folder,
	Loader2,
	RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";

interface FileExplorerProps {
	selectedFile?: string | null;
	projectName?: string | null;
	initialTree?: TreeNode | null;
}

function TreeNodeComponent({
	node,
	selectedFile,
	projectName,
	level = 0,
}: {
	node: TreeNode;
	selectedFile?: string | null;
	projectName?: string | null;
	level?: number;
}) {
	const [isExpanded, setIsExpanded] = useState(true);
	const hasChildren = Object.keys(node.children).length > 0;
	const { setFile } = useProjectStore();

	return (
		<div className="flex flex-col">
			<Button
				variant="ghost"
				size="sm"
				className={cn(
					"h-8 justify-start px-2 hover:bg-accent hover:text-accent-foreground",
					selectedFile === node.path && "bg-accent text-accent-foreground",
				)}
				style={{ paddingLeft: `${(level + 1) * 12}px` }}
				onClick={async () => {
					if (node.type === "directory") {
						setIsExpanded(!isExpanded);
					} else if (projectName) {
						try {
							const response = await fetch(
								`/api/files?path=${encodeURIComponent(
									node.path,
								)}&project=${encodeURIComponent(projectName)}`,
							);
							const data = await response.json();
							setFile(node.path, data.content);
						} catch (error) {
							console.error("Failed to load file:", error);
							setFile(node.path, "// Failed to load file contents");
						}
					}
				}}
			>
				<div className="flex items-center">
					{node.type === "directory" ? (
						<>
							{isExpanded ? (
								<ChevronDown className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
							) : (
								<ChevronRight className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
							)}
							<Folder className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
						</>
					) : (
						<File className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
					)}
					<span className="truncate">{node.name}</span>
				</div>
			</Button>
			{hasChildren && isExpanded && (
				<div className="flex flex-col">
					{Object.values(node.children)
						.sort((a, b) => {
							if (a.type === "directory" && b.type === "file") return -1;
							if (a.type === "file" && b.type === "directory") return 1;
							return a.name.localeCompare(b.name);
						})
						.map((child) => (
							<TreeNodeComponent
								key={child.path}
								node={child}
								selectedFile={selectedFile}
								projectName={projectName}
								level={level + 1}
							/>
						))}
				</div>
			)}
		</div>
	);
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

	useEffect(() => {
		async function loadFileTree() {
			if (!projectName) {
				setFileTree(null);
				return;
			}

			setIsLoading(true);
			try {
				const response = await fetch(
					`/api/files/tree?project=${encodeURIComponent(projectName)}`,
					{
						cache: "no-store",
						headers: {
							Accept: "application/json",
						},
					},
				);
				if (!response.ok) throw new Error("Failed to load file tree");
				const data = await response.json();
				setFileTree(data.tree);
			} catch (error) {
				console.error("Failed to load file tree:", error);
			} finally {
				setIsLoading(false);
			}
		}

		loadFileTree();
	}, [projectName]);

	// Listen for file tree changes
	useEffect(() => {
		if (!projectName) return;

		let retryCount = 0;
		const maxRetries = 3;
		let eventSource: EventSource | null = null;

		function setupEventSource() {
			if (eventSource || typeof projectName === "undefined") {
				eventSource.close();
			}

			eventSource = new EventSource(
				`/api/files/events?project=${encodeURIComponent(projectName)}`,
			);

			eventSource.addEventListener("open", () => {
				retryCount = 0;
				setIsConnected(true);
			});

			eventSource.addEventListener("error", (event) => {
				setIsConnected(false);
				console.error("SSE connection error:", event);

				if (retryCount < maxRetries) {
					retryCount++;
					// Exponential backoff: 1s, 2s, 4s
					const delay = Math.pow(2, retryCount - 1) * 1000;
					setTimeout(setupEventSource, delay);
				}
			});

			eventSource.addEventListener("message", async (event) => {
				try {
					const data = JSON.parse(event.data);
					switch (data.type) {
						case "connected":
							setIsConnected(true);
							break;
						case "refresh":
							if (data.projectName === projectName) {
								await refreshFileTree();
							}
							break;
						case "heartbeat":
							// Heartbeat received, connection is alive
							setIsConnected(true);
							break;
					}
				} catch (error) {
					console.error("Error processing SSE message:", error);
				}
			});
		}

		setupEventSource();

		return () => {
			if (eventSource) {
				eventSource.close();
			}
		};
	}, [projectName]);

	async function refreshFileTree() {
		if (!projectName || isRefreshing) return;

		setIsRefreshing(true);
		try {
			const response = await fetch(
				`/api/files/tree?project=${encodeURIComponent(projectName)}`,
				{
					cache: "no-store",
					headers: {
						Accept: "application/json",
					},
				},
			);
			if (!response.ok) throw new Error("Failed to load file tree");
			const data = await response.json();
			setFileTree(data.tree);
		} catch (error) {
			console.error("Failed to refresh file tree:", error);
		} finally {
			setIsRefreshing(false);
		}
	}

	if (!projectName || isLoading) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				<div className="flex flex-col items-center gap-2">
					<Loader2 className="h-8 w-8 animate-spin" />
					<span>
						{isLoading
							? "Loading files..."
							: "Generate a project to view files"}
					</span>
				</div>
			</div>
		);
	}

	if (!fileTree) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				<span>No files found</span>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
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
						onClick={refreshFileTree}
						disabled={isRefreshing}
					>
						<RefreshCw
							className={cn("h-4 w-4", isRefreshing && "animate-spin")}
						/>
					</Button>
				</div>
			</div>
			<ScrollArea className="flex-1">
				<div className="p-2">
					<TreeNodeComponent
						node={fileTree}
						selectedFile={selectedFile}
						projectName={projectName}
					/>
				</div>
			</ScrollArea>
		</div>
	);
}
