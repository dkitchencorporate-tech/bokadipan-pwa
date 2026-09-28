import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/apiClient';

export default function AdminUpsells() {
  const [upsells, setUpsells] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUpsell, setCurrentUpsell] = useState<any>(null);

  const [formData, setFormData] = useState({
    product_id: '',
    category: 'RECOMENDACIÓN',
    sort_order: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [upsellsRes, catalogRes] = await Promise.all([
        api.get('/admin/upsells'),
        api.get('/catalog?all=1')
      ]);
      setUpsells(upsellsRes.upsells || []);
      setProducts(catalogRes.products || []);
    } catch (e: any) {
      console.error('Error fetching upsells:', e);
      alert('Error cargando upsells: ' + (e?.message || 'error desconocido'));
    }
    setIsLoading(false);
  };

  const handleEdit = (upsell: any) => {
    setCurrentUpsell(upsell);
    setFormData({
      product_id: upsell.product_id,
      category: upsell.category,
      sort_order: upsell.sort_order || 0
    });
    setIsEditing(true);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleNew = () => {
    setCurrentUpsell(null);
    setFormData({
      product_id: products.length > 0 ? products[0].id : '',
      category: 'RECOMENDACIÓN',
      sort_order: upsells.length + 1
    });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await api.del('/admin/upsells', { id });
    } catch (e: any) {
      console.error('Error borrando upsell:', e);
    }
    fetchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentUpsell) {
        await api.put('/admin/upsells', {
          id: currentUpsell.id,
          product_id: formData.product_id,
          category: formData.category,
          sort_order: formData.sort_order
        });
      } else {
        await api.post('/admin/upsells', {
          product_id: formData.product_id,
          category: formData.category,
          sort_order: formData.sort_order
        });
      }
    } catch (e: any) {
      alert('Error guardando: ' + (e?.message || 'error desconocido'));
    }
    setIsEditing(false);
    fetchData();
  };

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400 text-sm">Cargando sugerencias de venta...</div>;
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs font-sans text-zinc-900 animate-fade-in">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-200">
        <div>
          <h3 className="text-lg font-display font-black text-zinc-900 uppercase">Sugerencias (Upsells)</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Productos sugeridos antes de confirmar el pedido.</p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
        >
          + Nueva Sugerencia
        </button>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 mb-6 animate-fade-in">
          <h4 className="font-bold text-zinc-900 text-sm mb-3 uppercase tracking-wider">{currentUpsell ? 'Editar Sugerencia' : 'Nueva Sugerencia'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">Producto del Menú</label>
              <select
                required
                value={formData.product_id}
                onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-zinc-900 text-sm focus:border-zinc-900 outline-none"
              >
                <option value="" disabled>-- Selecciona un producto --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {Number(p.price).toFixed(2)}€</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">Título de Grupo</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                placeholder="EJ: SALSAS O BEBIDAS"
                className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-zinc-900 text-sm uppercase focus:border-zinc-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">Orden de Aparición</label>
              <input
                type="number"
                required
                value={formData.sort_order}
                onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-zinc-900 text-sm focus:border-zinc-900 outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-100 transition-colors text-xs uppercase">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold transition-colors text-xs uppercase shadow-sm">Guardar Sugerencia</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {upsells.map(upsell => {
          const prod = upsell.products;
          if (!prod) return null;
          return (
            <div key={upsell.id} className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-4 flex justify-between items-center gap-3.5 shadow-xs">
              {prod.image_url && (
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-zinc-100 border border-zinc-200">
                  <img src={prod.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-zinc-600 font-bold uppercase">{upsell.category} • Orden: {upsell.sort_order}</span>
                <h4 className="font-bold text-zinc-900 text-sm truncate flex items-center gap-1.5 mt-0.5">
                  <span>{prod.name}</span>
                  {!prod.is_available && <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[9px] font-bold rounded-full">INACTIVO</span>}
                </h4>
                <span className="font-extrabold text-zinc-900 text-xs mt-0.5 block">{Number(prod.price).toFixed(2)}€</span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => handleEdit(upsell)} className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors" title="Editar">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onClick={() => handleDelete(upsell.id)} className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors" title="Eliminar">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          );
        })}
        {upsells.length === 0 && (
          <div className="col-span-full py-8 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl text-xs">
            No hay sugerencias configuradas.
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-scale-in text-zinc-900">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-rose-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </div>
              <h3 className="font-display font-extrabold text-zinc-900 text-base uppercase tracking-wider mb-1.5">¿Eliminar Sugerencia?</h3>
              <p className="text-zinc-600 text-xs leading-relaxed">Esta recomendación dejará de mostrarse a los clientes antes del pago.</p>
            </div>
            <div className="p-4 bg-zinc-50 flex gap-2.5 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl py-2.5 text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
