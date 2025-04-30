"use client";

import { Input } from "@/components/ui/input";
import { ChangeEvent } from "react";

interface PromptInputProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

export function PromptInput({
	value,
	onChange,
	disabled = false,
	placeholder = "Describe your app...",
	className = "max-w-xl",
}: PromptInputProps) {
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value);
	};

	return (
		<Input
			placeholder={placeholder}
			value={value}
			onChange={handleChange}
			disabled={disabled}
			className={className}
		/>
	);
}
