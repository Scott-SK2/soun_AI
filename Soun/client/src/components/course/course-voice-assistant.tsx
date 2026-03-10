import React from "react";
import { VoiceAssistant } from "@/components/dashboard/voice-assistant";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface CourseVoiceAssistantProps {
  courseId: string;
  courseName: string;
}

export function CourseVoiceAssistant({ courseId, courseName }: CourseVoiceAssistantProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            aria-label="Open voice assistant"
          >
            <Mic className="h-6 w-6 text-white" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="end">
          <div className="p-0">
            <VoiceAssistant courseId={courseId} courseName={courseName} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}