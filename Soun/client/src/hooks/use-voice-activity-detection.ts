
import { useState, useEffect, useRef } from 'react';

export function useVoiceActivityDetection(sensitivity: number = 0.01) {
  const [isVoiceDetected, setIsVoiceDetected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  
  useEffect(() => {
    let mounted = true;
    
    const initializeVAD = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        
        microphone.connect(analyser);
        analyserRef.current = analyser;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkVoiceActivity = () => {
          if (!mounted || !analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          
          const average = sum / bufferLength;
          const normalizedLevel = average / 255;
          
          setAudioLevel(normalizedLevel);
          setIsVoiceDetected(normalizedLevel > sensitivity);
          
          animationRef.current = requestAnimationFrame(checkVoiceActivity);
        };
        
        checkVoiceActivity();
      } catch (error) {
        console.error('Failed to initialize voice activity detection:', error);
      }
    };
    
    initializeVAD();
    
    return () => {
      mounted = false;
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [sensitivity]);
  
  return { isVoiceDetected, audioLevel };
}
