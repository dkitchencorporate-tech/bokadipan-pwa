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
  // 1. Identidad de Marca BOKADIPAN
  name: "BOKADIPAN",
  shortName: "Bokadipan",
  legalName: "DKITCHEN CORPORATE SL",
  slogan: "Bocadillos de Pan Rústico al Horno de Piedra con AOVE",
  cif: "B-28108000",

  // 2. Canales de Contacto y Cobertura Alcobendas / Madrid
  phone: "+34 685 57 09 83",
  email: "dkitchencorporate@gmail.com",
  address: "Calle La Granja 1 - Alcobendas",
  city: "Madrid (CP 28108), España",
  postalCodesAllowed: ["28108", "28100", "28050", "28049", "28033", "28034"],

  // 3. Sistema de Diseño Tokenizado (Mediterráneo Orgánico & Pan Rústico)
  theme: {
    primary: "#4D7C0F",        // Verde Oliva Intenso (AOVE & Frescura)
    primaryHover: "#3F6212",   // Verde Oliva Oscuro
    primaryLight: "#ECFCCB",   // Fondo Verde Oliva Suave
    accent: "#D97706",         // Dorado Ámbar (Pan Crujiente Horno de Piedra)
    accentHover: "#B45309",    // Ámbar Oscuro
    surface: "#FDFBF7",        // Fondo Marfil Cálido Rústico
    card: "#FFFFFF",           // Fondo de Tarjetas Blanco Puro
    cardHover: "#FEFCE8",      // Hover Tarjetas Cálido
    ink: "#1E293B",            // Texto Principal Grafito Oscuro (Máximo Contraste)
    inkSoft: "#64748B",        // Texto Secundario
    border: "#E2E8F0",         // Bordes
    gradientClass: "from-lime-900 via-stone-900 to-amber-950",
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
    title: "BOKADIPAN",
    subtitle: "Horno de piedra, pan rústico y AOVE...",
    durationMs: 1200,
  },

  // 6. Club de Fidelización
  loyalty: {
    enabled: true,
    clubName: "Club BOKADI VIP",
    badgeText: "🥖 CLUB BOKADI",
    heroTitle: "ACUMULA PUNTOS EN CADA BOKADI",
    heroSubtitle: "¡Y DISFRUTA DE RECOMPENSAS EXCLUSIVAS!",
    heroDescription: "Regístrate gratis, acumula puntos con cada bocadillo o menú y canjea postres y tapas gratis.",
    pointsPerEuro: 4,
    rewardThresholdPoints: 25,
    rewardDescription: "Tu mousse o aperitivo favorito gratis.",
  },

  // 7. Parámetros Operativos y Financieros
  orderDefaults: {
    currency: "EUR",
    currencySymbol: "€",
    minOrderDelivery: 10.00,
    deliveryFee: 2.50,
    freeDeliveryThreshold: 22.00,
    estimatedDeliveryMinutes: "25-40 min",
    estimatedPickupMinutes: "15-20 min",
    upsellNotice: "¡Añade un postre artesano y consigue ENVÍO GRATIS!",
  },

  // 8. Enlaces de Redes y Reputación
  social: {
    instagram: "https://instagram.com/dkitchencorporate",
    tiktok: "https://tiktok.com/@dkitchencorporate",
    googleReviewUrl: "https://g.page/r/dkitchen-reviews",
    whatsapp: "+34685570983",
  },
};
