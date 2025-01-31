import OpenAI from "openai";
import { env } from "@/env";
import fs from "fs/promises";
import path from "path";
import { writeProjectFile } from "./file-system";
import { refreshFileTree } from "@/server/actions/file-actions";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";

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

interface BaseCodeBlock {
	type?: string;
	project?: string;
	file?: string;
	code?: string;
}

interface ValidCodeBlock {
	type: string;
	project: string;
	file: string;
	code: string;
}

const APP_STORAGE_PATH = path.join(process.cwd(), 'generated-apps');

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

function validateCodeBlock(block: BaseCodeBlock): ValidCodeBlock | null {
	if (!block.file || !block.type || !block.code) {
		return null;
	}
	return {
		type: block.type,
		project: block.project || '',
		file: block.file,
		code: block.code
	};
}

function extractCodeBlocks(content: string): BaseCodeBlock[] {
	const codeBlockRegex = /```([\w]+)\s+project=["']([^"']+)["']\s+file=["']([^"']+)["'](?:\s+type=["'][^"']+["'])?\s*\n([\s\S]*?)```/g;
	const blocks: BaseCodeBlock[] = [];

	console.log("Attempting to extract code blocks from content:", `${content.substring(0, 200)}...`);

	let match: RegExpExecArray | null = codeBlockRegex.exec(content);
	while (match !== null) {
		const [, type, project, file, code] = match;
		blocks.push({ type, project, file, code });
		match = codeBlockRegex.exec(content);
	}

	console.log(`Extracted ${blocks.length} code blocks`);
	return blocks;
}

async function handleCodeBlocks(blocks: BaseCodeBlock[]): Promise<string> {
	let result = "";

	// Get the most recent project
	const projects = await fs.readdir(APP_STORAGE_PATH)
		.then(files => files.filter(file => !file.startsWith('.')))
		.catch(() => []);

	if (!projects.length) {
		return "❌ No project exists yet. Please click 'New Project' to generate a project first, then I can add components to it.\n";
	}

	const mostRecentProject = projects[projects.length - 1];

	for (const block of blocks) {
		const validBlock = validateCodeBlock(block);
		if (!validBlock) {
			result += "❌ Error: Invalid code block - missing required fields\n";
			continue;
		}

		console.log("Processing code block:", {
			type: validBlock.type,
			file: validBlock.file,
			codeLength: validBlock.code.length,
			targetProject: mostRecentProject
		});

		try {
			// Add "use client" directive for React components if needed
			const needsClientDirective = validBlock.type.includes("x") && !validBlock.code.includes('"use client"');
			const codeWithDirective = needsClientDirective
				? `"use client";\n\n${validBlock.code}`
				: validBlock.code;

			// Determine the correct file path based on the file type
			const filePath = validBlock.file.startsWith("src/")
				? validBlock.file
				: `src/components/${validBlock.file}`;

			// Write to the most recent project, ignoring the project specified in the block
			await writeProjectFile(mostRecentProject, filePath, codeWithDirective);
			result += `✅ Created/updated file: ${filePath} in project ${mostRecentProject}\n`;

			// Refresh the file tree
			await refreshFileTree(mostRecentProject);
		} catch (error) {
			console.error("Error handling code block:", error);
			if (error instanceof Error) {
				result += `❌ Error: ${error.message}\n`;
			} else {
				result += "❌ Error creating/updating file: Unknown error\n";
			}
		}
	}

	return result;
}

let accumulatedContent = "";
let currentLine = "";

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
			const content = (chunk as ChatCompletionChunk).choices[0]?.delta?.content;
			if (typeof content !== 'string') continue;

			// Accumulate content for the current line
			currentLine += content;

			// If we have a newline, yield the current line and reset
			if (content.includes('\n')) {
				const lines = currentLine.split('\n');
				// Handle all complete lines
				for (let i = 0; i < lines.length - 1; i++) {
					const line = lines[i]?.trim() ?? '';
					if (line) {
						yield `${line}\n`;
					}
				}
				// Keep the last incomplete line
				currentLine = lines[lines.length - 1] ?? '';
			}

			// Accumulate content for code block detection
			accumulatedContent += content;

			// Check for complete code blocks
			const blockCount = (accumulatedContent.match(/```/g) || []).length;

			if (blockCount > 0 && blockCount % 2 === 0) {
				const blocks = extractCodeBlocks(accumulatedContent);
				if (blocks.length > 0) {
					const result = await handleCodeBlocks(blocks);
					yield result;
					accumulatedContent = "";
					currentLine = "";
				}
			}

			// Check for file operation commands
			if (content.startsWith("!read ")) {
				const path = content.slice(6).trim();
				yield `Reading file ${path}...\n`;
			} else if (content.startsWith("!edit ")) {
				const [, path, ...contentParts] = content.slice(6).split(" ");
				yield `Editing file ${path}...\n`;
			}
		}

		// Handle any remaining content
		if (currentLine.trim()) {
			yield `${currentLine.trim()}\n`;
		}

		if (accumulatedContent) {
			const blocks = extractCodeBlocks(accumulatedContent);
			if (blocks.length > 0) {
				const result = await handleCodeBlocks(blocks);
				yield result;
			}
			accumulatedContent = "";
			currentLine = "";
		}
	} catch (error) {
		console.error("Chat error:", error);
		yield "\nError: Failed to generate response. Please try again.";
	}
}

