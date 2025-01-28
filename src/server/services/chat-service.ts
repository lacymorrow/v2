import OpenAI from "openai";
import { env } from "@/env";

// Initialize clients
const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

const deepseek = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: env.DEEPSEEK_API_KEY,
});

export type Provider = "openai" | "deepseek";
export type Model = "gpt-4" | "gpt-3.5-turbo";

interface ChatOptions {
    provider?: Provider;
    model?: Model;
    temperature?: number;
    systemPrompt?: string;
}

const defaultOptions: ChatOptions = {
    provider: "openai",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    systemPrompt: "You are a helpful AI assistant that helps users build React applications.",
};

export async function* streamChat(
    messages: { role: "user" | "assistant" | "system"; content: string }[],
    options: ChatOptions = {}
) {
    const { provider, model, temperature, systemPrompt } = { ...defaultOptions, ...options };
    const client = provider === "deepseek" ? deepseek : openai;

    // Add system prompt if not present
    if (!messages.find(m => m.role === "system")) {
        messages.unshift({ role: "system", content: systemPrompt! });
    }

    try {
        const stream = await client.chat.completions.create({
            model,
            messages,
            temperature,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    } catch (error) {
        console.error("Chat error:", error);
        yield "\nError: Failed to generate response. Please try again.";
    }
}
