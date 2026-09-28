import React, { useEffect, useState } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig';

interface PreloaderProps {
  isFading: boolean;
}

const RAIN_ITEMS = [
  { icon: '🥖', left: '6%', delay: '0s', duration: '3.2s', size: 'text-3xl' },
  { icon: '🫒', left: '20%', delay: '0.4s', duration: '3.6s', size: 'text-2xl' },
  { icon: '🌾', left: '35%', delay: '0.2s', duration: '3.4s', size: 'text-3xl' },
  { icon: '🥖', left: '52%', delay: '0.7s', duration: '3.0s', size: 'text-4xl' },
  { icon: '🔥', left: '68%', delay: '0.1s', duration: '3.8s', size: 'text-2xl' },
  { icon: '🫒', left: '84%', delay: '0.5s', duration: '3.3s', size: 'text-3xl' },
  { icon: '🥖', left: '12%', delay: '1.2s', duration: '3.5s', size: 'text-3xl' },
  { icon: '🌾', left: '44%', delay: '0.9s', duration: '3.1s', size: 'text-2xl' },
  { icon: '🥖', left: '76%', delay: '1.4s', duration: '3.7s', size: 'text-4xl' },
  { icon: '✨', left: '28%', delay: '0.3s', duration: '2.8s', size: 'text-xl' },
  { icon: '🫒', left: '92%', delay: '1.0s', duration: '3.4s', size: 'text-2xl' },
];

export default function Preloader({ isFading }: PreloaderProps) {
  const [progress, setProgress] = useState(20);
  const [statusStep, setStatusStep] = useState('🔥 Horno de piedra a 300°C...');

  useEffect(() => {
    const p1 = setTimeout(() => {
      setProgress(50);
      setStatusStep('🥖 Horneando pan rústico con AOVE...');
    }, 500);

    const p2 = setTimeout(() => {
      setProgress(85);
      setStatusStep('🫒 Montando bocadillos gourmet...');
    }, 1100);

    const p3 = setTimeout(() => {
      setProgress(100);
      setStatusStep('✨ ¡Listo para llevar a tu mesa!');
    }, 1700);

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
        background: 'radial-gradient(circle at center, #2D5A27 0%, #1A301A 40%, #451A03 80%, #150903 100%)'
      }}
    >
      {/* Animated Raining Baguettes & Olives */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {RAIN_ITEMS.map((item, idx) => (
          <span
            key={idx}
            className={`absolute ${item.size} filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)] animate-fall`}
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

      {/* Ambient Halo & Aura */}
      <div className="absolute w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full bg-[#F59E0B]/25 blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute w-64 h-64 rounded-full bg-[#4D7C0F]/35 blur-2xl animate-spin pointer-events-none" style={{ animationDuration: '14s' }}></div>

      {/* Center Brand Platter */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-sm sm:max-w-md w-full">
        {/* Emblem Platter with Gold Border and Baguette Icon */}
        <div className="relative mb-6 p-7 sm:p-9 bg-[#FAF6F0] rounded-[2.5rem] border-4 border-[#D97706] shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center">
          <div className="absolute -top-3.5 bg-[#B45309] text-[#FEF3C7] text-[10px] sm:text-xs font-display font-black uppercase tracking-widest px-4 py-1.5 rounded-full border-2 border-[#F59E0B] shadow-lg">
            🥖 100% ARTESANAL &bull; AOVE
          </div>

          {/* Large SVG Center Emblem */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#2D5A27] border-2 border-[#D97706] flex items-center justify-center shadow-inner mb-3">
            <svg viewBox="0 0 44 44" fill="none" className="w-14 h-14 sm:w-16 sm:h-16">
              <path d="M 6 28 C 3 22, 8 10, 22 6 C 34 2, 40 8, 38 18 C 36 26, 26 34, 14 34 C 9 34, 7 32, 6 28 Z" fill="#F59E0B" />
              <path d="M 13 20 L 18 13" stroke="#FAF6F0" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M 20 24 L 26 16" stroke="#FAF6F0" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M 28 26 L 33 19" stroke="#FAF6F0" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M 32 6 C 36 2, 41 4, 39 9 C 37 13, 32 11, 32 6 Z" fill="#84CC16" />
            </svg>
          </div>

          <div className="font-display font-black text-2xl sm:text-3xl text-[#1A201A] tracking-wider uppercase">
            BOKADI<span className="text-[#D97706]">PAN</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-black tracking-[0.25em] text-[#2D5A27] uppercase mt-0.5">
            PAN RÚSTICO &bull; HORNO DE PIEDRA
          </p>
        </div>

        {/* Title & Slogan */}
        <p className="text-[#ECFCCB] text-xs sm:text-sm font-semibold tracking-wide drop-shadow-md max-w-xs mx-auto">
          {BRAND_CONFIG.slogan}
        </p>

        {/* Progress Bar */}
        <div className="w-64 sm:w-80 mt-6">
          <div className="flex justify-between items-center text-[11px] sm:text-xs font-bold text-[#FDE68A] uppercase tracking-wider mb-2">
            <span>{statusStep}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-black/50 rounded-full overflow-hidden p-0.5 border border-[#F59E0B]/50 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#F59E0B] via-[#84CC16] to-[#4ADE80] rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(245,158,11,0.9)]"
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
            opacity: 0.95;
          }
          90% {
            opacity: 0.95;
          }
          100% {
            transform: translateY(115vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation-name: fall;
        }
      `}</style>
    </div>
  );
}
