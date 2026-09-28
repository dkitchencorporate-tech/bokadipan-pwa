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

-- 2. TABLA: SUBCATEGORÍAS (Agrupación de Bebidas, Cervezas, Aguas)
CREATE TABLE IF NOT EXISTS subcategories (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: PRODUCTOS & COMBOS
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(128) UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(10, 2),
    category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
    subcategory_id VARCHAR(64) REFERENCES subcategories(id) ON DELETE SET NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_upsell BOOLEAN DEFAULT FALSE,
    badge VARCHAR(64),
    allergens TEXT[] DEFAULT '{}',
    stock INT DEFAULT 999,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: CUPONES & PROMOCIONES
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

-- 5. TABLA: USUARIOS & CLIENTES VIP (2FA TOTP + EMAIL VERIFICATION)
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

-- 6. TABLA: PEDIDOS (ORDERS)
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

-- 7. TABLA: LÍNEAS DE PEDIDO (ORDER_ITEMS)
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

-- 8. TABLA: CONFIGURACIÓN GLOBAL & SWITCHES OPERATIVOS
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
        WHERE id = v_item.product_id AND (is_active = TRUE OR is_available = TRUE);

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
-- 🍃 SEED DATA: CATEGORÍAS, SUBCATEGORÍAS & PRODUCTOS BOKADIPAN
-- ==============================================================================

-- Categorías Maestras
INSERT INTO categories (id, name, description, icon, sort_order, is_active) VALUES
('bocadillos', 'Bocadillos Rústicos AOVE', 'Bocadillos gourmet de 20cm en pan artesanal al horno de piedra con aceite de oliva virgen extra (AOVE).', 'Utensils', 1, true),
('complementos', 'Complementos & Picoteo', 'Raciones de patatas rústicas, patatas artesanas de bolsa, aceitunas selectas y encurtidos de la huerta.', 'UtensilsCrossed', 2, true),
('postres', 'Postres Artesanos', 'Postres artesanos en tarrina individual sellada para entrega a domicilio.', 'Cake', 3, true),
('bebidas', 'Bebidas & Cervezas Frías', 'Refrescos fríos en lata 330ml, cervezas nacionales/importación y agua mineral.', 'GlassWater', 4, true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description, 
    sort_order = EXCLUDED.sort_order;

-- Subcategorías de Bebidas (Agrupación con 1 sola tarjeta visible que abre modal)
INSERT INTO subcategories (id, category_id, name, description, image_url, sort_order, is_active) VALUES
('sub-refrescos', 'bebidas', 'Refrescos Clásicos (33cl)', 'Lata 330ml servida bien fría (Coca-Cola, Zero, Fanta, Sprite).', '/assets/products/refrescos-clasicos.jpg', 1, true),
('sub-cervezas', 'bebidas', 'Cervezas Premium (33cl)', 'Cervezas nacionales y de importación en botella o tercio frío.', '/assets/products/cervezas-premium.jpg', 2, true),
('sub-aguas', 'bebidas', 'Agua Mineral (50cl)', 'Botella 500ml fría de manantial natural.', '/assets/products/agua-mineral.jpg', 3, true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description, 
    image_url = EXCLUDED.image_url,
    sort_order = EXCLUDED.sort_order;

-- Productos: Bocadillos Gourmet
INSERT INTO products (id, name, slug, description, price, category_id, is_active, is_available, is_featured, allergens, sort_order) VALUES
('bokadi-serrano', 'Bokadi Serrano', 'bokadi-serrano', 'Pan rústico de 20cm al horno de piedra con AOVE, abundante jamón serrano selecto y pulpa de tomate natural con orégano y sal en escamas.', 8.90, 'bocadillos', true, true, true, ARRAY['gluten'], 1),
('boka-mar', 'Boka - Mar', 'boka-mar', 'Pan rústico de 20cm con AOVE relleno de calamares crujientes a la romana, pimientos verdes al grill, sal gorda y suave alioli casero.', 10.50, 'bocadillos', true, true, true, ARRAY['gluten', 'moluscos', 'huevo'], 2),
('bokadi-lomo', 'Bokadi Lomo', 'bokadi-lomo', 'Pan rústico de 20cm al horno de piedra con filetes de lomo tierno al grill, pimientos de padrón verdes fritos en AOVE y sal marina.', 9.90, 'bocadillos', true, true, true, ARRAY['gluten'], 3),
('bokadi-pollo', 'Bokadi Pollo Crispy', 'bokadi-pollo', 'Pan rústico de 20cm con pechuga de pollo crujiente sureña, queso cheddar fundido, lechuga fresca, tomate y cebolla morada.', 10.50, 'bocadillos', true, true, true, ARRAY['gluten', 'lacteos'], 4),
('bokadi-burger', 'Bokadi Burger Steak', 'bokadi-burger', 'Pan rústico de 20cm con tiras de ternera marinada al grill, queso gouda fundido, cebolla caramelizada, tomate y salsa de ajo suave.', 10.50, 'bocadillos', true, true, true, ARRAY['gluten', 'lacteos', 'huevo'], 5),
('bokadi-bacon', 'Bokadi Bacon & Queso', 'bokadi-bacon', 'Pan rústico de 20cm con tiras gruesas de bacon ahumado crujiente y doble capa de queso fundido derretido.', 9.80, 'bocadillos', true, true, false, ARRAY['gluten', 'lacteos'], 6),
('boka-atun', 'Boka - Atún Mediterráneo', 'boka-atun', 'Pan rústico de 20cm con atún claro de primera, jamón york, queso suave, finas rodajas de tomate, lechuga y cebolla.', 10.50, 'bocadillos', true, true, false, ARRAY['gluten', 'pescado', 'lacteos'], 7),

-- Productos: Complementos & Picoteo Artesanal
('patatas-rusticas', 'Ración de Patatas Fritas Rústicas', 'patatas-rusticas', 'Patatas naturales cortadas a mano con piel, fritas en aceite limpio y sazonadas con sal marina y romero.', 3.50, 'complementos', true, true, true, ARRAY[]::TEXT[], 8),
('patatas-bolsa', 'Patatas Fritas de Bolsa Artesanas', 'patatas-bolsa', 'Bolsa de patatas fritas artesanas crujientes en sartén con aceite de oliva y punto justo de sal.', 2.00, 'complementos', true, true, false, ARRAY[]::TEXT[], 9),
('aceitunas-alinadas', 'Ración de Aceitunas Aliñadas', 'aceitunas-alinadas', 'Aceitunas manzanilla selectas aliñadas al estilo tradicional con orégano, ajo suave y AOVE.', 2.50, 'complementos', true, true, false, ARRAY[]::TEXT[], 10),
('encurtidos-huerta', 'Ración de Encurtidos de la Huerta', 'encurtidos-huerta', 'Selección de encurtidos artesanos: banderillas, pepinillos crujientes, cebollitas y guindillas suaves.', 2.80, 'complementos', true, true, false, ARRAY[]::TEXT[], 11),

-- Productos: Postres Artesanales en Tarrina
('tiramisu-artesano', 'Tiramisú Artesano en Tarrina', 'tiramisu-artesano', 'Auténtico tiramisú italiano con bizcocho savoiardi bañado en espresso, crema de mascarpone y cacao puro en polvo.', 3.50, 'postres', true, true, true, ARRAY['lacteos', 'huevo', 'gluten'], 12),
('mousse-chocolate-delivery', 'Mousse de Chocolate Belga', 'mousse-chocolate-delivery', 'Mousse cremosa de chocolate negro belga 70% con virutas de chocolate crujiente en tarrina individual sellada.', 3.50, 'postres', true, true, false, ARRAY['lacteos'], 13),
('cheesecake-frutos-rojos', 'Cheesecake de Frutos Rojos', 'cheesecake-frutos-rojos', 'Tarta de queso suave sobre base crujiente de galleta con coulis artesano de frambuesas y arándanos silvestres.', 3.50, 'postres', true, true, false, ARRAY['lacteos', 'gluten'], 14),

-- Subproductos: Refrescos Clásicos (Asociados a sub-refrescos)
('coca-cola', 'Coca-Cola Original', 'coca-cola', 'Lata 330ml bien fría.', 2.20, 'bebidas', true, true, false, ARRAY[]::TEXT[], 11),
('coca-cola-zero', 'Coca-Cola Zero', 'coca-cola-zero', 'Lata 330ml bien fría sin azúcar.', 2.20, 'bebidas', true, true, false, ARRAY[]::TEXT[], 12),
('fanta-naranja', 'Fanta Naranja', 'fanta-naranja', 'Lata 330ml con gas y sabor a naranja.', 2.20, 'bebidas', true, true, false, ARRAY[]::TEXT[], 13),
('sprite', 'Sprite', 'sprite', 'Lata 330ml lima-limón refrescante.', 2.20, 'bebidas', true, true, false, ARRAY[]::TEXT[], 14),

-- Subproductos: Cervezas Premium (Asociados a sub-cervezas)
('mahou-clasica', 'Mahou Clásica (33cl)', 'mahou-clasica', 'Tercio 33cl bien frío.', 2.20, 'bebidas', true, true, false, ARRAY['gluten'], 15),
('mahou-5-estrellas', 'Mahou 5 Estrellas (33cl)', 'mahou-5-estrellas', 'Cerveza especial rubia 33cl fría.', 2.50, 'bebidas', true, true, false, ARRAY['gluten'], 16),
('heineken', 'Heineken (33cl)', 'heineken', 'Botella 33cl fría de cerveza premium.', 2.70, 'bebidas', true, true, false, ARRAY['gluten'], 17),
('paulaner-trigo', 'Paulaner / Franziskaner Trigo (50cl)', 'paulaner-trigo', 'Cerveza alemana de trigo 50cl fría con cuerpo y aroma afrutado.', 3.90, 'bebidas', true, true, false, ARRAY['gluten'], 18),
('pack-6-cervezas', 'Pack Ahorro 6 Cervezas (6 x 33cl)', 'pack-6-cervezas', 'Pack de 6 tercios de cerveza Mahou 33cl para compartir a domicilio.', 8.90, 'bebidas', true, true, false, ARRAY['gluten'], 19),

-- Subproductos: Agua Mineral (Asociada a sub-aguas)
('agua-mineral', 'Agua Mineral Natural', 'agua-mineral', 'Botella 500ml fría de manantial.', 1.50, 'bebidas', true, true, false, ARRAY[]::TEXT[], 20)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    is_active = EXCLUDED.is_active,
    is_available = EXCLUDED.is_available,
    allergens = EXCLUDED.allergens;

-- Asignar subcategory_id a las bebidas correspondientes
UPDATE products SET subcategory_id = 'sub-refrescos' WHERE id IN ('coca-cola', 'coca-cola-zero', 'fanta-naranja', 'sprite');
UPDATE products SET subcategory_id = 'sub-cervezas' WHERE id IN ('mahou-clasica', 'mahou-5-estrellas', 'heineken', 'paulaner-trigo', 'pack-6-cervezas');
UPDATE products SET subcategory_id = 'sub-aguas' WHERE id = 'agua-mineral';
