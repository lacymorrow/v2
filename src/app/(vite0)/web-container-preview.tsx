"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WebContainer } from "@webcontainer/api";
import Convert from "ansi-to-html";
import { Hammer, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Create two converters for light and dark modes with appropriate colors
const stripControlSequences = (text: string) => {
  return (
    text
      // Remove cursor hide/show
      .replace(/\[\?25[hl]/g, "")
      // Remove cursor movement
      .replace(/\[\d*[ABCDEFGJKST]/g, "")
      // Remove screen clear
      .replace(/\[\d*[JKsu]/g, "")
      // Remove terminal title sequences
      .replace(/\]0;[^\a\u001b]*(?:\a|\u001b\\)/g, "")
      // Remove other common control sequences
      .replace(/\[\d*[^A-Za-z\d\[\];]/g, "")
  );
};

const lightConverter = new Convert({
  fg: "#000",
  bg: "#fff",
  newline: true,
  escapeXML: true,
  stream: false,
  colors: {
    0: "#000000", // Black
    1: "#E34234", // Red
    2: "#107C10", // Green
    3: "#825A00", // Yellow
    4: "#0063B1", // Blue
    5: "#881798", // Magenta
    6: "#007A7C", // Cyan
    7: "#6E6E6E", // Light gray
    8: "#767676", // Dark gray
    9: "#E81123", // Bright red
    10: "#16C60C", // Bright green
    11: "#B7410E", // Bright yellow
    12: "#0037DA", // Bright blue
    13: "#B4009E", // Bright magenta
    14: "#00B7C3", // Bright cyan
    15: "#000000", // Bright white
  },
});

const darkConverter = new Convert({
  fg: "#fff",
  bg: "#000",
  newline: true,
  escapeXML: true,
  stream: false,
  colors: {
    0: "#FFFFFF", // White
    1: "#FF5555", // Red
    2: "#50FA7B", // Green
    3: "#F1FA8C", // Yellow
    4: "#6272A4", // Blue
    5: "#FF79C6", // Magenta
    6: "#8BE9FD", // Cyan
    7: "#F8F8F2", // Light gray
    8: "#6272A4", // Dark gray
    9: "#FF6E6E", // Bright red
    10: "#69FF94", // Bright green
    11: "#FFFFA5", // Bright yellow
    12: "#D6ACFF", // Bright blue
    13: "#FF92DF", // Bright magenta
    14: "#A4FFFF", // Bright cyan
    15: "#FFFFFF", // Bright white
  },
});

interface WebContainerPreviewProps {
  projectName?: string | null;
}

type Status = {
  message: string;
  error?: string;
  isHtml?: boolean;
};

interface FileEntry {
  kind: "file";
  file: {
    contents: string;
  };
}

interface DirectoryEntry {
  kind: "directory";
  directory: Record<string, FileEntry | DirectoryEntry>;
}

type FileSystemEntry = FileEntry | DirectoryEntry;

// WebContainer singleton manager
class WebContainerManager {
  private static instance: WebContainerManager | null = null;
  private container: WebContainer | null = null;
  private isBooting = false;
  private bootPromise: Promise<WebContainer> | null = null;
  private mountedFiles: Record<string, FileSystemEntry> | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        if (this.mountedFiles) {
          sessionStorage.setItem(
            "webcontainer-files",
            JSON.stringify(this.mountedFiles)
          );
        }
      });
    }
  }

  public static getInstance(): WebContainerManager {
    if (!WebContainerManager.instance) {
      WebContainerManager.instance = new WebContainerManager();
    }
    return WebContainerManager.instance;
  }

  public setMountedFiles(files: Record<string, FileSystemEntry>): void {
    this.mountedFiles = files;
  }

  public getMountedFiles(): Record<string, FileSystemEntry> | null {
    if (this.mountedFiles) return this.mountedFiles;

    if (typeof window === "undefined") return null;

    const stored = sessionStorage.getItem("webcontainer-files");
    if (stored) {
      this.mountedFiles = JSON.parse(stored);
      return this.mountedFiles;
    }
    return null;
  }

  public async getContainer(): Promise<WebContainer | null> {
    if (typeof window === "undefined") return null;

    // If we already have a container, return it
    if (this.container) {
      return this.container;
    }

    // If we're already booting, return the existing boot promise
    if (this.bootPromise) {
      return this.bootPromise;
    }

    // Start the boot process
    try {
      this.isBooting = true;
      this.bootPromise = WebContainer.boot();
      this.container = await this.bootPromise;

      // If we have stored files, remount them
      const files = this.getMountedFiles();
      if (files) {
        await this.container.mount(files);
      }

      return this.container;
    } catch (error) {
      // Clear state on error
      this.container = null;
      this.bootPromise = null;
      throw error;
    } finally {
      this.isBooting = false;
      this.bootPromise = null;
    }
  }

  public async teardown(): Promise<void> {
    if (typeof window === "undefined") return;

    if (this.container) {
      try {
        await this.container.teardown();
      } catch (error) {
        console.error("Error during teardown:", error);
      } finally {
        this.container = null;
        this.bootPromise = null;
        this.mountedFiles = null;
        sessionStorage.removeItem("webcontainer-files");
      }
    }
  }
}

// Create a safe HTML component to handle ANSI output
function SafeHtmlOutput({ html }: { html: string }) {
  return (
    <div
      className="whitespace-pre-wrap font-mono text-sm"
      // Using dangerouslySetInnerHTML is necessary here to render terminal output with colors
      // The input is sanitized by the ansi-to-html converter
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function WebContainerPreview({ projectName }: WebContainerPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ message: "Initializing..." });
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const containerManager = useRef(WebContainerManager.getInstance());
  const isInitialMount = useRef(true);
  const lastFileContent = useRef<Record<string, string>>({});
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Handle iframe loading events
  const handleIframeLoad = () => {
    setIsIframeLoading(false);
  };

  // Handle refreshing the WebContainer instance
  const handleRefresh = async () => {
    if (isRefreshing || isLoading || !projectName) return;

    setIsRefreshing(true);
    setIsIframeLoading(true);
    setStatus({ message: "Restarting dev server..." });

    try {
      // Clear server URL to trigger a full reload
      sessionStorage.removeItem(`webcontainer-url-${projectName}`);
      setServerUrl(null);

      // Wait a bit to let the current container clean up
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Restart the container
      await containerManager.current.teardown();
      isInitialMount.current = true;
    } catch (error) {
      console.error("Error refreshing WebContainer:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setStatus({
        message: "Failed to refresh WebContainer",
        error: errorMessage,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle rebuilding the project
  const handleRebuild = async () => {
    if (isRebuilding || isLoading || !projectName) return;

    setIsRebuilding(true);
    setStatus({ message: "Rebuilding project..." });

    try {
      const instance = await containerManager.current.getContainer();
      if (!instance) {
        throw new Error("WebContainer not initialized");
      }

      // Run npm/pnpm install to rebuild dependencies
      const terminal = await instance.spawn("pnpm", ["install"]);

      // Handle output
      await terminal.output.pipeTo(
        new WritableStream({
          write(data) {
            const htmlOutput = convertAnsiToHtml(data);
            setStatus({
              message: "Build output",
              isHtml: true,
              error: htmlOutput,
            });
          },
        })
      );

      // Handle errors
      await terminal.stderr.pipeTo(
        new WritableStream({
          write(data) {
            const htmlOutput = convertAnsiToHtml(data);
            setStatus({
              message: "Build error",
              isHtml: true,
              error: htmlOutput,
            });
          },
        })
      );

      // Wait for completion
      const exitCode = await terminal.exit;

      if (exitCode !== 0) {
        throw new Error(`Build failed with exit code ${exitCode}`);
      }

      setStatus({ message: "Rebuild completed successfully" });

      // Refresh the iframe if we have a server URL
      if (serverUrl && iframeRef.current) {
        iframeRef.current.src = serverUrl;
      }
    } catch (error) {
      console.error("Error rebuilding project:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setStatus({
        message: "Failed to rebuild project",
        error: errorMessage,
      });
    } finally {
      setIsRebuilding(false);
    }
  };

  // Initialize from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(`webcontainer-url-${projectName}`);
    if (stored) {
      setServerUrl(stored);
      setIsLoading(false);
      setStatus({ message: "Loading preview..." });
    }
  }, [projectName]);

  // Only cleanup on component unmount if navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      containerManager.current.teardown();
      sessionStorage.removeItem(`webcontainer-url-${projectName}`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [projectName]);

  // The main effect for starting the WebContainer
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

        // 2. Fetch project files from API
        setStatus({ message: "Loading project files..." });
        const response = await fetch(`/api/files/${projectName}?root=true`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to load project files: ${response.status} - ${errorText}`
          );
        }

        const entries = await response.json();

        if (!entries || Object.keys(entries).length === 0) {
          throw new Error("No files found for this project");
        }

        // 3. Mount project files in WebContainer
        setStatus({ message: "Mounting files..." });
        await instance.mount(entries);
        containerManager.current.setMountedFiles(entries);

        // Store initial content for later comparison
        await storeInitialContent(entries);

        // 4. Start the dev server
        setStatus({ message: "Starting dev server..." });

        // Create terminal for output
        const terminal = await instance.spawn("pnpm", ["dev", "--host"]);

        // Set up output handling
        const stdoutStream = await terminal.output.pipeTo(
          new WritableStream({
            write(data) {
              if (!isActive) return;

              // Look for server URL in the output
              if (data.includes("Local:") && data.includes("http")) {
                const match = data.match(/(https?:\/\/localhost:[0-9]+)/);
                if (match && match[1]) {
                  const url = match[1];
                  setServerUrl(url);
                  sessionStorage.setItem(
                    `webcontainer-url-${projectName}`,
                    url
                  );
                  setIsLoading(false);
                }
              }

              const htmlOutput = convertAnsiToHtml(data);
              setStatus({
                message: "Server output",
                isHtml: true,
                error: htmlOutput,
              });
            },
          })
        );

        // Set up error handling
        const stderrStream = await terminal.stderr.pipeTo(
          new WritableStream({
            write(data) {
              if (!isActive) return;
              const htmlOutput = convertAnsiToHtml(data);
              setStatus({
                message: "Server error",
                isHtml: true,
                error: htmlOutput,
              });
            },
          })
        );

        // Handle server exit
        terminal.exit.then((code) => {
          if (!isActive) return;
          if (code !== 0) {
            setStatus({
              message: `Server exited with code ${code}`,
              error: "The development server crashed",
            });
            setIsLoading(false);
          }
        });
      } catch (error) {
        console.error("WebContainer error:", error);
        if (!isActive) return;

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setStatus({
          message: "Failed to start WebContainer",
          error: errorMessage,
        });
        setIsLoading(false);
      }
    }

    startDevServer();

    return () => {
      isActive = false;
    };
  }, [projectName, serverUrl]);

  // Function to store initial file content for change detection
  async function storeInitialContent(
    entries: Record<string, FileSystemEntry>,
    basePath = ""
  ) {
    if (!entries) return;

    for (const [name, entry] of Object.entries(entries)) {
      const fullPath = basePath ? `${basePath}/${name}` : name;

      if (entry.kind === "file" && entry.file.contents) {
        lastFileContent.current[fullPath] = entry.file.contents;
      } else if (entry.kind === "directory" && entry.directory) {
        await storeInitialContent(entry.directory, fullPath);
      }
    }
  }

  // Helper function to convert ANSI to HTML
  const convertAnsiToHtml = (text: string) => {
    try {
      const cleanText = stripControlSequences(text);
      const html = `<div class="dark:hidden">${lightConverter.toHtml(cleanText)}</div>
			             <div class="hidden dark:block">${darkConverter.toHtml(cleanText)}</div>`;
      return html;
    } catch (error) {
      console.error("Error converting ANSI to HTML:", error);
      return text;
    }
  };

  if (!projectName) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Generate a project to see the preview
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={handleRebuild}
              disabled={isLoading || isRefreshing || isRebuilding}
            >
              {isRebuilding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Hammer className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rebuild project</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing || isRebuilding}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Restart dev server</TooltipContent>
        </Tooltip>
      </div>

      <div className="relative h-full overflow-hidden border-l">
        <div className="grid h-full [grid-template-areas:'stack']">
          {/* Base layer: iframe */}
          <iframe
            ref={iframeRef}
            key={serverUrl}
            className="h-full w-full border-none bg-transparent [grid-area:stack]"
            title="Project Preview"
            onLoad={handleIframeLoad}
            src={serverUrl || "about:blank"}
          />

          {/* Loading layer */}
          {(isLoading || isIframeLoading || !serverUrl || status.error) && (
            <div className="z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm [grid-area:stack]">
              {(isLoading || isIframeLoading) && (
                <Loader2 className="h-6 w-6 animate-spin" />
              )}
              <div className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap text-center font-mono dark:text-white">
                {status.isHtml ? (
                  <SafeHtmlOutput html={convertAnsiToHtml(status.message)} />
                ) : (
                  <span className="whitespace-pre-wrap font-mono text-sm">
                    {status.message}
                  </span>
                )}
                {status.error && (
                  <div className="mt-2 max-w-md text-sm text-red-500 dark:text-red-400">
                    {status.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
