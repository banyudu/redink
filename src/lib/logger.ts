import debug from 'debug';

// Create debug namespaces for different parts of the app
export const createLogger = (namespace: string) => {
    return debug(`redink:${namespace}`);
};

// Pre-configured loggers for common use cases
export const loggers = {
    app: createLogger('app'),
    storage: createLogger('storage'),
    cache: createLogger('cache'),
    pdf: createLogger('pdf'),
    arxiv: createLogger('arxiv'),
    vector: createLogger('vector'),
    rag: createLogger('rag'),
    llm: createLogger('llm'),
    ui: createLogger('ui'),
    chat: createLogger('chat'),
    embed: createLogger('embed'),
    chunking: createLogger('chunking'),
    updater: createLogger('updater'),
};

// Helper function to replace console.log with debug
export const log = loggers.app;

// Enable all loggers in development
if (import.meta.env.DEV) {
    debug.enabled = () => true;
}