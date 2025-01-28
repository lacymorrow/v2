import { generateRandomName } from "@/lib/utils";
import { generateApp } from "./app-generator";

interface QueuedProject {
    name: string;
    publicUrl: string;
}

class ProjectQueue {
    private queue: QueuedProject[] = [];
    private isGenerating = false;
    private maxQueueSize = 2;

    async initialize() {
        // Generate initial projects
        await this.ensureQueueFilled();
    }

    private async generateProject(): Promise<QueuedProject> {
        this.isGenerating = true;
        try {
            const name = generateRandomName();
            const app = await generateApp({
                prompt: "Basic React app",
                name,
                template: "react",
            });
            return {
                name,
                publicUrl: app.publicUrl,
            };
        } finally {
            this.isGenerating = false;
        }
    }

    private async ensureQueueFilled() {
        if (this.isGenerating) return;

        while (this.queue.length < this.maxQueueSize) {
            const project = await this.generateProject();
            this.queue.push(project);
        }
    }

    async getNextProject(): Promise<QueuedProject> {
        if (this.queue.length === 0) {
            // Generate one immediately if queue is empty
            return await this.generateProject();
        }

        // Get next project from queue
        const project = this.queue.shift()!;

        // Start generating next project in background
        this.ensureQueueFilled().catch(console.error);

        return project;
    }
}

// Singleton instance
export const projectQueue = new ProjectQueue();
