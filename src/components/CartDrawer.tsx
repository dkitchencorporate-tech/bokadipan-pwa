import React, { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export default function CartDrawer({ isOpen, onClose, onCheckout }: CartDrawerProps) {
  useHardwareBack(isOpen, onClose);
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const { t, tDynamic } = useI18nStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-[#FFFFFF] border-l-2 border-[#E5DCD0] flex flex-col shadow-2xl transform transition-transform">
        <div className="flex items-center justify-between p-6 border-b border-[#E5DCD0] bg-[#FAF6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2D5A27] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(45,90,39,0.35)] border border-[#4D7C0F]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </div>
            <h2 className="font-display font-black text-2xl text-[#1A201A] uppercase tracking-wider">{t('your_order')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button onClick={handleClearCart} className="p-2 bg-red-500/10 rounded-full text-red-600 hover:bg-red-500 hover:text-white transition-colors" title={t('empty_cart_btn')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-500 hover:text-[#1A201A] transition-colors border border-[#E5DCD0]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-6">
              <div className="relative">
                <svg className="w-24 h-24 text-[#2D5A27]/20 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                <span className="absolute inset-0 flex items-center justify-center text-3xl opacity-50">🥖</span>
              </div>
              <div className="text-center space-y-2">
                <p className="font-display font-black text-xl text-[#1A201A] uppercase tracking-widest">{t('empty_cart_title')}</p>
                <p className="font-medium text-sm text-[#5C6B5C] px-4">{t('empty_cart_desc')}</p>
              </div>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-4 bg-[#FAF6F0] p-4 rounded-2xl border border-[#E5DCD0]">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-[#1A201A] uppercase">{tDynamic(item.name)}</h3>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 p-1 hover:bg-red-500/10 rounded">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                  
                  {(item as any).extraDescription && (
                    <p className="text-xs text-[#5C6B5C] mt-1">{tDynamic((item as any).extraDescription || '')}</p>
                  )}
                  {item.extras && item.extras.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.extras.map((ex, i) => (
                        <span key={i} className="text-[10px] bg-[#EAF2E8] text-[#2D5A27] font-bold px-2 py-0.5 rounded-md border border-[#2D5A27]/30">
                          + {tDynamic(ex)}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1 mt-1.5 border border-amber-200/60 inline-block font-medium">
                      📝 {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-[#E5DCD0]">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center bg-[#FAF6F0] rounded-md text-[#1A201A] hover:bg-[#EAF2E8]"
                      >
                        -
                      </button>
                      <span className="font-bold text-[#1A201A] w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center bg-[#FAF6F0] rounded-md text-[#1A201A] hover:bg-[#EAF2E8]"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-[#2D5A27] text-lg">{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            ))
          )}
          {/* Footer actions */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#E5DCD0] bg-[#FFFFFF] z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#5C6B5C] font-medium text-lg">{t('total')}</span>
                <span className="font-display font-black text-3xl text-[#1A201A]">{getTotal().toFixed(2).replace('.', ',')} €</span>
              </div>
              
              <button 
                onClick={() => {
                  onClose();
                  onCheckout();
                }}
                className="w-full bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-display font-black py-4 rounded-2xl text-lg uppercase tracking-wider transition-all shadow-[0_8px_25px_rgba(45,90,39,0.4)] transform hover:-translate-y-0.5 border border-[#4D7C0F]"
              >
                {t('process_order')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación para Vaciar Carrito */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1050] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-scale-in text-zinc-900">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-rose-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </div>
              <h3 className="font-display font-extrabold text-zinc-900 text-base uppercase tracking-wider mb-1.5">{t('empty_cart_btn')}</h3>
              <p className="text-zinc-600 text-xs leading-relaxed">{t('clear_cart_confirm')}</p>
            </div>
            <div className="p-4 bg-zinc-50 flex gap-2.5 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-2xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setShowClearConfirm(false);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl py-2.5 text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                {t('empty_cart_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
