import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWakeWordDetection } from "@/hooks/use-wake-word-detection";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function WakeWordIndicator() {
  const [enabled, setEnabled] = useState(true);
  const { toast } = useToast();

  const {
    isWakeWordActive,
    isListeningForCommand,
    lastCommand,
  } = useWakeWordDetection({
    enabled,
    onWakeWordDetected: () => {
      toast({
        title: "👂 Soun is listening",
        description: "Speak your command now...",
        duration: 2000,
      });
    },
    onCommandReceived: (command) => {
      console.log('Command received in indicator:', command);
    }
  });

  const toggleWakeWord = () => {
    setEnabled(!enabled);
    toast({
      title: enabled ? "Wake Word Disabled" : "Wake Word Enabled",
      description: enabled 
        ? "Say 'Hi Soun' to activate again (after re-enabling)" 
        : "Wake word detection is now active. Say 'Hi Soun' to get started!",
    });
  };

  return (
    <>
      {/* Floating wake word indicator */}
      <div 
        className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2"
        data-testid="wake-word-indicator"
      >
        {/* Active listening indicator */}
        <AnimatePresence>
          {(isWakeWordActive || isListeningForCommand) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full shadow-lg"
            >
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium">
                {isListeningForCommand ? "Listening..." : "Wake word detected!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <motion.button
          onClick={toggleWakeWord}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "p-3 rounded-full shadow-lg transition-all duration-300",
            enabled 
              ? "bg-blue-500 hover:bg-blue-600 text-white" 
              : "bg-gray-300 hover:bg-gray-400 text-gray-600"
          )}
          title={enabled ? "Wake word enabled - Click to disable" : "Wake word disabled - Click to enable"}
          data-testid="toggle-wake-word"
        >
          <Mic className={cn("w-5 h-5", enabled && "animate-pulse")} />
        </motion.button>

        {/* Status text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground text-right"
        >
          {enabled ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Say "Hi Soun"
            </span>
          ) : (
            <span className="text-gray-400">Wake word off</span>
          )}
        </motion.div>

        {/* Last command display */}
        <AnimatePresence>
          {lastCommand && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="text-xs text-muted-foreground bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm max-w-[200px] truncate"
            >
              "{lastCommand}"
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructional hint on first load */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-full shadow-sm"
        >
          <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
            💡 Try saying <span className="font-semibold">"Hi Soun, show me my courses"</span>
          </p>
        </motion.div>
      )}
    </>
  );
}
