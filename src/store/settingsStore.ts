import { create } from 'zustand';
import { api } from '../lib/apiClient';

interface SettingsState {
  deliveryFee: number;
  minOrderDelivery: number;
  isStoreOpenFlag: boolean;
  estimatedPrepTime: number;
  // Identidad del negocio — nulos hasta que el admin los rellena desde la
  // pestaña "Negocio" (ver AdminBusiness.tsx). Todo consumidor (Footer,
  // Header, textos legales) debe tratar estos campos como opcionales y
  // mantener su propio fallback genérico cuando vengan vacíos.
  businessName: string | null;
  businessLegalName: string | null;
  businessCif: string | null;
  businessPhone: string | null;
  businessWhatsapp: string | null;
  businessEmail: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessPostalCode: string | null;
  fetchSettings: () => Promise<void>;
}

// El catálogo público (GET /api/catalog) ya trae `settings` junto con
// categorías/productos en una sola llamada — se reutiliza aquí para no
// duplicar otro round-trip solo por los ajustes de tienda (ni para los
// campos business_* nuevos, que viajan en la misma fila de store_settings).
export const useSettingsStore = create<SettingsState>((set) => ({
  deliveryFee: 2.50,
  minOrderDelivery: 15.00,
  isStoreOpenFlag: true,
  estimatedPrepTime: 20,
  businessName: null,
  businessLegalName: null,
  businessCif: null,
  businessPhone: null,
  businessWhatsapp: null,
  businessEmail: null,
  businessAddress: null,
  businessCity: null,
  businessPostalCode: null,

  fetchSettings: async () => {
    try {
      const data = await api.get('/catalog');
      if (data?.settings) {
        set({
          deliveryFee: Number(data.settings.delivery_fee),
          minOrderDelivery: Number(data.settings.min_order_delivery),
          isStoreOpenFlag: !!data.settings.is_store_open,
          estimatedPrepTime: Number(data.settings.estimated_prep_time || 20),
          businessName: data.settings.business_name || null,
          businessLegalName: data.settings.business_legal_name || null,
          businessCif: data.settings.business_cif || null,
          businessPhone: data.settings.business_phone || null,
          businessWhatsapp: data.settings.business_whatsapp || null,
          businessEmail: data.settings.business_email || null,
          businessAddress: data.settings.business_address || null,
          businessCity: data.settings.business_city || null,
          businessPostalCode: data.settings.business_postal_code || null
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }
}));
