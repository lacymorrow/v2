"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, SendHorizontal } from "lucide-react";
import {
	useEffect,
	useRef,
	useState,
	useCallback,
	type FormEvent,
} from "react";
import type { Model } from "@/server/services/chat-service";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { env } from "@/env";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
	role: "user" | "assistant";
	content: string;
	id: string;
}

interface ChatProps {
	onGenerate: (prompt: string) => Promise<void>;
	isGenerating: boolean;
	generationStatus?: { step: string; progress: number } | null;
	projectName?: string | null;
}

function ChatMessage({ role, content }: Message) {
	// Format the content by removing "data: " prefix and extra newlines
	const formattedContent = content
		.split("\n")
		.map((line) => line.replace(/^data:\s*/, "").trim())
		.filter((line) => line)
		.join("\n");

	return (
		<div
			className={cn(
				"flex flex-col gap-2 rounded-lg p-4",
				role === "assistant"
					? "bg-muted/50"
					: "bg-primary text-primary-foreground",
			)}
		>
			<div className="flex items-center gap-2 text-xs">
				<span className="font-medium">
					{role === "assistant" ? "AI Assistant" : "You"}
				</span>
			</div>
			<div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm dark:prose-invert">
				{formattedContent}
			</div>
		</div>
	);
}

export function Chat({
	onGenerate,
	isGenerating,
	generationStatus,
	projectName,
}: ChatProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [model, setModel] = useState<Model>("gpt-3.5-turbo");
	const scrollRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

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
					projectName,
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

			let buffer = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const lines = text.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const content = line.slice(5).trim();
						if (content) {
							buffer = `${buffer}${content}\n`;
							const processedText = await handleFileOperation(buffer);
							assistantMessage = processedText;
							setMessages((prev) => [
								...prev.slice(0, -1),
								{
									role: "assistant",
									content: assistantMessage,
									id: assistantMessageId,
								},
							]);
						}
					}
				}
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
					<div ref={messagesEndRef} />
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
