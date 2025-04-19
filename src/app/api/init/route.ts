import { runMigrations } from '@/server/migrations';
import { NextResponse } from 'next/server';

// A flag to track if migrations have run in this instance
let migrationsRun = false;

/**
 * This route runs migrations when the app starts
 * It can also be called manually to re-run migrations
 */
export async function GET() {
    try {
        if (!migrationsRun) {
            await runMigrations();
            migrationsRun = true;
            return NextResponse.json({ success: true, message: 'Migrations completed successfully' });
        }

        return NextResponse.json({ success: true, message: 'Migrations have already run in this instance' });
    } catch (error) {
        console.error('Error running migrations in init route:', error);
        return NextResponse.json(
            { success: false, message: `Migration failed: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}

// Run migrations on module load
runMigrations()
    .then(() => {
        migrationsRun = true;
        console.log('Initial migrations completed successfully');
    })
    .catch((error) => {
        console.error('Initial migrations failed:', error);
    });
