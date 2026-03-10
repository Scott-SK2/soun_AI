/**
 * Calendar Integration Utility
 * 
 * This utility provides functions to integrate with the device's calendar
 * using the Web Calendar API (if supported) or fallback to downloadable .ics files
 */

// Check if the Web Calendar API is supported
export const isCalendarApiSupported = (): boolean => {
  return 'showCalendarPicker' in Navigator.prototype;
};

// Types for our calendar events
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isAllDay?: boolean;
  recurrence?: string; // For recurring events, use iCal RRule format
}

/**
 * Add an event to the device calendar using the Web Calendar API if supported
 * Otherwise, creates a downloadable .ics file
 */
export const addToDeviceCalendar = async (event: CalendarEvent): Promise<boolean> => {
  try {
    // Modern Calendar API approach (currently experimental)
    if (isCalendarApiSupported()) {
      const newEvent = {
        title: event.title,
        start: event.startTime.toISOString(),
        end: event.endTime.toISOString(),
        description: event.description || '',
        location: event.location || '',
      };
      
      // @ts-ignore - this API might not be in the types yet
      const result = await navigator.showCalendarPicker(newEvent);
      return !!result;
    } 
    // Fallback to downloading ICS file
    else {
      // Create ICS file content
      const icsContent = generateICSFileContent(event);
      
      // Create a blob and download link
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger it
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      return true;
    }
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    return false;
  }
};

/**
 * Generate ICS file content for a calendar event
 */
const generateICSFileContent = (event: CalendarEvent): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/g, '');
  };
  
  const startDate = formatDate(event.startTime);
  const endDate = formatDate(event.endTime);
  
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id || Math.random().toString(36).substring(2, 11)}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${event.title}`,
  ];
  
  if (event.description) {
    ics.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
  }
  
  if (event.location) {
    ics.push(`LOCATION:${event.location}`);
  }
  
  if (event.recurrence) {
    ics.push(`RRULE:${event.recurrence}`);
  }
  
  ics.push('END:VEVENT', 'END:VCALENDAR');
  
  return ics.join('\r\n');
};

/**
 * Sync multiple events with device calendar
 * This will show a dialog for each event (if API is supported)
 * or download multiple .ics files
 */
export const syncMultipleEvents = async (events: CalendarEvent[]): Promise<number> => {
  let successCount = 0;
  
  for (const event of events) {
    const success = await addToDeviceCalendar(event);
    if (success) successCount++;
  }
  
  return successCount;
};