import React, { useEffect, useState } from 'react';

interface PreloaderProps {
  isFading: boolean;
}

export default function Preloader({ isFading }: PreloaderProps) {
  const [progress, setProgress] = useState(25);
  const [statusStep, setStatusStep] = useState('Encendiendo el horno de piedra...');

  useEffect(() => {
    const p1 = setTimeout(() => {
      setProgress(60);
      setStatusStep('Horneando pan rústico artesanal...');
    }, 400);

    const p2 = setTimeout(() => {
      setProgress(90);
      setStatusStep('Preparando ingredientes selectos...');
    }, 900);

    const p3 = setTimeout(() => {
      setProgress(100);
      setStatusStep('¡Carta lista!');
    }, 1400);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-all duration-700 select-none ${
        isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at center, #1B3818 0%, #122210 50%, #0A1209 100%)'
      }}
    >
      {/* Subtle Warm Glow */}
      <div className="absolute w-96 h-96 rounded-full bg-[#C88A35]/15 blur-3xl pointer-events-none"></div>

      {/* Minimalist Gourmet Brand Typography */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-sm sm:max-w-md w-full space-y-5">
        
        {/* Typographic Identity */}
        <div className="space-y-1">
          <div className="font-display font-black text-4xl sm:text-5xl text-[#F8F4EC] tracking-tight uppercase">
            BOKADI<span className="text-[#C88A35]">PAN</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-black tracking-[0.3em] text-[#A3B89E] uppercase">
            PAN RÚSTICO &bull; HORNO DE PIEDRA
          </p>
        </div>

        {/* Minimalist Progress Line */}
        <div className="w-56 sm:w-64 pt-4 space-y-2">
          <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold text-[#E6EFE4] uppercase tracking-wider">
            <span className="truncate pr-2">{statusStep}</span>
            <span className="text-[#C88A35] shrink-0 font-mono font-black">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden p-0.5 border border-[#C88A35]/30">
            <div
              className="h-full bg-gradient-to-r from-[#C88A35] to-[#FDE047] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
