import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { MarketingCampaignModal } from './components/MarketingCampaignModal';
import { useI18nStore } from '../../store/i18nStore';
import { BRAND_CONFIG } from '../../config/brandConfig';

// Simple Modal for Order History
const OrderHistoryModal = ({ user, onClose, orders }: { user: any, onClose: () => void, orders: any[] }) => {
  if (!user) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-slate-50/70 rounded-t-3xl">
          <div>
            <h3 className="text-xl font-display font-black text-zinc-900 uppercase tracking-wide">Historial de Pedidos</h3>
            <p className="text-zinc-500 text-xs mt-1 font-medium">{user.full_name || 'Sin Nombre'} ({user.phone || 'Sin Teléfono'})</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center text-lg font-bold transition-colors">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {orders.length === 0 ? (
            <p className="text-zinc-400 text-center py-8 font-medium text-sm">No hay pedidos registrados para este cliente.</p>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-slate-50 border border-zinc-200 p-4 rounded-2xl flex justify-between items-center shadow-xs">
                <div>
                  <p className="text-zinc-900 font-bold text-sm">{new Date(order.created_at).toLocaleString('es-ES')}</p>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-semibold">{order.status} • {order.delivery_method}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-amber-600">{Number(order.total_amount).toFixed(2)}€</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">#{order.id.slice(0, 8)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default function AdminAnalytics() {
  const { t } = useI18nStore();
  const [users, setUsers] = useState<any[]>([]);
  const [ordersToday, setOrdersToday] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<any>(null);

  // Tráfico de la web (visitas + categorías más vistas)
  const [siteVisits, setSiteVisits] = useState<any[]>([]);
  const [visitsError, setVisitsError] = useState('');
  const [visitsLoading, setVisitsLoading] = useState(true);

  // Instalaciones de la App (PWA)
  const [pwaInstalls, setPwaInstalls] = useState<any[]>([]);
  const [pwaError, setPwaError] = useState('');

  // Inteligencia de ventas real
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [orderItemsRaw, setOrderItemsRaw] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsError, setReviewsError] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
    fetchOrdersToday();
  }, []);

  const fetchAnalyticsData = async () => {
    setVisitsLoading(true);
    let profilesData: any[] = [], kioskData: any[] = [], ordersData: any[] = [];
    try {
      const res = await api.get('/admin/analytics');
      profilesData = res.profiles || [];
      kioskData = res.kioskCustomers || [];
      ordersData = res.orders || [];
      setSiteVisits(res.siteVisits || []);
      setPwaInstalls(res.pwaInstalls || []);
      setOrderItemsRaw(res.orderItems || []);
      setReviews((res.orders || []).filter((o: any) => o.rating != null));
    } catch (e: any) {
      console.error('Error cargando analítica:', e);
      const msg = e?.message || 'No se pudo cargar la analítica';
      setVisitsError(msg);
      setPwaError(msg);
      setReviewsError(msg);
    }
    setVisitsLoading(false);
    setAllOrders(ordersData || []);

    // Create a unified map of users by phone number
    const usersMap = new Map();

    // 1. Add Profiles
    (profilesData || []).forEach(p => {
      if (p.phone) usersMap.set(p.phone, { ...p, is_app: true, orderHistory: [] });
    });

    // 2. Add Kiosk Customers
    (kioskData || []).forEach(k => {
      if (k.phone) {
        if (!usersMap.has(k.phone)) {
          usersMap.set(k.phone, { ...k, points: k.points || 0, is_kiosk: true, orderHistory: [] });
        } else {
          usersMap.get(k.phone).is_kiosk = true;
        }
      }
    });

    // 3. Process Orders for ghost clients and order history
    (ordersData || []).forEach(order => {
      const phone = order.client_phone;
      if (phone && phone.trim() !== '' && phone !== 'Sin Teléfono' && phone !== 'unknown') {
        if (!usersMap.has(phone)) {
          usersMap.set(phone, {
            id: 'ghost-' + order.id,
            full_name: order.client_name || 'Cliente Anónimo',
            phone: phone,
            points: 0,
            is_ghost: true,
            created_at: order.created_at,
            orderHistory: []
          });
        }
        usersMap.get(phone).orderHistory.push(order);
      } else if (order.user_id) {
        const userByProfile = Array.from(usersMap.values()).find(u => u.id === order.user_id);
        if (userByProfile) {
          userByProfile.orderHistory.push(order);
        }
      }
    });

    const allUsers = Array.from(usersMap.values());

    allUsers.forEach(u => {
      u.orderHistory.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setUsers(allUsers);
  };

  // --- Derivados de tráfico ---
  const pageViews = siteVisits.filter(v => v.event_type === 'page_view');
  const categoryClicks = siteVisits.filter(v => v.event_type === 'category_click');

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const visitsToday = pageViews.filter(v => new Date(v.created_at) >= startOfToday).length;
  const visitsTotal = pageViews.length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const visitsByDay = last7Days.map(day => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = pageViews.filter(v => {
      const t = new Date(v.created_at);
      return t >= day && t < next;
    }).length;
    return { label: day.toLocaleDateString('es-ES', { weekday: 'short' }), count };
  });
  const maxDayCount = Math.max(1, ...visitsByDay.map(d => d.count));

  const topCategories = Object.entries(
    categoryClicks.reduce((acc: Record<string, number>, c) => {
      const key = c.label || 'Sin categoría';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, count]) => ({ label, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxCategoryCount = Math.max(1, ...topCategories.map(c => c.count));

  // --- Derivados de instalaciones PWA ---
  const pwaPublicInstalls = pwaInstalls.filter(i => i.app_type === 'public').length;
  const pwaAdminInstalls = pwaInstalls.filter(i => i.app_type === 'admin').length;
  const pwaMobileInstalls = pwaInstalls.filter(i => i.device_type === 'mobile').length;
  const pwaDesktopInstalls = pwaInstalls.filter(i => i.device_type === 'desktop').length;

  const emailRecipients = Array.from(new Set(users.filter(u => u.email && u.email.includes('@')).map(u => u.email)));

  const validOrders = allOrders.filter(o => o.status !== 'cancelled');

  const productStats = orderItemsRaw
    .filter((item: any) => item.orders?.status !== 'cancelled')
    .reduce((acc: Record<string, { qty: number; revenue: number }>, item: any) => {
    const name = item.customization_details?.name || 'Producto sin nombre';
    if (!acc[name]) acc[name] = { qty: 0, revenue: 0 };
    acc[name].qty += Number(item.quantity || 0);
    acc[name].revenue += Number(item.quantity || 0) * Number(item.unit_price || 0);
    return acc;
  }, {});
  const topProducts = Object.entries(productStats)
    .map(([name, s]) => ({ name, ...(s as { qty: number; revenue: number }) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const maxProductQty = Math.max(1, ...topProducts.map(p => p.qty));

  const hourBuckets = Array.from({ length: 12 }, (_, i) => ({ label: `${String(i * 2).padStart(2, '0')}h`, count: 0 }));
  validOrders.forEach(o => {
    const h = new Date(o.created_at).getHours();
    hourBuckets[Math.floor(h / 2)].count++;
  });
  const maxHourCount = Math.max(1, ...hourBuckets.map(h => h.count));
  const peakBucket = hourBuckets.reduce((max, b) => (b.count > max.count ? b : max), hourBuckets[0]);

  const avgTicketAll = validOrders.length > 0
    ? validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) / validOrders.length
    : 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const ordersLast7 = validOrders.filter(o => new Date(o.created_at) >= sevenDaysAgo);
  const avgTicketLast7 = ordersLast7.length > 0
    ? ordersLast7.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) / ordersLast7.length
    : 0;

  const usersWithOrders = users.filter(u => (u.orderHistory?.length || 0) > 0);
  const repeatCustomers = usersWithOrders.filter(u => (u.orderHistory?.length || 0) >= 2);
  const repeatRate = usersWithOrders.length > 0 ? (repeatCustomers.length / usersWithOrders.length) * 100 : 0;

  const ordersWithRedemption = validOrders.filter(o => o.points_redeemed === true).length;
  const eligibleOrders = validOrders.filter(o => o.user_id).length;
  const redemptionRate = eligibleOrders > 0 ? (ordersWithRedemption / eligibleOrders) * 100 : 0;

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length : 0;

  const fetchOrdersToday = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
      const { orders: data } = await api.get('/admin/orders?from=' + encodeURIComponent(today.toISOString()));
      const count = (data || []).filter((o: any) => o.status !== 'cancelled').length;
      setOrdersToday(count);
    } catch (e) {
      console.error('Error cargando pedidos de hoy:', e);
    }
  };

  const csvEscape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const downloadCSV = () => {
    if (users.length === 0) {
      alert("No hay usuarios para exportar.");
      return;
    }

    const DELIM = ';';
    const headers = [t('client_id'), t('name'), t('email'), t('phone'), t('points'), 'Pedidos', 'Total Gastado (€)', t('registration_date')];

    const rows = users.map(u => {
      const date = new Date(u.created_at).toLocaleDateString('es-ES');
      const orderCount = u.orderHistory?.length || 0;
      const totalSpent = (u.orderHistory || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      return [
        u.id.slice(0, 8),
        u.full_name || '',
        u.email || '',
        u.phone || '',
        u.points || 0,
        orderCount,
        totalSpent.toFixed(2),
        date
      ].map(csvEscape).join(DELIM);
    });

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = headers.map(csvEscape).join(DELIM) + '\r\n' + rows.join('\r\n');

    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);

    const dateStr = new Date().toISOString().split('T')[0];
    a.setAttribute('download', `Clientes_${dateStr}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadJSON = () => {
    if (users.length === 0) {
      alert("No hay usuarios para exportar.");
      return;
    }
    const jsonStr = JSON.stringify(users, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.setAttribute('href', url);
    a.setAttribute('download', `Usuarios_BD_${dateStr}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-zinc-900 overflow-y-auto custom-scrollbar print:h-auto print:overflow-visible print:bg-white print:text-black">
      <div className="p-3.5 sm:p-6 pb-24 sm:pb-6 print:hidden space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-zinc-900 tracking-wide">
              Analítica y <span className="text-amber-600">Marketing</span>
            </h2>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">Métricas de tráfico, inteligencia de ventas y retención de clientes</p>
          </div>
        </div>
      
        {/* KPI Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest mb-1.5">Visitas Hoy</h3>
            <p className="text-3xl sm:text-4xl font-black text-blue-600 leading-tight">{visitsToday}</p>
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">Accesos únicos registrados</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest mb-1.5">Visitas Totales</h3>
            <p className="text-3xl sm:text-4xl font-black text-zinc-900 leading-tight">{visitsTotal}</p>
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">Histórico acumulado PWA</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest mb-1.5">Pedidos Hoy</h3>
            <p className="text-3xl sm:text-4xl font-black text-amber-600 leading-tight">{ordersToday}</p>
            <p className="text-[11px] text-zinc-500 mt-1 font-medium">Arqueo detallado en Historial</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest mb-1.5">Total Clientes BD</h3>
            <p className="text-3xl sm:text-4xl font-black text-zinc-900 leading-tight">{users.length}</p>
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">Perfiles registrados en sistema</p>
          </div>
        </div>

        {/* Tráfico: tendencia 7 días + categorías más vistas */}
        {visitsError ? (
          <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl shadow-xs">
            <h3 className="text-rose-700 font-bold mb-1 text-sm">Tráfico web no disponible</h3>
            <p className="text-zinc-600 text-xs">No se pudo cargar el tráfico de la web ({visitsError}). Contacta con soporte técnico si el problema persiste.</p>
          </div>
        ) : !visitsLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-widest mb-4">Visitas — últimos 7 días</h3>
              {visitsTotal === 0 ? (
                <p className="text-zinc-400 italic text-sm">Aún no hay visitas registradas.</p>
              ) : (
                <div className="flex items-end justify-between gap-2 h-32 pt-2">
                  {visitsByDay.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full flex items-end justify-center h-20 bg-zinc-50 rounded-lg p-1">
                        <div
                          className="w-full max-w-[28px] bg-amber-500 hover:bg-amber-600 rounded-md transition-all"
                          style={{ height: `${Math.max(6, (d.count / maxDayCount) * 100)}%` }}
                          title={`${d.count} visitas`}
                        ></div>
                      </div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">{d.label}</span>
                      <span className="text-[10px] text-zinc-700 font-bold">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-widest mb-4">Categorías más vistas</h3>
              {topCategories.length === 0 ? (
                <p className="text-zinc-400 italic text-sm">Aún no hay clics registrados en categorías.</p>
              ) : (
                <div className="space-y-3">
                  {topCategories.map(cat => (
                    <div key={cat.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-800 font-bold uppercase">{cat.label}</span>
                        <span className="text-zinc-500 font-medium">{cat.count} visualizaciones</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2">
                        <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inteligencia de ventas real */}
        <div>
          <h3 className="font-display font-black text-zinc-900 text-sm uppercase tracking-widest mb-3">Inteligencia de Ventas & Clientes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest mb-1.5">Ticket Medio (7 días)</h3>
              <p className="text-2xl sm:text-3xl font-black text-amber-600">{avgTicketLast7.toFixed(2)}€</p>
              <p className="text-[11px] text-zinc-500 mt-1 font-medium">Histórico global: {avgTicketAll.toFixed(2)}€</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest mb-1.5">Clientes que Repiten</h3>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">{repeatRate.toFixed(0)}%</p>
              <p className="text-[11px] text-zinc-500 mt-1 font-medium">{repeatCustomers.length} de {usersWithOrders.length} clientes habituales</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest mb-1.5">Canje de Puntos VIP</h3>
              <p className="text-2xl sm:text-3xl font-black text-amber-700">{redemptionRate.toFixed(0)}%</p>
              <p className="text-[11px] text-zinc-500 mt-1 font-medium">{ordersWithRedemption} pedidos con descuento VIP</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest mb-1.5">Satisfacción</h3>
              {reviewsError ? (
                <p className="text-rose-600 text-xs">{reviewsError}</p>
              ) : reviews.length === 0 ? (
                <p className="text-zinc-400 italic text-xs mt-1">Aún sin reseñas guardadas.</p>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-black text-amber-500">{avgRating.toFixed(1)} ★</p>
                  <p className="text-[11px] text-zinc-500 mt-1 font-medium">{reviews.length} valoración{reviews.length === 1 ? '' : 'es'}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Productos Más Vendidos y Horas de Demanda */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-widest mb-4">Productos Más Vendidos</h3>
            {topProducts.length === 0 ? (
              <p className="text-zinc-400 italic text-sm">Aún no hay pedidos suficientes para calcular estadísticas.</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map(p => (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-800 font-bold uppercase truncate max-w-[70%]">{p.name}</span>
                      <span className="text-zinc-500 font-medium">{p.qty} uds &bull; {p.revenue.toFixed(0)}€</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${(p.qty / maxProductQty) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-widest mb-1">Horas de Mayor Demanda</h3>
            <p className="text-[11px] text-zinc-500 mb-4 font-medium">Pico: {peakBucket.label}–{String((hourBuckets.indexOf(peakBucket) * 2 + 2) % 24).padStart(2, '0')}h con {peakBucket.count} pedidos</p>
            {validOrders.length === 0 ? (
              <p className="text-zinc-400 italic text-sm">Aún no hay pedidos registrados.</p>
            ) : (
              <div className="flex items-end justify-between gap-1 h-24 pt-2">
                {hourBuckets.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center h-16 bg-zinc-50 rounded p-0.5">
                      <div
                        className="w-full bg-blue-500 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(4, (h.count / maxHourCount) * 100)}%` }}
                        title={`${h.count} pedidos`}
                      ></div>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-bold">{h.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instalaciones de la App */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-widest">Instalaciones de la PWA</h3>
            <span className="text-2xl sm:text-3xl font-black text-zinc-900">{pwaInstalls.length}</span>
          </div>
          <p className="text-[11px] text-zinc-500 mb-4 font-medium">
            Registro formal por navegador compatible (Chrome/Android). Instalaciones manuales en iOS Safari no emiten evento de telemetría.
          </p>
          {pwaError ? (
            <p className="text-rose-600 text-xs">{pwaError}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-zinc-200 p-3 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">App Clientes</p>
                <p className="text-lg font-black text-amber-600 mt-0.5">{pwaPublicInstalls}</p>
              </div>
              <div className="bg-slate-50 border border-zinc-200 p-3 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Kitchen POS</p>
                <p className="text-lg font-black text-amber-700 mt-0.5">{pwaAdminInstalls}</p>
              </div>
              <div className="bg-slate-50 border border-zinc-200 p-3 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Móvil</p>
                <p className="text-lg font-black text-blue-600 mt-0.5">{pwaMobileInstalls}</p>
              </div>
              <div className="bg-slate-50 border border-zinc-200 p-3 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">PC / Escritorio</p>
                <p className="text-lg font-black text-purple-600 mt-0.5">{pwaDesktopInstalls}</p>
              </div>
            </div>
          )}
        </div>

        {/* Base de Datos de Clientes & Exportación */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <div>
              <h3 className="font-display font-black text-zinc-900 text-lg uppercase tracking-wide">Base de Datos de Clientes</h3>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">Directorio unificado de clientes PWA, Kiosko y pedidos telefónicos</p>
            </div>
            
            <div className="flex gap-2 relative">
              <button
                onClick={() => setShowMarketingModal(true)}
                disabled={emailRecipients.length === 0}
                title={emailRecipients.length === 0 ? 'Ningún cliente tiene email registrado todavía' : ''}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span>Enviar Campaña ({emailRecipients.length})</span>
              </button>
              
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span>Exportar Base de Datos</span>
              </button>
              
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-50">
                    <button onClick={() => { downloadCSV(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-zinc-50 text-xs font-bold text-zinc-800 border-b border-zinc-100 flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span>Descargar Excel / CSV</span>
                    </button>
                    <button onClick={() => { downloadJSON(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-zinc-50 text-xs font-bold text-zinc-800 border-b border-zinc-100 flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                      <span>Descargar Backup JSON</span>
                    </button>
                    <button onClick={() => { window.print(); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-zinc-50 text-xs font-bold text-zinc-800 flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      <span>Imprimir Informe (PDF)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile Card List */}
          <div className="sm:hidden divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-white">
            {users.map(u => (
              <div 
                key={u.id}
                onClick={() => setSelectedUserForHistory(u)}
                className="p-3.5 hover:bg-amber-50/50 cursor-pointer transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900">{u.full_name || t('no_name')}</span>
                    {u.is_kiosk && <span className="text-[9px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded uppercase text-zinc-600 font-bold">Kiosko</span>}
                    {u.is_ghost && <span className="text-[9px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded uppercase text-zinc-600 font-bold">Mostrador</span>}
                  </div>
                  <span className="text-amber-700 font-black text-xs">{u.points} pts</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span>📱 {u.phone || t('no_phone')}</span>
                  <span className="text-[10px] bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-zinc-700 font-bold">{u.orderHistory?.length || 0} ped. &rarr;</span>
                </div>
                {u.email && <p className="text-[11px] text-zinc-400 truncate">{u.email}</p>}
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center py-8 text-zinc-400 text-xs font-medium">No hay usuarios registrados aún.</p>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto flex-1 border border-zinc-200 rounded-xl">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="text-[11px] text-zinc-500 uppercase bg-slate-50 border-b border-zinc-200 font-bold">
                <tr>
                  <th className="px-4 py-3">ID / Auth</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Puntos</th>
                  <th className="px-4 py-3">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map(u => (
                  <tr 
                    key={u.id} 
                    onClick={() => setSelectedUserForHistory(u)}
                    className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">#{u.id.slice(0,8)}</td>
                    <td className="px-4 py-3 text-zinc-900 font-bold">
                      {u.full_name || t('no_name')}
                      {u.is_kiosk && <span className="ml-2 text-[9px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded uppercase text-zinc-600 font-bold">Kiosko</span>}
                      {u.is_ghost && <span className="ml-2 text-[9px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded uppercase text-zinc-600 font-bold">Mostrador</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{u.email || t('no_email')}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{u.phone || t('no_phone')}</td>
                    <td className="px-4 py-3 text-amber-700 font-black">{u.points} pts</td>
                    <td className="px-4 py-3 text-xs flex justify-between items-center text-zinc-500">
                      <span>{new Date(u.created_at).toLocaleDateString()}</span>
                      <span className="text-[10px] bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-zinc-700 font-bold">{u.orderHistory?.length || 0} ped. &rarr;</span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-400 font-medium">No hay usuarios registrados aún.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      
      </div>

      {/* Printable Report Section (Only visible when printing) */}
      <div className="hidden print:block p-8 bg-white text-black min-h-screen w-full">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black uppercase mb-1">{BRAND_CONFIG.name}</h1>
          <h2 className="text-xl text-gray-600 font-bold">Informe de Base de Datos de Clientes</h2>
          <p className="text-sm mt-2 text-gray-500">
            Generado: {new Date().toLocaleString('es-ES')}
          </p>
        </div>

        <div className="flex justify-between mb-8 gap-4">
          <div className="p-4 border border-gray-300 rounded-lg text-center w-[48%] bg-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Clientes Registrados</p>
            <p className="text-2xl font-black">{users.length}</p>
          </div>
          <div className="p-4 border border-gray-300 rounded-lg text-center w-[48%]">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Puntos en Circulación</p>
            <p className="text-2xl font-black text-amber-600">
              {users.reduce((sum, u) => sum + (u.points || 0), 0)} pts
            </p>
          </div>
        </div>

        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2">ID</th>
              <th className="py-2">Nombre Completo</th>
              <th className="py-2">Email</th>
              <th className="py-2">Teléfono</th>
              <th className="py-2">Puntos</th>
              <th className="py-2 text-right">Registro</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-200">
                <td className="py-2 font-mono text-xs text-gray-600">{u.id.slice(0,8)}</td>
                <td className="py-2 font-medium">{u.full_name || t('no_name')}</td>
                <td className="py-2 text-gray-600">{u.email || t('no_email')}</td>
                <td className="py-2">{u.phone || t('no_phone')}</td>
                <td className="py-2 font-bold text-amber-600">{u.points || 0}</td>
                <td className="py-2 text-right text-xs">{new Date(u.created_at).toLocaleDateString('es-ES')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Documento generado automáticamente por el TPV de {BRAND_CONFIG.name}.</p>
          <p>Uso estrictamente confidencial para fines de gestión empresarial.</p>
        </div>
      </div>
      
      <MarketingCampaignModal
        isOpen={showMarketingModal}
        onClose={() => setShowMarketingModal(false)}
        recipients={emailRecipients}
      />
      {selectedUserForHistory && (
        <OrderHistoryModal 
          user={selectedUserForHistory} 
          orders={selectedUserForHistory.orderHistory || []} 
          onClose={() => setSelectedUserForHistory(null)} 
        />
      )}
    </div>
  );
}
