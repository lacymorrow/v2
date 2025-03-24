# Vercel Blob Storage Implementation

This document provides details on how Vercel Blob Storage is implemented for storing generated app files.

## Overview

The app generator creates files locally during the generation process. In production environments (Vercel), these files need to be persisted beyond the lifecycle of a serverless function. Vercel Blob Storage provides a solution for this by offering a managed storage service optimized for Vercel's infrastructure.

## Implementation Details

### Core Components

1. **BlobStorage Service**: `src/server/services/storage/blob-storage.ts`
   - Provides methods for uploading, listing, and deleting files
   - Uses the `@vercel/blob` package for interacting with Vercel Blob Storage

2. **App Generator Integration**: `src/server/services/app-generator.ts`
   - Detects production environments and uses Blob Storage when appropriate
   - Falls back to local filesystem storage in development environments

3. **API Endpoints**:
   - `GET /api/files/[name]`: Serves files from either Blob Storage or local filesystem
   - `POST /api/cleanup`: Cleans up old app files from both storage systems

### Environment Configuration

Required environment variables:
- `BLOB_READ_WRITE_TOKEN`: The authentication token for Vercel Blob Storage (required in production)

Optional environment variables:
- `APP_STORAGE_PATH`: Custom path for generated app source files (development only)
- `STATIC_BUILDS_PATH`: Custom path for built app files (development only)

In production environments, the app automatically uses the `/tmp` directory for temporary file storage.

## Testing

A test script (`test-blob.js`) is provided to verify Blob Storage functionality:

```bash
# Set up the environment variable (you can also add it to .env.local)
export BLOB_READ_WRITE_TOKEN=your_token_here

# Run the test script
npm run test-blob
```

The test script validates:
1. File uploads
2. Listing files
3. Deleting files

## Workflows

### App Generation Flow

1. App is generated locally in the filesystem (even in production, but in the `/tmp` directory)
2. If in production, files are uploaded to Vercel Blob Storage
3. File URLs are stored in the database
4. Files are served from Blob Storage in production or local filesystem in development

### Cleanup Flow

1. The cleanup API identifies apps older than 7 days
2. It deletes files from:
   - Vercel Blob Storage (if in production)
   - Local filesystem
   - Database records

## Troubleshooting

Common issues:

1. **Missing BLOB_READ_WRITE_TOKEN**: Ensure this is set in your Vercel environment variables
2. **Permission Errors**: Check that your token has the necessary permissions
3. **Quota Limits**: Be aware of storage and bandwidth limits in your Vercel plan

## Resources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Blob JavaScript SDK](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk) 
