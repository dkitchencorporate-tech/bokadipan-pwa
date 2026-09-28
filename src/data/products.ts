import { BRAND_CONFIG } from '../config/brandConfig';

export interface Category {
    id: string;
    name: string;
    name_en?: string;
    subtitle: string | null;
    desc: string;
}

export interface Product {
    id: number | string;
    category?: string;
    category_id?: string;
    name: string;
    name_en?: string;
    desc?: string;
    description?: string;
    description_en?: string;
    price: number;
    badge?: string;
    badge_en?: string;
    img?: string;
    img_url?: string;
    image_url?: string | null;
    subcategory?: string;
    subcategory_id?: string | null;
    isGroup?: boolean;
    subProducts?: any[];
    is_available?: boolean;
    customization_schema?: any;
    sort_order?: number;
}

export const LOCAL_IMAGE_MAP: Record<string, string> = {
    'Bokadi Serrano': '/assets/products/bokadi_serrano.jpg',
    'Boka - Mar': '/assets/products/boka_mar.jpg',
    'Boka - Atún': '/assets/products/boka_atun.jpg',
    'Bokadi Bacon': '/assets/products/bokadi_bacon.jpg',
    'Bokadi Lomo': '/assets/products/bokadi_lomo.jpg',
    'Bokadi Pollo': '/assets/products/bokadi_pollo.jpg',
    'Bokadi Burger': '/assets/products/bokadi_burger.jpg',
    'Mousse de Chocolate y Fresas con Nata': '/assets/products/mousse_artesanal.jpg',
    'Mousse de Vainilla y Chocolate con Nata': '/assets/products/mousse_artesanal.jpg',
    'Mousse de Fresa y Frutos del Bosque con Nata': '/assets/products/mousse_artesanal.jpg',
    'Bionade Limón (Bio)': '/assets/products/bionade_eco_drinks.jpg',
    'Bionade Orange (Bio)': '/assets/products/bionade_eco_drinks.jpg',
    'Bionade Bergamot / Lima (Bio)': '/assets/products/bionade_eco_drinks.jpg',
    'Bionade Ginger / Orange (Bio)': '/assets/products/bionade_eco_drinks.jpg',
    'Bionade Edelberry / Saúco (Bio)': '/assets/products/bionade_eco_drinks.jpg',
    'Coca-Cola': '/assets/products/bokadi_serrano.jpg',
    'Fanta Naranja': '/assets/products/bokadi_pollo.jpg',
    'Sprite': '/assets/products/boka_mar.jpg',
    'Mahou Clásica': '/assets/products/bokadi_lomo.jpg',
    'Mahou Six-Pack (6 x 33cl)': '/assets/products/bokadi_lomo.jpg',
    'Heineken': '/assets/products/boka_atun.jpg',
    'Paulaner / Franziskaner Trigo': '/assets/products/bokadi_serrano.jpg'
};

export function getProductImageUrl(product?: { name?: string; image_url?: string | null; img_url?: string | null; img?: string | null } | null): string {
    if (!product) return '/assets/products/bokadi_serrano.jpg';
    if (product.name && LOCAL_IMAGE_MAP[product.name]) return LOCAL_IMAGE_MAP[product.name];
    if (product.image_url) return product.image_url;
    if (product.img_url) return product.img_url;
    if (product.img) return product.img;
    return '/assets/products/bokadi_serrano.jpg';
}

export interface UpsellItem {
    id: string;
    name: string;
    name_en?: string;
    desc: string;
    description_en?: string;
    price: number;
}

export interface UpsellCategory {
    category: string;
    items: UpsellItem[];
}

// Opciones estándar para el modal de extras (si la BD no provee opciones específicas)
export const DEFAULT_EXTRA_TOPPINGS: string[] = [
    'Queso Fundido', 'Bacon Crujiente', 'Cebolla Crujiente',
    'Jalapeños', 'Guacamole', 'Salsa BBQ', 'Salsa Especial de la Casa'
];
