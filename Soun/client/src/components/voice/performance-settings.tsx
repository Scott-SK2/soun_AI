
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Zap, Mic, Database } from "lucide-react";
import { responseCache } from "@/services/response-cache";
import { backgroundProcessor } from "@/services/background-processor";

interface PerformanceSettingsProps {
  audioQuality: 'standard' | 'high' | 'ultra';
  onAudioQualityChange: (quality: 'standard' | 'high' | 'ultra') => void;
  isWebRTCEnabled: boolean;
  onWebRTCToggle: (enabled: boolean) => void;
}

export function PerformanceSettings({
  audioQuality,
  onAudioQualityChange,
  isWebRTCEnabled,
  onWebRTCToggle
}: PerformanceSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundProcessing, setBackgroundProcessing] = useState(true);
  const [cacheEnabled, setCacheEnabled] = useState(true);

  const cacheStats = responseCache.getStats();
  const queueStatus = backgroundProcessor.getQueueStatus();

  const handleClearCache = () => {
    responseCache.clear();
  };

  const qualityDescriptions = {
    standard: "Basic audio processing, lower CPU usage",
    high: "Enhanced audio with noise reduction",
    ultra: "Maximum quality with WebRTC optimization"
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Audio Quality Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mic className="h-4 w-4" />
                Audio Quality
              </CardTitle>
              <CardDescription>
                Adjust audio processing quality and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audio-quality">Quality Level</Label>
                <Select value={audioQuality} onValueChange={onAudioQualityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="ultra">Ultra (WebRTC)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {qualityDescriptions[audioQuality]}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="webrtc">WebRTC Enhancement</Label>
                  <p className="text-sm text-muted-foreground">
                    Advanced audio processing with noise cancellation
                  </p>
                </div>
                <Switch
                  id="webrtc"
                  checked={isWebRTCEnabled}
                  onCheckedChange={onWebRTCToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Background Processing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-4 w-4" />
                Background Processing
              </CardTitle>
              <CardDescription>
                Optimize response times with background processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="background">Enable Background Processing</Label>
                  <p className="text-sm text-muted-foreground">
                    Process audio and text in background threads
                  </p>
                </div>
                <Switch
                  id="background"
                  checked={backgroundProcessing}
                  onCheckedChange={setBackgroundProcessing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="font-medium">Queue Status</div>
                  <div className="text-muted-foreground">
                    {queueStatus.pending} pending, {queueStatus.active} active
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="font-medium">Worker Status</div>
                  <div className="text-green-600">Online</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cache Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-4 w-4" />
                Response Caching
              </CardTitle>
              <CardDescription>
                Cache frequent responses for faster interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="cache">Enable Response Caching</Label>
                  <p className="text-sm text-muted-foreground">
                    Store common responses for instant retrieval
                  </p>
                </div>
                <Switch
                  id="cache"
                  checked={cacheEnabled}
                  onCheckedChange={setCacheEnabled}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="font-medium text-lg">{cacheStats.size}</div>
                  <div className="text-muted-foreground">Cached Items</div>
                </div>
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="font-medium text-lg">{Math.round(cacheStats.hitRate * 100)}%</div>
                  <div className="text-muted-foreground">Hit Rate</div>
                </div>
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="font-medium text-lg">{cacheStats.hits}</div>
                  <div className="text-muted-foreground">Cache Hits</div>
                </div>
              </div>

              <Button 
                onClick={handleClearCache} 
                variant="outline" 
                className="w-full"
              >
                Clear Cache
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
