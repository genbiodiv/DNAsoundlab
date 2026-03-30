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
  windowSize?: number;
  windowStep?: number;
  tempo: number;
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
  genbankAccession: string;
  importLimit: string;
  fetch: string;
  layers: string;
  monoLayer: string;
  diLayer: string;
  triLayer: string;
  windowLayer: string;
  windowSize: string;
  windowStep: string;
  layerTempo: string;
  clearPauses: string;
  part1: string;
  part2: string;
  part3: string;
  readingMode: string;
  structural: string;
  analytical: string;
  soundStyle: string;
}

export interface LayerParams {
  type: OscillatorType;
  filterFreq: number;
  q: number;
  attack: number;
  release: number;
}

export interface SoundPreset {
  id: string;
  name: { en: string; es: string };
  bass: LayerParams;
  pad: LayerParams;
  sparkle: LayerParams;
  window: LayerParams;
}

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'default',
    name: { en: 'Default Lab', es: 'Laboratorio Estándar' },
    bass: { type: 'sine', filterFreq: 200, q: 1, attack: 0.05, release: 0.2 },
    pad: { type: 'triangle', filterFreq: 800, q: 2, attack: 0.5, release: 1.5 },
    sparkle: { type: 'sine', filterFreq: 2000, q: 5, attack: 0.01, release: 0.1 },
    window: { type: 'sine', filterFreq: 1000, q: 1, attack: 0.1, release: 0.5 }
  },
  {
    id: 'deep-space',
    name: { en: 'Deep Space', es: 'Espacio Profundo' },
    bass: { type: 'triangle', filterFreq: 100, q: 0.5, attack: 0.2, release: 0.5 },
    pad: { type: 'sine', filterFreq: 400, q: 1, attack: 1.5, release: 3.0 },
    sparkle: { type: 'triangle', filterFreq: 4000, q: 10, attack: 0.1, release: 0.8 },
    window: { type: 'sine', filterFreq: 500, q: 0.5, attack: 1.0, release: 2.0 }
  },
  {
    id: 'cyberpunk',
    name: { en: 'Cyberpunk', es: 'Cyberpunk' },
    bass: { type: 'sawtooth', filterFreq: 150, q: 4, attack: 0.02, release: 0.1 },
    pad: { type: 'sawtooth', filterFreq: 1200, q: 8, attack: 0.1, release: 0.4 },
    sparkle: { type: 'square', filterFreq: 3000, q: 12, attack: 0.005, release: 0.05 },
    window: { type: 'sawtooth', filterFreq: 800, q: 5, attack: 0.05, release: 0.2 }
  },
  {
    id: 'organic',
    name: { en: 'Organic Forest', es: 'Bosque Orgánico' },
    bass: { type: 'sine', filterFreq: 300, q: 0.2, attack: 0.1, release: 0.3 },
    pad: { type: 'triangle', filterFreq: 600, q: 0.5, attack: 0.8, release: 1.2 },
    sparkle: { type: 'sine', filterFreq: 1500, q: 2, attack: 0.05, release: 0.4 },
    window: { type: 'triangle', filterFreq: 400, q: 1, attack: 0.5, release: 1.0 }
  },
  {
    id: 'retro',
    name: { en: 'Retro Gaming', es: 'Videojuegos Retro' },
    bass: { type: 'square', filterFreq: 400, q: 1, attack: 0.01, release: 0.05 },
    pad: { type: 'square', filterFreq: 1000, q: 2, attack: 0.02, release: 0.1 },
    sparkle: { type: 'square', filterFreq: 5000, q: 1, attack: 0.001, release: 0.02 },
    window: { type: 'square', filterFreq: 2000, q: 1, attack: 0.01, release: 0.05 }
  },
  {
    id: 'ethereal',
    name: { en: 'Ethereal', es: 'Etéreo' },
    bass: { type: 'sine', filterFreq: 80, q: 1, attack: 0.3, release: 0.8 },
    pad: { type: 'sine', filterFreq: 2000, q: 0.1, attack: 2.0, release: 4.0 },
    sparkle: { type: 'triangle', filterFreq: 8000, q: 20, attack: 0.2, release: 1.5 },
    window: { type: 'sine', filterFreq: 3000, q: 0.1, attack: 1.5, release: 3.0 }
  }
];

export const DEFAULT_MAPPING: Mapping = {
  A: 440, // A4
  C: 523.25, // C5
  G: 659.25, // E5
  T: 783.99, // G5
  '-': 0, // Pause
};
