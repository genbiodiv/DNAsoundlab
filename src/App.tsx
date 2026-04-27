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
  Waves,
  Eye
} from 'lucide-react';
import { Base, Mapping, DEFAULT_MAPPING, Language, LayerConfig, ReadingMode, SOUND_PRESETS, VisualizationType } from './types';
import { generateRandomSequence, calculateStats, parseFASTA, fetchGenBank } from './utils/dnaUtils';
import { useAudioEngine, LayerConfigs } from './hooks/useAudioEngine';
import { translations } from './translations';
import { Visualizer } from './components/Visualizer';

const DEFAULT_LAYERS: LayerConfigs = {
  mono: { enabled: true, volume: 0.8, octaveOffset: 0, stepOffset: 0, loopLength: 0, detune: 0, pan: -0.5, waveType: 'sine', duration: 200, tempo: 120 },
  di: { enabled: false, volume: 0.5, octaveOffset: -1, stepOffset: 0, loopLength: 0, detune: 5, pan: 0.5, waveType: 'triangle', duration: 300, tempo: 120 },
  tri: { enabled: false, volume: 0.4, octaveOffset: -2, stepOffset: 0, loopLength: 0, detune: -5, pan: 0, waveType: 'sawtooth', duration: 400, tempo: 120 },
  window: { enabled: false, volume: 0.3, octaveOffset: -1, stepOffset: 0, loopLength: 0, detune: 0, pan: 0, waveType: 'sine', duration: 500, windowSize: 10, windowStep: 1, tempo: 120 },
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
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SOUND_PRESETS[0].id);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('spectrum');
  const [sequenceName, setSequenceName] = useState<string>('Random Sequence');
  const [originalBases, setOriginalBases] = useState<Record<number, Base>>({});
  const [accession, setAccession] = useState('');
  const [importLimit, setImportLimit] = useState('2000');
  const [isFetching, setIsFetching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];
  const stats = useMemo(() => calculateStats(sequence), [sequence]);
  const selectedPreset = useMemo(() => 
    SOUND_PRESETS.find(p => p.id === selectedPresetId) || SOUND_PRESETS[0],
    [selectedPresetId]
  );
  const { isPlaying, currentIndices, play, stop, initAudio, analyser, setVolume: setAudioVolume } = useAudioEngine(mapping, layers, readingMode, selectedPreset);

  // Initialize
  useEffect(() => {
    setSequence(generateRandomSequence(sequenceLength));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleStart = () => {
    initAudio();
    setShowSplash(false);
  };

  // Update audio engine refs
  useEffect(() => {
    setAudioVolume(volume);
  }, [volume, setAudioVolume]);

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

  const handleGenBankFetch = async () => {
    if (!accession) return;
    setIsFetching(true);
    try {
      const limit = parseInt(importLimit) || 2000;
      const { name, sequence: newSequence } = await fetchGenBank(accession, limit);
      stop();
      setSequenceName(name);
      setSequence(newSequence);
      setOriginalBases({});
    } catch (error) {
      console.error(error);
      alert(language === 'en' ? 'Error fetching GenBank data' : 'Error al obtener datos de GenBank');
    } finally {
      setIsFetching(false);
    }
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
              className="max-w-2xl w-full line-box p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 border border-blue-500">
                    <Dna className="text-blue-500 w-8 h-8" />
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

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const el = document.getElementById('instructions-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-2 border border-current font-bold hover:bg-current hover:text-inherit transition-all flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    {t.instructions}
                  </button>
                  <button 
                    onClick={toggleLanguage}
                    className="px-6 py-2 border border-current font-bold hover:bg-current hover:text-inherit transition-all flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    {language === 'en' ? 'Español' : 'English'}
                  </button>
                </div>

                <section id="instructions-section" className="pt-4">
                  <h2 className="text-xl font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    {t.howItWorks}
                  </h2>
                  <div className="space-y-4">
                    <div className="p-4 border border-current opacity-80">
                      <h3 className="font-bold mb-1">1. {language === 'en' ? 'Sequence Space' : 'Espacio de Secuencia'}</h3>
                      <p className="text-sm">{t.part1}</p>
                    </div>
                    <div className="p-4 border border-current opacity-80">
                      <h3 className="font-bold mb-1">2. {language === 'en' ? 'Layer Controls' : 'Controles de Capa'}</h3>
                      <p className="text-sm">{t.part2}</p>
                    </div>
                    <div className="p-4 border border-current opacity-80">
                      <h3 className="font-bold mb-1">3. {language === 'en' ? 'Mapping' : 'Mapeo'}</h3>
                      <p className="text-sm">{t.part3}</p>
                    </div>
                  </div>
                </section>
              </div>

              <button 
                onClick={handleStart}
                className="w-full mt-8 py-4 border-2 border-current font-bold transition-all transform hover:scale-[1.01] active:scale-95"
              >
                {t.start}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <header className="sticky top-0 z-40 w-full border-b border-current bg-inherit backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna className="text-blue-500 w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
            <div className="h-6 w-24 ml-2 hidden sm:block">
              <Visualizer analyser={analyser} isDarkMode={isDarkMode} type={visualizationType} color={selectedPreset.visColor} />
            </div>
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
          <section className="line-box p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              {t.generate} & {t.uploadFasta}
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
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
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleGenerate}
                  className="py-3 border border-current hover:bg-current hover:text-inherit font-medium transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t.generate}
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 border border-current hover:bg-current hover:text-inherit font-medium transition-all flex items-center justify-center gap-2 text-sm"
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

              <div className="pt-4 border-t border-current space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-60">{t.genbankAccession}</label>
                    <input 
                      type="text" 
                      value={accession}
                      onChange={(e) => setAccession(e.target.value)}
                      placeholder="e.g. NM_000518"
                      className="w-full p-2 bg-transparent border border-current text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-60">{t.importLimit}</label>
                    <input 
                      type="number" 
                      value={importLimit}
                      onChange={(e) => setImportLimit(e.target.value)}
                      placeholder="2000"
                      className="w-full p-2 bg-transparent border border-current text-xs outline-none"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleGenBankFetch}
                  disabled={isFetching || !accession}
                  className="w-full py-2 border border-current hover:bg-current hover:text-inherit font-bold transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-30"
                >
                  {isFetching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                  {t.fetch}
                </button>
              </div>
            </div>
          </section>

          {/* Playback Controls */}
          <section className="line-box p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                {t.play}
              </div>
              <div className="h-8 w-32 border border-current">
                <Visualizer analyser={analyser} isDarkMode={isDarkMode} type={visualizationType} color={selectedPreset.visColor} />
              </div>
            </h2>
            <div className="space-y-6">
              <div className="flex gap-2">
                {!isPlaying ? (
                  <button 
                    onClick={() => play(sequence)}
                    className="flex-1 py-4 border-2 border-current font-bold flex items-center justify-center gap-2 transition-all hover:bg-current hover:text-inherit"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    {t.play}
                  </button>
                ) : (
                  <button 
                    onClick={stop}
                    className="flex-1 py-4 border-2 border-red-500 text-red-500 font-bold flex items-center justify-center gap-2 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    {t.stop}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> {t.tempo} (Master)</span>
                    <span className="font-mono">{tempo}</span>
                  </div>
                  <input 
                    type="range" min="60" max="960" value={tempo || 60} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setTempo(val);
                        // Update all layers
                        setLayers(prev => ({
                          mono: { ...prev.mono, tempo: val },
                          di: { ...prev.di, tempo: val },
                          tri: { ...prev.tri, tempo: val },
                          window: { ...prev.window, tempo: val },
                        }));
                      }
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> {t.volume}</span>
                    <span className="font-mono">{Math.round(volume * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" value={volume || 0} 
                    onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setVolume(val);
                  }}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t.readingMode}
                  </span>
                  <div className="flex border border-current p-0.5">
                    <button 
                      onClick={() => setReadingMode('structural')}
                      className={`px-3 py-1 text-[10px] font-bold transition-all ${readingMode === 'structural' ? 'bg-current text-inherit' : ''}`}
                    >
                      {t.structural}
                    </button>
                    <button 
                      onClick={() => setReadingMode('analytical')}
                      className={`px-3 py-1 text-[10px] font-bold transition-all ${readingMode === 'analytical' ? 'bg-current text-inherit' : ''}`}
                    >
                      {t.analytical}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2"><Waves className="w-4 h-4" /> {t.soundStyle}</span>
                  </div>
                  <select 
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full p-3 bg-transparent border border-current text-sm font-medium outline-none appearance-none cursor-pointer"
                  >
                    {SOUND_PRESETS.map(preset => (
                      <option key={preset.id} value={preset.id} className="bg-inherit">
                        {preset.name[language]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> {t.visualization}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['spectrum', 'waveform', 'combination'] as VisualizationType[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setVisualizationType(mode)}
                    className={`py-2 text-[10px] font-bold border border-current transition-all ${visualizationType === mode ? 'bg-current text-inherit' : 'opacity-60 hover:opacity-100'}`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

          {/* Sonification Layers */}
          <section className="line-box p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              {t.layers}
            </h2>
            <div className="space-y-4">
              {(['mono', 'di', 'tri', 'window'] as const).map((layerKey) => (
                <div key={layerKey} className="p-3 border border-current space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold uppercase flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={layers[layerKey].enabled} 
                          onChange={(e) => updateLayer(layerKey, { enabled: e.target.checked })}
                          className="w-4 h-4 border-current text-current focus:ring-0"
                        />
                        {t[`${layerKey}Layer` as keyof typeof t]}
                      </label>
                      <span className="text-[10px] font-medium ml-6 opacity-70">
                        {layerKey === 'mono' ? 'Bass' : layerKey === 'di' ? 'Pad' : layerKey === 'tri' ? 'Sparkle' : 'Chord'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map(type => (
                        <button 
                          key={type}
                          onClick={() => updateLayer(layerKey, { waveType: type })}
                          className={`p-1 border border-current ${layers[layerKey].waveType === type ? 'bg-current text-inherit' : ''}`}
                          title={type}
                        >
                          <Waves className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {layerKey === 'window' && (
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span>{t.windowSize}</span>
                            <span>{layers.window.windowSize}nt</span>
                          </div>
                          <input 
                            type="range" min="2" max="100" step="1" value={layers.window.windowSize || 10} 
                            onChange={(e) => updateLayer('window', { windowSize: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span>{t.windowStep}</span>
                            <span>{layers.window.windowStep}nt</span>
                          </div>
                          <input 
                            type="range" min="1" max="16" step="1" value={layers.window.windowStep || 1} 
                            onChange={(e) => updateLayer('window', { windowStep: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>{t.layerTempo}</span>
                        <span>{layers[layerKey].tempo}</span>
                      </div>
                      <input 
                        type="range" min="40" max="960" step="1" value={layers[layerKey].tempo || 120} 
                        onChange={(e) => updateLayer(layerKey, { tempo: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Vol</span>
                        <span>{Math.round(layers[layerKey].volume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.1" value={layers[layerKey].volume || 0} 
                        onChange={(e) => updateLayer(layerKey, { volume: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>{t.durationShort}</span>
                        <span>{layers[layerKey].duration}ms</span>
                      </div>
                      <input 
                        type="range" min="50" max="1000" step="10" value={layers[layerKey].duration || 0} 
                        onChange={(e) => updateLayer(layerKey, { duration: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Oct</span>
                        <span>{layers[layerKey].octaveOffset > 0 ? '+' : ''}{layers[layerKey].octaveOffset}</span>
                      </div>
                      <input 
                        type="range" min="-3" max="3" step="1" value={layers[layerKey].octaveOffset || 0} 
                        onChange={(e) => updateLayer(layerKey, { octaveOffset: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Off</span>
                        <span>{layers[layerKey].stepOffset}</span>
                      </div>
                      <input 
                        type="range" min="0" max="16" step="1" value={layers[layerKey].stepOffset || 0} 
                        onChange={(e) => updateLayer(layerKey, { stepOffset: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Det</span>
                        <span>{layers[layerKey].detune}c</span>
                      </div>
                      <input 
                        type="range" min="-50" max="50" step="1" value={layers[layerKey].detune || 0} 
                        onChange={(e) => updateLayer(layerKey, { detune: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Loop</span>
                        <span>{layers[layerKey].loopLength || sequence.length}</span>
                      </div>
                      <input 
                        type="range" min="0" max={sequence.length} step="1" value={layers[layerKey].loopLength || 0} 
                        onChange={(e) => updateLayer(layerKey, { loopLength: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Pan</span>
                        <span>{layers[layerKey].pan === 0 ? 'C' : layers[layerKey].pan > 0 ? `R ${Math.round(layers[layerKey].pan * 100)}` : `L ${Math.round(Math.abs(layers[layerKey].pan) * 100)}`}</span>
                      </div>
                      <input 
                        type="range" min="-1" max="1" step="0.1" value={layers[layerKey].pan || 0} 
                        onChange={(e) => updateLayer(layerKey, { pan: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Mapping Editor */}
          <section className="line-box p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t.mapping}
              </h2>
              <button 
                onClick={resetMapping}
                className="text-xs hover:underline font-medium"
              >
                {t.reset}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(['A', 'C', 'G', 'T'] as Base[]).map((base) => (
                <div key={base} className="space-y-1">
                  <label className="text-xs font-bold uppercase flex items-center gap-2">
                    <span className={`w-2 h-2 border border-current base-${base}`} />
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
                      className="w-full p-2 bg-transparent border border-current text-sm font-mono outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-60">Hz</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Viewer & Stats */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sequence Viewer */}
          <section className="line-box p-6 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Dna className="w-5 h-5" />
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
                <div className="text-xs font-mono opacity-60">
                  {currentIndices.mono + 1} / {sequence.length}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px] p-4 border border-current">
              <div className="flex flex-wrap content-start gap-0.5">
                {sequence.map((base, idx) => {
                  const isMono = idx === currentIndices.mono;
                  const isDi = layers.di.enabled && idx === currentIndices.di;
                  const isTri = layers.tri.enabled && idx === currentIndices.tri;
                  const isWindow = layers.window.enabled && idx === currentIndices.window;
                  
                  return (
                    <div key={idx} className="relative group">
                      <motion.span 
                        initial={false}
                        onClick={() => toggleBase(idx)}
                        animate={{ 
                          scale: (isMono || isDi || isTri || isWindow) ? 1.1 : 1,
                          backgroundColor: isMono ? 'var(--accent)' : isDi ? '#10b981' : isTri ? '#f59e0b' : isWindow ? '#8b5cf6' : undefined,
                          color: (isMono || isDi || isTri || isWindow) ? 'white' : undefined,
                          opacity: base === '-' ? 0.3 : 1,
                        }}
                        className={`sequence-base base-${base} ${(isMono || isDi || isTri || isWindow) ? 'base-active' : ''} cursor-pointer hover:ring-2 hover:ring-blue-500/50`}
                      >
                        {base}
                      </motion.span>
                      <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-0.5 pointer-events-none">
                        {isMono && <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />}
                        {isDi && <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />}
                        {isTri && <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)]" />}
                        {isWindow && <div className="w-1 h-1 rounded-full bg-violet-500 shadow-[0_0_4px_rgba(139,92,246,0.8)]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Stats Panel */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="line-box p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t.stats}
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-current pb-2">
                  <span className="text-sm opacity-70">{t.length}</span>
                  <span className="text-xl font-bold font-mono">{stats.length}</span>
                </div>
                <div className="flex justify-between items-end border-b border-current pb-2">
                  <span className="text-sm opacity-70">{t.gcContent}</span>
                  <span className="text-xl font-bold font-mono text-emerald-500">{stats.gcContent.toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {(['A', 'C', 'G', 'T'] as Base[]).map(base => (
                    <div key={base} className="text-center p-2 border border-current">
                      <div className={`text-[10px] font-bold base-${base}`}>{base}</div>
                      <div className="text-sm font-mono font-bold">{stats.counts[base]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="line-box p-6 relative overflow-hidden">
              <Dna className="absolute -right-8 -bottom-8 w-48 h-48 opacity-5 rotate-12" />
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {language === 'en' ? 'Learning Challenges' : 'Desafíos de Aprendizaje'}
              </h2>
              <div className="space-y-4 text-sm relative z-10">
                <div className="p-3 border border-current">
                  <p className="font-bold mb-1">1. {language === 'en' ? 'The GC Rhythm' : 'El Ritmo GC'}</p>
                  <p className="text-xs opacity-80">
                    {language === 'en' 
                      ? "Guanine (G) and Cytosine (C) create the longest beats. Can you find a sequence with high GC content and describe how its 'heartbeat' feels compared to an AT-rich sequence?"
                      : "La Guanina (G) y la Citosina (C) crean los pulsos más largos. ¿Puedes encontrar una secuencia con alto contenido GC y describir cómo se siente su 'latido' comparado con una rica en AT?"}
                  </p>
                </div>
                <div className="p-3 border border-current">
                  <p className="font-bold mb-1">2. {language === 'en' ? 'Codon Harmonics' : 'Armónicos de Codón'}</p>
                  <p className="text-xs opacity-80">
                    {language === 'en' 
                      ? "Enable the Tri-nucleotide layer. Some codons trigger silence (rests). Can you identify which base combinations create these rhythmic gaps and why they might be important for musical structure?"
                      : "Activa la capa de Tri-nucleótidos. Algunos codones activan silencios. ¿Puedes identificar qué combinaciones de bases crean estos huecos rítmicos y por qué podrían ser importantes para la estructura musical?"}
                  </p>
                </div>
                <div className="p-3 border border-current">
                  <p className="font-bold mb-1">3. {language === 'en' ? 'Sonic Mutation' : 'Mutación Sónica'}</p>
                  <p className="text-xs opacity-80">
                    {language === 'en' 
                      ? "Manually toggle bases to create pauses (-). Try to 'sculpt' a 4/4 drum beat using only genetic pauses. How does changing the 'Sound Style' affect the emotional impact of your genetic composition?"
                      : "Cambia manualmente las bases para crear pausas (-). Intenta 'esculpir' un ritmo de 4/4 usando solo pausas genéticas. ¿Cómo afecta cambiar el 'Estilo de Sonido' al impacto emocional de tu composición genética?"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-current mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5" />
            <span className="text-sm font-medium tracking-tight">DNA Sound Lab v1.1</span>
          </div>
          <div className="flex gap-8 text-sm">
            <span className="hover:underline cursor-pointer transition-colors">FASTA Support Enabled</span>
            <span className="hover:underline cursor-pointer transition-colors">Multi-Layer Sonification</span>
            <span className="hover:underline cursor-pointer transition-colors">Professional Tool</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
