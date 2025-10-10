/**
 * Enhanced Chunking with Structure-Aware Parsing
 * Improves upon simple character-based chunking
 */

import nlp from 'compromise';
import type { TextChunk } from './rag';

export interface ChunkMetadata {
  chunkIndex: number;
  startChar: number;
  endChar: number;
  sentenceCount?: number;
  hasTitle?: boolean;
  sectionType?: 'title' | 'abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion' | 'references' | 'body';
}

export interface EnhancedTextChunk extends TextChunk {
  metadata: ChunkMetadata;
}

// Common section headers in academic papers
const SECTION_PATTERNS = {
  abstract: /^(abstract|summary)[\s:]/i,
  introduction: /^(introduction|background)[\s:]/i,
  methods: /^(methods?|methodology|experimental|materials?\s+and\s+methods?)[\s:]/i,
  results: /^(results?|findings?)[\s:]/i,
  discussion: /^(discussion|analysis)[\s:]/i,
  conclusion: /^(conclusion|concluding\s+remarks?|summary)[\s:]/i,
  references: /^(references?|bibliography|citations?)[\s:]/i,
};

/**
 * Detect if a line is likely a section header
 */
function detectSectionType(text: string): ChunkMetadata['sectionType'] | null {
  const trimmed = text.trim();
  
  // Check section patterns
  for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(trimmed)) {
      return type as ChunkMetadata['sectionType'];
    }
  }
  
  // Check if it looks like a title (short, capitalized, no ending punctuation)
  if (trimmed.length > 10 && trimmed.length < 100 && 
      /^[A-Z]/.test(trimmed) && 
      !/[.!?]$/.test(trimmed)) {
    return 'title';
  }
  
  return null;
}

/**
 * Split text into sentences using compromise
 */
function splitIntoSentences(text: string): string[] {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array') as string[];
  return sentences.filter(s => s.trim().length > 0);
}

/**
 * Enhanced semantic chunking
 * Splits at natural boundaries (sentences/paragraphs) instead of fixed characters
 */
export function semanticChunk(
  text: string,
  targetChunkSize = 800,
  _minChunkSize = 400,
  maxChunkSize = 1200
): EnhancedTextChunk[] {
  const chunks: EnhancedTextChunk[] = [];
  
  // Split into paragraphs first
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 0);

  let currentChunk: string[] = [];
  let currentSize = 0;
  let charOffset = 0;

  for (const paragraph of paragraphs) {
    const paragraphLength = paragraph.length;
    
    // If adding this paragraph would exceed max size, save current chunk
    if (currentSize + paragraphLength > maxChunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      const sentences = splitIntoSentences(chunkText);
      const sectionType = detectSectionType(chunkText);
      
      chunks.push({
        id: `chunk_${chunks.length}`,
        text: chunkText,
        metadata: {
          chunkIndex: chunks.length,
          startChar: charOffset - currentSize,
          endChar: charOffset,
          sentenceCount: sentences.length,
          sectionType: sectionType ?? 'body',
          hasTitle: sectionType === 'title',
        },
      });
      
      currentChunk = [];
      currentSize = 0;
    }
    
    // Add paragraph to current chunk
    currentChunk.push(paragraph);
    currentSize += paragraphLength + 1; // +1 for space
    charOffset += paragraphLength + 1;
    
    // If current chunk is large enough, save it
    if (currentSize >= targetChunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      const sentences = splitIntoSentences(chunkText);
      const sectionType = detectSectionType(chunkText);
      
      chunks.push({
        id: `chunk_${chunks.length}`,
        text: chunkText,
        metadata: {
          chunkIndex: chunks.length,
          startChar: charOffset - currentSize,
          endChar: charOffset,
          sentenceCount: sentences.length,
          sectionType: sectionType ?? 'body',
          hasTitle: sectionType === 'title',
        },
      });
      
      currentChunk = [];
      currentSize = 0;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ');
    const sentences = splitIntoSentences(chunkText);
    const sectionType = detectSectionType(chunkText);
    
    chunks.push({
      id: `chunk_${chunks.length}`,
      text: chunkText,
      metadata: {
        chunkIndex: chunks.length,
        startChar: charOffset - currentSize,
        endChar: charOffset,
        sentenceCount: sentences.length,
        sectionType: sectionType ?? 'body',
        hasTitle: sectionType === 'title',
      },
    });
  }
  
  return chunks;
}

/**
 * Sliding window chunking with overlap
 * Maintains context across chunk boundaries
 */
export function slidingWindowChunk(
  text: string,
  windowSize = 1000,
  overlap = 200
): EnhancedTextChunk[] {
  const chunks: EnhancedTextChunk[] = [];
  const sentences = splitIntoSentences(text);
  
  let currentChunk: string[] = [];
  let currentSize = 0;
  let chunkIndex = 0;
  let startChar = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceLength = sentence.length;
    
    // Add sentence to current chunk
    currentChunk.push(sentence);
    currentSize += sentenceLength + 1; // +1 for space
    
    // If chunk is large enough, save it
    if (currentSize >= windowSize) {
      const chunkText = currentChunk.join(' ');
      const sectionType = detectSectionType(chunkText);
      
      chunks.push({
        id: `chunk_${chunkIndex}`,
        text: chunkText,
        metadata: {
          chunkIndex,
          startChar,
          endChar: startChar + currentSize,
          sentenceCount: currentChunk.length,
          sectionType: sectionType ?? 'body',
        },
      });
      
      // Create overlap by keeping last few sentences
      let overlapSize = 0;
      let overlapSentences = 0;
      for (let j = currentChunk.length - 1; j >= 0 && overlapSize < overlap; j--) {
        overlapSize += currentChunk[j].length + 1;
        overlapSentences++;
      }
      
      // Keep overlap sentences for next chunk
      currentChunk = currentChunk.slice(-overlapSentences);
      startChar = startChar + currentSize - overlapSize;
      currentSize = overlapSize;
      chunkIndex++;
    }
  }
  
  // Add final chunk if it has content
  if (currentChunk.length > 0 && currentSize > 100) {
    const chunkText = currentChunk.join(' ');
    const sectionType = detectSectionType(chunkText);
    
    chunks.push({
      id: `chunk_${chunkIndex}`,
      text: chunkText,
      metadata: {
        chunkIndex,
        startChar,
        endChar: startChar + currentSize,
        sentenceCount: currentChunk.length,
        sectionType: sectionType ?? 'body',
      },
    });
  }
  
  return chunks;
}

/**
 * Hierarchical chunking
 * Creates parent chunks (sections) and child chunks (paragraphs)
 */
export interface HierarchicalChunk extends EnhancedTextChunk {
  parent?: string; // Parent chunk ID
  children?: string[]; // Child chunk IDs
  level: number; // 0 = parent, 1 = child
}

export function hierarchicalChunk(
  text: string,
  parentSize = 2000,
  childSize = 600
): HierarchicalChunk[] {
  const chunks: HierarchicalChunk[] = [];
  
  // First, create parent chunks (large sections)
  const parentChunks = semanticChunk(text, parentSize, parentSize * 0.5, parentSize * 1.5);
  
  // Then, split each parent into children
  for (const parent of parentChunks) {
    const parentId = `parent_${chunks.length}`;
    const childChunks = semanticChunk(parent.text, childSize, childSize * 0.5, childSize * 1.5);
    const childIds: string[] = [];
    
    // Add parent
    chunks.push({
      ...parent,
      id: parentId,
      level: 0,
      children: childIds,
    });
    
    // Add children
    for (const child of childChunks) {
      const childId = `${parentId}_child_${childIds.length}`;
      childIds.push(childId);
      
      chunks.push({
        ...child,
        id: childId,
        level: 1,
        parent: parentId,
      });
    }
  }
  
  return chunks;
}

/**
 * Smart chunking strategy selector
 * Chooses the best chunking strategy based on document characteristics
 */
export function smartChunk(
  text: string,
  strategy: 'semantic' | 'sliding' | 'hierarchical' = 'semantic',
  options?: {
    targetSize?: number;
    overlap?: number;
  }
): EnhancedTextChunk[] | HierarchicalChunk[] {
  const { targetSize = 800, overlap = 200 } = options ?? {};
  
  switch (strategy) {
    case 'semantic':
      return semanticChunk(text, targetSize);
    case 'sliding':
      return slidingWindowChunk(text, targetSize, overlap);
    case 'hierarchical':
      return hierarchicalChunk(text, targetSize * 2, targetSize);
    default:
      return semanticChunk(text, targetSize);
  }
}

