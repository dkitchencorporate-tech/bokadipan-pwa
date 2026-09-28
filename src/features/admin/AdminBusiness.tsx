import { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';

interface BusinessSettings {
  business_name: string;
  business_legal_name: string;
  business_cif: string;
  business_phone: string;
  business_whatsapp: string;
  business_email: string;
  business_address: string;
  business_city: string;
  business_postal_code: string;
}

const EMPTY: BusinessSettings = {
  business_name: '', business_legal_name: '', business_cif: '', business_phone: '',
  business_whatsapp: '', business_email: '', business_address: '', business_city: '', business_postal_code: ''
};

export default function AdminBusiness() {
  const [form, setForm] = useState<BusinessSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { settings } = await api.get('/admin/settings');
        if (settings) {
          setForm({
            business_name: settings.business_name || '',
            business_legal_name: settings.business_legal_name || '',
            business_cif: settings.business_cif || '',
            business_phone: settings.business_phone || '',
            business_whatsapp: settings.business_whatsapp || '',
            business_email: settings.business_email || '',
            business_address: settings.business_address || '',
            business_city: settings.business_city || '',
            business_postal_code: settings.business_postal_code || ''
          });
        }
        setLoadError(false);
      } catch {
        setLoadError(true);
      }
      setLoading(false);
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/admin/settings', { settings: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron guardar los datos del negocio');
    }
    setSaving(false);
  };

  const Field = ({ label, name, placeholder, type = 'text' }: { label: string; name: keyof BusinessSettings; placeholder: string; type?: string }) => (
    <div>
      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-2xs"
      />
    </div>
  );

  return (
    <div className="p-4 sm:p-8 pb-24 sm:pb-8 max-w-3xl mx-auto overflow-y-auto h-full font-sans text-zinc-900">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h2 className="font-display font-black text-xl sm:text-2xl text-zinc-900 uppercase tracking-wide">Ajustes del Negocio</h2>
          <p className="text-zinc-500 text-xs">Identidad, datos fiscales y contacto que se muestran en la carta pública y pie de página.</p>
        </div>
      </div>

      {loadError && (
        <div className="my-5 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs leading-relaxed">
          No se pudo cargar la ficha del negocio.
        </div>
      )}

      {error && (
        <div className="my-5 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs">{error}</div>
      )}

      {loading ? (
        <p className="text-zinc-400 text-xs py-8 text-center font-medium">Cargando datos del negocio...</p>
      ) : (
        <div className="space-y-5 mt-5">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Identidad</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Nombre comercial" name="business_name" placeholder="Ej: Mi Restaurante" />
              <Field label="Razón social" name="business_legal_name" placeholder="Ej: Mi Restaurante S.L." />
              <Field label="CIF / NIF" name="business_cif" placeholder="Ej: B12345678" />
              <Field label="Email de contacto" name="business_email" placeholder="hola@tudominio.com" type="email" />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Contacto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Teléfono" name="business_phone" placeholder="+34 600 000 000" type="tel" />
              <Field label="WhatsApp" name="business_whatsapp" placeholder="34600000000 (solo dígitos)" type="tel" />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Dirección fiscal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-3">
                <Field label="Dirección" name="business_address" placeholder="Calle Ejemplo 12, 1ºA" />
              </div>
              <Field label="Ciudad" name="business_city" placeholder="Madrid" />
              <Field label="Código postal" name="business_postal_code" placeholder="28001" />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado con éxito' : 'Guardar datos del negocio'}
          </button>
        </div>
      )}
    </div>
  );
}
