import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
	return (
		<div
			className={cn(
				"inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
				className,
			)}
			aria-live="polite"
			{...props}
		>
			<span className="sr-only">Loading...</span>
		</div>
	);
}
