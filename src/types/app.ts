export interface GeneratedApp {
    id: string;
    prompt: string;
    template: 'react' | 'next';
    createdAt: Date;
    publicUrl: string;
    status: 'pending' | 'generating' | 'ready' | 'error';
    dependencies: string[];
    error?: string;
    aiChanges?: {
        file: string;
        action: 'create' | 'update' | 'delete';
        timestamp: Date;
    }[];
}
