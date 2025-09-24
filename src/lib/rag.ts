export type TextChunk = {
  id: string;
  text: string;
};

export type RagIndex = {
  chunks: TextChunk[];
  vocabulary: Map<string, number>; // term -> document frequency
  chunkTermFreqs: Map<string, Map<string, number>>; // chunkId -> term -> tf
  numChunks: number;
};

const DEFAULT_STOPWORDS = new Set([
  'the','is','at','of','on','and','a','to','in','for','that','this','with','as','an','by','be','are','or','it','from','we','can','also','not','our','have','has','which','their','these','those','into','using','used','use','such','than','other','more','most','less','least','between','over','under','above','below','however','therefore','thus','while','where','when','who','whom','whose','what','why','how'
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !DEFAULT_STOPWORDS.has(t));
}

export function chunkText(
  text: string,
  chunkSize = 1200,
  overlap = 200
): TextChunk[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  const step = Math.max(1, chunkSize - overlap);
  let idCounter = 0;

  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + chunkSize);
    const slice = normalized.slice(start, end);
    chunks.push({ id: `c_${idCounter += 1}`, text: slice });
    start += step;
  }
  return chunks;
}

export function buildIndex(chunks: TextChunk[]): RagIndex {
  const vocabulary = new Map<string, number>();
  const chunkTermFreqs = new Map<string, Map<string, number>>();

  for (const chunk of chunks) {
    const tokens = tokenize(chunk.text);
    const tf = new Map<string, number>();
    const seenTerms = new Set<string>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
      if (!seenTerms.has(token)) {
        vocabulary.set(token, (vocabulary.get(token) ?? 0) + 1);
        seenTerms.add(token);
      }
    }
    chunkTermFreqs.set(chunk.id, tf);
  }

  return {
    chunks,
    vocabulary,
    chunkTermFreqs,
    numChunks: chunks.length,
  };
}

function computeIdf(index: RagIndex, term: string): number {
  const df = index.vocabulary.get(term) ?? 0;
  // Add-one smoothing to avoid div by zero
  return Math.log((1 + index.numChunks) / (1 + df)) + 1; // common tf-idf idf variant
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (const [, val] of a) aNorm += val * val;
  for (const [, val] of b) bNorm += val * val;
  const [shorter, longer] = a.size <= b.size ? [a, b] : [b, a];
  for (const [k, av] of shorter) {
    const bv = longer.get(k);
    if (bv) dot += av * bv;
  }
  if (aNorm === 0 || bNorm === 0) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

export function retrieve(index: RagIndex, question: string, topK = 3): Array<{ chunk: TextChunk; score: number }> {
  const qTokens = tokenize(question);
  const qTf = new Map<string, number>();
  for (const t of qTokens) qTf.set(t, (qTf.get(t) ?? 0) + 1);

  // tf-idf weight for query
  const qVec = new Map<string, number>();
  for (const [t, tf] of qTf) {
    const idf = computeIdf(index, t);
    qVec.set(t, tf * idf);
  }

  const scored: Array<{ chunk: TextChunk; score: number }> = [];
  for (const chunk of index.chunks) {
    const tf = index.chunkTermFreqs.get(chunk.id) ?? new Map();
    const vec = new Map<string, number>();
    for (const [t, f] of tf) {
      const idf = computeIdf(index, t);
      vec.set(t, f * idf);
    }
    const score = cosineSimilarity(qVec, vec);
    if (score > 0) scored.push({ chunk, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}


