"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Plus } from "lucide-react";

interface GenerateButtonProps {
	onGenerate: () => Promise<void>;
	isGenerating: boolean;
	disabled?: boolean;
}

export function GenerateButton({
	onGenerate,
	isGenerating,
	disabled = false,
}: GenerateButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					onClick={onGenerate}
					disabled={isGenerating || disabled}
					size="sm"
				>
					{isGenerating ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Generating...
						</>
					) : (
						<>
							<Plus className="mr-2 h-4 w-4" />
							New Project
						</>
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>Generate a new project</TooltipContent>
		</Tooltip>
	);
}
