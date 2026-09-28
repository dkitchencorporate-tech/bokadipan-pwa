# 🏭 ESTADO DE PROYECTO: DKITCHEN WHITE-LABEL ENGINE v3.0 (MOTOR MATRIZ)

> **⚠️ PROTOCOLO DE ARRANQUE Y GATEKEEPER DE TOKENS (OBLIGATORIO):**  
> 1. **Comprobación de Esfuerzo de Razonamiento:** Al iniciar la sesión, comprueba si el modelo está en modo `High` (Thinking profundo). Si está en `High` sin autorización expresa y previa de karc0, **adviértele de inmediato y recomiéndale bajar a modo Normal/Medium** para no quemar la cuota de tokens.  
> 2. **Límite de Carpeta Estricto:** Esta sesión pertenece al Motor Matriz Marca Blanca. Prohibido salir de este directorio o contaminarlo con marcas comerciales activas.  
> 3. **Flujo 100% Cloud (Celeron N4120 / 3.83 GB RAM):** Prohibida la compilación local (`npm run build`, `vite build`, `tsc`). Todo desarrollo se gestiona como plantilla base para clonar hacia nuevos proyectos.

---

## 1. ESTADO ACTUAL REAL (Septiembre 2026)

* **Naturaleza:** Motor Matriz y Plantilla 100% Agnóstica de Marca (White-Label) para clonación instantánea de PWAs gastronómicas en D-Kitchen y clientes B2B.
* **Componentes 100% Desacoplados y Auditados:**
  - **Identidad Centralizada:** [`src/config/brandConfig.ts`](file:///src/config/brandConfig.ts) controla tipografía, paleta cromática HEX, logos, splash preloader, textos de club VIP y canales de contacto.
  - **Inyección Dinámica de Tema:** `applyBrandTheme()` inyecta tokens CSS `--brand-*` en runtime a `:root` en `main.tsx` y se consumen nativamente en Tailwind (`tailwind.config.js`).
  - **Preloader Agnóstico:** Reemplazado splash específico por preloader minimalista corporativo configurable.
  - **Assets Neutros:** SVGs de placeholder (`logo.svg`, `placeholder-food.svg`) en `public/assets/` sin fotos inventadas ni dependencias a terceros.
  - **Comunicaciones y Notificaciones:** `api/notify.js` parametrizado con `BRAND_NAME` y `BRAND_SLOGAN` para emails transaccionales y campañas.
  - **Impresión Térmica ESC/POS:** `TicketPrinter.tsx` y `printerService.ts` parametrizados dinámicamente con `ticketPrefix` y cabeceras de la marca activa.
  - **Panel de Administración (`/admin`):** Gestión completa de pedidos, catálogo, arqueo contable A4 descargable, campañas masivas y TPV Kiosko.
  - **Seguridad P0001:** Servidor Neon Postgres recalcula y valida precios mediante funciones `SECURITY DEFINER` en `schema_white_label.sql`.

### Protocolo de Clonación para Nueva Marca:
1. Validar y rellenar la **Ficha de Identidad de Marca** (Nombre, slogan, colores HEX primario/secundario/acento, redes sociales).
2. Generar y aprobar el **Dossier de Prompts para Assets / Fotografías** antes de insertar cualquier imagen.
3. Copiar la carpeta del motor al nuevo directorio de proyecto.
4. Sobreescribir `src/config/brandConfig.ts` con la ficha de identidad aprobada.
5. Ejecutar `schema_white_label.sql` en la nueva base de datos Neon autorizada.
6. Desplegar en Vercel configurando las variables seguras de entorno.

---

## 2. HISTORIAL COMPACTADO DE HITOS PREVIOS

* **26-sep-2026:** Saneamiento profundo 100% completado: eliminación de todos los binarios residuales (PNGs/JPGs), purga total de tokens residuales `fries-*` en modales y componentes (`UserModal`, `SauceModal`, `IngredientsModal`, `Kiosk*`, etc.), placeholders neutros en formularios de Admin y filenames genéricos de exportación contable/base de datos.
* **26-sep-2026:** Purga cromática absoluta y estandarización monocromática neutra (zinc/black/white) en todo el motor matriz (`brandConfig.ts`, modales de admin, timelines, preloader, tickets y landings). Verificación con capturas headless de Desktop, Mobile y Portal de Administración.
* **26-sep-2026:** Saneamiento radical del motor matriz: tokenización de Tailwind con variables CSS, purga total de assets/textos heredados, preloader agnóstico y desacoplamiento de servicios de impresión y notificaciones.
* **25-sep-2026:** Extracción, purga y desacoplamiento formal de la arquitectura v3.0 a partir de la base probada de Seven Food Fries PWA.

---

## 3. PROTOCOLO OBLIGATORIO DE CIERRE DE SESIÓN

Al recibir la orden de cierre de sesión por parte de karc0:
1. Actualizar la sección `1. ESTADO ACTUAL REAL` reflejando mejoras o nuevos módulos en el motor base.
2. Añadir una viñeta concisa (máx. 2 líneas) en `2. HISTORIAL COMPACTADO`.
3. Guardar este archivo in-situ.
