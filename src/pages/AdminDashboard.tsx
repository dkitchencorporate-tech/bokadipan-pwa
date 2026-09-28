import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useI18nStore } from '../store/i18nStore';
import AdminOrders from '../features/admin/AdminOrders';
import AdminCatalog from '../features/admin/AdminCatalog';
import AdminKiosk from '../features/admin/AdminKiosk';
import AdminClients from '../features/admin/AdminClients';
import AdminAnalytics from '../features/admin/AdminAnalytics';
import AdminHistory from '../features/admin/AdminHistory';
import AdminPrinterSettings from '../features/admin/AdminPrinterSettings';
import AdminSchedule from '../features/admin/AdminSchedule';
import AdminBusiness from '../features/admin/AdminBusiness';
import { api } from '../lib/apiClient';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAdminUiStore } from '../store/adminUiStore';
import { getStoreStatus, StoreStatusInfo } from '../utils/timeUtils';
import { armAlarm } from '../utils/orderAlarm';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function AdminDashboard() {
  const { t } = useI18nStore();
  const { user, profile, signIn, logout } = useAuthStore();
  const { activeTab, setActiveTab } = useAdminUiStore();
  const [isSaturated, setIsSaturated] = useState(false);
  const [isStoreClosed, setIsStoreClosed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { promptToInstall } = usePWAInstall();

  // Desbloqueo silencioso de AudioContext en primer gesto del usuario
  useEffect(() => {
    const unlockAudio = () => {
      armAlarm().then(() => {
        useAdminUiStore.getState().setIsAudioArmed(true);
      }).catch(() => {});
    };
    window.addEventListener('click', unlockAudio, { once: true, capture: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, capture: true });
    return () => {
      window.removeEventListener('click', unlockAudio, { capture: true });
      window.removeEventListener('touchstart', unlockAudio, { capture: true });
    };
  }, []);

  const handleSelectTab = (tab: any) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // Dynamic store schedule status
  const [storeStatus, setStoreStatus] = useState<StoreStatusInfo>(getStoreStatus());

  // Admin Auth State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Update store schedule status periodically
    const statusInterval = setInterval(() => {
      setStoreStatus(getStoreStatus());
    }, 10000);

    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (!user || !profile?.is_admin) return;
    
    // Fetch initial store state
    const fetchMode = async () => {
      try {
        const data = await api.get('/catalog');
        if (data.settings) {
          if (data.settings.saturation_mode) setIsSaturated(true);
          if (data.settings.is_store_open === false) setIsStoreClosed(true);
        }
        setStoreStatus(getStoreStatus());
      } catch (e) {
        console.error('Error cargando estado de la tienda:', e);
      }
    };
    fetchMode();
  }, [user, profile]);

  const toggleSaturationMode = async () => {
    const newStatus = !isSaturated;
    setIsSaturated(newStatus);
    try {
      await api.put('/admin/settings', { settings: { saturation_mode: newStatus } });
    } catch (e) {
      console.error('Error actualizando modo saturación:', e);
    }
  };
  
  const toggleStoreStatus = async () => {
    const newStatus = !isStoreClosed;
    setIsStoreClosed(newStatus);
    try {
      await api.put('/admin/settings', { settings: { is_store_open: !newStatus } });
      setStoreStatus(getStoreStatus());
    } catch (e) {
      console.error('Error actualizando estado de la tienda:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (err) {
      console.error('Error logging out:', err);
      window.location.reload();
    }
  };
  
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');
    try {
      await signIn(adminEmail.trim(), adminPassword);
    } catch (err: any) {
      setAdminError(err.message || t('login_error'));
    } finally {
      setAdminLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!adminEmail) {
      setAdminError(t('enter_email_to_reset'));
      return;
    }
    setAdminError('Recuperación de contraseña no disponible en esta demo. Contacta al administrador del sistema.');
  };

  // ----------------------------------------------------
  // VISTA DE LOGIN DEL ADMINISTRADOR (White Label POS & Admin)
  // ----------------------------------------------------
  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Glow sutil en fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white border border-zinc-200/90 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
          {/* Franja superior insignia */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800"></div>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-zinc-100 border border-zinc-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <svg className="w-8 h-8 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <p className="text-[11px] font-display font-black tracking-widest text-zinc-500 uppercase">{BRAND_CONFIG.name}</p>
            <h1 className="text-2xl font-display font-extrabold uppercase tracking-tight text-zinc-900 mt-1">Portal de Gestión</h1>
            <p className="text-xs text-zinc-500 mt-2">Acceso seguro para administración y personal autorizado</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {adminError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs text-center font-medium">
                {adminError}
              </div>
            )}
            
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Correo Electrónico</label>
              <input 
                type="email" 
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                required
                className="w-full bg-white border border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 rounded-xl px-4 py-3 text-zinc-900 text-sm transition-colors outline-none placeholder:text-zinc-400"
                placeholder={`admin@${BRAND_CONFIG.shortName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Contraseña de Acceso</label>
              <div className="relative w-full">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 rounded-xl px-4 py-3 pr-12 text-zinc-900 text-sm transition-colors outline-none placeholder:text-zinc-400"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)} 
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-800 bg-white focus:ring-zinc-800" 
                />
                <span className="text-xs text-zinc-600 font-medium">Recordar sesión</span>
              </label>
              <button 
                type="button" 
                onClick={handleResetPassword} 
                disabled={isResetting || !adminEmail} 
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50 font-medium"
              >
                ¿Olvidaste la clave?
              </button>
            </div>

            <button 
              type="submit"
              disabled={adminLoading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-display font-extrabold py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all mt-4 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md text-xs"
            >
              {adminLoading ? 'Autenticando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        <button 
          onClick={() => window.location.href = '/'}
          className="mt-8 text-zinc-500 hover:text-zinc-800 transition-colors text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Volver a la Carta Pública
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // VISTA PRINCIPAL DEL PANEL ADMINISTRATIVO (Light SaaS)
  // ----------------------------------------------------
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-zinc-900 flex flex-col md:flex-row font-sans relative print:bg-white print:text-black">

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-2xs md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Menú de Navegación */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-[280px] sm:w-72 md:w-64
        bg-white border-r border-zinc-200 flex flex-col 
        transition-transform duration-300 ease-in-out shrink-0 shadow-2xl md:shadow-xs
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${!isSidebarOpen ? 'hidden md:flex' : 'flex'}
        print:hidden
      `}>
        
        {/* Cabecera del Sidebar con Marca Oficial */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between gap-3 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-200 shadow-sm p-1 shrink-0">
              {BRAND_CONFIG.assets.logoUrl ? (
                <img src={BRAND_CONFIG.assets.logoUrl} alt={BRAND_CONFIG.name} className="w-full h-full object-contain" />
              ) : (
                <span className="font-display font-black text-brand-primary text-base">{BRAND_CONFIG.shortName.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="font-display font-black uppercase text-xs tracking-wider text-zinc-900 leading-none">{BRAND_CONFIG.shortName}</h1>
              <p className="text-[10px] text-brand-primary font-mono font-bold mt-1">Control Hub · v3.0</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            title="Contraer menú"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
        </div>

        {/* Lista de Secciones con Iconografía Vectorial SVG Estándar */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          <nav className="p-3.5 space-y-1.5 flex-1">
            
            {/* 1. Comandas en Vivo */}
            <button 
              onClick={() => handleSelectTab('orders')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'orders' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'orders' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Comandas en Vivo</span>
            </button>

            {/* 2. TPV Mostrador */}
            <button 
              onClick={() => handleSelectTab('kiosk')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'kiosk' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'kiosk' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>TPV Mostrador</span>
            </button>

            {/* 3. Clientes & VIP */}
            <button
              onClick={() => handleSelectTab('clients')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'clients' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'clients' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Clientes & VIP</span>
            </button>

            {/* 4. Carta & Catálogo */}
            <button 
              onClick={() => handleSelectTab('catalog')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'catalog' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'catalog' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Carta & Catálogo</span>
            </button>

            {/* 5. Histórico de Pedidos */}
            <button 
              onClick={() => handleSelectTab('history')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'history' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'history' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Historial de Ventas</span>
            </button>

            {/* 6. Analítica & Métricas */}
            <button 
              onClick={() => handleSelectTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'analytics' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analítica & KPIs</span>
            </button>

            {/* 7. Horarios de Servicio */}
            <button
              onClick={() => handleSelectTab('schedule')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'schedule' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'schedule' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Horarios de Servicio</span>
            </button>

            {/* 8. Impresoras de Cocina */}
            <button
              onClick={() => handleSelectTab('printers')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'printers' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'printers' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Impresoras Térmicas</span>
            </button>

            {/* 9. Configuración del Negocio */}
            <button
              onClick={() => handleSelectTab('business')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'business' 
                  ? 'bg-zinc-900 text-white shadow-xs font-black' 
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'business' ? 'text-white' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Ajustes del Negocio</span>
            </button>

            {/* Botón Instalar App PWA */}
            <div className="pt-3 mt-3 border-t border-zinc-200">
              <button 
                onClick={promptToInstall}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-display font-black text-xs shadow-xs transition-all uppercase tracking-wider"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Instalar App TPV</span>
              </button>
            </div>
          </nav>

          {/* Panel Inferior: Controles Operativos Rápidos */}
          <div className="p-3.5 border-t border-zinc-200 space-y-2.5 bg-zinc-50/80">
            
            {/* Estado del Local Dinámico */}
            <div className="bg-white rounded-xl p-2.5 border border-zinc-200 shadow-xs">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Estado Operativo</span>
                <span className={`w-2 h-2 rounded-full ${
                  storeStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 
                  storeStatus.statusType === 'manual_closed' ? 'bg-rose-500' : 'bg-zinc-500'
                }`}></span>
              </div>
              <p className="text-[11px] font-bold text-zinc-900 leading-tight mb-2">
                {storeStatus.badgeText}
                <span className="block text-[10px] text-zinc-500 font-normal mt-0.5">{storeStatus.detailText}</span>
              </p>
              <button 
                onClick={toggleStoreStatus}
                className={`w-full py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border shadow-xs ${
                  isStoreClosed 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                }`}
              >
                {isStoreClosed ? 'Reanudar Pedidos' : 'Pausar Pedidos'}
              </button>
            </div>

            {/* Modo Saturación */}
            <div className="bg-white rounded-xl p-2.5 border border-zinc-200 shadow-xs">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Afluencia</span>
                <span className={`text-[9px] font-bold uppercase ${isSaturated ? 'text-zinc-900 font-black' : 'text-zinc-400'}`}>
                  {isSaturated ? 'Saturado' : 'Normal'}
                </span>
              </div>
              <button 
                onClick={toggleSaturationMode}
                className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  isSaturated 
                    ? 'bg-zinc-900 text-white border-zinc-900' 
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {isSaturated ? 'Restaurar Flujo' : 'Pausar (+1h Espera)'}
              </button>
            </div>

            {/* Botones de Navegación y Salida */}
            <div className="pt-2 border-t border-zinc-200 space-y-1.5">
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-600 font-bold hover:text-zinc-900 hover:bg-zinc-50 transition-colors text-[11px] uppercase tracking-wider shadow-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Carta Pública
              </button>
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shadow-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Cerrar Sesión
              </button>
            </div>

          </div>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 h-full overflow-hidden relative flex flex-col print:h-auto print:overflow-visible print:block bg-slate-50">
        
        {/* Topbar Ejecutiva y Barra de Acciones */}
        <div className="bg-white/95 backdrop-blur-md border-b border-zinc-200 px-3 sm:px-4 py-2.5 flex items-center justify-between z-30 shrink-0 print:hidden shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-white border border-zinc-200 hover:border-zinc-400 rounded-xl text-zinc-700 hover:text-zinc-900 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs md:hidden shrink-0"
              title="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>

            {/* Mobile Active Tab Label */}
            <div className="md:hidden flex items-center gap-1.5 min-w-0">
              <span className="font-display font-black uppercase text-xs tracking-wider text-zinc-900 truncate">
                {activeTab === 'orders' ? 'Comandas en Vivo' :
                 activeTab === 'kiosk' ? 'TPV Mostrador' :
                 activeTab === 'clients' ? 'Clientes & VIP' :
                 activeTab === 'catalog' ? 'Carta & Catálogo' :
                 activeTab === 'history' ? 'Historial & Arqueo' :
                 activeTab === 'analytics' ? 'Analítica' :
                 activeTab === 'printers' ? 'Impresoras' :
                 activeTab === 'schedule' ? 'Horarios' :
                 activeTab === 'business' ? 'Ajustes Negocio' : 'Panel Control'}
              </span>
            </div>

            {/* Desktop Selector Rápido Comandas / TPV Mostrador */}
            <div className="hidden md:flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
              <button
                onClick={() => handleSelectTab('orders')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-display font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'orders'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                <span>Comandas</span>
              </button>
              
              <button
                onClick={() => handleSelectTab('kiosk')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-display font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'kiosk'
                    ? 'bg-zinc-900 text-white shadow-sm font-black'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span>TPV Mostrador</span>
              </button>
            </div>
          </div>

          {/* Right: Estado del Local y Salir */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dot indicador de estado para móvil */}
            <div className="md:hidden flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-[10px] font-bold">
              <span className={`w-2 h-2 rounded-full ${
                storeStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 
                storeStatus.statusType === 'manual_closed' ? 'bg-rose-500' : 'bg-zinc-500'
              }`}></span>
              <span className="text-zinc-700">{storeStatus.isOpen ? 'Abierto' : 'Pausado'}</span>
            </div>

            {/* Estado completo para desktop */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider ${
              storeStatus.isOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : storeStatus.statusType === 'manual_closed'
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-zinc-100 text-zinc-800 border-zinc-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                storeStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 
                storeStatus.statusType === 'manual_closed' ? 'bg-rose-500' : 'bg-zinc-500'
              }`}></span>
              <span>{storeStatus.badgeText} • {storeStatus.detailText}</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
              <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
              <span className="text-[11px] font-bold text-zinc-800 truncate max-w-[170px]" title={user?.email || 'Admin'}>
                {profile?.full_name || user?.email || 'Admin'}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs"
              title="Cerrar sesión de administrador"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Contenedor de Vistas Activas */}
        <div className="flex-1 overflow-hidden relative pb-16 md:pb-0">
          <div className={activeTab === 'orders' ? 'h-full' : 'hidden'}><AdminOrders /></div>
          <div className={activeTab === 'kiosk' ? 'h-full' : 'hidden'}><AdminKiosk /></div>
          {activeTab === 'clients' && <div className="h-full"><AdminClients /></div>}
          {activeTab === 'catalog' && <div className="h-full"><AdminCatalog /></div>}
          {activeTab === 'history' && <div className="h-full"><AdminHistory /></div>}
          {activeTab === 'analytics' && <div className="h-full"><AdminAnalytics /></div>}
          {activeTab === 'printers' && (
            <div className="h-full overflow-y-auto pt-4 pb-24 sm:pb-8">
              <div className="p-4 sm:p-8">
                <AdminPrinterSettings />
              </div>
            </div>
          )}
          {activeTab === 'schedule' && <div className="h-full overflow-y-auto"><AdminSchedule /></div>}
          {activeTab === 'business' && <div className="h-full overflow-y-auto"><AdminBusiness /></div>}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-zinc-200 flex md:hidden items-center justify-around py-1.5 px-2 shadow-lg">
          <button 
            onClick={() => handleSelectTab('orders')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
              activeTab === 'orders' ? 'text-zinc-900 font-extrabold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            <span>Comandas</span>
          </button>

          <button 
            onClick={() => handleSelectTab('kiosk')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
              activeTab === 'kiosk' ? 'text-zinc-900 font-extrabold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <span>TPV</span>
          </button>

          <button 
            onClick={() => handleSelectTab('catalog')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
              activeTab === 'catalog' ? 'text-zinc-900 font-extrabold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            <span>Carta</span>
          </button>

          <button 
            onClick={() => handleSelectTab('history')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
              activeTab === 'history' ? 'text-zinc-900 font-extrabold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Historial</span>
          </button>

          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-800 transition-all"
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span>Menú</span>
          </button>
        </nav>
      </main>
      
    </div>
  );
}
