# NoInventes — Guía de secciones

Guía funcional de la aplicación, enfocada en **el contenido de cada pantalla**: qué
ve el usuario, qué información aparece y qué puede hacer en cada sección.

---

## ¿Qué es NoInventes?

**NoInventes** es una aplicación móvil para negocios de retail, desarrollada por
**MiZonaOnline.com**. Funciona como **punto de venta** y **gestión de inventario**
desde el teléfono.

Puntos clave:

- **Multitienda.** Una misma app da servicio a varias tiendas. Cada usuario entra a la
  suya identificándola por su **subdominio** (el nombre de la tienda).
- **Dos interfaces según el rol**, con un solo inicio de sesión:
  - **Vendedor** — el punto de venta: explora el catálogo, arma el carrito, cobra la
    venta y revisa su historial y estadísticas. Todo dentro de su sucursal.
  - **Administrador** — la gestión: panel global de ventas, catálogo maestro (productos,
    categorías, etiquetas, atributos), sucursales, usuarios y datos de la empresa.
- **Boletas / facturas.** Cada venta genera un recibo que se puede compartir en PDF o
  imprimir en una impresora térmica.

Cada interfaz se distingue también por color: el vendedor usa un **ámbar** y el
administrador un **navy** (azul muy oscuro).

---

## 1. Inicio de sesión (Login)

Es la primera pantalla, común para vendedores y administradores. La app decide a qué
interfaz llevar al usuario **según su rol**, después de validar sus datos.

### Qué aparece en la pantalla

La pantalla tiene dos zonas: una **cabecera navy** arriba y una **hoja blanca
redondeada** con el formulario abajo.

**Cabecera (navy)**
- El **logo** de NoInventes (el icono a color) sobre un fondo azul muy oscuro, con un
  **arco ámbar decorativo** en la esquina superior.
- Título **"Bienvenido"** (en blanco) y el subtítulo **"Inicia sesión para continuar"**.

**Formulario** (en la hoja blanca; campos en recuadro con borde)

| Campo | Para qué sirve |
|-------|----------------|
| **Tienda** | El **subdominio** de la tienda (ej. `mi-tienda`), con un **chip** que muestra el dominio **`.noinventes.com`** a la derecha. Identifica el negocio dentro del sistema multitienda. Ayuda: *"El subdominio que te dieron al crear la cuenta."* Se normaliza a minúsculas y quita espacios o un `https://` / `.noinventes.com` pegado por error. |
| **Correo electrónico** | El correo del usuario. |
| **Contraseña** | Oculta por defecto, con un botón de texto **"Ver" / "Ocultar"** a la derecha para revelarla. |

- El **botón "Iniciar sesión"** (ámbar) se habilita solo cuando los tres campos están
  completos, y muestra **"Validando…"** mientras verifica.
- Si algo falla, aparece un **banner de error** en rojo sobre el botón, y se resaltan en
  rojo los campos implicados (se limpia solo la contraseña).
- Debajo, el enlace **"¿Olvidaste tu contraseña?"** (indica contactar a un administrador
  de la tienda, que la restablece desde el panel).

**Pie**
- La nota **"Acceso para personal autorizado"**.

### Comportamientos útiles

- **La tienda se recuerda.** El campo *Tienda* viene **prellenado con la última tienda**
  usada, así el usuario no tiene que reescribir el subdominio cada vez. Sigue siendo
  editable por si necesita cambiar de tienda.
- **Mostrar / ocultar contraseña** con el ícono de ojo.
- **Mensajes de error claros**, según el caso:
  - Credenciales incorrectas.
  - *"Demasiados intentos. Espera un minuto e inténtalo de nuevo."* (tras varios intentos
    fallidos).
  - *"No encontramos esa tienda. Revisa el subdominio."* (cuando la tienda no existe o
    está suspendida).
  - *"Falta indicar la tienda."* (cuando no se ingresó el subdominio).

### Qué pasa al ingresar

Con los datos correctos, la app entra automáticamente a la interfaz que corresponde al
rol del usuario:

- **Vendedor** → el punto de venta (Inicio · Catálogo · Carrito · Ventas).
- **Administrador** → el panel de gestión (Inicio · Catálogo · Ventas · Más).

La sesión queda guardada, de modo que al reabrir la app el usuario entra directo sin
volver a escribir sus datos (hasta que cierre sesión o esta expire).

---

## 2. Inicio — Dashboard del vendedor

Es la primera pestaña del vendedor (**Inicio**). Muestra un **resumen de sus propias
ventas**, dentro de su sucursal, para el período elegido. Todo lo que se ve aquí está
acotado al vendedor autenticado; no ve las ventas de otros.

### Qué aparece en la pantalla

**Cabecera**
- Un saludo con el nombre: **"Hola, {Nombre} 👋"**.
- El título **"Mis ventas"**.
- A la derecha, el **botón de perfil** (avatar con la inicial); al tocarlo abre el perfil
  del usuario.

**Selector de período** (banda blanca bajo la cabecera, siempre visible)
- La etiqueta **"Período:"** y un botón para elegir entre **Hoy · Semana · Mes**.
- Cambiar el período **recalcula todo** lo de abajo (KPIs, más vendidos, ventas
  recientes). Se mantiene fijo aunque hagas scroll, para no perder de vista a qué período
  corresponden los números.

**Indicadores (KPIs)** — cuatro tarjetas con los totales del período:

| Tarjeta | Qué muestra |
|---------|-------------|
| **Ventas totales** | La suma de dinero vendido en el período (ej. `S/ 540.00`). |
| **Ventas** | El número de ventas registradas. |
| **Artículos vendidos** | La cantidad total de unidades vendidas. |
| **Ticket promedio** | El promedio por venta (ventas totales ÷ número de ventas). |

**Más vendidos** (tarjeta con encabezado + enlace **"Ver todas"**)
- Una lista de hasta **5 productos** ordenados por cantidad vendida. Cada fila muestra la
  **imagen**, el **nombre** (con la variación si aplica, ej. *"Polo básico · Rojo · M"*), la
  **cantidad vendida** y el **total** generado.
- Al tocar una fila se abre el **detalle de ese producto** (en la variación que se vendió).
- **"Ver todas"** abre el ranking completo del período.
- Si no hubo ventas: *"Aún no vendes nada en este período."*

**Ventas recientes** (tarjeta con encabezado + enlace **"Ver todas"**)
- Las últimas **5 ventas** del período. Cada fila muestra el **número de venta**, la **fecha
  relativa** (ej. *"hace 2 horas"*), el **método de pago** y el **total**.
- Al tocar una fila se abre el **detalle de la venta** (con sus productos).
- **"Ver todas"** lleva al historial completo (pestaña **Ventas**).
- Si no hubo ventas: *"Aún no registras ventas en este período."*

### Comportamientos útiles

- **Deslizar hacia abajo** para actualizar (pull-to-refresh) vuelve a traer las
  estadísticas.
- Estados claros de **cargando**, **error** (con botón *"Reintentar"*) y **vacío** por cada
  sección.
- Si un producto del ranking ya fue eliminado, al intentar abrirlo avisa: *"Este producto ya
  no está disponible."*

---

## 3. Inicio — Dashboard del administrador (Panel general)

Es la primera pestaña del administrador (**Inicio**). Cumple el mismo rol que el del
vendedor, pero con **alcance global**: resume las ventas de **todos los vendedores y
sucursales**, no solo las propias.

> **Deben ser congruentes.** El dashboard del admin usa **la misma estructura y las mismas
> interacciones** que el del vendedor (sección 2): misma cabecera (saludo + título +
> perfil), la banda de filtros fija arriba, **los mismos 4 KPIs**, la tarjeta de **Más
> vendidos** y la de **Ventas recientes**, con idénticos enlaces *"Ver todas"*,
> pull-to-refresh y estados de carga/error/vacío. Cambian el **alcance** (global vs. propio),
> el **color** de la interfaz (navy en admin, ámbar en vendedor) y **se agregan** los bloques
> que solo tienen sentido para un administrador.

### Igual que en el vendedor

- **Cabecera:** *"Hola, {Nombre} 👋"*, con el título **"Panel general"** y el **botón de
  perfil** a la derecha.
- **Período** (Hoy · Semana · Mes), fijo al hacer scroll y recalculando todo.
- **Los mismos 4 KPIs:** Ventas totales · Ventas · Artículos vendidos · Ticket promedio
  (aquí, sumando a todos los vendedores).
- **Más vendidos** (hasta 5: imagen, nombre + variación, cantidad, total; toque → detalle
  del producto; *"Ver todas"* → ranking completo). Vacío: *"Nadie vendió nada en este
  período."*
- **Ventas recientes** (últimas 5; toque → detalle de la venta; *"Ver todas"* → historial
  de ventas). Vacío: *"Ningún vendedor registró ventas en este período."*

### Lo que agrega el administrador

- **Filtro por sucursal.** Junto al período, un botón **"Sucursal:"** para acotar todo el
  panel a una sucursal (o *"Todas las sucursales"*). Al elegir una, los KPIs y listas se
  scopean a ella y se oculta el desglose *"Por sucursal"* (no tiene sentido con una sola).
- **Aviso de stock bajo.** Si hay productos por debajo del umbral, aparece una franja de
  alerta: *"N combinaciones con stock bajo (menos de X uds.)"*. Al tocarla abre la lista de
  stock crítico.
- **Por sucursal.** Un desglose con cada sucursal, su número de ventas y su total (solo
  cuando se ven todas las sucursales).
- **Por vendedor.** Un desglose con cada vendedor (avatar, nombre), su número de ventas y su
  total.
- **Detalle extra en las ventas recientes.** Cada fila muestra además el **vendedor** y la
  **sucursal** que hicieron la venta (en el vendedor no aplica, porque siempre es él).

### Comportamientos

Idénticos al del vendedor: **pull-to-refresh**, estados de **cargando / error (Reintentar) /
vacío**, y el aviso *"Este producto ya no existe"* si se intenta abrir un producto eliminado
del ranking. El selector de sucursal se elige desde una hoja inferior.

---

## 4. Catálogo — Vendedor

Segunda pestaña del vendedor (**Catálogo**). Es el punto de venta: explorar los productos de
**su sucursal** y agregarlos al carrito. El stock que se ve siempre es el de su sucursal.

### Qué aparece en la pantalla

**Cabecera**
- El título **"Catálogo"** y, debajo, un conteo: **"{N} productos"** (o **"{N} coinciden"** cuando
  hay un filtro activo).
- A la derecha, el botón **"QR"** para escanear un código.

**Banda de filtros** (blanca, bajo la cabecera)
- Un **buscador** por **nombre o código**.
- En una línea, el **selector de categoría** (*"Todas las categorías"*, con el árbol de categorías)
  y el control de **orden** (por nombre, precio, etc.).

**Rejilla de productos** (2 columnas). Cada tarjeta muestra:
- La **imagen** del producto.
- Un **overline**: la categoría (o `#código` si no tiene categoría).
- El **nombre**.
- El **código** (chip) junto a un **badge de stock** con color según el nivel (normal / bajo / sin
  stock).
- El **precio**: un **rango** cuando las variaciones cuestan distinto (*"S/ 39.90 – S/ 59.90"*), o
  un precio único.
- Un botón **"+"** para agregar al carrito (atenuado e inactivo si el producto está sin stock).

### Comportamientos útiles

- **Tocar una tarjeta** abre el **detalle del producto**.
- **Botón "+":**
  - Producto **simple** → lo **agrega al carrito** directo (con una vibración y un aviso *"… agregado"*).
  - Producto **con variaciones** → abre el **detalle** para elegir la variación primero.
- **Escanear QR** (botón de la cabecera): resuelve el código y abre el **detalle del producto**;
  si el QR era de una **variación** específica, la deja preseleccionada. Avisa si el código es de
  un **producto variable** (hay que escanear una variación) o si **no se encontró**.
- **Búsqueda con retardo** (espera a que dejes de escribir) y **paginación numerada**.
- **Se actualiza solo tras una venta:** al volver del checkout, la rejilla vuelve a cargar para
  reflejar el nuevo stock.
- Estados de **cargando**, **vacío** (*"Catálogo vacío"* sin productos, o *"Sin resultados"* con
  botón *"Limpiar filtros"* cuando hay un filtro) y **error**.

---

## 5. Catálogo — Administrador

Segunda pestaña del administrador (**Catálogo**). Es la **gestión del catálogo maestro**: la misma
lista de productos, pero para administrarlos (no para vender). Alcance **global** (todas las
sucursales), incluyendo los productos privados.

> **Deben ser congruentes.** Usa **la misma estructura** que el catálogo del vendedor (sección 4):
> misma cabecera con conteo, la misma banda de filtros (buscador + categoría + orden), la misma
> **rejilla de 2 columnas** con las mismas tarjetas (imagen, overline, nombre, código + stock,
> precio), paginación y estados. Cambian el **color** (navy), las **acciones** (gestión en vez de
> venta) y algunos datos extra propios de administración.

### Igual que en el vendedor

- **Cabecera** con el título **"Catálogo"** y el conteo (**"{N} productos"** / **"{N} coinciden"**).
- **Banda de filtros:** buscador por **nombre o código**, y en una línea el **selector de categoría**
  y el **orden**.
- **Rejilla de 2 columnas**: cada tarjeta con **imagen**, **overline** (categoría o `#código`),
  **nombre**, **código + badge de stock** y **precio** (rango o único). Toque → **detalle del
  producto**.
- **Búsqueda con retardo**, **paginación** y estados de **cargando / vacío / error** (*"Sin
  productos"* → *"Crea tu primer producto…"*, o *"Sin resultados"* + *"Limpiar filtros"*).

### Lo que cambia / agrega el administrador

- **Acciones de la cabecera:** en vez del botón QR, hay **papelera** (productos eliminados) y
  **"+" Nuevo producto**.
- **Filtro por estado:** chips **Todos · Públicos · Privados** (el vendedor solo ve los públicos;
  el admin también los privados/borrador).
- **Datos extra en cada tarjeta:** una línea de **estado** (Público / Privado, con su color) y, en
  productos variables, el **número de variaciones** (*"3 var."*).
- **Sin botón "+" de agregar al carrito** (el admin gestiona, no vende) ni escáner QR.
- El **badge de stock** no aparece en productos **variables** (su stock vive en las variaciones).
- **Se recarga al enfocar** la pantalla (un cambio hecho en otra pantalla puede haber modificado el
  catálogo).
- Tocar una tarjeta abre el **detalle del producto en modo administración** (desde donde se edita,
  se gestionan imágenes, variaciones, stock, etc.).

---

## 6. Detalle del producto — Vendedor

Pantalla a la que se llega al tocar un producto (o al escanear su QR). Su objetivo es **elegir la
variante y la cantidad, y agregar el producto al carrito**. El stock y el precio son los de la
sucursal del vendedor.

### Qué aparece en la pantalla

**Cabecera**
- Botón de **volver**, el título **"Detalle del producto"**, y —solo si el producto tiene
  descripción o etiquetas— un botón de **información** (ⓘ).

**Resumen** (arriba, imagen + datos, lado a lado)
- La **imagen** del producto (o de la variante elegida). Al tocarla se **amplía a pantalla completa**.
- Al costado: la **categoría**, el **nombre**, el **código** + el **badge de stock** (o el aviso
  *"Elige variante"* mientras no se elija una), y el **precio** — un **rango** si las variantes
  cuestan distinto, o el precio exacto una vez elegida la variante.
- El resumen **refleja la variante elegida**: al seleccionarla, cambian su imagen, código, stock y
  precio.

**Variantes** (solo productos con variaciones)
- Una tarjeta **"Variantes (N)"** con un **filtro por atributo** (Color, Talla…) y una **lista** de
  variantes. Cada fila muestra: **miniatura**, la **combinación** (*"Rojo · M"*), su **código +
  stock**, el **precio** y un **check** de selección.
- Se **toca una fila para elegirla** (y de nuevo para deseleccionarla). Las variantes **sin stock**
  se ven atenuadas y no se pueden elegir.

**Pie fijo** (abajo, siempre visible)
- Un selector de **cantidad** (– / +), el **Total** (precio × cantidad) y el botón principal, cuya
  etiqueta se adapta: **"Elige variante"**, **"Sin stock"** o **"Agregar al carrito"**.

**Hoja de información** (al tocar ⓘ)
- Muestra la **descripción corta**, la **descripción** larga y las **etiquetas** del producto.

### Comportamientos útiles

- **Al escanear un QR de una variante**, esa variante queda **preseleccionada** (incluso si está sin
  stock, para que se vea cuál es).
- La **cantidad se limita al stock** disponible (no se puede pasar).
- **Agregar al carrito** suma el producto (con su variante y cantidad), muestra un aviso y **vuelve**
  al catálogo.
- **Deslizar hacia abajo** actualiza stock y precio (pull-to-refresh).
- La **foto se amplía** a pantalla completa (tocar la imagen; cerrar con ✕ o tocando fuera).

---

## 7. Detalle del producto — Administrador

Pantalla a la que llega el admin al tocar un producto en su catálogo. A diferencia del vendedor
(que **vende**), aquí el objetivo es **gestionar** el producto: editarlo, administrar imágenes,
stock por sucursal, variaciones, etiquetas e imprimir.

> **Congruencia con el vendedor (sección 6).** Ambas pantallas leen **el mismo producto** con la
> misma identidad (nombre, código, precio, tipo) y el mismo tratamiento de **simple vs. variable**
> (una lista de variaciones con **filtro por atributo**, cada una con su código, precio y stock).
> Lo que cambia es el **propósito**: el admin no arma un carrito; administra. Y el **alcance del
> stock**: el vendedor ve el de **su** sucursal; el admin ve el de **todas**.

### Qué aparece en la pantalla

**Cabecera**
- Botón de **volver**, el **nombre del producto** como título, y un botón de **editar** (lápiz) que
  abre el formulario del producto.

**Galería de imágenes**
- Una tira horizontal con **todas las imágenes** (una **estrella** marca la destacada); si no hay,
  un marcador de posición.

**Acciones del producto**
- **"Imágenes (N)"** → administrar las imágenes (subir, destacar, eliminar).
- **"Etiquetas"** → abre una hoja para **imprimir etiquetas térmicas** (con su QR) del producto.

**Identidad**
- El **nombre**, el **código** (se puede copiar), unos **badges** (estado **Público/Privado**, tipo
  **Simple/Variable** y la **categoría**) y el **precio** (*"S/ X"*, o *"S/ X desde"* en variables).
- Debajo, la **descripción** y las **etiquetas** (tags) del producto, si tiene.

**Stock**
- **Producto simple:** una sección **"Stock por sucursal"** con un botón **Editar**, y la lista del
  stock en **cada sucursal**.
- **Producto variable:** **"Variaciones y stock (N)"** con un **filtro por atributo** y un botón
  **Agregar** (nueva variación). Cada variación es una tarjeta con: **miniatura**, **código** (copiable),
  la **combinación** (*"Rojo · M"*), el **precio**, botones de **editar** y **eliminar**, el **stock
  por sucursal** y un botón **"Editar stock"**.

**Eliminar**
- Al final, **"Eliminar producto"** (lo manda a la **papelera**, se puede restaurar).

### Comportamientos útiles

- **Deslizar hacia abajo** recarga el detalle (pull-to-refresh); estados de **cargando** y **error**
  (con *"Reintentar"*).
- Editar el producto, agregar/editar/eliminar variaciones o editar stock abren sus propias
  pantallas/hojas; al volver, el detalle se actualiza.
- **Imprimir etiquetas** se hace desde la hoja de "Etiquetas" (elige impresora y cantidad).

---

## 8. Carrito — Vendedor

Tercera pestaña del vendedor (**Carrito**). Es donde se **arma la venta**: revisar los productos
elegidos, ajustar cantidades, aplicar un descuento y pasar al cobro. **Es exclusiva del vendedor**:
el administrador gestiona el catálogo, no vende, así que no tiene carrito.

### Carrito vacío

Cuando no hay productos, se muestra el estado **"Tu carrito está vacío"** con el texto *"Agrega
productos desde el catálogo o escanea un código QR."*, un botón **"Escanear código QR"** y un enlace
**"Ir al catálogo"**.

### Qué aparece en la pantalla (con productos)

**Cabecera**
- El título **"Carrito"** y, debajo, el conteo **"{N} artículos"**.
- A la derecha, dos botones: **Vaciar** (papelera) y **QR** (escanear un código para agregar).

**Lista de productos** — se ve como un **ticket**: una hoja blanca con las líneas separadas por una
**línea punteada**. Cada línea muestra:
- La **imagen** del producto (o de la variante).
- El **nombre**.
- Una línea de detalle: la **variación** (si aplica, *"Rojo · M ·"*) y el **precio unitario**
  (*"S/ 50.00 c/u"*).
- Una **nota de stock**: *"{N} uds. en tu sucursal"*, o *"Máximo disponible en tu sucursal"* (en
  ámbar) cuando la cantidad ya llegó al tope.
- En la esquina, una **"×"** para **quitar** esa línea.
- Debajo, un **selector de cantidad** (– / +) que además permite **escribir** la cantidad, y el
  **total de la línea** (precio × cantidad) a la derecha.

**Resumen / cobro** (al pie, con forma de **recibo recortado**: borde dentado y líneas punteadas)
- **Subtotal** (solo aparece si hay un descuento que restar).
- **Descuento**: una línea tocable — *"Agregar descuento"* si no hay, o *"Descuento − S/ X"* si ya se
  aplicó.
- Una línea punteada y el **TOTAL** destacado.
- El botón principal **"Continuar al cobro"**, que lleva a la pantalla de **cobro** (checkout).

**Hoja de descuento** (al tocar la línea de descuento)
- Un campo para escribir el **monto** del descuento, con la ayuda *"Subtotal S/ X"*.
- No se permite un descuento **mayor al subtotal** (muestra un error).
- Botones **"Aplicar"** y, si ya había uno, **"Quitar"**.

### Comportamientos útiles

- **Cantidades limitadas al stock:** el "+" se detiene en el stock disponible de la sucursal; el "−"
  baja hasta 1. Para quitar del todo se usa la **"×"**, así un toque de más no borra la línea sin
  querer.
- **Escribir la cantidad** directamente en el campo del selector (también se limita al stock).
- **Escanear QR** (botón de la cabecera) agrega el producto al carrito directo; avisa si **no tiene
  stock**, si el código es de un **producto con variaciones** (hay que escanear una variación) o si
  **no se encontró**.
- **Vaciar** pide confirmación antes de quitar todos los productos.
- El **descuento** se edita en un borrador: el total **no cambia hasta tocar "Aplicar"**.
- El **badge de la pestaña Carrito** refleja el número de artículos, para tenerlo a la vista desde
  cualquier pantalla.

---

## 9. Cobro (Checkout) — Vendedor

A esta pantalla se llega desde el botón **"Continuar al cobro"** del carrito. Es el **último paso de
la venta**: confirmar el resumen, indicar el cliente y el método de pago, y **registrar la venta**
(que genera la boleta). También es **exclusiva del vendedor**.

### Qué aparece en la pantalla

**Cabecera**
- Botón de **volver** y el título **"Cobrar"**.

**Resumen ({N})**
- Una tarjeta que **lista cada producto** del carrito: la **cantidad** (*"2×"*), el **nombre** (con su
  variación si aplica) y el **total de esa línea**. Es de **solo lectura**: para cambiar cantidades se
  vuelve al carrito.

**Cliente**
- Un campo para el **nombre del cliente**. Si se deja vacío, la venta se registra a nombre de
  **"Cliente final"**.

**Método de pago**
- Una fila de opciones para elegir **uno**: **Efectivo · Yape · Plin · Transferencia · POS / Tarjeta**.
  *Efectivo* viene seleccionado por defecto.

**Notas (opcional)**
- Un campo de texto libre para una nota de la venta (ej. *"Cliente recurrente, pagó con QR…"*).

**Totales**
- El desglose final: **Subtotal**, **Descuento** (si se aplicó en el carrito) y **TOTAL**. El descuento
  se define en el carrito y llega aquí **ya aplicado** (no se edita en esta pantalla).

**Pie**
- El botón principal **"Cobrar S/ X"** (con el total), que registra la venta.

### Comportamientos útiles

- **Verificación de stock antes de cobrar.** Al tocar *"Cobrar"*, la app **revisa el stock actual** de
  cada producto en la sucursal. Si algo cambió y ya no alcanza, muestra el aviso **"El stock cambió"**
  con el detalle (disponible vs. en carrito) y dos opciones:
  - **Revisar carrito** (volver a ajustar a mano), o
  - **Ajustar** (baja las cantidades al stock disponible y quita las que quedaron en cero).
- **Al registrar la venta con éxito:** se **vacía el carrito**, se muestra el aviso *"Venta #N
  registrada"* y la app abre directamente la **boleta / detalle de la venta** en la pestaña **Ventas**.
  El catálogo se refresca para reflejar el nuevo stock.
- **La venta no es idempotente** (tiene un límite de ~30 s). Si no llega confirmación del servidor a
  tiempo, aparece **"Estado desconocido"**: pide **revisar la pestaña Ventas antes de volver a cobrar**,
  para **no duplicar** la venta.
- **Stock insuficiente** informado por el servidor: aviso *"Stock insuficiente"* con el mensaje,
  sugiriendo refrescar el catálogo y ajustar las cantidades.
- Cualquier otro error muestra un aviso claro y **no** registra la venta.

---

## 10. Ventas — Historial del vendedor

Cuarta pestaña del vendedor (**Ventas**). Es el **historial de sus propias ventas** (dentro de su
sucursal): buscarlas, filtrarlas y abrir cada una para ver su detalle, descargar o imprimir la boleta,
o anularla.

### Qué aparece en la pantalla

**Cabecera**
- El título **"Ventas"** y, debajo, un conteo: **"{N} en total"** (o **"{N} coinciden"** cuando hay un
  filtro activo).
- A la derecha (solo en equipos con impresora Bluetooth disponible), un botón de **impresora** para
  conectarla; su ícono indica si ya hay una conectada.

**Banda de filtros** (blanca, bajo la cabecera)
- Un **buscador** por **cliente o N° de venta**.
- En una línea, el **método de pago** (*"Todos los métodos"*, o uno: Efectivo · Yape · Plin ·
  Transferencia · POS / Tarjeta) y el control de **orden** (por fecha, total, etc.).
- En otra línea, un **rango de fechas**: **Desde** y **Hasta** (cada uno se elige con el calendario y
  se puede limpiar con su "×").

**Lista de ventas** — cada venta es una **tarjeta** que muestra: el **N° de venta** (*"#1043"*), una
línea de **fecha + método de pago**, el **cliente** y el **total**, con un chevron. Al tocarla se abre
el **detalle de la venta**.

### Comportamientos útiles

- **Búsqueda inteligente:** si escribes **solo números**, se toma como el **N° de venta exacto** y se
  busca esa venta puntual; si escribes texto, filtra por **nombre de cliente** (con un pequeño retardo
  al teclear).
- **Se actualiza al entrar** a la pestaña (una venta recién cobrada aparece arriba) y cada vez que
  cambias un filtro (vuelve a la primera página).
- **Paginación** para recorrer el historial.
- Estados de **cargando**, **error** y **vacío**: *"Aún no hay ventas"* (*"Registra una venta y
  aparecerá aquí."*) o *"Sin resultados"* con botón **"Limpiar filtros"** cuando hay filtros activos.

> **Equivalente del administrador.** El admin tiene su propia pestaña **Ventas** con **alcance global**
> (todas las sucursales y vendedores) y además **papelera** de ventas anuladas. Se describe por
> separado; comparte la misma tarjeta de venta y el mismo detalle.

---

## 11. Detalle de venta (Boleta) — Vendedor

Pantalla a la que se llega al tocar una venta en el historial (o al terminar un cobro). Muestra **todo
el detalle de la venta** y permite **descargar/imprimir la boleta** o **anular** la venta.

### Qué aparece en la pantalla

**Cabecera**
- Botón de **volver** y el título **"Venta #{N}"**.

**Datos de la venta** (una tarjeta)
- **Cliente**, **fecha y hora**, **método de pago** y, si tiene, las **notas** de la venta.

**Productos**
- La **lista de artículos** vendidos: cada uno con su **cantidad**, **nombre** (y variación si
  aplica) y el **total de la línea**. Muestra un estado de carga mientras llega el detalle completo.

**Totales**
- **Subtotal**, **Descuento** (si tuvo) y **TOTAL**.

**Acciones**
- **"Descargar boleta (PDF)"** — genera la boleta y abre el diálogo para **compartirla o guardarla**.
- **"Imprimir boleta"** — solo aparece si hay una **impresora térmica conectada**; envía la boleta a
  imprimir.
- **"Anular venta"** (destructivo) — pide confirmación; al anular **devuelve el stock** a la sucursal.

**Nota**
- Al pie: *"La boleta es el recibo interno (no es comprobante SUNAT)."*

### Comportamientos útiles

- **Carga el detalle completo** al abrir (la lista trae datos parciales; aquí se piden los artículos,
  el subtotal y las notas), y se **recarga al enfocar**.
- **Anular** es **irreversible**: devuelve el stock a la sucursal y vuelve al historial (que se
  refresca). Si algún artículo ya no se puede restaurar (**producto eliminado** del catálogo), avisa
  cuántos quedaron fuera.
- **Imprimir** requiere una impresora conectada (se conecta desde la pestaña **Ventas**); si falla,
  avisa que revises que esté encendida y en rango.
- Todas las acciones se **bloquean entre sí** mientras una está en curso (no se puede descargar,
  imprimir y anular a la vez).

---

## 12. Ventas — Administrador (global + papelera)

Segunda pestaña del administrador (**Ventas**). Cumple el mismo papel que el historial del vendedor,
pero con **alcance global**: las ventas de **todos los vendedores y sucursales**. Incluye además la
**papelera** de ventas anuladas.

> **Deben ser congruentes.** Usa **la misma estructura** que las Ventas del vendedor (secciones 10 y
> 11): misma cabecera con conteo, la misma banda de filtros (buscador + método + orden + rango de
> fechas), la misma **tarjeta de venta** y el mismo **detalle** (datos, productos, totales, descargar
> PDF / imprimir / anular, y la nota "no es comprobante SUNAT"). Cambian el **color** (navy), el
> **alcance** (global vs. propio) y algunos filtros y datos extra propios de administración.

### Igual que en el vendedor

- **Cabecera** "Ventas" con el conteo (**"{N} en total"** / **"{N} coinciden"**).
- **Filtros:** buscador por **cliente o N° de venta** (con **búsqueda inteligente**: solo dígitos = N°
  exacto), **método de pago**, **orden** y **rango de fechas** (Desde/Hasta).
- **Lista de tarjetas de venta** → detalle. **Búsqueda con retardo**, **paginación**, recarga al
  enfocar y estados de **cargando / error / vacío**.

### Lo que cambia / agrega el administrador

- **Alcance global:** ve las ventas de **todos los vendedores y sucursales**.
- **Acción de la cabecera:** en vez del botón de impresora, un botón de **papelera** (ventas anuladas).
- **Filtros extra de alcance:** **Sucursal** y **Vendedor** (se eligen desde una hoja: *"Todas las
  sucursales"* / *"Todos los vendedores"*).
- **Datos extra en cada tarjeta:** además del cliente, muestra el **vendedor** y la **sucursal** que
  hicieron la venta.
- Vacío sin filtros: *"Aún no hay ventas"* / *"Las ventas de todos los vendedores aparecerán aquí."*

### Detalle de venta (admin)

Congruente con la boleta del vendedor (sección 11), con estos extras:

- Los **datos** incluyen también el **Vendedor** y la **Sucursal** (además de cliente, fecha, método y
  notas).
- Si la venta está **anulada**, aparece arriba un **banner rojo** *"Venta anulada · {fecha}"* y el
  botón **Anular** ya **no** se muestra.
- **Imprimir:** como el admin no conecta la impresora desde la cabecera de Ventas, el botón sirve
  también para **Conectar impresora** cuando no hay ninguna (abre la hoja de impresora); si ya hay
  una, imprime.
- **Anular** devuelve el stock a la **sucursal original** de la venta (no a una sucursal propia).

### Papelera (ventas anuladas)

- Se llega desde el botón de **papelera** de la cabecera de Ventas.
- Lista de **ventas anuladas**: cada una con un ícono de papelera, el **N° de venta**, el **cliente**
  (· vendedor), la **fecha de anulación** y el **total**.
- Al tocar una, abre su **detalle en modo anulada** (solo lectura, sin botón de anular; se puede
  descargar/imprimir la boleta).
- **Deslizar para actualizar**, **paginación** y vacío: *"Papelera vacía"* / *"Las ventas anuladas
  aparecerán aquí."*

---

## 13. Perfil — Vendedor y Administrador

La pantalla de perfil de cada usuario: su **identidad**, los **datos de su cuenta** y las acciones de
**sesión**. **Es la misma pantalla para ambos roles**; solo cambian la insignia de rol y qué datos se
muestran.

> **Deben ser congruentes.** Vendedor y admin comparten exactamente la misma estructura (identidad +
> datos de la cuenta + sincronizar sesión + cerrar sesión + pie). Cambian el **color** de la
> interfaz (ámbar / navy), la **insignia de rol** y las **filas de datos** propias de cada rol.

### Cómo se llega

- Desde el **botón de perfil** (el avatar con la inicial) en la cabecera de **Inicio**.

### Qué aparece en la pantalla

**Cabecera**
- Botón de **volver** y el título **"Perfil"**.

**Identidad** (tarjeta centrada)
- El **avatar** con la inicial, el **nombre**, el **correo** y una **insignia de rol**:
  - **Vendedor:** ícono de tienda + el **nombre de su sucursal** (o *"Vendedor"*).
  - **Administrador:** ícono de escudo + **"Administrador"**.

**Datos de la cuenta** (tarjeta)
- **Vendedor:** Nombre · Correo · **Rol** (Vendedor) · **Sucursal** · **ID de vendedor**.
- **Administrador:** Nombre · Correo · **Rol** (Administrador) · **ID de usuario**.

**Sincronizar sesión** (botón)
- Vuelve a traer los datos de la cuenta (**sin cerrar sesión**), útil por ejemplo cuando el
  administrador reasigna la sucursal del vendedor y este quiere reflejar el cambio.

**Ayuda** (solo vendedor)
- Una fila **"Contactar soporte"** que abre **WhatsApp** (o el **correo** de soporte si no hay
  WhatsApp configurado).

**Cerrar sesión** (botón)
- Con confirmación.

**Pie**
- **"Versión {X}"** y el crédito **"Desarrollado por MiZonaOnline.com"** (enlace a su sitio).

### Comportamientos útiles

- **Sincronizar sesión:** muestra el aviso *"Sesión actualizada"*. Si la sesión **expiró** (401),
  avisa *"Sesión expirada"* y **cierra sesión**; si falla la conexión, *"No se pudo sincronizar"*.
- **Contactar soporte** (vendedor): abre WhatsApp; si no está configurado, el correo; si tampoco,
  avisa que aún no se configuró el contacto.
- **Cerrar sesión:** pide confirmación y vuelve al **Login**. La **tienda queda recordada** para el
  próximo ingreso (ver sección 1).

---

## 14. Gestión de productos — Administrador (formularios)

La sección 7 describe **ver** un producto. Desde ahí (y desde el catálogo admin) se hace toda la
**gestión del producto**: crearlo/editarlo, administrar sus imágenes, sus variaciones, su stock por
sucursal y la papelera. Esta sección cubre esos formularios. **Todo es exclusivo del administrador.**

### 14.1 Crear / editar producto

- **Cómo se llega:** botón **"Nuevo"** (cabecera del catálogo admin, sección 5) o **"Editar"** (detalle
  del producto, sección 7).
- **Cabecera:** *"Nuevo producto"* / *"Editar producto"*.
- **Campos:**
  - **Imagen destacada:** un recuadro para elegir una foto de la galería del teléfono. Al **editar**,
    la nueva imagen reemplaza a la destacada actual (la galería completa se gestiona aparte, en
    *Imágenes*).
  - **Código**, **Nombre**, **Descripción corta**, **Descripción**.
  - **Tipo** (Simple / Variable) — **solo al crear**; es **inmutable** después (las variaciones
    dependen de él).
  - **Atributos del producto** — solo al **crear un producto variable**: se eligen los atributos que
    usará; al guardar, la app pasa directo a **crear la primera variación**.
  - **Estado** (Público / Privado), **Categoría** (selector) y **Etiquetas** (multi-selección).
  - **Precio final** (en variables es el **precio base**), **Valor unitario** y **Unidad de medida**.
- **Comportamientos:** al crear, el producto nace con **stock 0 en todas las sucursales**. Botón
  **"Crear producto"** / **"Guardar cambios"** (se habilita con los campos válidos); si algo falla,
  aviso con el mensaje del servidor. Los selectores de categoría, etiquetas y atributos se eligen desde
  hojas inferiores (si no hay etiquetas/atributos, avisa que se crean en *Gestión*).

### 14.2 Imágenes del producto

- **Cómo se llega:** botón **"Imágenes (N)"** del detalle del producto.
- **Contenido:** el nombre del producto, un contador **"N de 10 imágenes"** y una **rejilla** de
  miniaturas. Cada una muestra la marca **"Destacada"** (si lo es) y dos acciones: **destacar**
  (estrella) y **eliminar**.
- **Subir:** botón **"Subir imágenes (N disponibles)"** — permite elegir **varias** a la vez (hasta 10
  en total; **5 MB** por archivo; jpg/png/webp). **La primera que subas es la destacada.**
- **Comportamientos:** eliminar pide confirmación; si borras la **destacada**, se destaca la siguiente
  automáticamente. Estados de cargando / error.

### 14.3 Crear / editar variación

- **Cómo se llega:** botón **"Agregar"** o el **lápiz** de una variación (detalle de un producto
  variable, sección 7).
- **Cabecera:** *"Nueva variación"* / *"Editar variación"*, con el **nombre del producto** (y la
  combinación al editar).
- **Campos:**
  - **Imagen de referencia** (opcional).
  - **Combinación** (solo al crear): **un valor por cada atributo** del producto. Si el producto aún no
    tiene variaciones, esta **primera variación fija el set de atributos** (primero eliges cuáles). La
    combinación es **inmutable** al editar.
  - **Código:** al crear, si lo dejas **vacío**, el servidor lo **genera** con el producto y los
    valores.
  - **Precio final** y **Valor unitario** (al crear, **heredan** los del producto como valores
    editables).
- **Comportamientos:** la variación nace con **stock 0** (se asigna desde el detalle). Errores del
  servidor (422): no es variable, atributos incorrectos, o **combinación/código duplicados**.

### 14.4 Editar stock (por sucursal)

- **Cómo se llega:** **"Editar"** (producto simple) o **"Editar stock"** (una variación), desde el
  detalle.
- **Cabecera:** *"Editar stock"*, con el producto (y la variación).
- **Contenido:** una **fila por sucursal** con su nombre y un **campo numérico**.
- **Regla clave:** solo se actualizan las **sucursales que cambies**; las demás **conservan** su stock.
  Botón **"Guardar cambios"** (o *"Sin cambios"* mientras no edites nada).

### 14.5 Papelera de productos

- **Cómo se llega:** botón de **papelera** en la cabecera del catálogo admin.
- **Contenido:** lista de **productos eliminados** (miniatura atenuada, nombre, código, precio) con dos
  acciones por fila: **Restaurar** y **Eliminar permanentemente**.
- **Restaurar:** lo devuelve al catálogo.
- **Eliminar permanentemente:** con una **confirmación fuerte**; borra imágenes, variaciones y
  asignaciones (las **ventas ya registradas conservan** su detalle histórico). **Irreversible.**
- **Pull-to-refresh**, **paginación** y vacío *"Papelera vacía"*.

---

## 15. Más (Gestión) — Administrador

Cuarta pestaña del administrador (**Más**). Es el **índice de gestión**: el punto de entrada a los
módulos de administración del **catálogo maestro**, la **organización** y la **facturación**. Cada
fila abre su propia pantalla.

### Qué aparece en la pantalla

**Cabecera**
- El título **"Gestión"**.

**Accesos**, agrupados en tarjetas; cada fila con **ícono**, **nombre** y una **descripción**:

- **Catálogo maestro**
  - **Categorías** — *"Organiza el árbol del catálogo"* (sección 16).
  - **Etiquetas** — *"Tags que agrupan productos"*.
  - **Atributos** — *"Color, Talla… y sus valores"* (sección 17).
- **Organización**
  - **Sucursales** — *"Puntos de venta e inventario"*.
  - **Usuarios** — *"Vendedores y administradores"*.
- **Facturación**
  - **Datos de la empresa** — *"Emisor de las boletas y facturas"*.

---

## 16. Categorías — Administrador

- **Cómo se llega:** pestaña **"Más"** → **Categorías**.
- **Cabecera:** *"Categorías"* con un botón **"+"** (nueva).
- **Buscador** por nombre.
- **Lista jerárquica (árbol):** cada categoría con un ícono (carpeta si tiene subcategorías), su
  **nombre**, el **conteo de productos** e **indentación por nivel**; con botones de **editar** y
  **eliminar**.
- **Crear / editar** (hoja inferior): **Nombre** + **Categoría padre** (selector; *"Ninguna (raíz)"*).
  No se puede anidar una categoría bajo **sí misma ni bajo sus descendientes**.
- **Eliminar:** con confirmación; si tiene **subcategorías o productos**, el servidor lo **rechaza**
  (422) explicando qué mover primero.
- **Pull-to-refresh** y vacío *"Sin categorías"*.

---

## 17. Atributos — Administrador

Los atributos (ej. **Color**, **Talla**) y sus **valores** son la base de las **variaciones** de un
producto (sección 14.3).

- **Cómo se llega:** pestaña **"Más"** → **Atributos**.
- **Cabecera:** *"Atributos"* con un botón **"+"**.
- **Lista:** cada atributo es una tarjeta con su **nombre**, el **conteo de valores** y sus **valores
  como chips**; con botones de **editar** y **eliminar**.
- **Crear / editar** (hoja inferior): **Nombre** + una **lista de valores** (cada uno editable, con una
  **"×"** para quitarlo) y un botón **"Añadir valor"**.
- **Reglas:** el **orden** define la posición; **renombrar** un valor mantiene su vínculo con las
  variaciones (se renombra por id); **quitar un valor en uso** por alguna variación lo **rechaza** el
  servidor (422).
- **Eliminar atributo:** con confirmación (borra también **sus valores**).
- **Pull-to-refresh** y vacío *"Sin atributos"*.

---

## 18. Etiquetas — Administrador

Las etiquetas (tags) son marcas libres que **agrupan productos** (ej. *"Novedad"*, *"Verano"*) y se
muestran en el detalle del producto.

- **Cómo se llega:** pestaña **"Más"** → **Etiquetas**.
- **Cabecera:** *"Etiquetas"* con un botón **"+"** (nueva).
- **Lista:** cada etiqueta como una fila con un ícono, su **nombre** y el **conteo de productos** que
  la usan; con botones de **editar** y **eliminar**.
- **Crear / editar** (hoja inferior): solo el **Nombre**.
- **Eliminar:** con confirmación; si la etiqueta está **en uso**, avisa de **cuántos productos** se
  quitará.
- **Pull-to-refresh** y vacío *"Sin etiquetas"*.

---

## 19. Sucursales — Administrador

Las sucursales son los **puntos de venta**; cada una lleva su **propio stock** (una variación tiene
stock por sucursal) y a ella se asignan los vendedores.

- **Cómo se llega:** pestaña **"Más"** → **Sucursales**.
- **Cabecera:** *"Sucursales"* con un botón **"+"** (nueva).
- **Lista:** cada sucursal como una fila con su **ícono** (atenuado si está inactiva), el **nombre**
  (con un badge **"Inactiva"** cuando corresponde), la **dirección** (si tiene) y el **conteo de
  vendedores** asignados; con botones de **editar** y **eliminar**.
- **Crear / editar** (hoja inferior): **Nombre**, **Dirección** (opcional) y un **interruptor
  "Activa"** (*"Las inactivas no operan ventas"*). Al **crear**, se inicializa con **stock 0 en todo
  el catálogo**.
- **Eliminar:** con confirmación (**irreversible**); avisa si la sucursal **tiene vendedores
  asignados**.
- **Pull-to-refresh** y vacío *"Sin sucursales"*.

---

## 20. Usuarios — Administrador

La gestión del **equipo**: vendedores y administradores.

### La lista

- **Cómo se llega:** pestaña **"Más"** → **Usuarios**.
- **Cabecera:** *"Usuarios"* con un botón **"Nuevo usuario"**.
- **Filtros:** un **buscador** por nombre y **chips de rol** (*Todos · Vendedores · Admins*).
- **Lista:** cada usuario como una fila con su **avatar**, el **nombre** (con un badge **"Tú"** si eres
  tú), el **correo**, un **badge de rol** (Vendedor / Administrador) y, si es vendedor, un **badge con
  su sucursal**; con **editar** y **eliminar** (este último **no** aparece para tu propio usuario).
- **Búsqueda con retardo**, recarga al enfocar, **paginación** y estados de **cargando / error /
  vacío**.

### Crear / editar usuario (pantalla)

- **Cabecera:** *"Nuevo usuario"* / *"Editar usuario"*.
- **Campos:**
  - **Nombre** y **Correo electrónico**.
  - **Contraseña:** **requerida al crear**; al **editar** se puede dejar **vacía para no cambiarla**.
    Tiene un botón de **mostrar/ocultar**.
  - **Rol** (Vendedor / Administrador).
  - **Sucursal:** solo para **vendedores** (un administrador no tiene sucursal).
- **Reglas:** un **vendedor necesita una sucursal** (el servidor la exige, 422 si falta); **no puedes
  eliminarte a ti mismo** (422); el servidor valida la **fuerza de la contraseña** y el **correo
  único**.

---

## 21. Datos de la empresa — Administrador

Es el **emisor** de las boletas y facturas: un **único registro** de la tienda (no una lista) con los
datos que se imprimen en la **cabecera de cada comprobante**.

- **Cómo se llega:** pestaña **"Más"** → **Datos de la empresa**.
- **Cabecera:** *"Datos de la empresa"*.
- Arriba, una nota: *"Estos datos identifican al emisor y se imprimen en la cabecera de cada boleta o
  factura."*
- **Identificación:**
  - **RUC** — 11 dígitos (se valida; el servidor lo revisa también).
  - **Razón social** — obligatoria.
  - **Nombre comercial** — opcional (si se deja vacío se usa la razón social).
- **Domicilio fiscal** (opcional; se usa en reportes y el pie del ticket): **Dirección**, **Distrito**,
  **Provincia**, **Departamento** y **Ubigeo** (código de 6 dígitos).
- **Guardar:** botón **"Guardar datos"**, que se habilita con un **RUC válido** y la **razón social**.
- **Comportamientos:** al abrir **carga los datos ya configurados** (o queda en blanco la primera vez);
  el servidor re-valida el RUC y los campos obligatorios.
