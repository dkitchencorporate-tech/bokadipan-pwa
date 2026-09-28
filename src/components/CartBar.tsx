import { useCartStore } from '../store/cartStore';
import { useI18nStore } from '../store/i18nStore';

interface CartBarProps {
  onOpenUpsell: () => void;
}

export default function CartBar({ onOpenUpsell }: CartBarProps) {
  const items = useCartStore(state => state.items);
  const getTotal = useCartStore(state => state.getTotal);
  const { t } = useI18nStore();
  
  if (items.length === 0) return null;

  const total = getTotal();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div 
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1A201A]/95 backdrop-blur-xl border border-[#4D7C0F]/60 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(45,90,39,0.35)] flex items-center justify-between p-2 pl-3 sm:pl-4 cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all w-[calc(100%-2rem)] max-w-[430px]"
      onClick={onOpenUpsell}
    >
      {/* Left: Cart info & Price */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Cart icon with badge */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#2D5A27] shadow-[0_0_15px_rgba(45,90,39,0.5)] flex items-center justify-center border border-[#4D7C0F]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 bg-[#B45309] text-white font-black text-[10px] sm:text-[11px] min-w-[19px] h-[19px] flex items-center justify-center rounded-full border-2 border-[#1A201A] px-1 shadow-md">
            {totalItems}
          </span>
        </div>

        {/* Price & item count text */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#ECFCCB] uppercase tracking-widest leading-none truncate">
            {totalItems === 1 ? '1 BOKADI' : `${totalItems} PRODUCTOS`}
          </span>
          <span className="font-display font-black text-xl sm:text-2xl text-white leading-tight mt-0.5 whitespace-nowrap">
            {total.toFixed(2).replace('.', ',')}&nbsp;€
          </span>
        </div>
      </div>

      {/* Right: Tramitar CTA Button */}
      <div className="flex items-center gap-2 bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-[0_4px_15px_rgba(45,90,39,0.45)] whitespace-nowrap shrink-0 transition-transform active:scale-95 border border-[#4D7C0F]">
        <span>{t('process_order') || 'Tramitar'}</span>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  );
}
