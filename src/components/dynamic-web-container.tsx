"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

const WebContainerPreview = dynamic(
	() =>
		import("@/components/web-container-preview").then(
			(mod) => mod.WebContainerPreview,
		),
	{
		loading: () => (
			<div className="flex h-full items-center justify-center">
				<Spinner className="h-8 w-8" />
			</div>
		),
		ssr: false,
	},
);

export { WebContainerPreview };
