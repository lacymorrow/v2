"use client";

import { Link } from "@/components/primitives/link-with-transition";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { useSearchParams } from "next/navigation";

enum Error {
	Configuration = "Configuration",
}

const errorMap = {
	[Error.Configuration]: (
		<p>
			There was a problem when trying to authenticate. Please contact us if this
			error persists. Unique error code:{" "}
			<code className="rounded-sm bg-slate-100 p-1 text-xs">Configuration</code>
		</p>
	),
};

export default function AuthErrorPage() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error") as Error;

	return (
		<div className="flex w-full flex-col items-center justify-center gap-8">
			<a
				href={routes.home}
				className="block max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-center shadow hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
			>
				<h5 className="mb-2 flex flex-row items-center justify-center gap-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
					Something went wrong
				</h5>
				<div className="font-normal text-gray-700 dark:text-gray-400">
					{errorMap[error] || "Please contact us if this error persists."}
				</div>
			</a>

			<Link href={routes.home} className={buttonVariants({ size: "lg" })}>
				Take me home
			</Link>
		</div>
	);
}
