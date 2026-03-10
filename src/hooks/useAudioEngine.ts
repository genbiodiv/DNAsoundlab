import { useState, useRef, useCallback, useEffect } from 'react';
import { Base, Mapping, LayerConfig, ReadingMode, SoundPreset, LayerParams } from '../types';

export interface LayerConfigs {
  mono: LayerConfig;
  di: LayerConfig;
  tri: LayerConfig;
}

const LENGTH_MAP: Record<string, number> = {
  'A': 0.25,
  'T': 0.5,
  'G': 1.0,
  'C': 2.0,
  '-': 1.0
};

const baseToIndex = (b: Base): number => {
  switch(b) {
    case 'A': return 0;
    case 'C': return 1;
    case 'G': return 2;
    case 'T': return 3;
    default: return 0;
  }
};

const buildAnchorTimes = (sequence: Base[], bpm: number) => {
  const times: number[] = [0];
  const beatDuration = 60 / bpm;
  
  for (let i = 0; i < sequence.length; i++) {
    const beats = LENGTH_MAP[sequence[i]] || 1.0;
    const duration = beats * beatDuration;
    times[i + 1] = times[i] + duration;
  }
  return times;
};

export const useAudioEngine = (mapping: Mapping, layers: LayerConfigs, readingMode: ReadingMode, preset: SoundPreset) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const sequenceRef = useRef<Base[]>([]);
  const volumeRef = useRef(0.5);
  const tempoRef = useRef(120);
  const currentIndexRef = useRef(-1);
  const anchorTimesRef = useRef<number[]>([]);
  const presetRef = useRef<SoundPreset>(preset);

  // Keep preset ref up to date
  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const masterGain = ctx.createGain();
      
      analyser.fftSize = 256;
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      setAnalyser(analyser);
      masterGainRef.current = masterGain;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(-1);
    currentIndexRef.current = -1;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const trigger = useCallback((freq: number, config: LayerConfig, params: LayerParams, startTime: number, duration: number) => {
    if (!audioContextRef.current || !masterGainRef.current || !config.enabled || freq <= 0) return;
    const ctx = audioContextRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const panner = ctx.createStereoPanner();

    osc.type = params.type;
    const finalFreq = freq * Math.pow(2, config.octaveOffset);
    osc.frequency.setValueAtTime(finalFreq, startTime);
    osc.detune.setValueAtTime(config.detune, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.filterFreq, startTime);
    filter.Q.setValueAtTime(params.q, startTime);

    // ADSR Envelope from preset
    const attack = params.attack;
    const decay = 0.05;
    const sustain = 0.6;
    const release = params.release;
    const peakGain = volumeRef.current * config.volume;
    const sustainGain = peakGain * sustain;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustainGain, startTime + attack + decay);
    
    const releaseStart = Math.max(startTime + attack + decay, startTime + duration - release);
    gain.gain.setValueAtTime(sustainGain, releaseStart);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    panner.pan.setValueAtTime(config.pan, startTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(masterGainRef.current);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }, []);

  const playNote = useCallback((index: number) => {
    initAudio();
    const ctx = audioContextRef.current!;
    const sequence = sequenceRef.current;
    const anchorTimes = anchorTimesRef.current;
    const ctxTime = ctx.currentTime;
    const currentPreset = presetRef.current;
    
    // Global offsets
    const diOffset = 0.012; // 12ms
    const triOffset = 0.024; // 24ms
    
    // Gate factors
    const monoGate = 0.85;
    const diGate = 0.75;
    const triGate = 0.7;

    // Layer 1: Mono (Bass)
    const monoLoop = layers.mono.loopLength || sequence.length;
    const monoIdx = ((index % monoLoop) + layers.mono.stepOffset) % sequence.length;
    const monoStart = ctxTime;
    const monoWindow = anchorTimes[index + 1] - anchorTimes[index];
    const monoDuration = Math.min(layers.mono.duration / 1000, monoWindow * monoGate);
    
    if (sequence[monoIdx] !== '-') {
      trigger(mapping[sequence[monoIdx]], layers.mono, currentPreset.bass, monoStart, monoDuration);
    }

    // Layer 2: Di (Pad)
    const diStep = readingMode === 'structural' ? 2 : 1;
    if (index % diStep === 0) {
      const diLoop = layers.di.loopLength || sequence.length;
      const diIdx = ((index % diLoop) + layers.di.stepOffset) % sequence.length;
      
      if (diIdx < sequence.length - 1) {
        const b1 = sequence[diIdx];
        const b2 = sequence[diIdx + 1];
        
        const isRest = b1 === b2 && b1 !== '-';
        
        if (!isRest && b1 !== '-' && b2 !== '-') {
          const diStart = ctxTime + diOffset;
          const diWindow = anchorTimes[index + 2] - anchorTimes[index];
          const diDuration = Math.min(layers.di.duration / 1000, diWindow * diGate);
          
          trigger(mapping[b1], layers.di, currentPreset.pad, diStart, diDuration);
          trigger(mapping[b2], { ...layers.di, detune: layers.di.detune + 12 }, currentPreset.pad, diStart, diDuration);
        }
      }
    }

    // Layer 3: Tri (Sparkle)
    const triStep = readingMode === 'structural' ? 3 : 1;
    if (index % triStep === 0) {
      const triLoop = layers.tri.loopLength || sequence.length;
      const triIdx = ((index % triLoop) + layers.tri.stepOffset) % sequence.length;
      
      if (triIdx < sequence.length - 2) {
        const b1 = sequence[triIdx];
        const b2 = sequence[triIdx + 1];
        const b3 = sequence[triIdx + 2];
        
        const triComboIndex = baseToIndex(b1) * 16 + baseToIndex(b2) * 4 + baseToIndex(b3);
        const isRest = triComboIndex % 16 === 0;

        if (!isRest && b1 !== '-' && b2 !== '-' && b3 !== '-') {
          const triStart = ctxTime + triOffset;
          const triWindow = anchorTimes[index + 3] - anchorTimes[index];
          const triDuration = Math.min(layers.tri.duration / 1000, triWindow * triGate);
          
          trigger(mapping[b1], layers.tri, currentPreset.sparkle, triStart, triDuration);
          trigger(mapping[b2], { ...layers.tri, detune: layers.tri.detune + 12 }, currentPreset.sparkle, triStart, triDuration);
          trigger(mapping[b3], { ...layers.tri, detune: layers.tri.detune - 12 }, currentPreset.sparkle, triStart, triDuration);
        }
      }
    }
  }, [mapping, layers, readingMode, trigger]);

  const playNext = useCallback(() => {
    currentIndexRef.current += 1;
    const nextIndex = currentIndexRef.current;

    if (nextIndex < sequenceRef.current.length) {
      setCurrentIndex(nextIndex);
      playNote(nextIndex);
      
      const anchorTimes = anchorTimesRef.current;
      const interval = (anchorTimes[nextIndex + 1] - anchorTimes[nextIndex]) * 1000;
      
      timerRef.current = window.setTimeout(playNext, interval);
    } else {
      stop();
    }
  }, [playNote, stop]);

  const play = useCallback((sequence: Base[]) => {
    sequenceRef.current = sequence;
    anchorTimesRef.current = buildAnchorTimes(sequence, tempoRef.current);
    setIsPlaying(true);
    currentIndexRef.current = -1;
    playNext();
  }, [playNext]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return {
    isPlaying,
    currentIndex,
    play,
    stop,
    initAudio,
    analyser,
    setVolume: (v: number) => (volumeRef.current = v),
    setTempo: (t: number) => (tempoRef.current = t),
  };
};
