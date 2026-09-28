import { api } from './apiClient';
import { BOKADIPAN_CATEGORIES, BOKADIPAN_SUBCATEGORIES, BOKADIPAN_PRODUCTS } from '../data/mockCatalog';

// Precarga del catálogo (categorías, subcategorías, productos, ajustes de
// tienda y horarios) para que arranque EN PARALELO con el preloader/splash.
type CatalogData = {
  categories: any[];
  subcategories: any[];
  products: any[];
  settings: any;
  hours: any[];
};

let cachedData: CatalogData | null = null;
let inflightPromise: Promise<CatalogData> | null = null;

export function preloadCatalogData(): Promise<CatalogData> {
  if (cachedData) return Promise.resolve(cachedData);
  if (inflightPromise) return inflightPromise;

  inflightPromise = api
    .get('/catalog')
    .then((data) => {
      const hasCategories = Array.isArray(data?.categories) && data.categories.length > 0;
      const hasProducts = Array.isArray(data?.products) && data.products.length > 0;
      const hasSubcategories = Array.isArray(data?.subcategories) && data.subcategories.length > 0;

      cachedData = {
        categories: hasCategories ? data.categories : BOKADIPAN_CATEGORIES,
        subcategories: hasSubcategories ? data.subcategories : BOKADIPAN_SUBCATEGORIES,
        products: hasProducts ? data.products : BOKADIPAN_PRODUCTS,
        settings: data?.settings || { is_open: true, delivery_enabled: true },
        hours: data?.hours || []
      };
      return cachedData;
    })
    .catch((_err) => {
      // Fallback a catálogo semilla de BOKADIPAN si la BD aún no está disponible
      cachedData = {
        categories: BOKADIPAN_CATEGORIES,
        subcategories: BOKADIPAN_SUBCATEGORIES,
        products: BOKADIPAN_PRODUCTS,
        settings: { is_open: true, delivery_enabled: true },
        hours: []
      };
      return cachedData;
    })
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
}

export function getCachedCatalogData(): CatalogData | null {
  return cachedData;
}

// Fuerza un refetch en la próxima llamada — útil tras una acción de admin
// (crear/editar/borrar producto) o en un sondeo periódico, ya que este motor
// no tiene Supabase Realtime para invalidar la caché automáticamente.
export function invalidateCatalogCache(): void {
  cachedData = null;
  inflightPromise = null;
}
