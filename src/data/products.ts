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

export const LOCAL_IMAGE_MAP: Record<string, string> = {};

export function getProductImageUrl(product?: { name?: string; image_url?: string | null; img_url?: string | null; img?: string | null } | null): string {
    if (!product) return BRAND_CONFIG.assets.placeholderProductUrl || '/assets/placeholder-food.svg';
    if (product.image_url) return product.image_url;
    if (product.img_url) return product.img_url;
    if (product.img) return product.img;
    if (product.name && LOCAL_IMAGE_MAP[product.name]) return LOCAL_IMAGE_MAP[product.name];
    return BRAND_CONFIG.assets.placeholderProductUrl || '/assets/placeholder-food.svg';
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
