import { Base, DNAStats } from '../types';

export const generateRandomSequence = (length: number): Base[] => {
  const bases: Base[] = ['A', 'C', 'G', 'T'];
  return Array.from({ length }, () => bases[Math.floor(Math.random() * bases.length)]);
};

export const calculateStats = (sequence: Base[]): DNAStats => {
  const counts = { A: 0, C: 0, G: 0, T: 0, '-': 0 };
  sequence.forEach((base) => {
    if (counts.hasOwnProperty(base)) {
      counts[base as keyof typeof counts]++;
    }
  });

  const length = sequence.length;
  const gcCount = counts.G + counts.C;
  const gcContent = length > 0 ? (gcCount / length) * 100 : 0;

  return {
    length,
    counts,
    gcContent,
  };
};

export const parseFASTA = (text: string): { name: string; sequence: Base[] } => {
  const lines = text.split('\n');
  let name = 'Unknown Sequence';
  let sequenceStr = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      name = trimmed.substring(1);
    } else {
      sequenceStr += trimmed.toUpperCase();
    }
  }

  const sequence: Base[] = [];
  for (const char of sequenceStr) {
    if (['A', 'C', 'G', 'T', '-'].includes(char)) {
      sequence.push(char as Base);
    }
  }

  return { name, sequence };
};

export const getDiNucleotide = (sequence: Base[], index: number): string | null => {
  if (index < 0 || index >= sequence.length - 1) return null;
  return sequence[index] + sequence[index + 1];
};

export const getTriNucleotide = (sequence: Base[], index: number): string | null => {
  if (index < 0 || index >= sequence.length - 2) return null;
  return sequence[index] + sequence[index + 1] + sequence[index + 2];
};
