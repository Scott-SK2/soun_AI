
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number;
}

interface CacheOptions {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private options: CacheOptions;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      maxSize: 1000,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      ...options
    };

    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }

    // If still over capacity, remove least recently used
    if (this.cache.size > this.options.maxSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
        .slice(0, this.cache.size - this.options.maxSize);

      for (const [key] of sortedEntries) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
  }

  private generateKey(query: string, context?: any): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `${query}:${contextStr}`;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      ttl: ttl || this.options.defaultTTL
    };

    this.cache.set(key, entry);

    // Trigger cleanup if over capacity
    if (this.cache.size > this.options.maxSize) {
      this.cleanup();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    return entry.data as T;
  }

  // Voice assistant specific caching methods
  cacheVoiceResponse(query: string, response: string, courseContext?: string): void {
    const key = this.generateKey(query, { courseContext });
    this.set(key, response, 15 * 60 * 1000); // 15 minutes for voice responses
  }

  getCachedVoiceResponse(query: string, courseContext?: string): string | null {
    const key = this.generateKey(query, { courseContext });
    return this.get<string>(key);
  }

  cacheDocumentAnalysis(documentId: string, analysis: any): void {
    const key = `doc_analysis:${documentId}`;
    this.set(key, analysis, 60 * 60 * 1000); // 1 hour for document analysis
  }

  getCachedDocumentAnalysis(documentId: string): any | null {
    const key = `doc_analysis:${documentId}`;
    return this.get(key);
  }

  cacheStudyGuide(courseId: string, topic: string, guide: any): void {
    const key = `study_guide:${courseId}:${topic}`;
    this.set(key, guide, 24 * 60 * 60 * 1000); // 24 hours for study guides
  }

  getCachedStudyGuide(courseId: string, topic: string): any | null {
    const key = `study_guide:${courseId}:${topic}`;
    return this.get(key);
  }

  // Semantic similarity caching for similar questions
  cacheSemanticResponse(keywords: string[], response: string, courseContext?: string): void {
    const sortedKeywords = keywords.sort().join('|');
    const key = this.generateKey(`semantic:${sortedKeywords}`, { courseContext });
    this.set(key, response, 20 * 60 * 1000); // 20 minutes
  }

  findSemanticMatch(keywords: string[], courseContext?: string): string | null {
    const sortedKeywords = keywords.sort();
    
    // Look for exact keyword matches first
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (!cacheKey.startsWith('semantic:')) continue;
      
      const cachedKeywords = cacheKey.split(':')[1].split('|');
      const similarity = this.calculateSimilarity(sortedKeywords, cachedKeywords);
      
      if (similarity > 0.8) { // 80% similarity threshold
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.stats.hits++;
        return entry.data;
      }
    }
    
    this.stats.misses++;
    return null;
  }

  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // Cache management
  invalidate(pattern: string): number {
    let removed = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }

  invalidateCourse(courseId: string): number {
    return this.invalidate(`.*:.*"courseContext":"${courseId}".*`);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats(): typeof this.stats & { size: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  // Preload common responses
  async preloadCommonResponses(): Promise<void> {
    const commonQueries = [
      { query: "what is this about", context: null },
      { query: "explain this topic", context: null },
      { query: "help me study", context: null },
      { query: "start study session", context: null },
      { query: "create flashcards", context: null }
    ];

    // These would typically be loaded from the server
    for (const { query, context } of commonQueries) {
      const key = this.generateKey(query, context);
      if (!this.cache.has(key)) {
        // Placeholder - in real implementation, this would fetch from server
        this.set(key, `Cached response for: ${query}`, 60 * 60 * 1000);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

export const responseCache = new ResponseCache({
  maxSize: 2000,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000 // 5 minutes
});
