# Vercel Blob Storage Integration

This document describes the integration of Vercel Blob Storage for persistent file storage in the app generator.

## Overview

The implementation uses Vercel Blob Storage to store generated app files in a production environment, while falling back to local filesystem storage in development. This ensures that:

1. Generated app files persist across serverless function invocations
2. Files are served efficiently from Vercel's edge network
3. Storage can be cleaned up automatically to manage costs

## Implementation

### Core Components

1. **BlobStorage Service** (`src/server/services/storage/blob-storage.ts`)
   - Handles file upload/download operations with Vercel Blob
   - Provides methods for managing app files

2. **Database Integration** (`src/server/models/generated-app.ts`)
   - Stores metadata about generated apps
   - Tracks public URLs, status, and other information

3. **File API** (`src/app/api/files/[name]/route.ts`)
   - Serves files from either Blob Storage or local filesystem
   - Handles directory listing and file content retrieval

4. **App Generator** (`src/server/services/app-generator.ts`)
   - Uses Blob Storage in production environments
   - Records app metadata in the database

5. **Cleanup API** (`src/app/api/cleanup/route.ts`)
   - Removes old app files from both Blob Storage and filesystem
   - Deletes database records for old apps

### Database Schema

The implementation uses a simple database schema to track generated apps:

```sql
CREATE TABLE IF NOT EXISTS generated_apps (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  public_url TEXT NOT NULL,
  status TEXT NOT NULL,
  dependencies JSONB NOT NULL DEFAULT '[]',
  error TEXT
);
```

## Environment Variables

- `BLOB_READ_WRITE_TOKEN`: Required for Vercel Blob Storage access
- `APP_STORAGE_PATH`: (Optional) Local path for generated app source files
- `STATIC_BUILDS_PATH`: (Optional) Local path for generated app builds

## Usage

### Generating an App

```typescript
const app = await generateApp({
  prompt: "Create a React app with a counter component",
  name: "my-app",
  template: "react",
});

// The app.publicUrl will point to either:
// - A Vercel Blob URL in production
// - A local file path in development
```

### Accessing App Files

Files can be accessed through the API:

```
GET /api/files/my-app?file=src/App.jsx
```

or the full directory structure:

```
GET /api/files/my-app?root
```

### Cleaning Up Old Apps

Run the cleanup API periodically to remove old apps:

```
POST /api/cleanup
```

## Development vs Production

In development:
- Files are stored locally in the project directory
- URLs are relative paths (/builds/my-app/index.html)

In production:
- Files are stored in Vercel Blob Storage
- URLs are Vercel Blob URLs (https://example.blob.vercel-storage.com/...)
- Temporary files in /tmp are used during generation

## Future Improvements

1. Add user authentication to associate apps with users
2. Implement pagination for the app listing API
3. Add caching layer for frequently accessed files
4. Support for automatic deployments to Vercel 
