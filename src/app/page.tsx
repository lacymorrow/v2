import { FileExplorer } from "@/components/file-explorer";
import { Preview } from "@/components/preview";
import { ProjectHeader } from "@/components/project-header";
import { ResizablePanels } from "@/components/resizable-panels";
import { ProjectContent } from "@/components/server/project-content";
import { Card } from "@/components/ui/card";
import { generateProject } from "@/server/actions/project-actions";
import { Suspense } from "react";

export default async function HomePage() {
	return (
		<div className="flex h-screen flex-col">
			<ProjectHeader generateProject={generateProject} />
			<div className="flex-1 p-4">
				<Card className="h-full">
					<ResizablePanels>
						<FileExplorer />
						<ResizablePanels>
							<Suspense fallback={<div>Loading file content...</div>}>
								<ProjectContent projectName={null} filePath={null} />
							</Suspense>
							<Preview />
						</ResizablePanels>
					</ResizablePanels>
				</Card>
			</div>
		</div>
	);
}
