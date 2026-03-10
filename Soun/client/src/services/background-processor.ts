interface Task {
  id: string;
  type: string;
  data: any;
  priority: number;
  timestamp: number;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

interface ProcessingWorkerMessage {
  type: 'PROCESS_AUDIO' | 'PROCESS_TEXT' | 'CACHE_RESPONSE' | 'RESULT' | 'ERROR';
  taskId: string;
  data?: any;
  result?: any;
  error?: any;
}

class BackgroundProcessor {
  private worker: Worker | null = null;
  private taskQueue: Task[] = [];
  private activeTasks = new Map<string, Task>();
  private isProcessing = false;
  private maxConcurrentTasks = 3;
  private currentTasks = 0;
  private offlineStorage = new Map<string, any>(); // Map for in-memory cache

  async initialize(): Promise<void> {
    try {
      // Create a web worker for background processing
      const workerBlob = new Blob([this.getWorkerScript()], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (event: MessageEvent<ProcessingWorkerMessage>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('Background worker error:', error);
      };

      // Start processing queue
      this.startProcessing();

      console.log('Background processor initialized');
    } catch (error) {
      console.error('Failed to initialize background processor:', error);
      throw error;
    }
  }

  private getWorkerScript(): string {
    return `
      // Web Worker script for background processing
      class AudioProcessor {
        static async processAudio(audioData) {
          const processed = new Float32Array(audioData.length);

          // Simple noise gate
          const threshold = 0.01;
          for (let i = 0; i < audioData.length; i++) {
            processed[i] = Math.abs(audioData[i]) > threshold ? audioData[i] : 0;
          }

          // Normalize audio
          const max = Math.max(...processed.map(Math.abs));
          if (max > 0) {
            const scale = 0.95 / max;
            for (let i = 0; i < processed.length; i++) {
              processed[i] *= scale;
            }
          }

          return processed;
        }
      }

      class TextProcessor {
        static processText(text) {
          // Clean and normalize text
          return text
            .trim()
            .replace(/\\s+/g, ' ')
            .replace(/[^\\w\\s.,!?-]/g, '')
            .toLowerCase();
        }

        static extractKeywords(text) {
          const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
          return text
            .split(/\\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10);
        }
      }

      self.onmessage = function(event) {
        const { type, taskId, data } = event.data;

        try {
          let result;

          switch (type) {
            case 'PROCESS_AUDIO':
              result = AudioProcessor.processAudio(data.audioData);
              break;

            case 'PROCESS_TEXT':
              result = {
                cleaned: TextProcessor.processText(data.text),
                keywords: TextProcessor.extractKeywords(data.text)
              };
              break;

            case 'CACHE_RESPONSE':
              // Simulate response caching logic
              result = { cached: true, key: data.key };
              break;

            default:
              throw new Error('Unknown task type: ' + type);
          }

          self.postMessage({
            type: 'RESULT',
            taskId,
            result
          });

        } catch (error) {
          self.postMessage({
            type: 'ERROR',
            taskId,
            error: error.message
          });
        }
      };
    `;
  }

  private handleWorkerMessage(message: ProcessingWorkerMessage): void {
    const task = this.activeTasks.get(message.taskId);
    if (!task) {
      console.warn('Received message for unknown task:', message.taskId);
      return;
    }

    // Clean up task reference
    this.activeTasks.delete(message.taskId);
    this.currentTasks = Math.max(0, this.currentTasks - 1);

    try {
      if (message.type === 'RESULT') {
        task.resolve(message.result);
      } else if (message.type === 'ERROR') {
        task.reject(new Error(message.error || 'Unknown worker error'));
      }
    } catch (error) {
      console.error('Error handling worker message:', error);
      task.reject(error);
    }

    // Process next task if available
    this.processNextTask();
  }

  async addTask(type: string, data: any, priority: number = 1): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: Task = {
        id: `task_${Date.now()}_${Math.random()}`,
        type,
        data,
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      // Insert task based on priority
      const insertIndex = this.taskQueue.findIndex(t => t.priority < priority);
      if (insertIndex === -1) {
        this.taskQueue.push(task);
      } else {
        this.taskQueue.splice(insertIndex, 0, task);
      }

      this.processNextTask();
    });
  }

  private startProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processNextTask();
  }

  private processNextTask(): void {
    if (this.currentTasks >= this.maxConcurrentTasks || this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task || !this.worker) return;

    this.activeTasks.set(task.id, task);
    this.currentTasks++;

    // Send task to worker
    this.worker.postMessage({
      type: task.type as any,
      taskId: task.id,
      data: task.data
    });
  }

  // Convenience methods for common tasks
  async processAudio(audioData: Float32Array): Promise<Float32Array> {
    return this.addTask('PROCESS_AUDIO', { audioData }, 3);
  }

  async processText(text: string): Promise<{ cleaned: string; keywords: string[] }> {
    return this.addTask('PROCESS_TEXT', { text }, 2);
  }

  async cacheResponse(key: string, data: any): Promise<any> {
    return this.addTask('CACHE_RESPONSE', { key, data }, 1);
  }

  getQueueStatus(): { pending: number; active: number } {
    return {
      pending: this.taskQueue.length,
      active: this.currentTasks
    };
  }

  async clearCache(): Promise<void> {
    this.taskQueue = [];
    this.activeTasks.clear();
  }

  // Store important data for offline access
  async storeOfflineData(key: string, data: any): Promise<void> {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify(data));
      this.offlineStorage.set(key, data);
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  }

  async getOfflineData(key: string): Promise<any> {
    try {
      if (this.offlineStorage.has(key)) {
        return this.offlineStorage.get(key);
      }

      const stored = localStorage.getItem(`offline_${key}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.offlineStorage.set(key, data);
        return data;
      }
    } catch (error) {
      console.warn('Failed to retrieve offline data:', error);
    }
    return null;
  }

  destroy(): void {
    this.isProcessing = false;
    this.taskQueue = [];
    this.activeTasks.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const backgroundProcessor = new BackgroundProcessor();