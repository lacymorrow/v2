import { createPool } from '@vercel/postgres';
import 'dotenv/config';

async function testConnection() {
    try {
        const connectionString = "postgresql://neondb_owner:1wVgoiDStTW3@ep-silent-wind-a563gcqf-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
        const sql = createPool({ connectionString });
        const result = await sql.query('SELECT NOW()');
        console.log('Database connection successful:', result.rows[0]);
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}

testConnection();
