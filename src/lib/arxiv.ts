/**
 * ArXiv API Integration with Persistent Caching
 * 
 * Uses ArXiv API v1 (https://export.arxiv.org/api/query)
 * API Documentation: https://info.arxiv.org/help/api/index.html
 */

import { BaseDirectory, exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string;
  category: string;
  publishedDate: string;
  abstract: string;
  downloadUrl: string;
  pdfUrl: string;
  categories: string[];
}

interface ArxivApiResponse {
  papers: ArxivPaper[];
  totalResults: number;
}

interface CachedArxivData {
  data: ArxivPaper[];
  timestamp: number;
}

const ARXIV_API_BASE = 'https://export.arxiv.org/api/query';
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
 * Parse ArXiv Atom feed XML response
 */
function parseArxivResponse(xmlText: string): ArxivApiResponse {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  
  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Failed to parse ArXiv API response');
  }
  
  const entries = xmlDoc.querySelectorAll('entry');
  const totalResults = parseInt(
    xmlDoc.querySelector('opensearch\\:totalResults, totalResults')?.textContent || '0',
    10
  );
  
  const papers: ArxivPaper[] = Array.from(entries).map(entry => {
    const id = entry.querySelector('id')?.textContent?.split('/abs/')[1]?.split('v')[0] || '';
    const title = entry.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') || '';
    const summary = entry.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') || '';
    const published = entry.querySelector('published')?.textContent || '';
    
    // Get authors
    const authorElements = entry.querySelectorAll('author name');
    const authors = Array.from(authorElements)
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .join(', ');
    
    // Get categories
    const categoryElements = entry.querySelectorAll('category');
    const categories = Array.from(categoryElements)
      .map(el => el.getAttribute('term'))
      .filter(Boolean) as string[];
    
    const primaryCategory = entry.querySelector('arxiv\\:primary_category, primary_category')
      ?.getAttribute('term') || categories[0] || 'Unknown';
    
    // Get PDF URL
    const pdfLink = Array.from(entry.querySelectorAll('link'))
      .find(link => link.getAttribute('title') === 'pdf');
    const pdfUrl = pdfLink?.getAttribute('href') || `https://arxiv.org/pdf/${id}.pdf`;
    
    return {
      id,
      title,
      authors: authors || 'Unknown',
      category: formatCategory(primaryCategory),
      publishedDate: published.split('T')[0],
      abstract: summary,
      downloadUrl: pdfUrl,
      pdfUrl,
      categories
    };
  });
  
  return { papers, totalResults };
}

/**
 * Format category code to human-readable name
 */
function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'cs.AI': 'Artificial Intelligence',
    'cs.CL': 'Computation and Language',
    'cs.CV': 'Computer Vision',
    'cs.LG': 'Machine Learning',
    'cs.NE': 'Neural Networks',
    'stat.ML': 'Machine Learning',
    'math.CO': 'Combinatorics',
    'physics.data-an': 'Data Analysis',
    'quant-ph': 'Quantum Physics',
  };
  
  return categoryMap[category] || category.split('.')[0].toUpperCase();
}

/**
 * Search ArXiv papers
 */
export async function searchArxivPapers(
  query: string,
  options: {
    maxResults?: number;
    sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
    sortOrder?: 'ascending' | 'descending';
  } = {}
): Promise<ArxivPaper[]> {
  const {
    maxResults = DEFAULT_MAX_RESULTS,
    sortBy = 'relevance',
    sortOrder = 'descending'
  } = options;
  
  // Handle empty query - fetch featured papers instead
  if (!query || query.trim() === '') {
    console.log('[ArXiv API] Empty query detected, fetching featured papers instead');
    return getFeaturedPapers(maxResults);
  }
  
  try {
    // ArXiv API requires search_query to NOT be URL-encoded (keep + and : as-is)
    // Only encode the query minimally - replace spaces with + but keep operators intact
    const encodedQuery = query.replace(/ /g, '+');
    
    // Build URL manually to avoid over-encoding the search_query parameter
    const url = `${ARXIV_API_BASE}?search_query=${encodedQuery}&start=0&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    console.log('[ArXiv API] Requesting papers...');
    console.log('[ArXiv API] Query:', query);
    console.log('[ArXiv API] Full URL:', url);
    
    const response = await fetch(url);
    console.log('[ArXiv API] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ArXiv API] Error response:', errorText);
      throw new Error(`ArXiv API error: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    console.log('[ArXiv API] Received XML, length:', xmlText.length);
    
    const result = parseArxivResponse(xmlText);
    
    console.log(`[ArXiv API] Successfully parsed ${result.papers.length} papers`);
    console.log('[ArXiv API] Total results available:', result.totalResults);
    return result.papers;
  } catch (error: any) {
    console.error('[ArXiv API] Search failed with error:', error);
    console.error('[ArXiv API] Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    throw error;
  }
}

/**
 * Get featured/popular papers from specific categories
 */
export async function getFeaturedPapers(maxResults = 12): Promise<ArxivPaper[]> {
  // Query popular AI/ML categories
  const categories = [
    'cat:cs.AI',
    'cat:cs.LG',
    'cat:cs.CL',
    'cat:cs.CV'
  ];
  
  const query = categories.join('+OR+');
  
  return searchArxivPapers(query, {
    maxResults,
    sortBy: 'submittedDate',
    sortOrder: 'descending'
  });
}

/**
 * Search papers by category
 */
export async function searchByCategory(
  category: string,
  maxResults = DEFAULT_MAX_RESULTS
): Promise<ArxivPaper[]> {
  return searchArxivPapers(`cat:${category}`, {
    maxResults,
    sortBy: 'submittedDate',
    sortOrder: 'descending'
  });
}

/**
 * Get paper by ArXiv ID
 */
export async function getPaperById(arxivId: string): Promise<ArxivPaper | null> {
  try {
    const papers = await searchArxivPapers(`id:${arxivId}`, { maxResults: 1 });
    return papers[0] || null;
  } catch (error) {
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
  options: Parameters<typeof searchArxivPapers>[1] = {}
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
 * Get latest papers from selected categories
 */
export async function getPapersByCategories(
  categories: string[],
  maxResults = 20
): Promise<ArxivPaper[]> {
  if (categories.length === 0) {
    return getFeaturedPapers(maxResults);
  }
  
  // Build query for multiple categories
  const query = categories.map(cat => `cat:${cat}`).join('+OR+');
  
  return searchArxivPapers(query, {
    maxResults,
    sortBy: 'submittedDate',
    sortOrder: 'descending'
  });
}

/**
 * Cached version of getPapersByCategories
 */
export async function getPapersByCategoriesCached(
  categories: string[],
  maxResults = 20
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

