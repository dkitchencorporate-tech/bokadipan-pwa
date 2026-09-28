import { useAuthStore } from '../store/authStore';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useI18nStore } from '../store/i18nStore';
import { useSettingsStore } from '../store/settingsStore';
import { BRAND_CONFIG } from '../config/brandConfig';
import BokadipanLogo from './BokadipanLogo';

const UKFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-6 h-4 rounded-[2px] shadow-[0_0_5px_rgba(0,0,0,0.2)]">
    <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
    <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

const ESFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 500" className="w-6 h-4 rounded-[2px] shadow-[0_0_5px_rgba(0,0,0,0.2)]">
    <rect width="750" height="500" fill="#c60b1e"/>
    <rect width="750" height="250" y="125" fill="#ffc400"/>
    <path d="M210,210 h80 v80 a40,40 0 0,1 -80,0 z" fill="#c60b1e"/>
  </svg>
);


export default function Header() {
  const { user, profile, openUserModal } = useAuthStore();
  const { promptToInstall } = usePWAInstall();
  const { lang, toggleLang, t } = useI18nStore();
  const { businessWhatsapp, businessPhone } = useSettingsStore();
  // Contacto real (WhatsApp o teléfono) una vez el admin lo configura en la
  // pestaña "Negocio"; hasta entonces mantiene el comportamiento actual
  // (abrir el panel legal, que es donde se explica cómo pedir esos datos).
  const contactHref = businessWhatsapp
    ? `https://wa.me/${businessWhatsapp.replace(/[^0-9]/g, '')}`
    : businessPhone
    ? `tel:${businessPhone.replace(/[^0-9+]/g, '')}`
    : null;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-brand-border shadow-sm transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-8 py-3">
        {/* Marca y Logo BOKADIPAN */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>
          <BokadipanLogo showTagline={true} />
          <div className="hidden sm:block">
            <span className="text-[9px] font-extrabold bg-brand-primaryLight text-brand-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-display border border-brand-primary/20">
              {BRAND_CONFIG.city || 'ONLINE'}
            </span>
            <p className="flex text-[11px] text-gray-500 font-medium items-center gap-1.5 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-brand-primary animate-pulse shrink-0"></span>
              <span>{BRAND_CONFIG.slogan || 'Gastronomía Digital'}</span>
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3 sm:gap-2.5 ml-auto">
          <button
            onClick={() => toggleLang()}
            className="flex items-center justify-center w-10 h-10 sm:h-9 sm:w-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-brand-border shadow-sm transition-all shrink-0 hover:scale-105"
            title={lang === 'es' ? t('switch_lang_en') : t('switch_lang_es')}
          >
            {lang === 'es' ? <UKFlag /> : <ESFlag />}
          </button>
          <button onClick={promptToInstall} className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-brand-accent to-brand-primary text-brand-ink font-display font-bold text-sm shadow-[0_4px_15px_rgba(250,204,21,0.35)] hover:scale-105 transition-transform uppercase tracking-widest border border-brand-accent/60">
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>{t('install_app')}</span>
          </button>
          <button onClick={promptToInstall} className="md:hidden flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-brand-accent text-brand-ink shadow-[0_4px_15px_rgba(250,204,21,0.4)] transition-all hover:scale-105 shrink-0">
            <svg className="w-5 h-5 sm:w-4 sm:h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </button>

          {contactHref ? (
            <a
              href={contactHref}
              target={businessWhatsapp ? '_blank' : undefined}
              rel={businessWhatsapp ? 'noopener noreferrer' : undefined}
              className="flex bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl w-10 h-10 sm:w-auto sm:px-3.5 sm:py-2 text-sm font-display font-bold items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
            >
              <svg className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              <span className="hidden sm:inline">{t('contact')}</span>
            </a>
          ) : (
            <button onClick={() => openUserModal('legal')} className="flex bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl w-10 h-10 sm:w-auto sm:px-3.5 sm:py-2 text-sm font-display font-bold items-center justify-center gap-1.5 shadow-sm transition-all shrink-0">
              <svg className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              <span className="hidden sm:inline">{t('contact')}</span>
            </button>
          )}

          <div onClick={() => openUserModal()} className="cursor-pointer flex bg-gray-50 hover:bg-gray-100 border border-brand-border rounded-xl w-10 h-10 sm:w-auto sm:px-3 sm:py-1.5 items-center justify-center gap-2 transition-all shadow-sm shrink-0">
            {user ? (
              <>
                <div className="w-6 h-6 sm:w-6 sm:h-6 rounded-lg bg-brand-primary/15 text-brand-primaryHover border border-brand-primary/30 flex items-center justify-center font-display font-bold text-xs sm:text-[10px] shrink-0">👤</div>
                <span className="hidden sm:inline text-sm font-bold text-brand-ink uppercase truncate max-w-[120px]">
                  {t('hello')} {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || t('user')}
                </span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 sm:w-6 sm:h-6 rounded-lg bg-brand-primary/15 text-brand-primaryHover border border-brand-primary/30 flex items-center justify-center font-display font-bold text-xs sm:text-[10px] shrink-0">🔑</div>
                <span className="hidden sm:inline text-sm font-bold text-brand-ink uppercase">{t('login')}</span>
              </>
            )}
          </div>

          {user && (
            <button onClick={() => window.dispatchEvent(new Event('open-tracking'))} className="cursor-pointer flex bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl w-10 h-10 items-center justify-center transition-all shadow-sm shrink-0 text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
          )}
        </div>
      </div>


    </header>
  );
}
