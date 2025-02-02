import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends HTMLAttributes<HTMLOutputElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
	return (
		<output
			className={cn(
				"inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
				className,
			)}
			aria-label="Loading"
			{...props}
		>
			<span className="sr-only">Loading...</span>
		</output>
	);
}
