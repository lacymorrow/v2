import { createPool } from '@vercel/postgres';
import 'dotenv/config';

async function testDatabaseTable() {
  try {
    console.log('Testing database connection and table...');

    // Create database connection
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    if (!connectionString) {
      throw new Error('No database connection string found in environment variables');
    }

    const pool = createPool({ connectionString });

    // Check if the generated_apps table exists
    const tableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'generated_apps'
      );
    `);

    const tableExists = tableResult.rows[0].exists;
    console.log(`The generated_apps table ${tableExists ? 'exists' : 'does not exist'}`);

    if (tableExists) {
      // Get the number of rows in the table
      const countResult = await pool.query('SELECT COUNT(*) FROM generated_apps');
      console.log(`Number of rows in generated_apps: ${countResult.rows[0].count}`);

      // Check table structure
      const columnResult = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'generated_apps'
        ORDER BY ordinal_position;
      `);

      console.log('Table structure:');
      for (const col of columnResult.rows) {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      }

      // Check if indexes exist
      const indexResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'generated_apps';
      `);

      console.log('Indexes:');
      for (const idx of indexResult.rows) {
        console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
      }
    }

    console.log('Database test completed successfully!');
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testDatabaseTable();
