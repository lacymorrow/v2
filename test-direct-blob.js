// test-direct-blob.js
import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testBlobStorage() {
  try {
    console.log('Starting blob storage test...');

    // Check if BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN is not set in environment variables');
    }

    console.log('Environment variables loaded, BLOB_READ_WRITE_TOKEN exists');

    // Create test directory and file
    const testDir = path.join(__dirname, 'tmp-test-blob');
    const testFilePath = path.join(testDir, 'test.txt');

    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFilePath, 'This is a test file for blob storage');

    console.log(`Created test directory at ${testDir}`);

    // Test uploading directly to Vercel Blob Storage API
    console.log('Uploading file to Vercel Blob Storage...');

    const fileContent = await fs.readFile(testFilePath);

    const response = await fetch('https://blob.vercel-storage.com/test-blob-simple', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        'Content-Type': 'application/octet-stream'
      },
      body: fileContent,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('File uploaded successfully!');
    console.log('URL:', result.url);

    // Clean up
    console.log('Test completed, cleaning up...');
    await fs.rm(testDir, { recursive: true, force: true });

    console.log('Blob storage test completed successfully!');
  } catch (error) {
    console.error('Blob storage test failed:', error);
  }
}

testBlobStorage();
