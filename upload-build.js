import { put } from '@vercel/blob';
import { createPool } from '@vercel/postgres';
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const APP_NAME = 'blob-test-app';
const BUILD_PATH = path.join(process.cwd(), 'public', 'builds', APP_NAME);

async function uploadBuild() {
  try {
    console.log('Uploading app build to blob storage...');

    // Check if BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      process.exit(1);
    }

    console.log(`Using build directory: ${BUILD_PATH}`);

    // Upload index.html first
    const indexPath = path.join(BUILD_PATH, 'index.html');
    console.log(`Uploading index.html from ${indexPath}`);

    try {
      const indexContent = await fs.readFile(indexPath);
      const indexBlob = await put(`generated-apps/${APP_NAME}/index.html`, indexContent, {
        access: 'public',
        contentType: 'text/html',
      });

      console.log(`Index uploaded: ${indexBlob.url}`);

      // Update the database with the blob URL
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
      if (!connectionString) {
        throw new Error('No database connection string found in environment variables');
      }

      const pool = createPool({ connectionString });

      const result = await pool.query(`
        UPDATE generated_apps
        SET public_url = $1
        WHERE public_url LIKE '%/${APP_NAME}/%'
        RETURNING id
      `, [indexBlob.url]);

      if (result.rows.length === 0) {
        console.log('No app found to update URL');
      } else {
        console.log(`Updated app ${result.rows[0].id} with new URL`);
      }

      console.log('Upload and database update complete!');
    } catch (error) {
      console.error('Error uploading index.html:', error);
    }
  } catch (error) {
    console.error('Build upload failed:', error);
  }
}

uploadBuild();
