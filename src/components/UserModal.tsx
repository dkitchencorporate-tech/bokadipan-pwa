import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useHardwareBack } from '../utils/useHardwareBack';
import { useI18nStore } from '../store/i18nStore';
import { useSettingsStore } from '../store/settingsStore';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function UserModal() {
  const { isUserModalOpen, closeUserModal, userModalView, setModalView, setLegalDoc, activeLegalDoc, user, profile, logout, orders, signIn, register: registerUser, updateProfile, deleteAccount } = useAuthStore();
  const { t, tDynamic, lang } = useI18nStore();
  const { businessName, businessLegalName, businessCif, businessAddress, businessCity, businessPostalCode } = useSettingsStore();

  const activeName = businessName || BRAND_CONFIG.name;
  const activeLegalName = businessLegalName || BRAND_CONFIG.legalName || activeName;

  // Interpolación de los textos legales: mientras el negocio no configure su
  // CIF/dirección real (pestaña "Negocio" del admin), se mantiene el aviso
  // genérico de "se facilita bajo solicitud" ya usado en la demo; en cuanto
  // haya datos reales, se muestran directamente (obligatorio en un Aviso
  // Legal real en España).
  const fiscalDisclosure = businessCif
    ? (lang === 'en'
        ? `Tax registration: ${activeLegalName}, VAT/Tax ID ${businessCif}${businessAddress ? `, registered address: ${businessAddress}${businessCity ? ', ' + businessCity : ''}${businessPostalCode ? ' (' + businessPostalCode + ')' : ''}` : ''}.`
        : `Identificación fiscal: ${activeLegalName}, CIF ${businessCif}${businessAddress ? `, con domicilio en ${businessAddress}${businessCity ? ', ' + businessCity : ''}${businessPostalCode ? ' (' + businessPostalCode + ')' : ''}` : ''}.`)
    : (lang === 'en'
        ? 'For security reasons, the business\'s full tax and company registration details are not published in this document — they are provided only upon explicit request through the contact channels available in the app.'
        : 'Por motivos de seguridad, los datos completos de identificación fiscal y comercial del negocio no se publican en este documento — se facilitan únicamente bajo solicitud expresa a través de los canales de contacto de la aplicación.');

  const interpolateLegal = (text: string) => text
    .replaceAll('{business_name}', activeName)
    .replaceAll('{fiscal_disclosure}', fiscalDisclosure);
  useHardwareBack(isUserModalOpen, closeUserModal);
  const { addItem, clearCart } = useCartStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [editStreet, setEditStreet] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editCP, setEditCP] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // `profile.address` es un objeto (columna jsonb) — no una cadena JSON como
  // en la versión Supabase, así que aquí no hace falta JSON.parse.
  const formatAddress = (addr: any) => {
    if (!addr || typeof addr !== 'object') return '-';
    if (addr.street) {
      return `${addr.street}${addr.number ? ', Nº ' + addr.number : ''}`;
    }
    return '-';
  };

  // Pre-fill states if profile loads after modal opens
  React.useEffect(() => {
    if (profile) {
      setEditPhone(profile.phone || '');
      const addr = profile.address || {};
      setEditStreet(addr.street || '');
      setEditNumber(addr.number || '');
      setEditCP(addr.cp || '');
      setEditNotes(addr.notes || '');
    }
  }, [profile, isUserModalOpen]);

  if (!isUserModalOpen) return null;

  const handleLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await signIn(email, password);
      closeUserModal();
    } catch (error: any) {
      setErrorMsg(error.message || t('error_processing'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await registerUser({ full_name: name, phone: registerPhone, email, password });
      setModalView('profile');
    } catch (error: any) {
      setErrorMsg(error.message || t('error_creating_account'));
    } finally {
      setIsLoading(false);
    }
  };

  const processAccountDeletion = async () => {
    setIsLoading(true);
    try {
      await deleteAccount();
      setModalView('delete-success');
    } catch (error: any) {
      setErrorMsg(t('cannot_delete_account') + (error.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await updateProfile({
        phone: editPhone,
        address: { street: editStreet, number: editNumber, cp: editCP, notes: editNotes }
      });
      setModalView('profile');
    } catch (e: any) {
      if (e.status === 409) {
        setErrorMsg('Ese número de teléfono ya está en uso por otra cuenta. Revisa que esté bien escrito.');
      } else {
        setErrorMsg(e.message || t('error_updating_profile'));
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleRepeatOrder = (order: any) => {
    if (!order.order_items) return;
    clearCart();
    order.order_items.forEach((item: any) => {
      if (item.product_id) {
        addItem({
          id: Math.random().toString(36).substring(7),
          productId: item.product_id,
          name: item.product_name || 'Producto',
          price: item.unit_price,
          quantity: item.quantity,
          size: 'normal'
        });
      }
    });
    closeUserModal();
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">{t('status_pending_title')}</span>;
      case 'cooking': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400">{t('status_cooking_title')}</span>;
      case 'delivering': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">{t('status_delivering_title')}</span>;
      case 'delivered': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 text-zinc-900">{t('status_completed_title')}</span>;
      case 'cancelled': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">{t('status_cancelled_title')}</span>;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4">
      <div className="bg-[#F4F4F5] border border-zinc-200 rounded-3xl shadow-2xl w-full max-w-lg sm:max-w-xl overflow-hidden relative max-h-[85vh] sm:max-h-[90vh] flex flex-col animate-fade-in-up">

        {/* Botón Cerrar */}
        <button onClick={closeUserModal} className="absolute top-4 right-4 bg-[#FFFFFF] text-gray-500 hover:text-brand-ink p-2 rounded-xl border border-gray-200 hover:border-red-500/50 transition-all z-[1200] cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {/* Header del Modal */}
        <div className="bg-brand-surface px-6 py-8 text-center border-b border-gray-200 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-200/40 via-transparent to-transparent opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-2xl border border-zinc-300 p-2 shadow-sm mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v4H8v2h3v3h2v-3h3v-2h-3V7z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-display font-black text-brand-ink uppercase tracking-tight">{(user || profile) ? t('vip_account') : t('brand_name')}</h2>
            <p className="text-sm text-gray-500 mt-1">{(user || profile) ? t('vip_account_desc_logged_in') : t('vip_account_desc_logged_out')}</p>
          </div>
        </div>

        {/* Contenedor Dinámico (Vistas) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 no-scrollbar">

          {profile?.is_admin && userModalView !== 'legal' && userModalView !== 'legal-doc' && userModalView !== 'delete-account' && userModalView !== 'delete-success' ? (
            <div className="space-y-4 text-center py-6">
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500/50 mb-4 animate-pulse">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-xl font-display font-black text-brand-ink uppercase mb-2">{t('admin_session_title')}</h3>
              <p className="text-sm text-gray-300 leading-relaxed bg-red-500/10 border border-red-500/20 p-4 rounded-xl">{t('admin_session_desc')}</p>

              <button onClick={logout} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-6 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                {t('admin_logout')}
              </button>
            </div>
          ) : userModalView === 'login' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('email_or_phone')}</label>
                <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-2.5 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('password')}</label>
                <div className="relative w-full">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-2.5 pr-12 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-ink p-1">
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

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center p-2 rounded-lg mt-2 animate-fade-in font-medium">
                  {errorMsg}
                </div>
              )}

              <button onClick={handleLogin} disabled={isLoading} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-xl uppercase tracking-wide text-sm shadow-md transition-all mt-2 disabled:opacity-50">
                {isLoading ? t('processing') : t('login_btn')}
              </button>
              <p className="text-center text-xs text-gray-500 mt-2">
                {t('dont_have_account')} <button onClick={() => setModalView('register')} className="text-zinc-900 font-bold hover:underline">{t('register_here')}</button>
              </p>
            </div>
          ) : userModalView === 'register' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('full_name')}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-2.5 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder={t('placeholder_name_example')} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('phone_number')}</label>
                <input type="tel" value={registerPhone} onChange={e => setRegisterPhone(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-2.5 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder="+34 600 000 000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('email_address')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-2.5 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('password')}</label>
                <div className="relative w-full">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-2.5 pr-12 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder="•••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-ink p-1">
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

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center p-2 rounded-lg mt-2 animate-fade-in font-medium">
                  {errorMsg}
                </div>
              )}

              <button onClick={handleRegister} disabled={isLoading} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-xl uppercase tracking-wide text-sm shadow-md transition-all mt-2 disabled:opacity-50">
                {isLoading ? t('processing') : t('create_account_btn')}
              </button>
              <p className="text-center text-xs text-gray-500 mt-2">
                {t('already_have_account')} <button onClick={() => setModalView('login')} className="text-zinc-900 font-bold hover:underline">{t('login_here')}</button>
              </p>
            </div>
          ) : userModalView === 'profile' ? (
            <div className="space-y-4 text-left pb-4">
              {/* Puntos */}
              <div className="bg-gradient-to-br from-zinc-100 to-[#FFFFFF] border border-zinc-200 rounded-2xl p-5 text-center">
                <h3 className="text-xl font-display font-black text-brand-ink uppercase mb-1">{t('hello')} <span className="text-zinc-900">{profile?.full_name || user?.email?.split('@')[0] || t('user')}</span>!</h3>
                <p className="text-sm text-gray-500">{t('vip_welcome')}</p>

                <div className="mt-4 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('accumulated_points')}</span>
                  <span className="text-5xl font-display font-black text-zinc-900">{profile?.points || 0}</span>
                </div>
              </div>

              {/* Mis Datos */}
              <div className="bg-[#FFFFFF] border border-gray-200 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('my_data')}</h4>
                  <button onClick={() => setModalView('edit-profile')} className="text-[10px] text-zinc-900 hover:text-zinc-700 font-bold uppercase tracking-wider px-2 py-1 bg-zinc-100 rounded-lg transition-colors">{t('edit_btn')}</button>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t('phone_label')}</span>
                    <span className="font-medium text-brand-ink">{profile?.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t('address_label')}</span>
                    <span className="font-medium text-brand-ink text-right max-w-[65%] leading-tight">{formatAddress(profile?.address)}</span>
                  </div>
                </div>
              </div>

              {/* Botón de Pedidos */}
              <button onClick={() => setModalView('orders')} className="w-full bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-gray-200 text-left px-4 py-4 rounded-2xl text-sm text-gray-700 font-medium transition-all flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                  </div>
                  <span className="font-bold text-brand-ink uppercase tracking-wider">{t('order_history')}</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-zinc-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>

              {/* Recompensas */}
              <div className="bg-[#FFFFFF] border border-gray-200 rounded-2xl p-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{t('available_rewards')}</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-[#F4F4F5] hover:border-zinc-300 transition-all">
                    <div>
                      <div className="text-zinc-900 font-bold text-sm">25 pts</div>
                      <div className="text-brand-ink text-[11px] font-medium">{t('free_portion')}</div>
                    </div>
                    <button className={`text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${(profile?.points || 0) >= 25 ? 'bg-zinc-900 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      {(profile?.points || 0) >= 25 ? t('unlocked') : t('locked')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-left bg-[#F4F4F5] p-4 rounded-xl border border-gray-200">
                <h4 className="text-[11px] font-bold text-brand-ink uppercase mb-1">{t('how_it_works_title')}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{t('how_it_works_desc')}</p>
              </div>

              <button onClick={logout} className="w-full bg-transparent hover:bg-red-500/10 text-red-500 border border-red-500/30 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-2">
                {t('logout_btn')}
              </button>
            </div>
          ) : userModalView === 'orders' ? (
            <div className="space-y-4 text-left pb-4">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setModalView('profile')} className="p-2 -ml-2 text-gray-500 hover:text-brand-ink transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h3 className="text-xl font-display font-black text-brand-ink uppercase tracking-wider">{t('my_orders')}</h3>
              </div>

              {(!orders || orders.length === 0) ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-2">
                    🍽️
                  </div>
                  <h4 className="font-display font-bold text-brand-ink text-lg">{t('no_orders_yet')}</h4>
                  <p className="text-sm text-gray-500 px-4">{t('no_orders_desc')}</p>
                  <button onClick={() => { closeUserModal(); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="mt-4 px-6 py-2 bg-zinc-900 text-white font-bold text-sm uppercase rounded-xl">
                    {t('view_menu')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                  {(orders || []).map((order: any) => (
                    <div key={order.id} className="bg-[#FFFFFF] border border-gray-200 rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                            {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-right">
                          <span className="font-black text-brand-ink text-lg">{Number(order.total_amount).toFixed(2)}€</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 mb-4">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="text-sm text-gray-600 flex justify-between">
                            <span><span className="text-zinc-900 font-bold">{item.quantity}x</span> {item.product_name ? tDynamic(item.product_name) : t('product')}</span>
                          </div>
                        ))}
                      </div>

                      {order.status === 'delivered' && (
                        <button onClick={() => handleRepeatOrder(order)} className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-900 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          {t('repeat_order')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : userModalView === 'edit-profile' ? (
            <div className="space-y-4 text-left pb-4">
              <div className="bg-zinc-100 border border-zinc-200 rounded-2xl p-5 mb-2 text-center">
                <div className="w-12 h-12 bg-zinc-200 rounded-full mx-auto flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <h3 className="text-xl font-display font-black text-brand-ink uppercase mb-2">{t('complete_delivery_data')}</h3>
                <p className="text-xs text-gray-500">{t('delivery_data_desc')}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('phone_number')} <span className="text-red-500">*</span></label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder={t('placeholder_phone_example')} />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('street_label')} <span className="text-red-500">*</span></label>
                  <input type="text" value={editStreet} onChange={e => setEditStreet(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder={t('placeholder_street_example')} />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('number_label')} <span className="text-red-500">*</span></label>
                  <input type="text" value={editNumber} onChange={e => setEditNumber(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder={t('placeholder_number_example')} />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('cp_label')} <span className="text-red-500">*</span></label>
                  <input type="text" value={editCP} onChange={e => setEditCP(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder={t('placeholder_cp_example')} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('details_notes_optional')}</label>
                <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-brand-ink text-sm focus:outline-none focus:border-zinc-900 transition-colors" placeholder={t('placeholder_notes_example')} />
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center p-2 rounded-lg mt-2 animate-fade-in font-medium">
                  {errorMsg}
                </div>
              )}

              <button onClick={handleUpdateProfile} disabled={isLoading || !editPhone || !editStreet || !editNumber || !editCP} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-xl uppercase tracking-wide text-sm shadow-md transition-all mt-4 disabled:opacity-50">
                {isLoading ? t('saving') : t('save_info_btn')}
              </button>

              {profile?.phone && profile?.address && (
                <button onClick={() => setModalView('profile')} className="w-full bg-transparent hover:bg-zinc-100 text-gray-600 border border-gray-200 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-2">
                  {t('cancel_btn')}
                </button>
              )}
            </div>
          ) : null}

          {userModalView === 'legal' && (
            <div className="space-y-4 text-left pb-4">
              <h3 className="text-xl font-display font-black text-brand-ink uppercase mb-1 text-center">{t('legal_center')}</h3>
              <p className="text-sm text-gray-500 text-center mb-6">{t('legal_center_desc')}</p>

              <div className="space-y-2">
                <button onClick={() => setLegalDoc('Política de Privacidad')} className="w-full bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-gray-200 text-left px-4 py-3.5 rounded-xl text-sm text-gray-700 font-medium transition-all flex justify-between items-center group">
                  <span>{t('privacy_policy')}</span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-zinc-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <button onClick={() => setLegalDoc('Términos y Condiciones')} className="w-full bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-gray-200 text-left px-4 py-3.5 rounded-xl text-sm text-gray-700 font-medium transition-all flex justify-between items-center group">
                  <span>{t('terms_and_conditions')}</span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-zinc-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <button onClick={() => setLegalDoc('Uso y Tratamiento de Datos')} className="w-full bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-gray-200 text-left px-4 py-3.5 rounded-xl text-sm text-gray-700 font-medium transition-all flex justify-between items-center group">
                  <span>{t('data_usage')}</span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-zinc-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>

                <div className="pt-4 mt-4 border-t border-gray-200">
                  <button onClick={() => setModalView('delete-account')} className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-left px-4 py-3.5 rounded-xl text-sm text-red-600 font-medium transition-all flex justify-between items-center group">
                    <span>{t('request_account_deletion')}</span>
                    <svg className="w-4 h-4 text-red-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>

              <button onClick={() => setModalView(user ? 'profile' : 'login')} className="w-full bg-transparent hover:bg-zinc-100 text-gray-600 border border-gray-200 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-4">
                ← {t('go_back')}
              </button>
            </div>
          )}

          {userModalView === 'legal-doc' && (
            <div className="space-y-4 text-left pb-4 text-sm">
              <h3 className="text-xl font-display font-black text-brand-ink uppercase mb-1 text-center">{activeLegalDoc}</h3>

              <div className="bg-[#FFFFFF] border border-gray-200 rounded-2xl p-4 max-h-[50vh] overflow-y-auto no-scrollbar text-gray-600 text-sm leading-relaxed space-y-3">
                <p><strong>{t('last_updated_july_2026')}</strong></p>
                {(activeLegalDoc === 'Términos y Condiciones'
                  ? ['legal_terms_p1', 'legal_terms_p2', 'legal_terms_p3', 'legal_terms_p4', 'legal_terms_p5', 'legal_terms_p6']
                  : activeLegalDoc === 'Uso y Tratamiento de Datos'
                  ? ['legal_data_p1', 'legal_data_p2', 'legal_data_p3', 'legal_data_p4', 'legal_data_p5']
                  : ['legal_privacy_p1', 'legal_privacy_p2', 'legal_privacy_p3', 'legal_privacy_p4', 'legal_privacy_p5', 'legal_privacy_p6']
                ).map(key => <p key={key}>{interpolateLegal(t(key))}</p>)}
              </div>

              <button onClick={() => setModalView('legal')} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-4 shadow-md">
                {t('understood_accept')}
              </button>
            </div>
          )}

          {userModalView === 'delete-account' && (
            <div className="space-y-4 text-left pb-4">
              <h3 className="text-xl font-display font-black text-red-600 uppercase mb-1 text-center">{t('delete_account_title')}</h3>
              <p className="text-sm text-gray-500 text-center mb-6">{t('delete_account_desc')}</p>

              <div className="bg-[#FFFFFF] border border-gray-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-bold text-gray-500 uppercase">{t('why_delete_account')}</label>
                <select value={deleteReason} onChange={e => setDeleteReason(e.target.value)} className="w-full bg-[#F4F4F5] border border-gray-200 rounded-xl px-4 py-3 text-brand-ink text-sm focus:outline-none focus:border-red-500 transition-colors">
                  <option value="" disabled>{t('select_reason')}</option>
                  <option value="No uso la aplicación">{t('reason_not_using')}</option>
                  <option value="Recibo demasiadas notificaciones">{t('reason_too_many_notifications')}</option>
                  <option value="Problemas con mis pedidos">{t('reason_problems_orders')}</option>
                  <option value="Me mudo a otra ciudad">{t('reason_moving')}</option>
                  <option value="Otro">{t('reason_other')}</option>
                </select>

                {deleteReason === 'Otro' && (
                  <textarea rows={2} placeholder={t('explain_reason')} className="w-full bg-[#F4F4F5] border border-gray-200 rounded-xl px-4 py-3 text-brand-ink text-sm focus:outline-none focus:border-red-500 transition-colors mt-2"></textarea>
                )}

                <label className="flex items-start gap-3 cursor-pointer mt-4 pt-4 border-t border-gray-200">
                  <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)} className="mt-1 w-5 h-5 rounded border-gray-400 text-red-600 bg-white focus:ring-red-500" />
                  <span className="text-xs text-gray-500">{t('understand_deletion_irreversible')}</span>
                </label>
              </div>

              <button disabled={!deleteConfirm} onClick={processAccountDeletion} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-4 disabled:opacity-50 shadow-md">
                {t('confirm_permanent_deletion')}
              </button>
              <button onClick={() => setModalView('legal')} className="w-full bg-transparent hover:bg-zinc-100 text-gray-600 border border-gray-200 font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition-all mt-2">
                {t('cancel_btn')}
              </button>
            </div>
          )}

          {userModalView === 'delete-success' && (
            <div className="space-y-4 text-center pb-4 py-6">
              <div className="w-20 h-20 mx-auto bg-zinc-100 rounded-full flex items-center justify-center border-2 border-zinc-300 mb-4 animate-bounce">
                <svg className="w-10 h-10 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-2xl font-display font-black text-brand-ink uppercase tracking-wider">{t('see_you_soon')}</h3>
              <p className="text-gray-500 leading-relaxed max-w-sm mx-auto">
                {t('account_deleted_msg')}
              </p>

              <button onClick={closeUserModal} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all mt-6 shadow-md">
                {t('close_window')}
              </button>
            </div>
          )}

          {/* Legal Footer Link */}
          {userModalView !== 'legal' && userModalView !== 'legal-doc' && userModalView !== 'delete-account' && userModalView !== 'delete-success' && (
            <div className="mt-5 text-center border-t border-gray-200 pt-4">
              <button onClick={() => setModalView('legal')} className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest">
                {t('legal_footer')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
