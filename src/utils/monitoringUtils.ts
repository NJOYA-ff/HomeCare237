/**
 * monitoringUtils.ts
 *
 * Monitoring and observability utilities for HomeCare237
 * Includes performance tracking, user analytics, and system health monitoring
 */

/**
 * Performance metrics tracking
 */
export class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();
  private maxSamples = 100;

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only the most recent samples
    if (values.length > this.maxSamples) {
      values.shift();
    }
  }

  getMetricStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length };
  }

  getAllMetrics(): any {
    const result: any = {};
    
    this.metrics.forEach((values, name) => {
      result[name] = this.getMetricStats(name);
    });

    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * User behavior tracking
 */
export class UserBehaviorTracker {
  private events: Array<{
    type: string;
    timestamp: number;
    data?: any;
  }> = [];
  private maxEvents = 1000;

  trackEvent(type: string, data?: any): void {
    this.events.push({
      type,
      timestamp: Date.now(),
      data,
    });

    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  trackPageView(page: string): void {
    this.trackEvent("page_view", { page });
  }

  trackButtonClick(buttonName: string, location: string): void {
    this.trackEvent("button_click", { buttonName, location });
  }

  trackFormSubmit(formName: string, success: boolean): void {
    this.trackEvent("form_submit", { formName, success });
  }

  trackError(error: string, context?: any): void {
    this.trackEvent("error", { error, context });
  }

  getEvents(type?: string, limit: number = 100): any[] {
    let filtered = this.events;
    
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    return filtered.slice(-limit);
  }

  clearEvents(): void {
    this.events = [];
  }
}

/**
 * System health monitoring
 */
export class SystemHealthMonitor {
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private healthStatus: Map<string, { status: "healthy" | "degraded" | "unhealthy"; lastCheck: number }> = new Map();

  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
  }

  async runHealthCheck(name: string): Promise<boolean> {
    const check = this.healthChecks.get(name);
    if (!check) return false;

    try {
      const isHealthy = await check();
      this.healthStatus.set(name, {
        status: isHealthy ? "healthy" : "unhealthy",
        lastCheck: Date.now(),
      });
      return isHealthy;
    } catch (error) {
      this.healthStatus.set(name, {
        status: "unhealthy",
        lastCheck: Date.now(),
      });
      return false;
    }
  }

  async runAllHealthChecks(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const name of this.healthChecks.keys()) {
      results[name] = await this.runHealthCheck(name);
    }

    return results;
  }

  getHealthStatus(): any {
    const result: any = {};
    
    this.healthStatus.forEach((status, name) => {
      result[name] = status;
    });

    return result;
  }

  getOverallHealth(): "healthy" | "degraded" | "unhealthy" {
    const statuses = Array.from(this.healthStatus.values());
    
    if (statuses.some(s => s.status === "unhealthy")) {
      return "unhealthy";
    }
    
    if (statuses.some(s => s.status === "degraded")) {
      return "degraded";
    }
    
    return "healthy";
  }
}

/**
 * API performance monitoring
 */
export class APIPerformanceMonitor {
  private requests: Array<{
    url: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
  }> = [];
  private maxRequests = 500;

  recordRequest(url: string, method: string, duration: number, status: number): void {
    this.requests.push({
      url,
      method,
      duration,
      status,
      timestamp: Date.now(),
    });

    if (this.requests.length > this.maxRequests) {
      this.requests.shift();
    }
  }

  getAPIStats(): {
    totalRequests: number;
    avgDuration: number;
    successRate: number;
    errorRate: number;
    slowRequests: number;
  } {
    if (this.requests.length === 0) {
      return {
        totalRequests: 0,
        avgDuration: 0,
        successRate: 0,
        errorRate: 0,
        slowRequests: 0,
      };
    }

    const totalRequests = this.requests.length;
    const avgDuration = this.requests.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    const successCount = this.requests.filter(r => r.status >= 200 && r.status < 300).length;
    const slowRequests = this.requests.filter(r => r.duration > 3000).length;

    return {
      totalRequests,
      avgDuration,
      successRate: (successCount / totalRequests) * 100,
      errorRate: ((totalRequests - successCount) / totalRequests) * 100,
      slowRequests,
    };
  }

  getSlowRequests(threshold: number = 3000): any[] {
    return this.requests.filter(r => r.duration > threshold);
  }

  clearRequests(): void {
    this.requests = [];
  }
}

/**
 * Real-time user session monitoring
 */
export class SessionMonitor {
  private startTime: number;
  private interactions: number = 0;
  private pageViews: number = 0;
  private errors: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  recordInteraction(): void {
    this.interactions++;
  }

  recordPageView(): void {
    this.pageViews++;
  }

  recordError(): void {
    this.errors++;
  }

  getSessionDuration(): number {
    return Date.now() - this.startTime;
  }

  getSessionStats(): {
    duration: number;
    interactions: number;
    pageViews: number;
    errors: number;
    errorRate: number;
  } {
    const duration = this.getSessionDuration();
    const totalEvents = this.interactions + this.pageViews + this.errors;
    const errorRate = totalEvents > 0 ? (this.errors / totalEvents) * 100 : 0;

    return {
      duration,
      interactions: this.interactions,
      pageViews: this.pageViews,
      errors: this.errors,
      errorRate,
    };
  }
}

/**
 * Create monitoring instances
 */
export const monitoring = {
  performanceMetrics: new PerformanceMetrics(),
  userBehavior: new UserBehaviorTracker(),
  systemHealth: new SystemHealthMonitor(),
  apiPerformance: new APIPerformanceMonitor(),
  sessionMonitor: new SessionMonitor(),
};

/**
 * Initialize default health checks
 */
export const initializeHealthChecks = (): void => {
  // Firebase connectivity check
  monitoring.systemHealth.registerHealthCheck("firebase", async () => {
    try {
      // In production, implement actual Firebase connectivity check
      return true;
    } catch {
      return false;
    }
  });

  // API server connectivity check
  monitoring.systemHealth.registerHealthCheck("api_server", async () => {
    try {
      const response = await fetch("/api/health", { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  });

  // Browser performance check
  monitoring.systemHealth.registerHealthCheck("browser_performance", async () => {
    const performance = (window as any).performance;
    if (!performance) return false;

    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    
    // Consider page slow if load time > 5 seconds
    return loadTime < 5000;
  });
};

/**
 * Performance measurement wrapper for async functions
 */
export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    monitoring.performanceMetrics.recordMetric(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    monitoring.performanceMetrics.recordMetric(`${name}_error`, duration);
    throw error;
  }
};

/**
 * Initialize monitoring on app startup
 */
export const initializeMonitoring = (): void => {
  initializeHealthChecks();

  // Track initial page load
  window.addEventListener("load", () => {
    if ((window as any).performance) {
      const timing = (window as any).performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      monitoring.performanceMetrics.recordMetric("page_load_time", loadTime);
    }
  });

  // Track visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      monitoring.userBehavior.trackEvent("app_hidden");
    } else {
      monitoring.userBehavior.trackEvent("app_visible");
    }
  });

  // Track errors globally
  window.addEventListener("error", (event) => {
    monitoring.userBehavior.trackError(event.message, {
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  // Run periodic health checks
  setInterval(async () => {
    await monitoring.systemHealth.runAllHealthChecks();
  }, 60000); // Every minute
};