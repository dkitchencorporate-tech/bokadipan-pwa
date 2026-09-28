import { api } from './apiClient';

// Precarga del catálogo (categorías, subcategorías, productos, ajustes de
// tienda y horarios) para que arranque EN PARALELO con el preloader/splash,
// no después de que termine. App.tsx llama a preloadCatalogData() en cuanto
// monta; Catalog.tsx usa el resultado ya listo (o la misma promesa en curso)
// en vez de repetir las consultas desde cero.
//
// GET /api/catalog trae todo en una sola llamada (antes eran 3 consultas
// paralelas directas a Supabase) y ya tiene cache de 15s en el propio
// endpoint, así que preloadCatalogData() sigue siendo barato de invalidar.
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
      cachedData = {
        categories: data?.categories || [],
        subcategories: data?.subcategories || [],
        products: data?.products || [],
        settings: data?.settings || null,
        hours: data?.hours || []
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
