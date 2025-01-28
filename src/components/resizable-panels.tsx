"use client";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

interface ResizablePanelsProps {
	children: ReactNode[];
	axis?: "x" | "y";
	defaultSizes?: number[];
	className?: string;
}

export function ResizablePanels({
	children,
	axis = "x",
	defaultSizes = Array(children.length).fill(100 / children.length),
	className,
}: ResizablePanelsProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<ResizablePanelGroup
			direction={axis === "x" ? "horizontal" : "vertical"}
			className={cn("h-full", className)}
		>
			{children.map((child, i) => (
				<>
					{i > 0 && (
						<ResizableHandle withHandle>
							{i === 1 && (
								<button
									onClick={() => setIsCollapsed(!isCollapsed)}
									className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-accent p-1.5 hover:bg-accent/80"
								>
									{isCollapsed ? (
										<PanelLeftOpen className="h-4 w-4" />
									) : (
										<PanelLeftClose className="h-4 w-4" />
									)}
								</button>
							)}
						</ResizableHandle>
					)}
					<ResizablePanel
						key={i}
						defaultSize={defaultSizes[i]}
						minSize={i === 0 ? 5 : 20}
						maxSize={i === 0 ? 30 : 95}
						collapsible={i === 0}
						collapsedSize={5}
						onCollapse={() => i === 0 && setIsCollapsed(true)}
						onExpand={() => i === 0 && setIsCollapsed(false)}
						className={cn(
							"h-full [&>div]:h-full [&>div]:rounded-none",
							i === 0 && isCollapsed && "min-w-[50px] max-w-[50px]",
						)}
					>
						{child}
					</ResizablePanel>
				</>
			))}
		</ResizablePanelGroup>
	);
}
