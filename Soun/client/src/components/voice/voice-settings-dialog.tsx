import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useVoiceSettings } from "@/context/voice-settings-context";
import { useToast } from "@/hooks/use-toast";

export interface VoiceSettingsProps {
  onVoiceChange?: (voice: SpeechSynthesisVoice) => void;
  onRateChange?: (rate: number) => void;
  onPitchChange?: (pitch: number) => void;
  onVolumeChange?: (volume: number) => void;
}

export function VoiceSettingsDialog({
  onVoiceChange,
  onRateChange,
  onPitchChange,
  onVolumeChange
}: VoiceSettingsProps) {
  const { voices, selectedVoice, setVoice, speak } = useTextToSpeech();
  const { voiceSettings, updateVoiceSettings } = useVoiceSettings();
  const { toast } = useToast();

  const [rate, setRate] = useState(voiceSettings.rate);
  const [pitch, setPitch] = useState(voiceSettings.pitch);
  const [volume, setVolume] = useState(voiceSettings.volume);
  const [open, setOpen] = useState(false);

  const [englishVoices, setEnglishVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [otherVoices, setOtherVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Personal voice recording state
  const [personalVoice, setPersonalVoice] = useState<{
    isRecording: boolean;
    recordings: Blob[];
    mediaRecorder?: MediaRecorder;
  }>({
    isRecording: false,
    recordings: []
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const recordings = [...personalVoice.recordings];
        recordings.push(audioBlob);
        setPersonalVoice({
          ...personalVoice,
          isRecording: false,
          recordings
        });
      };

      mediaRecorder.start();
      setPersonalVoice({
        ...personalVoice,
        isRecording: true,
        mediaRecorder
      });

      // Stop recording after 5 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 5000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Access Error",
        description: "Please ensure you have given permission to use the microphone.",
        variant: "destructive"
      });
    }
  };


  // Filter voices by language
  useEffect(() => {
    if (voices.length > 0) {
      const english = voices.filter(voice => 
        voice.lang.startsWith('en-') || 
        voice.name.toLowerCase().includes('english')
      );

      const others = voices.filter(voice => 
        !voice.lang.startsWith('en-') && 
        !voice.name.toLowerCase().includes('english')
      );

      setEnglishVoices(english);
      setOtherVoices(others);
    }
  }, [voices]);

  // Update local state when voice settings change
  useEffect(() => {
    setRate(voiceSettings.rate);
    setPitch(voiceSettings.pitch);
    setVolume(voiceSettings.volume);
  }, [voiceSettings]);

  // Handle voice change
  const handleVoiceChange = (voiceUri: string) => {
    const voice = voices.find(v => v.voiceURI === voiceUri);
    if (voice) {
      setVoice(voice);
      if (onVoiceChange) onVoiceChange(voice);
    }
  };

  // Handle speech settings changes
  const handleRateChange = (value: number[]) => {
    const newRate = value[0];
    setRate(newRate);
    if (onRateChange) onRateChange(newRate);
  };

  const handlePitchChange = (value: number[]) => {
    const newPitch = value[0];
    setPitch(newPitch);
    if (onPitchChange) onPitchChange(newPitch);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (onVolumeChange) onVolumeChange(newVolume);
  };

  // Save settings
  const handleSaveSettings = () => {
    updateVoiceSettings({
      rate,
      pitch,
      volume
    });

    toast({
      title: "Voice Settings Saved",
      description: "Your voice preferences have been saved and will be used throughout the app.",
    });

    setOpen(false);
  };

  // Test the current voice settings
  const testVoice = () => {
    speak("This is a test of the selected voice and speech settings.", {
      rate,
      pitch,
      volume
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Voice Assistant Settings</DialogTitle>
          <DialogDescription>
            Customize the voice and speech settings for your study assistant.
          </DialogDescription>
        </DialogHeader>

        {/* Personal Voice Recording Section */}
        <div className="mb-4 p-4 border rounded-lg">
          <h3 className="text-sm font-medium mb-2">Personal Voice Setup</h3>
          <div className="space-y-2">
            <Button
              variant={personalVoice.isRecording ? "destructive" : "secondary"}
              size="sm"
              onClick={startRecording}
              disabled={personalVoice.isRecording}
            >
              {personalVoice.isRecording ? "Recording..." : "Record Voice Sample"}
            </Button>

            {personalVoice.recordings.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {personalVoice.recordings.length} voice samples recorded
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="voice">Voice Selection</Label>
            <Select 
              onValueChange={handleVoiceChange}
              value={selectedVoice?.voiceURI}
            >
              <SelectTrigger id="voice">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {englishVoices.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>English Voices</SelectLabel>
                    {englishVoices.map((voice) => (
                      <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {otherVoices.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Other Languages</SelectLabel>
                    {otherVoices.map((voice) => (
                      <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rate">Speech Rate</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Slow</span>
              <Slider
                id="rate"
                value={[rate]}
                max={2}
                min={0.5}
                step={0.1}
                onValueChange={handleRateChange}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">Fast</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pitch">Voice Pitch</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Low</span>
              <Slider
                id="pitch"
                value={[pitch]}
                max={2}
                min={0.5}
                step={0.1}
                onValueChange={handlePitchChange}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">High</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="volume">Volume</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quiet</span>
              <Slider
                id="volume"
                value={[volume]}
                max={1}
                min={0}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">Loud</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={testVoice}>
            Test Voice
          </Button>
          <Button onClick={handleSaveSettings}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}