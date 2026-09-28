import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';

interface KioskCustomerRow {
  phone: string;
  name: string;
  address: string | null;
  created_at: string;
}

function formatAddressLabel(address: string | null): string {
  if (!address) return '';
  try {
    const parsed = JSON.parse(address);
    if (parsed && typeof parsed === 'object') {
      const parts = [parsed.street, parsed.number ? `Nº ${parsed.number}` : '', parsed.cp, parsed.notes].filter(Boolean);
      return parts.join(', ');
    }
  } catch {
    // Texto plano
  }
  return address;
}

export default function AdminClients() {
  const [customers, setCustomers] = useState<KioskCustomerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), type === 'error' ? 7000 : 3000);
  };

  const [editModal, setEditModal] = useState<{ isOpen: boolean; customer?: KioskCustomerRow }>({ isOpen: false });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const askConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const fetchCustomers = useCallback(async (search: string) => {
    setIsLoading(true);
    try {
      const { clients } = await api.get('/admin/clients?onlyKiosk=1&q=' + encodeURIComponent(search.trim()));
      setCustomers(clients || []);
    } catch (error: any) {
      console.error('Error cargando clientes del TPV:', error);
      showNotification(error.message || 'Error cargando clientes.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers('');
  }, [fetchCustomers]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchCustomers(searchQuery), 350);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchCustomers]);

  const doDelete = async (customer: KioskCustomerRow) => {
    try {
      await api.del('/admin/clients', { phone: customer.phone });
      showNotification('Cliente eliminado correctamente.', 'success');
      fetchCustomers(searchQuery);
    } catch (error: any) {
      console.error('Error eliminando cliente:', error);
      showNotification(error.message || 'Error al eliminar el cliente.', 'error');
    }
  };

  const deleteCustomer = (customer: KioskCustomerRow) => {
    askConfirm(
      'Eliminar cliente',
      `¿Eliminar a "${customer.name}" del listado de clientes del TPV? Los pedidos en el historial permanecerán intactos.`,
      () => doDelete(customer)
    );
  };

  return (
    <div className="h-full overflow-y-auto p-3.5 sm:p-8 pb-24 sm:pb-8 bg-slate-50 text-zinc-900 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-black uppercase tracking-wide text-zinc-900">Gestión de Clientes (TPV)</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Fichas de clientes de mostrador y pedidos telefónicos.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 transition-colors shadow-xs"
          />
        </div>
      </div>

      {notification && (
        <div className={`mb-4 p-3.5 rounded-xl text-xs font-bold leading-relaxed border ${notification.type === 'success' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
          {notification.message}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-zinc-400 text-xs font-medium">Cargando clientes...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-xs bg-white rounded-2xl border border-zinc-200">
          {searchQuery ? 'Ningún cliente coincide con la búsqueda.' : 'Todavía no hay clientes registrados desde el TPV.'}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
          {/* Vista Móvil: Tarjetas Touch */}
          <div className="sm:hidden divide-y divide-zinc-100">
            {customers.map(c => (
              <div key={c.phone} className="p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-900">{c.name}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">{new Date(c.created_at).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="text-xs text-zinc-600 font-mono flex items-center gap-1.5">
                  <span className="text-amber-600 font-bold">📱</span>
                  <span>{c.phone}</span>
                </div>
                {c.address && (
                  <p className="text-xs text-zinc-500 leading-snug">
                    <span className="text-zinc-400">📍</span> {formatAddressLabel(c.address)}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-50">
                  <button
                    onClick={() => setEditModal({ isOpen: true, customer: c })}
                    className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold uppercase transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteCustomer(c)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold uppercase transition-colors border border-rose-200"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Escritorio / Tablet: Tabla Completa */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-left text-zinc-500 uppercase tracking-wider font-bold">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customers.map(c => (
                  <tr key={c.phone} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-900">{c.name}</td>
                    <td className="px-4 py-3 text-zinc-600 font-mono">{c.phone}</td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[280px] truncate" title={formatAddressLabel(c.address)}>{formatAddressLabel(c.address) || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(c.created_at).toLocaleDateString('es-ES')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditModal({ isOpen: true, customer: c })}
                          className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-[11px] font-bold uppercase transition-colors shadow-2xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteCustomer(c)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold uppercase transition-colors border border-rose-200"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editModal.isOpen && editModal.customer && (
        <EditClientModal
          customer={editModal.customer}
          onClose={() => setEditModal({ isOpen: false })}
          onSuccess={() => {
            setEditModal({ isOpen: false });
            showNotification('Cliente actualizado correctamente.', 'success');
            fetchCustomers(searchQuery);
          }}
          onError={(message) => showNotification(message, 'error')}
        />
      )}

      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[4000] flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-xl animate-fade-in text-zinc-900">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-rose-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </div>
              <h3 className="font-display font-extrabold text-zinc-900 text-base uppercase tracking-wider mb-1.5">{confirmModal.title}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="p-4 bg-zinc-50 flex gap-2.5 border-t border-zinc-200">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 font-bold rounded-xl text-xs uppercase transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  action();
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl py-2.5 text-xs uppercase transition-colors shadow-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditClientModal({ customer, onClose, onSuccess, onError }: {
  customer: KioskCustomerRow;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  let initStreet = '', initNumber = '', initCP = '28013', initNotes = '';
  if (customer.address) {
    try {
      const parsed = JSON.parse(customer.address);
      if (parsed && typeof parsed === 'object') {
        initStreet = parsed.street || '';
        initNumber = parsed.number || '';
        initCP = parsed.cp || '28013';
        initNotes = parsed.notes || '';
      } else {
        initNotes = customer.address;
      }
    } catch {
      initNotes = customer.address;
    }
  }

  const [fullName, setFullName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [street, setStreet] = useState(initStreet);
  const [number, setNumber] = useState(initNumber);
  const [cp, setCp] = useState(initCP);
  const [notes, setNotes] = useState(initNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Nombre y teléfono son obligatorios.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const hasAddressData = street.trim() || number.trim() || notes.trim();
      const addressJson = hasAddressData
        ? JSON.stringify({ street, number, cp, notes })
        : null;

      await api.put('/admin/clients', {
        phone: phone.trim(),
        originalPhone: customer.phone,
        name: fullName.trim(),
        address: addressJson
      });
      onSuccess();
    } catch (err: any) {
      console.error('Error actualizando cliente:', err);
      if (err.status === 409) {
        setError('Ya existe otro cliente con ese teléfono.');
      } else {
        const message = err.message || 'Error al actualizar el cliente.';
        setError(message);
        onError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh] text-zinc-900">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-display font-black text-zinc-900 uppercase">Editar Cliente</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl mb-4 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">Nombre</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm focus:border-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">Teléfono</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
              className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm focus:border-amber-500 outline-none font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">Calle (Opcional)</label>
              <input type="text" value={street} onChange={e => setStreet(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">Número (Opcional)</label>
              <input type="text" value={number} onChange={e => setNumber(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm focus:border-amber-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">CP (Opcional)</label>
              <input type="text" value={cp} onChange={e => setCp(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">Notas (Piso, puerta)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Piso 2A"
                className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-zinc-900 text-sm focus:border-amber-500 outline-none" />
            </div>
          </div>

          <div className="pt-3 flex gap-2.5">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors text-xs uppercase">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-extrabold bg-amber-600 hover:bg-amber-700 text-white transition-colors text-xs uppercase disabled:opacity-50 shadow-sm">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
