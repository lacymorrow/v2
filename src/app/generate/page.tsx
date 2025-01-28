"use client";

import { generateRandomName } from "@/lib/utils";
import { useState } from "react";

export default function GeneratePage() {
	const [projectUrl, setProjectUrl] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleGenerate() {
		setIsGenerating(true);
		setError(null);
		try {
			const response = await fetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: "Basic React app",
					name: generateRandomName(),
				}),
			});

			const data = await response.json();
			if (data.error) {
				throw new Error(data.error);
			}
			if (data.publicUrl) {
				setProjectUrl(data.publicUrl);
			}
		} catch (error) {
			console.error("Failed to generate project:", error);
			setError(
				error instanceof Error ? error.message : "Failed to generate project",
			);
		} finally {
			setIsGenerating(false);
		}
	}

	return (
		<div className="container mx-auto p-4">
			<button
				onClick={handleGenerate}
				disabled={isGenerating}
				className="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
			>
				{isGenerating ? "Generating..." : "Generate New Project"}
			</button>

			{error && (
				<div className="mt-4 rounded bg-red-100 p-4 text-red-700">{error}</div>
			)}

			{projectUrl && (
				<div className="mt-8">
					<h2 className="mb-4 text-xl font-bold">Generated Project:</h2>
					<div className="mb-4">
						<a
							href={projectUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 hover:underline"
						>
							Open in new tab
						</a>
					</div>
					<iframe
						src={projectUrl}
						className="h-[600px] w-full rounded border-2 border-gray-200"
						title="Generated Project Preview"
						sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
						seamless
						loading="lazy"
					/>
				</div>
			)}
		</div>
	);
}
