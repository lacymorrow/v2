"use client";

import { CodeWindow } from "@/components/ui/code-window";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CodeEditorProps {
	path: string | null;
	content?: string;
	onChange?: (value: string) => void;
}

export function CodeEditor({ path, content = "", onChange }: CodeEditorProps) {
	if (!path) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				Select a file to view its contents
			</div>
		);
	}

	// Get file extension for language detection
	const extension = path.split(".").pop() || "";
	const language =
		{
			ts: "typescript",
			tsx: "typescript",
			js: "javascript",
			jsx: "javascript",
			css: "css",
			json: "json",
			html: "html",
			md: "markdown",
			mdx: "markdown",
		}[extension] || "plaintext";

	return (
		<ScrollArea className="h-full">
			<div className="p-4">
				<CodeWindow
					title={path}
					code={content}
					language={language}
					showLineNumbers
					theme="dark"
					maxHeight="none"
					variant="minimal"
				/>
			</div>
		</ScrollArea>
	);
}
