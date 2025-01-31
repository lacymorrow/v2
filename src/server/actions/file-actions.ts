'use server';

import { getProjectFileTree } from "@/server/services/file-system";
import { revalidatePath } from "next/cache";

/**
 * Notify all connected clients about file tree changes
 */
async function notifyFileTreeChange(projectName: string) {
    const handlers = (global as any).fileTreeEventHandlers;
    if (handlers) {
        Object.values(handlers).forEach((handler: any) => {
            handler(JSON.stringify({ type: 'refresh', projectName }));
        });
    }
}

/**
 * Server action to refresh the file tree for a project
 */
export async function refreshFileTree(projectName: string) {
    try {
        await getProjectFileTree(projectName);
        // Notify clients about the change
        await notifyFileTreeChange(projectName);
        // Revalidate the app route to refresh the file tree UI
        revalidatePath('/');
    } catch (error) {
        console.error("Failed to refresh file tree:", error);
        throw new Error("Failed to refresh file tree");
    }
}
