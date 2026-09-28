# 🥖 ESTADO DE PROYECTO: BOKADIPAN PWA v1.0 (ENTERPRISE GASTRONÓMICA)

> **⚠️ PROTOCOLO DE ARRANQUE Y GATEKEEPER DE TOKENS (OBLIGATORIO):**  
> 1. **Comprobación de Esfuerzo de Razonamiento:** Al iniciar la sesión, comprueba si el modelo está en modo `High` (Thinking profundo). Si está en `High` sin autorización expresa y previa de karc0, **adviértele de inmediato y recomiéndale bajar a modo Normal/Medium** para no quemar la cuota de tokens.  
> 2. **Límite de Carpeta Estricto:** Esta sesión pertenece a BOKADIPAN PWA (`C:\Users\karc0\OneDrive\Desktop\dkitchen corporate\bokadipan-pwa`). Prohibido salir de este directorio o contaminarlo con otros proyectos.  
> 3. **Flujo 100% Cloud (Celeron N4120 / 3.83 GB RAM):** Prohibida la compilación local (`npm run build`, `vite build`, `tsc`). Toda compilación se delega exclusivamente a Vercel.

---

## 1. ESTADO ACTUAL REAL (28 de Septiembre de 2026)

* **Marca:** BOKADIPAN — Bocadillos de Pan Rústico al Horno de Piedra con AOVE.
* **URL Pública en Producción:** [`https://bokadipan-pwa.vercel.app`](https://bokadipan-pwa.vercel.app)
* **Repositorio Oficial en GitHub:** [`dkitchencorporate-tech/bokadipan-pwa`](https://github.com/dkitchencorporate-tech/bokadipan-pwa) (rama `main`)
* **Identidad Visual:** Obrador Rústico & Horno de Piedra (Fondo Crema Cálido `#FAF6F0`, Verde Oliva Profundo `#2D5A27`, Ámbar Tostado `#B45309`, Bordes Kraft/Harina `#E5DCD0`, Scrollbar personalizado de madera/obrador).
* **Subdominio Corporativo DNS:** `bokadipan.dkitchencorporate.es` (CNAME `cname.vercel-dns.com`)
* **Catálogo Integrado & Arquitectura de Subcategorías (Gobierno por BD):**
  - **Bocadillos Gourmet:** 7 variedades con fotografías macro sin personas en papel kraft.
  - **Postres Delivery:** Tarrinas selladas (Tiramisú, Mousse Belga, Cheesecake).
  - **Bebidas Agrupadas:** 1 sola tarjeta visible con imagen por subcategoría (`Refrescos Clásicos`, `Cervezas Premium`, `Agua Mineral`) que abre el modal vertical rápido para selección sin saturación visual.
* **Componentes Visuales & Modales:**
  - `<BokadipanLogo />` SVG en cabecera y preloader.
  - `SubcategoryModal`, `IngredientsModal`, `CartDrawer` y `CartBar` 100% integrados al diseño rústico.
* **Esquema Neon Database:** Archivo maestro `schema_bokadipan.sql` con tabla `subcategories`, función `process_checkout` (`SECURITY DEFINER`), productos y 2FA TOTP.
* **Documentación Operativa y Prompts:**
  - `C:\Users\karc0\OneDrive\Desktop\BOKADIPAN\BOKADIPAN_PROMPTS_IMAGENES.md`
  - `C:\Users\karc0\OneDrive\Desktop\BOKADIPAN\BOKADIPAN_MANUAL_OPERATIVO_Y_CUESTIONARIO.md`

---

## 2. HISTORIAL COMPACTADO DE HITOS PREVIOS

* **28-sep-2026 (v1.2.0):** Implementación de subcategorías agrupadas para bebidas (1 sola tarjeta con imagen + modal interactivo rápido), diseño rústico total (bordes `#E5DCD0`, fondo `#FAF6F0`, verde `#2D5A27`, scrollbar de obrador) y saneamiento de mapeo de imágenes.
* **28-sep-2026 (v1.1.0):** Saneamiento de concepto Delivery (eliminadas tapas/Bionade), nuevas fotografías macro de bocadillos, logo vector SVG robusto en Header y preloader animado con atmósfera de obrador rústico.
* **28-sep-2026 (v1.0.0):** Despliegue productivo exitoso en Vercel (`https://bokadipan-pwa.vercel.app`), resolución de sintaxis JSX, publicación en GitHub y configuración de base de datos e identidad Mediterráneo Orgánico.

---

## 3. PROTOCOLO OBLIGATORIO DE CIERRE DE SESIÓN

Al recibir la orden de cierre de sesión por parte de karc0:
1. Actualizar la sección `1. ESTADO ACTUAL REAL` reflejando el estado de despliegue y base de datos.
2. Añadir una viñeta concisa (máx. 2 líneas) en `2. HISTORIAL COMPACTADO`.
3. Guardar este archivo in-situ.
