import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PreviewLoading() {
	return (
		<div className="container mx-auto py-8">
			<Card>
				<CardHeader>
					<Skeleton className="h-8 w-[200px]" />
					<Skeleton className="mt-2 h-4 w-[300px]" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[600px] w-full" />
				</CardContent>
			</Card>
		</div>
	);
}
