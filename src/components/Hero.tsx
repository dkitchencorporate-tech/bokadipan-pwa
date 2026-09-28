import { useAuthStore } from '../store/authStore';
import { useI18nStore } from '../store/i18nStore';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function Hero() {
  const { t } = useI18nStore();
  const loyalty = BRAND_CONFIG.loyalty;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-brand-border min-h-[400px] flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-primaryLight/40 via-white to-white"></div>

        <div className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between gap-8 p-6 sm:p-14">
          <div className="w-full sm:w-[60%] space-y-4 sm:space-y-6 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-primaryLight text-brand-primary text-[10px] sm:text-sm font-display font-bold uppercase tracking-widest border border-brand-primary/20">
              {loyalty.badgeText || t('vip_slide_badge')}
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-brand-ink tracking-tight leading-none uppercase">
              {loyalty.heroTitle || t('vip_slide_title')}<br/>
              <span className="text-brand-primary">{loyalty.heroSubtitle || t('vip_slide_subtitle')}</span>
            </h2>
            <p className="text-sm sm:text-base text-brand-inkSoft font-medium leading-relaxed max-w-xl mx-auto sm:mx-0">
              {loyalty.heroDescription || t('vip_slide_desc')}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4">
              <button
                onClick={() => useAuthStore.getState().openUserModal('register')}
                className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primaryHover text-white font-display font-black px-8 py-4 rounded-2xl text-sm shadow-lg tracking-wider uppercase transition-all hover:scale-105"
              >
                {t('register')}
              </button>
            </div>
          </div>

          <div className="relative w-32 h-32 sm:w-48 sm:h-48 shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-brand-primaryLight rounded-full blur-2xl"></div>
            {BRAND_CONFIG.assets.logoUrl ? (
              <img
                src={BRAND_CONFIG.assets.logoUrl}
                alt={BRAND_CONFIG.name}
                className="relative w-full h-full object-contain drop-shadow-md"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="relative w-28 h-28 rounded-3xl bg-brand-primary text-white flex items-center justify-center font-display font-black text-4xl shadow-xl">
                {BRAND_CONFIG.shortName.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
