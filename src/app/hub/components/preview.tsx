"use client";

interface PreviewProps {
	url: string | null;
}

export function Preview({ url }: PreviewProps) {
	if (!url) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				Generate a project to see the preview
			</div>
		);
	}

	return (
		<iframe
			src={url}
			className="h-full w-full"
			title="Project Preview"
			sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
		/>
	);
}
