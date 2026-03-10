import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MotivationDisplay } from "./motivation-display";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { useState } from "react";

interface MotivationModalProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function MotivationModal({ 
  trigger, 
  defaultOpen = false 
}: MotivationModalProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Motivation Boost
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Motivation Reminder</DialogTitle>
          <DialogDescription>
            Remember your purpose and goals during challenging times
          </DialogDescription>
        </DialogHeader>
        <MotivationDisplay onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}