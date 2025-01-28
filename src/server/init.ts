import { projectQueue } from "./services/project-queue";

export async function initializeServer() {
    // Initialize project queue
    await projectQueue.initialize().catch((error) => {
        console.error("Failed to initialize project queue:", error);
    });
}
