# Blob Storage + WebContainer Technical Implementation

This document outlines the technical implementation details for integrating Vercel Blob Storage with the WebContainer preview component.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  App Generator  │────►│  Blob Storage   │────►│  WebContainer   │
│    Service      │     │    Service      │     │    Preview      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       ▲                      │
         │                       │                      │
         ▼                       │                      ▼
┌─────────────────┐             │             ┌─────────────────┐
│                 │             │             │                 │
│   Local Temp    │             │             │  Browser-based  │
│   File Storage  │             │             │  File System    │
│                 │             │             │                 │
└─────────────────┘             │             └─────────────────┘
                                │
                                │
                       ┌─────────────────┐
                       │                 │
                       │  Vercel Blob    │
                       │    Storage      │
                       │                 │
                       └─────────────────┘
```

## Core Components and Changes

### 1. Enhanced BlobStorage Service

**File:** `src/server/services/storage/blob-storage.ts`

```typescript
import { del, list, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

export class BlobStorage {
  // Existing methods...

  /**
   * Get file URLs for WebContainer
   * @param appName The app's name
   * @returns Map of file paths to their blob URLs
   */
  async getWebContainerUrls(appName: string): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    if (!this.isTokenValid) {
      // Generate local URLs for development
      return this.getLocalUrls(appName);
    }
    
    try {
      const blobs = await list({
        prefix: `${this.prefix}/${appName}/`,
      });
      
      for (const blob of blobs.blobs) {
        const filePath = blob.pathname.replace(`${this.prefix}/${appName}/`, "");
        results.set(filePath, blob.url);
      }
      
      return results;
    } catch (error) {
      console.error(`Error getting URLs for app ${appName}:`, error);
      throw new Error(
        `Failed to get URLs from blob storage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate local URLs for development environment
   */
  private async getLocalUrls(appName: string): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const buildPath = path.join(process.cwd(), "public", "builds", appName);
    
    try {
      const files = await this.getFilesRecursively(buildPath);
      
      for (const file of files) {
        const relativePath = file.replace(buildPath, "").replace(/^\/+/, "");
        results.set(relativePath, `/builds/${appName}/${relativePath}`);
      }
      
      return results;
    } catch (error) {
      console.warn(`Error generating local URLs: ${error}`);
      return results;
    }
  }
  
  /**
   * Get all files in a directory recursively
   */
  private async getFilesRecursively(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...await this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}
```

### 2. WebContainer Integration

**File:** `src/app/(vite0)/web-container-preview.tsx`

Key changes:

```typescript
// Import the BlobStorage service
import { BlobStorage } from "@/server/services/storage/blob-storage";

export function WebContainerPreview({ projectName }: WebContainerPreviewProps) {
  // Existing state...
  const blobStorageRef = useRef<BlobStorage | null>(null);
  
  // Initialize BlobStorage
  useEffect(() => {
    if (!blobStorageRef.current) {
      blobStorageRef.current = new BlobStorage("generated-apps");
    }
  }, []);
  
  // Modified to load files from Blob Storage
  useEffect(() => {
    if (!projectName || !isInitialMount.current) return;
    isInitialMount.current = false;
    
    // If we already have a server URL from session storage, we don't need to start again
    if (serverUrl) return;
    
    let isActive = true;
    
    async function startDevServer() {
      try {
        setIsLoading(true);
        setStatus({ message: "Loading WebContainer..." });
        
        // 1. Initialize the WebContainer
        const instance = await containerManager.current.getContainer();
        if (!instance || !isActive) {
          throw new Error("Failed to initialize WebContainer");
        }
        
        // 2. Fetch project files from Blob Storage or API
        setStatus({ message: "Loading project files..." });
        
        let entries;
        
        // First try to load from Blob Storage
        try {
          if (blobStorageRef.current) {
            // Get files from Blob Storage - convert URLs to file structure
            const urlMap = await blobStorageRef.current.getWebContainerUrls(projectName);
            
            if (urlMap.size > 0) {
              // Transform URL map to file structure
              entries = await transformUrlsToFileStructure(urlMap);
              debugLog("Files", `Loaded ${Object.keys(entries).length} entries from Blob Storage`);
            }
          }
        } catch (error) {
          debugLog("Blob Error", `Failed to load from Blob Storage: ${error}`);
        }
        
        // Fall back to API if Blob Storage failed
        if (!entries) {
          debugLog("Files", `Falling back to API for project: ${projectName}`);
          const response = await fetch(`/api/files/${projectName}?root=true`);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to load project files: ${response.status} - ${errorText}`);
          }
          
          entries = await response.json();
          debugLog("Files", `Received ${Object.keys(entries).length} entries from API`);
        }
        
        if (!entries || Object.keys(entries).length === 0) {
          throw new Error("No files found for this project");
        }
        
        // 3. Mount project files in WebContainer
        try {
          await instance.mount(entries);
          containerManager.current.setMountedFiles(entries);
          debugLog("Mount", "Files mounted successfully");
        } catch (mountError) {
          debugLog("Mount Error", mountError);
          throw mountError;
        }
        
        // 4. Start the dev server
        // Existing code...
      } catch (error) {
        // Existing error handling...
      }
    }
    
    startDevServer();
    // Cleanup function...
  }, [projectName, serverUrl]);
  
  // Helper function to transform URL map to file structure
  async function transformUrlsToFileStructure(urlMap: Map<string, string>) {
    const fileStructure: Record<string, any> = {};
    
    for (const [filePath, url] of urlMap.entries()) {
      // Build nested structure from filePath
      const pathParts = filePath.split("/");
      let currentLevel = fileStructure;
      
      // Create directory structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!currentLevel[part]) {
          currentLevel[part] = {
            kind: "directory",
            directory: {}
          };
        }
        currentLevel = currentLevel[part].directory;
      }
      
      // Add file
      const fileName = pathParts[pathParts.length - 1];
      
      try {
        // Fetch file content from URL
        const response = await fetch(url);
        const content = await response.text();
        
        currentLevel[fileName] = {
          kind: "file",
          file: {
            contents: content
          }
        };
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        // Add an empty file as fallback
        currentLevel[fileName] = {
          kind: "file",
          file: {
            contents: `// Error loading content for ${fileName}`
          }
        };
      }
    }
    
    return fileStructure;
  }
  
  // UI remains the same but without Save button
  return (
    <div className="relative h-full">
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {/* Existing buttons for Debug, Rebuild, Refresh */}
      </div>
      
      {/* Rest of the component... */}
    </div>
  );
}
```

### 3. App Generator Integration

**File:** `src/server/services/app-generator.ts`

```typescript
import { BlobStorage } from "./storage/blob-storage";

export class AppGenerator {
  private blobStorage: BlobStorage;
  
  constructor() {
    this.blobStorage = new BlobStorage("generated-apps");
  }
  
  // In the generate method after files are created
  async generate(/*...existing params...*/) {
    // Existing code to generate app...
    
    // After generation is complete
    if (process.env.NODE_ENV === "production") {
      // Upload files to blob storage
      const fileMap = await this.blobStorage.uploadDirectory(outputPath, appName);
      
      // Get index.html URL for public URL
      let publicUrl = "";
      for (const [filePath, url] of fileMap.entries()) {
        if (filePath.endsWith("index.html")) {
          publicUrl = url;
          break;
        }
      }
      
      return {
        // Existing return properties...
        publicUrl,
        blobStorageUrls: fileMap
      };
    }
    
    // Return local paths for development
    return {
      // Existing return properties...
      publicUrl: `/builds/${appName}/index.html`
    };
  }
}
```

### 4. API Route for File Access

**File:** `src/app/api/files/[name]/route.ts`

```typescript
import { BlobStorage } from "@/server/services/storage/blob-storage";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const name = params.name;
  const root = request.nextUrl.searchParams.get("root") === "true";
  
  try {
    const blobStorage = new BlobStorage("generated-apps");
    
    // Check for files in blob storage first
    try {
      const blobFiles = await blobStorage.listFiles(name);
      
      if (blobFiles.length > 0) {
        // Build file structure from blob URLs
        const fileStructure: Record<string, any> = {};
        
        for (const blobFile of blobFiles) {
          const { pathname, url } = blobFile;
          // Only download content if not requesting root structure
          // Otherwise just include the URL reference
          
          if (root) {
            // Build path to this file
            const pathParts = pathname.split("/");
            let current = fileStructure;
            
            for (let i = 0; i < pathParts.length - 1; i++) {
              const part = pathParts[i];
              if (!current[part]) {
                current[part] = {
                  kind: "directory",
                  directory: {}
                };
              }
              current = current[part].directory;
            }
            
            // Add file entry with URL
            const fileName = pathParts[pathParts.length - 1];
            current[fileName] = {
              kind: "file",
              file: {
                contents: `// This file will be loaded from: ${url}`
              },
              blobUrl: url
            };
          } else {
            // If specific file requested, fetch and return it
            if (pathname === name) {
              const response = await fetch(url);
              const content = await response.text();
              return NextResponse.json({ content });
            }
          }
        }
        
        if (root) {
          return NextResponse.json(fileStructure);
        }
      }
    } catch (error) {
      console.warn("Error accessing blob storage:", error);
      // Fall back to local filesystem
    }
    
    // Fall back to local file system
    const basePath = path.join(process.cwd(), "public", "builds", name);
    
    if (root) {
      // Return entire file structure for mounting
      const structure = await buildFileStructure(basePath);
      return NextResponse.json(structure);
    } else {
      // Return specific file
      const filePath = path.join(basePath, name);
      const content = await fs.readFile(filePath, "utf-8");
      return NextResponse.json({ content });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to load files: ${error}` },
      { status: 500 }
    );
  }
}

// Helper to build file structure
async function buildFileStructure(dirPath: string): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        result[entry.name] = {
          kind: "directory",
          directory: await buildFileStructure(entryPath)
        };
      } else {
        const content = await fs.readFile(entryPath, "utf-8");
        result[entry.name] = {
          kind: "file",
          file: {
            contents: content
          }
        };
      }
    }
  } catch (error) {
    console.error(`Error building file structure for ${dirPath}:`, error);
  }
  
  return result;
}
```

## Testing Strategy

1. **Unit Tests for BlobStorage Service**

```typescript
// src/__tests__/services/blob-storage.test.ts
import { BlobStorage } from "@/server/services/storage/blob-storage";
import { put, list, del } from "@vercel/blob";

// Mock Vercel Blob
jest.mock("@vercel/blob", () => ({
  put: jest.fn(),
  list: jest.fn(),
  del: jest.fn()
}));

describe("BlobStorage Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  });
  
  test("uploads a file to blob storage", async () => {
    // Arrange
    const blobStorage = new BlobStorage("test-prefix");
    const mockUrl = "https://example.com/test.txt";
    (put as jest.Mock).mockResolvedValue({ url: mockUrl });
    
    // Act
    const result = await blobStorage.uploadFile("test.txt", "test content", "test-app");
    
    // Assert
    expect(put).toHaveBeenCalledWith(
      "test-prefix/test-app/test.txt", 
      "test content", 
      expect.objectContaining({ 
        contentType: "text/plain",
        access: "public"
      })
    );
    expect(result).toBe(mockUrl);
  });
  
  // More tests for other methods...
});
```

## Implementation Steps

1. Create BlobStorage service with required methods
   ```bash
   # Create the service file if it doesn't exist
   touch src/server/services/storage/blob-storage.ts
   ```

2. Update App Generator to upload files to Blob Storage
   ```bash
   # Update existing file
   # src/server/services/app-generator.ts
   ```

3. Modify WebContainer Preview component to load from Blob Storage
   ```bash
   # Update existing file
   # src/app/(vite0)/web-container-preview.tsx
   ```

4. Create/update API route for accessing files
   ```bash
   # Create API route if it doesn't exist
   mkdir -p src/app/api/files/[name]
   touch src/app/api/files/[name]/route.ts
   ```

5. Add Vercel Blob Storage package if not already installed
   ```bash
   npm install @vercel/blob
   ```

## Deployment Considerations

1. **Environment Variables**
   - Ensure `BLOB_READ_WRITE_TOKEN` is set in Vercel environment variables
   - Set `NODE_ENV=production` for production environments

2. **Monitoring**
   - Add custom logging for Blob Storage operations
   - Set up Vercel Blob Storage usage alerts

## Performance Optimization

1. **Caching**
   - Cache blob URLs in memory during a user session
   - Use service worker caching for frequently accessed files

2. **Batch Uploads**
   - Implement concurrent uploads with rate limiting
   - Prioritize uploading critical files first (HTML, CSS)
