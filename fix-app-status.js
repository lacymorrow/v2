import { createPool } from '@vercel/postgres';
import 'dotenv/config';

async function fixAppStatus() {
  try {
    console.log('Fixing stuck app status...');

    // Create database connection
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    if (!connectionString) {
      throw new Error('No database connection string found in environment variables');
    }

    const pool = createPool({ connectionString });

    // Update the app status
    const result = await pool.query(`
      UPDATE generated_apps
      SET status = 'ready'
      WHERE public_url LIKE '%/blob-test-app/%'
      RETURNING id, status
    `);

    if (result.rows.length === 0) {
      console.log('No app found to update');
    } else {
      console.log('App updated:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }

    console.log('Fix complete!');
  } catch (error) {
    console.error('Database update failed:', error);
  }
}

fixAppStatus();
