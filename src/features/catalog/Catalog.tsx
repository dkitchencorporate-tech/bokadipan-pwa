import Header from '../../components/Header';
import Hero from '../../components/Hero';
import ProductCard from '../../components/ProductCard';
import IngredientsModal from '../../components/IngredientsModal';
import { useState, useEffect } from 'react';
import { DEFAULT_EXTRA_TOPPINGS, Product, getProductImageUrl } from '../../data/products';
import { api } from '../../lib/apiClient';
import NotificationManager from '../../components/NotificationManager';
import Footer from '../../components/Footer';
import { useI18nStore } from '../../store/i18nStore';
import { generateSafeUUID } from '../../utils/uuid';
import { preloadCatalogData, getCachedCatalogData, invalidateCatalogCache } from '../../lib/catalogPreload';

// Sesión de tráfico: un id por pestaña/navegador, no se repite en recargas
const getVisitSessionId = () => {
  let id = sessionStorage.getItem('app_visit_session');
  if (!id) {
    id = generateSafeUUID();
    sessionStorage.setItem('app_visit_session', id);
  }
  return id;
};

// El backend propio (POST /api/track-visit) solo registra el `sessionId` —
// no hay columnas `event_type`/`label`/`device_type` en site_visits (esa
// tabla existe solo para el rate-limiting anti-abuso, no para analítica
// segmentada). Se mantiene la misma firma de función para no tocar todos
// los sitios que la llaman, pero el detalle de qué evento fue se pierde
// aquí — si se necesita analítica real por tipo de evento en el futuro,
// hace falta añadir esas columnas a site_visits primero.
const trackSiteEvent = async (eventType: 'page_view' | 'category_click', label?: string) => {
  try {
    await api.post('/track-visit', {
      sessionId: getVisitSessionId(),
      eventType,
      label: label || null,
      deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    });
  } catch (e) {
    // Silencioso: el tracking nunca debe romper la experiencia de compra
  }
};

export default function Catalog() {
  const { t, tDynamic, lang } = useI18nStore() as any;
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [ingredientsProduct, setIngredientsProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaturationMode, setIsSaturationMode] = useState(false);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  useEffect(() => {
    const buildProducts = (prodData: any[], subcatData: any[]) => {
      if (!prodData || !subcatData) return prodData || [];

      const groupedSubcategories: any[] = [];

      subcatData.forEach(sub => {
        const subProducts = prodData.filter(p => p.subcategory_id === sub.id);
        if (subProducts.length > 0) {
          const minPrice = Math.min(...subProducts.map(p => p.price));
          groupedSubcategories.push({
            id: `subcat-${sub.id}`,
            category_id: sub.category_id,
            name: sub.name,
            name_en: sub.name_en && sub.name_en !== sub.name ? sub.name_en : tDynamic(sub.name),
            description: sub.description || `Selecciona tus opciones de ${sub.name.toLowerCase()}`,
            description_en: sub.description_en || `Select your ${(sub.name_en && sub.name_en !== sub.name ? sub.name_en : tDynamic(sub.name)).toLowerCase()} options`,
            price: minPrice,
            image_url: sub.image_url || sub.img_url || LOCAL_IMAGE_MAP[sub.name] || (subProducts[0] ? getProductImageUrl(subProducts[0]) : undefined),
            img_url: sub.image_url || sub.img_url || LOCAL_IMAGE_MAP[sub.name] || (subProducts[0] ? getProductImageUrl(subProducts[0]) : undefined),
            badge: sub.name,
            badge_en: sub.name_en && sub.name_en !== sub.name ? sub.name_en : tDynamic(sub.name),
            isGroup: true,
            sort_order: sub.sort_order ?? 0,
            subProducts: subProducts.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price - b.price),
            is_available: true
          });
        }
      });

      const rootProducts = prodData.filter(p => !p.subcategory_id);
      return [...rootProducts, ...groupedSubcategories].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    };

    const fetchData = async (opts: { showLoading: boolean } = { showLoading: true }) => {
      if (opts.showLoading) setIsLoading(true);
      // Si App.tsx ya lanzó la precarga durante el preloader, esto resuelve al instante
      // (o reutiliza la misma consulta en curso) en vez de repetir la llamada.
      const cached = getCachedCatalogData();
      const data = cached || (await preloadCatalogData());

      if (data.categories) setCategories(data.categories);
      if (data.subcategories) setSubcategories(data.subcategories);
      setProducts(buildProducts(data.products, data.subcategories));
      setIsSaturationMode(!!data.settings?.saturation_mode);
      if (opts.showLoading) setIsLoading(false);
    };
    fetchData();

    // Sin Supabase Realtime en este motor: sondeo periódico para reflejar
    // cambios del admin (kill-switch de productos, modo de alta demanda)
    // sin necesitar que el visitante recargue la página.
    const pollInterval = setInterval(() => {
      invalidateCatalogCache();
      fetchData({ showLoading: false });
    }, 45000);

    return () => clearInterval(pollInterval);
  }, []);

  // Una visita por sesión de navegador, no en cada recarga/renderizado
  useEffect(() => {
    if (!sessionStorage.getItem('app_visit_tracked')) {
      sessionStorage.setItem('app_visit_tracked', '1');
      trackSiteEvent('page_view');
    }
  }, []);

  // Categorías a mostrar
  const displayCategories = ['TODOS', ...categories.map(c => c.name)];

  // Categorías a renderizar en la vista principal
  const categoriesToRender = activeCategory === 'TODOS'
    ? categories
    : categories.filter(c => c.name === activeCategory);

  let isFirst = true;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF]">
        <Header />
        <Hero />
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-50 rounded-[2rem] border border-white/5 overflow-hidden animate-pulse">
                <div className="h-48 sm:h-56 bg-gray-50"></div>
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="h-6 bg-gray-50 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-50 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-50 rounded w-4/5"></div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-6 bg-gray-50 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-50 rounded-xl w-10"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <Hero />
      
      {isSaturationMode && (
        <div className="bg-red-600 text-white font-bold text-center py-2 px-4 animate-pulse uppercase tracking-wider text-sm sticky top-[52px] sm:top-[60px] z-[45]">
          {t('saturation_mode')}
        </div>
      )}

      {/* Category Nav */}
      <div className="sticky top-[68px] sm:top-[76px] z-40 w-full flex flex-col shadow-md transition-all mt-6">
        <nav className="bg-[#FFFFFF]/95 backdrop-blur-xl border-b border-[#E5DCD0] py-4 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-start xl:justify-center gap-2.5 sm:gap-3 text-sm font-display font-black uppercase tracking-wider min-w-max px-2 py-1">
              {displayCategories.map(cat => {
                const isActive = activeCategory === cat;
                
                // Conteo real: los productos se enlazan por category_id (uuid), no por
                // nombre, así que hay que resolver primero el id de la categoría.
                let count = 0;
                if (cat === 'TODOS') {
                  count = products.length;
                } else {
                  const catObj = categories.find(c => c.name === cat);
                  count = products.filter(p => p.category_id === catObj?.id).length;
                }

                return (
                  <button 
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      trackSiteEvent('category_click', cat);
                      window.scrollTo({ top: 480, behavior: 'smooth' });
                    }}
                    className={isActive 
                      ? 'category-pill active px-5 py-2.5 rounded-2xl font-black whitespace-nowrap shrink-0'
                      : 'category-pill px-5 py-2.5 rounded-2xl whitespace-nowrap shrink-0'
                    }
                  >
                    {cat === 'TODOS' ? t('full_menu') : tDynamic(cat)} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
        
        {/* Marquee Ticker */}
        <div className="w-full bg-[#FAF6F0] border-b border-[#E5DCD0] overflow-hidden relative flex items-center py-2 shadow-inner">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#FAF6F0] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FAF6F0] to-transparent z-10 pointer-events-none"></div>
          
          <div className="flex whitespace-nowrap animate-marquee items-center">
              <span className="mx-8 text-[11px] sm:text-sm font-black text-[#1A201A] uppercase tracking-wide flex items-center gap-2 font-display">
                  🥖 {t('vip_ticker_msg')} 🌿
              </span>
              {/* Duplicate for infinite scroll loop */}
              <span className="mx-8 text-[11px] sm:text-sm font-black text-[#1A201A] uppercase tracking-wide flex items-center gap-2 font-display">
                  🥖 {t('vip_ticker_msg')} 🌿
              </span>
          </div>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 25s linear infinite;
          }
        `}</style>
      </div>

      {/* Grid Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-32 min-h-screen space-y-12">
        {categoriesToRender.map(cat => {
          let catProducts = products
            .filter(p => p.category_id === cat.id || p.category === cat.id)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          
          if (catProducts.length === 0 && cat.id !== 'POR INGREDIENTES') return null;

          const renderIngredients = isFirst && (activeCategory === 'TODOS' || (categoriesToRender.length > 0 && activeCategory === categoriesToRender[0].id)) && DEFAULT_EXTRA_TOPPINGS.length > 0;
          isFirst = false;

          return (
            <div key={cat.id} className="w-full">
              
              {/* Tarjeta de Ingredientes (Antes de la primera sección) */}
              {renderIngredients && (
                <div className="mb-10">
                  <div className="relative overflow-hidden rounded-3xl border-2 border-[#DFD3C1] bg-white shadow-md p-6 sm:p-8">
                    {/* Glow decorativo */}
                    <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-[#1B3818]/10 blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 space-y-5">
                      {/* Título sutil */}
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full bg-[#1B3818]"></div>
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[#1B3818] uppercase tracking-widest">{t('our_ingredients_title')}</span>
                          <p className="text-[#141A14] font-display font-black text-base sm:text-lg uppercase tracking-wide leading-none mt-0.5">{t('our_ingredients_subtitle')}</p>
                        </div>
                      </div>

                      {/* Grid de ingredientes */}
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_EXTRA_TOPPINGS.map(ing => (
                          <span key={ing} className="inline-flex items-center gap-1.5 bg-[#F8F4EC] border border-[#DFD3C1] text-[#4F5E4F] text-xs font-bold px-3 py-1.5 rounded-xl hover:border-[#1B3818] hover:text-[#141A14] transition-colors cursor-default">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1B3818] shrink-0"></span>
                            {tDynamic(ing)}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] text-[#4F5E4F] font-medium">
                        {t('ingredients_note')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Encabezado de Categoría */}
              <div className="py-10 my-2 text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E6EFE4] border border-[#1B3818]/20 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B3818]"></span>
                  <span className="text-[#1B3818] font-display font-black text-[11px] uppercase tracking-widest">{catProducts.length} {t('varieties')}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#141A14] uppercase tracking-tight leading-none">
                    {(lang === 'en' && cat.name_en) ? cat.name_en : tDynamic(cat.name)}
                  </h2>
                  {(cat.subtitle || cat.subtitle_en) && (
                    <span className="text-[#C88A35] font-display text-sm font-bold">
                      {(lang === 'en' && cat.subtitle_en) ? cat.subtitle_en : tDynamic(cat.subtitle)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#4F5E4F] max-w-2xl mx-auto font-medium leading-relaxed pt-1">
                  {(lang === 'en' && cat.description_en) ? cat.description_en : tDynamic(cat.description || cat.desc || '')}
                </p>
                <div className="w-16 h-1 bg-[#1B3818] mx-auto mt-4 rounded-full"></div>
              </div>

              {/* Grid de Productos de esta Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {catProducts.map(product => {
                  return <ProductCard key={product.id} product={product} onCustomize={(prod) => setIngredientsProduct(prod as any)} />
                })}
              </div>
            </div>
          );
        })}
      </main>

      <Footer />

      {ingredientsProduct && (
        <IngredientsModal product={ingredientsProduct} onClose={() => setIngredientsProduct(null)} />
      )}
    </>
  );
}
