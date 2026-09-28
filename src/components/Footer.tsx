import { useAuthStore } from '../store/authStore';
import { useI18nStore } from '../store/i18nStore';
import { useSettingsStore } from '../store/settingsStore';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function Footer() {
  const { openUserModal } = useAuthStore();
  const { t } = useI18nStore() as any;
  const { businessName, businessCif, businessWhatsapp } = useSettingsStore();

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-border bg-white px-4 sm:px-8 py-8 mt-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <p className="text-brand-ink font-display font-black text-sm uppercase tracking-wider">{businessName || BRAND_CONFIG.name}</p>
          {businessCif && (
            <p className="text-[10px] text-brand-inkSoft mt-0.5">CIF {businessCif}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          {businessWhatsapp && (
            <a
              href={`https://wa.me/${businessWhatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-inkSoft hover:text-brand-primary transition-colors uppercase tracking-wider font-bold"
            >
              WhatsApp
            </a>
          )}
          <button onClick={() => openUserModal('legal')} className="text-brand-inkSoft hover:text-brand-primary transition-colors uppercase tracking-wider font-bold">
            {t('legal_footer')}
          </button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto text-center mt-6 pt-4 border-t border-gray-100">
        <a
          href="https://dkitchencorporate.es/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 transition-colors text-[10px] uppercase tracking-widest font-medium"
        >
          © {currentYear} {BRAND_CONFIG.name} · Tecnología D-Kitchen Corporate Tech
        </a>
      </div>
    </footer>
  );
}
