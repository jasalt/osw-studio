'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * AudioSpectrogram — draws live FFT bars from a recording AnalyserNode.
 * Purely visual feedback while the mic is capturing.
 */
export function AudioSpectrogram({
  analyser,
  className,
}: {
  analyser: AnalyserNode | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const barW = w / bins;
      for (let i = 0; i < bins; i++) {
        const v = data[i] / 255;
        const barH = Math.max(2, v * h);
        // primary accent, brighter with level
        ctx.fillStyle = `rgba(255, 91, 30, ${0.3 + v * 0.7})`;
        ctx.fillRect(i * barW, (h - barH) / 2, Math.max(1, barW - 1), barH);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={28}
      className={cn('h-7 w-full', className)}
    />
  );
}
