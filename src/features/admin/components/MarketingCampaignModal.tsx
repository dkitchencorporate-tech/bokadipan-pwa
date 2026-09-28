import React, { useState } from 'react';
import { api } from '../../../lib/apiClient';
import { BRAND_CONFIG } from '../../../config/brandConfig';

interface MarketingCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: string[];
}

export const MarketingCampaignModal: React.FC<MarketingCampaignModalProps> = ({ isOpen, onClose, recipients }) => {
  const userCount = recipients.length;
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [message, setMessage] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [ctaText, setCtaText] = useState('¡Pedir Ahora en la App!');
  const [ctaUrl, setCtaUrl] = useState(typeof window !== 'undefined' ? window.location.origin : '');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState('');

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);
    setSendError('');
    try {
      await api.post('/send-campaign', { subject, headline, message, flyerUrl, ctaText, ctaUrl, recipients });

      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        onClose();
      }, 2500);
    } catch (error: any) {
      console.error(error);
      setSendError(error.message || 'Error al enviar la campaña.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl relative flex flex-col overflow-hidden text-zinc-900">
        
        {/* Accent Bar */}
        <div className="h-1.5 bg-zinc-900"></div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-900 font-bold shadow-xs">
              <svg className="w-5 h-5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="font-display font-black text-lg sm:text-xl text-zinc-900 uppercase tracking-wider">Campaña de Email Marketing</h3>
              <p className="text-xs text-zinc-500 font-medium">
                Remitente Oficial: <strong className="text-zinc-900 font-mono">{BRAND_CONFIG.legal.contactEmail || 'contacto@marca.com'}</strong> &bull; <span className="text-zinc-800 font-bold">{userCount} destinatarios</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'editor' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                Redactar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'preview' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                Vista Previa
              </button>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-800 p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {sendSuccess ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h4 className="text-2xl font-black text-zinc-900 uppercase">¡Campaña Enviada con Éxito!</h4>
              <p className="text-zinc-500 text-sm mt-2">El boletín promocional ha sido despachado a los {userCount} clientes registrados.</p>
            </div>
          ) : activeTab === 'editor' ? (
            <form onSubmit={handleSend} className="space-y-4 max-w-2xl mx-auto">
              <div>
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Asunto del Correo (Subject)</label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ej: ¡Novedades y promociones exclusivas en nuestra carta!"
                  className="w-full bg-slate-50 border border-zinc-300 focus:border-zinc-900 focus:bg-white rounded-xl px-4 py-3 text-zinc-900 transition-colors outline-none font-medium text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Titular Destacado (Opcional)</label>
                  <input 
                    type="text" 
                    value={headline}
                    onChange={e => setHeadline(e.target.value)}
                    placeholder={`Ej: ¡Fin de Semana Especial en ${BRAND_CONFIG.name}!`}
                    className="w-full bg-slate-50 border border-zinc-300 focus:border-zinc-900 focus:bg-white rounded-xl px-4 py-2.5 text-zinc-900 transition-colors outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1.5">URL de Imagen / Flyer (Opcional)</label>
                  <input 
                    type="url" 
                    value={flyerUrl}
                    onChange={e => setFlyerUrl(e.target.value)}
                    placeholder="https://.../promo_flyer.jpg"
                    className="w-full bg-slate-50 border border-zinc-300 focus:border-zinc-900 focus:bg-white rounded-xl px-4 py-2.5 text-zinc-900 transition-colors outline-none text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Cuerpo del Mensaje / Oferta</label>
                <textarea 
                  required
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Escribe el texto de la promoción, código de descuento o novedades del menú..."
                  className="w-full bg-slate-50 border border-zinc-300 focus:border-zinc-900 focus:bg-white rounded-xl px-4 py-3 text-zinc-900 transition-colors outline-none text-sm custom-scrollbar"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Texto del Botón (CTA)</label>
                  <input 
                    type="text" 
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    className="w-full bg-slate-50 border border-zinc-300 focus:border-zinc-900 focus:bg-white rounded-xl px-4 py-2.5 text-zinc-900 transition-colors outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Enlace de Destino (Link)</label>
                  <input 
                    type="url" 
                    value={ctaUrl}
                    onChange={e => setCtaUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-zinc-300 focus:border-zinc-900 focus:bg-white rounded-xl px-4 py-2.5 text-zinc-900 transition-colors outline-none text-sm font-mono"
                  />
                </div>
              </div>

              {sendError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 font-medium">
                  {sendError}
                </div>
              )}

              <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs uppercase hover:bg-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSending || userCount === 0}
                  className="px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSending ? 'Despachando...' : `Enviar Campaña a ${userCount} Clientes`}
                </button>
              </div>
            </form>
          ) : (
            /* Vista Previa del Email (Diseño Corporativo) */
            <div className="max-w-2xl mx-auto bg-white text-slate-800 rounded-2xl shadow-lg border border-slate-200 overflow-hidden font-sans">
              
              {/* Header Email */}
              <div className="bg-slate-900 p-6 text-center border-b-4 border-zinc-700 relative">
                <div className="w-16 h-16 bg-white rounded-2xl p-1 mx-auto mb-2 border border-zinc-200 shadow-md flex items-center justify-center">
                  <img src={BRAND_CONFIG.assets.logoUrl} alt={BRAND_CONFIG.name} className="w-full h-full object-contain" />
                </div>
                <h2 className="text-xl font-black uppercase text-white tracking-wider m-0">{BRAND_CONFIG.name}</h2>
                <p className="text-xs text-zinc-400 font-bold tracking-widest uppercase mt-1">{BRAND_CONFIG.slogan}</p>
              </div>

              {/* Body Email */}
              <div className="p-8 space-y-5">
                {headline && (
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-center">
                    {headline}
                  </h3>
                )}

                {flyerUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm my-4">
                    <img src={flyerUrl} alt="Flyer Promocional" className="w-full max-h-72 object-cover" />
                  </div>
                )}

                <div className="text-slate-700 text-base leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-xl border border-slate-100">
                  {message || 'Aquí se mostrará el cuerpo del correo redactado en el formulario...'}
                </div>

                <div className="text-center pt-4">
                  <a 
                    href={ctaUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block bg-zinc-900 hover:bg-zinc-800 text-white font-black text-sm uppercase tracking-wider py-4 px-8 rounded-xl shadow-md transition-all text-decoration-none"
                  >
                    {ctaText}
                  </a>
                </div>
              </div>

              {/* Footer Email */}
              <div className="bg-slate-100 p-6 text-center border-t border-slate-200 text-xs text-slate-500 space-y-1.5">
                <p className="font-bold text-slate-700">{BRAND_CONFIG.name}</p>
                <p>{BRAND_CONFIG.slogan}</p>
                <p className="text-[10px] text-slate-400 pt-2">
                  Has recibido este correo porque formas parte del Club VIP de {BRAND_CONFIG.name}.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
