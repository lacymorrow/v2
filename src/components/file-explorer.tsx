"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, File, Folder, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { useProjectStore } from "@/hooks/use-project-store";

interface FileExplorerProps {
	selectedFile?: string | null;
	projectName?: string | null;
}

interface TreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	children: Record<string, TreeNode>;
}

function TreeNode({
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
							<TreeNode
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

export function FileExplorer({ selectedFile, projectName }: FileExplorerProps) {
	if (!projectName) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				<div className="flex flex-col items-center gap-2">
					<Loader2 className="h-8 w-8 animate-spin" />
					<span>Generate a project to view files</span>
				</div>
			</div>
		);
	}

	const [tree] = useState<TreeNode>({
		name: projectName,
		path: "",
		type: "directory",
		children: {
			src: {
				name: "src",
				path: "src",
				type: "directory",
				children: {
					components: {
						name: "components",
						path: "src/components",
						type: "directory",
						children: {},
					},
					"App.tsx": {
						name: "App.tsx",
						path: "src/App.tsx",
						type: "file",
						children: {},
					},
					"main.tsx": {
						name: "main.tsx",
						path: "src/main.tsx",
						type: "file",
						children: {},
					},
				},
			},
			"package.json": {
				name: "package.json",
				path: "package.json",
				type: "file",
				children: {},
			},
			"vite.config.ts": {
				name: "vite.config.ts",
				path: "vite.config.ts",
				type: "file",
				children: {},
			},
		},
	});

	return (
		<ScrollArea className="h-full">
			<div className="p-2">
				<TreeNode
					node={tree}
					selectedFile={selectedFile}
					projectName={projectName}
				/>
			</div>
		</ScrollArea>
	);
}
