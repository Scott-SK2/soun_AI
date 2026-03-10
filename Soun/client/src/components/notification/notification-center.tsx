import React, { useState, useEffect } from 'react';
import { Bell, Calendar, FileText, Award, Lightbulb, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from '@tanstack/react-query';
import { Notification, NotificationType, formatNotification, getNotificationIcon } from '@/lib/notifications';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface NotificationCenterProps {
  onOpenChange?: (open: boolean) => void;
}

export function NotificationCenter({ onOpenChange }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Query to get notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      try {
        // In a real implementation, this would fetch from the API
        // const response = await fetch('/api/notifications');
        // if (!response.ok) throw new Error('Failed to fetch notifications');
        // return await response.json();
        
        // For now, return mock data
        return [
          {
            id: '1',
            type: 'session_reminder',
            title: 'Study Session Reminder',
            message: 'Your Database Systems session starts in 30 minutes',
            timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            read: false,
            relatedId: 'session-1',
            priority: 'high'
          },
          {
            id: '2',
            type: 'assignment_due',
            title: 'Assignment Due Soon',
            message: 'Your Data Structures assignment is due tomorrow',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            read: false,
            relatedId: 'assignment-1',
            priority: 'medium'
          },
          {
            id: '3',
            type: 'achievement',
            title: 'Achievement Unlocked',
            message: 'Study Streak: You\'ve completed 5 days of studying in a row!',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            read: true,
            priority: 'low'
          },
          {
            id: '4',
            type: 'suggestion',
            title: 'Study Suggestion',
            message: 'We recommend reviewing Database Normalization before your upcoming exam',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
            read: true,
            priority: 'medium'
          }
        ] as Notification[];
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
    }
  });
  
  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        // In a real implementation, call the API
        // return apiRequest("POST", `/api/notifications/${notificationId}/read`, {});
        
        // For now, simulate success
        return new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error("Error marking notification as read:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });
  
  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      try {
        // In a real implementation, call the API
        // return apiRequest("POST", "/api/notifications/mark-all-read", {});
        
        // For now, simulate success
        return new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    }
  });
  
  // Filter notifications
  const unreadNotifications = notifications.filter(n => !n.read);
  const sessionNotifications = notifications.filter(n => n.type === 'session_reminder');
  const assignmentNotifications = notifications.filter(n => n.type === 'assignment_due');
  const achievementNotifications = notifications.filter(n => n.type === 'achievement');
  
  // Handle opening and closing
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
  };
  
  // Function to get icon for notification type
  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'session_reminder':
        return <Calendar className="h-4 w-4" />;
      case 'assignment_due':
        return <FileText className="h-4 w-4" />;
      case 'achievement':
        return <Award className="h-4 w-4" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4" />;
      case 'system':
        return <Bell className="h-4 w-4" />;
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadNotifications.length > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center" 
              variant="destructive"
            >
              {unreadNotifications.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
            {unreadNotifications.length > 0 && (
              <Badge className="ml-2" variant="secondary">{unreadNotifications.length} unread</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Stay updated with your study sessions, assignments, and achievements
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All
                  {notifications.length > 0 && (
                    <Badge variant="outline" className="ml-1.5">{notifications.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sessions">
                  Sessions
                  {sessionNotifications.length > 0 && (
                    <Badge variant="outline" className="ml-1.5">{sessionNotifications.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="assignments">
                  Assignments
                  {assignmentNotifications.length > 0 && (
                    <Badge variant="outline" className="ml-1.5">{assignmentNotifications.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="achievements">
                  Achievements
                  {achievementNotifications.length > 0 && (
                    <Badge variant="outline" className="ml-1.5">{achievementNotifications.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <div className="flex justify-end mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending || unreadNotifications.length === 0}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark all as read
                </Button>
              </div>
              
              <TabsContent value="all" className="space-y-4 mt-2">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                    <p className="mt-2 text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                        onMarkAsRead={() => markAsRead.mutate(notification.id)}
                        getIconForType={getIconForType}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sessions" className="space-y-4 mt-2">
                {sessionNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                    <p className="mt-2 text-muted-foreground">No session notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionNotifications.map((notification) => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                        onMarkAsRead={() => markAsRead.mutate(notification.id)}
                        getIconForType={getIconForType}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="assignments" className="space-y-4 mt-2">
                {assignmentNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                    <p className="mt-2 text-muted-foreground">No assignment notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignmentNotifications.map((notification) => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                        onMarkAsRead={() => markAsRead.mutate(notification.id)}
                        getIconForType={getIconForType}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="achievements" className="space-y-4 mt-2">
                {achievementNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                    <p className="mt-2 text-muted-foreground">No achievement notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {achievementNotifications.map((notification) => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification} 
                        onMarkAsRead={() => markAsRead.mutate(notification.id)}
                        getIconForType={getIconForType}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: () => void;
  getIconForType: (type: NotificationType) => React.ReactNode;
}

function NotificationItem({ notification, onMarkAsRead, getIconForType }: NotificationItemProps) {
  // Priority colors
  const getPriorityBg = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-card border-border';
    }
  };
  
  return (
    <div 
      className={`relative p-3 border rounded-lg ${notification.read ? 'bg-card' : getPriorityBg(notification.priority)}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-md bg-primary/10 text-primary`}>
          {getIconForType(notification.type)}
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-medium">{notification.title}</h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(notification.timestamp)}
            </span>
            {!notification.read && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onMarkAsRead}>
                <Check className="h-3 w-3 mr-1" />
                <span className="text-xs">Mark as read</span>
              </Button>
            )}
          </div>
        </div>
        
        {!notification.read && (
          <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
    </div>
  );
}

// Helper to format time ago
function formatTimeAgo(date: Date): string {
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