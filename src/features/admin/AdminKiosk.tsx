import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/apiClient';
import { useKioskCartStore, KioskClientInfo } from '../../store/kioskCartStore';
import { useAdminUiStore } from '../../store/adminUiStore';
import { sendToNetworkPrinter } from '../../utils/printerService';
import TicketPrinter from '../../components/TicketPrinter';
import KioskIngredientsModal from '../../components/KioskIngredientsModal';
import KioskNotesModal from '../../components/KioskNotesModal';
import { CartItem } from '../../store/cartStore';
import { formatAddress } from '../../utils/addressUtils';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: number;
  category_id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export default function AdminKiosk() {
  const { editingOrder, finishEditingOrder, setActiveTab } = useAdminUiStore();
  const { 
    items, 
    clientInfo, 
    deliveryMethod,
    setClientInfo, 
    setDeliveryMethod,
    resetKiosk,
    addItem, 
    removeItem, 
    updateQuantity, 
    updatePrice,
    clearCart, 
    getTotal 
  } = useKioskCartStore();

  const [view, setView] = useState<'client' | 'catalog'>('catalog');
  const [mobileKioskTab, setMobileKioskTab] = useState<'catalog' | 'ticket'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableName, setTableName] = useState('');
  const [searchResults, setSearchResults] = useState<KioskClientInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmColor?: 'amber' | 'rose';
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (editingOrder) {
      clearCart();
      setDeliveryMethod(editingOrder.delivery_method || 'local');
      setView('catalog');
      if (editingOrder.client_phone) {
        setClientInfo({
          full_name: editingOrder.client_name,
          phone: editingOrder.client_phone,
          address: editingOrder.delivery_address,
          is_registered: false
        });
      }
      setDeliveryMethod(editingOrder.delivery_method || 'local');
    }
  }, [editingOrder]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [printingAdditionalOrder, setPrintingAdditionalOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'tpv' | 'cash'>('tpv');
  const [kioskNotification, setKioskNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showKioskNotif = (msg: string, type: 'success' | 'error') => {
    setKioskNotification({ msg, type });
    setTimeout(() => setKioskNotification(null), 4000);
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressCP, setAddressCP] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const [kioskIngrProduct, setKioskIngrProduct] = useState<Product | null>(null);
  const [kioskNotesProduct, setKioskNotesProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadCatalog();
    const pollInterval = setInterval(() => { loadCatalog(); }, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  const loadCatalog = async () => {
    try {
      const data = await api.get('/catalog');
      if (data.categories) setCategories(data.categories);
      if (data.products) setProducts(data.products);
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { clients: data } = await api.get('/admin/clients?q=' + encodeURIComponent(searchQuery.trim()));
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching client:', error);
      showKioskNotif('Error buscando cliente.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Búsqueda reactiva instantánea al escribir nombre o teléfono
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      if (q.length === 0) setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { clients: data } = await api.get('/admin/clients?q=' + encodeURIComponent(q));
        setSearchResults(data || []);
      } catch (error) {
        console.error('Error en búsqueda reactiva:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenCreateModal = () => {
    const query = searchQuery.trim();
    const isPhone = /^[+]?[0-9\s-]+$/.test(query) && query.replace(/[^0-9]/g, '').length >= 6;
    
    if (isPhone) {
      setNewClientPhone(query.replace(/[^0-9]/g, ''));
      setNewClientName('');
    } else {
      setNewClientName(query);
      setNewClientPhone('');
    }
    
    setAddressStreet('');
    setAddressNumber('');
    setAddressCP('28013');
    setAddressNotes('');
    setIsCreateModalOpen(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const addressRequired = deliveryMethod === 'delivery';
    if (!newClientPhone || !newClientName || (addressRequired && (!addressStreet || !addressNumber || !addressCP))) {
      showKioskNotif('Faltan datos obligatorios.', 'error');
      return;
    }

    setIsCreatingClient(true);
    try {
      const hasAddressData = addressStreet.trim() || addressNumber.trim() || addressNotes.trim();
      const addressJson = hasAddressData
        ? JSON.stringify({
            street: addressStreet,
            number: addressNumber,
            cp: addressCP,
            notes: addressNotes
          })
        : null;

      const { client: created } = await api.put('/admin/clients', {
        phone: newClientPhone,
        name: newClientName,
        address: addressJson
      });

      setClientInfo({
        id: created?.id,
        full_name: newClientName,
        phone: newClientPhone,
        address: addressJson || undefined,
        is_registered: false
      });
      
      setNewClientName('');
      setNewClientPhone('');
      setAddressStreet('');
      setAddressNumber('');
      setAddressCP('');
      setAddressNotes('');
      setIsCreateModalOpen(false);
    } catch (error: any) {
      console.error('Error creando cliente:', error);
      showKioskNotif(error.message || 'Error al crear cliente.', 'error');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const selectClient = (client: KioskClientInfo) => {
    setClientInfo(client);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleProcessOrder = async () => {
    if (items.length === 0) {
      showKioskNotif('El carrito está vacío.', 'error');
      return;
    }
    
    if (!clientInfo && deliveryMethod !== 'local') {
      showKioskNotif('Debes asignar un cliente para pedidos de Recogida o Domicilio.', 'error');
      setView('client');
      return;
    }

    setIsProcessing(true);
    try {
      const formattedItems = items.map((item, index) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        customization_details: { 
          name: item.name, 
          notes: item.notes, 
          extras: item.extras,
          is_sent_to_kitchen: false,
          ...(index === 0 ? { is_tpv_order: true } : {})
        }
      }));

      let finalClientName = 'Mesa / Local';
      let finalClientPhone = '000000000';
      let finalDeliveryAddress = 'Local';

      if (deliveryMethod === 'local') {
        finalClientName = tableName.trim()
          ? (clientInfo?.full_name ? `${tableName.trim()} (${clientInfo.full_name})` : tableName.trim())
          : (clientInfo?.full_name || 'Mesa / Local');
        finalClientPhone = clientInfo?.phone || '000000000';
        finalDeliveryAddress = tableName.trim() ? `Mesa: ${tableName.trim()}` : 'Local';
      } else if (deliveryMethod === 'pickup') {
        finalClientName = clientInfo?.full_name || 'Sin Nombre';
        finalClientPhone = clientInfo?.phone || '000000000';
        finalDeliveryAddress = clientInfo?.address || 'Para Recoger en Local';
      } else {
        // delivery
        finalClientName = clientInfo?.full_name || 'Sin Nombre';
        finalClientPhone = clientInfo?.phone || '000000000';
        finalDeliveryAddress = clientInfo?.address || 'Local';
      }

      if (editingOrder) {
        await api.post('/admin/kiosk-add-items', {
          orderId: editingOrder.id,
          items: formattedItems
        });
      } else {
        await api.post('/checkout', {
          client_name: finalClientName,
          client_phone: finalClientPhone,
          delivery_address: finalDeliveryAddress,
          delivery_method: deliveryMethod,
          items: formattedItems,
          points_redeemed: false,
          small_order_fee_accepted: true,
          notes: orderNotes,
          payment_method: paymentMethod
        });
      }

      showKioskNotif(editingOrder ? '¡Añadido a la mesa correctamente!' : '¡Pedido procesado correctamente!', 'success');
      resetKiosk();
      setOrderNotes('');
      setTableName('');
      if (editingOrder) {
        finishEditingOrder();
      } else {
        setView('catalog');
        setActiveTab('orders');
      }

    } catch (error: any) {
      console.error('Error processing order:', error);
      showKioskNotif(error.message || 'Error al procesar el pedido.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToCategory = (categoryId: string) => {
    categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleKioskProductAdd = (product: Product) => {
    if ((product as any).customization_schema?.options?.length > 0) {
      setKioskIngrProduct(product);
      return;
    }

    const category = (product.category_id || '').toUpperCase();
    if (category.includes('BOCADILLO') || category.includes('BOCATA') || category.includes('SANDWICH')) {
      setKioskNotesProduct(product);
      return;
    }

    addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: (product as any).image_url || null,
      extras: [],
      notes: '',
      size: 'normal'
    });
  };

  return (
    <div className="h-full w-full bg-slate-50 relative font-sans text-zinc-900 overflow-hidden">
      
      {/* Toast Notificación */}
      {kioskNotification && (
        <div className={`fixed top-4 right-4 z-[9999] px-5 py-3 rounded-xl shadow-lg font-bold text-xs uppercase tracking-wider animate-fade-in flex items-center gap-2.5 ${
          kioskNotification.type === 'success' 
            ? 'bg-amber-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          <span>{kioskNotification.msg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 1: ASIGNACIÓN DE CLIENTE */}
      {/* ============================================================ */}
      {view === 'client' && (
        <div className="w-full h-full flex items-center justify-center p-3 sm:p-4 print:hidden overflow-y-auto pb-24 sm:pb-8">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-wider text-zinc-900 mb-1 text-center">Nuevo Ticket Mostrador</h2>
            <p className="text-zinc-500 mb-6 text-center text-xs">Selecciona la modalidad de entrega y el cliente</p>
            
            <div className="w-full grid grid-cols-3 gap-3 mb-6">
              {(['local', 'pickup', 'delivery'] as const).map(method => (
                <button 
                  key={method}
                  onClick={() => setDeliveryMethod(method)}
                  className={`py-3.5 px-3 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all border ${
                    deliveryMethod === method 
                      ? 'bg-amber-50 text-amber-900 border-amber-400 shadow-xs' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <span className="font-extrabold uppercase">
                    {method === 'local' ? 'Mesa / Local' : method === 'pickup' ? 'Para Recoger' : 'A Domicilio'}
                  </span>
                </button>
              ))}
            </div>

            {deliveryMethod !== 'local' && (
              <div className="w-full bg-zinc-50 border border-zinc-200 p-5 rounded-2xl">
                <h3 className="font-bold text-xs text-zinc-500 uppercase tracking-wider mb-3 text-center">Asignar Cliente</h3>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Teléfono, Nombre o Dirección..."
                    className="flex-1 bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button type="submit" disabled={isSearching} className="bg-amber-600 hover:bg-amber-700 text-white px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all">
                    Buscar
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {searchResults.map((c, i) => (
                      <div key={i} onClick={() => selectClient(c)} className="bg-white hover:bg-zinc-50 p-3.5 rounded-xl cursor-pointer border border-zinc-200 flex items-center justify-between transition-all shadow-xs">
                        <div>
                          <p className="font-bold text-sm text-zinc-900">{c.full_name || 'Sin Nombre'}</p>
                          <p className="text-xs text-zinc-500 font-mono">{c.phone}</p>
                          {c.address && <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{formatAddress(c.address)}</p>}
                        </div>
                        <div className="flex flex-col items-end">
                          {c.is_registered ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold">CLIENTE VIP</span>
                          ) : (
                            <span className="bg-zinc-100 text-zinc-600 text-[10px] px-2.5 py-0.5 rounded-full font-bold">MOSTRADOR</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="mt-3 text-center p-4 bg-white rounded-xl border border-dashed border-zinc-300">
                    <p className="text-zinc-500 mb-3 text-xs">No se encontró cliente con "{searchQuery}"</p>
                    <button onClick={handleOpenCreateModal} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs">
                      + Crear Cliente Nuevo
                    </button>
                  </div>
                )}
                
                {clientInfo && (
                  <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl relative">
                    <button onClick={() => setClientInfo(undefined)} className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-700">✕</button>
                    <h4 className="font-bold text-amber-800 text-xs uppercase tracking-wider mb-0.5">Cliente Asignado:</h4>
                    <p className="text-zinc-900 font-bold text-sm">{clientInfo.full_name}</p>
                    <p className="text-zinc-500 text-xs font-mono">{clientInfo.phone}</p>
                    {clientInfo.address && <p className="text-zinc-500 text-xs mt-0.5">{formatAddress(clientInfo.address)}</p>}
                  </div>
                )}
              </div>
            )}

            {deliveryMethod === 'local' && (
              <div className="w-full flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Identificador de Mesa o Barra</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Mesa 1, Terraza 3, Barra (Opcional)" 
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="w-full bg-white text-zinc-900 p-3 rounded-xl border border-zinc-300 outline-none focus:border-amber-500 transition-colors text-sm"
                  />
                </div>

                <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Puntos VIP / Cliente en Mesa (Opcional)</span>
                    {clientInfo && (
                      <button type="button" onClick={() => setClientInfo(undefined)} className="text-[11px] font-bold text-rose-600 hover:text-rose-700">Desvincular</button>
                    )}
                  </div>
                  {clientInfo ? (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-zinc-900">{clientInfo.full_name}</p>
                        <p className="text-[11px] text-zinc-500 font-mono">{clientInfo.phone}</p>
                      </div>
                      {clientInfo.is_registered ? (
                        <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-black">CLIENTE VIP</span>
                      ) : (
                        <span className="bg-zinc-200 text-zinc-700 text-[9px] px-2 py-0.5 rounded-full font-bold">MOSTRADOR</span>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSearch} className="flex gap-2">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Teléfono para acumular puntos VIP..."
                        className="flex-1 bg-white border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 text-xs focus:outline-none focus:border-amber-500"
                      />
                      <button type="submit" disabled={isSearching} className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 rounded-xl font-bold text-xs uppercase">
                        Buscar
                      </button>
                    </form>
                  )}
                  {searchResults.length > 0 && !clientInfo && (
                    <div className="mt-2 space-y-1.5 max-h-[160px] overflow-y-auto">
                      {searchResults.map((c, i) => (
                        <div key={i} onClick={() => selectClient(c)} className="bg-white hover:bg-amber-50/50 p-2.5 rounded-lg cursor-pointer border border-zinc-200 flex items-center justify-between transition-all">
                          <div>
                            <p className="font-bold text-xs text-zinc-900">{c.full_name || 'Sin Nombre'}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{c.phone}</p>
                          </div>
                          {c.is_registered && (
                            <span className="bg-amber-50 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-bold">VIP</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Payment Method Selector (Disponible para todas las modalidades) */}
            <div className="w-full mt-4">
              <h3 className="font-bold text-xs text-zinc-500 uppercase tracking-wider mb-2 text-center">Método de Pago</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setPaymentMethod('cash')} 
                  className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${paymentMethod === 'cash' ? 'bg-amber-50 text-amber-900 border-amber-400 shadow-xs' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
                >
                  Efectivo
                </button>
                <button 
                  type="button"
                  onClick={() => setPaymentMethod('tpv')} 
                  className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${paymentMethod === 'tpv' ? 'bg-blue-50 text-blue-800 border-blue-400 shadow-xs' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
                >
                  Tarjeta (Datáfono)
                </button>
              </div>
            </div>

            <div className="w-full mt-6 flex gap-3">
              <button onClick={() => setView('catalog')} className="flex-1 py-3 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold tracking-wider text-xs uppercase transition-colors rounded-xl shadow-xs">
                ← Volver al Catálogo
              </button>
              <button 
                onClick={handleProcessOrder}
                disabled={isProcessing || (deliveryMethod !== 'local' && !clientInfo)}
                className={`flex-[2] py-3 font-display font-extrabold tracking-wider text-xs uppercase transition-all rounded-xl shadow-sm ${
                  isProcessing || (deliveryMethod !== 'local' && !clientInfo) 
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {isProcessing ? 'Enviando...' : (editingOrder ? 'ACTUALIZAR PEDIDO' : 'ENVIAR A COCINA ➔')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: CATÁLOGO Y TICKET */}
      {/* ============================================================ */}
      {view === 'catalog' && (
        <div className="w-full h-full flex flex-col lg:flex-row gap-3 sm:gap-4 p-2 sm:p-4 print:hidden relative">
          
          {/* PANEL IZQUIERDO: CATÁLOGO CON SCROLL */}
          <div className={`bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl flex flex-col overflow-hidden shadow-xs ${
            mobileKioskTab === 'catalog' ? 'flex-1 flex' : 'hidden lg:flex lg:flex-1'
          }`}>
            
            {/* Header de la vista */}
            <div className="p-3 sm:p-3.5 border-b border-zinc-200 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => {
                    if (items.length > 0) {
                      setConfirmModal({
                        isOpen: true,
                        title: '¿Salir del Mostrador?',
                        message: 'Se vaciará el pedido actual que estás creando.',
                        confirmText: 'Sí, Salir y Vaciar',
                        confirmColor: 'rose',
                        onConfirm: () => {
                          resetKiosk();
                          finishEditingOrder();
                        }
                      });
                    } else {
                      finishEditingOrder();
                    }
                  }} className="p-2 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-xl text-zinc-600 transition-colors shadow-xs">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </button>
                  <h2 className="font-display font-black text-sm sm:text-base tracking-wider text-zinc-900 uppercase">Carta</h2>
                </div>

                {/* Mobile Tab Switcher Toggle Pill (visible on < lg) */}
                <div className="flex lg:hidden items-center bg-zinc-200/80 p-0.5 rounded-xl border border-zinc-300">
                  <button 
                    onClick={() => setMobileKioskTab('catalog')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      mobileKioskTab === 'catalog' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600'
                    }`}
                  >
                    Carta
                  </button>
                  <button 
                    onClick={() => setMobileKioskTab('ticket')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1 ${
                      mobileKioskTab === 'ticket' ? 'bg-amber-600 text-white shadow-xs' : 'text-zinc-600'
                    }`}
                  >
                    <span>Ticket</span>
                    {items.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        mobileKioskTab === 'ticket' ? 'bg-white text-amber-800' : 'bg-amber-600 text-white'
                      }`}>
                        {items.reduce((s, i) => s + i.quantity, 0)}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Categorías en Horizontal */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => scrollToCategory(cat.id)}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-lg font-bold text-xs whitespace-nowrap transition-colors shadow-xs"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Scroll de Productos */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 scroll-smooth custom-scrollbar">
              <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-36 lg:pb-16">
                {categories.map(cat => {
                  const catProducts = products.filter(p => p.category_id === cat.id);
                  if (catProducts.length === 0) return null;
                  return (
                    <div key={cat.id} ref={(el: any) => categoryRefs.current[cat.id] = el} className="scroll-mt-4">
                      <div className="flex items-center gap-3 mb-3 sm:mb-4">
                        <h3 className="font-display font-black text-sm sm:text-base uppercase tracking-wider text-zinc-900">
                          {cat.name}
                        </h3>
                        <div className="flex-1 h-px bg-zinc-200"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                        {catProducts.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleKioskProductAdd(product)}
                            className="bg-white border border-zinc-200 hover:border-amber-400 hover:shadow-md p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col text-left transition-all group shadow-xs active:scale-[0.98]"
                          >
                            <span className="font-bold text-zinc-900 text-xs sm:text-sm leading-tight mb-2 sm:mb-3 group-hover:text-amber-700 break-words">{product.name}</span>
                            <span className="font-display font-black text-amber-600 text-sm sm:text-base mt-auto">{product.price.toFixed(2)}€</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Floating Ticket Bar (when items > 0 and on catalog tab) */}
            {items.length > 0 && mobileKioskTab === 'catalog' && (
              <div 
                className="lg:hidden fixed left-3 right-3 sm:left-4 sm:right-4 z-40 animate-slide-up pointer-events-auto"
                style={{ bottom: '70px' }}
              >
                <button
                  onClick={() => setMobileKioskTab('ticket')}
                  className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:brightness-105 active:scale-[0.99] text-white font-display font-black py-3 px-4 rounded-2xl shadow-2xl flex items-center justify-between text-xs uppercase tracking-wider border border-amber-300 transition-transform"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-amber-900 px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">
                      {items.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                    <span className="font-extrabold tracking-wide">Ticket en Curso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black bg-amber-700/60 px-2.5 py-0.5 rounded-xl border border-amber-400/40">
                      {items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}€
                    </span>
                    <span className="flex items-center gap-1 font-bold">
                      <span>Ver Ticket</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* PANEL DERECHO: TICKET Y CLIENTE */}
          <div className={`w-full lg:w-[340px] xl:w-[380px] flex flex-col gap-3 shrink-0 ${
            mobileKioskTab === 'ticket' ? 'flex-1 flex' : 'hidden lg:flex'
          }`}>
            
            {/* Header del Ticket con botón volver en móvil */}
            <div className="lg:hidden flex items-center justify-between p-2 bg-zinc-100 rounded-2xl border border-zinc-200">
              <button 
                onClick={() => setMobileKioskTab('catalog')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 shadow-2xs"
              >
                <span>← Volver a la Carta</span>
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 pr-2">Mostrador</span>
            </div>

            {editingOrder && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-xs">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-xs text-center">
                  Añadiendo a: {editingOrder.client_name}
                </span>
                <span className="text-[11px] text-amber-700 text-center font-medium">
                  Se enviará directo a cocina.
                </span>
              </div>
            )}

            {/* Ticket de Compra */}
            <div className="bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl flex-1 flex flex-col shadow-xs overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/70">
                <h3 className="font-display font-black text-xs text-zinc-900 uppercase tracking-wider">Ticket Actual</h3>
                <button 
                  onClick={() => {
                    if (items.length > 0) {
                      setConfirmModal({
                        isOpen: true,
                        title: '¿Vaciar el Ticket?',
                        message: 'Se eliminarán todos los artículos agregados a este pedido.',
                        confirmText: 'Sí, Vaciar Ticket',
                        confirmColor: 'rose',
                        onConfirm: () => clearCart()
                      });
                    }
                  }} 
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                >
                  Vaciar
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {items.map(item => (
                  <div key={item.id} className="bg-zinc-50 border border-zinc-200/80 p-3 rounded-xl flex justify-between items-center">
                    <div className="flex-1 pr-2">
                      <p className="text-xs font-bold text-zinc-900 leading-tight">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {editingPriceId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={editingPriceValue}
                              onChange={(e) => {
                                setEditingPriceValue(e.target.value);
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  updatePrice(item.id, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                              }}
                              autoFocus
                              onBlur={() => setEditingPriceId(null)}
                              className="w-14 bg-white text-zinc-900 text-xs px-1.5 py-0.5 rounded border border-amber-500 outline-none"
                              step="0.1"
                            />
                            <span className="text-[10px] text-zinc-500">€/u</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-zinc-500">{item.price.toFixed(2)}€/u</p>
                            <button onClick={() => {
                              setEditingPriceId(item.id);
                              setEditingPriceValue(item.price.toString());
                            }} className="text-zinc-400 hover:text-zinc-700 text-xs" title="Editar precio">
                              ✎
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg p-0.5 border border-zinc-200 shadow-xs">
                      <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)} className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors font-bold text-sm">
                        {item.quantity > 1 ? '−' : '×'}
                      </button>
                      <span className="w-4 text-center font-bold text-zinc-900 text-xs">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors font-bold text-sm">+</button>
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider mb-2">El ticket está vacío</p>
                    <button 
                      onClick={() => setMobileKioskTab('catalog')} 
                      className="lg:hidden px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold uppercase"
                    >
                      Ir a la Carta
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3.5 sm:p-4 border-t border-zinc-200 bg-zinc-50/90 pb-20 sm:pb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-display font-black text-amber-600">{items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}€</span>
                </div>
                
                <button
                  onClick={() => {
                    if (deliveryMethod === 'local' && editingOrder) {
                      handleProcessOrder();
                    } else {
                      setView('client');
                    }
                  }}
                  disabled={items.length === 0}
                  className={`w-full py-3.5 rounded-xl font-display font-extrabold uppercase tracking-wider text-xs transition-all shadow-sm ${
                    items.length === 0 
                      ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {editingOrder && deliveryMethod === 'local' ? 'GUARDAR MESA' : 'ASIGNAR Y FINALIZAR ➔'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL CREAR CLIENTE KIOSKO */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-xl relative">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-700">
              ✕
            </button>
            <h2 className="text-xl font-display font-black text-zinc-900 uppercase tracking-wider mb-5">Nuevo Cliente</h2>
            <form onSubmit={handleCreateClient} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Nombre Completo</label>
                <input type="text" required value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-zinc-900 text-sm mt-1 focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Teléfono</label>
                <input type="tel" required value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-zinc-900 text-sm mt-1 focus:border-amber-500 outline-none" />
              </div>
              {deliveryMethod !== 'delivery' && (
                <p className="text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">
                  Es para recogida/local — la dirección es opcional.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Calle {deliveryMethod === 'delivery' ? '*' : '(Opcional)'}</label>
                  <input type="text" required={deliveryMethod === 'delivery'} value={addressStreet} onChange={e => setAddressStreet(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm mt-1 focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Número {deliveryMethod === 'delivery' ? '*' : '(Opcional)'}</label>
                  <input type="text" required={deliveryMethod === 'delivery'} value={addressNumber} onChange={e => setAddressNumber(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm mt-1 focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">CP {deliveryMethod === 'delivery' ? '*' : '(Opcional)'}</label>
                  <input type="text" required={deliveryMethod === 'delivery'} value={addressCP} onChange={e => setAddressCP(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm mt-1 focus:border-amber-500 outline-none" />
                </div>
              </div>
              <button type="submit" disabled={isCreatingClient} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-display font-extrabold py-3.5 rounded-xl mt-3 transition-all uppercase tracking-wider text-xs shadow-sm">
                {isCreatingClient ? 'Guardando...' : 'Guardar y Continuar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {kioskIngrProduct && (
        <KioskIngredientsModal
          product={kioskIngrProduct as any}
          onClose={() => setKioskIngrProduct(null)}
          onAdd={(item) => { addItem(item); setKioskIngrProduct(null); }}
        />
      )}

      {kioskNotesProduct && (
        <KioskNotesModal
          product={kioskNotesProduct as any}
          onClose={() => setKioskNotesProduct(null)}
          onAdd={(item) => { addItem(item); setKioskNotesProduct(null); }}
        />
      )}

      {printingAdditionalOrder && <TicketPrinter order={printingAdditionalOrder} />}

      {/* Modal de Confirmación de Operación */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-scale-in text-zinc-900">
            <div className="p-6 sm:p-7 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border ${
                confirmModal.confirmColor === 'rose' 
                  ? 'bg-rose-50 border-rose-200 text-rose-600' 
                  : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}>
                {confirmModal.confirmColor === 'rose' ? (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                ) : (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                )}
              </div>
              <h3 className="font-display font-extrabold text-zinc-900 text-lg uppercase tracking-wider mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="p-4 bg-zinc-50 flex gap-2.5 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  action();
                }}
                className={`flex-1 text-white font-display font-black rounded-xl py-3 text-xs uppercase tracking-wider transition-all shadow-sm ${
                  confirmModal.confirmColor === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
