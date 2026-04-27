import { useEffect, useRef } from 'react';
import { VisualizationType } from '../types';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isDarkMode: boolean;
  type?: VisualizationType;
  color?: string;
}

export const Visualizer = ({ analyser, isDarkMode, type = 'spectrum', color }: VisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let animationId: number;

    const draw = () => {
      if (!canvas || !ctx || !container) return;
      animationId = requestAnimationFrame(draw);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      const drawColor = color || (isDarkMode ? '#ffffff' : '#000000');
      ctx.strokeStyle = drawColor;
      ctx.fillStyle = drawColor;
      ctx.lineWidth = 1;

      if (type === 'spectrum' || type === 'combination') {
        analyser.getByteFrequencyData(dataArray);
        const barWidth = (width / bufferLength) * (type === 'combination' ? 1 : 2.5);
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }

      if (type === 'waveform' || type === 'combination') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        if (type === 'combination') {
          ctx.globalAlpha = 0.5;
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [analyser, isDarkMode, type, color]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-80"
      />
    </div>
  );
};
