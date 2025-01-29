"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Model } from "@/server/services/chat-service";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { env } from "@/env";

interface Message {
	role: "user" | "assistant";
	content: string;
	id: string;
}

interface ChatProps {
	onGenerate: (prompt: string) => Promise<void>;
	isGenerating: boolean;
	generationStatus?: { step: string; progress: number } | null;
}

export function Chat({
	onGenerate,
	isGenerating,
	generationStatus,
}: ChatProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [model, setModel] = useState<Model>("gpt-3.5-turbo");
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const scrollElement = scrollRef.current;
		if (scrollElement) {
			scrollElement.scrollTop = scrollElement.scrollHeight;
		}
	}, [messages.length, generationStatus]);

	async function handleFileOperation(content: string) {
		if (content.startsWith("!read ")) {
			const path = content.slice(6).trim();
			try {
				const response = await fetch("/api/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						fileOperation: {
							type: "read",
							path,
						},
					}),
				});

				if (!response.ok) throw new Error("Failed to read file");
				const { content: fileContent } = await response.json();
				return `Content of ${path}:\n\`\`\`\n${fileContent}\n\`\`\``;
			} catch (error) {
				return `Error reading file: ${error instanceof Error ? error.message : "Unknown error"}`;
			}
		}

		if (content.startsWith("!edit ")) {
			const [, path, ...contentParts] = content.slice(6).split(" ");
			const fileContent = contentParts.join(" ");
			try {
				const response = await fetch("/api/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						fileOperation: {
							type: "edit",
							path,
							content: fileContent,
						},
					}),
				});

				if (!response.ok) throw new Error("Failed to edit file");
				return `Successfully edited ${path}`;
			} catch (error) {
				return `Error editing file: ${error instanceof Error ? error.message : "Unknown error"}`;
			}
		}

		return content;
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (!input.trim() || isGenerating) return;

		const userMessage = input.trim();
		const messageId = crypto.randomUUID();
		setInput("");
		setMessages((prev) => [
			...prev,
			{ role: "user", content: userMessage, id: messageId },
		]);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [...messages, { role: "user", content: userMessage }],
					model,
				}),
			});

			if (!response.ok) throw new Error("Failed to send message");

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response stream");

			let assistantMessage = "";
			const assistantMessageId = crypto.randomUUID();
			setMessages((prev) => [
				...prev,
				{ role: "assistant", content: "", id: assistantMessageId },
			]);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const processedText = await handleFileOperation(text);
				assistantMessage += processedText;

				setMessages((prev) => [
					...prev.slice(0, -1),
					{
						role: "assistant",
						content: assistantMessage,
						id: assistantMessageId,
					},
				]);
			}
		} catch (error) {
			console.error("Chat error:", error);
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: "Error: Failed to generate response.",
					id: crypto.randomUUID(),
				},
			]);
		}
	}

	return (
		<div className="flex h-full flex-col border-l">
			<div className="border-b p-4">
				<Select
					value={model}
					onValueChange={(value) => setModel(value as Model)}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select model" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
						<SelectItem value="gpt-4">GPT-4</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="flex-1 overflow-hidden">
				<ScrollArea className="h-full" ref={scrollRef}>
					<div className="flex flex-col gap-4 p-4">
						{messages.map((message) => (
							<div
								key={message.id}
								className={`flex ${
									message.role === "user" ? "justify-end" : "justify-start"
								}`}
							>
								<div
									className={`rounded-lg px-4 py-2 ${
										message.role === "user"
											? "bg-primary text-primary-foreground"
											: "bg-muted"
									}`}
								>
									{message.content}
								</div>
							</div>
						))}
						{generationStatus && (
							<div className="flex justify-start">
								<div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>
										{generationStatus.step} ({generationStatus.progress}%)
									</span>
								</div>
							</div>
						)}
					</div>
				</ScrollArea>
			</div>
			<form onSubmit={handleSubmit} className="border-t p-4">
				<div className="flex gap-2">
					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Describe your app..."
						disabled={isGenerating}
						className="min-h-[2.5rem] resize-none"
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSubmit(e);
							}
						}}
					/>
					<Button
						type="submit"
						disabled={isGenerating || !input.trim()}
						size="icon"
					>
						{isGenerating ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<SendHorizontal className="h-4 w-4" />
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
