"use client";

import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { ExpandIcon, MinimizeIcon, Copy } from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
	oneDark,
	oneLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Button } from "./button";
import { CodeWindow as BaseCodeWindow } from "@/components/ui/code-window";

const codeWindowVariants = cva(
	"overflow-hidden rounded-lg border transition-all duration-200",
	{
		variants: {
			variant: {
				default: "bg-neutral-900",
				minimal: "bg-muted/50",
				ghost: "border-none bg-transparent",
				single:
					"relative inline-flex items-center border-none bg-muted/30 rounded-md hover:bg-muted/50",
			},
			size: {
				default: "w-full",
				sm: "max-w-sm",
				lg: "max-w-screen-lg",
				inline: "w-auto",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
		compoundVariants: [
			{
				variant: "single",
				size: "default",
				class: "size: inline",
			},
		],
	},
);

const titleBarVariants = cva("flex items-center justify-between px-4 py-2", {
	variants: {
		variant: {
			default: "border-b bg-neutral-800",
			minimal: "border-b bg-muted",
			ghost: "bg-transparent",
			single: "hidden",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const codeContentVariants = cva("overflow-auto", {
	variants: {
		variant: {
			default: "p-4",
			minimal: "p-4 bg-transparent",
			ghost: "px-0",
			single:
				"flex items-center justify-between border-none bg-muted/30 rounded-md hover:bg-muted/50 py-1 px-2",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

interface CodeWindowProps {
	title?: string;
	code: string;
	language?: string;
	showLineNumbers?: boolean;
}

export function CodeWindow({
	title,
	code,
	language = "typescript",
	showLineNumbers = true,
}: CodeWindowProps) {
	return (
		<BaseCodeWindow
			title={title}
			code={code}
			language={language}
			showLineNumbers={showLineNumbers}
			theme="dark"
			maxHeight="none"
			variant="minimal"
			showCopy
			className="my-4"
		/>
	);
}
