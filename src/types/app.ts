/**
 * A generated app model
 */
export interface GeneratedApp {
    id: string;
    prompt: string;
    template: string;
    createdAt: Date;
    publicUrl: string;
    status: 'generating' | 'ready' | 'error';
    dependencies: string[];
    error?: string;
    aiChanges?: {
        file: string;
        action: 'create' | 'update' | 'delete';
        timestamp: Date;
    }[];
}
