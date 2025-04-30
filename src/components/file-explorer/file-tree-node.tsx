"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "@/hooks/use-project-store";
import type { TreeNode } from "@/server/services/file-system";
import { loadFileContent } from "./file-explorer-service";

interface FileTreeNodeProps {
	node: TreeNode;
	selectedFile?: string | null;
	projectName?: string | null;
	level?: number;
}

export function FileTreeNode({
	node,
	selectedFile,
	projectName,
	level = 0,
}: FileTreeNodeProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const hasChildren = Object.keys(node.children).length > 0;
	const { setFile } = useProjectStore();

	const handleNodeClick = async () => {
		if (node.type === "directory") {
			setIsExpanded(!isExpanded);
		} else if (projectName) {
			try {
				const content = await loadFileContent(node.path, projectName);
				setFile(node.path, content);
			} catch (error) {
				console.error("Failed to load file:", error);
				setFile(node.path, "// Failed to load file contents");
			}
		}
	};

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
				onClick={handleNodeClick}
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
							<FileTreeNode
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
