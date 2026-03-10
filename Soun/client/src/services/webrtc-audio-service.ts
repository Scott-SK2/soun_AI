
interface AudioConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
}

interface AudioProcessor {
  process(inputBuffer: Float32Array): Float32Array;
  destroy(): void;
}

class WebRTCAudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private audioProcessor: AudioProcessor | null = null;
  private isProcessing = false;

  private readonly optimalConstraints: AudioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  };

  async initialize(): Promise<void> {
    try {
      // Create high-quality audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.optimalConstraints.sampleRate,
        latencyHint: 'interactive'
      });

      // Get high-quality audio stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.optimalConstraints.echoCancellation,
          noiseSuppression: this.optimalConstraints.noiseSuppression,
          autoGainControl: this.optimalConstraints.autoGainControl,
          sampleRate: this.optimalConstraints.sampleRate,
          channelCount: this.optimalConstraints.channelCount,
          latency: 0.01 // 10ms latency
        }
      });

      // Set up audio processing chain
      await this.setupAudioProcessing();
      
      console.log('WebRTC Audio Service initialized with high-quality settings');
    } catch (error) {
      console.error('Failed to initialize WebRTC Audio Service:', error);
      throw error;
    }
  }

  private async setupAudioProcessing(): Promise<void> {
    if (!this.audioContext || !this.mediaStream) return;

    // Create audio nodes for processing
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // Gain control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.2; // Slight boost
    
    // Dynamic range compression
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.ratio.value = 12;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;

    // High-pass filter to remove low-frequency noise
    this.filterNode = this.audioContext.createBiquadFilter();
    this.filterNode.type = 'highpass';
    this.filterNode.frequency.value = 80;
    this.filterNode.Q.value = 1;

    // Script processor for custom audio processing
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processorNode.onaudioprocess = (event) => {
      if (this.isProcessing && this.audioProcessor) {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        const outputBuffer = event.outputBuffer.getChannelData(0);
        const processed = this.audioProcessor.process(inputBuffer);
        outputBuffer.set(processed);
      }
    };

    // Connect the audio processing chain
    this.sourceNode
      .connect(this.filterNode)
      .connect(this.gainNode)
      .connect(this.compressorNode)
      .connect(this.processorNode);
  }

  startProcessing(): void {
    this.isProcessing = true;
  }

  stopProcessing(): void {
    this.isProcessing = false;
  }

  getProcessedStream(): MediaStream | null {
    if (!this.audioContext || !this.processorNode) return null;
    
    // Create a destination and return its stream
    const destination = this.audioContext.createMediaStreamDestination();
    this.processorNode.connect(destination);
    return destination.stream;
  }

  getAudioLevel(): number {
    if (!this.audioContext || !this.sourceNode) return 0;
    
    // Create analyser for audio level detection
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    this.sourceNode.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return average / 255;
  }

  async adjustForEnvironment(): Promise<void> {
    // Dynamically adjust settings based on environment
    if (!this.compressorNode || !this.gainNode) return;

    const audioLevel = this.getAudioLevel();
    
    if (audioLevel < 0.1) {
      // Quiet environment - increase gain and reduce compression
      this.gainNode.gain.value = 1.5;
      this.compressorNode.ratio.value = 8;
    } else if (audioLevel > 0.7) {
      // Noisy environment - increase compression and noise suppression
      this.gainNode.gain.value = 0.9;
      this.compressorNode.ratio.value = 16;
    }
  }

  destroy(): void {
    this.isProcessing = false;
    
    if (this.audioProcessor) {
      this.audioProcessor.destroy();
    }
    
    if (this.processorNode) {
      this.processorNode.disconnect();
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const webRTCAudioService = new WebRTCAudioService();
