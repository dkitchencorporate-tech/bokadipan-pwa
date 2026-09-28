import React from 'react';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  light?: boolean;
}

export default function BokadipanLogo({ className = "h-10", showTagline = false, light = false }: LogoProps) {
  const textColor = light ? '#F8F4EC' : '#141A14';
  const goldAccent = '#C88A35';
  const deepForest = light ? '#E6EFE4' : '#1B3818';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* High-End Artisan Bakery Insignia */}
      <div className="relative w-10 h-10 shrink-0 rounded-2xl bg-[#1B3818] border-2 border-[#C88A35] shadow-md flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 48 48" fill="none" className="w-7 h-7">
          {/* Wheat Ear / Espigas Top Right & Left */}
          <path d="M 24 10 C 26 14, 30 15, 34 14 C 32 18, 33 22, 36 24" stroke="#C88A35" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 24 10 C 22 14, 18 15, 14 14 C 16 18, 15 22, 12 24" stroke="#C88A35" strokeWidth="1.6" strokeLinecap="round" />
          
          {/* Artisan Stone-Oven Loaf (Hogaza / Bocadillo Rústico) */}
          <ellipse cx="24" cy="27" rx="14" ry="10" fill="#C88A35" />
          <ellipse cx="24" cy="27" rx="13" ry="9" fill="#9C5B18" />
          
          {/* Score Marks / Cortes de Obrador al Horno */}
          <path d="M 16 24 Q 18 28 20 32" stroke="#F8F4EC" strokeWidth="2" strokeLinecap="round" />
          <path d="M 22 22 Q 24 27 26 32" stroke="#F8F4EC" strokeWidth="2" strokeLinecap="round" />
          <path d="M 28 24 Q 30 28 32 32" stroke="#F8F4EC" strokeWidth="2" strokeLinecap="round" />
          
          {/* Olive Leaf Centerpiece */}
          <path d="M 24 6 C 26 8, 26 12, 24 14 C 22 12, 22 8, 24 6 Z" fill="#4ADE80" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col text-left">
        <div className="font-display font-black text-xl sm:text-2xl leading-none tracking-tight uppercase" style={{ color: textColor }}>
          BOKADI<span style={{ color: goldAccent }}>PAN</span>
        </div>
        {showTagline && (
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] mt-1" style={{ color: deepForest }}>
            PAN RÚSTICO &bull; HORNO DE PIEDRA
          </span>
        )}
      </div>
    </div>
  );
}
