
// Performance optimization utilities
class PerformanceOptimizer {
  private initialized = false;
  private services: Map<string, any> = new Map();

  async initializeService<T>(
    name: string,
    factory: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Delay low priority services
    if (priority === 'low') {
      await this.delay(500);
    } else if (priority === 'medium') {
      await this.delay(200);
    }

    try {
      const service = await factory();
      this.services.set(name, service);
      return service;
    } catch (error) {
      console.warn(`Failed to initialize ${name}:`, error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async initializeCriticalServices() {
    if (this.initialized) return;

    // Initialize only essential services first
    const criticalServices = [
      'auth',
      'router',
      'queryClient'
    ];

    console.log('Initializing critical services...');
    this.initialized = true;
  }

  // Pre-load services when user is likely to need them
  preloadService(name: string, factory: () => Promise<any>) {
    requestIdleCallback(async () => {
      try {
        await this.initializeService(name, factory, 'low');
      } catch (error) {
        console.warn(`Preload failed for ${name}:`, error);
      }
    });
  }
}

export const performanceOptimizer = new PerformanceOptimizer();
