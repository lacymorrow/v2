import { createPool } from '@vercel/postgres';
import { put, list } from '@vercel/blob';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';

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
    const prefix = 'generated-apps';

    // Upload the app to blob storage
    console.log('Starting upload...');
    const fileMap = new Map();

    // Check if directory exists
    await fs.access(BUILD_PATH);

    // Process the directory
    await processDirectory(BUILD_PATH, APP_NAME, fileMap, "");

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

async function processDirectory(dirPath, appName, results, relativePath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

    if (entry.isDirectory()) {
      // Process subdirectory recursively
      await processDirectory(entryPath, appName, results, entryRelativePath);
    } else {
      // Upload file
      const content = await fs.readFile(entryPath);
      const normalizedPath = entryRelativePath.split(path.sep).join("/").replace(/^\/+/, "");
      const blobPath = `generated-apps/${appName}/${normalizedPath}`;

      const contentType = getContentType(normalizedPath);

      const blob = await put(blobPath, content, {
        contentType,
        access: "public",
      });

      results.set(entryRelativePath, blob.url);
    }
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".tsx": "text/plain",
    ".ts": "text/plain",
    ".jsx": "text/plain",
  };

  return contentTypes[ext] || "application/octet-stream";
}

uploadToBlob();
