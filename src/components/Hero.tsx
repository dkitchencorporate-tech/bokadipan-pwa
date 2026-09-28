import { useAuthStore } from '../store/authStore';
import { useI18nStore } from '../store/i18nStore';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function Hero() {
  const { t } = useI18nStore();
  const loyalty = BRAND_CONFIG.loyalty;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6">
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-[#E5DCD0] min-h-[440px] flex items-center bg-[#1A201A]">
        {/* Cinematic Food Photo Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/brand/hero_banner.jpg" 
            alt="BOKADIPAN Horno de Piedra y Pan Rústico"
            className="w-full h-full object-cover object-center brightness-[0.45] sm:brightness-[0.40] scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-transparent sm:w-[75%]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between gap-8 p-6 sm:p-14">
          <div className="w-full sm:w-[68%] space-y-4 sm:space-y-5 text-center sm:text-left">
            {/* Artisan Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#2D5A27]/90 text-[#ECFCCB] text-xs font-display font-black uppercase tracking-widest border border-[#4D7C0F]/50 backdrop-blur-md shadow-lg">
                🌿 {loyalty.badgeText || 'CLUB BOKADI'}
              </span>
              <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#B45309]/80 text-[#FEF3C7] text-xs font-display font-bold uppercase tracking-wider border border-[#D97706]/40 backdrop-blur-md">
                🔥 HORNO DE PIEDRA & AOVE
              </span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.05] uppercase drop-shadow-md">
              PAN RÚSTICO DE AUTOR<br/>
              <span className="text-[#FBBF24] bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#FDE68A] bg-clip-text text-transparent">
                + TAPA Y BEBIDA INCLUIDAS
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#F5F5F4] font-medium leading-relaxed max-w-xl mx-auto sm:mx-0 drop-shadow">
              Bocadillos crujientes de 20cm elaborados con aceite de oliva virgen extra. Cada pedido incluye tu ración de picoteo artesanal y bebida a elección.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4">
              <button
                onClick={() => useAuthStore.getState().openUserModal('register')}
                className="w-full sm:w-auto bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-display font-black px-8 py-4 rounded-2xl text-sm shadow-[0_10px_25px_rgba(45,90,39,0.5)] tracking-wider uppercase transition-all hover:scale-105 border border-[#4D7C0F]"
              >
                🥖 ÚNETE AL CLUB VIP Y CANJEA PREMIOS
              </button>
            </div>
          </div>

          {/* Side Logo Card */}
          <div className="relative w-40 h-40 sm:w-52 sm:h-52 shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#2D5A27]/30 rounded-3xl blur-2xl animate-pulse"></div>
            <div className="relative w-full h-full bg-white/95 backdrop-blur-md rounded-3xl border-2 border-[#E5DCD0] p-6 shadow-2xl flex flex-col items-center justify-center text-center">
              <img
                src={BRAND_CONFIG.assets.logoUrl}
                alt={BRAND_CONFIG.name}
                className="w-full h-auto max-h-20 object-contain drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="mt-2 text-[10px] font-black tracking-widest text-[#2D5A27] uppercase">
                ALCOBENDAS & MADRID
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
