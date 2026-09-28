import { generateSafeUUID } from '../utils/uuid';
import { Product, getProductImageUrl, LOCAL_IMAGE_MAP, DEFAULT_EXTRA_TOPPINGS } from '../data/products';
import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';

interface IngredientsModalProps {
  product: Product;
  onClose: () => void;
}

export default function IngredientsModal({ product, onClose }: IngredientsModalProps) {
  useHardwareBack(true, onClose);
  const { t, tDynamic, lang } = useI18nStore() as any;

  const displayName = lang === 'en' && (product as any).name_en ? (product as any).name_en : tDynamic(product.name);
  const displayDesc = lang === 'en' && (product as any).description_en 
    ? (product as any).description_en 
    : (product.description ? tDynamic(product.description) : product.desc ? tDynamic(product.desc) : '');

  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState('');
  const addItem = useCartStore(state => state.addItem);

  // Comprobar si es un postre para no mostrar toppings salados de patatas (cheddar, jalapeño, bacon, etc.)
  const isDessert = (product.category === 'POSTRES') ||
    ((product as any).category_id === '903e8a8b-6bc4-4dda-b6f8-e1c2911823f2') ||
    /brownie|tarta|helado|postre/i.test(product.name);

  const BASE_PRICE = product.price || 0;
  const unitExtrasCost = selectedExtras.length * 1.00;
  const unitPrice = BASE_PRICE + unitExtrasCost;
  const totalPrice = unitPrice * quantity;

  const toggleExtra = (extra: string) => {
    setSelectedExtras(prev => prev.includes(extra) ? prev.filter(i => i !== extra) : [...prev, extra]);
  };

  const handleAddToCart = () => {
    addItem({
      id: generateSafeUUID(),
      productId: String(product.id),
      name: product.name, // Mantener estrictamente el nombre de la ración seleccionada
      price: unitPrice,
      quantity,
      extras: selectedExtras,
      notes: itemNotes.trim()
    });
    onClose();
  };

  const fallback = `data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='540' viewBox='0 0 800 540'><rect width='800' height='540' fill='%23FAFAFA'/><text x='400' y='260' font-size='28' font-family='sans-serif' font-weight='800' fill='%23F59E0B' text-anchor='middle' dominant-baseline='middle'>${encodeURIComponent(product.name)}</text></svg>`;
  const imageSrc = getProductImageUrl(product) || LOCAL_IMAGE_MAP[product.name] || fallback;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in text-brand-ink">
      <div className="bg-white border border-gray-200 rounded-t-[2rem] sm:rounded-3xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl relative animate-slide-up overflow-hidden">
        
        {/* Cabecera con Foto del Producto */}
        <div className="relative h-48 sm:h-56 shrink-0 bg-brand-surface border-b border-gray-200 overflow-hidden">
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const localFallback = LOCAL_IMAGE_MAP[product.name];
              if (localFallback && !e.currentTarget.src.endsWith(localFallback)) {
                e.currentTarget.src = localFallback;
              } else {
                e.currentTarget.src = fallback;
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"></div>

          {/* Badge sobre la foto */}
          {(() => {
            const rawBadge = product.badge || (product as any).customization_schema?.badge || product.name;
            if (!rawBadge) return null;
            return (
              <span className="absolute top-4 left-4 z-10 bg-white/95 border border-brand-primary text-brand-ink font-display font-black text-xs uppercase tracking-wider px-3 py-1 rounded-xl shadow-lg leading-none">
                {tDynamic(rawBadge)}
              </span>
            );
          })()}

          {/* Botón cerrar */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar bg-white">
          
          {/* Título de la Ración y Descripción Oficial */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display font-black text-2xl sm:text-3xl text-[#1A201A] uppercase tracking-wide leading-tight">
                {displayName}
              </h2>
              <span className="font-display font-black text-[#2D5A27] text-xl sm:text-2xl shrink-0 whitespace-nowrap">
                {BASE_PRICE.toFixed(2).replace('.', ',')}&nbsp;€
              </span>
            </div>
            {displayDesc && (
              <p className="text-[#5C6B5C] text-sm leading-relaxed mt-1.5 font-medium">
                {displayDesc}
              </p>
            )}
          </div>

          {/* Sección de Toppings / Extras (Solo si no es postre) */}
          {!isDessert && (
            <div className="space-y-3 pt-3 border-t border-[#E5DCD0]/60">
              <div className="flex items-center justify-between">
                <label className="text-[#1A201A] font-display font-black uppercase tracking-wider text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2D5A27] inline-block"></span>
                  {t('add_extra_ingredients') || 'Añadir Toppings Extras (+1,00 €/ud)'}
                </label>
                {selectedExtras.length > 0 && (
                  <span className="text-[11px] font-bold text-[#2D5A27] bg-[#EAF2E8] px-2 py-0.5 rounded-md whitespace-nowrap border border-[#2D5A27]/20">
                    +{(selectedExtras.length * 1.00).toFixed(2).replace('.', ',')}&nbsp;€
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {DEFAULT_EXTRA_TOPPINGS.map(extra => {
                  const isSel = selectedExtras.includes(extra);
                  return (
                    <button
                      key={extra}
                      type="button"
                      onClick={() => toggleExtra(extra)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-[#2D5A27] text-white border-[#1E3D1A] shadow-md scale-[1.02]'
                          : 'bg-[#FAF6F0] text-[#1A201A] border-[#E5DCD0] hover:border-[#2D5A27] hover:bg-white'
                      }`}
                    >
                      <span className="font-black">{isSel ? '✓' : '+'}</span>
                      <span>{tDynamic(extra)}</span>
                      <span className={`text-[10px] px-1 rounded font-black ${isSel ? 'bg-black/20 text-white' : 'text-[#2D5A27]'}`}>
                        +1€
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sección de Notas para Cocina */}
          <div className="space-y-2 pt-3 border-t border-[#E5DCD0]/60">
            <label className="text-[#1A201A] font-display font-black uppercase tracking-wider text-xs flex items-center gap-2">
              <span>📝</span>
              <span>{t('special_notes') || 'Instrucciones o notas para cocina'}</span>
            </label>
            <input
              type="text"
              placeholder="Ej. pan muy tostado, sin cebolla, salsa aparte..."
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              className="w-full bg-[#FAF6F0] border border-[#E5DCD0] rounded-xl px-4 py-3 text-sm text-[#1A201A] placeholder-gray-400 focus:border-[#2D5A27] focus:bg-white outline-none transition-all font-medium"
            />
          </div>

        </div>

        {/* Footer: Selector de Cantidad y Botón Añadir */}
        <div className="p-4 sm:p-5 border-t border-[#E5DCD0] bg-white flex items-center justify-between gap-3 shrink-0">
          {/* Selector de cantidad */}
          <div className="flex items-center bg-[#FAF6F0] border border-[#E5DCD0] rounded-2xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-[#1A201A] hover:bg-[#EAF2E8] font-black text-lg disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-90 transition-all border border-[#E5DCD0]"
            >
              -
            </button>
            <span className="w-9 text-center font-display font-black text-base text-[#1A201A]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-[#1A201A] hover:bg-[#EAF2E8] font-black text-lg shadow-sm active:scale-90 transition-all border border-[#E5DCD0]"
            >
              +
            </button>
          </div>

          {/* Botón Añadir con Precio Total */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-display font-black py-3.5 px-5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-between shadow-[0_8px_20px_rgba(45,90,39,0.35)] active:scale-95 border border-[#4D7C0F]"
          >
            <span>{t('add_to_order') || 'Añadir al pedido'}</span>
            <span className="bg-black/20 px-2.5 py-1 rounded-xl font-mono text-sm sm:text-base whitespace-nowrap">
              {totalPrice.toFixed(2).replace('.', ',')}&nbsp;€
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
