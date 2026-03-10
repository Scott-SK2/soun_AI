
class OfflineSyncService {
  private pendingActions: Array<{
    type: string;
    data: any;
    timestamp: Date;
  }> = [];

  constructor() {
    // Listen for online events
    window.addEventListener('online', this.syncPendingActions.bind(this));
    
    // Load pending actions from localStorage
    this.loadPendingActions();
  }

  addPendingAction(type: string, data: any) {
    const action = {
      type,
      data,
      timestamp: new Date()
    };
    
    this.pendingActions.push(action);
    this.savePendingActions();
  }

  private async syncPendingActions() {
    if (!navigator.onLine || this.pendingActions.length === 0) return;

    const actionsToSync = [...this.pendingActions];
    this.pendingActions = [];
    this.savePendingActions();

    for (const action of actionsToSync) {
      try {
        await this.syncAction(action);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Re-add failed action for retry
        this.pendingActions.push(action);
      }
    }

    this.savePendingActions();
  }

  private async syncAction(action: any) {
    switch (action.type) {
      case 'VOICE_COMMAND':
        await fetch('/api/voice/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      case 'STUDY_SESSION':
        await fetch('/api/study-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      // Add more sync cases as needed
    }
  }

  private savePendingActions() {
    localStorage.setItem('pendingActions', JSON.stringify(this.pendingActions));
  }

  private loadPendingActions() {
    try {
      const stored = localStorage.getItem('pendingActions');
      if (stored) {
        this.pendingActions = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load pending actions:', error);
    }
  }

  getPendingActionsCount(): number {
    return this.pendingActions.length;
  }
}

export const offlineSyncService = new OfflineSyncService();
