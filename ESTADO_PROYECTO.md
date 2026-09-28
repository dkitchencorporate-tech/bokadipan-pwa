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
* **Identidad Visual:** Obrador de Autor & Horno de Piedra Gourmet (Fondo Crema Cálido `#F8F4EC`, Verde Bosque Rústico Profundo `#1B3818`, Dorado Corteza Artesanal `#C88A35`, Bordes Kraft `#DFD3C1`, Tinta `#141A14`, Scrollbar de madera y piedra volcánica).
* **Subdominio Corporativo DNS:** `bokadipan.dkitchencorporate.es` (CNAME `cname.vercel-dns.com`)
* **Catálogo Integrado & Arquitectura de Subcategorías (Gobierno por BD):**
  - **Bocadillos Gourmet:** 7 variedades con fotografías macro sin personas en papel kraft.
  - **Complementos & Picoteo:** 4 productos con fotografías dedicadas (patatas rústicas, bolsa, aceitunas, encurtidos).
  - **Postres Delivery:** Tarrinas selladas (Tiramisú, Mousse Belga, Cheesecake).
  - **Bebidas Agrupadas:** 1 sola tarjeta visible con imagen por subcategoría (`Refrescos Clásicos`, `Cervezas Premium`, `Agua Mineral`) con modal rápido vertical.
* **Componentes Visuales Rediseñados:**
  - Emblema Vectorial Gourmet de Autor (`<BokadipanLogo />` con espigas de trigo y cortes de hogaza rústica en relieve).
  - Preloader tipográfico sobrio y minimalista de alta gama.
  - Hero banner limpio: eliminado cuadro de dirección flotante y repeticiones, insignia dorada *"AL HORNO DE PIEDRA"* de alto contraste.
  - Modales (`CheckoutModal`, `UpsellModal`, `SubcategoryModal`, `IngredientsModal`) 100% integrados a la nueva paleta oscura gourmet.

---

## 2. HISTORIAL COMPACTADO DE HITOS PREVIOS

* **28-sep-2026 (v1.7.0):** Reemplazo riguroso de adsets con imágenes reales y verificadas de alta gastronomía (aceitunas aliñadas tradicionales, encurtidos/banderillas, patatas fritas artesanas de bolsa, patatas rústicas, tiramisú en vaso, mousse de chocolate y cheesecake), eliminación de mención a sartén en descripción y purga de archivos temporales.
* **28-sep-2026 (v1.6.0):** Saneamiento de imágenes de postres y complementos, y ajuste responsive de la cabecera superior y BokadipanLogo para evitar cualquier corte o desplazamiento en móviles.
* **28-sep-2026 (v1.5.0):** Rediseño integral de identidad gourmet de autor (nuevo logotipo emblema de espigas/hogaza artesanal, preloader tipográfico sobrio sin saturación, paleta verde bosque profundo `#1B3818` / dorado corteza `#C88A35`, Hero simplificado de alto contraste y CheckoutModal sincronizado).
* **28-sep-2026 (v1.4.0):** Inclusión de categoría `Complementos & Picoteo` (4 productos con imágenes: patatas rústicas, patatas de bolsa, aceitunas y encurtidos), saneamiento del banner Hero (eliminada referencia a tapas/bebidas incluidas) y blindaje del centrado responsive de `CartBar`.
* **28-sep-2026 (v1.3.0):** Corrección integral de responsividad y contraste en `UpsellModal` y `CheckoutModal` (paleta rústica `#2D5A27`/`#FAF6F0`/`#E5DCD0`, botones CTA contrastados con texto blanco nítido, sin desbordamientos en móvil).
* **28-sep-2026 (v1.2.0):** Implementación de subcategorías agrupadas para bebidas (1 sola tarjeta con imagen + modal interactivo rápido), diseño rústico total (bordes `#E5DCD0`, fondo `#FAF6F0`, verde `#2D5A27`, scrollbar de obrador) y saneamiento de mapeo de imágenes.
* **28-sep-2026 (v1.1.0):** Saneamiento de concepto Delivery (eliminadas tapas/Bionade), nuevas fotografías macro de bocadillos, logo vector SVG robusto en Header y preloader animado con atmósfera de obrador rústico.
* **28-sep-2026 (v1.0.0):** Despliegue productivo exitoso en Vercel (`https://bokadipan-pwa.vercel.app`), resolución de sintaxis JSX, publicación en GitHub y configuración de base de datos e identidad Mediterráneo Orgánico.

---

## 3. PROTOCOLO OBLIGATORIO DE CIERRE DE SESIÓN

Al recibir la orden de cierre de sesión por parte de karc0:
1. Actualizar la sección `1. ESTADO ACTUAL REAL` reflejando el estado de despliegue y base de datos.
2. Añadir una viñeta concisa (máx. 2 líneas) en `2. HISTORIAL COMPACTADO`.
3. Guardar este archivo in-situ.
