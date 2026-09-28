import { generateSafeUUID } from '../utils/uuid';
import { useState, useEffect } from 'react';
import { useI18nStore } from '../store/i18nStore';
import { useCartStore } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';

interface SubcategoryModalProps {
  productGroup: any;
  onClose: () => void;
}

export default function SubcategoryModal({ productGroup, onClose }: SubcategoryModalProps) {
  useHardwareBack(true, onClose);
  const { t, tDynamic, lang } = useI18nStore() as any;
  const addItem = useCartStore(state => state.addItem);

  // State to track quantities per sub-product ID
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    (productGroup.subProducts || []).forEach((p: any) => {
      initial[p.id] = 1;
    });
    return initial;
  });

  // State to give visual feedback when adding to cart
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const displayName = lang === 'en' && productGroup.name_en ? productGroup.name_en : tDynamic(productGroup.name);
  const displayDesc = lang === 'en' && productGroup.description_en ? productGroup.description_en : tDynamic(productGroup.description);

  const handleQuantityChange = (id: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = (subProd: any) => {
    const qty = quantities[subProd.id] || 1;
    addItem({
      id: generateSafeUUID(),
      productId: subProd.id,
      name: subProd.name,
      price: subProd.price,
      quantity: qty,
      notes: ''
    });

    setAddedIds(prev => ({ ...prev, [subProd.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [subProd.id]: false }));
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white border-2 border-[#E5DCD0] sm:rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl relative animate-slide-up rounded-t-[2rem] overflow-hidden text-[#1A201A]">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#2D5A27]/15 via-[#B45309]/10 to-[#FAF6F0] border-b border-[#E5DCD0] p-5 rounded-t-[2rem] sm:rounded-t-3xl z-10 flex justify-between items-center shrink-0">
          <div>
            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-[#2D5A27] block mb-0.5">
              {t('select_beverages') || 'SELECCIONA TUS BEBIDAS'}
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-black text-[#1A201A] uppercase tracking-wider">{displayName}</h2>
            {displayDesc && <p className="text-[#5C6B5C] text-xs mt-0.5">{displayDesc}</p>}
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white hover:bg-[#FAF6F0] rounded-2xl flex items-center justify-center text-gray-500 hover:text-[#1A201A] transition-colors border border-[#E5DCD0]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de Bebidas Limpia y Rápida con disposición vertical */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 no-scrollbar bg-[#FAF6F0]">
          {(productGroup.subProducts || []).map((subProd: any) => {
            const qty = quantities[subProd.id] || 1;
            const isAdded = addedIds[subProd.id];
            const itemPrice = subProd.price || 0;
            const subProdName = lang === 'en' && subProd.name_en ? subProd.name_en : tDynamic(subProd.name);
            const isSubAvailable = subProd.is_available !== false;

            return (
              <div 
                key={subProd.id}
                className={`border-2 rounded-2xl p-4 flex flex-col gap-3 transition-all shadow-sm ${
                  !isSubAvailable 
                    ? 'bg-zinc-50 border-zinc-200 opacity-60' 
                    : 'bg-white border-[#E5DCD0] hover:border-[#2D5A27]'
                }`}
              >
                {/* Fila superior: Título completo visible y Precio destacado */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-display font-black text-base sm:text-lg leading-tight break-words ${isSubAvailable ? 'text-[#1A201A]' : 'text-zinc-500'}`}>
                        {subProdName}
                      </h3>
                      {!isSubAvailable && (
                        <span className="bg-zinc-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          {lang === 'en' ? 'OUT OF STOCK' : 'AGOTADO'}
                        </span>
                      )}
                    </div>
                    {subProd.badge && isSubAvailable && (
                      <span className="inline-block mt-1 bg-[#2D5A27]/10 border border-[#2D5A27]/30 text-[#2D5A27] text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        {tDynamic(subProd.badge)}
                      </span>
                    )}
                  </div>
                  <span className="font-display font-black text-[#2D5A27] text-lg sm:text-xl shrink-0 whitespace-nowrap">
                    {itemPrice.toFixed(2).replace('.', ',')}&nbsp;€
                  </span>
                </div>

                {/* Fila inferior: Contador de cantidad a la izquierda y Botón Añadir ancho a la derecha */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E5DCD0]/60">
                  {/* Selector - 1 + */}
                  <div className="flex items-center bg-[#FAF6F0] border border-[#E5DCD0] rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => handleQuantityChange(subProd.id, -1)}
                      disabled={!isSubAvailable}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-[#1A201A] hover:bg-[#EAF2E8] font-black text-base active:scale-90 transition-all border border-[#E5DCD0] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-display font-black text-sm text-[#1A201A]">
                      {qty}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(subProd.id, 1)}
                      disabled={!isSubAvailable}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-[#1A201A] hover:bg-[#EAF2E8] font-black text-base active:scale-90 transition-all border border-[#E5DCD0] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>

                  {/* Botón Añadir */}
                  <button
                    onClick={() => isSubAvailable && handleAddToCart(subProd)}
                    disabled={!isSubAvailable}
                    className={`flex-1 font-display font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md ${
                      !isSubAvailable
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                        : isAdded
                        ? 'bg-green-700 text-white active:scale-95'
                        : 'bg-[#2D5A27] hover:bg-[#1E3D1A] text-white active:scale-95 border border-[#4D7C0F]'
                    }`}
                  >
                    {!isSubAvailable ? (
                      <span>{lang === 'en' ? 'OUT OF STOCK' : 'AGOTADO'}</span>
                    ) : isAdded ? (
                      <>
                        <span>✓</span>
                        <span>{t('added') || 'AÑADIDO'}</span>
                      </>
                    ) : (
                      <>
                        <span>+</span>
                        <span>{t('add_item') || 'AÑADIR AL PEDIDO'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-gradient-to-r from-brand-primary to-brand-primaryHover hover:brightness-110 text-white font-display font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(245,158,11,0.3)] text-center active:scale-95"
          >
            {t('ready') || 'LISTO'}
          </button>
        </div>

      </div>
    </div>
  );
}
