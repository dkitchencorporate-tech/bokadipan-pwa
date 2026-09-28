import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/apiClient';

interface AdminProductFormProps {
  product?: any;
  categories: any[];
  subcategories: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminProductForm({ product, categories, subcategories, onClose, onSuccess }: AdminProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    badge: '',
    description: '',
    price: 0,
    category_id: categories.length > 0 ? categories[0].id : '',
    subcategory_id: '',
    image_url: '',
    is_available: true,
  });
  const [customizationSchema, setCustomizationSchema] = useState<any>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showManualUrl, setShowManualUrl] = useState(false);

  const isEditing = !!product;

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: product.name || '',
        badge: product.badge || product.customization_schema?.badge || product.name || '',
        description: product.description || '',
        price: product.price || 0,
        category_id: product.category_id || (categories.length > 0 ? categories[0].id : ''),
        subcategory_id: product.subcategory_id || '',
        image_url: product.image_url || '',
        is_available: product.is_available !== false,
      });
      setCustomizationSchema(product.customization_schema || {});
    }
  }, [product, isEditing, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const availableSubcategories = subcategories.filter(s => s.category_id === formData.category_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload: any = {
        name: formData.name,
        badge: formData.badge,
        description: formData.description,
        price: formData.price,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id || null,
        image_url: formData.image_url || null,
        is_available: formData.is_available,
        customization_schema: {
          ...customizationSchema,
          badge: formData.badge || undefined
        }
      };

      if (isEditing) {
        await api.put('/admin/catalog', { type: 'product', id: product.id, ...payload });
      } else {
        await api.post('/admin/catalog', { type: 'product', ...payload });
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving product:', err);
      if (err.status === 409) {
        setError(`Ya existe un producto con ese nombre ("${formData.name}"). Elige un nombre distinto.`);
      } else {
        setError(err.message || 'Ocurrió un error al guardar el producto.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Formato no admitido. Usa JPEG, PNG o WebP.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('El archivo supera los 3MB máximos permitidos.');
      return;
    }

    setIsUploadingImage(true);
    setUploadError('');

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const dataBase64 = dataUrl.split(',')[1] || '';
      const { url } = await api.post('/admin/upload-image', { filename: file.name, contentType: file.type, dataBase64 });
      setFormData(prev => ({ ...prev, image_url: url }));
    } catch (err: any) {
      setUploadError(err?.message || 'No se pudo subir la imagen');
    }
    setIsUploadingImage(false);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-xl overflow-y-auto max-h-[90vh] text-zinc-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-black text-zinc-900 uppercase">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Fotografía del Producto
              </label>

              {formData.image_url ? (
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-28 h-28 rounded-xl bg-zinc-100 overflow-hidden border border-zinc-200 shrink-0 flex items-center justify-center">
                    <img src={formData.image_url} alt="Vista previa" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <span className="text-xs text-emerald-600 font-bold flex items-center justify-center sm:justify-start gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Imagen asignada y activa
                    </span>
                    <p className="text-[11px] text-zinc-500 truncate max-w-sm">
                      {formData.image_url}
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <label className="px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-xl text-zinc-700 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs">
                        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        <span>{isUploadingImage ? 'Cargando...' : 'Reemplazar foto'}</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileSelect} disabled={isUploadingImage} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <span>Eliminar imagen</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    isUploadingImage 
                      ? 'border-zinc-500 bg-zinc-100 cursor-wait' 
                      : 'border-zinc-300 hover:border-zinc-500 bg-zinc-50 hover:bg-zinc-100'
                  }`}>
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-zinc-800 text-xs font-bold">Subiendo imagen...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-xs flex items-center justify-center text-zinc-700 mb-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        </div>
                        <span className="text-zinc-800 text-xs font-bold uppercase tracking-wider">Cargar imagen del plato</span>
                        <span className="text-[11px] text-zinc-500">Haz clic para elegir archivo (JPEG, PNG o WebP hasta 3MB)</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileSelect} disabled={isUploadingImage} className="hidden" />
                      </>
                    )}
                  </label>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualUrl(!showManualUrl)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1 font-medium"
                    >
                      <span>{showManualUrl ? '▲ Ocultar entrada URL manual' : '▼ O pegar enlace URL externo'}</span>
                    </button>
                    {showManualUrl && (
                      <div className="mt-2">
                        <input
                          type="text"
                          name="image_url"
                          value={formData.image_url}
                          onChange={handleChange}
                          placeholder="https://... (URL directa de la imagen)"
                          className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {uploadError && <p className="text-red-500 text-xs mt-1.5 font-medium">⚠️ {uploadError}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Nombre del Producto</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ej: Menú Gourmet Especial (Especialidad)"
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Etiqueta / Tag (Badge distintivo)
                </label>
                <span className="text-[10px] text-zinc-400">Por defecto: nombre de la receta</span>
              </div>
              <input
                type="text"
                name="badge"
                value={formData.badge}
                onChange={handleChange}
                placeholder="Ej: TOP VENTAS, ESPECIALIDAD, PICANTE..."
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Precio (€)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="Ej: 11.50"
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 transition-colors font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Categoría</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 transition-colors"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {availableSubcategories.length > 0 && (
              <div className="md:col-span-2 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Subcategoría (Opcional)
                  </label>
                  <select
                    name="subcategory_id"
                    value={formData.subcategory_id}
                    onChange={handleChange}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 transition-colors"
                  >
                    <option value="">-- Sin Subcategoría --</option>
                    {availableSubcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Descripción (visible en la carta)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Ej: Plato preparado con ingredientes frescos y salsa especial de la casa..."
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 transition-colors resize-none"
              />
            </div>

            <div className="md:col-span-2 flex items-center bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
              <input
                type="checkbox"
                id="is_available"
                name="is_available"
                checked={formData.is_available}
                onChange={handleChange}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <label htmlFor="is_available" className="ml-2.5 text-xs font-bold text-zinc-800 uppercase tracking-wider cursor-pointer">
                Producto Disponible para Pedidos
              </label>
            </div>
          </div>

          <div className="pt-3 flex gap-3">
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
              className="flex-1 py-3 rounded-xl font-extrabold bg-zinc-900 hover:bg-zinc-800 text-white transition-all disabled:opacity-50 text-xs uppercase shadow-sm"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
