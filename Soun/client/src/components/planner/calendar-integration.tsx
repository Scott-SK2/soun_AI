import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addToDeviceCalendar, syncMultipleEvents, CalendarEvent } from '@/lib/calendar-integration';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Check, X, ExternalLink } from 'lucide-react';

interface CalendarIntegrationProps {
  events: CalendarEvent[];
}

export function CalendarIntegrationButton({ events }: CalendarIntegrationProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSelectAll = () => {
    if (selectedEvents.size === events.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(events.map(e => e.id)));
    }
  };

  const toggleEvent = (eventId: string) => {
    const newSelection = new Set(selectedEvents);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    setSelectedEvents(newSelection);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('default', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const syncToCalendar = async () => {
    if (selectedEvents.size === 0) {
      toast({
        title: "No events selected",
        description: "Please select at least one event to sync with your calendar.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    
    try {
      const selectedEventObjects = events.filter(e => selectedEvents.has(e.id));
      const successCount = await syncMultipleEvents(selectedEventObjects);
      
      toast({
        title: "Calendar Sync Complete",
        description: `Successfully added ${successCount} out of ${selectedEvents.size} events to your calendar.`,
        variant: "default",
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "There was an error syncing events to your calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSingleEvent = async (event: CalendarEvent) => {
    try {
      const success = await addToDeviceCalendar(event);
      if (success) {
        toast({
          title: "Event Added",
          description: `"${event.title}" has been added to your calendar.`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Add Event",
        description: "There was an error adding this event to your calendar.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button 
        className="flex items-center gap-2 bg-primary/90 hover:bg-primary" 
        onClick={() => setIsDialogOpen(true)}
      >
        <Calendar className="h-4 w-4" />
        <span>Sync to Device Calendar</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>Sync with Device Calendar</span>
            </DialogTitle>
            <DialogDescription>
              Add study sessions, assignments, and exams to your device's calendar to receive reminders.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-3 px-2">
              <div className="text-sm text-muted-foreground">
                {selectedEvents.size} of {events.length} events selected
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedEvents.size === events.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="max-h-[350px] overflow-y-auto border rounded-md divide-y">
              {events.length > 0 ? (
                events.map(event => (
                  <div 
                    key={event.id} 
                    className={`p-3 flex items-center gap-3 hover:bg-muted/50 cursor-pointer ${
                      selectedEvents.has(event.id) ? 'bg-muted' : ''
                    }`}
                    onClick={() => toggleEvent(event.id)}
                  >
                    <div className="h-5 w-5 flex-shrink-0">
                      {selectedEvents.has(event.id) ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="h-5 w-5 rounded-sm border border-input" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(event.startTime)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8" 
                      onClick={(e) => {
                        e.stopPropagation();
                        syncSingleEvent(event);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No upcoming events to sync
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={syncToCalendar} 
              disabled={isSyncing || selectedEvents.size === 0}
              className="gap-2"
            >
              {isSyncing ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Sync {selectedEvents.size} Events
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CalendarEventIndicator({ event }: { event: CalendarEvent }) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleAddToCalendar = async () => {
    setIsSyncing(true);
    try {
      const success = await addToDeviceCalendar(event);
      if (success) {
        toast({
          title: "Added to Calendar",
          description: `"${event.title}" has been added to your device calendar.`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Add Event",
        description: "There was an error adding this event to your calendar.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-6 w-6 rounded-full hover:bg-primary/20 hover:text-primary"
      onClick={handleAddToCalendar}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Calendar className="h-3 w-3" />
      )}
    </Button>
  );
}