# 🚀 DKITCHEN WHITE-LABEL ENGINE v3.0

> **Motor Matriz de PWA para Gastronomía y Delivery por D-Kitchen Corporate Tech**  
> Plantilla agnóstica, segura y tokenizada para clonación y despliegue rápido de nuevas marcas gastronómicas.

---

## 💎 Arquitectura y Características

1. **Seguridad y Paridad de Nivel Máximo (Matriz 20 Reglas):**
   - **Autenticación Super Admin 2FA TOTP:** Soporte RFC 6238 compatible con Google Authenticator / Authy.
   - **Blindaje Anti-Fraude (P0001):** Función `process_checkout` en PL/pgSQL (`SECURITY DEFINER`) que calcula precios y tarifas exclusivamente en base de datos.
   - **Fidelización con Verificación de Email:** Puntos VIP intransferibles con validación forzosa de correo antes del canje.
   - **Dual-Layer Admin Guard:** Verificación de token JWT y rol directo en PostgreSQL.
   - **Rate Limiting Perimetral:** Protección anti-fuerza bruta y anti-spam en login y checkout.

2. **Identidad Desacoplada y Tokenización:**
   - [`src/config/brandConfig.ts`](file:///src/config/brandConfig.ts): Gobierna paleta cromática HEX, logos, textos, preloader, reglas de fidelización y parámetros de cobertura.
   - Inyección en runtime de variables CSS `--brand-*` consumidas directamente por Tailwind.
   - Preloader personalizable por marca.

3. **Operativa Completa de Restauración:**
   - Catálogo interactivo con personalización de extras y opciones.
   - TPV / Kiosko de mostrador con impresión térmica ESC/POS.
   - Panel de control administrativo (`/admin`) con gestión de pedidos, arqueo A4, campañas masivas y catálogo.
   - Soporte para pagos en efectivo, datáfono móvil y SumUp.

---

## ⚡ Guía de Clonación para una Nueva Marca (Menos de 1 Hora)

### 1. Preparación de la Ficha de Marca
Editar `src/config/brandConfig.ts`:
- Nombre comercial, slogan, CIF y datos de contacto.
- Colores corporativos (`primary`, `primaryHover`, `primaryLight`, `accent`, etc.).
- Textos de fidelización y límites de entrega.

### 2. Base de Datos Neon Postgres
1. Crear una base de datos en Neon.
2. Ejecutar [`schema_white_label.sql`](file:///schema_white_label.sql) en el SQL Editor de Neon.

### 3. Variables de Entorno en Vercel
Configurar en el proyecto de Vercel:
```env
APP_DATABASE_URL=postgres://usuario:password@ep-pooler.c-region.neon.tech/neondb?sslmode=require
APP_JWT_SECRET=super_jwt_secret_aleatorio_de_64_caracteres
SUPER_ADMIN_EMAIL=dkitchen@dkitchencorporate.es
SUPER_ADMIN_PASSWORD=ContraseñaSuperAdmin2026!
SUPER_ADMIN_TOTP_SECRET=CLAVEBASE32PARA2FA
BRAND_NAME=Nombre de la Marca
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notificaciones@dkitchencorporate.es
SMTP_PASS=app_password_smtp
BLOB_READ_WRITE_TOKEN=token_de_vercel_blob
```

### 4. Despliegue
```bash
git init
git add .
git commit -m "feat(init): initial brand instance from dkitchen-white-label-engine"
git branch -M main
git remote add origin https://github.com/dkitchencorporate-tech/<nombre-repo>.git
git push -u origin main
vercel --prod
```
