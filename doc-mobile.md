# doc-mobile.md — Contrato de API para la app móvil

Documento dirigido al backend Laravel (`/api/mobile`). Registra qué se pidió, qué se entregó, y
las garantías de las que la app depende.

- **Base URL:** `https://inventario.monatekeda.com/api/mobile`
- **Auth:** `Authorization: Bearer <token>`. Un `401` cierra sesión globalmente en la app.
- **Roles:** un admin recibe `403` en endpoints de vendedor y viceversa.

> ## ✅ Estado a 2026-07-23: **no hay pendientes**
>
> Todo el backlog está entregado **y consumido** — no queda ningún workaround de cliente
> esperando un campo. La sección "No tocar" del final es ahora la parte útil de este documento:
> son las garantías que la app da por sentadas.

---

## El principio: servir datos, no presentación

**Sí debe venir del servidor** — todo lo que es *estructura o cálculo* sobre los datos:
jerarquías ya ordenadas, agregados (totales, conteos), rangos de precio, banderas como
`has_children` / `has_more`, y el orden de los listados. El servidor tiene los índices y la
base; el teléfono no.

**No debe venir del servidor** — la *presentación de la app*: precios formateados
(`"S/ 39.90"`), fechas legibles (`"hace 2 horas"`), etiquetas traducidas o colores. Eso depende
del locale y del diseño del cliente.

**El papel es la excepción.** Un recibo o una etiqueta impresa no son UI de la app: son
documentos del negocio, con su identidad legal. Los compone el servidor entero — ver abajo.

---

## ✅ Entregado y consumido

Verificado contra el código de la app, no solo contra la doc de la API. "Consumido" significa
que el workaround del cliente **ya se borró**.

### La ronda de impresión (la última)

| Pedido | Qué desapareció del cliente |
|---|---|
| `POST /admin/labels/print-payload` — etiquetas 30×20mm compuestas server-side | Nunca existió del lado del cliente: nació servido |
| `GET /sales/{sale}/escpos` y `GET /admin/sales/{sale}/escpos` — recibo compuesto server-side | **`src/utils/escpos.ts`, 143 líneas, borrado** |
| `items_count` en la respuesta de `POST /sales` | El último `reduce` de la capa de red |

Con eso el cliente dejó de componer bytes de impresora. `PrinterContext` ya no sabe qué es un
recibo: mantiene la conexión Bluetooth y escribe lo que le den. Cambiar el formato del ticket,
el tamaño de la etiqueta o el modelo de impresora ya **no requiere publicar la app**.

Tres cosas que el backend resolvió mejor de lo pedido, y que conviene no "arreglar":

- **Acentos de verdad.** Se pidió levantar el plegado a ASCII; se entregó `ESC t 2` (CP850) con
  `charset=ascii` como fallback. El ticket imprime `María`, `Ñuñez` y `N°`.
- **QR en el recibo** con `BOLETA-000042`, que no estaba pedido y sirve para ubicar una venta
  vieja escaneando el papel.
- **Lote de etiquetas tolerante:** si un `product_id` se borró entre que se armó el request y
  llegó, esa línea se skippea en vez de romper el lote entero.

### Rondas anteriores

| Pedido | Estado |
|---|---|
| Desempate determinista en todo endpoint paginado + `meta.last_page` exacto | ✅ |
| `GET /categories` y `/admin/categories`: árbol aplanado depth-first con `depth` y `has_children` | ✅ **consumido** — el cliente ya no reconstruye la jerarquía |
| `code` opcional al crear una variación (lo genera el servidor) | ✅ **consumido** — `src/utils/slug.ts` borrado |
| `items_count` en `GET /sales/{id}` y el detalle admin | ✅ consumido |
| `image_thumb_url` siempre presente | ✅ **consumido** — cero fallbacks `?? image_url` |
| Whitelist de `sort_by` coherente y con fallback | ✅ |
| Orden por precio min/max en variables, NULLS LAST | ✅ |
| `final_price_max` en `GET /admin/products` | ✅ |
| `top_products_meta { total, has_more, limit }` | ✅ |
| `/sales/statistics/top-products` y `/admin/dashboard/top-products` paginados | ✅ consumido |
| `GET /admin/dashboard/low-stock` paginado | ✅ consumido |
| `period` en `GET /sales` y `GET /admin/sales` | ✅ entregado — *falta consumir en la app* |
| `code` en las filas de más vendidos | ✅ entregado — *falta consumir en la app* |
| `attributes` en el detalle del producto del vendedor | ✅ entregado — *falta consumir en la app* |

**Los tres últimos son trabajo de cliente, no del backend.** El campo ya viene; falta que la app
lo use. No hace falta tocar nada del servidor por ellos.

---

## Cerrado — no volver a pedir

**Datos del negocio (`business { name, ruc }`, `branch.address`) para el cliente.** Se pidió
para llenar la cabecera del recibo térmico. **Sin efecto:** el servidor compone el recibo, así
que esos datos nunca tienen que viajar al teléfono. Anotado para que nadie implemente los dos.

**Decimales como `number`.** Se ofrecieron dos opciones y se tomó la segunda: string con 2
decimales, **nunca `null` ni vacío** (`"0.00"` para el cero). Única excepción documentada:
`final_price_max` es `null` en productos simples, a propósito, porque el rango no aplica. Con
esa garantía los `parseFloat` de los mappers dejan de ser un riesgo de `NaN` silencioso.
**Resuelto.**

**Enum `status` del producto.** Se pidió unificar `public` / `published` por sospecha de datos
inconsistentes. Los tres valores son **intencionales**: `private` (interno), `public` (activo,
fuera del storefront de WooCommerce) y `published` (visible online). **Resuelto: era una
pregunta, no un bug.**

**`camelCase` en el JSON.** Se planteó para decidir, no se recomendó. El radio de impacto es
toda la API y rompería a cualquier otro consumidor. **No hacer.**

---

## No tocar

Las garantías de las que la app depende hoy. Romper cualquiera de estas rompe la app en
silencio — sin error, con datos mal.

**1. `meta.last_page` y `meta.total` exactos siempre**, incluso al pedir una página fuera de
rango (`data` vacío pero `last_page` real). Es lo que permite retroceder a la última página
válida cuando una mutación vació la última — pasa al restaurar o eliminar en la papelera y en
usuarios.

**2. Desempate determinista al final de cada `ORDER BY`.** Con páginas numeradas, un orden con
empates hace que una misma fila salga en dos páginas mientras otra no sale en ninguna.

**3. `POST /sales` no es idempotente**, y la app lo trata como tal: timeout de 30s y manejo
explícito del "estado desconocido" cuando expira. **No agregar reintentos automáticos** ni
cambiar la semántica sin avisar — un reintento silencioso duplica ventas reales.

**4. El QR de la etiqueta lleva el `code` que resuelve `GET /lookup`.** Es el punto entero del
sticker: escanearlo desde la app agrega el producto al carrito. Si el QR pasa a llevar otra cosa
(un id interno, una URL), las etiquetas ya impresas dejan de servir para el POS.

**5. El envelope `{ payload, encoding }` en base64.** La app escribe el `payload` al socket
Bluetooth **sin transformarlo**. Si el stream pasara a viajar como texto plano, los bytes de
control (`0x1b`, `0x1d`, `0x00`) se corromperían en tránsito.

**6. El PDF de la boleta se queda.** El endpoint `/escpos` no lo reemplaza: son dos salidas para
dos situaciones (compartir/archivar vs. papel térmico en el mostrador). Conviene que las dos
salgan de la misma plantilla de datos para que no vuelvan a divergir.
