import React from 'react';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  light?: boolean;
}

export default function BokadipanLogo({ className = "h-10", showTagline = false, light = false }: LogoProps) {
  const textColor = light ? '#FAF6F0' : '#1A201A';
  const accentColor = '#D97706';
  const leafColor = '#2D5A27';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Artisan Baguette & Olive Emblem */}
      <div className="relative w-10 h-10 shrink-0 rounded-2xl bg-[#2D5A27] border-2 border-[#D97706] shadow-md flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 44 44" fill="none" className="w-7 h-7">
          {/* Artisan Baguette */}
          <path d="M 6 28 C 3 22, 8 10, 22 6 C 34 2, 40 8, 38 18 C 36 26, 26 34, 14 34 C 9 34, 7 32, 6 28 Z" fill="#F59E0B" />
          {/* Stone Oven Cuts */}
          <path d="M 13 20 L 18 13" stroke="#FAF6F0" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 20 24 L 26 16" stroke="#FAF6F0" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 28 26 L 33 19" stroke="#FAF6F0" strokeWidth="2.2" strokeLinecap="round" />
          {/* Olive Leaf */}
          <path d="M 32 6 C 36 2, 41 4, 39 9 C 37 13, 32 11, 32 6 Z" fill="#84CC16" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col text-left">
        <div className="font-display font-black text-xl sm:text-2xl leading-none tracking-wider uppercase" style={{ color: textColor }}>
          BOKADI<span style={{ color: accentColor }}>PAN</span>
        </div>
        {showTagline && (
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] mt-0.5" style={{ color: light ? '#EAF2E8' : leafColor }}>
            PAN RÚSTICO &bull; AOVE
          </span>
        )}
      </div>
    </div>
  );
}
