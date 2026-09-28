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
    // Bocadillos Rústicos Gourmet (Fotos Macro de Autor)
    'Bokadi Serrano': '/assets/products/bokadi_serrano.jpg',
    'Boka - Mar': '/assets/products/boka_mar.jpg',
    'Boka - Atún': '/assets/products/boka_atun.jpg',
    'Boka - Atún Mediterráneo': '/assets/products/boka_atun.jpg',
    'Bokadi Bacon': '/assets/products/bokadi_bacon.jpg',
    'Bokadi Bacon & Queso': '/assets/products/bokadi_bacon.jpg',
    'Bokadi Lomo': '/assets/products/bokadi_lomo.jpg',
    'Bokadi Pollo': '/assets/products/bokadi_pollo.jpg',
    'Bokadi Pollo Crispy': '/assets/products/bokadi_pollo.jpg',
    'Bokadi Burger': '/assets/products/bokadi_burger.jpg',
    'Bokadi Burger Steak': '/assets/products/bokadi_burger.jpg',

    // Complementos & Picoteo Artesanal
    'Ración de Patatas Fritas Rústicas': '/assets/products/patatas-rusticas.jpg',
    'Ración de Patatas Fritas': '/assets/products/patatas-rusticas.jpg',
    'Patatas Fritas Rústicas': '/assets/products/patatas-rusticas.jpg',
    'Patatas Fritas de Bolsa Artesanas': '/assets/products/patatas-bolsa.jpg',
    'Patatas de Bolsa': '/assets/products/patatas-bolsa.jpg',
    'Patatas Fritas de Bolsa': '/assets/products/patatas-bolsa.jpg',
    'Ración de Aceitunas Aliñadas': '/assets/products/aceitunas-alinadas.jpg',
    'Ración de Aceitunas': '/assets/products/aceitunas-alinadas.jpg',
    'Aceitunas Aliñadas': '/assets/products/aceitunas-alinadas.jpg',
    'Ración de Encurtidos de la Huerta': '/assets/products/encurtidos-artesanos.jpg',
    'Ración de Encurtidos': '/assets/products/encurtidos-artesanos.jpg',
    'Encurtidos de la Huerta': '/assets/products/encurtidos-artesanos.jpg',

    // Postres Artesanales en Tarrina Delivery
    'Tiramisú Artesano en Tarrina': '/assets/products/tiramisu-artesano.jpg',
    'Tiramisú Artesano': '/assets/products/tiramisu-artesano.jpg',
    'Tiramisú': '/assets/products/tiramisu-artesano.jpg',
    'Mousse de Chocolate Belga': '/assets/products/mousse_artesanal.jpg',
    'Mousse de Chocolate y Fresas con Nata': '/assets/products/mousse_artesanal.jpg',
    'Mousse de Chocolate': '/assets/products/mousse_artesanal.jpg',
    'Cheesecake de Frutos Rojos': '/assets/products/cheesecake.jpg',
    'Cheesecake': '/assets/products/cheesecake.jpg',

    // Subcategorías de Bebidas Agrupadas (1 sola tarjeta con imagen que abre el modal)
    'Refrescos Clásicos (33cl)': '/assets/products/refrescos-clasicos.jpg',
    'Refrescos Clásicos': '/assets/products/refrescos-clasicos.jpg',
    'REFRESCOS': '/assets/products/refrescos-clasicos.jpg',
    'Refrescos & Aguas': '/assets/products/refrescos-clasicos.jpg',
    'Cervezas Premium (33cl)': '/assets/products/cervezas-premium.jpg',
    'Cervezas Premium': '/assets/products/cervezas-premium.jpg',
    'CERVEZAS': '/assets/products/cervezas-premium.jpg',
    'Cervezas Frías': '/assets/products/cervezas-premium.jpg',
    'Agua Mineral (50cl)': '/assets/products/agua-mineral.jpg',
    'Agua Mineral': '/assets/products/agua-mineral.jpg',
    'AGUAS': '/assets/products/agua-mineral.jpg',

    // Bebidas individuales (por si se renderizan directamente)
    'Coca-Cola Original': '/assets/products/refrescos-clasicos.jpg',
    'Coca-Cola Zero': '/assets/products/refrescos-clasicos.jpg',
    'Coca-Cola': '/assets/products/refrescos-clasicos.jpg',
    'Fanta Naranja': '/assets/products/refrescos-clasicos.jpg',
    'Sprite': '/assets/products/refrescos-clasicos.jpg',
    'Agua Mineral Natural': '/assets/products/agua-mineral.jpg',
    'Mahou Clásica (33cl)': '/assets/products/cervezas-premium.jpg',
    'Mahou Clásica': '/assets/products/cervezas-premium.jpg',
    'Mahou 5 Estrellas (33cl)': '/assets/products/cervezas-premium.jpg',
    'Mahou 5 Estrellas': '/assets/products/cervezas-premium.jpg',
    'Mahou Six-Pack (6 x 33cl)': '/assets/products/cervezas-premium.jpg',
    'Pack Ahorro 6 Cervezas (6 x 33cl)': '/assets/products/cervezas-premium.jpg',
    'Heineken (33cl)': '/assets/products/cervezas-premium.jpg',
    'Heineken': '/assets/products/cervezas-premium.jpg',
    'Paulaner / Franziskaner Trigo (50cl)': '/assets/products/cervezas-premium.jpg',
    'Paulaner / Franziskaner Trigo': '/assets/products/cervezas-premium.jpg'
};

export function getProductImageUrl(product?: { name?: string; image_url?: string | null; img_url?: string | null; img?: string | null } | null): string {
    if (!product) return BRAND_CONFIG.assets.placeholderProductUrl || '/assets/products/bokadi_serrano.jpg';
    if (product.name && LOCAL_IMAGE_MAP[product.name]) return LOCAL_IMAGE_MAP[product.name];
    if (product.image_url) return product.image_url;
    if (product.img_url) return product.img_url;
    if (product.img) return product.img;
    return BRAND_CONFIG.assets.placeholderProductUrl || '/assets/products/bokadi_serrano.jpg';
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
