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
      className="fixed bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 mx-auto z-50 bg-[#141A14]/95 backdrop-blur-xl border border-[#C88A35]/50 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(27,56,24,0.35)] flex items-center justify-between p-2 pl-3.5 sm:pl-4 cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all max-w-[430px] w-auto"
      onClick={onOpenUpsell}
    >
      {/* Left: Cart info & Price */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
        {/* Cart icon with badge */}
        <div className="relative shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#1B3818] shadow-[0_0_15px_rgba(27,56,24,0.5)] flex items-center justify-center border border-[#C88A35]">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 bg-[#C88A35] text-white font-black text-[9px] sm:text-[11px] min-w-[18px] h-[18px] sm:min-w-[19px] sm:h-[19px] flex items-center justify-center rounded-full border-2 border-[#141A14] px-0.5 shadow-md">
            {totalItems}
          </span>
        </div>

        {/* Price & item count text */}
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] sm:text-[11px] font-bold text-[#E6EFE4] uppercase tracking-widest leading-none truncate">
            {totalItems === 1 ? '1 BOKADI' : `${totalItems} ARTÍCULOS`}
          </span>
          <span className="font-display font-black text-lg sm:text-2xl text-white leading-tight mt-0.5 whitespace-nowrap">
            {total.toFixed(2).replace('.', ',')}&nbsp;€
          </span>
        </div>
      </div>

      {/* Right: Tramitar CTA Button */}
      <div className="flex items-center gap-1.5 sm:gap-2 bg-[#1B3818] hover:bg-[#122810] text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-[0_4px_15px_rgba(27,56,24,0.45)] whitespace-nowrap shrink-0 transition-transform active:scale-95 border border-[#C88A35]">
        <span>{t('process_order') || 'Tramitar'}</span>
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  );
}
