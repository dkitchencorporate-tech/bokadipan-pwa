import { generateSafeUUID } from '../utils/uuid';
import { useState } from 'react';
import { Product } from '../data/products';
import { useCartStore } from '../store/cartStore';
import { useI18nStore } from '../store/i18nStore';
import { useHardwareBack } from '../utils/useHardwareBack';

interface SauceModalProps {
  product: Product;
  onClose: () => void;
}

const SAUCES = [
  { id: 'cheddar', name: 'Salsa Cheddar', description: 'Cheddar fundido cremoso de autor', extraCost: 0 },
  { id: 'bbq', name: 'Salsa BBQ', description: 'Barbacoa ahumada dulce y especiada', extraCost: 0 },
  { id: 'ajo_perejil', name: 'Ajo y Perejil', description: 'Alioli suave emulsionado con perejil fresco', extraCost: 0 },
];

export default function SauceModal({ product, onClose }: SauceModalProps) {
  useHardwareBack(true, onClose);

  const [selectedSauce, setSelectedSauce] = useState<string | null>('cheddar');
  const [notes, setNotes] = useState('');
  const addItem = useCartStore(state => state.addItem);
  const { t, tDynamic } = useI18nStore();

  const sauceObject = SAUCES.find(s => s.id === selectedSauce) || SAUCES[0];
  const basePrice = product.price > 0 ? product.price : 2.00;
  const finalPrice = basePrice + (sauceObject?.extraCost || 0);

  const handleAddToCart = () => {
    if (!sauceObject) return;

    const itemName = `${product.name} (${tDynamic(sauceObject.name)})`;
    const itemNotes = notes.trim() ? `${t('notes_label') || 'Notas'}: ${notes.trim()}` : undefined;

    addItem({
      id: generateSafeUUID(),
      productId: product.id,
      name: itemNotes ? `${itemName} - ${itemNotes}` : itemName,
      price: finalPrice,
      quantity: 1,
      extras: [sauceObject.name]
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh] text-brand-ink">
        {/* Header */}
        <div className="p-5 pt-6 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-zinc-100 via-zinc-50 to-transparent relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-zinc-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-xl transition-all z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <span className="text-[10px] font-display font-bold uppercase tracking-widest text-zinc-600 block mb-1">
            {t('choose_sauce') || 'OPCIONES Y COMPLEMENTOS'}
          </span>
          <h2 className="font-display font-black text-2xl text-brand-ink uppercase tracking-wider pr-10">{tDynamic(product.name)}</h2>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">Selecciona las opciones para acompañar tu pedido <span className="whitespace-nowrap font-semibold">({basePrice.toFixed(2).replace('.', ',')}&nbsp;€)</span></p>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Sauces Selection */}
          <div>
            <h3 className="text-brand-ink font-bold mb-3 uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="bg-zinc-800 w-2 h-2 rounded-full inline-block"></span>
              Variedades Disponibles
            </h3>
            <div className="space-y-2.5">
              {SAUCES.map(sauce => {
                const isSelected = selectedSauce === sauce.id;
                return (
                  <button
                    key={sauce.id}
                    onClick={() => setSelectedSauce(sauce.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-md shadow-zinc-900/20' 
                        : 'bg-zinc-50 border-gray-200 text-zinc-900 hover:border-zinc-400 hover:bg-zinc-100'
                    }`}
                  >
                    <div>
                      <div className={`font-display font-black text-sm uppercase tracking-wide ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                        {sauce.name}
                      </div>
                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                        {sauce.description}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-white bg-white text-zinc-900' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-zinc-900"></div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-brand-ink font-bold mb-2 uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="bg-gray-400 w-2 h-2 rounded-full inline-block"></span>
              {t('additional_notes') || 'Instrucciones especiales'}
            </h3>
            <textarea
              className="w-full bg-zinc-50 border border-gray-200 rounded-xl p-3.5 text-zinc-900 text-xs sm:text-sm focus:outline-none focus:border-zinc-900 transition-colors placeholder:text-gray-400"
              placeholder={t('sauce_notes_placeholder') || 'Ej: Sin cebolla, salsa aparte...'}
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            ></textarea>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total</span>
            <div className="text-brand-ink font-display font-black text-2xl whitespace-nowrap">
              {finalPrice.toFixed(2).replace('.', ',')}&nbsp;€
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            className="px-6 py-3.5 rounded-2xl font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-900/20 active:scale-95"
          >
            <span>{t('add_btn') || 'Añadir al Pedido'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
