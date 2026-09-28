import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { useAuthStore } from '../store/authStore';
import { BRAND_CONFIG } from '../config/brandConfig';

export default function VerifyEmail() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verificando tu cuenta de correo...');
  const { fetchProfile } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('El enlace de verificación no es válido o está incompleto.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.post('/account/verify-email', { token });
        setStatus('success');
        setMessage(res.message || '¡Tu correo electrónico ha sido verificado con éxito! Tus puntos VIP ya están activos para canjear en todos tus pedidos.');
        await fetchProfile();
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'El enlace de verificación ha expirado o ya fue utilizado.');
      }
    };

    verify();
  }, []);

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-primary to-brand-accent"></div>
        <div className="w-16 h-16 rounded-2xl bg-brand-primaryLight border border-brand-border flex items-center justify-center mx-auto mb-6">
          {status === 'verifying' && (
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          )}
          {status === 'success' && (
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'error' && (
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h2 className="text-2xl font-display font-black text-brand-ink mb-3 uppercase">
          {status === 'verifying' && 'Activando tu Cuenta'}
          {status === 'success' && '¡Cuenta y Puntos Activados!'}
          {status === 'error' && 'Error de Verificación'}
        </h2>

        <p className="text-brand-inkSoft text-sm mb-8 leading-relaxed font-medium">
          {message}
        </p>

        <a
          href="/"
          className="inline-block w-full py-3.5 px-6 rounded-2xl bg-brand-primary hover:bg-brand-primaryHover text-white font-display font-bold uppercase tracking-wider text-sm shadow-md transition-all text-center"
        >
          Ir a la Carta de {BRAND_CONFIG.name}
        </a>
      </div>
    </div>
  );
}
