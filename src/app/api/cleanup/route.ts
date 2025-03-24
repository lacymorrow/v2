import { deleteGeneratedApp, listGeneratedApps } from "@/server/models/generated-app";
import { APP_STORAGE_PATH, STATIC_BUILDS_PATH } from "@/server/services/app-generator";
import { BlobStorage } from "@/server/services/storage/blob-storage";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * API route to clean up old generated apps
 * Deletes app files from:
 * 1. Blob storage (if in production)
 * 2. Local filesystem
 * 3. Database
 */
export async function POST() {
    try {
        // Clean up apps older than 7 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        // Get all apps
        const apps = await listGeneratedApps(1000, 0);

        // Filter for old apps
        const oldApps = apps.filter(app => app.createdAt < cutoffDate);

        if (oldApps.length === 0) {
            return NextResponse.json({ success: true, message: "No old apps to clean up" });
        }

        // Initialize blob storage for production environments
        const isProd = process.env.NODE_ENV === 'production';
        const blobStorage = isProd ? new BlobStorage() : null;

        // Track successes and failures
        const results = {
            total: oldApps.length,
            deleted: 0,
            failed: 0,
            errors: [] as string[],
        };

        // Process each app
        for (const app of oldApps) {
            try {
                // Extract app name from public URL
                const urlParts = app.publicUrl.split('/');
                const appName = urlParts[urlParts.length - 2]; // The second to last segment

                // 1. Delete from blob storage in production
                if (isProd && blobStorage) {
                    try {
                        await blobStorage.deleteApp(appName);
                    } catch (error) {
                        console.error(`Failed to delete app ${appName} from blob storage:`, error);
                        // Continue with local cleanup even if blob deletion fails
                    }
                }

                // 2. Delete from local filesystem
                try {
                    const appPath = path.join(APP_STORAGE_PATH, appName);
                    const buildPath = path.join(STATIC_BUILDS_PATH, appName);

                    await Promise.all([
                        fs.rm(appPath, { recursive: true, force: true }).catch(() => { }),
                        fs.rm(buildPath, { recursive: true, force: true }).catch(() => { }),
                    ]);
                } catch (error) {
                    console.error(`Failed to delete app ${appName} from filesystem:`, error);
                    // Continue with database cleanup even if local deletion fails
                }

                // 3. Delete from database
                await deleteGeneratedApp(app.id);

                results.deleted++;
            } catch (error) {
                results.failed++;
                const errorMessage = `Failed to delete app ${app.id}: ${error instanceof Error ? error.message : String(error)}`;
                results.errors.push(errorMessage);
                console.error(errorMessage);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cleaned up ${results.deleted} out of ${results.total} old apps`,
            details: results,
        });
    } catch (error) {
        console.error("Error in cleanup API:", error);
        return NextResponse.json(
            {
                success: false,
                message: `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
            },
            { status: 500 }
        );
    }
}
