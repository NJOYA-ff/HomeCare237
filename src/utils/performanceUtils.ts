/**
 * performanceUtils.ts
 *
 * Performance optimization utilities for HomeCare237
 * Includes caching, debouncing, throttling, and memoization
 */

/**
 * Debounce function to limit execution rate
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: any = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Simple memoization cache
 */
export class MemoCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number = 5 * 60 * 1000) { // 5 minutes default TTL
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

/**
 * Local storage cache with expiration
 */
export class LocalStorageCache {
  private prefix: string;

  constructor(prefix: string = "hc_cache_") {
    this.prefix = prefix;
  }

  set(key: string, value: any, ttl: number = 5 * 60 * 1000): void {
    try {
      const item = {
        value,
        expiresAt: Date.now() + ttl,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn("LocalStorage set failed:", error);
    }
  }

  get(key: string): any | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      
      return parsed.value;
    } catch (error) {
      console.warn("LocalStorage get failed:", error);
      return null;
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn("LocalStorage remove failed:", error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("LocalStorage clear failed:", error);
    }
  }
}

/**
 * Image lazy loading with intersection observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private imageMap = new Map<HTMLImageElement, string>();

  constructor() {
    if (typeof IntersectionObserver !== "undefined") {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = this.imageMap.get(img);
              if (src) {
                img.src = src;
                img.removeAttribute("data-src");
                this.observer?.unobserve(img);
                this.imageMap.delete(img);
              }
            }
          });
        },
        {
          rootMargin: "50px 0px",
          threshold: 0.01,
        }
      );
    }
  }

  observe(img: HTMLImageElement, src: string): void {
    if (this.observer) {
      this.imageMap.set(img, src);
      img.setAttribute("data-src", src);
      this.observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      img.src = src;
    }
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.imageMap.clear();
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      console.warn(`Mark ${startMark} not found`);
      return 0;
    }
    
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  logMemoryUsage(): void {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      console.log(`[Memory] Used: ${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB, Total: ${(memory.totalJSHeapSize / 1048576).toFixed(2)}MB`);
    }
  }
}

/**
 * Request batching for API calls
 */
export class RequestBatcher<T> {
  private queue: Array<{ data: T; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private batchTimer: any = null;
  private batchDelay: number;
  private batchProcessor: (batch: T[]) => Promise<any[]>;

  constructor(batchDelay: number, batchProcessor: (batch: T[]) => Promise<any[]>) {
    this.batchDelay = batchDelay;
    this.batchProcessor = batchProcessor;
  }

  async add(data: T): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });
      
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.batchDelay);
      }
    });
  }

  private async processBatch(): Promise<void> {
    this.batchTimer = null;
    
    if (this.queue.length === 0) return;
    
    const batch = this.queue;
    this.queue = [];
    
    try {
      const results = await this.batchProcessor(batch.map(item => item.data));
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }
}

/**
 * Create a singleton instance of common utilities
 */
export const performanceUtils = {
  debounce,
  throttle,
  memoCache: new MemoCache(),
  localStorageCache: new LocalStorageCache(),
  lazyImageLoader: new LazyImageLoader(),
  performanceMonitor: new PerformanceMonitor(),
};