import { getTemplateFiles } from "./utils/template-service";
import { WebContainerTest } from "./components/web-container-test";

export default async function TestPage() {
	// Get the template files on the server
	const files = await getTemplateFiles();

	return (
		<div className="container mx-auto p-4">
			<h1 className="mb-4 text-2xl font-bold">WebContainer Test (Vite)</h1>
			<WebContainerTest files={files} />
		</div>
	);
}
