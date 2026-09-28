import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/apiClient';
import { isStoreOpen, getStoreStatus, generateAvailableTimeSlots } from '../utils/timeUtils';
import { useHardwareBack } from '../utils/useHardwareBack';
import { emailService } from '../lib/emailService';
import { useI18nStore } from '../store/i18nStore';
import { useSettingsStore } from '../store/settingsStore';
import { BRAND_CONFIG } from '../config/brandConfig';

interface CheckoutModalProps {
  onClose: () => void;
  onSuccess: (orderData: any, isGuest: boolean) => void;
}

export default function CheckoutModal({ onClose, onSuccess }: CheckoutModalProps) {
  useHardwareBack(true, onClose);
  const { t, tDynamic } = useI18nStore();
  const { items, getTotal, removeItem, kioskClientInfo, setKioskClientInfo } = useCartStore();
  const { user, profile, updateProfile } = useAuthStore();
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [clientName, setClientName] = useState(kioskClientInfo?.name || profile?.full_name || '');
  const [clientPhone, setClientPhone] = useState(kioskClientInfo?.phone || profile?.phone || '');

  // `profile.address` ya llega como objeto (columna jsonb en Postgres) —
  // a diferencia de la versión Supabase, aquí no hace falta JSON.parse.
  const profileAddress = profile?.address || {};
  const initStreet = profileAddress.street || '';
  const initNumber = profileAddress.number || '';
  const initCP = profileAddress.cp || '';
  const initNotes = kioskClientInfo ? 'Local / Mesa' : (profileAddress.notes || '');

  const [addressStreet, setAddressStreet] = useState(initStreet);
  const [addressNumber, setAddressNumber] = useState(initNumber);
  const [addressCP, setAddressCP] = useState(initCP);
  const [addressNotes, setAddressNotes] = useState(initNotes);
  const [orderNotes, setOrderNotes] = useState('');
  const [pointsRedeemed, setPointsRedeemed] = useState(false);
  const [redeemItemId, setRedeemItemId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geofenceError, setGeofenceError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [minimumOrderError, setMinimumOrderError] = useState(false);
  const [acceptSmallOrderFee, setAcceptSmallOrderFee] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_delivery'>('cash');

  const storeStatus = getStoreStatus();
  const isOpen = storeStatus.isOpen;
  const availableSlots = generateAvailableTimeSlots(15);
  const [scheduledTime, setScheduledTime] = useState<string>(
    isOpen ? 'asap' : (availableSlots[0] || '')
  );

  // Pantalla de éxito para recogida (reemplaza la pantalla de tracking)
  const [isPickupSuccess, setIsPickupSuccess] = useState(false);
  const [pickupOrderId, setPickupOrderId] = useState<string | null>(null);

  const { deliveryFee, minOrderDelivery } = useSettingsStore();
  const subtotal = getTotal();

  // Todos los productos de la carta (patatas gourmet) son elegibles para el
  // descuento VIP — el cliente elige a cuál lo aplica, con el más económico
  // preseleccionado por defecto.
  const eligibleItems = items;
  const selectedRedeemItem = eligibleItems.find(i => i.id === redeemItemId)
    || (eligibleItems.length > 0 ? eligibleItems.reduce((cheapest, i) => i.price < cheapest.price ? i : cheapest) : null);
  const eligibleDiscount = selectedRedeemItem ? selectedRedeemItem.price : 0;

  const discount = pointsRedeemed && eligibleDiscount > 0 ? eligibleDiscount : 0;

  const needsSmallOrderFee = deliveryMethod === 'delivery' && (subtotal - discount) < minOrderDelivery;
  const smallOrderFee = needsSmallOrderFee && acceptSmallOrderFee ? deliveryFee : 0;
  const finalTotal = Math.max(0, subtotal - discount) + smallOrderFee;

  const userPoints = profile?.points || 0;
  const canRedeem = userPoints >= 25 && eligibleDiscount > 0;
  const pointsEarned = Math.floor(finalTotal / 10) * 4;

  const validateGeofence = async (): Promise<boolean> => {
    // 1. Zona de reparto configurable por el cliente (CP de España válido, 5 dígitos)
    if (deliveryMethod === 'delivery') {
      const cleanCP = addressCP.trim();
      if (!/^\d{5}$/.test(cleanCP)) {
        setGeofenceError('Introduce un código postal español válido (5 dígitos) para el reparto a domicilio.');
        return false;
      }
    }

    // 2. Si el dispositivo tiene geolocalización activa, verificar radio respecto al punto base configurado
    return new Promise<boolean>((resolve) => {
      if (!navigator.geolocation) {
        resolve(true);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat1 = position.coords.latitude;
          const lon1 = position.coords.longitude;
          const lat2 = 40.4168; // Punto base configurado (Puerta del Sol, Madrid — ubicación virtual de demo)
          const lon2 = -3.7038;

          const R = 6371; // Earth radius km
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLon = (lon2 - lon1) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const distance = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

          if (distance > 12) {
            setGeofenceError(`Te encuentras a ${distance.toFixed(1)} km del punto de reparto configurado. ${BRAND_CONFIG.name} opera de forma exclusiva en su zona de reparto.`);
            resolve(false);
          } else {
            resolve(true);
          }
        },
        () => {
          resolve(true);
        },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
      );
    });
  };

  const handleCheckoutClick = async () => {
    setPaymentError(null);
    if (needsSmallOrderFee && !acceptSmallOrderFee) {
      return;
    }

    setIsProcessing(true);
    const isWithinRange = await validateGeofence();
    setIsProcessing(false);

    if (!isWithinRange) {
      return;
    }

    // El motor no lleva ninguna pasarela de pago conectada: efectivo y
    // datáfono en reparto/recogida se procesan siempre directo, sin
    // redirección externa.
    processOrder();
  };

  const processOrder = async () => {
    setIsProcessing(true);

    const finalDeliveryAddress = deliveryMethod === 'delivery'
      ? `${addressStreet}, Nº ${addressNumber}, CP ${addressCP}${addressNotes ? '. Notas: ' + addressNotes : ''}`
      : addressNotes ? `Recogida en punto de encuentro (España · ubicación virtual). Notas: ${addressNotes}` : 'Recogida en punto de encuentro (España · ubicación virtual)';

    try {
      const orderItems = items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        redeem_target: !!(pointsRedeemed && selectedRedeemItem && item.id === selectedRedeemItem.id),
        customization_details: {
          name: item.name,
          notes: item.notes,
          extras: item.extras,
          size: item.size
        }
      }));

      const finalOrderNotes = [
        scheduledTime !== 'asap' ? `⏰ Programado: ${scheduledTime}` : '',
        addressNotes ? `Dir/Mesa: ${addressNotes}` : '',
        orderNotes.trim() ? `📝 ${orderNotes.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const { orderId, order: fullOrder } = await api.post('/checkout', {
        client_name: clientName,
        client_phone: clientPhone,
        delivery_address: finalDeliveryAddress,
        delivery_method: deliveryMethod,
        items: orderItems,
        points_redeemed: pointsRedeemed,
        small_order_fee_accepted: acceptSmallOrderFee,
        notes: finalOrderNotes || null,
        payment_method: paymentMethod
      });

      if (user && profile) {
        try {
          await updateProfile({
            phone: clientPhone,
            address: { street: addressStreet, number: addressNumber, cp: addressCP, notes: addressNotes },
            full_name: clientName
          });
        } catch (e) {
          // Un fallo actualizando el perfil no debe tirar abajo un pedido ya confirmado
          console.error('No se pudo sincronizar el perfil tras el pedido:', e);
        }
        useAuthStore.getState().fetchOrders();
      }

      if (kioskClientInfo) {
        setKioskClientInfo(undefined);
      }

      const orderDataForEmail = { id: orderId, total: finalTotal, clientName: clientName };
      if (user?.email) emailService.sendOrderConfirmation(user.email, orderDataForEmail);
      emailService.sendOrderToAdmin(orderDataForEmail);

      // Para recogida mostramos pantalla de confirmación interna;
      // para domicilio llamamos onSuccess directamente (va a tracking)
      if (deliveryMethod === 'pickup') {
        setPickupOrderId(String(orderId));
        setIsPickupSuccess(true);
        useCartStore.getState().clearCart();
        if (user) {
          useAuthStore.getState().fetchOrders();
        }
      } else {
        onSuccess(fullOrder || { id: orderId }, !user);
      }
    } catch (error: any) {
      console.error('Error procesando pedido:', error);
      const msg = error?.message || '';
      const friendlyMsg = msg.includes('Manipulación')
        ? t('error_integrity')
        : msg.includes('Demasiados pedidos')
        ? t('error_too_many')
        : msg.includes('no está disponible')
        ? t('error_unavailable')
        : t('error_processing');
      setPaymentError(friendlyMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto no-scrollbar">

      {/* Pantalla de confirmación de recogida */}
      {isPickupSuccess && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="bg-[#FAF6F0] border-2 border-[#E5DCD0] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#2D5A27] to-[#B45309]"></div>
            <div className="w-20 h-20 bg-[#EAF2E8] rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-[#2D5A27]/40 animate-scale-in">
              <svg className="w-10 h-10 text-[#2D5A27]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-[#2D5A27] uppercase tracking-widest block mb-1">Pedido Confirmado</span>
            <h2 className="font-display font-black text-2xl text-[#1A201A] uppercase mb-2">🥖 ¡Listo!</h2>
            <p className="text-[#5C6B5C] text-sm leading-relaxed mb-6 font-medium">
              Tu pedido ha sido recibido en cocina. <strong className="text-[#1A201A]">Ven a recogerlo al obrador</strong> en unos <strong className="text-[#2D5A27]">15–20 minutos</strong>.
            </p>
            <div className="bg-white border border-[#E5DCD0] rounded-2xl p-4 mb-6 text-left space-y-1">
              <p className="text-[10px] font-bold text-[#5C6B5C] uppercase tracking-widest">Punto de recogida</p>
              <p className="text-[#1A201A] font-bold text-sm">📍 {BRAND_CONFIG.name}</p>
              <p className="text-[#5C6B5C] text-xs">{BRAND_CONFIG.slogan}</p>
            </div>
            <button
              onClick={() => { setIsPickupSuccess(false); onSuccess({ id: pickupOrderId, total_amount: finalTotal, clientName: clientName }, !user); }}
              className="w-full bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-display font-black py-4 rounded-xl uppercase tracking-wider text-sm transition-all shadow-[0_8px_20px_rgba(45,90,39,0.35)] hover:scale-[1.02] active:scale-95 border border-[#4D7C0F]"
            >
              Entendido, ¡gracias!
            </button>
          </div>
        </div>
      )}

      {geofenceError && (
        <div className="absolute inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF6F0] border-2 border-[#E5DCD0] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 to-[#B45309]"></div>
            <div className="w-16 h-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <h3 className="font-display font-black text-2xl text-[#1A201A] mb-2 uppercase tracking-wide">{t('far_away_title')}</h3>
            <p className="text-[#5C6B5C] text-sm mb-6 leading-relaxed font-medium">
              {geofenceError}
            </p>
            <div className="space-y-3">
              <button onClick={() => setGeofenceError(null)} className="block w-full bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-display font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_4px_15px_rgba(45,90,39,0.3)]">
                {t('understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#FAF6F0] border-2 border-[#E5DCD0] rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[92vh] animate-fade text-[#1A201A] relative">
        <div className="p-4 pt-5 sm:p-6 sm:pt-7 border-b border-[#E5DCD0] flex items-center justify-between bg-white relative overflow-hidden gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-display font-black text-[#2D5A27] uppercase tracking-widest block">🥖 {t('official_checkout')}</span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-[#1A201A] mt-0.5 uppercase tracking-tight">{t('checkout_summary')}</h3>
          </div>
          <button onClick={onClose} className="text-[#5C6B5C] hover:text-[#1A201A] text-lg font-bold p-2 bg-[#FAF6F0] hover:bg-[#E5DCD0] rounded-xl border border-[#E5DCD0] shrink-0 z-10 relative transition-colors">✕</button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-sm text-[#5C6B5C] no-scrollbar">

          {!isOpen && (
            <div className="bg-[#FAF6F0] border-2 border-[#B45309]/30 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm animate-fade-in">
              <div className="w-10 h-10 rounded-xl bg-[#B45309]/10 border border-[#B45309]/20 flex items-center justify-center shrink-0 text-[#B45309]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-display font-black text-[#B45309] uppercase tracking-wider">{storeStatus.badgeText}</span>
                  <span className="text-[10px] bg-[#B45309]/15 text-[#B45309] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Programar Pedido</span>
                </div>
                <p className="text-xs text-[#5C6B5C] mt-1 leading-relaxed font-medium">
                  En este momento el obrador no está despachando en directo ({storeStatus.detailText}). <strong>Puedes dejar tu pedido programado a continuación</strong> y te lo prepararemos con total puntualidad.
                </p>
              </div>
            </div>
          )}

          {paymentError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center animate-fade-in">
              <span className="text-2xl mb-2 block">⚠️</span>
              <p className="text-red-700 font-bold text-sm">{paymentError}</p>
            </div>
          )}

          {/* Artículos Seleccionados */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <span className="font-display font-black text-[#1A201A] text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <span>{t('items_in_order')}</span>
                <span className="text-[#2D5A27] font-bold text-xs bg-[#EAF2E8] px-2 py-0.5 rounded-md border border-[#2D5A27]/20">{items.length} {t('items_count')}</span>
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E5DCD0] shadow-sm">
                  <div className="flex flex-col flex-1 min-w-0 mr-2">
                    <span className="font-bold text-[#1A201A] text-xs sm:text-sm truncate">{item.quantity}x {tDynamic(item.name)}</span>
                    {item.extras && item.extras.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.extras.map((extra, i) => (
                          <span key={i} className="inline-flex items-center text-[10px] font-bold bg-[#EAF2E8] text-[#2D5A27] px-1.5 py-0.5 rounded-md border border-[#2D5A27]/20">
                            + {extra}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-[#5C6B5C] italic mt-1 flex items-center gap-1">
                        <span>📝</span>
                        <span className="truncate">"{item.notes}"</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display font-black text-[#1A201A] whitespace-nowrap text-sm">{(item.price * item.quantity).toFixed(2).replace('.', ',')}&nbsp;€</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="w-7 h-7 rounded-lg bg-[#FAF6F0] hover:bg-red-500 hover:text-white text-[#5C6B5C] flex items-center justify-center transition-all shrink-0 border border-[#E5DCD0]"
                      title="Eliminar artículo"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Puntos Club VIP */}
          {user ? (
            <>
            <div className="bg-white border border-[#E5DCD0] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#B45309] text-white font-display font-black flex items-center justify-center text-xs shrink-0 shadow">VIP</div>
                <div>
                  <span className="font-bold text-[#1A201A] block text-xs sm:text-sm">{t('vip_club')} <span className="text-[#B45309] font-display font-extrabold">{userPoints}</span> {t('points')}</span>
                  <span className="text-[11px] text-[#5C6B5C] leading-tight block">
                    {eligibleDiscount > 0 ? (
                      <>{t('redeem_25')} <strong className="text-[#2D5A27] whitespace-nowrap">-{eligibleDiscount.toFixed(2).replace('.', ',')}&nbsp;€</strong></>
                    ) : (
                      <>{t('add_product_redeem')}</>
                    )}
                  </span>
                  <span className="text-[10px] text-[#2D5A27] font-bold block mt-0.5">{t('earn_points')} +{pointsEarned} {t('with_this_order')}</span>
                </div>
              </div>
              <button
                onClick={() => setPointsRedeemed(!pointsRedeemed)}
                disabled={!canRedeem && !pointsRedeemed}
                className={`w-full sm:w-auto justify-center font-display font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider shrink-0 transition-all border ${pointsRedeemed ? 'bg-[#2D5A27] text-white border-[#2D5A27]' : (canRedeem ? 'bg-[#FAF6F0] hover:bg-[#E5DCD0] text-[#1A201A] border-[#E5DCD0]' : 'bg-[#FAF6F0] text-gray-400 border-[#E5DCD0] cursor-not-allowed')}`}
              >
                {pointsRedeemed ? t('redeemed_btn') : t('redeem_btn')}
              </button>
            </div>
            {pointsRedeemed && eligibleItems.length > 1 && (
              <div className="bg-white border border-[#E5DCD0] rounded-2xl p-3.5 -mt-1 shadow-sm">
                <p className="text-[10px] text-[#5C6B5C] uppercase tracking-widest font-bold mb-2">{t('choose_redeem_item')}</p>
                <div className="flex flex-wrap gap-2">
                  {eligibleItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRedeemItemId(item.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                        selectedRedeemItem?.id === item.id
                          ? 'bg-[#2D5A27] text-white border-[#2D5A27]'
                          : 'bg-[#FAF6F0] text-[#5C6B5C] border-[#E5DCD0] hover:border-[#2D5A27]'
                      }`}
                    >
                      <span className="whitespace-nowrap">{item.name} · {item.price.toFixed(2).replace('.', ',')}&nbsp;€</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="bg-white border border-[#E5DCD0] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="font-bold text-[#1A201A] block text-xs sm:text-sm">🥖 {t('have_vip')}</span>
                <span className="text-xs text-[#5C6B5C] block mt-0.5">{t('login_to_redeem')}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    useAuthStore.getState().openUserModal('login');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#FAF6F0] hover:bg-[#E5DCD0] text-[#1A201A] text-xs font-bold uppercase rounded-xl transition-colors border border-[#E5DCD0]"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => {
                    useAuthStore.getState().openUserModal('register');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#2D5A27] hover:bg-[#1E3D1A] text-white text-xs font-bold uppercase rounded-xl transition-colors shadow-sm"
                >
                  {t('register')}
                </button>
              </div>
            </div>
          )}

          {/* Método Entrega */}
          <div className="space-y-2 sm:space-y-2.5">
            <span className="font-display font-black text-[#1A201A] text-xs uppercase tracking-wider block">{t('delivery_mode')}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-medium">
              <label onClick={() => setDeliveryMethod('delivery')} className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer shadow-sm transition-all ${deliveryMethod === 'delivery' ? 'border-2 border-[#2D5A27] bg-[#EAF2E8]' : 'border border-[#E5DCD0] bg-white hover:border-[#2D5A27]'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={deliveryMethod === 'delivery'} readOnly className="accent-[#2D5A27] w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-[#1A201A] block text-xs sm:text-sm">{t('delivery_zone_msg')}</span>
                    <span className="text-[10px] sm:text-[11px] text-[#2D5A27] font-bold">{t('free_delivery')}</span>
                  </div>
                </div>
              </label>
              <label onClick={() => setDeliveryMethod('pickup')} className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer shadow-sm transition-all ${deliveryMethod === 'pickup' ? 'border-2 border-[#2D5A27] bg-[#EAF2E8]' : 'border border-[#E5DCD0] bg-white hover:border-[#2D5A27]'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={deliveryMethod === 'pickup'} readOnly className="accent-[#2D5A27] w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-[#1A201A] block text-xs sm:text-sm">Para Recoger</span>
                    <span className="text-[10px] sm:text-[11px] text-[#5C6B5C]">Obrador BOKADIPAN</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Datos de Envío */}
          <div className="space-y-3 border-t border-[#E5DCD0] pt-4">
            <span className="font-display font-black text-[#1A201A] text-xs uppercase tracking-wider block">{t('contact_data')}</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medium mb-3">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-wider mb-1">{t('full_name')} <span className="text-red-500">*</span></label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t('name_placeholder')} className="w-full bg-white border border-[#E5DCD0] rounded-xl px-3.5 py-2.5 text-[#1A201A] text-xs sm:text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] font-medium" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-wider mb-1">{t('mobile_whatsapp')} <span className="text-red-500">*</span></label>
                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Ej. 679 00 00 00" className="w-full bg-white border border-[#E5DCD0] rounded-xl px-3.5 py-2.5 text-[#1A201A] text-xs sm:text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] font-medium" />
              </div>
            </div>

            {deliveryMethod === 'delivery' ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-medium">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-wider mb-1">{t('exact_street')} <span className="text-red-500">*</span></label>
                  <input type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder={t('street_placeholder')} className="w-full bg-white border border-[#E5DCD0] rounded-xl px-3.5 py-2.5 text-[#1A201A] text-xs sm:text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] font-medium" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-wider mb-1">Nº <span className="text-red-500">*</span></label>
                  <input type="text" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="1" className="w-full bg-white border border-[#E5DCD0] rounded-xl px-3.5 py-2.5 text-[#1A201A] text-xs sm:text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] font-medium" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-wider mb-1">CP <span className="text-red-500">*</span></label>
                  <input type="text" value={addressCP} onChange={e => setAddressCP(e.target.value)} placeholder="28013" className="w-full bg-white border border-[#E5DCD0] rounded-xl px-3.5 py-2.5 text-[#1A201A] text-xs sm:text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] font-medium" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-wider mb-1">Piso / Puerta</label>
                  <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Ej. 2ºA, Timbre" className="w-full bg-white border border-[#E5DCD0] rounded-xl px-3.5 py-2.5 text-[#1A201A] text-xs sm:text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] font-medium" />
                </div>
              </div>
            ) : (
              <div className="font-medium">
                <label className="block text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-wider mb-1">Notas para Recogida (Opcional)</label>
                <input type="text" value={addressNotes} onChange={e => setAddressNotes(e.target.value)} placeholder="Ej. Recoge mi hermano Carlos" className="w-full bg-white border border-[#E5DCD0] rounded-xl px-3.5 py-2.5 text-[#1A201A] text-xs sm:text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] font-medium" />
              </div>
            )}

            {/* Notas Globales para Cocina / Obrador */}
            <div className="pt-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-wider mb-1">
                📝 Instrucciones Especiales para Obrador / Reparto (Opcional)
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder="Ej: pan extra tostado, llamar al móvil al llegar..."
                className="w-full bg-white border border-[#E5DCD0] rounded-xl px-3.5 py-2.5 text-[#1A201A] text-xs sm:text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] font-medium"
              />
            </div>
          </div>

          {/* Cuándo lo quieres */}
          <div className="space-y-2.5 border-t border-[#E5DCD0] pt-4">
            <div className="flex items-center justify-between">
              <span className="font-display font-black text-[#1A201A] text-xs uppercase tracking-wider block">{t('when_want')}</span>
              {!isOpen && (
                <span className="text-[10px] bg-[#B45309]/15 text-[#B45309] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Programación requerida
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-medium">
              <label 
                onClick={() => isOpen && setScheduledTime('asap')} 
                className={`flex items-center gap-3 p-3 rounded-xl transition-all shadow-sm ${
                  scheduledTime === 'asap' 
                    ? 'bg-[#EAF2E8] border-2 border-[#2D5A27]' 
                    : 'bg-white border border-[#E5DCD0]'
                } ${!isOpen ? 'opacity-40 cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:border-[#2D5A27]'}`}
              >
                <input 
                  type="radio" 
                  checked={scheduledTime === 'asap'} 
                  readOnly 
                  disabled={!isOpen} 
                  className="accent-[#2D5A27] w-4 h-4 shrink-0" 
                />
                <div>
                  <span className="font-bold text-[#1A201A] text-xs sm:text-sm block">{t('asap')}</span>
                  <span className="text-[11px] text-[#5C6B5C] font-medium">{isOpen ? t('prepare_now') : 'Cerrado ahora'}</span>
                </div>
              </label>

              <label 
                onClick={() => {
                  if (availableSlots.length > 0 && scheduledTime === 'asap') {
                    setScheduledTime(availableSlots[0]);
                  }
                }} 
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all shadow-sm ${
                  scheduledTime !== 'asap' 
                    ? 'bg-[#FAF6F0] border-2 border-[#B45309]' 
                    : 'bg-white border border-[#E5DCD0] hover:border-[#B45309]'
                } ${availableSlots.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input 
                  type="radio" 
                  checked={scheduledTime !== 'asap'} 
                  readOnly 
                  disabled={availableSlots.length === 0} 
                  className="accent-[#B45309] w-4 h-4 shrink-0" 
                />
                <div className="w-full pr-2">
                  <span className="font-bold text-[#1A201A] text-xs sm:text-sm block">{t('schedule')}</span>
                  {availableSlots.length > 0 ? (
                    <select 
                      value={scheduledTime !== 'asap' ? scheduledTime : availableSlots[0]} 
                      onChange={(e) => setScheduledTime(e.target.value)} 
                      className="mt-1.5 block w-full bg-white border border-[#E5DCD0] text-[#1A201A] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#B45309] font-bold"
                    >
                      {availableSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-[#5C6B5C]">{t('no_slots_today')}</span>
                  )}
                </div>
              </label>
            </div>
            {!isOpen && availableSlots.length === 0 && (
              <p className="text-[11px] text-[#B45309] bg-[#FAF6F0] p-2.5 rounded-lg border border-[#E5DCD0] font-medium">
                No hay franjas horarias configuradas para programar en este momento.
              </p>
            )}
          </div>

          {/* Forma de Pago */}
          <div className="space-y-2.5 border-t border-[#E5DCD0] pt-4">
            <span className="font-display font-black text-[#1A201A] text-xs uppercase tracking-wider block">{t('payment_form')}</span>

            <div className="bg-white border border-[#E5DCD0] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex flex-col gap-2">
                <label onClick={() => setPaymentMethod('cash')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${paymentMethod === 'cash' ? 'bg-[#EAF2E8] border-2 border-[#2D5A27]' : 'bg-[#FAF6F0] border border-[#E5DCD0] hover:border-[#2D5A27]'}`}>
                  <input type="radio" checked={paymentMethod === 'cash'} readOnly className="accent-[#2D5A27] w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-[#1A201A] text-xs sm:text-sm block">{t('pay_cash')}</span>
                    <span className="text-[11px] text-[#5C6B5C]">{deliveryMethod === 'delivery' ? t('pay_cash_delivery_desc') : t('pay_cash_pickup_desc')}</span>
                  </div>
                </label>
                <label onClick={() => setPaymentMethod('card_delivery')} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${paymentMethod === 'card_delivery' ? 'bg-[#EAF2E8] border-2 border-[#2D5A27]' : 'bg-[#FAF6F0] border border-[#E5DCD0] hover:border-[#2D5A27]'}`}>
                  <input type="radio" checked={paymentMethod === 'card_delivery'} readOnly className="accent-[#2D5A27] w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold text-[#1A201A] text-xs sm:text-sm block">{t('pay_card_terminal')}</span>
                    <span className="text-[11px] text-[#5C6B5C]">{deliveryMethod === 'delivery' ? t('pay_card_terminal_delivery_desc') : t('pay_card_terminal_pickup_desc')}</span>
                  </div>
                </label>
                <p className="text-[10px] text-[#5C6B5C] border-t border-[#E5DCD0] pt-2 mt-1">
                  {t('instant_confirm')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-white text-[#1A201A] border-t border-[#E5DCD0] shrink-0">
          {needsSmallOrderFee && (
            <div className="bg-[#FAF6F0] border-2 border-[#B45309]/30 rounded-2xl p-3.5 space-y-2 mb-4">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-[#1A201A] leading-relaxed font-medium">
                  El pedido mínimo para envíos gratuitos es de <strong className="text-[#B45309] whitespace-nowrap">{minOrderDelivery.toFixed(2).replace('.', ',')}&nbsp;€</strong>.
                </p>
              </div>
              <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl cursor-pointer hover:bg-[#FAF6F0] transition-colors border border-[#E5DCD0]">
                <input
                  type="checkbox"
                  checked={acceptSmallOrderFee}
                  onChange={(e) => setAcceptSmallOrderFee(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E5DCD0] text-[#2D5A27] focus:ring-[#2D5A27] accent-[#2D5A27]"
                />
                <span className="text-xs text-[#1A201A]">Aceptar recargo de <span className="font-bold whitespace-nowrap">{deliveryFee.toFixed(2).replace('.', ',')}&nbsp;€</span></span>
              </label>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center justify-between sm:block">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#5C6B5C] uppercase tracking-widest block">{t('total_to_pay')}</span>
              <span className="font-display font-black text-2xl sm:text-3xl text-[#1A201A] whitespace-nowrap">{finalTotal.toFixed(2).replace('.', ',')}&nbsp;€</span>
            </div>
            <button
              disabled={isProcessing || !clientName || !clientPhone || (deliveryMethod === 'delivery' && (!addressStreet || !addressNumber || !addressCP)) || (needsSmallOrderFee && !acceptSmallOrderFee) || (!isOpen && (!scheduledTime || scheduledTime === 'asap'))}
              onClick={handleCheckoutClick}
              className="bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-display font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl shadow-[0_8px_20px_rgba(45,90,39,0.35)] uppercase tracking-wider text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed border border-[#4D7C0F]"
            >
              {isProcessing ? t('processing') : (t('confirm_order_btn') || 'Confirmar Pedido')}
            </button>
          </div>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 z-[1200] bg-[#FAF6F0]/90 backdrop-blur-md flex flex-col items-center justify-center rounded-[2rem] animate-fade-in">
            <div className="w-14 h-14 border-4 border-[#2D5A27] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#2D5A27] font-display font-black uppercase tracking-widest animate-pulse text-xs sm:text-sm">
              {t('confirming_order')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
