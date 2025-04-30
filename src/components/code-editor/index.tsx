"use client";

import { CodeWindow } from "@/components/ui/code-window";
import { CodeEditorPlaceholder } from "./code-editor-placeholder";
import { detectLanguage } from "./language-detector";

export interface CodeEditorProps {
	path: string | null;
	content?: string;
}

export function CodeEditor({ path, content = "" }: CodeEditorProps) {
	if (!path) {
		return <CodeEditorPlaceholder />;
	}

	const language = detectLanguage(path);

	return (
		<div className="h-full">
			<CodeWindow
				title={path}
				code={content}
				language={language}
				showLineNumbers
				theme="dark"
				maxHeight="none"
				variant="minimal"
				showCopy
				className="h-full"
			/>
		</div>
	);
}
