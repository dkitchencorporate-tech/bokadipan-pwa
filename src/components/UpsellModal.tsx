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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">
      <div className="bg-white border border-yellow-500/40 rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade text-brand-ink relative">
        
        {/* Header */}
        <div className="p-4 pt-6 sm:p-6 sm:pt-8 bg-gradient-to-r from-brand-primary/10 via-brand-accent/10 to-brand-primary/10 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-1.5">
              <span>{t('special_oven_recommendation')}</span>
            </span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-brand-ink mt-0.5 uppercase">{t('complete_your_order')}</h3>
            <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5">{t('upsell_subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-brand-ink text-xl font-bold p-2 bg-white rounded-2xl border border-gray-200 shrink-0 transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-sm sm:text-sm font-medium text-gray-600 max-h-[52vh] no-scrollbar space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : upsellsData.length === 0 ? (
            <div className="text-center py-10 text-gray-500">{t('no_suggestions')}</div>
          ) : (
            upsellsData.map(category => (
              <div key={category.category}>
                <h4 className="font-display font-bold text-sm text-brand-ink uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
                  {tDynamic(category.category)}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {category.items.map(item => {
                    const prod = item.products;
                    const isAdded = addedItems.includes(prod.id);
                    return (
                      <div key={item.id} className="bg-gray-50 border border-gray-200 hover:border-yellow-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
                        <div>
                          <span className="font-bold text-brand-ink text-xs sm:text-sm block">{tDynamic(prod.name)}</span>
                          {prod.description && <span className="text-[10px] sm:text-[11px] text-gray-500 block mt-0.5 line-clamp-2">{tDynamic(prod.description)}</span>}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-brand-primaryHover text-sm">{prod.price.toFixed(2).replace('.', ',')} €</span>
                          <button 
                            onClick={() => handleAdd(item)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-xl font-display font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all shadow-sm ${
                              isAdded 
                                ? 'bg-gray-50 text-brand-primaryHover border border-gray-200 cursor-not-allowed' 
                                : 'bg-brand-primary hover:bg-brand-accent text-white shadow-[0_0_10px_rgba(245, 158, 11,0.3)]'
                            }`}
                          >
                            {isAdded ? t('added') : t('add_item')}
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
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
          <button onClick={onClose} className="w-full lg:w-auto bg-white hover:bg-yellow-500 hover:text-black text-gray-600 font-display font-bold px-4 py-3 sm:py-3.5 rounded-2xl text-[11px] sm:text-sm uppercase transition-all border border-gray-200 flex items-center justify-center gap-2 shadow">
            <span>{t('keep_browsing')}</span>
          </button>
          {upsellsData.length > 0 && (
            <button onClick={shuffleDynamicUpsells} className="w-full lg:w-auto bg-gray-50 hover:bg-gray-100 text-yellow-500 font-display font-bold px-4 py-3 sm:py-3.5 rounded-2xl text-[11px] sm:text-sm uppercase transition-all border border-gray-200 flex items-center justify-center gap-2">
              <span>{t('view_recommendations')}</span>
            </button>
          )}
          <button onClick={() => { onClose(); onProceedToCheckout(); }} className="w-full lg:w-auto bg-gradient-to-r from-brand-primary to-brand-primaryHover hover:from-brand-accent hover:to-brand-primary text-white font-display font-bold px-5 py-3 sm:py-3.5 rounded-2xl shadow-[0_15px_30px_-5px_rgba(245,158,11,0.4)] uppercase tracking-wider text-[11px] sm:text-sm transition-all flex items-center justify-center gap-2">
            <span>{t('payment_gateway')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
