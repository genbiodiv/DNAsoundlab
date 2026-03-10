import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Settings, 
  Info, 
  Volume2, 
  Music, 
  Activity, 
  Globe, 
  Moon, 
  Sun,
  X,
  ChevronRight,
  BookOpen,
  Dna,
  Upload,
  Layers,
  Waves
} from 'lucide-react';
import { Base, Mapping, DEFAULT_MAPPING, Language, LayerConfig, ReadingMode } from './types';
import { generateRandomSequence, calculateStats, parseFASTA } from './utils/dnaUtils';
import { useAudioEngine, LayerConfigs } from './hooks/useAudioEngine';
import { translations } from './translations';

const DEFAULT_LAYERS: LayerConfigs = {
  mono: { enabled: true, volume: 0.8, octaveOffset: 0, stepOffset: 0, loopLength: 0, detune: 0, pan: -0.5, waveType: 'sine', duration: 200 },
  di: { enabled: false, volume: 0.5, octaveOffset: -1, stepOffset: 0, loopLength: 0, detune: 5, pan: 0.5, waveType: 'triangle', duration: 300 },
  tri: { enabled: false, volume: 0.4, octaveOffset: -2, stepOffset: 0, loopLength: 0, detune: -5, pan: 0, waveType: 'sawtooth', duration: 400 },
};

export default function App() {
  // State
  const [language, setLanguage] = useState<Language>('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [sequence, setSequence] = useState<Base[]>([]);
  const [sequenceLength, setSequenceLength] = useState(150);
  const [mapping, setMapping] = useState<Mapping>(DEFAULT_MAPPING);
  const [layers, setLayers] = useState<LayerConfigs>(DEFAULT_LAYERS);
  const [tempo, setTempo] = useState(120);
  const [volume, setVolume] = useState(0.5);
  const [readingMode, setReadingMode] = useState<ReadingMode>('structural');
  const [sequenceName, setSequenceName] = useState<string>('Random Sequence');
  const [originalBases, setOriginalBases] = useState<Record<number, Base>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];
  const stats = useMemo(() => calculateStats(sequence), [sequence]);
  const { isPlaying, currentIndex, play, stop, setVolume: setAudioVolume, setTempo: setAudioTempo } = useAudioEngine(mapping, layers, readingMode);

  // Initialize
  useEffect(() => {
    setSequence(generateRandomSequence(sequenceLength));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Update audio engine refs
  useEffect(() => {
    setAudioVolume(volume);
    setAudioTempo(tempo);
  }, [volume, tempo, setAudioVolume, setAudioTempo]);

  // Handlers
  const handleGenerate = () => {
    stop();
    setSequenceName('Random Sequence');
    setSequence(generateRandomSequence(sequenceLength));
    setOriginalBases({});
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { name, sequence: newSequence } = parseFASTA(text);
      stop();
      setSequenceName(name);
      setSequence(newSequence);
      setOriginalBases({});
    };
    reader.readAsText(file);
  };

  const toggleBase = (idx: number) => {
    const currentBase = sequence[idx];
    const newSequence = [...sequence];
    
    if (currentBase === '-') {
      // Restore
      newSequence[idx] = originalBases[idx] || 'A';
    } else {
      // Pause
      setOriginalBases(prev => ({ ...prev, [idx]: currentBase }));
      newSequence[idx] = '-';
    }
    setSequence(newSequence);
  };

  const clearPauses = () => {
    const newSequence = sequence.map((base, idx) => {
      if (base === '-') return originalBases[idx] || 'A';
      return base;
    });
    setSequence(newSequence);
    setOriginalBases({});
  };

  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'es' : 'en');
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const updateMapping = (base: Base, value: number) => {
    if (isNaN(value)) return;
    setMapping(prev => ({ ...prev, [base]: value }));
  };

  const updateLayer = (layerKey: keyof LayerConfigs, updates: Partial<LayerConfig>) => {
    const cleanUpdates = { ...updates };
    Object.keys(cleanUpdates).forEach(key => {
      const val = (cleanUpdates as any)[key];
      if (typeof val === 'number' && isNaN(val)) {
        delete (cleanUpdates as any)[key];
      }
    });

    if (Object.keys(cleanUpdates).length === 0) return;

    setLayers(prev => ({
      ...prev,
      [layerKey]: { ...prev[layerKey], ...cleanUpdates }
    }));
  };

  const resetMapping = () => setMapping(DEFAULT_MAPPING);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-black text-white' : 'bg-white text-black'}`}>
      
      {/* Splash Page */}
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 ${isDarkMode ? 'bg-black/90' : 'bg-white/90'}`}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-2xl w-full bg-white dark:bg-black rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-2xl">
                    <Dna className="text-white w-8 h-8" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
                </div>
                <button onClick={toggleLanguage} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                  <Globe className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 text-black dark:text-gray-400">
                <p className="text-lg leading-relaxed text-black dark:text-gray-400">
                  {language === 'en' 
                    ? "Welcome to the DNA Sound Lab. This professional tool converts genetic sequences into multi-layered audible frequencies, allowing you to analyze patterns through sound."
                    : "Bienvenido al DNA Sound Lab. Esta herramienta profesional convierte secuencias genéticas en frecuencias audibles multicapa, permitiéndote analizar patrones a través del sonido."}
                </p>

                <section>
                  <h2 className="text-xl font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    {t.instructions}
                  </h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-transparent">
                      <h3 className="font-bold text-black dark:text-white mb-1">1. {language === 'en' ? 'Sequence Space' : 'Espacio de Secuencia'}</h3>
                      <p className="text-sm text-black dark:text-gray-400">{t.part1}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-transparent">
                      <h3 className="font-bold text-black dark:text-white mb-1">2. {language === 'en' ? 'Layer Controls' : 'Controles de Capa'}</h3>
                      <p className="text-sm text-black dark:text-gray-400">{t.part2}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-transparent">
                      <h3 className="font-bold text-black dark:text-white mb-1">3. {language === 'en' ? 'Mapping' : 'Mapeo'}</h3>
                      <p className="text-sm text-black dark:text-gray-400">{t.part3}</p>
                    </div>
                  </div>
                </section>
              </div>

              <button 
                onClick={() => setShowSplash(false)}
                className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {t.start}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna className="text-blue-500 w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLanguage} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
              <Globe className="w-4 h-4" />
              {language.toUpperCase()}
            </button>
            <button onClick={toggleTheme} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowSplash(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Mapping */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Generation & Upload Controls */}
          <section className="bg-white dark:bg-black p-6 rounded-3xl border border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black dark:text-white">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              {t.generate} & {t.uploadFasta}
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2 text-black dark:text-gray-400">
                  <span>{t.length}</span>
                  <span className="font-mono">{sequenceLength}</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="1000" 
                  value={sequenceLength || 100} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) setSequenceLength(val);
                  }}
                  className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleGenerate}
                  className="py-3 bg-white dark:bg-black border border-gray-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t.generate}
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 hover:border-blue-500 dark:hover:border-blue-500 text-blue-600 dark:text-blue-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  {t.uploadFasta}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".fasta,.fa,.txt" 
                  className="hidden" 
                />
              </div>
            </div>
          </section>

          {/* Playback Controls */}
          <section className="bg-white dark:bg-black p-6 rounded-3xl border border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black dark:text-white">
              <Music className="w-5 h-5 text-blue-500" />
              {t.play}
            </h2>
            <div className="space-y-6">
              <div className="flex gap-2">
                {!isPlaying ? (
                  <button 
                    onClick={() => play(sequence)}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    {t.play}
                  </button>
                ) : (
                  <button 
                    onClick={stop}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    {t.stop}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2 text-black dark:text-gray-400">
                    <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> {t.tempo}</span>
                    <span className="font-mono">{tempo}</span>
                  </div>
                  <input 
                    type="range" min="60" max="960" value={tempo || 60} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setTempo(val);
                    }}
                    className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2 text-black dark:text-gray-400">
                    <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> {t.volume}</span>
                    <span className="font-mono">{Math.round(volume * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" value={volume || 0} 
                    onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setVolume(val);
                  }}
                    className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium flex items-center gap-2 text-black dark:text-white">
                    <Settings className="w-4 h-4 text-blue-500" />
                    {t.readingMode}
                  </span>
                  <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                    <button 
                      onClick={() => setReadingMode('structural')}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${readingMode === 'structural' ? 'bg-white dark:bg-blue-500 text-blue-600 dark:text-white shadow-sm' : 'text-black dark:text-gray-400'}`}
                    >
                      {t.structural}
                    </button>
                    <button 
                      onClick={() => setReadingMode('analytical')}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${readingMode === 'analytical' ? 'bg-white dark:bg-blue-500 text-blue-600 dark:text-white shadow-sm' : 'text-black dark:text-gray-400'}`}
                    >
                      {t.analytical}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sonification Layers */}
          <section className="bg-white dark:bg-black p-6 rounded-3xl border border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black dark:text-white">
              <Layers className="w-5 h-5 text-blue-500" />
              {t.layers}
            </h2>
            <div className="space-y-4">
              {(['mono', 'di', 'tri'] as const).map((layerKey) => (
                <div key={layerKey} className="p-3 bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase flex items-center gap-2 text-black dark:text-white">
                      <input 
                        type="checkbox" 
                        checked={layers[layerKey].enabled} 
                        onChange={(e) => updateLayer(layerKey, { enabled: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {t[`${layerKey}Layer` as keyof typeof t]}
                    </label>
                    <div className="flex gap-1">
                      {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map(type => (
                        <button 
                          key={type}
                          onClick={() => updateLayer(layerKey, { waveType: type })}
                          className={`p-1 rounded ${layers[layerKey].waveType === type ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-black dark:text-white'}`}
                          title={type}
                        >
                          <Waves className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-black dark:text-gray-400">
                        <span>Vol</span>
                        <span>{Math.round(layers[layerKey].volume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.1" value={layers[layerKey].volume || 0} 
                        onChange={(e) => updateLayer(layerKey, { volume: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-black dark:text-gray-400">
                        <span>{t.durationShort}</span>
                        <span>{layers[layerKey].duration}ms</span>
                      </div>
                      <input 
                        type="range" min="50" max="1000" step="10" value={layers[layerKey].duration || 0} 
                        onChange={(e) => updateLayer(layerKey, { duration: parseInt(e.target.value) })}
                        className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-black dark:text-gray-400">
                        <span>Oct</span>
                        <span>{layers[layerKey].octaveOffset > 0 ? '+' : ''}{layers[layerKey].octaveOffset}</span>
                      </div>
                      <input 
                        type="range" min="-3" max="3" step="1" value={layers[layerKey].octaveOffset || 0} 
                        onChange={(e) => updateLayer(layerKey, { octaveOffset: parseInt(e.target.value) })}
                        className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-black dark:text-gray-400">
                        <span>Off</span>
                        <span>{layers[layerKey].stepOffset}</span>
                      </div>
                      <input 
                        type="range" min="0" max="16" step="1" value={layers[layerKey].stepOffset || 0} 
                        onChange={(e) => updateLayer(layerKey, { stepOffset: parseInt(e.target.value) })}
                        className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-black dark:text-gray-400">
                        <span>Det</span>
                        <span>{layers[layerKey].detune}c</span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="1" value={layers[layerKey].detune || 0} 
                        onChange={(e) => updateLayer(layerKey, { detune: parseInt(e.target.value) })}
                        className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-black dark:text-gray-400">
                        <span>Loop</span>
                        <span>{layers[layerKey].loopLength || sequence.length}</span>
                      </div>
                      <input 
                        type="range" min="0" max={sequence.length} step="1" value={layers[layerKey].loopLength || 0} 
                        onChange={(e) => updateLayer(layerKey, { loopLength: parseInt(e.target.value) })}
                        className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-between text-[10px] mb-1 text-black dark:text-gray-400">
                        <span>Pan</span>
                        <span>{layers[layerKey].pan === 0 ? 'C' : layers[layerKey].pan > 0 ? `R ${Math.round(layers[layerKey].pan * 100)}` : `L ${Math.round(Math.abs(layers[layerKey].pan) * 100)}`}</span>
                      </div>
                      <input 
                        type="range" min="-1" max="1" step="0.1" value={layers[layerKey].pan || 0} 
                        onChange={(e) => updateLayer(layerKey, { pan: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Mapping Editor */}
          <section className="bg-white dark:bg-black p-6 rounded-3xl border border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-black dark:text-white">
                <Settings className="w-5 h-5 text-blue-500" />
                {t.mapping}
              </h2>
              <button 
                onClick={resetMapping}
                className="text-xs text-blue-500 hover:underline font-medium"
              >
                {t.reset}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(['A', 'C', 'G', 'T'] as Base[]).map((base) => (
                <div key={base} className="space-y-1">
                  <label className="text-xs font-bold uppercase flex items-center gap-2 text-black dark:text-white">
                    <span className={`w-2 h-2 rounded-full bg-current base-${base}`} />
                    {base}
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={isNaN(mapping[base]) ? '' : mapping[base]} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateMapping(base, isNaN(val) ? 0 : val);
                      }}
                      className="w-full p-2 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none text-black dark:text-white"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-black dark:text-gray-400">Hz</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Viewer & Stats */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sequence Viewer */}
          <section className="bg-white dark:bg-black p-6 rounded-3xl border border-gray-200 dark:border-white/10 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-black dark:text-white">
                <Dna className="w-5 h-5 text-blue-500" />
                {sequenceName}
              </h2>
              <div className="flex items-center gap-4">
                {Object.keys(originalBases).length > 0 && (
                  <button 
                    onClick={clearPauses}
                    className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    {t.clearPauses}
                  </button>
                )}
                <div className="text-xs font-mono text-black dark:text-gray-400">
                  {currentIndex + 1} / {sequence.length}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px] p-4 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-white/10 shadow-inner">
              <div className="flex flex-wrap content-start gap-0.5">
                {sequence.map((base, idx) => {
                  const getLayerIdx = (key: keyof LayerConfigs) => {
                    if (currentIndex === -1) return -1;
                    const loop = layers[key].loopLength || sequence.length;
                    return ((currentIndex % loop) + layers[key].stepOffset) % sequence.length;
                  };
                  
                  const isMono = idx === getLayerIdx('mono');
                  const isDi = layers.di.enabled && idx === getLayerIdx('di');
                  const isTri = layers.tri.enabled && idx === getLayerIdx('tri');
                  
                  return (
                    <div key={idx} className="relative group">
                      <motion.span 
                        initial={false}
                        onClick={() => toggleBase(idx)}
                        animate={{ 
                          scale: (isMono || isDi || isTri) ? 1.1 : 1,
                          backgroundColor: isMono ? 'var(--accent)' : isDi ? '#10b981' : isTri ? '#f59e0b' : undefined,
                          color: (isMono || isDi || isTri) ? 'white' : undefined,
                          opacity: base === '-' ? 0.3 : 1,
                        }}
                        className={`sequence-base base-${base} ${(isMono || isDi || isTri) ? 'base-active' : ''} cursor-pointer hover:ring-2 hover:ring-blue-500/50`}
                      >
                        {base}
                      </motion.span>
                      <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-0.5 pointer-events-none">
                        {isMono && <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />}
                        {isDi && <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />}
                        {isTri && <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Stats Panel */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-black p-6 rounded-3xl border border-gray-200 dark:border-white/10">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black dark:text-white">
                <Activity className="w-5 h-5 text-blue-500" />
                {t.stats}
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-gray-200 dark:border-white/10 pb-2">
                  <span className="text-sm text-black dark:text-gray-400">{t.length}</span>
                  <span className="text-xl font-bold font-mono text-black dark:text-white">{stats.length}</span>
                </div>
                <div className="flex justify-between items-end border-b border-gray-200 dark:border-white/10 pb-2">
                  <span className="text-sm text-black dark:text-gray-400">{t.gcContent}</span>
                  <span className="text-xl font-bold font-mono text-emerald-500">{stats.gcContent.toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {(['A', 'C', 'G', 'T'] as Base[]).map(base => (
                    <div key={base} className="text-center p-2 bg-white dark:bg-black rounded-xl border border-gray-100 dark:border-white/5">
                      <div className={`text-[10px] font-bold base-${base}`}>{base}</div>
                      <div className="text-sm font-mono font-bold text-black dark:text-white">{stats.counts[base]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-black p-6 rounded-3xl text-black dark:text-blue-400 border border-gray-200 dark:border-blue-900/50 shadow-xl shadow-blue-500/5 relative overflow-hidden">
              <Dna className="absolute -right-8 -bottom-8 w-48 h-48 text-blue-500/10 dark:text-blue-500/5 rotate-12" />
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-black dark:text-white">
                <Info className="w-5 h-5 text-blue-500" />
                {t.howItWorks}
              </h2>
              <div className="space-y-3 text-sm text-black dark:text-blue-300 relative z-10">
                <p>
                  {language === 'en' 
                    ? "This tool overlays three layers of sonification: Mono-nucleotides (individual bases), Di-nucleotides (pairs), and Tri-nucleotides (codons)."
                    : "Esta herramienta superpone tres capas de sonificación: Mono-nucleótidos (bases individuales), Di-nucleótidos (pares) y Tri-nucleótidos (codones)."}
                </p>
                <p>
                  {language === 'en'
                    ? "Each layer can be configured with different wave types and octave offsets to create a rich, multi-instrumental representation of the genetic data."
                    : "Cada capa se puede configurar con diferentes tipos de onda y desplazamientos de octava para crear una representación multi-instrumental rica de los datos genéticos."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200 dark:border-white/10 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-black dark:text-white" />
            <span className="text-sm font-medium tracking-tight text-black dark:text-white">DNA Sound Lab v1.1</span>
          </div>
          <div className="flex gap-8 text-sm text-black dark:text-white">
            <span className="hover:text-blue-500 cursor-pointer transition-colors">FASTA Support Enabled</span>
            <span className="hover:text-blue-500 cursor-pointer transition-colors">Multi-Layer Sonification</span>
            <span className="hover:text-blue-500 cursor-pointer transition-colors">Professional Tool</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
