/**
 * Embedding Service using transformers.js
 * Provides local, offline semantic embeddings for text chunks
 */

import { pipeline, Pipeline, env } from '@xenova/transformers';

// Configure transformers.js to use local cache
env.allowLocalModels = false; // Use remote models
env.allowRemoteModels = true;

// Model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSION = 384; // all-MiniLM-L6-v2 produces 384-dimensional embeddings

export class EmbeddingService {
  private static instance: EmbeddingService;
  private embedder: Pipeline | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitializing = false;

  private constructor() {}

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Initialize the embedding model
   * Downloads model on first use (~22MB)
   */
  async initialize(): Promise<void> {
    if (this.embedder) return;
    
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._initialize();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _initialize(): Promise<void> {
    console.log('[Embeddings] Initializing embedding model:', MODEL_NAME);
    try {
      this.embedder = await pipeline('feature-extraction', MODEL_NAME);
      console.log('[Embeddings] Model loaded successfully');
    } catch (error) {
      console.error('[Embeddings] Failed to load model:', error);
      throw new Error(`Failed to initialize embedding model: ${error}`);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.embedder) {
      await this.initialize();
    }

    if (!this.embedder) {
      throw new Error('Embedding model not initialized');
    }

    try {
      const output = await this.embedder(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert tensor to regular array
      const embedding = Array.from(output.data) as number[];
      return embedding;
    } catch (error) {
      console.error('[Embeddings] Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batched for efficiency)
   */
  async embedBatch(texts: string[], batchSize = 8): Promise<number[][]> {
    if (!this.embedder) {
      await this.initialize();
    }

    if (!this.embedder) {
      throw new Error('Embedding model not initialized');
    }

    const embeddings: number[][] = [];

    // Process in batches to avoid memory issues
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`[Embeddings] Processing batch ${i / batchSize + 1}/${Math.ceil(texts.length / batchSize)}`);
      
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.embed(text))
      );
      
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Check if the model is initialized
   */
  isInitialized(): boolean {
    return this.embedder !== null;
  }

  /**
   * Get embedding dimension
   */
  getDimension(): number {
    return EMBEDDING_DIMENSION;
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return MODEL_NAME;
  }
}

// Export singleton instance
export const embeddingService = EmbeddingService.getInstance();

