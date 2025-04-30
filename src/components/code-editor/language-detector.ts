/**
 * A mapping of file extensions to programming languages for syntax highlighting
 */
const LANGUAGE_MAP: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    css: "css",
    json: "json",
    html: "html",
    md: "markdown",
    mdx: "markdown",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    php: "php",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    swift: "swift",
    kt: "kotlin",
    sh: "bash",
};

/**
 * Detects programming language from file path based on extension
 */
export function detectLanguage(filePath: string): string {
    if (!filePath) return "plaintext";

    const extension = filePath.split(".").pop()?.toLowerCase() || "";
    return LANGUAGE_MAP[extension] || "plaintext";
}
