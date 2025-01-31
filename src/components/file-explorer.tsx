"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, File, Folder, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useProjectStore } from "@/hooks/use-project-store";
import type { TreeNode } from "@/server/services/file-system";

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
	console.log("FileExplorer rendered with:", {
		projectName,
		selectedFile,
		hasInitialTree: !!initialTree,
		initialTreeStructure: initialTree
			? {
					name: initialTree.name,
					childCount: Object.keys(initialTree.children).length,
					children: Object.keys(initialTree.children),
				}
			: null,
	});

	const [fileTree, setFileTree] = useState<TreeNode | null>(
		initialTree ?? null,
	);
	const [isLoading, setIsLoading] = useState(!initialTree);

	useEffect(() => {
		async function loadFileTree() {
			if (!projectName) {
				console.log("No project name provided, clearing file tree");
				setFileTree(null);
				return;
			}

			console.log(`Loading file tree for project: ${projectName}`);
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
				console.log("Received file tree data:", {
					projectName,
					treeName: data.tree.name,
					childCount: Object.keys(data.tree.children).length,
					children: Object.keys(data.tree.children),
				});
				setFileTree(data.tree);
			} catch (error) {
				console.error("Failed to load file tree:", error);
			} finally {
				setIsLoading(false);
			}
		}

		loadFileTree();
	}, [projectName]);

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
		<ScrollArea className="h-full">
			<div className="p-2">
				<TreeNodeComponent
					node={fileTree}
					selectedFile={selectedFile}
					projectName={projectName}
				/>
			</div>
		</ScrollArea>
	);
}
