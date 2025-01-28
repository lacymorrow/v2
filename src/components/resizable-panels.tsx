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
	children: ReactNode;
}

const COLLAPSE_THRESHOLD = 8;
const DEFAULT_SIZE = 20;

export function ResizablePanels({ children }: ResizablePanelsProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);

	function handleResize(size: number) {
		if (size < COLLAPSE_THRESHOLD) {
			setIsCollapsed(true);
		} else if (isCollapsed) {
			setIsCollapsed(false);
		}
	}

	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="h-full rounded-lg border"
		>
			<ResizablePanel
				defaultSize={isCollapsed ? 0 : DEFAULT_SIZE}
				collapsible
				collapsedSize={0}
				minSize={0}
				maxSize={30}
				onResize={handleResize}
				className={cn(
					"transition-all duration-300",
					isCollapsed && "w-0 min-w-[0!important]",
				)}
			>
				{children && Array.isArray(children) ? children[0] : null}
			</ResizablePanel>
			<ResizableHandle withHandle>
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
			</ResizableHandle>
			<ResizablePanel defaultSize={isCollapsed ? 100 : 80}>
				{children && Array.isArray(children) ? children[1] : null}
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
