/**
 * DKITCHEN WHITE-LABEL ENGINE v3.0
 * Configuración Maestra de Marca e Identidad 100% Desacoplada y Tokenizada
 * 
 * Este archivo gobierna todo el branding, textos, colores, iconos, preloader,
 * reglas de fidelización y parámetros operativos de la PWA.
 */

export interface BrandTheme {
  primary: string;           // Color principal (botones, activos) ej: #F59E0B
  primaryHover: string;      // Hover del color principal ej: #D97706
  primaryLight: string;      // Fondos suaves de acento ej: #FEF3C7 o rgba
  accent: string;            // Color secundario/alerta ej: #DC2626
  accentHover: string;       // Hover del color de acento ej: #B91C1C
  surface: string;           // Fondo de superficie ej: #FAFAFA
  card: string;              // Fondo de tarjetas ej: #FFFFFF
  cardHover: string;         // Hover de tarjetas ej: #FFF7ED
  ink: string;               // Texto principal ej: #18181B
  inkSoft: string;           // Texto secundario ej: #6B7280
  border: string;            // Bordes ej: #E5E7EB
  gradientClass: string;     // Clases tailwind para gradientes
}

export interface BrandAssets {
  logoUrl: string;                  // Logo principal de cabecera
  logoDarkUrl?: string;             // Logo sobre fondo oscuro
  faviconUrl: string;               // Favicon
  heroBannerUrl?: string;           // Banner de cabecera o catálogo
  placeholderProductUrl: string;    // Placeholder neutro cuando no hay foto
}

export interface BrandSplash {
  title: string;                    // Título en la pantalla de carga
  subtitle: string;                 // Subtítulo en la pantalla de carga
  durationMs: number;               // Tiempo de splash en ms (ej: 1400)
}

export interface BrandLoyaltyClub {
  enabled: boolean;
  clubName: string;                 // ej: "Club Gourmet VIP"
  badgeText: string;                // ej: "🎁 CLUB VIP"
  heroTitle: string;                // ej: "GANA PUNTOS EN CADA PEDIDO"
  heroSubtitle: string;             // ej: "¡Y CANJEA TU PREMIO GRATIS!"
  heroDescription: string;          // ej: "Regístrate gratis y acumula puntos con cada compra."
  pointsPerEuro: number;            // ej: 4
  rewardThresholdPoints: number;    // ej: 25
  rewardDescription: string;        // ej: "Tu ración favorita sale gratis."
}

export interface BrandOrderDefaults {
  currency: string;
  currencySymbol: string;
  minOrderDelivery: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryMinutes: string;
  estimatedPickupMinutes: string;
  upsellNotice?: string;
}

export interface BrandSocial {
  instagram?: string;
  tiktok?: string;
  googleReviewUrl?: string;
  whatsapp?: string;
}

export interface BrandConfig {
  // Identidad
  name: string;
  shortName: string;
  legalName: string;
  slogan: string;
  cif: string;

  // Contacto & Cobertura
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCodesAllowed: string[];

  // Tokenización y Sistema Visual
  theme: BrandTheme;
  assets: BrandAssets;
  splash: BrandSplash;
  loyalty: BrandLoyaltyClub;
  orderDefaults: BrandOrderDefaults;
  social: BrandSocial;
}

export const BRAND_CONFIG: BrandConfig = {
  // 1. Identidad de Marca Neutra de Fábrica
  name: "D-Kitchen Gourmet",
  shortName: "D-Kitchen",
  legalName: "D-Kitchen Corporate Tech S.L.",
  slogan: "Gastronomía Digital & Delivery",
  cif: "B-00000000",

  // 2. Canales de Contacto y Cobertura
  phone: "+34 600 000 000",
  email: "pedidos@dkitchencorporate.es",
  address: "Calle Principal 1",
  city: "Madrid, España",
  postalCodesAllowed: ["28001", "28002", "28004", "28013", "28028"],

  // 3. Sistema de Diseño Tokenizado (Paleta Neutra Matriz / Monocromática)
  theme: {
    primary: "#18181B",
    primaryHover: "#27272A",
    primaryLight: "#F4F4F5",
    accent: "#52525B",
    accentHover: "#3F3F46",
    surface: "#FAFAFA",
    card: "#FFFFFF",
    cardHover: "#F4F4F5",
    ink: "#18181B",
    inkSoft: "#71717A",
    border: "#E4E4E7",
    gradientClass: "from-zinc-900 to-zinc-800",
  },

  // 4. Recursos Multimedia
  assets: {
    logoUrl: "/assets/brand/logo.svg",
    logoDarkUrl: "/assets/brand/logo.svg",
    faviconUrl: "/favicon.ico",
    heroBannerUrl: "",
    placeholderProductUrl: "/assets/placeholder-food.svg",
  },

  // 5. Preloader / Splash Screen
  splash: {
    title: "D-Kitchen Gourmet",
    subtitle: "Cargando carta y experiencia digital...",
    durationMs: 1400,
  },

  // 6. Club de Fidelización
  loyalty: {
    enabled: true,
    clubName: "Club Gourmet VIP",
    badgeText: "🎁 CLUB VIP",
    heroTitle: "GANA PUNTOS EN CADA PEDIDO",
    heroSubtitle: "¡Y CANJEA TU PREMIO GRATIS!",
    heroDescription: "Regístrate gratis, acumula puntos en cada pedido y canjea platos exclusivos de la carta.",
    pointsPerEuro: 4,
    rewardThresholdPoints: 25,
    rewardDescription: "Tu plato favorito sale gratis.",
  },

  // 7. Parámetros Operativos y Financieros
  orderDefaults: {
    currency: "EUR",
    currencySymbol: "€",
    minOrderDelivery: 12.00,
    deliveryFee: 2.50,
    freeDeliveryThreshold: 25.00,
    estimatedDeliveryMinutes: "30-45 min",
    estimatedPickupMinutes: "15-20 min",
    upsellNotice: "¡Añade un postre y consigue ENVÍO GRATIS!",
  },

  // 8. Enlaces de Redes y Reputación
  social: {
    instagram: "https://instagram.com/dkitchencorporate",
    tiktok: "https://tiktok.com/@dkitchencorporate",
    googleReviewUrl: "https://g.page/r/dkitchen-reviews",
    whatsapp: "+34600000000",
  },
};
