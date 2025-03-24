import type { GeneratedApp as GeneratedAppType } from '@/types/app';
import { createClient } from '@vercel/postgres';

// Create SQL client with proper Vercel environment variables
// Vercel Postgres looks for POSTGRES_URL or POSTGRES_URL_NON_POOLING by default
const sqlClient = createClient({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING,
});

/**
 * Save app metadata to the database
 */
export async function saveGeneratedApp(app: GeneratedAppType): Promise<void> {
    try {
        await sqlClient.query(`
      INSERT INTO generated_apps (
        id,
        prompt,
        template,
        created_at,
        public_url,
        status,
        dependencies,
        error
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      ON CONFLICT (id) DO UPDATE SET
        public_url = $5,
        status = $6,
        dependencies = $7,
        error = $8
    `, [
            app.id,
            app.prompt,
            app.template,
            app.createdAt.toISOString(),
            app.publicUrl,
            app.status,
            JSON.stringify(app.dependencies),
            app.error || null
        ]);
    } catch (error) {
        console.error('Error saving app to database:', error);
        throw new Error(`Failed to save app to database: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Get app metadata by name
 */
export async function getGeneratedAppByName(name: string): Promise<GeneratedAppType | null> {
    try {
        const result = await sqlClient.query(
            'SELECT * FROM generated_apps WHERE public_url LIKE $1 LIMIT 1',
            [`%/${name}/%`]
        );

        if (result.rowCount === 0) {
            return null;
        }

        const row = result.rows[0] as any;
        return {
            id: row.id,
            prompt: row.prompt,
            template: row.template,
            createdAt: new Date(row.created_at),
            publicUrl: row.public_url,
            status: row.status,
            dependencies: Array.isArray(row.dependencies) ? row.dependencies : JSON.parse(row.dependencies || '[]'),
            error: row.error || undefined,
        };
    } catch (error) {
        console.error(`Error getting app ${name} from database:`, error);
        return null;
    }
}

/**
 * Update app status
 */
export async function updateGeneratedAppStatus(
    id: string,
    status: GeneratedAppType['status'],
    error?: string
): Promise<void> {
    try {
        await sqlClient.query(
            'UPDATE generated_apps SET status = $1, error = $2 WHERE id = $3',
            [status, error || null, id]
        );
    } catch (error) {
        console.error('Error updating app status:', error);
        throw new Error(`Failed to update app status: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * List all apps
 */
export async function listGeneratedApps(limit = 50, offset = 0): Promise<GeneratedAppType[]> {
    try {
        const result = await sqlClient.query(
            `SELECT * FROM generated_apps
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return result.rows.map((row: any) => ({
            id: row.id,
            prompt: row.prompt,
            template: row.template,
            createdAt: new Date(row.created_at),
            publicUrl: row.public_url,
            status: row.status,
            dependencies: Array.isArray(row.dependencies) ? row.dependencies : JSON.parse(row.dependencies || '[]'),
            error: row.error || undefined,
        }));
    } catch (error) {
        console.error('Error listing apps from database:', error);
        return [];
    }
}

/**
 * Delete an app
 */
export async function deleteGeneratedApp(id: string): Promise<void> {
    try {
        await sqlClient.query('DELETE FROM generated_apps WHERE id = $1', [id]);
    } catch (error) {
        console.error(`Error deleting app ${id}:`, error);
        throw new Error(`Failed to delete app: ${error instanceof Error ? error.message : String(error)}`);
    }
}
