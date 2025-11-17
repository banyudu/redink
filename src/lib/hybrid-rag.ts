import { loggers } from './logger'; /**
 * Hybrid RAG System
 * Combines TF-IDF (keyword) and Semantic (embedding) retrieval with RRF fusion
 */

import { buildIndex, retrieve as tfidfRetrieve, type RagIndex, type TextChunk } from './rag';
import { embeddingService } from './embeddings';
import { vectorStore, type VectorSearchResult } from './vector-store';
import { smartChunk, type EnhancedTextChunk } from './chunking';
import { ragCache } from './rag-cache';

export interface HybridSearchResult {
  chunk: TextChunk;
  tfidfScore: number;
  semanticScore: number;
  fusedScore: number;
  rank: number;
}

export interface HybridRagIndex {
  documentId: string;
  tfidfIndex: RagIndex;
  chunks: EnhancedTextChunk[];
  hasSemanticIndex: boolean;
  metadata: {
    createdAt: number;
    chunkCount: number;
    embeddingModel: string;
  };
}

/**
 * Reciprocal Rank Fusion (RRF)
 * Combines rankings from multiple retrieval methods
 * Formula: RRF(d) = Σ 1 / (k + rank(d))
 */
function reciprocalRankFusion(
  results: Map<string, { ranks: number[]; scores: number[] }>,
  k = 60,
): Map<string, number> {
  const fusedScores = new Map<string, number>();

  for (const [chunkId, data] of results.entries()) {
    let rrfScore = 0;
    for (const rank of data.ranks) {
      rrfScore += 1 / (k + rank);
    }
    fusedScores.set(chunkId, rrfScore);
  }

  return fusedScores;
}

/**
 * Weighted fusion
 * Combines scores using weighted average
 */
function weightedFusion(
  tfidfResults: Array<{ chunk: TextChunk; score: number }>,
  semanticResults: VectorSearchResult[],
  tfidfWeight = 0.4,
  semanticWeight = 0.6,
): Map<string, { tfidfScore: number; semanticScore: number; fusedScore: number }> {
  const fusedScores = new Map<
    string,
    { tfidfScore: number; semanticScore: number; fusedScore: number }
  >();

  // Add TF-IDF scores
  for (const result of tfidfResults) {
    fusedScores.set(result.chunk.id, {
      tfidfScore: result.score,
      semanticScore: 0,
      fusedScore: result.score * tfidfWeight,
    });
  }

  // Add or update with semantic scores
  for (const result of semanticResults) {
    const existing = fusedScores.get(result.chunk.id);
    if (existing) {
      existing.semanticScore = result.score;
      existing.fusedScore = existing.tfidfScore * tfidfWeight + result.score * semanticWeight;
    } else {
      fusedScores.set(result.chunk.id, {
        tfidfScore: 0,
        semanticScore: result.score,
        fusedScore: result.score * semanticWeight,
      });
    }
  }

  return fusedScores;
}

export class HybridRAG {
  private static instance: HybridRAG;
  private indexes = new Map<string, HybridRagIndex>();

  private constructor() {}

  /**
   * Simple hash function for text
   */
  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(text.length, 10000); i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  public static getInstance(): HybridRAG {
    if (!HybridRAG.instance) {
      HybridRAG.instance = new HybridRAG();
    }
    return HybridRAG.instance;
  }

  /**
   * Build hybrid index for a document
   */
  async buildIndex(
    documentId: string,
    text: string,
    options?: {
      chunkStrategy?: 'semantic' | 'sliding' | 'hierarchical';
      forceRebuild?: boolean;
    },
  ): Promise<HybridRagIndex> {
    const { chunkStrategy = 'semantic', forceRebuild = false } = options ?? {};

    // Initialize cache
    await ragCache.initialize();

    // Generate text hash for cache validation
    const textHash = this.simpleHash(text);

    // Check if index already exists in memory
    if (!forceRebuild && this.indexes.has(documentId)) {
      loggers.app('[HybridRAG] Using cached index for:', documentId);
      await ragCache.updateDocumentAccess(documentId);
      return this.indexes.get(documentId)!;
    }

    // Check cache validity
    const cachedMeta = ragCache.getDocumentCache(documentId);
    const hasVectorStore = await vectorStore.hasDocument(documentId);

    if (
      !forceRebuild &&
      cachedMeta &&
      ragCache.isDocumentCacheValid(documentId, textHash) &&
      hasVectorStore
    ) {
      loggers.app('[HybridRAG] Loading from cache:', documentId);
      await ragCache.updateDocumentAccess(documentId);
      // We still need to rebuild TF-IDF index since it's in-memory
    }

    loggers.app('[HybridRAG] Building hybrid index for:', documentId);

    // Step 1: Enhanced chunking
    loggers.app('[HybridRAG] Chunking with strategy:', chunkStrategy);
    const enhancedChunks = smartChunk(text, chunkStrategy, {
      targetSize: 800,
      overlap: 150,
    }) as EnhancedTextChunk[];

    loggers.app(`[HybridRAG] Created ${enhancedChunks.length} chunks`);

    // Step 2: Build TF-IDF index (fast, in-memory)
    loggers.app('[HybridRAG] Building TF-IDF index...');
    const tfidfIndex = buildIndex(enhancedChunks);

    // Step 3: Build semantic index (embeddings + vector store)
    let hasSemanticIndex = false;

    if (!hasVectorStore || forceRebuild) {
      try {
        loggers.app('[HybridRAG] Initializing vector store...');
        await vectorStore.initialize();

        loggers.app('[HybridRAG] Initializing embedding service...');
        await embeddingService.initialize();

        loggers.app('[HybridRAG] Generating embeddings for chunks...');
        const texts = enhancedChunks.map((c) => c.text);
        const embeddings = await embeddingService.embedBatch(texts, 4);

        loggers.app('[HybridRAG] Storing vectors in ChromaDB...');
        await vectorStore.addChunks(documentId, enhancedChunks, embeddings);

        hasSemanticIndex = true;
        loggers.app('[HybridRAG] Semantic index created successfully');
      } catch (error) {
        loggers.app('[HybridRAG] Failed to build semantic index:', error);
        loggers.app('[HybridRAG] Falling back to TF-IDF only');
      }
    } else {
      hasSemanticIndex = true;
      loggers.app('[HybridRAG] Using existing semantic index');
    }

    // Create index object
    const index: HybridRagIndex = {
      documentId,
      tfidfIndex,
      chunks: enhancedChunks,
      hasSemanticIndex,
      metadata: {
        createdAt: Date.now(),
        chunkCount: enhancedChunks.length,
        embeddingModel: embeddingService.getModelName(),
      },
    };

    // Cache in memory
    this.indexes.set(documentId, index);

    // Save metadata to cache
    await ragCache.saveDocumentCache({
      documentId,
      documentPath: '', // Will be set by caller if needed
      chunkCount: enhancedChunks.length,
      hasSemanticIndex,
      embeddingModel: embeddingService.getModelName(),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      textHash: this.simpleHash(text),
    });

    return index;
  }

  /**
   * Hybrid search with fusion
   */
  async search(
    documentId: string,
    query: string,
    options?: {
      topK?: number;
      tfidfWeight?: number;
      semanticWeight?: number;
      fusionMethod?: 'weighted' | 'rrf';
      tfidfCandidates?: number;
      semanticCandidates?: number;
    },
  ): Promise<HybridSearchResult[]> {
    const {
      topK = 5,
      tfidfWeight = 0.4,
      semanticWeight = 0.6,
      fusionMethod = 'weighted',
      tfidfCandidates = 15,
      semanticCandidates = 15,
    } = options ?? {};

    const index = this.indexes.get(documentId);
    if (!index) {
      throw new Error(`No index found for document: ${documentId}`);
    }

    loggers.app(`[HybridRAG] Searching with query: "${query}"`);

    // Step 1: TF-IDF retrieval
    loggers.app('[HybridRAG] Running TF-IDF search...');
    const tfidfResults = tfidfRetrieve(index.tfidfIndex, query, tfidfCandidates);

    // Step 2: Semantic retrieval (if available)
    let semanticResults: VectorSearchResult[] = [];

    if (index.hasSemanticIndex) {
      try {
        loggers.app('[HybridRAG] Running semantic search...');
        const queryEmbedding = await embeddingService.embed(query);
        semanticResults = await vectorStore.search(documentId, queryEmbedding, semanticCandidates);
      } catch (error) {
        loggers.app('[HybridRAG] Semantic search failed:', error);
        loggers.app('[HybridRAG] Using TF-IDF results only');
      }
    }

    // Step 3: Fusion
    loggers.app(`[HybridRAG] Fusing results (method: ${fusionMethod})...`);
    const finalResults: HybridSearchResult[] = [];

    if (fusionMethod === 'rrf') {
      // Reciprocal Rank Fusion
      const resultMap = new Map<string, { ranks: number[]; scores: number[] }>();

      // Add TF-IDF rankings
      tfidfResults.forEach((result, idx) => {
        resultMap.set(result.chunk.id, {
          ranks: [idx + 1],
          scores: [result.score],
        });
      });

      // Add semantic rankings
      semanticResults.forEach((result, idx) => {
        const existing = resultMap.get(result.chunk.id);
        if (existing) {
          existing.ranks.push(idx + 1);
          existing.scores.push(result.score);
        } else {
          resultMap.set(result.chunk.id, {
            ranks: [idx + 1],
            scores: [result.score],
          });
        }
      });

      // Compute RRF scores
      const fusedScores = reciprocalRankFusion(resultMap);

      // Create results
      const chunkMap = new Map(index.chunks.map((c) => [c.id, c]));

      for (const [chunkId, fusedScore] of fusedScores.entries()) {
        const chunk = chunkMap.get(chunkId);
        if (!chunk) continue;

        const data = resultMap.get(chunkId)!;
        const tfidfScore = data.scores[0] ?? 0;
        const semanticScore = data.scores[1] ?? data.scores[0] ?? 0;

        finalResults.push({
          chunk,
          tfidfScore,
          semanticScore,
          fusedScore,
          rank: 0, // Will be set after sorting
        });
      }

      // Sort by fused score
      finalResults.sort((a, b) => b.fusedScore - a.fusedScore);
    } else {
      // Weighted fusion
      const fusedScores = weightedFusion(
        tfidfResults,
        semanticResults,
        tfidfWeight,
        semanticWeight,
      );

      // Create results
      const chunkMap = new Map(index.chunks.map((c) => [c.id, c]));

      for (const [chunkId, scores] of fusedScores.entries()) {
        const chunk = chunkMap.get(chunkId);
        if (!chunk) continue;

        finalResults.push({
          chunk,
          tfidfScore: scores.tfidfScore,
          semanticScore: scores.semanticScore,
          fusedScore: scores.fusedScore,
          rank: 0,
        });
      }

      // Sort by fused score
      finalResults.sort((a, b) => b.fusedScore - a.fusedScore);
    }

    // Assign ranks and take top K
    finalResults.forEach((result, idx) => {
      result.rank = idx + 1;
    });

    const topResults = finalResults.slice(0, topK);

    loggers.app(`[HybridRAG] Returning top ${topResults.length} results`);
    return topResults;
  }

  /**
   * Get index for a document
   */
  getIndex(documentId: string): HybridRagIndex | undefined {
    return this.indexes.get(documentId);
  }

  /**
   * Check if document has index
   */
  hasIndex(documentId: string): boolean {
    return this.indexes.has(documentId);
  }

  /**
   * Delete index for a document
   */
  async deleteIndex(documentId: string): Promise<void> {
    this.indexes.delete(documentId);
    await vectorStore.deleteDocument(documentId);
    loggers.app('[HybridRAG] Deleted index for:', documentId);
  }

  /**
   * Clear all indexes
   */
  async clearAll(): Promise<void> {
    this.indexes.clear();
    await vectorStore.clearAll();
    loggers.app('[HybridRAG] Cleared all indexes');
  }

  /**
   * Get statistics
   */
  getStats(documentId: string): {
    chunkCount: number;
    hasSemanticIndex: boolean;
    embeddingModel: string;
    createdAt: number;
  } | null {
    const index = this.indexes.get(documentId);
    if (!index) return null;

    return {
      chunkCount: index.metadata.chunkCount,
      hasSemanticIndex: index.hasSemanticIndex,
      embeddingModel: index.metadata.embeddingModel,
      createdAt: index.metadata.createdAt,
    };
  }
}

// Export singleton instance
export const hybridRAG = HybridRAG.getInstance();
