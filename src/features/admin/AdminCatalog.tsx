import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import AdminCategoryForm from './components/AdminCategoryForm';
import AdminProductForm from './components/AdminProductForm';
import AdminUpsells from './components/AdminUpsells';
import AdminSubcategoryForm from './components/AdminSubcategoryForm';
import { useI18nStore } from '../../store/i18nStore';
import { getProductImageUrl } from '../../data/products';

export default function AdminCatalog() {
  const { t, tDynamic } = useI18nStore();
  const [activeTab, setActiveTab] = useState<'catalog' | 'upsells'>('catalog');

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; data?: any }>({ isOpen: false });
  const [subcategoryModal, setSubcategoryModal] = useState<{ isOpen: boolean; data?: any; categoryId?: string }>({ isOpen: false });
  const [productModal, setProductModal] = useState<{ isOpen: boolean; data?: any }>({ isOpen: false });

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal de confirmación propio
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const askConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/catalog?all=1');
      if (data.categories) setCategories(data.categories);
      if (data.subcategories) setSubcategories(data.subcategories);
      if (data.products) setProducts(data.products);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      showNotification(t('error_loading_catalog'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), type === 'error' ? 7000 : 3000);
  };

  const toggleProductActive = async (id: number, currentStatus: boolean) => {
    try {
      await api.put('/admin/catalog', { type: 'product', id, is_available: !currentStatus });
      fetchData();
    } catch {
      showNotification(t('error_updating_status'), 'error');
    }
  };

  const deleteProduct = (product: any) => {
    askConfirm(
      t('confirm_delete_product_title'),
      t('confirm_delete_product'),
      () => doDeleteProduct(product)
    );
  };

  const doDeleteProduct = async (product: any) => {
    try {
      await api.del('/admin/catalog', { type: 'product', id: product.id });
      showNotification(t('product_deleted_success'), 'success');
      fetchData();
    } catch {
      showNotification(t('error_deleting_product'), 'error');
    }
  };

  const deleteCategory = (id: string) => {
    const hasProducts = products.some(p => p.category_id === id);
    const hasSubcats = subcategories.some(s => s.category_id === id);

    if (hasProducts || hasSubcats) {
      showNotification(t('error_delete_category_with_products'), 'error');
      return;
    }

    askConfirm(
      t('confirm_delete_category_title'),
      t('confirm_delete_category'),
      () => doDeleteCategory(id)
    );
  };

  const doDeleteCategory = async (id: string) => {
    try {
      await api.del('/admin/catalog', { type: 'category', id });
      showNotification(t('category_deleted_success'), 'success');
      fetchData();
    } catch {
      showNotification(t('error_deleting_category'), 'error');
    }
  };

  const moveCategory = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    const withNewOrder = reordered.map((cat, i) => ({ ...cat, sort_order: i }));
    setCategories(withNewOrder);

    try {
      await Promise.all(
        withNewOrder.map(cat => api.put('/admin/catalog', { type: 'category', id: cat.id, sort_order: cat.sort_order }))
      );
      showNotification('Orden actualizado', 'success');
    } catch (error) {
      showNotification('Error al actualizar el orden', 'error');
      fetchData();
    }
  };

  const deleteSubcategory = (subcategory: any) => {
    const hasProducts = products.some(p => p.subcategory_id === subcategory.id);
    if (hasProducts) {
      showNotification('No se puede eliminar porque tiene productos asignados', 'error');
      return;
    }

    askConfirm(
      '¿Eliminar subcategoría?',
      `¿Seguro que quieres eliminar la subcategoría "${subcategory.name}"?`,
      () => doDeleteSubcategory(subcategory.id)
    );
  };

  const doDeleteSubcategory = async (id: string) => {
    try {
      await api.del('/admin/catalog', { type: 'subcategory', id });
      showNotification('Subcategoría eliminada con éxito', 'success');
      fetchData();
    } catch {
      showNotification('Error al eliminar la subcategoría', 'error');
    }
  };

  const moveProduct = async (siblingList: any[], index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= siblingList.length) return;

    const reordered = [...siblingList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    const updates = reordered.map((prod, i) => ({ id: prod.id, sort_order: i }));

    setProducts(prev => {
      const map = new Map(updates.map(u => [u.id, u.sort_order]));
      return prev.map(p => (map.has(p.id) ? { ...p, sort_order: map.get(p.id) } : p));
    });

    try {
      await Promise.all(
        updates.map(u => api.put('/admin/catalog', { type: 'product', id: u.id, sort_order: u.sort_order }))
      );
      showNotification('Orden de productos actualizado', 'success');
    } catch {
      showNotification('Error al reordenar productos', 'error');
      fetchData();
    }
  };

  const renderProductCard = (product: any, subcategoryObj: any, productIndex?: number, siblingList?: any[]) => {
    const productImg = getProductImageUrl(product);
    const isBebidasOrSub = product.category_id && categories.find(c => c.id === product.category_id && c.name?.toUpperCase().includes('BEBIDA'));

    const tagBadge = product.badge
      || product.customization_schema?.badge
      || (typeof isBebidasOrSub === 'object' && isBebidasOrSub?.name ? isBebidasOrSub.name : null)
      || subcategoryObj?.name
      || product.name;

    return (
      <div 
        key={product.id} 
        className={`bg-white border ${
          product.is_available 
            ? 'border-zinc-200 hover:border-amber-400 hover:shadow-md' 
            : 'border-zinc-200 bg-zinc-50/80 opacity-70'
        } rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all relative overflow-hidden shadow-xs`}
      >
        {/* Cabecera de la tarjeta: Nombre, Badges y Switch */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-zinc-900 text-sm leading-snug break-words">
                {tDynamic(product.name)}
              </h4>
              {productImg ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Foto asignada"></span>
              ) : product.subcategory_id ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200 shrink-0">Opción</span>
              ) : null}
            </div>

            {/* Badges / Tags & Precio */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {tagBadge && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-md uppercase tracking-wider border border-amber-200 shrink-0">
                  {tagBadge}
                </span>
              )}
              <span className="text-amber-600 font-extrabold text-sm whitespace-nowrap">
                {product.price.toFixed(2)}&nbsp;€
              </span>
            </div>
          </div>

          {/* Toggle Switch de Disponibilidad */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button 
              onClick={() => toggleProductActive(product.id, product.is_available)}
              className={`w-10 h-6 rounded-full relative transition-colors focus:outline-none ${product.is_available ? 'bg-amber-500' : 'bg-zinc-300'}`}
              title={product.is_available ? 'Desactivar producto (Agotado)' : 'Activar producto'}
            >
              <div className={`absolute top-[3px] w-4.5 h-4.5 rounded-full bg-white transition-all shadow-xs ${product.is_available ? 'left-[20px]' : 'left-[3px]'}`}></div>
            </button>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${product.is_available ? 'text-amber-700' : 'text-zinc-400'}`}>
              {product.is_available ? 'Activo' : 'Agotado'}
            </span>
          </div>
        </div>

        {/* Thumbnail Preview si tiene foto asignada */}
        {productImg && (
          <div className="w-full h-24 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
            <img src={productImg} alt={product.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Descripción */}
        {product.description ? (
          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
            {tDynamic(product.description)}
          </p>
        ) : (
          <p className="text-[11px] text-zinc-400 italic">Sin descripción</p>
        )}

        {/* Barra de Acciones Inferior */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 mt-auto">
          {siblingList && productIndex !== undefined && siblingList.length > 1 ? (
            <div className="flex gap-0.5 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                onClick={() => moveProduct(siblingList, productIndex, -1)}
                disabled={productIndex === 0}
                title="Subir"
                className="p-1.5 rounded bg-white hover:bg-zinc-50 text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
              </button>
              <button
                onClick={() => moveProduct(siblingList, productIndex, 1)}
                disabled={productIndex === siblingList.length - 1}
                title="Bajar"
                className="p-1.5 rounded bg-white hover:bg-zinc-50 text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
          ) : <div />}

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setProductModal({ isOpen: true, data: product })}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center gap-1 transition-colors"
              title={t('edit_product')}
            >
              <svg className="w-3.5 h-3.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              <span>Editar</span>
            </button>
            <button 
              onClick={() => deleteProduct(product)}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
              title={t('delete_product')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-3.5 sm:p-6 overflow-y-auto relative no-scrollbar bg-slate-50 font-sans text-zinc-900">
      {notification && (
        <div className={`fixed top-4 right-4 z-[3000] max-w-sm p-4 rounded-xl shadow-lg border text-xs font-bold leading-relaxed ${
          notification.type === 'success' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-rose-50 border-rose-300 text-rose-800'
        } animate-fade-in`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-zinc-900 tracking-wide">
            Carta & Catálogo
          </h2>
          <p className="text-zinc-500 text-xs mt-0.5">Gestión de categorías, recetas, bebidas y upsells del local.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-zinc-100 rounded-xl p-1 border border-zinc-200 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'catalog' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Carta
          </button>
          <button 
            onClick={() => setActiveTab('upsells')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'upsells' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Sugerencias
          </button>
        </div>
      </div>

      {activeTab === 'upsells' ? (
        <AdminUpsells />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 mb-6">
            <button 
              onClick={() => setCategoryModal({ isOpen: true })}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs text-center"
            >
              + Nueva Categoría
            </button>
            <button 
              onClick={() => setProductModal({ isOpen: true })}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm text-center"
            >
              + Nuevo Producto
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6 pb-10">
              {categories.map((category, categoryIndex) => {
                const categoryProducts = products
                  .filter(p => p.category_id === category.id)
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                const categorySubcats = subcategories.filter(s => s.category_id === category.id);

                return (
                  <div key={category.id} className="bg-white border border-zinc-200 rounded-3xl p-4 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-5 border-b border-zinc-100 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-display font-black text-zinc-900 uppercase">
                            {tDynamic(category.name)}
                          </h3>
                          {categorySubcats.length > 0 && (
                            <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-full whitespace-nowrap">
                              {categorySubcats.length} subcategorías
                            </span>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{tDynamic(category.description)}</p>
                        )}
                      </div>

                      {/* Barra de Acciones de la Categoría */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 flex-wrap">
                        <div className="flex gap-0.5 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 shrink-0">
                          <button
                            onClick={() => moveCategory(categoryIndex, -1)}
                            disabled={categoryIndex === 0}
                            title="Subir orden"
                            className="p-1.5 sm:p-1 rounded bg-white hover:bg-zinc-50 text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                          </button>
                          <button
                            onClick={() => moveCategory(categoryIndex, 1)}
                            disabled={categoryIndex === categories.length - 1}
                            title="Bajar orden"
                            className="p-1.5 sm:p-1 rounded bg-white hover:bg-zinc-50 text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                          </button>
                        </div>

                        <button
                          onClick={() => setSubcategoryModal({ isOpen: true, categoryId: category.id })}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs uppercase transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                          title="Añadir Subcategoría"
                        >
                          <span>+ Subcategoría</span>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button 
                            onClick={() => setCategoryModal({ isOpen: true, data: category })}
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                            title={t('edit_category')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button 
                            onClick={() => deleteCategory(category.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                            title={t('delete_category')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {categorySubcats.length > 0 ? (
                      <div className="space-y-4 mt-3">
                        {categorySubcats.map(sub => {
                          const subProducts = categoryProducts
                            .filter(p => p.subcategory_id === sub.id)
                            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                          return (
                            <div key={sub.id} className="bg-zinc-50/70 rounded-2xl p-3.5 sm:p-4 border border-zinc-200">
                              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-amber-800 uppercase tracking-wider text-xs">
                                    {sub.name}
                                  </h4>
                                  {sub.description && <p className="text-[11px] text-zinc-500 leading-relaxed">{sub.description}</p>}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button 
                                    onClick={() => setSubcategoryModal({ isOpen: true, data: sub, categoryId: category.id })}
                                    className="p-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-lg transition-colors shadow-2xs"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                  </button>
                                  <button 
                                    onClick={() => deleteSubcategory(sub)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {subProducts.map((product, pIdx) => renderProductCard(product, sub, pIdx, subProducts))}
                                {subProducts.length === 0 && (
                                  <div className="col-span-full py-4 text-center border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs">
                                    No hay productos en esta subcategoría.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Productos raíz */}
                        {(() => {
                          const rootProducts = categoryProducts
                            .filter(p => !p.subcategory_id)
                            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                          if (rootProducts.length === 0) return null;
                          return (
                            <div className="mt-4 pt-3 border-t border-zinc-200">
                              <h4 className="font-bold text-zinc-500 uppercase tracking-wider text-xs mb-3">Otros Productos de la Categoría</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {rootProducts.map((product, pIdx) => renderProductCard(product, null, pIdx, rootProducts))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
                        {categoryProducts.map((product, pIdx, arr) => renderProductCard(product, null, pIdx, arr))}
                        
                        {categoryProducts.length === 0 && (
                          <div className="col-span-full py-6 text-center border border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-xs">
                            No hay productos configurados en esta categoría.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {categoryModal.isOpen && (
        <AdminCategoryForm
          category={categoryModal.data}
          onClose={() => setCategoryModal({ isOpen: false })}
          onSuccess={() => {
            setCategoryModal({ isOpen: false });
            fetchData();
            showNotification(t('category_saved_success'), 'success');
          }}
        />
      )}

      {subcategoryModal.isOpen && (
        <AdminSubcategoryForm
          subcategory={subcategoryModal.data}
          categoryId={subcategoryModal.categoryId!}
          onClose={() => setSubcategoryModal({ isOpen: false })}
          onSuccess={() => {
            setSubcategoryModal({ isOpen: false });
            fetchData();
            showNotification('Subcategoría guardada con éxito', 'success');
          }}
        />
      )}

      {productModal.isOpen && (
        <AdminProductForm
          product={productModal.data}
          categories={categories}
          subcategories={subcategories}
          onClose={() => setProductModal({ isOpen: false })}
          onSuccess={() => {
            setProductModal({ isOpen: false });
            fetchData();
            showNotification(t('product_saved_success'), 'success');
          }}
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
