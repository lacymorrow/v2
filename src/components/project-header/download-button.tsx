"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface DownloadButtonProps {
	projectName: string | null | undefined;
}

export function DownloadButton({ projectName }: DownloadButtonProps) {
	async function handleDownload() {
		if (!projectName) return;

		try {
			const response = await fetch("/api/download", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: projectName }),
			});

			if (!response.ok) throw new Error("Download failed");

			// Create a download link
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${projectName}.zip`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success("Project downloaded successfully");
		} catch (error) {
			console.error("Failed to download project:", error);
			toast.error("Failed to download project");
		}
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					onClick={handleDownload}
					size="sm"
					variant="outline"
					disabled={!projectName}
				>
					<Download className="mr-2 h-4 w-4" />
					Download
				</Button>
			</TooltipTrigger>
			<TooltipContent>Download project files</TooltipContent>
		</Tooltip>
	);
}
