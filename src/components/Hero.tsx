import { useAuthStore } from '../store/authStore';
import { useI18nStore } from '../store/i18nStore';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function Hero() {
  const { t } = useI18nStore();
  const loyalty = BRAND_CONFIG.loyalty;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6">
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-[#DFD3C1] min-h-[400px] sm:min-h-[440px] flex items-center bg-[#141A14]">
        {/* Cinematic Food Photo Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/brand/hero_banner.jpg" 
            alt="BOKADIPAN Horno de Piedra y Pan Rústico"
            className="w-full h-full object-cover object-center brightness-[0.40] sm:brightness-[0.38] scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent sm:w-[80%]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 w-full max-w-3xl p-6 sm:p-14 text-center sm:text-left space-y-4 sm:space-y-6">
          {/* Artisan Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1B3818]/90 text-[#E6EFE4] text-xs font-display font-black uppercase tracking-widest border border-[#C88A35]/40 backdrop-blur-md shadow-lg">
              🌿 {loyalty.badgeText || 'CLUB BOKADI'}
            </span>
            <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#9A5B1E]/90 text-[#FEF3C7] text-xs font-display font-bold uppercase tracking-wider border border-[#C88A35]/40 backdrop-blur-md">
              🔥 HORNO DE PIEDRA & AOVE
            </span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08] uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
            PAN RÚSTICO DE AUTOR<br/>
            <span className="text-[#FDE047] drop-shadow-[0_4px_20px_rgba(0,0,0,1)]">
              AL HORNO DE PIEDRA
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#F8F4EC] font-medium leading-relaxed max-w-xl mx-auto sm:mx-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Bocadillos crujientes de 20cm elaborados con pan recién horneado a la piedra y los mejores ingredientes selectos regados con auténtico aceite de oliva virgen extra.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4">
            <button
              onClick={() => useAuthStore.getState().openUserModal('register')}
              className="w-full sm:w-auto bg-[#1B3818] hover:bg-[#122810] text-white font-display font-black px-8 py-4 rounded-2xl text-xs sm:text-sm shadow-[0_10px_25px_rgba(27,56,24,0.6)] tracking-wider uppercase transition-all hover:scale-105 border border-[#C88A35]"
            >
              🥖 ÚNETE AL CLUB VIP Y CANJEA PREMIOS
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
