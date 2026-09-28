-- ==============================================================================
-- 🥖 BOKADIPAN PWA — ESQUEMA RELACIONAL NEON POSTGRESQL v3.1 (ENTERPRISE)
-- D-Kitchen Corporate SL — Despliegue Oficial
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: CATEGORÍAS
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    icon VARCHAR(64) DEFAULT 'Utensils',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA: PRODUCTOS & COMBOS
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(128) UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(10, 2),
    category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_upsell BOOLEAN DEFAULT FALSE,
    allergens TEXT[] DEFAULT '{}',
    stock INT DEFAULT 999,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: CUPONES & PROMOCIONES
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    discount_type VARCHAR(16) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_amount NUMERIC(10, 2) DEFAULT 0,
    max_uses INT DEFAULT 100,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: USUARIOS & CLIENTES VIP (2FA TOTP + EMAIL VERIFICATION)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(32) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'superadmin', 'kitchen')),
    name VARCHAR(128),
    phone VARCHAR(32),
    loyalty_points INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP WITH TIME ZONE,
    totp_secret VARCHAR(64),
    totp_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA: PEDIDOS (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number SERIAL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(128) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    order_type VARCHAR(32) NOT NULL CHECK (order_type IN ('delivery', 'pickup', 'takeaway', 'dine_in', 'kiosk')),
    delivery_address TEXT,
    delivery_postal_code VARCHAR(16),
    delivery_notes TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    loyalty_points_used INT DEFAULT 0,
    loyalty_points_earned INT DEFAULT 0,
    payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('cash', 'pos_delivery', 'sumup', 'card', 'kiosk_tpv')),
    payment_status VARCHAR(32) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    sumup_checkout_id VARCHAR(128),
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled')),
    kiosk_device_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA: LÍNEAS DE PEDIDO (ORDER_ITEMS)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(128) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL,
    selected_options JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABLA: CONFIGURACIÓN GLOBAL & SWITCHES OPERATIVOS
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 🛡️ BLINDAJE ANTI-FRAUDE P0001 (SECURITY DEFINER PL/pgSQL)
-- ==============================================================================

CREATE OR REPLACE FUNCTION process_checkout(
    p_order_id VARCHAR(64),
    p_customer_name VARCHAR(128),
    p_customer_email VARCHAR(255),
    p_customer_phone VARCHAR(32),
    p_order_type VARCHAR(32),
    p_delivery_address TEXT,
    p_delivery_postal_code VARCHAR(16),
    p_delivery_notes TEXT,
    p_payment_method VARCHAR(32),
    p_items JSONB,
    p_loyalty_points_to_use INT DEFAULT 0,
    p_coupon_code VARCHAR(32) DEFAULT NULL,
    p_kiosk_device_id VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_db_price NUMERIC(10, 2);
    v_db_name VARCHAR(128);
    v_calc_subtotal NUMERIC(10, 2) := 0;
    v_calc_total NUMERIC(10, 2) := 0;
    v_delivery_fee NUMERIC(10, 2) := 0;
    v_discount NUMERIC(10, 2) := 0;
    v_points_earned INT := 0;
    v_user_id UUID := NULL;
    v_user_points INT := 0;
    v_user_verified BOOLEAN := FALSE;
BEGIN
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito no puede estar vacio';
    END IF;

    -- Validar usuario si existe
    SELECT id, loyalty_points, is_verified 
    INTO v_user_id, v_user_points, v_user_verified 
    FROM users 
    WHERE LOWER(email) = LOWER(p_customer_email);

    -- Validar canje de puntos VIP (Requiere email verificado)
    IF p_loyalty_points_to_use > 0 THEN
        IF v_user_id IS NULL THEN
            RAISE EXCEPTION 'Debe tener una cuenta registrada para canjear puntos VIP';
        END IF;
        IF NOT v_user_verified THEN
            RAISE EXCEPTION 'Debe verificar su correo electronico para canjear puntos de fidelidad';
        END IF;
        IF v_user_points < p_loyalty_points_to_use THEN
            RAISE EXCEPTION 'Saldo de puntos insuficiente';
        END IF;
        v_discount := v_discount + (p_loyalty_points_to_use * 0.50);
    END IF;

    -- Validar precios unitarios contra base de datos
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id VARCHAR(64),
        quantity INT,
        selected_options JSONB
    )
    LOOP
        SELECT price, name INTO v_db_price, v_db_name
        FROM products
        WHERE id = v_item.product_id AND is_active = TRUE;

        IF v_db_price IS NULL THEN
            RAISE EXCEPTION 'Producto no disponible o invalido: %', v_item.product_id;
        END IF;

        v_calc_subtotal := v_calc_subtotal + (v_db_price * v_item.quantity);
    END LOOP;

    -- Calcular coste de envío (10€ min, 2.50€ delivery, gratis a partir de 22€)
    IF p_order_type = 'delivery' THEN
        IF v_calc_subtotal < 22.00 THEN
            v_delivery_fee := 2.50;
        ELSE
            v_delivery_fee := 0.00;
        END IF;
    ELSE
        v_delivery_fee := 0.00;
    END IF;

    v_calc_total := GREATEST(0.00, v_calc_subtotal + v_delivery_fee - v_discount);
    v_points_earned := FLOOR(v_calc_subtotal * 4);

    -- Insertar pedido
    INSERT INTO orders (
        id, customer_name, customer_email, customer_phone,
        order_type, delivery_address, delivery_postal_code, delivery_notes,
        subtotal, delivery_fee, discount_amount, total_amount,
        loyalty_points_used, loyalty_points_earned, payment_method,
        payment_status, status, kiosk_device_id, user_id
    ) VALUES (
        p_order_id, p_customer_name, p_customer_email, p_customer_phone,
        p_order_type, p_delivery_address, p_delivery_postal_code, p_delivery_notes,
        v_calc_subtotal, v_delivery_fee, v_discount, v_calc_total,
        p_loyalty_points_to_use, v_points_earned, p_payment_method,
        CASE WHEN p_payment_method IN ('cash', 'pos_delivery') THEN 'pending' ELSE 'pending' END,
        'pending', p_kiosk_device_id, v_user_id
    );

    -- Insertar líneas de pedido
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id VARCHAR(64),
        quantity INT,
        selected_options JSONB
    )
    LOOP
        SELECT price, name INTO v_db_price, v_db_name
        FROM products WHERE id = v_item.product_id;

        INSERT INTO order_items (
            order_id, product_id, product_name,
            unit_price, quantity, subtotal, selected_options
        ) VALUES (
            p_order_id, v_item.product_id, v_db_name,
            v_db_price, v_item.quantity, (v_db_price * v_item.quantity),
            COALESCE(v_item.selected_options, '{}'::jsonb)
        );
    END LOOP;

    -- Actualizar puntos si corresponde
    IF v_user_id IS NOT NULL THEN
        UPDATE users 
        SET loyalty_points = loyalty_points - p_loyalty_points_to_use + v_points_earned,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'subtotal', v_calc_subtotal,
        'delivery_fee', v_delivery_fee,
        'discount', v_discount,
        'total', v_calc_total,
        'points_earned', v_points_earned
    );
END;
$$;

-- ==============================================================================
-- 🍃 SEED DATA: CATEGORÍAS & PRODUCTOS BOKADIPAN
-- ==============================================================================

INSERT INTO categories (id, name, description, icon, sort_order, is_active) VALUES
('bocadillos', 'Bocadillos Rústicos AOVE', 'Bocadillos de 20cm en pan artesano de horno de piedra con AOVE. Incluyen tapa de picoteo y bebida.', 'Utensils', 1, true),
('postres', 'Mousses Artesanales', 'Mousses gourmet en vaso con nata montada fresca.', 'Cake', 2, true),
('bebidas-eco', 'Pa la Sed (Ecológicas)', 'Refrescos bio naturales y fermentados Bionade 330ml.', 'Leaf', 3, true),
('bebidas-trad', 'Bebidas Tradicionales', 'Refrescos clásicos fríos en lata 330ml.', 'GlassWater', 4, true),
('cervezas', 'Cervezas & Birras', 'Cervezas nacionales y de importación bien frías.', 'Beer', 5, true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description, 
    sort_order = EXCLUDED.sort_order;

INSERT INTO products (id, name, slug, description, price, category_id, is_active, is_featured, allergens, sort_order) VALUES
('bokadi-serrano', 'Bokadi Serrano', 'bokadi-serrano', 'Bocadillo de pan rústico de 20cm elaborado con AOVE hecho en horno de piedra, restregado con espuma de tomate con sal, orégano y aceite de oliva virgen extra, más 100gr de jamón serrano selecto. Incluye ración de olivas de picoteo y una bebida de su elección.', 9.90, 'bocadillos', true, true, ARRAY['gluten'], 1),
('boka-mar', 'Boka - Mar', 'boka-mar', 'Bocadillo de pan rústico de 20cm elaborado con AOVE hecho en horno de piedra, relleno con calamares a la romana, pimientos verdes salteados en AOVE y sal gorda, más salsa de alioli. Incluye ración de salpicón de pulpo para picoteo y una bebida de su elección.', 11.90, 'bocadillos', true, true, ARRAY['gluten', 'moluscos', 'huevo'], 2),
('boka-atun', 'Boka - Atún', 'boka-atun', 'Bocadillo de pan rústico de 20cm elaborado con AOVE hecho en horno de piedra, relleno con tomates cortados, lechuga y cebolla, atún, jamón york y extra de queso. Incluye ración de patatas chips para picoteo y una bebida de su elección.', 11.50, 'bocadillos', true, false, ARRAY['gluten', 'pescado', 'lacteos'], 3),
('bokadi-bacon', 'Bokadi Bacon', 'bokadi-bacon', 'Bocadillo de pan rústico de 20cm elaborado con AOVE hecho en horno de piedra, relleno con tiras de bacon crujiente y extra queso fundido. Incluye una ración de ensaladilla rusa como acompañante y una bebida de su elección.', 10.90, 'bocadillos', true, false, ARRAY['gluten', 'lacteos', 'huevo'], 4),
('bokadi-lomo', 'Bokadi Lomo', 'bokadi-lomo', 'Bocadillo de pan rústico de 20cm elaborado con AOVE hecho en horno de piedra, relleno con lomo salteado al grill, pimientos de padrón verdes y AOVE. Incluye porción de queso madurado de picoteo y una bebida de su elección.', 11.50, 'bocadillos', true, true, ARRAY['gluten', 'lacteos'], 5),
('bokadi-pollo', 'Bokadi Pollo', 'bokadi-pollo', 'Bocadillo de pan rústico de 20cm elaborado con AOVE hecho en horno de piedra, relleno con pollo crujiente estilo Kentucky, salsa de queso cheddar, lechuga, tomate y cebolla. Incluye porción de patatas fritas y una bebida de su elección.', 11.90, 'bocadillos', true, true, ARRAY['gluten', 'lacteos'], 6),
('bokadi-burger', 'Bokadi Burger', 'bokadi-burger', 'Bocadillo de pan rústico de 20cm elaborado con AOVE hecho en horno de piedra, relleno con carne salteada al grill con cebolla, tomate cortado, lechuga, queso gouda y salsa de ajo. Incluye porción de patatas fritas y una bebida de su elección.', 11.90, 'bocadillos', true, true, ARRAY['gluten', 'lacteos', 'huevo'], 7),

-- Postres
('mousse-chocolate-fresas', 'Mousse de Chocolate y Fresas con Nata', 'mousse-chocolate-fresas', 'Mousse artesanal de chocolate belga con fresas naturales y corona de nata montada fresca.', 3.90, 'postres', true, true, ARRAY['lacteos'], 8),
('mousse-vainilla-chocolate', 'Mousse de Vainilla y Chocolate con Nata', 'mousse-vainilla-chocolate', 'Mousse artesanal de vainilla y chocolate con nata montada.', 3.90, 'postres', true, false, ARRAY['lacteos'], 9),
('mousse-fresa-frutos-bosque', 'Mousse de Fresa y Frutos del Bosque con Nata', 'mousse-fresa-frutos-bosque', 'Mousse artesanal de fresa natural y frutos silvestres del bosque con nata montada.', 3.90, 'postres', true, false, ARRAY['lacteos'], 10),

-- Bebidas Bio
('bionade-limon', 'Bionade Limón (Bio)', 'bionade-limon', 'Refresco ecológico fermentado natural de limón 330ml.', 2.90, 'bebidas-eco', true, false, ARRAY[]::TEXT[], 11),
('bionade-naranja', 'Bionade Orange (Bio)', 'bionade-naranja', 'Refresco ecológico fermentado natural de naranja 330ml.', 2.90, 'bebidas-eco', true, false, ARRAY[]::TEXT[], 12),
('bionade-bergamota-lima', 'Bionade Bergamot / Lima (Bio)', 'bionade-bergamota-lima', 'Refresco ecológico fermentado natural de bergamota y lima 330ml.', 2.90, 'bebidas-eco', true, false, ARRAY[]::TEXT[], 13),
('bionade-jengibre-naranja', 'Bionade Ginger / Orange (Bio)', 'bionade-jengibre-naranja', 'Refresco ecológico con jengibre y naranja 330ml.', 2.90, 'bebidas-eco', true, false, ARRAY[]::TEXT[], 14),
('bionade-sauco', 'Bionade Edelberry / Saúco (Bio)', 'bionade-sauco', 'Refresco ecológico fermentado con flor de saúco 330ml.', 2.90, 'bebidas-eco', true, false, ARRAY[]::TEXT[], 15),

-- Bebidas Tradicionales
('coca-cola', 'Coca-Cola', 'coca-cola', 'Refresco clásico 330ml frío.', 2.80, 'bebidas-trad', true, false, ARRAY[]::TEXT[], 16),
('fanta-naranja', 'Fanta Naranja', 'fanta-naranja', 'Refresco de naranja con gas 330ml frío.', 2.80, 'bebidas-trad', true, false, ARRAY[]::TEXT[], 17),
('sprite', 'Sprite', 'sprite', 'Refresco lima-limón 330ml frío.', 2.80, 'bebidas-trad', true, false, ARRAY[]::TEXT[], 18),

-- Cervezas
('mahou', 'Mahou Clásica', 'mahou', 'Tercio Mahou 33cl bien frío.', 2.20, 'cervezas', true, false, ARRAY['gluten'], 19),
('mahou-six-pack', 'Mahou Six-Pack (6 x 33cl)', 'mahou-six-pack', 'Pack ahorro de 6 botellas de Mahou 33cl.', 8.90, 'cervezas', true, false, ARRAY['gluten'], 20),
('heineken', 'Heineken', 'heineken', 'Botella Heineken 33cl fría.', 2.90, 'cervezas', true, false, ARRAY['gluten'], 21),
('paulaner-franziskaner', 'Paulaner / Franziskaner Trigo', 'paulaner-franziskaner', 'Cerveza alemana de trigo 50cl fría.', 3.90, 'cervezas', true, true, ARRAY['gluten'], 22)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    is_active = EXCLUDED.is_active,
    allergens = EXCLUDED.allergens;
