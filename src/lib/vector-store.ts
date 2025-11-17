import { loggers } from './logger'; /**
 * Vector Store Manager using LanceDB (Rust backend)
 * Provides offline vector storage in .cache/redink/vectors
 */

import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';
import { exists, mkdir } from '@tauri-apps/plugin-fs';
import type { TextChunk } from './rag';

export interface VectorSearchResult {
  chunk: TextChunk;
  score: number;
  distance: number;
}

interface RustVectorSearchResult {
  id: string;
  text: string;
  score: number;
  distance: number;
}

interface RustChunkData {
  id: string;
  text: string;
  vector: number[];
  chunk_index: number;
  text_length: number;
}

export class VectorStore {
  private static instance: VectorStore;
  private storagePath: string | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): VectorStore {
    if (!VectorStore.instance) {
      VectorStore.instance = new VectorStore();
    }
    return VectorStore.instance;
  }

  /**
   * Initialize LanceDB with offline storage (Rust backend)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Set up storage path
      const home = await homeDir();
      this.storagePath = `${home}/.cache/redink/vectors`;

      // Ensure directory exists
      loggers.app('[VectorStore] Ensuring storage directory exists:', this.storagePath);
      try {
        if (!(await exists(this.storagePath))) {
          await mkdir(this.storagePath, { recursive: true });
          loggers.app('[VectorStore] Created storage directory');
        } else {
          loggers.app('[VectorStore] Storage directory already exists');
        }
      } catch (mkdirError) {
        loggers.app('[VectorStore] Failed to create directory:', mkdirError);
      }

      loggers.app('[VectorStore] Storage path:', this.storagePath);

      // Initialize Rust backend
      const result = await invoke<string>('vector_store_initialize', {
        storagePath: this.storagePath,
      });

      loggers.app('[VectorStore]', result);
      this.initialized = true;
    } catch (error) {
      loggers.app('[VectorStore] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Add chunks with embeddings to a table
   */
  async addChunks(documentId: string, chunks: TextChunk[], embeddings: number[][]): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error('Chunks and embeddings length mismatch');
    }

    if (!this.initialized || !this.storagePath) {
      await this.initialize();
    }

    try {
      // Convert to Rust-compatible format
      const rustChunks: RustChunkData[] = chunks.map((chunk, idx) => ({
        id: chunk.id,
        text: chunk.text,
        vector: embeddings[idx],
        chunk_index: idx,
        text_length: chunk.text.length,
      }));

      const result = await invoke<string>('vector_store_add_chunks', {
        documentId,
        chunks: rustChunks,
        storagePath: this.storagePath,
      });

      loggers.app(`[VectorStore] ${result}`);
    } catch (error) {
      loggers.app('[VectorStore] Failed to add chunks:', error);
      throw error;
    }
  }

  /**
   * Search for similar chunks using semantic similarity
   */
  async search(
    documentId: string,
    queryEmbedding: number[],
    topK = 5,
  ): Promise<VectorSearchResult[]> {
    if (!this.initialized || !this.storagePath) {
      await this.initialize();
    }

    try {
      const results = await invoke<RustVectorSearchResult[]>('vector_store_search', {
        documentId,
        queryEmbedding,
        topK,
        storagePath: this.storagePath,
      });

      // Transform to our format
      const searchResults: VectorSearchResult[] = results.map((result) => ({
        chunk: {
          id: result.id,
          text: result.text,
        },
        score: result.score,
        distance: result.distance,
      }));

      loggers.app(`[VectorStore] Found ${searchResults.length} results for query`);
      return searchResults;
    } catch (error) {
      loggers.app('[VectorStore] Search failed:', error);
      throw error;
    }
  }

  /**
   * Check if a document table exists
   */
  async hasDocument(documentId: string): Promise<boolean> {
    if (!this.initialized || !this.storagePath) {
      await this.initialize();
    }

    try {
      return await invoke<boolean>('vector_store_has_document', {
        documentId,
        storagePath: this.storagePath,
      });
    } catch {
      return false;
    }
  }

  /**
   * Delete a document table
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.initialized || !this.storagePath) {
      await this.initialize();
    }

    try {
      const result = await invoke<string>('vector_store_delete_document', {
        documentId,
        storagePath: this.storagePath,
      });
      loggers.app('[VectorStore]', result);
    } catch (error) {
      loggers.app('[VectorStore] Failed to delete document:', error);
    }
  }

  /**
   * Get table row count
   */
  async getCollectionCount(documentId: string): Promise<number> {
    if (!this.initialized || !this.storagePath) {
      await this.initialize();
    }

    try {
      return await invoke<number>('vector_store_get_count', {
        documentId,
        storagePath: this.storagePath,
      });
    } catch {
      return 0;
    }
  }

  /**
   * Clear all tables (for testing/debugging)
   */
  async clearAll(): Promise<void> {
    if (!this.initialized || !this.storagePath) {
      await this.initialize();
    }

    try {
      const result = await invoke<string>('vector_store_clear_all', {
        storagePath: this.storagePath,
      });
      loggers.app('[VectorStore]', result);
    } catch (error) {
      loggers.app('[VectorStore] Failed to clear all:', error);
    }
  }

  /**
   * Get storage path
   */
  getStoragePath(): string | null {
    return this.storagePath;
  }
}

// Export singleton instance
export const vectorStore = VectorStore.getInstance();
