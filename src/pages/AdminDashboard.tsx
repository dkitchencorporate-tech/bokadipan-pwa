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
import BokadipanLogo from '../components/BokadipanLogo';

export default function AdminDashboard() {
  const { t } = useI18nStore();
  const { user, profile, signIn, verify2FA, logout } = useAuthStore();
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
  const [adminTotpCode, setAdminTotpCode] = useState('');
  const [authStep, setAuthStep] = useState<'credentials' | '2fa'>('credentials');
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
      const res = await signIn(adminEmail.trim(), adminPassword);
      if (res && res.requires_2fa) {
        setAuthStep('2fa');
      }
    } catch (err: any) {
      setAdminError(err.message || t('login_error'));
    } finally {
      setAdminLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');
    try {
      await verify2FA(adminEmail.trim(), adminTotpCode.trim());
    } catch (err: any) {
      setAdminError(err.message || 'Código de seguridad incorrecto o expirado.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!adminEmail) {
      setAdminError(t('enter_email_to_reset'));
      return;
    }
    setAdminError('Para restablecer credenciales de administración, contacta con el equipo técnico de D-Kitchen Corporate.');
  };

  // ----------------------------------------------------
  // VISTA DE LOGIN DEL ADMINISTRADOR (Gourmet Rústico BOKADIPAN)
  // ----------------------------------------------------
  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-[#F8F4EC] text-[#141A14] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
        {/* Glow de fondo cálido gourmet */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C88A35]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#1B3818]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white border-2 border-[#DFD3C1] rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
          {/* Franja superior artesanal verde oliva y dorado */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#1B3818] via-[#C88A35] to-[#1B3818]"></div>
          
          <div className="text-center mb-6 pt-2">
            <div className="flex justify-center mb-3">
              <BokadipanLogo showTagline={true} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1B3818]/10 border border-[#1B3818]/20 text-[#1B3818] text-[10px] font-black uppercase tracking-widest mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C88A35] animate-pulse"></span>
              Portal de Gestión & Obrador
            </div>
            <p className="text-xs text-[#5C5549] mt-2 font-medium">
              {authStep === 'credentials' 
                ? 'Acceso exclusivo para administradores y personal de cocina' 
                : 'Verificación de dos factores (2FA TOTP)'}
            </p>
          </div>

          {authStep === 'credentials' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {adminError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs text-center font-bold">
                  {adminError}
                </div>
              )}
              
              <div>
                <label className="block text-[11px] font-black text-[#1B3818] uppercase tracking-wider mb-1.5">
                  Correo Electrónico de Administrador
                </label>
                <input 
                  type="email" 
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  required
                  className="w-full bg-[#FAF7F2] border border-[#DFD3C1] focus:border-[#1B3818] focus:ring-2 focus:ring-[#1B3818]/20 rounded-xl px-4 py-3 text-[#141A14] text-sm transition-all outline-none placeholder:text-stone-400 font-medium"
                  placeholder="dkitchen@dkitchencorporate.es"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-black text-[#1B3818] uppercase tracking-wider mb-1.5">
                  Contraseña Maestra
                </label>
                <div className="relative w-full">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    required
                    className="w-full bg-[#FAF7F2] border border-[#DFD3C1] focus:border-[#1B3818] focus:ring-2 focus:ring-[#1B3818]/20 rounded-xl px-4 py-3 pr-12 text-[#141A14] text-sm transition-all outline-none placeholder:text-stone-400 font-medium"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#1B3818] p-2 transition-colors"
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
                    className="w-4 h-4 rounded border-[#DFD3C1] text-[#1B3818] bg-[#FAF7F2] focus:ring-[#1B3818]" 
                  />
                  <span className="text-xs text-[#5C5549] font-medium">Recordar sesión</span>
                </label>
                <button 
                  type="button" 
                  onClick={handleResetPassword} 
                  disabled={isResetting || !adminEmail} 
                  className="text-xs text-[#C88A35] hover:text-[#9C5B18] font-bold transition-colors disabled:opacity-50"
                >
                  ¿Olvidaste la clave?
                </button>
              </div>

              <button 
                type="submit"
                disabled={adminLoading}
                className="w-full bg-[#1B3818] hover:bg-[#264B22] text-[#F8F4EC] font-display font-extrabold py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all mt-3 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-xs cursor-pointer border border-[#C88A35]/30"
              >
                {adminLoading ? 'Comprobando credenciales...' : 'Continuar al Panel'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              {adminError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs text-center font-bold">
                  {adminError}
                </div>
              )}

              <div className="bg-[#FAF7F2] border border-[#DFD3C1] p-4 rounded-2xl text-center">
                <div className="w-12 h-12 bg-[#1B3818] text-[#C88A35] rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-xs text-[#5C5549] font-medium leading-relaxed">
                  Introduce el código TOTP de 6 dígitos generado por tu app de autenticación (Google Authenticator) para <strong className="text-[#141A14]">{adminEmail}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black text-[#1B3818] uppercase tracking-wider mb-1.5 text-center">
                  Código de Seguridad 2FA
                </label>
                <input 
                  type="text"
                  maxLength={8}
                  value={adminTotpCode}
                  onChange={e => setAdminTotpCode(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-[#FAF7F2] border-2 border-[#1B3818] focus:border-[#C88A35] focus:ring-2 focus:ring-[#C88A35]/30 rounded-xl px-4 py-3 text-center text-xl font-mono font-black tracking-widest text-[#141A14] transition-all outline-none placeholder:text-stone-300"
                  placeholder="000000"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => { setAuthStep('credentials'); setAdminError(''); }}
                  className="w-1/3 bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#5C5549] border border-[#DFD3C1] font-bold py-3 px-3 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  Volver
                </button>
                <button 
                  type="submit"
                  disabled={adminLoading || !adminTotpCode}
                  className="w-2/3 bg-[#1B3818] hover:bg-[#264B22] text-[#F8F4EC] font-display font-extrabold py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-xs border border-[#C88A35]/30"
                >
                  {adminLoading ? 'Verificando...' : 'Acceder al Obrador'}
                </button>
              </div>
            </form>
          )}
        </div>

        <button 
          onClick={() => window.location.href = '/'}
          className="mt-6 text-[#5C5549] hover:text-[#1B3818] transition-colors text-xs font-bold flex items-center gap-2 uppercase tracking-wider"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Volver a la Carta Rústica
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // VISTA PRINCIPAL DEL PANEL ADMINISTRATIVO (BOKADIPAN GOURMET RÚSTICO)
  // ----------------------------------------------------
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8F4EC] text-[#141A14] flex flex-col md:flex-row font-sans relative print:bg-white print:text-black">

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
        bg-white border-r border-[#DFD3C1] flex flex-col 
        transition-transform duration-300 ease-in-out shrink-0 shadow-2xl md:shadow-xs
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${!isSidebarOpen ? 'hidden md:flex' : 'flex'}
        print:hidden
      `}>
        
        {/* Cabecera del Sidebar con Marca Oficial BOKADIPAN */}
        <div className="p-4 sm:p-5 border-b border-[#DFD3C1] flex items-center justify-between gap-3 bg-[#FAF7F2]">
          <div className="flex items-center gap-2">
            <BokadipanLogo />
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 bg-white border border-[#DFD3C1] rounded-lg text-stone-500 hover:text-[#1B3818] hover:bg-[#F3EDE2] transition-colors md:hidden"
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
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'orders' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'orders' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Comandas en Vivo</span>
            </button>

            {/* 2. TPV Mostrador */}
            <button 
              onClick={() => handleSelectTab('kiosk')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'kiosk' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'kiosk' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>TPV Mostrador</span>
            </button>

            {/* 3. Clientes & VIP */}
            <button
              onClick={() => handleSelectTab('clients')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'clients' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'clients' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Clientes & VIP</span>
            </button>

            {/* 4. Carta & Catálogo */}
            <button 
              onClick={() => handleSelectTab('catalog')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'catalog' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'catalog' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Carta & Catálogo</span>
            </button>

            {/* 5. Histórico de Pedidos */}
            <button 
              onClick={() => handleSelectTab('history')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'history' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'history' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Historial de Ventas</span>
            </button>

            {/* 6. Analítica & Métricas */}
            <button 
              onClick={() => handleSelectTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'analytics' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'analytics' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analítica & KPIs</span>
            </button>

            {/* 7. Horarios de Servicio */}
            <button
              onClick={() => handleSelectTab('schedule')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'schedule' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'schedule' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Horarios de Servicio</span>
            </button>

            {/* 8. Impresoras de Cocina */}
            <button
              onClick={() => handleSelectTab('printers')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'printers' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'printers' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Impresoras Térmicas</span>
            </button>

            {/* 9. Configuración del Negocio */}
            <button
              onClick={() => handleSelectTab('business')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'business' 
                  ? 'bg-[#1B3818] text-[#F8F4EC] border border-[#C88A35]/40 shadow-sm font-black' 
                  : 'text-[#5C5549] hover:bg-[#FAF7F2] hover:text-[#141A14]'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${activeTab === 'business' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Ajustes del Negocio</span>
            </button>

            {/* Botón Instalar App PWA */}
            <div className="pt-3 mt-3 border-t border-[#DFD3C1]">
              <button 
                onClick={promptToInstall}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1B3818] hover:bg-[#264B22] text-[#F8F4EC] font-display font-black text-xs shadow-md transition-all uppercase tracking-wider cursor-pointer border border-[#C88A35]/30"
              >
                <svg className="w-4 h-4 text-[#C88A35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Instalar App TPV</span>
              </button>
            </div>
          </nav>

          {/* Panel Inferior: Controles Operativos Rápidos */}
          <div className="p-3.5 border-t border-[#DFD3C1] space-y-2.5 bg-[#FAF7F2]">
            
            {/* Estado del Local Dinámico */}
            <div className="bg-white rounded-xl p-2.5 border border-[#DFD3C1] shadow-xs">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-black text-[#1B3818] uppercase tracking-wider">Estado Obrador</span>
                <span className={`w-2 h-2 rounded-full ${
                  storeStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 
                  storeStatus.statusType === 'manual_closed' ? 'bg-rose-500' : 'bg-stone-400'
                }`}></span>
              </div>
              <p className="text-[11px] font-bold text-[#141A14] leading-tight mb-2">
                {storeStatus.badgeText}
                <span className="block text-[10px] text-[#5C5549] font-normal mt-0.5">{storeStatus.detailText}</span>
              </p>
              <button 
                onClick={toggleStoreStatus}
                className={`w-full py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border shadow-xs cursor-pointer ${
                  isStoreClosed 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                    : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                }`}
              >
                {isStoreClosed ? 'Reanudar Pedidos' : 'Pausar Pedidos'}
              </button>
            </div>

            {/* Modo Saturación */}
            <div className="bg-white rounded-xl p-2.5 border border-[#DFD3C1] shadow-xs">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-black text-[#1B3818] uppercase tracking-wider">Afluencia Horno</span>
                <span className={`text-[9px] font-bold uppercase ${isSaturated ? 'text-amber-700 font-black' : 'text-stone-400'}`}>
                  {isSaturated ? 'Saturado' : 'Normal'}
                </span>
              </div>
              <button 
                onClick={toggleSaturationMode}
                className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                  isSaturated 
                    ? 'bg-[#1B3818] text-[#F8F4EC] border-[#1B3818]' 
                    : 'bg-[#FAF7F2] text-[#5C5549] border-[#DFD3C1] hover:bg-[#F3EDE2] hover:text-[#141A14]'
                }`}
              >
                {isSaturated ? 'Restaurar Flujo' : 'Pausar (+1h Espera)'}
              </button>
            </div>

            {/* Botones de Navegación y Salida */}
            <div className="pt-2 border-t border-[#DFD3C1] space-y-1.5">
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-[#DFD3C1] rounded-lg text-[#1B3818] font-bold hover:bg-[#FAF7F2] transition-colors text-[11px] uppercase tracking-wider shadow-xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Carta Rústica
              </button>
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Cerrar Sesión
              </button>
            </div>

          </div>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 h-full overflow-hidden relative flex flex-col print:h-auto print:overflow-visible print:block bg-[#F8F4EC]">
        
        {/* Topbar Ejecutiva y Barra de Acciones */}
        <div className="bg-white/95 backdrop-blur-md border-b border-[#DFD3C1] px-3 sm:px-4 py-2.5 flex items-center justify-between z-30 shrink-0 print:hidden shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-white border border-[#DFD3C1] hover:border-[#1B3818] rounded-xl text-[#1B3818] transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs md:hidden shrink-0"
              title="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>

            {/* Mobile Active Tab Label */}
            <div className="md:hidden flex items-center gap-1.5 min-w-0">
              <span className="font-display font-black uppercase text-xs tracking-wider text-[#1B3818] truncate">
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
            <div className="hidden md:flex items-center bg-[#FAF7F2] p-1 rounded-xl border border-[#DFD3C1]">
              <button
                onClick={() => handleSelectTab('orders')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-display font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#1B3818] text-[#F8F4EC] shadow-sm'
                    : 'text-[#5C5549] hover:text-[#141A14] hover:bg-[#F3EDE2]'
                }`}
              >
                <svg className={`w-3.5 h-3.5 ${activeTab === 'orders' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                <span>Comandas</span>
              </button>
              
              <button
                onClick={() => handleSelectTab('kiosk')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-display font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'kiosk'
                    ? 'bg-[#1B3818] text-[#F8F4EC] shadow-sm font-black'
                    : 'text-[#5C5549] hover:text-[#141A14] hover:bg-[#F3EDE2]'
                }`}
              >
                <svg className={`w-3.5 h-3.5 ${activeTab === 'kiosk' ? 'text-[#C88A35]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span>TPV Mostrador</span>
              </button>
            </div>
          </div>

          {/* Right: Estado del Local y Salir */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dot indicador de estado para móvil */}
            <div className="md:hidden flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#DFD3C1] text-[10px] font-bold">
              <span className={`w-2 h-2 rounded-full ${
                storeStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 
                storeStatus.statusType === 'manual_closed' ? 'bg-rose-500' : 'bg-stone-400'
              }`}></span>
              <span className="text-[#1B3818]">{storeStatus.isOpen ? 'Abierto' : 'Pausado'}</span>
            </div>

            {/* Estado completo para desktop */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider ${
              storeStatus.isOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : storeStatus.statusType === 'manual_closed'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-[#FAF7F2] text-[#5C5549] border-[#DFD3C1]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                storeStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 
                storeStatus.statusType === 'manual_closed' ? 'bg-rose-500' : 'bg-stone-400'
              }`}></span>
              <span>{storeStatus.badgeText} • {storeStatus.detailText}</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#DFD3C1]">
              <span className="w-2 h-2 rounded-full bg-[#C88A35]"></span>
              <span className="text-[11px] font-black text-[#1B3818] truncate max-w-[170px]" title={user?.email || 'Admin'}>
                {profile?.full_name || user?.email || 'Admin'}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
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
