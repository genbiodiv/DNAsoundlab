export type Base = 'A' | 'C' | 'G' | 'T' | '-';

export interface Mapping {
  A: number;
  C: number;
  G: number;
  T: number;
  '-': number;
}

export interface LayerConfig {
  enabled: boolean;
  volume: number;
  octaveOffset: number;
  stepOffset: number;
  loopLength: number;
  detune: number;
  pan: number;
  waveType: OscillatorType;
  duration: number;
}

export interface DNAStats {
  length: number;
  counts: {
    A: number;
    C: number;
    G: number;
    T: number;
  };
  gcContent: number;
}

export type Language = 'en' | 'es';
export type ReadingMode = 'structural' | 'analytical';

export interface Translation {
  title: string;
  subtitle: string;
  generate: string;
  length: string;
  play: string;
  stop: string;
  tempo: string;
  duration: string;
  volume: string;
  mapping: string;
  reset: string;
  stats: string;
  gcContent: string;
  howItWorks: string;
  instructions: string;
  start: string;
  close: string;
  frequency: string;
  offset: string;
  loop: string;
  detune: string;
  pan: string;
  durationShort: string;
  uploadFasta: string;
  layers: string;
  monoLayer: string;
  diLayer: string;
  triLayer: string;
  clearPauses: string;
  part1: string;
  part2: string;
  part3: string;
  readingMode: string;
  structural: string;
  analytical: string;
}

export const DEFAULT_MAPPING: Mapping = {
  A: 440, // A4
  C: 523.25, // C5
  G: 659.25, // E5
  T: 783.99, // G5
  '-': 0, // Pause
};
