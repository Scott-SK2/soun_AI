import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSoundPermission } from "@/context/sound-permission-context";

// Local storage key for sound permission
const SOUND_PERMISSION_KEY = "study-assistant-sound-permission";

export function SoundPermissionDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { enableSound, disableSound } = useSoundPermission();

  useEffect(() => {
    // Check if sound permission has been granted or denied before
    const permissionStatus = localStorage.getItem(SOUND_PERMISSION_KEY);
    
    // Only show the dialog if permission hasn't been set yet
    if (!permissionStatus) {
      setOpen(true);
    }
  }, []);

  const handleEnableSound = () => {
    // Update context and save to local storage
    enableSound();
    
    // Close the dialog
    setOpen(false);
    
    // Show a confirmation toast
    toast({
      title: "Sound Enabled",
      description: "You can change this setting in the Settings page.",
    });
    
    // Attempt to play a silent sound to engage audio context
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.frequency.value = 0; // Silent
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.001); // Stop after a very short time
    } catch (error) {
      console.error("Error initializing audio context:", error);
    }
  };

  const handleDisableSound = () => {
    // Update context and save to local storage
    disableSound();
    
    // Close the dialog
    setOpen(false);
    
    // Show a toast
    toast({
      title: "Sound Disabled",
      description: "You can enable sound later in the Settings page.",
      variant: "destructive",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enable Sound?</DialogTitle>
          <DialogDescription>
            This application uses voice interaction for a better learning experience. Would you like to enable sound?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Enabling sound will allow the voice assistant to speak to you. This setting can be changed at any time in the Settings page.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDisableSound}>Not Now</Button>
          <Button onClick={handleEnableSound}>Enable Sound</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
