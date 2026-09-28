import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/apiClient';

interface AdminSubcategoryFormProps {
  subcategory?: any;
  categoryId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminSubcategoryForm({ subcategory, categoryId, onClose, onSuccess }: AdminSubcategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    sort_order: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!subcategory;

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: subcategory.name || '',
        sort_order: subcategory.sort_order || 0,
      });
    }
  }, [subcategory, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (isEditing) {
        await api.put('/admin/catalog', { type: 'subcategory', id: subcategory.id, ...formData });
      } else {
        await api.post('/admin/catalog', { type: 'subcategory', category_id: categoryId, ...formData });
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving subcategory:', err);
      if (err.status === 409) {
        setError('Ya existe una subcategoría con ese nombre en esta categoría. Prueba con un nombre distinto.');
      } else {
        setError(err.message || 'Ocurrió un error al guardar la subcategoría.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh] text-zinc-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-black text-zinc-900 uppercase">
            {isEditing ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl mb-5 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Nombre Subcategoría</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ej: Especialidades Premium"
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Orden de Visualización</label>
            <input
              type="number"
              name="sort_order"
              value={formData.sort_order}
              onChange={handleChange}
              min="0"
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 transition-colors"
            />
            <p className="text-[11px] text-zinc-400 mt-1">Número menor aparece primero (0, 1, 2...).</p>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors text-xs uppercase"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl font-extrabold bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:brightness-105 transition-all disabled:opacity-50 text-xs uppercase shadow-sm"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Subcategoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
