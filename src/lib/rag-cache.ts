import { loggers } from './logger'; /**
 * RAG Cache Manager
 * Handles caching of embeddings and RAG metadata for performance optimization
 */

import { exists, mkdir, writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { homeDir } from '@tauri-apps/api/path';

interface EmbeddingCacheEntry {
  text: string;
  embedding: number[];
  modelName: string;
  timestamp: number;
}

interface DocumentCacheMetadata {
  documentId: string;
  documentPath: string;
  chunkCount: number;
  hasSemanticIndex: boolean;
  embeddingModel: string;
  createdAt: number;
  lastAccessed: number;
  textHash: string; // Hash of PDF text to detect changes
}

export class RAGCacheManager {
  private static instance: RAGCacheManager;
  private cachePath: string | null = null;
  private embeddingCache = new Map<string, EmbeddingCacheEntry>();
  private documentMetadata = new Map<string, DocumentCacheMetadata>();
  private initialized = false;

  private constructor() {}

  public static getInstance(): RAGCacheManager {
    if (!RAGCacheManager.instance) {
      RAGCacheManager.instance = new RAGCacheManager();
    }
    return RAGCacheManager.instance;
  }

  /**
   * Initialize cache manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const home = await homeDir();
      this.cachePath = `${home}/.cache/redink`;

      loggers.app('[RAGCache] Initializing at:', this.cachePath);

      // Ensure cache directories exist
      const dirs = [
        this.cachePath,
        `${this.cachePath}/embeddings`,
        `${this.cachePath}/vectors`,
        `${this.cachePath}/metadata`,
      ];

      for (const dir of dirs) {
        try {
          if (!(await exists(dir))) {
            loggers.app('[RAGCache] Creating directory:', dir);
            await mkdir(dir, { recursive: true });
          } else {
            loggers.app('[RAGCache] Directory exists:', dir);
          }
        } catch (mkdirError) {
          loggers.app(`[RAGCache] Failed to create ${dir}:`, mkdirError);
          // Continue anyway - some directories might be created by other components
        }
      }

      // Load document metadata
      await this.loadDocumentMetadata();

      this.initialized = true;
      loggers.app('[RAGCache] Initialized successfully at:', this.cachePath);
    } catch (error) {
      loggers.app('[RAGCache] Failed to initialize:', error);
      // Don't throw - allow system to work without cache if needed
      this.initialized = true; // Mark as initialized to prevent retries
    }
  }

  /**
   * Generate a hash for text (simple hash for demo, use crypto.subtle for production)
   */
  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Load document metadata from disk
   */
  private async loadDocumentMetadata(): Promise<void> {
    if (!this.cachePath) return;

    try {
      const metadataPath = `${this.cachePath}/metadata/documents.json`;
      if (await exists(metadataPath)) {
        const content = await readTextFile(metadataPath);
        const data = JSON.parse(content) as DocumentCacheMetadata[];

        for (const meta of data) {
          this.documentMetadata.set(meta.documentId, meta);
        }

        loggers.app(`[RAGCache] Loaded metadata for ${data.length} documents`);
      }
    } catch (error) {
      loggers.app('[RAGCache] Failed to load metadata:', error);
    }
  }

  /**
   * Save document metadata to disk
   */
  private async saveDocumentMetadata(): Promise<void> {
    if (!this.cachePath) return;

    try {
      const metadataPath = `${this.cachePath}/metadata/documents.json`;
      const data = Array.from(this.documentMetadata.values());
      const content = JSON.stringify(data, null, 2);
      await writeTextFile(metadataPath, content);
      loggers.app(`[RAGCache] Saved metadata for ${data.length} documents`);
    } catch (error) {
      loggers.app('[RAGCache] Failed to save metadata:', error);
    }
  }

  /**
   * Cache embedding for text
   */
  async cacheEmbedding(text: string, embedding: number[], modelName: string): Promise<void> {
    const key = this.simpleHash(text + modelName);
    this.embeddingCache.set(key, {
      text,
      embedding,
      modelName,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached embedding
   */
  getCachedEmbedding(text: string, modelName: string): number[] | null {
    const key = this.simpleHash(text + modelName);
    const cached = this.embeddingCache.get(key);

    if (cached && cached.modelName === modelName) {
      return cached.embedding;
    }

    return null;
  }

  /**
   * Save document metadata
   */
  async saveDocumentCache(metadata: DocumentCacheMetadata): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.documentMetadata.set(metadata.documentId, metadata);
    await this.saveDocumentMetadata();
  }

  /**
   * Get document metadata
   */
  getDocumentCache(documentId: string): DocumentCacheMetadata | null {
    return this.documentMetadata.get(documentId) ?? null;
  }

  /**
   * Check if document cache is valid (text hasn't changed)
   */
  isDocumentCacheValid(documentId: string, textHash: string): boolean {
    const cached = this.documentMetadata.get(documentId);
    if (!cached) return false;
    return cached.textHash === textHash;
  }

  /**
   * Update document last accessed time
   */
  async updateDocumentAccess(documentId: string): Promise<void> {
    const cached = this.documentMetadata.get(documentId);
    if (cached) {
      cached.lastAccessed = Date.now();
      await this.saveDocumentMetadata();
    }
  }

  /**
   * Clear old cache entries (keep last 30 days)
   */
  async clearOldCache(maxAgeMs = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, meta] of this.documentMetadata.entries()) {
      if (now - meta.lastAccessed > maxAgeMs) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.documentMetadata.delete(id);
    }

    if (toDelete.length > 0) {
      await this.saveDocumentMetadata();
      loggers.app(`[RAGCache] Cleared ${toDelete.length} old cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    embeddingCacheSize: number;
    documentCount: number;
    cachePath: string | null;
  } {
    return {
      embeddingCacheSize: this.embeddingCache.size,
      documentCount: this.documentMetadata.size,
      cachePath: this.cachePath,
    };
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    this.embeddingCache.clear();
    this.documentMetadata.clear();
    await this.saveDocumentMetadata();
    loggers.app('[RAGCache] Cleared all cache');
  }

  /**
   * Get cache path
   */
  getCachePath(): string | null {
    return this.cachePath;
  }
}

// Export singleton instance
export const ragCache = RAGCacheManager.getInstance();
