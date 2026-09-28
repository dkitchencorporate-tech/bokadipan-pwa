-- ==============================================================================
-- DKITCHEN WHITE-LABEL ENGINE v3.0 (EDICIÓN DEFENSIVA Y ENTERPRISE)
-- Master Relational Database Schema (PostgreSQL / Neon Database)
-- ==============================================================================

-- 1. Extensiones criptográficas y UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    subtitle VARCHAR(150),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Subcategorías (refrescos, cervezas, salsas, etc.)
CREATE TABLE IF NOT EXISTS subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de Productos del Catálogo
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_upsell BOOLEAN DEFAULT false,
    badge VARCHAR(50),
    customization_schema JSONB DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla de Usuarios y Perfiles (Con soporte 2FA TOTP y verificación de email)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    full_name VARCHAR(150),
    phone VARCHAR(30) UNIQUE,
    address JSONB,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    is_admin BOOLEAN DEFAULT false,
    is_email_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    verification_sent_at TIMESTAMPTZ,
    totp_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla de Clientes TPV / Kiosko Mostrador
CREATE TABLE IF NOT EXISTS kiosk_customers (
    phone VARCHAR(30) PRIMARY KEY,
    name VARCHAR(150),
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Configuración del Negocio (Store Settings)
CREATE TABLE IF NOT EXISTS store_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    delivery_fee NUMERIC(10, 2) DEFAULT 2.50,
    min_order_delivery NUMERIC(10, 2) DEFAULT 12.00,
    is_store_open BOOLEAN DEFAULT true,
    estimated_prep_time VARCHAR(50) DEFAULT '20-30 min',
    saturation_mode BOOLEAN DEFAULT false,
    business_name VARCHAR(150) DEFAULT 'D-Kitchen Gourmet',
    business_legal_name VARCHAR(200) DEFAULT 'D-Kitchen Corporate Tech S.L.',
    business_cif VARCHAR(50) DEFAULT 'B-00000000',
    business_phone VARCHAR(50) DEFAULT '+34 600 000 000',
    business_whatsapp VARCHAR(50) DEFAULT '+34600000000',
    business_email VARCHAR(150) DEFAULT 'pedidos@dkitchencorporate.es',
    business_address VARCHAR(255) DEFAULT 'Calle Principal 1',
    business_city VARCHAR(100) DEFAULT 'Madrid',
    business_postal_code VARCHAR(20) DEFAULT '28001',
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO store_settings (id, is_store_open, min_order_delivery, delivery_fee)
VALUES (1, true, 12.00, 2.50)
ON CONFLICT (id) DO NOTHING;

-- 8. Horarios de Apertura Semanales
CREATE TABLE IF NOT EXISTS store_hours (
    day_of_week INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
    is_open BOOLEAN DEFAULT true,
    open_time VARCHAR(10) DEFAULT '12:00',
    close_time VARCHAR(10) DEFAULT '23:30',
    is_closed BOOLEAN DEFAULT false
);

INSERT INTO store_hours (day_of_week, is_open, open_time, close_time, is_closed)
VALUES 
  (0, true, '12:00', '23:30', false),
  (1, true, '12:00', '23:30', false),
  (2, true, '12:00', '23:30', false),
  (3, true, '12:00', '23:30', false),
  (4, true, '12:00', '23:30', false),
  (5, true, '12:00', '23:30', false),
  (6, true, '12:00', '23:30', false)
ON CONFLICT (day_of_week) DO NOTHING;

-- 9. Módulo de Upsells / Sugerencias de Venta Cruzada
CREATE TABLE IF NOT EXISTS upsells (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Tabla Principal de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    delivery_address JSONB,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('delivery', 'pickup', 'dine_in')),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    points_redeemed BOOLEAN DEFAULT false,
    payment_method VARCHAR(30) DEFAULT 'cash',
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'cooking', 'delivering', 'ready', 'delivered', 'cancelled')),
    notes TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_comment TEXT,
    estimated_ready_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Tabla de Ítems del Pedido (Order Items)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    customization_details JSONB DEFAULT '{}'::jsonb,
    is_sent_to_kitchen BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Notificaciones y Suscripciones Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_phone VARCHAR(30) NOT NULL,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Analítica Ligera
CREATE TABLE IF NOT EXISTS site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    event_type TEXT,
    label TEXT,
    device_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pwa_installs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_type TEXT,
    app_type TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- FUNCIONES DE SEGURIDAD Y CONTROL DE CONTEXTO RLS
-- ==============================================================================

CREATE OR REPLACE FUNCTION app_current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_user_id := current_setting('app.current_user_id', true);
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RETURN FALSE;
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id::UUID;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

-- ==============================================================================
-- BLINDAJE ANTI-FRAUDE P0001 (SECURITY DEFINER)
-- ==============================================================================

CREATE OR REPLACE FUNCTION process_checkout(
  p_user_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_delivery_address JSONB,
  p_delivery_method TEXT,
  p_items JSONB,
  p_points_redeemed BOOLEAN DEFAULT FALSE,
  p_small_order_fee_accepted BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_subtotal NUMERIC(10,2) := 0;
  v_discount NUMERIC(10,2) := 0;
  v_delivery_fee NUMERIC(10,2) := 0;
  v_small_order_fee NUMERIC(10,2) := 0;
  v_min_order NUMERIC(10,2) := 0;
  v_final_total NUMERIC(10,2) := 0;
  v_item JSONB;
  v_prod RECORD;
  v_user_points INTEGER := 0;
  v_is_email_verified BOOLEAN := FALSE;
  v_cheapest_eligible_price NUMERIC(10,2) := NULL;
  v_store_open BOOLEAN;
BEGIN
  SELECT is_store_open, delivery_fee, min_order_delivery
  INTO v_store_open, v_delivery_fee, v_min_order
  FROM store_settings WHERE id = 1;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido debe contener al menos un artículo.';
  END IF;

  -- 1. Verificar puntos y correo verificado si canjea
  IF p_points_redeemed THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'Debes iniciar sesión para canjear puntos VIP.';
    END IF;

    SELECT points, is_email_verified INTO v_user_points, v_is_email_verified
    FROM profiles WHERE id = p_user_id;

    IF NOT COALESCE(v_is_email_verified, FALSE) THEN
      RAISE EXCEPTION 'Para canjear puntos VIP debes verificar tu correo electrónico primero.';
    END IF;

    IF COALESCE(v_user_points, 0) < 25 THEN
      RAISE EXCEPTION 'Puntos VIP insuficientes para aplicar descuento.';
    END IF;
  END IF;

  -- 2. Crear cabecera
  INSERT INTO orders (
    user_id, client_name, client_phone, delivery_address, delivery_method,
    subtotal, discount, delivery_fee, total, points_redeemed, notes, payment_method, status
  ) VALUES (
    p_user_id, p_client_name, p_client_phone, p_delivery_address, p_delivery_method,
    0, 0, 0, 0, p_points_redeemed, p_notes, p_payment_method, 'pending'
  ) RETURNING id INTO v_order_id;

  -- 3. Procesar artículos validando precio real de la BD
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, price, is_available INTO v_prod
    FROM products WHERE id = (v_item->>'productId')::INTEGER;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no existe en el catálogo.';
    END IF;

    IF NOT v_prod.is_available THEN
      RAISE EXCEPTION 'El producto seleccionado no está disponible actualmente.';
    END IF;

    v_subtotal := v_subtotal + (v_prod.price * (v_item->>'quantity')::INTEGER);

    IF v_cheapest_eligible_price IS NULL OR v_prod.price < v_cheapest_eligible_price THEN
      v_cheapest_eligible_price := v_prod.price;
    END IF;

    INSERT INTO order_items (order_id, product_id, quantity, unit_price, customization_details)
    VALUES (
      v_order_id,
      v_prod.id,
      (v_item->>'quantity')::INTEGER,
      v_prod.price,
      COALESCE(v_item->'customization_details', '{}'::jsonb)
    );
  END LOOP;

  -- 4. Aplicar descuento VIP
  IF p_points_redeemed AND v_cheapest_eligible_price IS NOT NULL THEN
    v_discount := v_cheapest_eligible_price;
    UPDATE profiles SET points = points - 25 WHERE id = p_user_id;
  END IF;

  -- 5. Tarifa de pedido pequeño
  IF p_delivery_method = 'delivery' THEN
    IF (v_subtotal - v_discount) < v_min_order THEN
      IF NOT p_small_order_fee_accepted THEN
        RAISE EXCEPTION 'El pedido no alcanza el pedido mínimo para entrega.';
      END IF;
      v_small_order_fee := v_delivery_fee;
    END IF;
  END IF;

  v_final_total := GREATEST(0, (v_subtotal - v_discount)) + v_small_order_fee;

  -- 6. Puntos ganados
  IF p_user_id IS NOT NULL AND NOT p_points_redeemed THEN
    UPDATE profiles SET points = points + (FLOOR(v_final_total / 10) * 4) WHERE id = p_user_id;
  END IF;

  -- 7. Actualizar totales
  UPDATE orders SET
    subtotal = v_subtotal,
    discount = v_discount,
    delivery_fee = v_small_order_fee,
    total = v_final_total
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;
