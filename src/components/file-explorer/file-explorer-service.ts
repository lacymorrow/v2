/**
 * Service functions for the file explorer component
 */

import type { TreeNode } from "@/server/services/file-system";

/**
 * Loads the file tree for a project
 */
export async function loadFileTree(projectName: string): Promise<TreeNode> {
    const response = await fetch(
        `/api/files/tree?project=${encodeURIComponent(projectName)}`,
        {
            cache: "no-store",
            headers: {
                Accept: "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to load file tree");
    }

    const data = await response.json();
    return data.tree;
}

/**
 * Loads the content of a file
 */
export async function loadFileContent(
    filePath: string,
    projectName: string
): Promise<string> {
    const response = await fetch(
        `/api/files?path=${encodeURIComponent(filePath)}&project=${encodeURIComponent(projectName)}`
    );

    if (!response.ok) {
        throw new Error("Failed to load file content");
    }

    const data = await response.json();
    return data.content;
}

/**
 * Sets up an event source for file tree changes
 */
export function setupFileTreeEvents(
    projectName: string,
    onConnected: () => void,
    onDisconnected: () => void,
    onRefresh: () => Promise<void>
): () => void {
    let retryCount = 0;
    const maxRetries = 3;
    let eventSource: EventSource | null = null;

    function setupEventSource() {
        if (eventSource) {
            eventSource.close();
        }

        eventSource = new EventSource(
            `/api/files/events?project=${encodeURIComponent(projectName)}`
        );

        eventSource.addEventListener("open", () => {
            retryCount = 0;
            onConnected();
        });

        eventSource.addEventListener("error", () => {
            onDisconnected();

            if (retryCount < maxRetries) {
                retryCount++;
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, retryCount - 1) * 1000;
                setTimeout(setupEventSource, delay);
            }
        });

        eventSource.addEventListener("message", async (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case "connected":
                        onConnected();
                        break;
                    case "refresh":
                        if (data.projectName === projectName) {
                            await onRefresh();
                        }
                        break;
                    case "heartbeat":
                        // Heartbeat received, connection is alive
                        onConnected();
                        break;
                }
            } catch (error) {
                console.error("Error processing SSE message:", error);
            }
        });
    }

    setupEventSource();

    // Return cleanup function
    return () => {
        if (eventSource) {
            eventSource.close();
        }
    };
}
