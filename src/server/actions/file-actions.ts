'use server';

import { getProjectFileTree } from "@/server/services/file-system";
import { revalidatePath } from "next/cache";

/**
 * Server action to refresh the file tree for a project
 */
export async function refreshFileTree(projectName: string) {
    try {
        await getProjectFileTree(projectName);
        // Revalidate the app route to refresh the file tree UI
        revalidatePath('/');
    } catch (error) {
        console.error("Failed to refresh file tree:", error);
        throw new Error("Failed to refresh file tree");
    }
}
