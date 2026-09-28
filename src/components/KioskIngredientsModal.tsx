import { useState } from 'react';
import { DEFAULT_EXTRA_TOPPINGS, Product, getProductImageUrl, LOCAL_IMAGE_MAP } from '../data/products';
import { CartItem } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';

const fallbackImg = '/assets/placeholder-food.svg';

interface IngredientsModalProps {
  product: Product;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, 'id'>) => void;
}

// Personalizador genérico (TPV Mostrador): extras/toppings + notas especiales.
export default function KioskIngredientsModal({ product, onClose, onAdd }: IngredientsModalProps) {
  useHardwareBack(true, onClose);
  const { t, tDynamic } = useI18nStore() as any;
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState('');

  const BASE_PRICE = product.price;
  const extrasCost = selectedExtras.length * 1.00;
  const finalPrice = BASE_PRICE + extrasCost;

  const toggleExtra = (extra: string) => {
    setSelectedExtras(prev => prev.includes(extra) ? prev.filter(i => i !== extra) : [...prev, extra]);
  };

  const handleAddToCart = () => {
    const extrasText = selectedExtras.length > 0 ? ` + ${selectedExtras.join(', ')}` : '';
    onAdd({
      productId: product.id,
      name: `${product.name}${extrasText}`,
      price: finalPrice,
      quantity: 1,
      extras: selectedExtras,
      notes: itemNotes,
      size: 'normal'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="relative bg-[#14141E] border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        <div className="relative h-40 sm:h-56 shrink-0 border-b border-zinc-800 bg-[#0A0A0E]">
          {getProductImageUrl(product) ? (
            <img
              src={getProductImageUrl(product)}
              alt={product.name}
              className="w-full h-full object-cover opacity-70 mix-blend-lighten"
              onError={(e) => {
                const localFallback = LOCAL_IMAGE_MAP[product.name];
                if (localFallback && !e.currentTarget.src.endsWith(localFallback)) {
                  e.currentTarget.src = localFallback;
                } else {
                  e.currentTarget.style.display = 'none';
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img src={fallbackImg} alt="" className="h-1/2 opacity-20 object-contain" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#14141E] via-transparent to-black/50"></div>

          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="text-white hover:text-brand-primary transition-colors bg-black/50 hover:bg-black/80 p-2 rounded-xl backdrop-blur-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="absolute bottom-4 left-4 sm:left-6 right-4">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-wider flex items-center gap-2 sm:gap-3 drop-shadow-xl">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-primary rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)] shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <span className="truncate">{t('custom_taste')}</span>
            </h2>
            <p className="text-gray-300 mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium drop-shadow-md pr-2">{t('config_ingredients')}</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {selectedExtras.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h4 className="text-zinc-400 text-xs font-bold uppercase mb-3">{t('add_extra_ingredients')}</h4>
              <div className="flex flex-wrap gap-2">
                {selectedExtras.map(i => (
                  <span key={i} className="text-xs bg-brand-primary/20 text-brand-primary px-2 py-1 rounded-md border border-brand-primary/30">{tDynamic(i)}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-white font-bold mb-2 uppercase tracking-wider text-sm flex items-center gap-2">📝 {t('special_notes')}</label>
            <input
              type="text"
              placeholder={t('special_notes_placeholder')}
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-primary outline-none"
            />
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-white font-bold uppercase text-lg">{product.name}</h4>
              <span className="text-brand-primary font-bold text-lg">{BASE_PRICE.toFixed(2).replace('.', ',')}€</span>
            </div>
            <p className="text-sm text-gray-400">
              {product.description ? tDynamic(product.description) : product.desc ? tDynamic(product.desc) : ''}
            </p>
          </div>

          <section>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="bg-brand-primary w-2 h-2 rounded-full inline-block"></span>
              {t('add_extra_ingredients')}
            </h3>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_EXTRA_TOPPINGS.map(extra => {
                const isSel = selectedExtras.includes(extra);
                return (
                  <button
                    key={extra}
                    onClick={() => toggleExtra(extra)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      isSel
                        ? 'bg-brand-primary text-white border-brand-accent shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-zinc-900 text-gray-300 border-zinc-800 hover:border-brand-primary/50 hover:bg-zinc-800'
                    }`}
                  >
                    {tDynamic(extra)}
                    {isSel && <span className="ml-2 bg-black/20 px-1.5 rounded text-xs">+1€</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-[#0A0A0E] flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-bold">{t('total_product')}</div>
            <div className="text-white font-display font-black text-2xl">
              {finalPrice.toFixed(2).replace('.', ',')} €
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            className="px-8 py-4 rounded-2xl font-display font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-primaryHover hover:brightness-110 text-white shadow-lg"
          >
            {t('add_to_order')} <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
