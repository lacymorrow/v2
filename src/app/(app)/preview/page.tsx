import { WebContainerPreview } from "@/components/web-container/web-container-preview";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function PreviewPage() {
	return (
		<div className="container mx-auto py-8">
			<Card>
				<CardHeader>
					<CardTitle>Project Preview</CardTitle>
					<CardDescription>
						This preview runs your project in a WebContainer environment,
						allowing you to see your changes in real-time without leaving the
						browser.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<WebContainerPreview projectName="my-app" />
				</CardContent>
			</Card>
		</div>
	);
}
