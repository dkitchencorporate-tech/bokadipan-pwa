import React, { useEffect, useState } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

interface PreloaderProps {
  isFading: boolean;
}

const RAIN_ITEMS = [
  { icon: '🥖', left: '8%', delay: '0s', duration: '2.8s', size: 'text-3xl' },
  { icon: '🫒', left: '22%', delay: '0.4s', duration: '3.2s', size: 'text-2xl' },
  { icon: '🌾', left: '38%', delay: '0.2s', duration: '3.0s', size: 'text-3xl' },
  { icon: '🥖', left: '55%', delay: '0.6s', duration: '2.6s', size: 'text-4xl' },
  { icon: '🔥', left: '72%', delay: '0.1s', duration: '3.4s', size: 'text-2xl' },
  { icon: '🫒', left: '88%', delay: '0.5s', duration: '2.9s', size: 'text-3xl' },
  { icon: '🥖', left: '15%', delay: '1.0s', duration: '3.1s', size: 'text-3xl' },
  { icon: '🌾', left: '48%', delay: '0.8s', duration: '2.7s', size: 'text-2xl' },
  { icon: '🥖', left: '80%', delay: '1.2s', duration: '3.3s', size: 'text-4xl' },
  { icon: '✨', left: '30%', delay: '0.3s', duration: '2.5s', size: 'text-xl' },
  { icon: '🫒', left: '64%', delay: '0.9s', duration: '3.0s', size: 'text-2xl' },
];

export default function Preloader({ isFading }: PreloaderProps) {
  const [progress, setProgress] = useState(15);
  const [statusStep, setStatusStep] = useState('🔥 Calentando horno de piedra...');

  useEffect(() => {
    const p1 = setTimeout(() => {
      setProgress(55);
      setStatusStep('🥖 Horneando pan rústico con AOVE...');
    }, 400);

    const p2 = setTimeout(() => {
      setProgress(88);
      setStatusStep('🫒 Preparando ingredientes artesanos...');
    }, 900);

    const p3 = setTimeout(() => {
      setProgress(100);
      setStatusStep('✨ ¡Todo listo para ti!');
    }, 1300);

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
        background: 'radial-gradient(circle at center, #2D5A27 0%, #1A301A 45%, #451A03 85%, #1A0D04 100%)'
      }}
    >
      {/* Animated Floating / Raining Baguettes & Olives */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {RAIN_ITEMS.map((item, idx) => (
          <span
            key={idx}
            className={`absolute ${item.size} filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] animate-fall`}
            style={{
              left: item.left,
              top: '-10%',
              animationDelay: item.delay,
              animationDuration: item.duration,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear'
            }}
          >
            {item.icon}
          </span>
        ))}
      </div>

      {/* Ambient Oven Light Glow */}
      <div className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-[#F59E0B]/20 blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute w-64 h-64 rounded-full bg-[#4D7C0F]/30 blur-2xl animate-spin pointer-events-none" style={{ animationDuration: '12s' }}></div>

      {/* Center Brand Showcase Card */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-sm sm:max-w-md w-full">
        {/* Glow Logo Platter */}
        <div className="relative mb-6 p-6 sm:p-8 bg-white/95 backdrop-blur-md rounded-3xl border-2 border-[#F59E0B]/50 shadow-[0_15px_50px_rgba(0,0,0,0.6)] animate-bounce-subtle">
          <div className="absolute -top-3 -right-3 bg-[#B45309] text-[#FEF3C7] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-[#F59E0B] shadow-md">
            🥖 100% ARTESANO
          </div>
          <img
            src={BRAND_CONFIG.assets.logoUrl}
            alt={BRAND_CONFIG.name}
            className="w-[min(65vw,220px)] h-auto max-h-24 object-contain drop-shadow"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Title & Slogan */}
        <h2 className="text-[#FDFBF7] font-display font-black text-2xl sm:text-3xl tracking-widest uppercase drop-shadow-md">
          {BRAND_CONFIG.name}
        </h2>
        <p className="text-[#ECFCCB] text-xs sm:text-sm font-semibold mt-1 tracking-wide drop-shadow">
          {BRAND_CONFIG.slogan}
        </p>

        {/* Progress Bar */}
        <div className="w-64 sm:w-72 mt-6">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#FDE68A] uppercase tracking-wider mb-2">
            <span>{statusStep}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-[#F59E0B]/40">
            <div
              className="h-full bg-gradient-to-r from-[#F59E0B] via-[#84CC16] to-[#4ADE80] rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(245,158,11,0.8)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          90% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(115vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation-name: fall;
        }
        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
