import { useState, useRef, useCallback, useEffect } from 'react';
import { Base, Mapping, LayerConfig, ReadingMode, SoundPreset, LayerParams } from '../types';

export interface LayerConfigs {
  mono: LayerConfig;
  di: LayerConfig;
  tri: LayerConfig;
  window: LayerConfig;
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
  const [currentIndices, setCurrentIndices] = useState<Record<string, number>>({ mono: -1, di: -1, tri: -1, window: -1 });
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const timersRef = useRef<Record<string, number>>({});
  const sequenceRef = useRef<Base[]>([]);
  const volumeRef = useRef(0.5);
  const currentIndicesRef = useRef<Record<string, number>>({ mono: -1, di: -1, tri: -1, window: -1 });
  const presetRef = useRef<SoundPreset>(preset);
  const layersRef = useRef<LayerConfigs>(layers);

  // Keep refs up to date
  useEffect(() => {
    presetRef.current = preset;
    if (audioContextRef.current && analyser) {
      analyser.fftSize = preset.fftSize;
    }
  }, [preset, analyser]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const masterGain = ctx.createGain();
      
      analyser.fftSize = presetRef.current.fftSize;
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
    const resetIndices = { mono: -1, di: -1, tri: -1, window: -1 };
    setCurrentIndices(resetIndices);
    currentIndicesRef.current = resetIndices;
    
    (Object.values(timersRef.current) as number[]).forEach(timer => {
      if (timer) window.clearTimeout(timer);
    });
    timersRef.current = {};
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

  const playLayerStep = useCallback((layerKey: keyof LayerConfigs) => {
    const sequence = sequenceRef.current;
    if (sequence.length === 0) return;

    const config = layersRef.current[layerKey];
    if (!config.enabled) return;

    const currentPreset = presetRef.current;
    const ctx = audioContextRef.current!;
    const ctxTime = ctx.currentTime;

    // Increment beat count for this layer
    const beatCount = (currentIndicesRef.current[layerKey] + 1);
    currentIndicesRef.current[layerKey] = beatCount;

    // Determine the step (sequence jump) for this layer
    let step = 1;
    if (layerKey === 'di') step = readingMode === 'structural' ? 2 : 1;
    else if (layerKey === 'tri') step = readingMode === 'structural' ? 3 : 1;
    else if (layerKey === 'window') step = config.windowStep || 1;

    // Calculate the actual position in the sequence
    const sequenceIndex = (beatCount * step) % sequence.length;
    
    // Update state for UI
    setCurrentIndices(prev => ({ ...prev, [layerKey]: sequenceIndex }));

    const beatDuration = 60 / config.tempo;
    const currentBase = sequence[sequenceIndex];
    const stepBeats = LENGTH_MAP[currentBase] || 1.0;
    const stepDuration = stepBeats * beatDuration;

    // Trigger logic per layer using the calculated sequenceIndex
    if (layerKey === 'mono') {
      const monoIdx = ((sequenceIndex % (config.loopLength || sequence.length)) + config.stepOffset) % sequence.length;
      const monoDuration = Math.min(config.duration / 1000, stepDuration * 0.85);
      if (sequence[monoIdx] !== '-') {
        trigger(mapping[sequence[monoIdx]], config, currentPreset.bass, ctxTime, monoDuration);
      }
    }

    if (layerKey === 'di') {
      const diIdx = ((sequenceIndex % (config.loopLength || sequence.length)) + config.stepOffset) % sequence.length;
      if (diIdx < sequence.length - 1) {
        const b1 = sequence[diIdx];
        const b2 = sequence[diIdx + 1];
        if (b1 !== '-' && b2 !== '-' && !(b1 === b2 && b1 !== '-')) {
          const diDuration = Math.min(config.duration / 1000, stepDuration * 1.5);
          trigger(mapping[b1], config, currentPreset.pad, ctxTime + 0.012, diDuration);
          trigger(mapping[b2], { ...config, detune: config.detune + 12 }, currentPreset.pad, ctxTime + 0.012, diDuration);
        }
      }
    }

    if (layerKey === 'tri') {
      const triIdx = ((sequenceIndex % (config.loopLength || sequence.length)) + config.stepOffset) % sequence.length;
      if (triIdx < sequence.length - 2) {
        const b1 = sequence[triIdx];
        const b2 = sequence[triIdx + 1];
        const b3 = sequence[triIdx + 2];
        const triComboIndex = baseToIndex(b1) * 16 + baseToIndex(b2) * 4 + baseToIndex(b3);
        if (triComboIndex % 16 !== 0 && b1 !== '-' && b2 !== '-' && b3 !== '-') {
          const triDuration = Math.min(config.duration / 1000, stepDuration * 2.0);
          trigger(mapping[b1], config, currentPreset.sparkle, ctxTime + 0.024, triDuration);
          trigger(mapping[b2], { ...config, detune: config.detune + 12 }, currentPreset.sparkle, ctxTime + 0.024, triDuration);
          trigger(mapping[b3], { ...config, detune: config.detune - 12 }, currentPreset.sparkle, ctxTime + 0.024, triDuration);
        }
      }
    }

    if (layerKey === 'window') {
      const windowSize = config.windowSize || 10;
      const windowIdx = ((sequenceIndex % (config.loopLength || sequence.length)) + config.stepOffset) % sequence.length;
      const counts: Record<Base, number> = { 'A': 0, 'C': 0, 'G': 0, 'T': 0, '-': 0 };
      for (let i = 0; i < windowSize; i++) {
        counts[sequence[(windowIdx + i) % sequence.length]]++;
      }
      const windowDuration = config.duration / 1000;
      (['A', 'C', 'G', 'T'] as Base[]).forEach(base => {
        if (counts[base] > 0) {
          const baseVolume = (counts[base] / windowSize) * config.volume;
          trigger(mapping[base], { ...config, volume: baseVolume }, currentPreset.window, ctxTime, windowDuration);
        }
      });
    }

    // Schedule next step for this layer
    timersRef.current[layerKey] = window.setTimeout(() => playLayerStep(layerKey), stepDuration * 1000);
  }, [mapping, readingMode, trigger]);

  const play = useCallback((sequence: Base[]) => {
    initAudio();
    sequenceRef.current = sequence;
    setIsPlaying(true);
    
    const resetIndices = { mono: -1, di: -1, tri: -1, window: -1 };
    currentIndicesRef.current = resetIndices;
    setCurrentIndices(resetIndices);

    // Start each enabled layer independently
    (['mono', 'di', 'tri', 'window'] as const).forEach(layerKey => {
      if (layersRef.current[layerKey].enabled) {
        playLayerStep(layerKey);
      }
    });
  }, [initAudio, playLayerStep]);

  useEffect(() => {
    return () => {
      (Object.values(timersRef.current) as number[]).forEach(timer => {
        if (timer) window.clearTimeout(timer);
      });
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return {
    isPlaying,
    currentIndices,
    play,
    stop,
    initAudio,
    analyser,
    setVolume: (v: number) => (volumeRef.current = v),
  };
};
