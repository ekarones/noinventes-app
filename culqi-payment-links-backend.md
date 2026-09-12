# Integración Culqi — Links de pago (backend)

Especificación para el equipo de backend. Define **qué debe implementar el
servidor** para que la app móvil pueda cobrar con **links de pago de Culqi
(CulqiLink)**. La app **no** puede hablar con Culqi directamente (la llave
secreta vive solo en el servidor), así que el backend hace de intermediario.

> Estado: **POC en modo prueba** con una **única cuenta Culqi de test**
> (llaves `*_test_*`). Más adelante **cada tenant tendrá su propia cuenta**
> Culqi — ver la sección *Multitenant / llaves*. El contrato con la app **no
> cambia** entre ambas etapas.

---

## 1. Contexto

- **Producto:** [CulqiLink](https://docs.culqi.com/es/documentacion/pagos-links/generar-un-link-de-pago/)
  — una **página de pago hospedada por Culqi**. Se crea vía API, devuelve una
  **URL** que se comparte con el cliente; el cliente paga ahí (tarjeta, **Yape**,
  etc.), con **3DS** y toda la parte sensible manejada por Culqi. Nosotros nunca
  renderizamos el formulario de tarjeta ni tocamos datos PCI.
- **App:** Expo / React Native. Muestra el link como **URL + QR + botón
  compartir**, y consulta el estado hasta que el pago se confirma.
- **Backend:** Laravel multitenant (`/api/mobile/*`, header `X-Tenant`, Sanctum).
  Guarda la llave secreta, crea el link contra Culqi, recibe el webhook de Culqi
  y expone el estado a la app.

### Flujo end-to-end

```
App                         Backend (Laravel)                 Culqi
 │  POST /payment-links  ───►                                   
 │   { amount, title }        │  POST https://api.culqi.com/v2/links
 │                            │   (Authorization: Bearer sk_test_…) ──►
 │                            │                            ◄── { id, url, … }
 │                            │  guarda payment_link (status=pending)
 │   ◄── { id, url, status }  │
 │
 │  muestra URL + QR, el cliente abre el link y paga ─────────────► (Culqi hospeda)
 │
 │                            ◄── Webhook  (charge/order success) ── Culqi
 │                            │  marca payment_link.status = paid
 │  GET /payment-links/{id}  ►│  (polling cada ~4s)
 │   ◄── { status: "paid" }   │
 │  ✅ pantalla de éxito
```

---

## 2. Alcance del POC

- Cobro con **monto libre** (el admin escribe el importe) — **no** toca ventas
  ni inventario todavía. Es un cobro suelto para probar el circuito completo.
- Gateado como **admin** (`admin-api`), bajo `/api/mobile/admin/payment-links`.
  (Si luego se quiere que el **vendedor** cobre desde el POS, se agrega una
  variante `seller-api`; el shape es el mismo.)
- Métodos por defecto: **tarjeta + Yape**. La app puede mandar el subconjunto.

Más adelante engancharemos esto al checkout (cobrar el total del carrito y, al
confirmarse el pago, registrar la venta) — **fuera del alcance de este POC**.

---

## 3. Contrato app ↔ backend  (lo que la app va a consumir)

Convenciones estándar del proyecto (ver `api-mobile.md`): prefijo
`/api/mobile`, header `X-Tenant`, `Authorization: Bearer <token>`, **montos como
string con 2 decimales** (`"199.90"`), errores `{ "message": "…" }`, fechas ISO
8601, paginación `{ data, meta }`.

### 3.1 POST `/api/mobile/admin/payment-links` — crear link

**Body:**

| Campo | Tipo | Req. | Descripción |
|-------|------|------|-------------|
| `amount` | string decimal | ✔ | Monto en **soles**, 2 decimales (`"199.90"`). El server lo convierte a **céntimos** para Culqi (ver §4). |
| `title` | string | ✔ | Nombre del cobro (se muestra en la página de Culqi). Máx ~50. |
| `description` | string \| null | ✕ | Detalle opcional. |
| `methods` | string[] | ✕ | Subconjunto de `["tarjeta","yape","bancaMovil","agente","billetera","cuotealo"]`. Default server: `["tarjeta","yape"]`. |
| `expiration_hours` | int | ✕ | Vigencia del link en horas. Default server: `24`. |

**Respuesta `201`:**

```json
{
  "payment_link": {
    "id": 12,
    "culqi_link_id": "lp_test_xxxxxxxx",
    "url": "https://link.culqi.com/lp_test_xxxxxxxx",
    "title": "Cobro mostrador",
    "amount": "199.90",
    "currency": "PEN",
    "status": "pending",
    "methods": ["tarjeta", "yape"],
    "created_at": "2026-09-10T14:30:00-05:00",
    "expiration_at": "2026-09-11T14:30:00-05:00"
  }
}
```

- **`url`** es lo esencial para la app (se muestra, se comparte y se genera el QR con ella).
- **`id`** es el id **nuestro** (lo usa la app para el polling); `culqi_link_id` es el de Culqi.

**Errores:**
- `422` — validación (`amount` inválido, por debajo del **mínimo de Culqi**, `title` vacío, `methods` fuera del set). Devolver el `message` accionable (propagar el de Culqi si aplica).
- `502/503` — Culqi no responde / error de la pasarela. `message` claro para reintentar.

### 3.2 GET `/api/mobile/admin/payment-links/{id}` — estado (polling)

La app llama esto cada ~4 s mientras la pantalla de cobro está abierta.

**Respuesta `200`:**

```json
{
  "payment_link": {
    "id": 12,
    "culqi_link_id": "lp_test_xxxxxxxx",
    "url": "https://link.culqi.com/lp_test_xxxxxxxx",
    "title": "Cobro mostrador",
    "amount": "199.90",
    "currency": "PEN",
    "status": "paid",
    "methods": ["tarjeta", "yape"],
    "charge_id": "chr_test_yyyyyyyy",
    "paid_at": "2026-09-10T14:33:10-05:00",
    "created_at": "2026-09-10T14:30:00-05:00",
    "expiration_at": "2026-09-11T14:30:00-05:00"
  }
}
```

- **`status`**: `pending` | `paid` | `expired` | `cancelled`.
- `charge_id` / `paid_at` solo cuando `status = paid`.
- **Fuente del estado:** idealmente lo actualiza el **webhook** (§5) y este GET
  lo devuelve desde nuestra BD (barato). Si el webhook aún no está, que el GET
  consulte a Culqi en vivo (el estado del link / sus cargos).

### 3.3 GET `/api/mobile/admin/payment-links` — historial *(opcional, recomendado)*

Paginado (`per_page` default 20). Filtro `?status=`. Mismo `payment_link` por
fila + `{ meta: { current_page, last_page, per_page, total } }`. Orden `id DESC`.
Útil para una pantalla de "links generados".

### 3.4 DELETE `/api/mobile/admin/payment-links/{id}` — anular *(opcional)*

Expira/anula un link `pending` (en Culqi si su API lo permite, y localmente).
`422` si ya está `paid`.

---

## 4. Lado Culqi (lo que el backend hace contra la pasarela)

> Los **nombres exactos de campos** de Culqi confírmenlos en los apidocs
> ([Links](https://apidocs.culqi.com/#tag/Links/operation/crear-link-pago)) con
> la cuenta de prueba — abajo va lo conceptual, no el JSON textual de Culqi.

- **Crear link:** `POST https://api.culqi.com/v2/links` con
  `Authorization: Bearer <SK_TEST>`. Campos: **nombre/título**, **moneda**
  (`PEN`), **monto en céntimos** (entero), **número de veces / uso** (para
  cobro único), **métodos de pago** y **expiración**. Devuelve el id del link y
  su URL pública.
- **⚠️ Monto en céntimos:** Culqi trabaja en **enteros de céntimos**
  (`"199.90"` soles → `19990`). El server convierte al crear y **valida el
  mínimo de Culqi** (p. ej. ~`S/ 3.00` para tarjeta; confirmar el mínimo vigente
  y propagar el `422` de Culqi si el monto es menor).
- **Consultar estado:** por el evento del **webhook** (preferido) o consultando
  el link / sus `charges` en Culqi.
- **Moneda:** `PEN` fija por ahora.

---

## 5. Webhook (confirmación de pago)

Como el cliente puede pagar minutos/horas después, **el webhook es la vía
correcta** para saber que se pagó (el polling de la app es solo para refrescar
la UI mientras está abierta).

- **Endpoint:** algo como `POST /webhooks/culqi` (server-to-server, **fuera** de
  `/api/mobile`, sin `X-Tenant` ni Sanctum — Culqi no manda esos headers).
- **Evento:** el de confirmación de cargo/orden del link (p. ej.
  `charge.creation.succeeded` / `order.status.changed` — confirmar el nombre en
  [Webhooks](https://docs.culqi.com/es/documentacion/pagos-online/webhooks/)).
- **Qué hacer:** mapear el evento → nuestro `payment_link` (por `culqi_link_id`
  / `charge`), setear `status=paid`, `charge_id`, `paid_at`.
- **Seguridad:** validar la firma/secreto del webhook de Culqi. **Idempotencia**
  (Culqi puede reintentar el mismo evento — no procesar dos veces).
- **Multitenant:** el webhook llega **sin** tenant. Resolver el tenant desde
  **nuestro** registro `payment_link` (que guarda `tenant_id` al crearse). Ver §7.

---

## 6. Modelo de datos sugerido

Tabla `payment_links` (por tenant):

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | pk | id interno (el que usa la app). |
| `tenant_id` | fk | scope multitenant. |
| `culqi_link_id` | string | id del link en Culqi. |
| `url` | string | URL pública del link. |
| `title` | string | |
| `amount` | int | **céntimos**. |
| `currency` | string | `PEN`. |
| `status` | enum | `pending` \| `paid` \| `expired` \| `cancelled`. |
| `methods` | json | métodos habilitados. |
| `charge_id` | string \| null | seteado al pagarse. |
| `paid_at` | datetime \| null | |
| `expiration_at` | datetime \| null | |
| `created_by` | fk users | quién lo generó. |
| timestamps | | |

(El endpoint devuelve `amount` como **string en soles**; en BD conviene
guardarlo en **céntimos** para no perder precisión — mismo criterio que Culqi.)

---

## 7. Multitenant / llaves / seguridad

- **Hoy (POC):** una sola cuenta Culqi de prueba. Llaves en `.env`:
  `CULQI_PUBLIC_KEY=pk_test_…`, `CULQI_SECRET_KEY=sk_test_…`. El backend usa esas
  para todos los tenants de prueba.
- **Después (producción):** **cada tenant su propia cuenta** → guardar
  `culqi_public_key` / `culqi_secret_key` en el registro del **tenant** y usar
  las del tenant activo (`CurrentTenant`). **El contrato con la app es idéntico**
  — la app nunca ve ninguna llave.
- **La llave secreta NUNCA sale del servidor** (ni en respuestas, ni logs, ni a
  la app). La app no necesita la llave pública para links (Culqi hospeda la
  página).
- El webhook, al no traer tenant, se resuelve por el `payment_link` local
  (que ya tiene `tenant_id`). Si en producción cada tenant tiene su cuenta, el
  `culqi_link_id` es único global y basta para ubicar el registro.

---

## 8. Pruebas

- Usar **llaves de test** y las [tarjetas de prueba de Culqi](https://docs.culqi.com/es/documentacion/pagos-online/tarjetas-de-prueba/)
  (aprobada / rechazada / que dispara 3DS) y Yape de prueba.
- Verificar el ciclo: crear link → abrir URL → pagar (test) → llega webhook →
  `GET /{id}` devuelve `paid`.
- Verificar expiración y un intento de pago rechazado (el `status` no debe
  quedar `paid`).

---

## 9. Checklist para el backend

- [ ] Migración `payment_links` (§6).
- [ ] Config de llaves Culqi de test en `.env` (§7).
- [ ] `POST /api/mobile/admin/payment-links` → crea link en Culqi + guarda registro (§3.1, §4).
- [ ] `GET /api/mobile/admin/payment-links/{id}` → estado (§3.2).
- [ ] (Opcional) `GET /api/mobile/admin/payment-links` (historial) y `DELETE` (anular) (§3.3–3.4).
- [ ] `POST /webhooks/culqi` con validación de firma + idempotencia + marca `paid` (§5).
- [ ] Conversión soles↔céntimos y validación de monto mínimo (§4).
- [ ] Errores con `{ message }` accionable (§3).

---

## Fuentes

- CulqiLink — generar link de pago: <https://docs.culqi.com/es/documentacion/pagos-links/generar-un-link-de-pago/>
- API Links (crear): <https://apidocs.culqi.com/#tag/Links/operation/crear-link-pago>
- Webhooks: <https://docs.culqi.com/es/documentacion/pagos-online/webhooks/>
- Tarjetas de prueba: <https://docs.culqi.com/es/documentacion/pagos-online/tarjetas-de-prueba/>
- API general: <https://apidocs.culqi.com/>
