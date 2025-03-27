import { createPool } from '@vercel/postgres';
import 'dotenv/config';
import path from 'node:path';
import { BlobStorage } from './src/server/services/storage/blob-storage';

const APP_NAME = 'blob-test-app';
const BUILD_PATH = path.join(process.cwd(), 'public', 'builds', APP_NAME);

async function uploadToBlob() {
  try {
    console.log('Uploading app to blob storage...');

    // Check if BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN is not set in environment variables');
    }

    console.log(`Using build directory: ${BUILD_PATH}`);
    const blobStorage = new BlobStorage('generated-apps');

    // Upload the app to blob storage
    console.log('Starting upload...');
    const fileMap = await blobStorage.uploadDirectory(BUILD_PATH, APP_NAME);

    console.log(`Upload complete! Uploaded ${fileMap.size} files`);

    // Find the index.html URL to use as the public URL
    let publicUrl = '';
    for (const [filePath, url] of fileMap.entries()) {
      console.log(`- ${filePath}: ${url}`);
      if (filePath.endsWith('index.html')) {
        publicUrl = url;
      }
    }

    if (publicUrl) {
      console.log(`\nFound index.html URL: ${publicUrl}`);

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
      `, [publicUrl]);

      if (result.rows.length === 0) {
        console.log('No app found to update URL');
      } else {
        console.log(`Updated app ${result.rows[0].id} with new URL`);
      }
    } else {
      console.warn('No index.html file found in upload!');
    }

    console.log('Blob upload process complete!');
  } catch (error) {
    console.error('Blob upload failed:', error);
  }
}

uploadToBlob();
