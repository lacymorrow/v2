"use client";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";

interface ResizablePanelsProps {
	children: React.ReactNode;
}

export function ResizablePanels({ children }: ResizablePanelsProps) {
	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="h-full rounded-lg border"
		>
			<ResizablePanel defaultSize={20} minSize={15}>
				{children && Array.isArray(children) ? children[0] : null}
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={80}>
				{children && Array.isArray(children) ? children[1] : null}
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
