import PWAInstallModal from './components/PWAInstallModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import CartDrawer from './components/CartDrawer';
import CartBar from './components/CartBar';
import UpsellModal from './components/UpsellModal';
import CheckoutModal from './components/CheckoutModal';
import UserModal from './components/UserModal';
import NotificationManager from './components/NotificationManager';
import { useCartStore } from './store/cartStore';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useStoreHoursStore } from './store/storeHoursStore';
import { useGuestOrderStore } from './store/guestOrderStore';
import ReviewModal from './components/ReviewModal';
import GuestRegistrationModal from './components/GuestRegistrationModal';
import { BRAND_CONFIG } from './config/brandConfig';
import { useI18nStore } from './store/i18nStore';
import { isAnyModalOpen, wasModalPoppedRecently } from './utils/useHardwareBack';

// Cada despliegue publica los "trozos" de código (Catálogo, Admin, etc.) con nombre de
// archivo nuevo. Si una pestaña quedó abierta desde antes de un despliegue y navega a una
// sección que aún no había cargado, el navegador pide el trozo viejo — que ya no existe en
// el servidor — y React lo lanza como error real, que el ErrorBoundary atrapa mostrando
// "¡Ups! Algo salió mal". Con esto, ese fallo concreto se autorepara con una recarga
// automática, sin necesidad de que el usuario haga nada.
//
// Se permite un reintento por cada incidente (no uno solo para siempre por pestaña):
// una pestaña que sigue abierta durante varios despliegues seguidos puede toparse con
// este fallo más de una vez, y cada vez debe autorepararse igual. El único límite es
// no recargar dos veces en menos de 10 segundos — así, si el fallo fuera real y no un
// simple desfase de despliegue, se deja de reintentar y se muestra el error de verdad
// en vez de entrar en un bucle de recargas.
function lazyWithReload<T extends { default: any }>(importer: () => Promise<T>) {
  return lazy(() =>
    importer().catch((error) => {
      const key = 'app-chunk-reload-at';
      const lastReloadAt = Number(sessionStorage.getItem(key) || 0);
      const now = Date.now();

      if (now - lastReloadAt > 10000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
        // Frena el render mientras la recarga ocurre, en vez de dejar que el error suba.
        return new Promise<T>(() => {});
      }
      // Ya se recargó hace menos de 10s y sigue fallando: es un error real, no un despliegue.
      throw error;
    })
  );
}

const Catalog = lazyWithReload(() => import('./features/catalog/Catalog'));
const AdminDashboard = lazyWithReload(() => import('./pages/AdminDashboard'));
const OrderTracking = lazyWithReload(() => import('./pages/OrderTracking'));
const RegisterLanding = lazyWithReload(() => import('./pages/RegisterLanding'));
const VerifyEmail = lazyWithReload(() => import('./pages/VerifyEmail'));

import { preloadCatalogData } from './lib/catalogPreload';

function App() {
  const { t } = useI18nStore();
  const { isInstallModalOpen, setIsInstallModalOpen, isIOS, isStandalone, triggerDirectPrompt, installPrompt } = usePWAInstall();
  const [currentView, setCurrentView] = useState<'splash' | 'catalog' | 'admin' | 'tracking' | 'registro' | 'verify-email'>('splash');
  const [isPreloaderFading, setIsPreloaderFading] = useState(false);
  const [isStoreClosed, setIsStoreClosed] = useState(false);
  
  // Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [isGuestRegistrationOpen, setIsGuestRegistrationOpen] = useState(false);
  const [guestOrderForRegistration, setGuestOrderForRegistration] = useState<any>(null);
  
  const cartItemsCount = useCartStore(state => state.items.length);
  const { orders, user } = useAuthStore();
  const guestOrder = useGuestOrderStore(state => state.guestOrder);
  const fetchSettings = useSettingsStore(state => state.fetchSettings);
  const fetchStoreHours = useStoreHoursStore(state => state.fetchHours);
  const fetchOrders = useAuthStore(state => state.fetchOrders);
  const isStoreOpenFlag = useSettingsStore(state => state.isStoreOpenFlag);
  const prevStoreOpenRef = useRef(true);
  
  const guestOrders = useGuestOrderStore(state => state.guestOrders);
  
  const activeOrdersCount = useMemo(() => {
    if (user) {
      return (orders || []).filter(o => ['pending', 'cooking', 'delivering', 'ready'].includes(o.status)).length;
    } else {
      const list = guestOrders && guestOrders.length > 0 ? guestOrders : (guestOrder ? [guestOrder] : []);
      return list.filter(o => ['pending', 'cooking', 'delivering', 'ready'].includes(o.status)).length;
    }
  }, [orders, guestOrders, guestOrder, user]);

  const hasActiveOrder = activeOrdersCount > 0;

  // Check if URL is /admin, /registro, /verificar-email or /verify-email on load
  if (currentView === 'splash' && window.location.search.includes('view=catalog')) {
    setCurrentView('catalog');
  }
  if (currentView === 'splash' && window.location.pathname.startsWith('/admin')) {
    setCurrentView('admin');
  }
  if (currentView === 'splash' && window.location.pathname.startsWith('/registro')) {
    setCurrentView('registro');
  }
  if (currentView === 'splash' && (window.location.pathname.startsWith('/verificar-email') || window.location.pathname.startsWith('/verify-email'))) {
    setCurrentView('verify-email');
  }
  if (currentView === 'splash' && window.location.pathname.startsWith('/pedido')) {
    setCurrentView('tracking');
  }

  // Precarga real del catálogo (código + datos) desde el primer instante del preloader
  useEffect(() => {
    if (!['/admin', '/registro', '/pedido', '/verificar-email', '/verify-email'].some(p => window.location.pathname.startsWith(p))) {
      import('./features/catalog/Catalog').catch(() => {});
      preloadCatalogData();
    }
  }, []);

  useEffect(() => {
    if (currentView === 'splash' && !['/admin', '/registro', '/pedido', '/verificar-email', '/verify-email'].some(p => window.location.pathname.startsWith(p))) {
      const timer = setTimeout(() => {
        setIsPreloaderFading(true);
        setTimeout(() => {
          setCurrentView('catalog');
        }, 700); // Wait for fade out animation (700ms)
      }, 1500); // Show preloader for 1.5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Manejo robusto del botón atrás en móviles (gestos / botón físico / navegador)
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressRef = useRef<number>(0);

  // Inicializar estado del historial con un buffer al entrar en catálogo
  useEffect(() => {
    if (currentView === 'catalog') {
      if (!window.history.state || !window.history.state.appView) {
        window.history.replaceState({ appView: 'root' }, '');
        window.history.pushState({ appView: 'catalog' }, '');
      }
    }
  }, [currentView]);

  // Manejar el evento popstate para navegación fluida y evitar salidas involuntarias
  useEffect(() => {
    const handlePopState = () => {
      // 1. Si hay un modal abierto o acaba de cerrarse uno, lo gestiona useHardwareBack
      if (isAnyModalOpen() || wasModalPoppedRecently) {
        return;
      }

      // 2. Si estamos en una vista secundaria (tracking, registro, admin), volver al catálogo
      if (currentView !== 'catalog' && currentView !== 'splash') {
        setCurrentView('catalog');
        window.history.pushState({ appView: 'catalog' }, '');
        return;
      }

      // 3. Si estamos en el catálogo principal: protección contra salida accidental (doble pulsación)
      if (currentView === 'catalog') {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          // Si pulsa 2 veces seguidas en menos de 2s, permite la salida
          window.history.back();
        } else {
          // Primera pulsación: retener y mostrar aviso flotante
          lastBackPressRef.current = now;
          window.history.pushState({ appView: 'catalog' }, '');
          setShowExitToast(true);
          setTimeout(() => setShowExitToast(false), 2000);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);

  useEffect(() => {
    const handleOpenTracking = () => {
      setCurrentView('tracking');
      window.history.pushState({ appView: 'tracking' }, '');
    };
    const handleOrderDelivered = (e: any) => {
      setReviewOrder(e.detail);
      setIsReviewOpen(true);
    };

    window.addEventListener('open-tracking', handleOpenTracking);
    window.addEventListener('order-delivered', handleOrderDelivered as EventListener);

    fetchOrders();
    fetchSettings();
    fetchStoreHours();
    // Reemplaza a supabase.auth.getSession(): si hay un JWT guardado, recupera
    // el perfil desde el backend propio (ver authStore.init()).
    useAuthStore.getState().init();

    // Sin Supabase Realtime en este motor: sondeo periódico en vez de push
    // instantáneo. GET /api/catalog ya trae settings+hours en una sola
    // llamada barata (con cache de 15s en el propio endpoint), así que este
    // sondeo no añade una consulta nueva a la base de datos en cada tick.
    const pollInterval = setInterval(() => {
      fetchSettings();
      fetchStoreHours();
    }, 45000);

    return () => {
      window.removeEventListener('open-tracking', handleOpenTracking);
      window.removeEventListener('order-delivered', handleOrderDelivered as EventListener);
      clearInterval(pollInterval);
    };
  }, []);

  // Traduce el ajuste de "tienda abierta/cerrada" (ahora en store_settings,
  // leído vía settingsStore) al mismo modal de "cerrado" que ya existía —
  // solo se dispara en la TRANSICIÓN de abierto a cerrado, igual que antes
  // el evento de Realtime, para no reabrir el modal si el usuario ya lo cerró
  // manualmente mientras la tienda sigue cerrada.
  useEffect(() => {
    if (prevStoreOpenRef.current && !isStoreOpenFlag) {
      setIsStoreClosed(true);
    }
    prevStoreOpenRef.current = isStoreOpenFlag;
  }, [isStoreOpenFlag]);

  // Cart Auto-Clear (15 minutes inactivity)
  useEffect(() => {
    const checkCartTimeout = () => {
      const state = useCartStore.getState();
      const FIFTEEN_MINUTES = 15 * 60 * 1000;
      if (state.items.length > 0 && Date.now() - state.lastUpdated > FIFTEEN_MINUTES) {
        state.clearCart();
      }
    };
    checkCartTimeout();
    const interval = setInterval(checkCartTimeout, 60000);
    return () => clearInterval(interval);
  }, []);

  if (currentView === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-brand-primaryHover font-display font-bold">{t('loading')} Administración...</div>}>
        <AdminDashboard />
      </Suspense>
    );
  }

  if (currentView === 'registro') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-brand-primaryHover font-display font-bold">{t('loading')}...</div>}>
        <RegisterLanding />
        <UserModal />
      </Suspense>
    );
  }

  if (currentView === 'verify-email') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-brand-primaryHover font-display font-bold">{t('loading')}...</div>}>
        <VerifyEmail />
      </Suspense>
    );
  }

  return (
    <div className="selection:bg-brand-primary selection:text-white">
      <NotificationManager />
      {/* Preloader Agnóstico Tokenizado: Logotipo oficial de la marca + pulso minimalista */}
      {currentView === 'splash' && (
        <div className={`fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${isPreloaderFading ? 'opacity-0' : 'opacity-100'}`}>
          <div className="relative z-10 flex flex-col items-center px-6 text-center animate-fade-in">
            {BRAND_CONFIG.assets.logoUrl ? (
              <img
                src={BRAND_CONFIG.assets.logoUrl}
                alt={BRAND_CONFIG.name}
                className="w-[min(60vw,240px)] h-auto max-h-28 object-contain mb-6 drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div className="flex flex-col items-center animate-pulse">
              <div className="w-10 h-1 bg-brand-primary rounded-full mb-4"></div>
              <h2 className="text-brand-ink font-display font-black text-xl sm:text-2xl tracking-widest uppercase">
                {BRAND_CONFIG.splash?.title || BRAND_CONFIG.name}
              </h2>
              <p className="text-brand-inkSoft text-xs sm:text-sm font-medium mt-2">
                {BRAND_CONFIG.splash?.subtitle || BRAND_CONFIG.slogan || t('splash_desc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Catalog View */}
      {currentView === 'catalog' && (
        <>
          <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-brand-primaryHover font-display font-bold">{t('loading')} {t('catalog')}...</div>}>
            <Catalog />
          </Suspense>

          {/* Store Closed Modal */}
          {isStoreClosed && (
            <div className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 bg-red-600/20 border-2 border-red-500 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                <span className="text-5xl">🔒</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black text-white uppercase tracking-wider mb-4">
                {t('closed_title')}
              </h2>
              <p className="text-zinc-400 max-w-md mx-auto text-sm sm:text-base leading-relaxed mb-8">
                {t('closed_desc')}
              </p>
              <button 
                onClick={() => setIsStoreClosed(false)}
                className="bg-white hover:bg-gray-100 text-black font-display font-bold px-8 py-4 rounded-xl transition-all hover:scale-105"
              >
                {t('closed_btn')}
              </button>
            </div>
          )}

          {/* Floating Cart Bar */}
          <CartBar onOpenUpsell={() => setIsUpsellOpen(true)} />

          {/* Cart Flow Modals */}
          {/* We keep CartDrawer if needed from elsewhere, but CartBar replaces the trigger */}
          <CartDrawer 
            isOpen={isCartOpen} 
            onClose={() => setIsCartOpen(false)} 
            onCheckout={() => {
              setIsCartOpen(false);
              setIsUpsellOpen(true);
            }} 
          />

          {isUpsellOpen && (
            <UpsellModal 
              onClose={() => setIsUpsellOpen(false)}
              onProceedToCheckout={() => {
                setIsUpsellOpen(false);
                setIsCheckoutOpen(true);
              }}
            />
          )}

          {isCheckoutOpen && (
            <CheckoutModal 
              onClose={() => setIsCheckoutOpen(false)}
              onSuccess={(orderData, isGuest) => {
                setIsCheckoutOpen(false);
                if (isGuest) {
                  setGuestOrderForRegistration(orderData);
                  setIsGuestRegistrationOpen(true);
                } else {
                  useCartStore.getState().clearCart();
                  setCurrentView('tracking');
                  window.history.pushState({ appView: 'tracking' }, '');
                }
              }}
            />
          )}
          
          <UserModal />
        </>
      )}

      {currentView === 'tracking' && (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-brand-primaryHover font-display font-bold">{t('loading')} Tracking...</div>}>
          <OrderTracking onBack={() => setCurrentView('catalog')} />
        </Suspense>
      )}

      {hasActiveOrder && currentView !== 'tracking' && currentView !== ('admin' as any) && (
        <button
          onClick={() => {
            setCurrentView('tracking');
            window.history.pushState({ appView: 'tracking' }, '');
          }}
          className="fixed bottom-24 right-4 sm:right-6 z-[900] w-14 h-14 sm:w-16 sm:h-16 bg-brand-primary text-white rounded-full shadow-[0_8px_25px_rgba(245,158,11,0.45)] flex items-center justify-center animate-bounce transition-transform hover:scale-110"
        >
          <span className="text-2xl sm:text-3xl">🛵</span>
          {activeOrdersCount > 1 ? (
            <span className="absolute -top-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-red-600 text-white text-xs font-black items-center justify-center border-2 border-white">
                {activeOrdersCount}
              </span>
            </span>
          ) : (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
            </span>
          )}
        </button>
      )}

      <ReviewModal 
        isOpen={isReviewOpen} 
        onClose={() => setIsReviewOpen(false)} 
        order={reviewOrder} 
      />

      <GuestRegistrationModal
        isOpen={isGuestRegistrationOpen}
        order={guestOrderForRegistration}
        onSkip={() => {
          setIsGuestRegistrationOpen(false);
          useCartStore.getState().clearCart();
          setCurrentView('tracking');
          window.history.pushState({ appView: 'tracking' }, '');
        }}
        onSuccess={() => {
          setIsGuestRegistrationOpen(false);
          useCartStore.getState().clearCart();
          setCurrentView('tracking');
          window.history.pushState({ appView: 'tracking' }, '');
        }}
      />
      <PWAInstallModal 
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isIOS={isIOS}
        isStandalone={isStandalone}
        onInstallDirect={triggerDirectPrompt}
        canInstallDirect={!!installPrompt}
      />

      {/* Floating Exit Prevention Toast */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[3000] bg-zinc-950/90 text-white px-5 py-2.5 rounded-full shadow-2xl border border-white/20 text-xs sm:text-sm font-display font-bold animate-fade-in flex items-center gap-2 backdrop-blur-md">
          <span>👋</span>
          <span>{t('press_back_again_to_exit')}</span>
        </div>
      )}
    </div>
  );
}

export default App;
