import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Play, Square, Clock, BarChart2 } from "lucide-react";

interface PracticeSession {
  id: string;
  duration: number;
  date: Date;
}

export function PracticeRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = () => {
    setIsRecording(true);
    setElapsed(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (duration > 2) {
      setSessions((prev) => [
        { id: Date.now().toString(), duration, date: new Date() },
        ...prev,
      ]);
    }
    setElapsed(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const avgDuration = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + s.duration, 0) / sessions.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 py-6">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-colors ${
            isRecording ? "border-red-500 bg-red-50 animate-pulse" : "border-muted bg-muted/30"
          }`}
        >
          {isRecording ? (
            <Mic className="h-10 w-10 text-red-500" />
          ) : (
            <MicOff className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        {isRecording && (
          <div className="text-2xl font-mono font-bold text-red-500">{formatTime(elapsed)}</div>
        )}

        <div className="flex gap-3">
          {!isRecording ? (
            <Button onClick={startRecording} className="gap-2">
              <Play className="h-4 w-4" />
              Start Practice
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" className="gap-2">
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Practice delivering your presentation out loud. Track your sessions to improve timing and
          confidence.
        </p>
      </div>

      {sessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <BarChart2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{sessions.length} session{sessions.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span>Avg: {formatTime(avgDuration)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {sessions.slice(0, 5).map((s, i) => (
              <div key={s.id} className="flex items-center justify-between text-sm p-2 border rounded">
                <span className="text-muted-foreground">Session {sessions.length - i}</span>
                <Badge variant="outline">{formatTime(s.duration)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
