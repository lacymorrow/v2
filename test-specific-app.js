import { createPool } from '@vercel/postgres';
import 'dotenv/config';

async function checkAppStatus() {
  try {
    console.log('Checking status of generated app...');

    // Create database connection
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    if (!connectionString) {
      throw new Error('No database connection string found in environment variables');
    }

    const pool = createPool({ connectionString });

    // Check for the specific app using URL pattern
    const result = await pool.query(`
      SELECT *
      FROM generated_apps
      WHERE public_url LIKE $1
    `, [`%/blob-test-app/%`]);

    if (result.rows.length === 0) {
      console.log('App not found in database');
    } else {
      console.log('App found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }

    console.log('Check complete!');
  } catch (error) {
    console.error('Database check failed:', error);
  }
}

checkAppStatus();
