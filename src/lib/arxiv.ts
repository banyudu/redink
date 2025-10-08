/**
 * ArXiv API Integration with Caching
 * 
 * Uses ArXiv API v1 (https://export.arxiv.org/api/query)
 * API Documentation: https://info.arxiv.org/help/api/index.html
 */

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

const ARXIV_API_BASE = 'https://export.arxiv.org/api/query';
const DEFAULT_MAX_RESULTS = 20;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

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
  
  try {
    const params = new URLSearchParams({
      search_query: query,
      start: '0',
      max_results: maxResults.toString(),
      sortBy,
      sortOrder
    });
    
    const url = `${ARXIV_API_BASE}?${params.toString()}`;
    console.log('[ArXiv API] Fetching:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const result = parseArxivResponse(xmlText);
    
    console.log(`[ArXiv API] Found ${result.papers.length} papers`);
    return result.papers;
  } catch (error) {
    console.error('[ArXiv API] Search failed:', error);
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
 * Cache manager for ArXiv search results
 */
class ArxivCacheManager {
  private cache = new Map<string, { data: ArxivPaper[]; timestamp: number }>();
  
  getCacheKey(query: string, options: any = {}): string {
    return `${query}_${JSON.stringify(options)}`;
  }
  
  get(query: string, options: any = {}): ArxivPaper[] | null {
    const key = this.getCacheKey(query, options);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('[ArXiv Cache] Hit:', key);
    return cached.data;
  }
  
  set(query: string, data: ArxivPaper[], options: any = {}): void {
    const key = this.getCacheKey(query, options);
    this.cache.set(key, { data, timestamp: Date.now() });
    console.log('[ArXiv Cache] Stored:', key);
    
    // Clean old entries if cache gets too large
    if (this.cache.size > 50) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 10 entries
      for (let i = 0; i < 10; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
    console.log('[ArXiv Cache] Cleared');
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
  // Check cache first
  const cached = arxivCache.get(query, options);
  if (cached) {
    return cached;
  }
  
  // Fetch from API
  const papers = await searchArxivPapers(query, options);
  
  // Store in cache
  arxivCache.set(query, papers, options);
  
  return papers;
}

/**
 * Cached featured papers function
 */
export async function getFeaturedPapersCached(maxResults = 12): Promise<ArxivPaper[]> {
  const cacheKey = `featured_${maxResults}`;
  const cached = arxivCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const papers = await getFeaturedPapers(maxResults);
  arxivCache.set(cacheKey, papers);
  
  return papers;
}

