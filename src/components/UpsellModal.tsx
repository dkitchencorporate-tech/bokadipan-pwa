import { generateSafeUUID } from '../utils/uuid';
import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useCartStore } from '../store/cartStore';
import { useI18nStore } from '../store/i18nStore';

interface UpsellModalProps {
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export default function UpsellModal({ onClose, onProceedToCheckout }: UpsellModalProps) {
  const addItem = useCartStore(state => state.addItem);
  const { t, tDynamic } = useI18nStore();
  useHardwareBack(true, onClose);
  const [isLoading, setIsLoading] = useState(true);
  const [upsellsData, setUpsellsData] = useState<any[]>([]);
  const [addedItems, setAddedItems] = useState<number[]>([]);

  // Simulated shuffle just toggles re-render or re-fetches for now
  const [shuffleKey, setShuffleKey] = useState(0);

  useEffect(() => {
    fetchUpsells();
  }, [shuffleKey]);

  const fetchUpsells = async () => {
    setIsLoading(true);
    try {
      // GET /api/catalog ya filtra solo productos disponibles (is_available = true).
      const { upsells: data } = await api.get('/catalog');

      const grouped = (data || []).reduce((acc: any, item: any) => {
        const cat = acc.find((c: any) => c.category === item.category);
        if (cat) {
          cat.items.push(item);
        } else {
          acc.push({ category: item.category, items: [item] });
        }
        return acc;
      }, []);
      setUpsellsData(grouped);
    } catch (e) {
      console.error('Error cargando sugerencias:', e);
    }
    setIsLoading(false);
  };

  const handleAdd = (item: any) => {
    const prod = item.products;
    addItem({
      id: generateSafeUUID(),
      productId: prod.id, 
      name: prod.name,
      price: prod.price,
      quantity: 1,
      notes: ''
    });
    setAddedItems(prev => [...prev, prod.id]);
  };

  const shuffleDynamicUpsells = () => {
    setShuffleKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar">
      <div className="bg-[#F8F4EC] border-2 border-[#DFD3C1] rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[90vh] animate-fade text-[#141A14] relative">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#DFD3C1] flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-display font-black uppercase tracking-widest text-[#C88A35] flex items-center gap-1.5">
              <span>🥖 {t('special_oven_recommendation') || 'Selección del Obrador'}</span>
            </span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-[#141A14] mt-0.5 uppercase tracking-tight">
              {t('complete_your_order') || '¿Te apetece algo más?'}
            </h3>
            <p className="text-xs text-[#4F5E4F] mt-0.5 font-medium">
              {t('upsell_subtitle') || 'Añade un complemento o pasa directamente a tramitar tu pedido.'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#4F5E4F] hover:text-[#141A14] text-lg font-bold p-2 bg-[#F8F4EC] hover:bg-[#E6EFE4] rounded-xl border border-[#DFD3C1] shrink-0 transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-sm font-medium text-[#4F5E4F] max-h-[55vh] no-scrollbar space-y-5">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-[#1B3818] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : upsellsData.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2 bg-white rounded-2xl border border-[#DFD3C1]">
              <span className="text-3xl block">🥖</span>
              <p className="text-sm font-bold text-[#141A14]">Tu pedido está listo para el obrador</p>
              <p className="text-xs text-[#4F5E4F]">Pulsa en "Tramitar Pedido" para completar tus datos de entrega o recogida.</p>
            </div>
          ) : (
            upsellsData.map(category => (
              <div key={category.category}>
                <h4 className="font-display font-black text-xs sm:text-sm text-[#141A14] uppercase tracking-wider mb-2.5 border-b border-[#DFD3C1] pb-1.5">
                  {tDynamic(category.category)}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {category.items.map((item: any) => {
                    const prod = item.products;
                    const isAdded = addedItems.includes(prod.id);
                    return (
                      <div key={item.id} className="bg-white border border-[#DFD3C1] hover:border-[#1B3818] rounded-xl p-3 flex flex-col justify-between transition-all shadow-sm">
                        <div>
                          <span className="font-bold text-[#141A14] text-xs sm:text-sm block">{tDynamic(prod.name)}</span>
                          {prod.description && <span className="text-[10px] sm:text-[11px] text-[#4F5E4F] block mt-0.5 line-clamp-2">{tDynamic(prod.description)}</span>}
                        </div>
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#F8F4EC]">
                          <span className="font-display font-black text-[#1B3818] text-sm">{prod.price.toFixed(2).replace('.', ',')} €</span>
                          <button 
                            onClick={() => handleAdd(item)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-lg font-display font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all shadow-sm ${
                              isAdded 
                                ? 'bg-[#F8F4EC] text-[#1B3818] border border-[#1B3818]/30 cursor-not-allowed font-black' 
                                : 'bg-[#1B3818] hover:bg-[#122810] text-white shadow-[0_2px_8px_rgba(27,56,24,0.25)] border border-[#C88A35]/60'
                            }`}
                          >
                            {isAdded ? (t('added') || '✓ Añadido') : (t('add_item') || '+ Añadir')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-5 bg-white border-t border-[#DFD3C1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto bg-[#F8F4EC] hover:bg-[#E6EFE4] text-[#141A14] font-display font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition-all border border-[#DFD3C1] flex items-center justify-center gap-2 order-2 sm:order-1"
          >
            <span>{t('keep_browsing') || '← Seguir pidiendo'}</span>
          </button>
          {upsellsData.length > 0 && (
            <button 
              onClick={shuffleDynamicUpsells} 
              className="w-full sm:w-auto bg-[#F8F4EC] hover:bg-[#E6EFE4] text-[#1B3818] font-display font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition-all border border-[#DFD3C1] flex items-center justify-center gap-2 order-3 sm:order-2"
            >
              <span>{t('view_recommendations') || '↻ Otras sugerencias'}</span>
            </button>
          )}
          <button 
            onClick={() => { onClose(); onProceedToCheckout(); }} 
            className="w-full sm:w-auto bg-[#1B3818] hover:bg-[#122810] text-white font-display font-black px-6 py-3 sm:py-3.5 rounded-xl shadow-[0_8px_20px_rgba(27,56,24,0.35)] uppercase tracking-wider text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border border-[#C88A35] order-1 sm:order-3 active:scale-98"
          >
            <span>{t('payment_gateway') || 'Tramitar Pedido →'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
