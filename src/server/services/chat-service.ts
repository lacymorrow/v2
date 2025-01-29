import OpenAI from "openai";
import { env } from "@/env";
import fs from "fs/promises";
import path from "path";
import { editFile } from "./file-service";

// Initialize clients
const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
});

const deepseek = new OpenAI({
	baseURL: "https://api.deepseek.com",
	apiKey: env.DEEPSEEK_API_KEY,
});

export type Provider = "openai" | "deepseek";
export type Model = "gpt-4" | "gpt-3.5-turbo" | "deepseek-chat";

interface ChatOptions {
	provider?: Provider;
	model?: Model;
	temperature?: number;
	systemPrompt?: string;
}

// Read the v2 prompt from the file system
async function getV2Prompt(): Promise<string> {
	try {
		const promptPath = path.join(process.cwd(), "prompt.txt");
		return await fs.readFile(promptPath, "utf-8");
	} catch (error) {
		console.error("Failed to read v2 prompt:", error);
		return defaultSystemPrompt;
	}
}

const defaultSystemPrompt = `You are v2, an AI assistant created by Vercel to be helpful, harmless, and honest.

<v2_info>
v2 is an advanced AI coding assistant created by Vercel.
v2 is designed to emulate the world's most proficient developers.
v2 is always up-to-date with the latest technologies and best practices.
v2 responds using the MDX format and has access to specialized MDX types and components.
v2 aims to deliver clear, efficient, concise, and innovative coding solutions while maintaining a friendly and approachable demeanor.

v2's knowledge spans various programming languages, frameworks, and best practices, with a particular emphasis on:
- React and Next.js App Router
- Modern web development
- TypeScript and JavaScript
- Node.js and server-side development
- UI/UX design principles
- Performance optimization
- Security best practices
</v2_info>

<v2_capabilities>
You can read and edit files in the project using these commands:
- To read a file: !read <filepath>
- To edit a file: !edit <filepath> <content>

When editing files:
1. Always maintain the existing code structure and comments
2. Follow the project's coding conventions
3. Ensure type safety and proper error handling
4. Add helpful comments to explain complex logic
</v2_capabilities>

<v2_personality>
1. Be friendly and approachable while maintaining professionalism
2. Provide clear, concise explanations
3. Offer best practices and optimization suggestions
4. Help users understand the "why" behind technical decisions
5. Be proactive in identifying potential issues
</v2_personality>

<v2_response_format>
1. Use <Thinking /> to evaluate complex problems
2. Format code examples in appropriate MDX code blocks
3. Use clear headings and bullet points for explanations
4. Include relevant documentation links when helpful
5. Provide step-by-step guidance for complex tasks
</v2_response_format>`;

const defaultOptions: ChatOptions = {
	provider: "openai",
	model: "gpt-3.5-turbo",
	temperature: 0.7,
};

// Function to extract code blocks and their metadata from MDX content
function extractCodeBlocks(content: string): Array<{
	type: string;
	project: string;
	file: string;
	code: string;
}> {
	// Updated regex to better handle code blocks with metadata
	const codeBlockRegex = /```([\w]+)\s+project=["']([^"']+)["']\s+file=["']([^"']+)["'](?:\s+type=["'][^"']+["'])?\s*\n([\s\S]*?)```/g;
	const blocks: Array<{
		type: string;
		project: string;
		file: string;
		code: string;
	}> = [];

	console.log("Attempting to extract code blocks from content:", `${content.substring(0, 200)}...`);

	let match: RegExpExecArray | null = codeBlockRegex.exec(content);
	while (match !== null) {
		console.log("Found code block match:", {
			type: match[1],
			project: match[2],
			file: match[3],
			codePreview: `${match[4]?.substring(0, 50)}...`
		});

		if (match[1] && match[2] && match[3] && match[4]) {
			const block = {
				type: match[1],
				project: match[2],
				file: match[3],
				code: match[4].trim()
			};
			blocks.push(block);
			console.log("Added code block:", {
				type: block.type,
				project: block.project,
				file: block.file,
				codeLength: block.code.length
			});
		}
		match = codeBlockRegex.exec(content);
	}

	console.log(`Extracted ${blocks.length} code blocks`);
	return blocks;
}

// Function to handle code blocks
async function handleCodeBlocks(blocks: Array<{
	type: string;
	project: string;
	file: string;
	code: string;
}>): Promise<string> {
	let result = "";

	for (const block of blocks) {
		console.log("Processing code block:", {
			type: block.type,
			project: block.project,
			file: block.file,
			codeLength: block.code.length
		});

		try {
			// Add "use client" directive for React components if needed
			const needsClientDirective = block.type.includes("x") && !block.code.includes('"use client"');
			const codeWithDirective = needsClientDirective
				? `"use client";\n\n${block.code}`
				: block.code;

			// Determine the correct file path based on the file type
			let filePath = block.file;
			if (!filePath.startsWith("src/")) {
				filePath = `src/components/${block.file}`;
			}

			console.log("Creating/updating file:", filePath);
			await editFile(filePath, codeWithDirective);
			result += `✅ Created/updated file: ${filePath}\n`;
		} catch (error) {
			console.error("Error handling code block:", error);
			result += `❌ Error creating/updating file: ${error instanceof Error ? error.message : "Unknown error"}\n`;
		}
	}

	return result;
}

let accumulatedContent = "";

export async function* streamChat(
	messages: { role: "user" | "assistant" | "system"; content: string }[],
	options: ChatOptions = {}
) {
	const { provider = defaultOptions.provider, model = defaultOptions.model, temperature = defaultOptions.temperature } = options;
	const client = provider === "deepseek" ? deepseek : openai;

	// Add system prompt if not present
	if (!messages.find(m => m.role === "system")) {
		const systemPrompt = await getV2Prompt();
		messages.unshift({ role: "system", content: systemPrompt });
	}

	try {
		const stream = await client.chat.completions.create({
			model: model as string,
			messages,
			temperature,
			stream: true,
		});

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content;
			if (content) {
				// Accumulate content to handle MDX blocks
				accumulatedContent += content;
				console.log("Accumulated content length:", accumulatedContent.length);

				// Check for complete code blocks
				const blockCount = (accumulatedContent.match(/```/g) || []).length;
				console.log("Block count:", blockCount);

				if (blockCount > 0 && blockCount % 2 === 0) {
					console.log("Found complete code block(s)");
					console.log("Accumulated content:", accumulatedContent);

					const blocks = extractCodeBlocks(accumulatedContent);
					console.log("Extracted blocks:", blocks);

					if (blocks.length > 0) {
						const result = await handleCodeBlocks(blocks);
						yield result;
						// Clear the accumulated content after processing
						accumulatedContent = "";
					}
				}

				// Check for file operation commands
				if (content.startsWith("!read ")) {
					const path = content.slice(6).trim();
					yield `Reading file ${path}...\n`;
					continue;
				}
				if (content.startsWith("!edit ")) {
					const [, path, ...contentParts] = content.slice(6).split(" ");
					yield `Editing file ${path}...\n`;
					continue;
				}

				// Yield the content
				yield content;
			}
		}

		// Process any remaining content
		if (accumulatedContent) {
			console.log("Processing remaining content:", accumulatedContent);
			const blocks = extractCodeBlocks(accumulatedContent);
			console.log("Remaining blocks:", blocks);
			if (blocks.length > 0) {
				const result = await handleCodeBlocks(blocks);
				yield result;
			}
			accumulatedContent = "";
		}
	} catch (error) {
		console.error("Chat error:", error);
		yield "\nError: Failed to generate response. Please try again.";
	}
}
