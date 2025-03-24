import type { QueryResultRow } from '@vercel/postgres';
import { createClient } from '@vercel/postgres';
import fs from 'node:fs/promises';
import path from 'node:path';

// Create SQL client with proper Vercel environment variables
// Vercel Postgres looks for POSTGRES_URL or POSTGRES_URL_NON_POOLING by default
const sqlClient = createClient({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING,
});

// Define a type for the migration row
interface MigrationRow extends QueryResultRow {
    name: string;
}

/**
 * Run all SQL migrations in order
 */
export async function runMigrations(): Promise<void> {
    try {
        // Create migrations table if it doesn't exist
        await sqlClient.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

        // Get all migration files
        const migrationsDir = path.join(process.cwd(), 'src', 'server', 'migrations');
        const files = await fs.readdir(migrationsDir);

        // Filter for .sql files and sort by name
        const sqlFiles = files
            .filter(file => file.endsWith('.sql'))
            .sort(); // This ensures migrations run in order based on the filename

        // Get already run migrations
        const { rows } = await sqlClient.query<MigrationRow>(`
      SELECT name FROM migrations
    `);
        const completedMigrations = new Set(rows.map(row => row.name));

        // Run migrations that haven't been run yet
        for (const file of sqlFiles) {
            if (completedMigrations.has(file)) {
                console.log(`Migration ${file} already applied, skipping`);
                continue;
            }

            console.log(`Running migration: ${file}`);
            const filePath = path.join(migrationsDir, file);
            const migrationSql = await fs.readFile(filePath, 'utf8');

            // Run the migration with transaction handling
            try {
                // Start transaction
                await sqlClient.query('BEGIN');

                // Execute the migration SQL
                await sqlClient.query(migrationSql);

                // Record the migration as completed
                await sqlClient.query('INSERT INTO migrations (name) VALUES ($1)', [file]);

                // Commit the transaction
                await sqlClient.query('COMMIT');

                console.log(`Migration ${file} completed successfully`);
            } catch (error) {
                // Rollback on error
                await sqlClient.query('ROLLBACK');
                throw error;
            }
        }

        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Error running migrations:', error);
        throw new Error(`Failed to run migrations: ${error instanceof Error ? error.message : String(error)}`);
    }
}
