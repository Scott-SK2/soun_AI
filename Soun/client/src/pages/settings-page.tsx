import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useSoundPermission } from "@/context/sound-permission-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Check, Volume2, Mic, Bell, Moon, Sun, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { voices, selectedVoice, setVoice, speak } = useTextToSpeech();
  const { isSoundEnabled, toggleSound } = useSoundPermission();

  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1,
    pitch: 1,
    volume: 1
  });

  // Filtered voices by language
  const [englishVoices, setEnglishVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [otherVoices, setOtherVoices] = useState<SpeechSynthesisVoice[]>([]);

  // UI settings
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notifications, setNotifications] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);

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

  // Handle voice change
  const handleVoiceChange = (voiceUri: string) => {
    const voice = voices.find(v => v.voiceURI === voiceUri);
    if (voice) {
      setVoice(voice);
      toast({
        title: "Voice Changed",
        description: `Voice set to ${voice.name}`,
      });
    }
  };

  // Handle speech settings changes
  const handleRateChange = (value: number[]) => {
    const newRate = value[0];
    setVoiceSettings(prev => ({ ...prev, rate: newRate }));
  };

  const handlePitchChange = (value: number[]) => {
    const newPitch = value[0];
    setVoiceSettings(prev => ({ ...prev, pitch: newPitch }));
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVoiceSettings(prev => ({ ...prev, volume: newVolume }));
  };

  // Test the current voice settings
  const testVoice = () => {
    speak("This is a test of the selected voice and speech settings.", {
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      volume: voiceSettings.volume
    });
  };

  // Handle theme change
  const handleThemeChange = (value: string) => {
    setTheme(value as 'light' | 'dark' | 'system');
    // You would implement actual theme change logic here
    toast({
      title: "Theme Updated",
      description: `Theme set to ${value} mode`,
    });
  };

  // Handle notification toggle
  const toggleNotifications = () => {
    setNotifications(!notifications);
    toast({
      title: `Notifications ${!notifications ? 'Enabled' : 'Disabled'}`,
      description: `You will ${!notifications ? 'now' : 'no longer'} receive notifications`,
    });
  };

  // Handle auto-play voice toggle
  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
    toast({
      title: `Auto-Play ${!autoPlay ? 'Enabled' : 'Disabled'}`,
      description: `Voice responses will ${!autoPlay ? 'now' : 'no longer'} play automatically`,
    });
  };

  // Save all settings
  const saveSettings = () => {
    // Here you would typically save to localStorage or a backend API

    // For now, we'll just show a toast message
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated",
    });
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize your study experience and app preferences
        </p>
      </div>

      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="voice">Voice Settings</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Voice Settings Tab */}
        <TabsContent value="voice" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Soun Voice Preferences</CardTitle>
              <CardDescription>
                Customize how Soun sounds and behaves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Voice Selection */}
              <div className="space-y-3">
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

              <Separator />

              {/* Speed/Rate Control */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label htmlFor="rate">Speech Rate</Label>
                  <span className="text-sm text-muted-foreground">{voiceSettings.rate.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Slow</span>
                  <Slider
                    id="rate"
                    value={[voiceSettings.rate]}
                    max={2}
                    min={0.5}
                    step={0.1}
                    onValueChange={handleRateChange}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">Fast</span>
                </div>
              </div>

              {/* Pitch Control */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label htmlFor="pitch">Voice Pitch</Label>
                  <span className="text-sm text-muted-foreground">{voiceSettings.pitch.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Low</span>
                  <Slider
                    id="pitch"
                    value={[voiceSettings.pitch]}
                    max={2}
                    min={0.5}
                    step={0.1}
                    onValueChange={handlePitchChange}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">High</span>
                </div>
              </div>

              {/* Volume Control */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label htmlFor="volume">Volume</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(voiceSettings.volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Quiet</span>
                  <Slider
                    id="volume"
                    value={[voiceSettings.volume]}
                    max={1}
                    min={0}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">Loud</span>
                </div>
              </div>

              <Separator />

              {/* Sound Enabled setting */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="sound-enabled">Enable Sound</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow Soun to speak to you
                  </p>
                </div>
                <Switch
                  id="sound-enabled"
                  checked={isSoundEnabled}
                  onCheckedChange={toggleSound}
                />
              </div>

              {/* Auto-play setting */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-play">Auto-play voice responses</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically speak assistant responses
                  </p>
                </div>
                <Switch
                  id="auto-play"
                  checked={autoPlay}
                  onCheckedChange={toggleAutoPlay}
                  disabled={!isSoundEnabled}
                />
              </div>

              {/* Test voice button */}
              <Button onClick={testVoice} className="w-full">
                <Volume2 className="mr-2 h-4 w-4" />
                Test Voice
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the application looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme selection */}
              <div className="space-y-3">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  onValueChange={handleThemeChange}
                  value={theme}
                >
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center">
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center">
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center">
                        <Monitor className="mr-2 h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Font Size (example of another appearance setting) */}
              <div className="space-y-3">
                <Label htmlFor="font-size">Font Size</Label>
                <Select defaultValue="medium">
                  <SelectTrigger id="font-size">
                    <SelectValue placeholder="Select font size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Manage your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/disable all notifications */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for assignments, study sessions and achievements
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={toggleNotifications}
                />
              </div>

              <Separator />

              {/* Notification categories - only enabled if main notifications are on */}
              <div className={notifications ? "" : "opacity-50 pointer-events-none"}>
                <h3 className="text-sm font-medium mb-3">Notification Categories</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="notify-assignments" defaultChecked />
                    <Label htmlFor="notify-assignments" className="flex-1">Assignment Reminders</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="notify-study" defaultChecked />
                    <Label htmlFor="notify-study" className="flex-1">Study Session Reminders</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="notify-achievements" defaultChecked />
                    <Label htmlFor="notify-achievements" className="flex-1">Achievement Unlocks</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="notify-progress" defaultChecked />
                    <Label htmlFor="notify-progress" className="flex-1">Weekly Progress Reports</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button onClick={saveSettings} className="mr-2">Save Settings</Button>
        <Button variant="outline">Reset to Defaults</Button>
      </div>
    </div>
  );
}