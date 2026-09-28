import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useGuestOrderStore } from '../store/guestOrderStore';
import { useI18nStore } from '../store/i18nStore';

// Convierte la clave pública VAPID (base64url) al formato Uint8Array que pide pushManager.subscribe
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function OrderTracking({ onBack }: { onBack: () => void }) {
  const { t } = useI18nStore();
  const { orders, user } = useAuthStore();
  const { guestOrders, guestOrder } = useGuestOrderStore();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported' | 'error'>('idle');

  const subscribeToPush = async (phone: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      setPushStatus('unsupported');
      return;
    }
    setPushStatus('subscribing');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('denied');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
      });
      await fetch('/api/save-push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, subscription: subscription.toJSON() })
      });
      setPushStatus('subscribed');
    } catch (e) {
      console.error('Error activando notificaciones push:', e);
      setPushStatus('error');
    }
  };

  const activeOrders = useMemo(() => {
    if (user) {
      return (orders || []).filter((o: any) => ['pending', 'cooking', 'delivering', 'ready'].includes(o?.status));
    } else {
      const list = guestOrders && guestOrders.length > 0 ? guestOrders : (guestOrder ? [guestOrder] : []);
      return list.filter((o: any) => ['pending', 'cooking', 'delivering', 'ready'].includes(o?.status));
    }
  }, [orders, guestOrders, guestOrder, user]);

  const activeOrder = activeOrders[selectedOrderIndex] || activeOrders[0] || null;

  const historyOrders = useMemo(() => {
    if (user) {
      return (orders || []).filter((o: any) => ['delivered', 'cancelled'].includes(o?.status));
    } else {
      const list = guestOrders && guestOrders.length > 0 ? guestOrders : (guestOrder ? [guestOrder] : []);
      return list.filter((o: any) => ['delivered', 'cancelled'].includes(o?.status));
    }
  }, [orders, guestOrders, guestOrder, user]);

  const getStatusIndex = (status: string) => {
    switch(status) {
      case 'pending': return 0;
      case 'cooking': return 1;
      case 'delivering': 
      case 'ready': return 2;
      default: return -1;
    }
  };

  const statusIndex = activeOrder ? getStatusIndex(activeOrder.status) : -1;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-zinc-900 flex flex-col font-sans pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-zinc-900 transition-colors"
            title="Volver al Menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div className="text-center">
            <h1 className="font-display font-black uppercase text-lg tracking-widest text-brand-ink">{t('my_orders')}</h1>
            <p className="text-[10px] text-brand-muted font-mono tracking-widest uppercase">{t('brand_name')}</p>
          </div>
          <div className="w-10"></div> {/* Spacer */}
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-4 pt-2">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'active' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-brand-ink'}`}
          >
            {t('in_progress')} {activeOrders.length > 0 ? `(${activeOrders.length})` : ''}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'history' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-brand-ink'}`}
          >
            {t('history')} ({historyOrders.length})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 mt-4">
        
        {activeTab === 'active' && (
          <div className="animate-fade-in">
            {!activeOrder ? (
              <div className="text-center py-20 bg-[#FFFFFF] rounded-3xl border border-gray-200">
                <div className="w-20 h-20 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">📋</span>
                </div>
                <h2 className="text-xl font-display font-black text-brand-ink uppercase mb-2">{t('no_active_orders')}</h2>
                <p className="text-gray-500 text-sm mb-8">{t('hungry_check_menu')}</p>
                <button 
                  onClick={onBack}
                  className="bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-3 px-8 rounded-xl uppercase tracking-wider text-sm transition-all shadow-md"
                >
                  {t('explore_menu')}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Multi-Order Tab Selector */}
                {activeOrders.length > 1 && (
                  <div className="bg-[#FFFFFF] border border-gray-200 p-3 rounded-2xl">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                      Tienes {activeOrders.length} pedidos en preparación simultánea:
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {activeOrders.map((ord: any, idx: number) => {
                        const isSelected = (activeOrder?.id === ord.id);
                        const methodIcon = ord.delivery_method === 'delivery' ? '🛵' : '🛍️';
                        const methodLabel = ord.delivery_method === 'delivery' ? 'Domicilio' : 'Recogida';
                        const statusLabel = ord.status === 'pending' ? 'Recibido' : ord.status === 'cooking' ? 'En Cocina' : 'Listo / Reparto';

                        return (
                          <button
                            key={ord.id}
                            onClick={() => setSelectedOrderIndex(idx)}
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                              isSelected 
                                ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-200 hover:text-brand-ink'
                            }`}
                          >
                            <span>{methodIcon}</span>
                            <span>{methodLabel} #{ord.id.slice(0, 5)}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {statusLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Order Card */}
                <div className="bg-[#FFFFFF] border border-gray-200 rounded-3xl overflow-hidden shadow-2xl">
                  
                  {/* Status Banner */}
                  <div className="p-6 border-b border-gray-200 bg-white">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-widest text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-300 font-semibold">
                          {t('order_num')}: #{activeOrder.id.slice(0, 8)}
                        </span>
                        <h3 className="text-xl font-display font-black uppercase text-zinc-900 mt-2">
                          {activeOrder.delivery_method === 'delivery' ? t('delivery_method_home') : t('delivery_method_pickup')}
                        </h3>
                        {activeOrder.estimated_ready_at && (
                          <p className="text-sm font-bold text-zinc-700 mt-1">
                            ⏰ Hora Estimada: {activeOrder.estimated_ready_at}
                          </p>
                        )}
                        {activeOrder.client_phone && (
                          pushStatus === 'subscribed' ? (
                            <p className="text-xs text-zinc-800 font-bold mt-2 flex items-center gap-1">🔔 Te avisaremos cuando cambie el estado</p>
                          ) : pushStatus === 'denied' ? (
                            <p className="text-xs text-gray-500 mt-2">Notificaciones bloqueadas por el navegador</p>
                          ) : pushStatus !== 'unsupported' && (
                            <button
                              onClick={() => subscribeToPush(activeOrder.client_phone)}
                              disabled={pushStatus === 'subscribing'}
                              className="text-xs text-zinc-900 hover:text-zinc-700 font-bold mt-2 underline disabled:opacity-50"
                            >
                              {pushStatus === 'subscribing' ? 'Activando…' : '🔔 Avisarme cuando cambie el estado'}
                            </button>
                          )
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-zinc-900">{activeOrder.total_amount}€</span>
                        <p className="text-xs text-gray-500 font-medium uppercase mt-1">{activeOrder.delivery_method === 'delivery' ? t('delivery_method_home') : t('delivery_method_pickup')}</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative pt-8 pb-4">
                      {/* Progress Bar Background */}
                      <div className="absolute top-[42px] left-[10%] right-[10%] h-1 bg-zinc-200 rounded-full"></div>
                      {/* Active Progress Bar */}
                      <div 
                        className="absolute top-[42px] left-[10%] h-1 bg-zinc-900 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(24,24,27,0.3)] animate-pulse"
                        style={{ width: `${statusIndex === 0 ? 0 : statusIndex === 1 ? 40 : 80}%` }}
                      ></div>

                      <div className="relative flex justify-between">
                        {/* Step 1: Pending */}
                        <div className="flex flex-col items-center relative z-10 w-1/3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 0 ? 'bg-zinc-900 text-white shadow-[0_0_15px_rgba(24,24,27,0.3)]' : 'bg-zinc-100 text-zinc-400 border border-zinc-200'} ${statusIndex === 0 ? 'animate-bounce' : ''}`}>
                            ⏳
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>{t('status_received')}</span>
                        </div>

                        {/* Step 2: Cooking */}
                        <div className="flex flex-col items-center relative z-10 w-1/3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 1 ? 'bg-zinc-900 text-white shadow-[0_0_15px_rgba(24,24,27,0.3)]' : 'bg-zinc-100 text-zinc-400 border border-zinc-200'} ${statusIndex === 1 ? 'animate-bounce' : ''}`}>
                            🍳
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 1 ? 'text-zinc-900' : 'text-zinc-400'}`}>{t('status_cooking')}</span>
                        </div>

                        {/* Step 3: Delivering/Ready */}
                        <div className="flex flex-col items-center relative z-10 w-1/3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${statusIndex >= 2 ? 'bg-zinc-900 text-white shadow-[0_0_15px_rgba(24,24,27,0.3)]' : 'bg-zinc-100 text-zinc-400 border border-zinc-200'} ${statusIndex === 2 ? 'animate-bounce' : ''}`}>
                            {activeOrder.delivery_method === 'delivery' ? '🛵' : '🛍️'}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center transition-colors duration-500 ${statusIndex >= 2 ? 'text-zinc-900' : 'text-zinc-400'}`}>
                            {activeOrder.delivery_method === 'delivery' ? t('status_delivering_title') : t('status_ready')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 bg-zinc-50 rounded-2xl p-4 border border-zinc-200 text-center">
                      <p className="text-sm text-zinc-700 font-medium">
                        {statusIndex === 0 && t('tracking_msg_pending')}
                        {statusIndex === 1 && t('tracking_msg_cooking')}
                        {statusIndex === 2 && activeOrder.delivery_method === 'delivery' && t('tracking_msg_delivering')}
                        {statusIndex === 2 && activeOrder.delivery_method === 'pickup' && t('tracking_msg_ready')}
                      </p>
                    </div>
                  </div>

                  <div className="p-6">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t('order_summary')}</h4>
                    <div className="space-y-3">
                      {activeOrder.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center text-xs font-bold">{item.quantity}</span>
                            <span className="text-zinc-800 font-medium">{item.customization_details?.name || item.products?.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in space-y-4">
            {historyOrders.length === 0 ? (
              <div className="text-center py-20 bg-[#FFFFFF] rounded-3xl border border-gray-200">
                <span className="text-4xl mb-4 block">📜</span>
                <p className="text-gray-500 font-medium">{t('no_completed_orders')}</p>
              </div>
            ) : (
              historyOrders.map((order: any) => (
                <div key={order.id} className="bg-[#FFFFFF] border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-gray-500 font-medium">{formatDate(order.created_at)}</span>
                      <div className="mt-1 flex items-center gap-2">
                        {order.status === 'delivered' ? (
                          <span className="text-[10px] font-bold uppercase text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded">{t('status_completed_title')}</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded">{t('status_cancelled_title')}</span>
                        )}
                        <span className="text-[10px] font-mono text-gray-500 uppercase bg-zinc-50 border border-zinc-200 px-2 py-1 rounded">ID: {order.id.slice(0,8)}</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-zinc-900">{order.total_amount}€</span>
                  </div>
                  
                  <div className="mt-4 space-y-1">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="text-sm text-gray-600">
                        <span className="font-bold text-zinc-800">{item.quantity}x</span> {item.customization_details?.name || item.products?.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
