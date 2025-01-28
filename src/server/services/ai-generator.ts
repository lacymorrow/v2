import fs from 'fs/promises';
import path from 'path';

interface AIGenerateOptions {
    prompt: string;
    appPath: string;
    currentFile?: string; // Optional file to use as context
}

interface AIEditResponse {
    file: string;
    content: string;
    action: 'create' | 'update' | 'delete';
}

export async function generateWithAI({ prompt, appPath, currentFile }: AIGenerateOptions): Promise<AIEditResponse[]> {
    // This will be replaced with actual OpenAI call
    console.log('🤖 Processing AI request...');
    console.log(`📝 Prompt: ${prompt}`);

    let context = '';

    // If a current file is specified, load it for context
    if (currentFile) {
        const filePath = path.join(appPath, currentFile);
        try {
            context = await fs.readFile(filePath, 'utf-8');
            console.log(`📄 Loaded context from ${currentFile}`);
        } catch (error) {
            console.error(`❌ Failed to load context file: ${error}`);
        }
    }

    // TODO: Add OpenAI call here
    // For now, return mock response
    return [{
        file: 'src/App.tsx',
        content: '// Updated content',
        action: 'update'
    }];
}

// Helper to apply AI changes to the project
export async function applyAIChanges(appPath: string, changes: AIEditResponse[]): Promise<void> {
    for (const change of changes) {
        const filePath = path.join(appPath, change.file);

        try {
            switch (change.action) {
                case 'create':
                    await fs.mkdir(path.dirname(filePath), { recursive: true });
                    await fs.writeFile(filePath, change.content);
                    console.log(`✨ Created new file: ${change.file}`);
                    break;

                case 'update':
                    await fs.writeFile(filePath, change.content);
                    console.log(`📝 Updated file: ${change.file}`);
                    break;

                case 'delete':
                    await fs.unlink(filePath);
                    console.log(`🗑️ Deleted file: ${change.file}`);
                    break;
            }
        } catch (error) {
            console.error(`❌ Failed to apply change to ${change.file}:`, error);
        }
    }
}
