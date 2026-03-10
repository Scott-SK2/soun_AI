/**
 * Notifications System
 * 
 * This module provides notification functionality for the application:
 * 1. Schedule notifications for upcoming study sessions
 * 2. Handle notification permissions
 * 3. Format and display notifications
 */

import { useToast } from "@/hooks/use-toast";

// Notification types 
export type NotificationType = 
  | 'session_reminder'  // Reminder for upcoming study sessions
  | 'assignment_due'    // Reminder for assignments due soon
  | 'achievement'       // Achievement unlocked
  | 'suggestion'        // Study suggestion
  | 'system';           // System notification

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;  // Optional URL to navigate to on click
  relatedId?: string;  // ID of related entity (session, assignment, etc.)
  priority?: 'low' | 'medium' | 'high';
}

// Check if the browser supports notifications
export function checkNotificationSupport(): boolean {
  return 'Notification' in window;
}

// Request notification permissions
export async function requestNotificationPermission(): Promise<boolean> {
  if (!checkNotificationSupport()) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show a browser notification
export function showBrowserNotification(
  title: string, 
  options?: NotificationOptions
): globalThis.Notification | null {
  if (!checkNotificationSupport() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    return new globalThis.Notification(title, options);
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

// Schedule a study session reminder
export function scheduleSessionReminder(
  sessionTitle: string,
  sessionTime: Date,
  minutesBefore: number = 15
): number {
  const reminderTime = new Date(sessionTime.getTime() - minutesBefore * 60 * 1000);
  const now = new Date();
  
  // Calculate milliseconds until reminder should be shown
  const timeUntilReminder = reminderTime.getTime() - now.getTime();
  
  // Don't schedule if it's in the past
  if (timeUntilReminder <= 0) {
    return -1;
  }
  
  // Schedule the notification
  const timerId = window.setTimeout(() => {
    showBrowserNotification(`Study Session Reminder: ${sessionTitle}`, {
      body: `Your study session "${sessionTitle}" starts in ${minutesBefore} minutes`,
      icon: '/favicon.ico',
    });
  }, timeUntilReminder);
  
  return timerId;
}

// Format notification for display in UI
export function formatNotification(notification: { title: string, timestamp: Date }): string {
  const timeAgo = getTimeAgo(notification.timestamp);
  return `${notification.title} (${timeAgo})`;
}

// Helper to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) {
    return `${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  }
  if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  }
  return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
}

// Get icon for notification type
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'session_reminder':
      return 'calendar';
    case 'assignment_due':
      return 'file-text';
    case 'achievement':
      return 'award';
    case 'suggestion':
      return 'lightbulb';
    case 'system':
      return 'bell';
    default:
      return 'bell';
  }
}

// React hook for managing notifications
export function useNotifications() {
  const { toast } = useToast();
  
  // Check browser notification support
  const isNotificationSupported = typeof window !== 'undefined' && checkNotificationSupport();
  
  const showNotification = (
    title: string, 
    message: string, 
    type: NotificationType = 'system'
  ) => {
    // Show toast notification
    toast({
      title,
      description: message,
    });
    
    // Also show browser notification if supported and permission granted
    if (isNotificationSupported && Notification.permission === 'granted') {
      showBrowserNotification(title, {
        body: message,
        icon: '/favicon.ico',
      });
    }
  };
  
  return {
    showNotification,
    requestPermission: requestNotificationPermission,
    hasSupport: isNotificationSupported,
  };
}

// Hook to manage study session notifications
export function useStudySessionNotifications() {
  const { toast } = useToast();
  
  // Scheduled reminder IDs for cleanup
  const scheduledReminders: number[] = [];
  
  // Schedule study session reminder
  const scheduleReminder = (
    sessionTitle: string,
    sessionTime: Date,
    minutesBefore: number = 15
  ) => {
    const reminderId = scheduleSessionReminder(sessionTitle, sessionTime, minutesBefore);
    if (reminderId > 0) {
      scheduledReminders.push(reminderId);
    }
  };
  
  // Notify achievement
  const notifyAchievement = (achievementTitle: string, achievementDesc: string) => {
    toast({
      title: `Achievement Unlocked: ${achievementTitle}`,
      description: achievementDesc,
    });
  };
  
  // Notify assignment due
  const notifyAssignmentDue = (assignmentTitle: string, dueDate: Date) => {
    const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const dueMessage = daysUntilDue === 0 
      ? 'due today!' 
      : daysUntilDue === 1 
      ? 'due tomorrow!' 
      : `due in ${daysUntilDue} days`;
    
    toast({
      title: 'Assignment Reminder',
      description: `${assignmentTitle} is ${dueMessage}`,
    });
  };
  
  // Notify study suggestion
  const notifyStudySuggestion = (suggestionTitle: string, subject: string) => {
    toast({
      title: 'Study Suggestion',
      description: `We recommend studying ${suggestionTitle} for ${subject}`,
    });
  };
  
  // Cleanup function to clear all scheduled notifications
  const clearScheduledNotifications = () => {
    scheduledReminders.forEach(id => {
      window.clearTimeout(id);
    });
  };
  
  return {
    scheduleReminder,
    notifyAchievement,
    notifyAssignmentDue,
    notifyStudySuggestion,
    clearScheduledNotifications,
  };
}