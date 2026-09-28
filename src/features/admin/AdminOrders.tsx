import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/apiClient';
import TicketPrinter from '../../components/TicketPrinter';
import { sendToNetworkPrinter } from '../../utils/printerService';
import { useI18nStore } from '../../store/i18nStore';
import DOMPurify from 'dompurify';
import { formatAddress } from '../../utils/addressUtils';
import { useAdminUiStore } from '../../store/adminUiStore';
import { armAlarm, startAlarm, stopAlarm, isArmed } from '../../utils/orderAlarm';

export default function AdminOrders() {
  const { startEditingOrder, isAudioArmed, setIsAudioArmed, silencedOrderIds, addSilencedOrderIds } = useAdminUiStore();
  const { t, tDynamic } = useI18nStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'cooking' | 'ready' | 'delivered' | 'mesas'>('pending');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [isOpeningAlarm, setIsOpeningAlarm] = useState(false);

  useEffect(() => {
    if (isArmed()) {
      setIsAudioArmed(true);
    }
    fetchOrders();
    const pollInterval = setInterval(() => { fetchOrders(); }, 8000);

    const interval = setInterval(() => {
      const now = new Date();
      const day = now.getDay();
      const hoursMap: Record<number, string | null> = {
        0: '13:00', 1: '13:00', 2: '13:00', 3: '13:00', 4: '13:00', 5: '13:00', 6: '13:00'
      };
      
      const openTime = hoursMap[day];
      if (openTime) {
        const [openHour, openMin] = openTime.split(':').map(Number);
        if (now.getHours() === openHour && now.getMinutes() === openMin) {
          setIsOpeningAlarm(true);
          if (isArmed()) {
            setIsAlarmRinging(true);
            void startAlarm();
          }
        }
      }
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(interval);
      stopAlarm();
    };
  }, []);

  const pending = orders.filter(o => (o.status === 'pending' || (o.delivery_method === 'local' && o.order_items?.some((i: any) => !i.customization_details?.is_sent_to_kitchen))) && o.delivery_method !== 'local');
  const unsilencedPending = pending.filter(o => !silencedOrderIds.has(o.id));

  useEffect(() => {
    if (unsilencedPending.length > 0 && isAudioArmed) {
      setIsAlarmRinging(true);
      void startAlarm();
    } else {
      setIsAlarmRinging(false);
      stopAlarm();
    }
  }, [unsilencedPending.length, isAudioArmed]);

  const fetchOrders = async () => {
    try {
      const { orders: data } = await api.get('/admin/orders');
      if (data) {
        setOrders(data);
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    }
  };

  const armAudio = async () => {
    await armAlarm();
    setIsAudioArmed(true);
  };

  const handleSilence = () => {
    const idsToSilence = pending.map(o => o.id);
    addSilencedOrderIds(idsToSilence);
    setIsAlarmRinging(false);
    setIsOpeningAlarm(false);
    stopAlarm();
  };

  const updateOrderStatus = async (id: string, status: string, estimatedTimeMinutes?: string) => {
    try {
      await api.patch('/admin/orders', { id, status, estimated_time: estimatedTimeMinutes });
      fetchOrders();
    } catch (e) {
      console.error('Error updating order:', e);
    }
  };

  const handlePrint = async (order: any) => {
    setPrintingOrder(order);
    try {
      await sendToNetworkPrinter(order);
    } catch (e) {
      console.warn('Thermal network printing failed, falling back to standard print modal', e);
    }
  };

  const handleAcceptMesa = async (id: string, order: any) => {
    const unsentItems = order.order_items?.filter((i: any) => !i.customization_details?.is_sent_to_kitchen) || [];
    if (unsentItems.length > 0) {
      const orderToPrint = {
        ...order,
        order_items: order.order_items.map((item: any) => ({
          ...item,
          is_new: !item.customization_details?.is_sent_to_kitchen,
          is_old: item.customization_details?.is_sent_to_kitchen
        }))
      };
      await handlePrint(orderToPrint);
    }

    try {
      await api.patch('/admin/orders', {
        id,
        status: order.status === 'pending' ? 'cooking' : undefined,
        items: unsentItems.map((item: any) => ({
          id: item.id,
          customization_details: { ...item.customization_details, is_sent_to_kitchen: true }
        }))
      });
    } catch (e) {
      console.error('Error actualizando mesa:', e);
    }

    fetchOrders();
  };

  const getWorkingDayStart = () => {
    const now = new Date();
    if (now.getHours() < 5) {
      now.setDate(now.getDate() - 1);
    }
    now.setHours(5, 0, 0, 0);
    return now.getTime();
  };

  const workingDayStart = getWorkingDayStart();

  const cooking = orders.filter(o => o.status === 'cooking' && o.delivery_method !== 'local');
  const ready = orders.filter(o => (o.status === 'ready' || o.status === 'delivering') && o.delivery_method !== 'local');
  const mesas = orders.filter(o => o.delivery_method === 'local' && o.status !== 'delivered' && o.status !== 'cancelled');
  
  const delivered = orders.filter(o => {
    if (o.status !== 'delivered' && o.status !== 'cancelled') return false;
    return new Date(o.created_at).getTime() >= workingDayStart;
  });

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'pending': return pending;
      case 'cooking': return cooking;
      case 'ready': return ready;
      case 'delivered': return delivered;
      case 'mesas': return mesas;
    }
  };

  const currentList = getFilteredOrders();
  const [mesaToPay, setMesaToPay] = useState<string | null>(null);

  const handleCobrarMesa = async (id: string, method: string) => {
    try {
      await api.patch('/admin/orders', { id, status: 'delivered', payment_method: method });
    } catch (e) {
      console.error('Error cobrando mesa:', e);
    }
    setMesaToPay(null);
    setExpandedOrderId(null);
    fetchOrders();
  };

  const toggleAccordion = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative font-sans text-zinc-900">
      {(!isAudioArmed && !isArmed()) && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 border border-amber-200 shadow-xs">
              <svg className="w-8 h-8 text-amber-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="text-xl font-display font-black text-zinc-900 uppercase tracking-wide mb-2">{t('reception_blocked')}</h2>
            <p className="text-zinc-500 mb-6 text-xs leading-relaxed">{t('browser_security_message')}</p>
            <button 
              onClick={armAudio}
              className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:brightness-105 text-white font-display font-black py-3.5 px-6 rounded-xl uppercase tracking-wider shadow-md transition-all text-xs"
            >
              {t('activate_alarm')}
            </button>
          </div>
        </div>
      )}

      {isOpeningAlarm && (
        <div className="absolute inset-x-0 top-0 z-40 bg-amber-600 text-white p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <h3 className="font-display font-black uppercase text-base">{t('opening_time_title')}</h3>
              <p className="text-xs text-amber-100">{t('opening_time_subtitle')}</p>
            </div>
          </div>
          <button onClick={handleSilence} className="mt-2 sm:mt-0 px-4 py-1.5 bg-white text-amber-900 rounded-lg text-xs font-bold uppercase hover:bg-amber-50">
            {t('silence_alarm')}
          </button>
        </div>
      )}
      
      {/* Header and Controls */}
      <div className="p-4 sm:p-5 border-b border-zinc-200 bg-white z-10 shadow-xs flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-display font-black uppercase text-zinc-900 tracking-wide flex items-center gap-2">
          <span>Gestión de Pedidos</span>
          <span className="text-amber-600">Cocina</span>
        </h2>
        {unsilencedPending.length > 0 && (
          <button 
            onClick={handleSilence}
            className="px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold uppercase animate-pulse shadow-xs flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            <span>{t('silence_alarm')} ({unsilencedPending.length})</span>
          </button>
        )}
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-200 bg-white px-4 pt-2 shrink-0">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pending' ? 'border-red-500 text-red-600 bg-red-50/50' : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <span>Nuevos</span>
          <span className="px-1.5 py-0.2 bg-red-100 text-red-700 rounded-full text-[10px] font-black">{pending.length}</span>
        </button>

        <button 
          onClick={() => setActiveTab('cooking')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'cooking' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <span>En Cocina</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">{cooking.length}</span>
        </button>

        <button 
          onClick={() => setActiveTab('ready')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ready' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <span>Listos / Reparto</span>
          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black">{ready.length}</span>
        </button>

        <button 
          onClick={() => setActiveTab('mesas')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'mesas' ? 'border-purple-500 text-purple-600 bg-purple-50/50' : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <span>Mesas</span>
          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px] font-black">{mesas.length}</span>
        </button>

        <button 
          onClick={() => setActiveTab('delivered')}
          className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'delivered' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <span>Completados</span>
          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">{delivered.length}</span>
        </button>
      </div>

      {/* Orders List Container */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-24 sm:pb-6 no-scrollbar space-y-3.5">
        
        {currentList.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 shadow-xs">
            <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-zinc-500 font-bold uppercase tracking-wider text-xs">{t('no_orders_section')}</p>
          </div>
        ) : (
          currentList.map(order => {
            const isExpanded = expandedOrderId === order.id;
            const isDelivery = order.delivery_method === 'delivery';
            const hasUnsentMesaItems = order.delivery_method === 'local' && order.order_items?.some((i: any) => !i.customization_details?.is_sent_to_kitchen);
            const isAlerting = order.status === 'pending' || hasUnsentMesaItems;
            const isTPV = order.order_items?.[0]?.customization_details?.is_tpv_order === true;

            return (
              <div 
                key={order.id} 
                className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 shadow-xs ${
                  isAlerting ? 'border-red-400 ring-2 ring-red-400/20' : 
                  isTPV ? 'border-blue-300' :
                  isExpanded ? 'border-amber-400 shadow-md' : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleAccordion(order.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4 hover:bg-zinc-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-bold ${
                      isAlerting ? 'bg-red-50 text-red-600 border border-red-200' :
                      order.status === 'cooking' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      order.status === 'ready' || order.status === 'delivering' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                      order.status === 'cancelled' ? 'bg-zinc-100 text-zinc-500 border border-zinc-200' :
                      'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}>
                      {isAlerting && (
                        <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      )}
                      {order.status === 'cooking' && !hasUnsentMesaItems && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                      )}
                      {(order.status === 'ready' || order.status === 'delivering') && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                      )}
                      {order.status === 'delivered' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      )}
                      {order.status === 'cancelled' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-extrabold text-base text-zinc-900 uppercase truncate max-w-[170px] xs:max-w-[220px] sm:max-w-none" title={order.client_name || t('no_name')}>
                          {order.client_name || t('no_name')}
                        </span>
                        {isTPV && (
                          <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-blue-200">
                            Caja Mostrador
                          </span>
                        )}
                        {/* Badge de Método de Pago */}
                        {order.payment_method === 'cash' ? (
                          <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-amber-200">
                            💵 Efectivo
                          </span>
                        ) : (order.payment_method === 'card_delivery' || order.payment_method === 'tpv' || order.payment_method === 'physical') ? (
                          <span className="bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-indigo-200">
                            💳 Tarjeta (SumUp)
                          </span>
                        ) : order.payment_method === 'online' ? (
                          <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-emerald-200">
                            🌐 Pago Online
                          </span>
                        ) : null}
                        {order.payment_status === 'FAILED' && (
                          <span className="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-red-200 animate-pulse">
                            Pago Fallido
                          </span>
                        )}
                        <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-mono font-bold">#{order.id.slice(0,5)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-medium mt-1">
                        <span className={`font-semibold ${isDelivery ? 'text-blue-600' : (order.delivery_method === 'local' ? 'text-purple-600' : 'text-amber-700')}`}>
                          {isDelivery ? 'A Domicilio' : (order.delivery_method === 'local' ? 'Mesa / Local' : 'Para Recoger')}
                        </span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-500 font-mono">{new Date(order.created_at).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</span>
                        {order.discount_applied > 0 && <span className="text-amber-700 font-bold ml-1">🎫 -{order.discount_applied}€ VIP</span>}
                        {order.status === 'cancelled' && <span className="text-red-500 font-bold ml-1">{t('cancelled')}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 sm:w-auto w-full">
                    <div className="text-right">
                      <span className="block text-xl font-display font-black text-amber-600 leading-none">{order.total_amount}€</span>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Total</span>
                    </div>
                    <svg className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-zinc-700' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {/* Accordion Body (Expanded Details) */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 bg-zinc-50/70 p-4 sm:p-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Items */}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Detalle del Pedido</h4>
                        <div className="space-y-2.5">
                          {order.order_items?.map((item: any, index: number) => {
                            const itemTime = item.created_at ? new Date(item.created_at).getTime() : new Date(order.created_at).getTime();
                            const isNewAddition = (Date.now() - itemTime) < 15 * 60000;

                            return (
                              <div key={index} className={`flex items-start gap-3 p-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-xs ${isNewAddition ? 'border-l-4 border-l-amber-500' : ''}`}>
                                <span className="font-extrabold text-zinc-900 whitespace-nowrap text-sm">{item.quantity}x</span>
                                <div className="flex-1 text-zinc-800 text-sm">
                                  <span className="font-semibold">{item.customization_details?.name ? tDynamic(item.customization_details.name) : (item.products?.name ? tDynamic(item.products.name) : t('unknown_product'))}</span>
                                  {order.delivery_method === 'local' && !item.customization_details?.is_sent_to_kitchen && (
                                    <span className="ml-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse font-black">Nuevo</span>
                                  )}
                                  {order.delivery_method === 'local' && item.customization_details?.is_sent_to_kitchen && (
                                    <span className="ml-2 bg-zinc-100 text-zinc-600 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold">✓ En Cocina</span>
                                  )}
                                  {item.customization_details?.notes && (
                                    <p 
                                      className="text-xs text-amber-700 mt-1 font-medium"
                                      dangerouslySetInnerHTML={{ 
                                        __html: DOMPurify.sanitize(`Nota: ${item.customization_details.notes}`)
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {order.discount_applied > 0 && (
                            <div className="flex justify-between text-xs font-bold border-t border-zinc-200 pt-2 text-amber-700">
                              <span>Descuento Club VIP aplicado:</span>
                              <span>-{order.discount_applied}€</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Client Details & Actions */}
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs space-y-2">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Datos de Contacto y Entrega</h4>
                          <p className="text-sm text-zinc-900 font-bold">📱 {order.client_phone || t('no_phone')}</p>
                          {order.delivery_address && (
                            <p className="text-xs text-zinc-600">
                              📍 {formatAddress(order.delivery_address as string)}
                            </p>
                          )}
                          {order.notes && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Instrucciones del Cliente:</p>
                              <p className="text-xs font-medium text-amber-900 mt-0.5">{order.notes}</p>
                            </div>
                          )}
                          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                            <span className="text-zinc-500 font-medium">Cobro:</span>
                            <span className="font-bold text-zinc-900">
                              {order.payment_method === 'cash' ? '💵 Efectivo' : 
                               (order.payment_method === 'card_delivery' || order.payment_method === 'tpv' || order.payment_method === 'physical') ? '💳 Tarjeta / Datáfono (SumUp)' : 
                               order.payment_method === 'online' ? '🌐 Pago Online' : '💵 Efectivo'}
                            </span>
                          </div>
                        </div>

                        {/* Print & Edit Buttons */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handlePrint(order)}
                            className="flex-1 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            <span>Imprimir Ticket</span>
                          </button>
                          
                          {order.delivery_method === 'local' && (order.status === 'pending' || order.status === 'cooking') && (
                            <button 
                              onClick={() => startEditingOrder(order)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                              <span>Añadir a Mesa</span>
                            </button>
                          )}
                        </div>

                        {/* Status Change Buttons */}
                        <div className="pt-2">
                          {order.delivery_method === 'local' && (order.status === 'pending' || hasUnsentMesaItems) && (
                            <div className="space-y-2 mb-3">
                              <p className="text-xs font-bold text-red-600 uppercase tracking-wider text-center">Nuevos ítems pendientes en mesa</p>
                              <button 
                                onClick={() => handleAcceptMesa(order.id, order)} 
                                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                              >
                                <span>Aceptar y Marchar a Cocina</span>
                              </button>
                            </div>
                          )}

                          {order.status === 'pending' && order.delivery_method !== 'local' && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Tiempo estimado de elaboración:</p>
                              <div className="flex gap-2">
                                <button onClick={() => updateOrderStatus(order.id, 'cooking', '20')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs">20 min</button>
                                <button onClick={() => updateOrderStatus(order.id, 'cooking', '30')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs">30 min</button>
                                <button onClick={() => updateOrderStatus(order.id, 'cooking', '45')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs">45 min</button>
                              </div>
                              <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="w-full mt-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2 rounded-xl transition-colors">Rechazar Pedido (Cancelar)</button>
                            </div>
                          )}

                          {order.status === 'cooking' && order.delivery_method !== 'local' && (
                            <button onClick={() => updateOrderStatus(order.id, isDelivery ? 'delivering' : 'ready')} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-xs">
                              {isDelivery ? 'Marcar En Reparto (Enviado)' : 'Marcar Listo para Recoger'}
                            </button>
                          )}

                          {(order.status === 'delivering' || order.status === 'ready') && order.delivery_method !== 'local' && (
                            <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-xs">
                              Finalizar Pedido (Entregado con Éxito)
                            </button>
                          )}

                          {order.delivery_method === 'local' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <div className="pt-2">
                              {mesaToPay === order.id ? (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider text-center">Método de cobro:</p>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleCobrarMesa(order.id, 'cash')} className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs">Efectivo</button>
                                    <button onClick={() => handleCobrarMesa(order.id, 'tpv')} className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs">Tarjeta (TPV)</button>
                                  </div>
                                  <button onClick={() => setMesaToPay(null)} className="w-full text-xs text-zinc-500 hover:text-zinc-800 pt-1">Cancelar</button>
                                </div>
                              ) : (
                                <button onClick={() => setMesaToPay(order.id)} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-xs">
                                  Cobrar y Finalizar Mesa
                                </button>
                              )}
                            </div>
                          )}
                          
                          {(order.status === 'delivered' || order.status === 'cancelled') && (
                            <p className="text-center text-zinc-400 font-bold text-xs uppercase mt-3">Pedido finalizado.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {printingOrder && <TicketPrinter order={printingOrder} />}
    </div>
  );
}
