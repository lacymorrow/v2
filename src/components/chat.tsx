"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CodeWindow } from "@/components/ui/code-window";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Model } from "@/server/services/chat-service";
import { type FormEvent } from "react";

interface Message {
	role: "user" | "assistant";
	content: string;
	id: string;
}

function ChatMessage({ role, content, id }: Message) {
	return (
		<div
			key={id}
			className={cn(
				"flex flex-col gap-2 rounded-lg p-4",
				role === "assistant" ? "bg-muted" : "bg-primary/5",
			)}
		>
			<div className="flex items-center gap-2">
				<div
					className={cn(
						"text-xs font-medium",
						role === "assistant" ? "text-primary" : "text-muted-foreground",
					)}
				>
					{role === "assistant" ? "AI Assistant" : "You"}
				</div>
			</div>
			<div className="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
				{content}
			</div>
		</div>
	);
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

	// Scroll to bottom when messages change
	useEffect(() => {
		const scrollElement = scrollRef.current;
		if (scrollElement) {
			scrollElement.scrollTop = scrollElement.scrollHeight;
		}
	}, [messages]);

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
				assistantMessage += text;

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
		<div className="flex h-full flex-col overflow-hidden">
			<ScrollArea className="flex-1" ref={scrollRef}>
				<div className="flex flex-col gap-4 p-4">
					{messages.map((message) => (
						<ChatMessage key={message.id} {...message} />
					))}
					{isGenerating && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span className="text-sm text-muted-foreground">
									{generationStatus?.step || "Generating..."}
								</span>
							</div>
							{generationStatus?.progress && (
								<Progress value={generationStatus.progress} />
							)}
						</div>
					)}
				</div>
			</ScrollArea>

			<div className="border-t p-4">
				<form onSubmit={handleSubmit} className="flex gap-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Ask me anything..."
						disabled={isGenerating}
					/>
					<Button type="submit" disabled={isGenerating || !input.trim()}>
						Send
					</Button>
				</form>
			</div>
		</div>
	);
}
