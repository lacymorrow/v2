import fs from 'fs/promises';
import path from 'path';
import { STATIC_BUILDS_PATH } from './app-generator';

const MAX_AGE_DAYS = 7; // Keep builds for 7 days

export async function cleanupOldBuilds() {
    try {
        const now = Date.now();
        const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

        const builds = await fs.readdir(STATIC_BUILDS_PATH);

        for (const build of builds) {
            const buildPath = path.join(STATIC_BUILDS_PATH, build);
            const stats = await fs.stat(buildPath);

            if (now - stats.ctimeMs > maxAge) {
                console.log(`🧹 Removing old build: ${build}`);
                await fs.rm(buildPath, { recursive: true });
            }
        }
    } catch (error) {
        console.error('Error cleaning up old builds:', error);
    }
}
