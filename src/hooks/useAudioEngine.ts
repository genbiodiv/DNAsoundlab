import { useState, useRef, useCallback, useEffect } from 'react';
import { Base, Mapping, LayerConfig, ReadingMode } from '../types';

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

export const useAudioEngine = (mapping: Mapping, layers: LayerConfigs, readingMode: ReadingMode) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const sequenceRef = useRef<Base[]>([]);
  const volumeRef = useRef(0.5);
  const tempoRef = useRef(120);
  const currentIndexRef = useRef(-1);
  const anchorTimesRef = useRef<number[]>([]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(-1);
    currentIndexRef.current = -1;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const trigger = useCallback((freq: number, config: LayerConfig, startTime: number, duration: number) => {
    if (!audioContextRef.current || !config.enabled || freq <= 0) return;
    const ctx = audioContextRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();

    osc.type = config.waveType;
    const finalFreq = freq * Math.pow(2, config.octaveOffset);
    osc.frequency.setValueAtTime(finalFreq, startTime);
    osc.detune.setValueAtTime(config.detune, startTime);

    // ADSR Envelope
    const attack = 0.005;
    const decay = 0.03;
    const sustain = 0.6;
    const release = 0.05;
    const peakGain = volumeRef.current * config.volume;
    const sustainGain = peakGain * sustain;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustainGain, startTime + attack + decay);
    
    const releaseStart = startTime + duration - release;
    if (releaseStart > startTime + attack + decay) {
      gain.gain.setValueAtTime(sustainGain, releaseStart);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
    } else {
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    panner.pan.setValueAtTime(config.pan, startTime);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }, []);

  const playNote = useCallback((index: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const sequence = sequenceRef.current;
    const anchorTimes = anchorTimesRef.current;
    const ctxTime = ctx.currentTime;
    
    // Global offsets
    const diOffset = 0.012; // 12ms
    const triOffset = 0.024; // 24ms
    
    // Gate factors
    const monoGate = 0.85;
    const diGate = 0.75;
    const triGate = 0.7;

    // Layer 1: Mono
    const monoLoop = layers.mono.loopLength || sequence.length;
    const monoIdx = ((index % monoLoop) + layers.mono.stepOffset) % sequence.length;
    const monoStart = ctxTime; // We are scheduling exactly at this moment
    const monoWindow = anchorTimes[index + 1] - anchorTimes[index];
    const monoDuration = Math.min(layers.mono.duration / 1000, monoWindow * monoGate);
    
    if (sequence[monoIdx] !== '-') {
      trigger(mapping[sequence[monoIdx]], layers.mono, monoStart, monoDuration);
    }

    // Layer 2: Di
    const diStep = readingMode === 'structural' ? 2 : 1;
    if (index % diStep === 0) {
      const diLoop = layers.di.loopLength || sequence.length;
      const diIdx = ((index % diLoop) + layers.di.stepOffset) % sequence.length;
      
      if (diIdx < sequence.length - 1) {
        const b1 = sequence[diIdx];
        const b2 = sequence[diIdx + 1];
        
        // Rest logic: AA, CC, GG, TT
        const isRest = b1 === b2 && b1 !== '-';
        
        if (!isRest && b1 !== '-' && b2 !== '-') {
          const diStart = ctxTime + diOffset;
          const diWindow = anchorTimes[index + 2] - anchorTimes[index];
          const diDuration = Math.min(layers.di.duration / 1000, diWindow * diGate);
          
          trigger(mapping[b1], layers.di, diStart, diDuration);
          trigger(mapping[b2], { ...layers.di, detune: layers.di.detune + 12 }, diStart, diDuration);
        }
      }
    }

    // Layer 3: Tri
    const triStep = readingMode === 'structural' ? 3 : 1;
    if (index % triStep === 0) {
      const triLoop = layers.tri.loopLength || sequence.length;
      const triIdx = ((index % triLoop) + layers.tri.stepOffset) % sequence.length;
      
      if (triIdx < sequence.length - 2) {
        const b1 = sequence[triIdx];
        const b2 = sequence[triIdx + 1];
        const b3 = sequence[triIdx + 2];
        
        // Rest logic: 1 out of 16 (triComboIndex % 16 === 0)
        const triComboIndex = baseToIndex(b1) * 16 + baseToIndex(b2) * 4 + baseToIndex(b3);
        const isRest = triComboIndex % 16 === 0;

        if (!isRest && b1 !== '-' && b2 !== '-' && b3 !== '-') {
          const triStart = ctxTime + triOffset;
          const triWindow = anchorTimes[index + 3] - anchorTimes[index];
          const triDuration = Math.min(layers.tri.duration / 1000, triWindow * triGate);
          
          trigger(mapping[b1], layers.tri, triStart, triDuration);
          trigger(mapping[b2], { ...layers.tri, detune: layers.tri.detune + 12 }, triStart, triDuration);
          trigger(mapping[b3], { ...layers.tri, detune: layers.tri.detune - 12 }, triStart, triDuration);
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
    setVolume: (v: number) => (volumeRef.current = v),
    setTempo: (t: number) => (tempoRef.current = t),
  };
};
