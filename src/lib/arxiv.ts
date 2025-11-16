/**
 * ArXiv API Integration with Rust Backend and Persistent Caching
 * 
 * Uses Rust backend to fetch from ArXiv API v1 (https://export.arxiv.org/api/query)
 * This avoids CORS issues and provides better error handling
 */

import { invoke } from '@tauri-apps/api/core';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string;
  category: string;
  publishedDate: string; // Note: Rust uses published_date, we map it here
  abstract: string; // Note: Rust uses abstract_text, we map it here  
  downloadUrl: string; // Note: Rust uses download_url, we map it here
  pdfUrl: string; // Note: Rust uses pdf_url, we map it here
  categories: string[];
}

interface RustArxivPaper {
  id: string;
  title: string;
  authors: string;
  category: string;
  published_date: string;
  abstract_text: string;
  download_url: string;
  pdf_url: string;
  categories: string[];
}

interface ArxivSearchOptions {
  maxResults?: number;
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  sortOrder?: 'ascending' | 'descending';
}

// Map Rust response to TypeScript interface
function mapRustPaper(rustPaper: RustArxivPaper): ArxivPaper {
  return {
    id: rustPaper.id,
    title: rustPaper.title,
    authors: rustPaper.authors,
    category: rustPaper.category,
    publishedDate: rustPaper.published_date,
    abstract: rustPaper.abstract_text,
    downloadUrl: rustPaper.download_url,
    pdfUrl: rustPaper.pdf_url,
    categories: rustPaper.categories,
  };
}

interface CachedArxivData {
  data: ArxivPaper[];
  timestamp: number;
}

const DEFAULT_MAX_RESULTS = 20;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour for persistent cache
const CACHE_DIR = 'redink/arxiv-cache';

// Popular ArXiv categories
export const ARXIV_CATEGORIES = {
  'cs.AI': 'Artificial Intelligence',
  'cs.LG': 'Machine Learning',
  'cs.CL': 'Computation and Language (NLP)',
  'cs.CV': 'Computer Vision',
  'cs.CR': 'Cryptography and Security',
  'cs.DB': 'Databases',
  'cs.DC': 'Distributed Computing',
  'cs.DS': 'Data Structures and Algorithms',
  'cs.HC': 'Human-Computer Interaction',
  'cs.IR': 'Information Retrieval',
  'cs.NE': 'Neural and Evolutionary Computing',
  'cs.RO': 'Robotics',
  'cs.SE': 'Software Engineering',
  'stat.ML': 'Machine Learning (Statistics)',
  'math.CO': 'Combinatorics',
  'physics.data-an': 'Data Analysis',
  'quant-ph': 'Quantum Physics',
};

/**
 * Search ArXiv papers using Rust backend
 */
export async function searchArxivPapers(
  query: string,
  options: {
    maxResults?: number;
    sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
    sortOrder?: 'ascending' | 'descending';
  } = {},
): Promise<ArxivPaper[]> {
  const {
    maxResults = DEFAULT_MAX_RESULTS,
    sortBy = 'relevance',
    sortOrder = 'descending',
  } = options;

  // Handle empty query - fetch featured papers instead
  if (!query || query.trim() === '') {
    console.log('[ArXiv API] Empty query detected, fetching featured papers instead');
    return getFeaturedPapers(maxResults);
  }

  try {
    console.log('[ArXiv API] Requesting papers via Rust backend...');
    console.log('[ArXiv API] Query:', query);

    const rustOptions: ArxivSearchOptions = {
      maxResults,
      sortBy,
      sortOrder,
    };

    const rustPapers: RustArxivPaper[] = await invoke('search_arxiv_papers', {
      query,
      options: rustOptions,
    });

    const papers = rustPapers.map(mapRustPaper);

    console.log(`[ArXiv API] Successfully received ${papers.length} papers from Rust backend`);
    return papers;
  } catch (error: any) {
    console.error('[ArXiv API] Search failed with error:', error);
    const errorMessage = error.message || String(error);
    console.error('[ArXiv API] Detailed error for user:', {
      originalError: error,
      message: errorMessage,
      stack: error.stack,
    });
    throw new Error(`ArXiv search failed: ${errorMessage}`);
  }
}

/**
 * Get featured/popular papers from specific categories using Rust backend
 */
export async function getFeaturedPapers(maxResults = 12): Promise<ArxivPaper[]> {
  try {
    console.log('[ArXiv API] Fetching featured papers via Rust backend...');

    const rustPapers: RustArxivPaper[] = await invoke('get_papers_by_categories', {
      categories: ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV'],
      maxResults,
    });

    const papers = rustPapers.map(mapRustPaper);
    console.log(`[ArXiv API] Successfully received ${papers.length} featured papers`);
    return papers;
  } catch (error: any) {
    console.error('[ArXiv API] Failed to get featured papers:', error);
    const errorMessage = error.message || String(error);
    console.error('[ArXiv API] Detailed error for user:', {
      originalError: error,
      message: errorMessage,
      stack: error.stack,
    });
    throw new Error(`Failed to fetch featured papers: ${errorMessage}`);
  }
}

/**
 * Search papers by category using Rust backend
 */
export async function searchByCategory(
  category: string,
  maxResults = DEFAULT_MAX_RESULTS,
): Promise<ArxivPaper[]> {
  try {
    console.log('[ArXiv API] Searching by category via Rust backend:', category);

    const rustPapers: RustArxivPaper[] = await invoke('get_papers_by_categories', {
      categories: [category],
      maxResults,
    });

    const papers = rustPapers.map(mapRustPaper);
    console.log(`[ArXiv API] Successfully received ${papers.length} papers for category ${category}`);
    return papers;
  } catch (error: any) {
    console.error('[ArXiv API] Failed to search by category:', error);
    throw new Error(`Failed to search by category: ${error.message || String(error)}`);
  }
}

/**
 * Get paper by ArXiv ID using Rust backend
 */
export async function getPaperById(arxivId: string): Promise<ArxivPaper | null> {
  try {
    console.log('[ArXiv API] Getting paper by ID via Rust backend:', arxivId);

    const rustPaper: RustArxivPaper | null = await invoke('get_paper_by_id', {
      arxivId,
    });

    if (!rustPaper) {
      console.log('[ArXiv API] No paper found for ID:', arxivId);
      return null;
    }

    const paper = mapRustPaper(rustPaper);
    console.log('[ArXiv API] Successfully received paper:', paper.title);
    return paper;
  } catch (error: any) {
    console.error('[ArXiv API] Failed to get paper by ID:', error);
    return null;
  }
}

/**
 * Persistent cache manager for ArXiv search results
 */
class ArxivCacheManager {
  private memoryCache = new Map<string, { data: ArxivPaper[]; timestamp: number }>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure cache directory exists
      if (!(await exists(CACHE_DIR, { baseDir: BaseDirectory.AppData }))) {
        await mkdir(CACHE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
      }
      this.initialized = true;
      console.log('[ArXiv Cache] Initialized persistent cache');
    } catch (error) {
      console.error('[ArXiv Cache] Failed to initialize:', error);
    }
  }

  getCacheKey(query: string, options: any = {}): string {
    // Create a safe filename from the query and options
    const keyStr = `${query}_${JSON.stringify(options)}`;
    return keyStr.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  }

  async get(query: string, options: any = {}): Promise<ArxivPaper[] | null> {
    const key = this.getCacheKey(query, options);

    // Check memory cache first
    const memCached = this.memoryCache.get(key);
    if (memCached) {
      if (Date.now() - memCached.timestamp <= CACHE_DURATION) {
        // Skip empty cache - don't return empty results
        if (memCached.data.length === 0) {
          console.log('[ArXiv Cache] Memory hit but empty, skipping:', key);
          this.memoryCache.delete(key);
          return null;
        }
        console.log('[ArXiv Cache] Memory hit:', key);
        return memCached.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check persistent cache
    try {
      await this.initialize();
      const filePath = `${CACHE_DIR}/${key}.json`;

      if (await exists(filePath, { baseDir: BaseDirectory.AppData })) {
        const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
        const cached: CachedArxivData = JSON.parse(content);

        // Check if cache is expired
        if (Date.now() - cached.timestamp <= CACHE_DURATION) {
          // Skip empty cache - don't return empty results
          if (cached.data.length === 0) {
            console.log('[ArXiv Cache] Persistent hit but empty, skipping:', key);
            return null;
          }
          console.log('[ArXiv Cache] Persistent hit:', key);
          // Store in memory cache for faster access
          this.memoryCache.set(key, cached);
          return cached.data;
        } else {
          console.log('[ArXiv Cache] Expired, removing:', key);
        }
      }
    } catch (error) {
      console.error('[ArXiv Cache] Failed to read cache:', error);
    }

    return null;
  }

  async set(query: string, data: ArxivPaper[], options: any = {}): Promise<void> {
    // Don't cache empty results - they might be errors
    if (data.length === 0) {
      console.log('[ArXiv Cache] Skipping cache for empty result');
      return;
    }

    const key = this.getCacheKey(query, options);
    const cached: CachedArxivData = { data, timestamp: Date.now() };

    // Store in memory cache
    this.memoryCache.set(key, cached);

    // Store in persistent cache
    try {
      await this.initialize();
      const filePath = `${CACHE_DIR}/${key}.json`;
      const content = JSON.stringify(cached);
      await writeTextFile(filePath, content, { baseDir: BaseDirectory.AppData });
      console.log('[ArXiv Cache] Persisted:', key);
    } catch (error) {
      console.error('[ArXiv Cache] Failed to persist cache:', error);
    }

    // Clean old entries from memory if it gets too large
    if (this.memoryCache.size > 20) {
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 5 entries
      for (let i = 0; i < 5; i++) {
        this.memoryCache.delete(sortedEntries[i][0]);
      }
    }
  }

  clear(): void {
    this.memoryCache.clear();
    console.log('[ArXiv Cache] Memory cache cleared');
  }

  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear persistent cache directory
    try {
      await this.initialize();
      // Note: There's no built-in way to delete a directory in Tauri fs plugin
      // So we'll just let the cache naturally expire or get overwritten
      console.log('[ArXiv Cache] All caches will be ignored and overwritten on next fetch');
    } catch (error) {
      console.error('[ArXiv Cache] Failed to clear persistent cache:', error);
    }
  }
}

export const arxivCache = new ArxivCacheManager();

/**
 * Cached search function
 */
export async function searchArxivPapersCached(
  query: string,
  options: Parameters<typeof searchArxivPapers>[1] = {},
): Promise<ArxivPaper[]> {
  // Handle empty query - use featured papers with caching
  if (!query || query.trim() === '') {
    console.log('[ArXiv API] Empty query in cached search, fetching featured papers');
    return getFeaturedPapersCached(options.maxResults || DEFAULT_MAX_RESULTS);
  }

  // Check cache first
  const cached = await arxivCache.get(query, options);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const papers = await searchArxivPapers(query, options);

  // Store in cache
  await arxivCache.set(query, papers, options);

  return papers;
}

/**
 * Cached featured papers function
 */
export async function getFeaturedPapersCached(maxResults = 12): Promise<ArxivPaper[]> {
  const cacheKey = `featured_${maxResults}`;
  const cached = await arxivCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const papers = await getFeaturedPapers(maxResults);
  await arxivCache.set(cacheKey, papers);

  return papers;
}

/**
 * Get latest papers from selected categories using Rust backend
 */
export async function getPapersByCategories(
  categories: string[],
  maxResults = 20,
): Promise<ArxivPaper[]> {
  try {
    console.log('[ArXiv API] Getting papers by categories via Rust backend:', categories);

    const rustPapers: RustArxivPaper[] = await invoke('get_papers_by_categories', {
      categories,
      maxResults,
    });

    const papers = rustPapers.map(mapRustPaper);
    console.log(`[ArXiv API] Successfully received ${papers.length} papers for categories:`, categories);
    return papers;
  } catch (error: any) {
    console.error('[ArXiv API] Failed to get papers by categories:', error);
    const errorMessage = error.message || String(error);
    console.error('[ArXiv API] Detailed error for user:', {
      originalError: error,
      message: errorMessage,
      stack: error.stack,
      categories,
    });
    throw new Error(`Failed to get papers by categories: ${errorMessage}`);
  }
}

/**
 * Cached version of getPapersByCategories
 */
export async function getPapersByCategoriesCached(
  categories: string[],
  maxResults = 20,
): Promise<ArxivPaper[]> {
  // Sort categories to ensure consistent cache key
  const sortedCategories = [...categories].sort();
  const cacheKey = `categories_${sortedCategories.join('_')}_${maxResults}`;

  const cached = await arxivCache.get(cacheKey);
  if (cached) {
    console.log(`[ArXiv] Using cached data for categories: ${sortedCategories.join(', ')}`);
    return cached;
  }

  console.log(`[ArXiv] Fetching fresh data for categories: ${sortedCategories.join(', ')}`);
  const papers = await getPapersByCategories(sortedCategories, maxResults);
  await arxivCache.set(cacheKey, papers);

  return papers;
}

