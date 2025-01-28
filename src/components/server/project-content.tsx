import { projectQueue } from "@/server/services/project-queue";
import { readFileContent } from "@/server/services/file-service";

interface ProjectContentProps {
	projectName: string | null;
	filePath: string | null;
}

export async function ProjectContent({
	projectName,
	filePath,
}: ProjectContentProps) {
	if (!projectName || !filePath) {
		return null;
	}

	const content = await readFileContent(projectName, filePath);
	return content;
}
