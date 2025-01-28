"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface FileExplorerProps {
	selectedFile?: string | null;
	onSelectFile?: (file: string) => void;
	projectName?: string | null;
}

interface TreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	content?: string;
	children: Record<string, TreeNode>;
}

function TreeNode({
	node,
	onSelectFile,
	selectedFile,
	level = 0,
}: {
	node: TreeNode;
	onSelectFile?: (file: string) => void;
	selectedFile?: string | null;
	level?: number;
}) {
	const [isExpanded, setIsExpanded] = useState(true);
	const hasChildren = Object.keys(node.children).length > 0;

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
				onClick={() => {
					if (node.type === "directory") {
						setIsExpanded(!isExpanded);
					} else if (onSelectFile) {
						onSelectFile(node.path);
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
					{Object.values(node.children).map((child) => (
						<TreeNode
							key={child.path}
							node={child}
							onSelectFile={onSelectFile}
							selectedFile={selectedFile}
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
	onSelectFile,
	projectName,
}: FileExplorerProps) {
	const [tree] = useState<TreeNode>({
		name: "root",
		path: "",
		type: "directory",
		children: {
			src: {
				name: "src",
				path: "src",
				type: "directory",
				children: {
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
		},
	});

	return (
		<ScrollArea className="h-full">
			<div className="p-2">
				<TreeNode
					node={tree}
					onSelectFile={onSelectFile}
					selectedFile={selectedFile}
				/>
			</div>
		</ScrollArea>
	);
}
