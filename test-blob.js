import { del, list, put } from '@vercel/blob';
import 'dotenv/config';

async function testBlobStorage() {
  try {
    console.log('Testing Vercel Blob Storage...');

    // Check if BLOB_READ_WRITE_TOKEN is set
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set. Please set it in .env.local');
      process.exit(1);
    }

    const testFileName = 'test-file.txt';
    const testContent = `This is a test file generated on ${new Date().toISOString()}`;

    // Test put operation
    console.log('Uploading test file...');
    const blob = await put(testFileName, testContent, {
      access: 'public',
    });

    console.log('File uploaded successfully:', blob.url);

    // Test list operation
    console.log('Listing files...');
    const blobs = await list();
    console.log(`Found ${blobs.blobs.length} files:`);
    for (const b of blobs.blobs) {
      console.log(` - ${b.pathname}: ${b.url}`);
    }

    // Test delete operation
    console.log('Deleting test file...');
    await del(blob.url);
    console.log('File deleted successfully');

    console.log('All Blob Storage operations completed successfully!');
  } catch (error) {
    console.error('Blob Storage test failed:', error);
  }
}

testBlobStorage();
