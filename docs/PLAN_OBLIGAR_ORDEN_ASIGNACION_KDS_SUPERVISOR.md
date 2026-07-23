# Plan: Obligar orden de asignación — KDS Supervisor y Cocineros

**Versión:** 1.4  
**Fecha:** Julio 2026  
**Proyecto:** App Cocina (`appcocina`) + Backend / Dashboard (`backend-gambusinas`) + App Mozos (`gambusinas`)  
**Estado:** Pendiente de implementación  
**Alcance:**
- Panel `configuracion.html` → pestaña **Cocina** (2 flags)
- Tablero KDS Supervisor (`ComandaStyleSupervi` / `COCINA_SUPERVISOR`)
- Flujo KDS de **marcar platos en cantidad** → **Finalizar** (lote / toolbar), permitiendo cerrar toda la cantidad del `#1` del mismo cocinero
- Acción **Solicitar Orden** cuando se intenta cerrar un `#2+` (en lugar de finalizar directo)
- **Panel de Gestión** en App Mozos (solo Admin / permiso nuevo en `roles.html`)
- **Notificación al admin en el Dashboard** (misma orden/petición del Panel de Gestión)
- Override directo solo para **admin**; supervisor pide autorización vía solicitud

**Documentación relacionada:**
- [`PLAN_NUMERACION_GLOBAL_TEMPORIZADORES.md`](./PLAN_NUMERACION_GLOBAL_TEMPORIZADORES.md) — `#N` global por cocinero (más viejo = `#1`)
- [`PLAN_ORDEN_NUMERACION_ESPACIO_PLATOS_COMPLETO.md`](./PLAN_ORDEN_NUMERACION_ESPACIO_PLATOS_COMPLETO.md) — orden cronológico en Ver Cocina Completo
- [`PLAN_IMPLEMENTACION_SUPERVISOR_TOMA_PLATOS.md`](./PLAN_IMPLEMENTACION_SUPERVISOR_TOMA_PLATOS.md) — toma/asignación desde supervisor
- [`../docs/REGLA_BLOQUEO_EDICION_COMANDAS_TOMADAS_COCINA.md`](../../docs/REGLA_BLOQUEO_EDICION_COMANDAS_TOMADAS_COCINA.md) — patrón de flag en `configuracionSistema` + `configuracion.html`

---

## 1. Resumen ejecutivo

### Objetivo

Cuando un plato está **en proceso** (asignado a un cocinero vía `procesandoPor`), el sistema debe **obligar a seguir el número de orden de ese cocinero**.

**Regla central:** de un cocinero **solo se puede finalizar el plato cuyo número de orden es `#1`**. No se puede finalizar su `#2`, `#3`, etc., mientras exista un `#1` pendiente. Cada cocinero tiene su propia cola (varios cocineros pueden tener su propio `#1` a la vez).

Eso aplica al flujo real del KDS:

1. **Marcar** platos (click → estado visual `seleccionado` / verde ✓), donde la línea ya muestra su **cantidad** (`3 Pan solo`, `2 Papa`, etc.).
2. Pulsar **Finalizar** en la barra (lote de todos los marcados) o finalizar de forma equivalente.

### Qué pasa con un `#2+` (no es el primero)

En lugar de finalizar directo, la UI ofrece **Solicitar Orden**:

- Envía una **petición/solicitud** al **Panel de Gestión** de la App Mozos (pantalla pensada para Admins).
- **Igualmente** notifica la orden al **admin en el Dashboard** (campana / centro de notificaciones del panel web).
- El admin recibe la solicitud en App Mozos y/o Dashboard (p. ej. “Supervisor pide finalizar Papa `#2` de Juan fuera de orden”) y puede aprobar/rechazar.
- Solo tras autorización (o si el actor es admin) se puede cerrar ese plato fuera de secuencia.

### Configuración (2 flags, ambos ON por defecto)

| Flag | Checkbox Cocina | Default | Efecto |
|------|-----------------|---------|--------|
| `obligarOrdenAsignacion` | *Obligar orden para cocineros y el supervisor* | **ON** | Obliga cola `#1` primero |
| `solicitudOrdenFueraDeCola` | *Solicitar orden al admin (platos fuera de secuencia)* | **ON** | Si intentan `#2+` → **Solicitar Orden** (no finalizar). Si **OFF**, el **supervisor puede finalizar `#2`/`#3`** sin pedir permiso |

### Matriz de interacción (supervisor)

| Obligar orden | Solicitud orden | Acción del supervisor sobre `#2+` |
|---------------|-----------------|-----------------------------------|
| OFF | * | Finalizar libre (sin orden) |
| ON | ON (default) | **No** finaliza → botón/acción **Solicitar Orden** → Panel Admin |
| ON | OFF | **Sí** puede finalizar `#2`/`#3` sin solicitud |

Admin (`rol === 'admin'`): siempre puede finalizar cualquier `#N` sin solicitud.

Cocinero: con obligar orden ON, no finaliza `#2+`. En v1 **no** tiene Solicitar Orden (queda bloqueado con mensaje); se puede ampliar después.

### Ejemplo operativo

Hay 2 cocineros con platos asignados (cantidades en la línea KDS):

| Cocinero | Plato (cantidad × nombre) | Número de cola |
|----------|---------------------------|----------------|
| Juan | `2 Pan solo` | `#1` |
| Juan | `1 Papa a la huancaína` | `#2` |
| Martha | `3 Lomo saltado` | `#1` |
| Martha | `1 Chaufa` | `#2` |
| Martha | `1 Sopa` | `#3` |

Reglas:

1. Cada cocinero **empieza su propia secuencia en `#1`**. Juan y Martha pueden tener ambos un `#1` a la vez.
2. El supervisor ve junto al nombre del cocinero el número: `👨‍🍳 Juan #1`, `👨‍🍳 Juan #2`, etc.
3. **Solo se puede finalizar directo** el `#1` de Juan (los 2 Pan) y el `#1` de Martha (los 3 Lomo). Marcar en cantidad el `#1` **sí está permitido**.
4. Intentar cerrar Papa (`Juan #2`) o Chaufa (`Martha #2`) → **no Finalizar**; aparece **Solicitar Orden** (si flag solicitud ON) → llega al Panel de Gestión del admin **y** se notifica al admin en el **Dashboard**.
5. En un mismo lote sí se puede marcar Juan `#1` + Martha `#1` y Finalizar ambos.
6. Al finalizar Pan (`#1` de Juan), Papa pasa a `#1` y entonces sí se finaliza directo.
7. Un **admin** sí puede marcar y finalizar Papa aunque sea `#2` (sin solicitud).
8. Si **Solicitud orden** está **desactivada** en configuración, el supervisor **sí** puede finalizar `#2`/`#3` aunque Obligar orden siga activo.

La numeración es la **misma lógica** que usa la vista de cocineros: **más antiguo primero = `#1`**, criterio `procesandoPor.timestamp`.
---

## 2. Situación actual

| Pieza | Hoy |
|-------|-----|
| Asignación de plato | `procesandoPor: { cocineroId, nombre, alias, timestamp }` |
| Marcar plato en KDS | Click en línea → ciclo visual (`normal` → `dejar`/`procesando` → `seleccionado` verde ✓). La línea muestra `cantidad + nombre` (`2 Pan solo`) |
| Finalizar lote | Toolbar / `handleFinalizarPlatosGlobal`: toma todos los `platoStates === 'seleccionado'` (+ legacy `platosChecked`) y llama `finalizar` por cada uno |
| Finalizar plato API | `PUT /api/comanda/:id/plato/:platoId/finalizar` — cierra **toda la cantidad** de la línea; supervisor/admin pueden finalizar platos de otros (`utilidad-supervisor`) |
| Badge en supervisor | Muestra alias/nombre del cocinero, **sin** `#N` |
| Numeración cocineros | `asignarNumeroGlobal()` en `numeracionTimersMonitor.js` — `#1` = unidad más antigua visible del cocinero |
| Config cocina en panel | Pestaña Cocina existe; campos legacy (`alertaAmarillaMin`, etc.) **no** están cableados a `configuracionSistema` |
| Flag de orden | **No existe** |
| Solicitar Orden / Panel de Gestión | **No existe** |
| Validación de orden al marcar/finalizar | **No existe** — se puede marcar en verde y finalizar cualquier `#N` |
| App Mozos post-login Admin | Va a **Inicio** (mapa de mesas); no hay pantalla de peticiones |

**Brecha:** El supervisor (y el cocinero) pueden marcar y finalizar platos fuera de orden en el lote KDS, desalineando la cola visual de la vista de cocineros. No hay canal formal para pedir al admin autorización de un salto de orden.

---

## 3. Nueva configuración del sistema

### 3.1 Clave en base de datos

Agregar bloque `cocina` en `configuracionSistema` (hoy no existe como sección tipada; la pestaña Cocina del panel es mayormente UI legacy).

```javascript
// CONFIGURACION_DEFAULT + schema
cocina: {
  // Si true (default), cocineros y supervisor solo pueden finalizar
  // el plato #1 de la cola de cada cocinero (FIFO por procesandoPor.timestamp).
  // Admin siempre puede omitir.
  obligarOrdenAsignacion: true,

  // Si true (default), al intentar finalizar un #2+ aparece "Solicitar Orden"
  // y se envía petición al Panel de Gestión (App Mozos / Admin).
  // Si false, el supervisor puede finalizar #2/#3 sin solicitud
  // (aunque obligarOrdenAsignacion siga en true).
  solicitudOrdenFueraDeCola: true
}
```

| Campo | Tipo | Default | Significado |
|-------|------|---------|-------------|
| `cocina.obligarOrdenAsignacion` | `Boolean` | `true` | Obliga orden `#1` primero para cocineros y supervisor. Si `false`, finalización libre. |
| `cocina.solicitudOrdenFueraDeCola` | `Boolean` | `true` | Si `true`, fuera de secuencia → **Solicitar Orden** (Panel Admin). Si `false`, el **supervisor puede finalizar `#2`/`#3`**. |

### 3.2 Panel `configuracion.html` — pestaña **Cocina**

Agregar **dos** checkboxes (ambos marcados por defecto):

**1) Obligar orden para cocineros y el supervisor**

- **Ayuda:** *Si está marcado (recomendado), en el KDS solo se puede marcar y finalizar directo el plato `#1` de cada cocinero. Los administradores pueden omitir esta regla.*

**2) Solicitar orden al admin (platos fuera de secuencia)**

- **Ayuda:** *Si está marcado (recomendado), cuando el supervisor intente cerrar un plato `#2` o posterior, en lugar de finalizar aparecerá **Solicitar Orden**. La petición llegará al Panel de Gestión del admin en la App Mozos **y se notificará igualmente al admin en el Dashboard**. Si se desmarca, el supervisor podrá finalizar `#2`/`#3` sin pedir autorización.*

Binding Alpine:

| Capa | Clave |
|------|-------|
| UI | `config.cocinaObligarOrdenAsignacion` |
| Guardar | `cocina.obligarOrdenAsignacion` |
| Cargar | `cfg.cocina?.obligarOrdenAsignacion !== false` → **default true** |
| UI | `config.cocinaSolicitudOrdenFueraDeCola` |
| Guardar | `cocina.solicitudOrdenFueraDeCola` |
| Cargar | `cfg.cocina?.solicitudOrdenFueraDeCola !== false` → **default true** |

> Al cargar, si el backend no envía el campo, ambos checkboxes quedan **marcados** (`true`).

### 3.3 Archivos backend de configuración

| Archivo | Cambio |
|---------|--------|
| `configuracionSistema.model.js` | `CONFIGURACION_DEFAULT.cocina` + schema ambos flags |
| `configuracionController.js` / repository | Persistir y devolver `cocina` en GET/PUT |
| `configuracion.html` | Ambos checkboxes + map load/guardar |

### 3.4 Consumo en App Cocina / App Mozos

| Cliente | Claves (default `true`) |
|---------|-------------------------|
| App Cocina | `cocinaObligarOrdenAsignacion`, `cocinaSolicitudOrdenFueraDeCola` |
| App Mozos | Mismo GET `/api/configuracion` (o endpoint dedicado) para saber si debe mostrar Panel y recibir solicitudes |

---

## 3bis. Solicitar Orden + Panel de Gestión (App Mozos)

### 3bis.1 Comportamiento en KDS (App Cocina)

Cuando `obligarOrdenAsignacion === true` y el usuario **no es admin** intenta marcar/finalizar una línea que **no es `#1`** de su cocinero:

| `solicitudOrdenFueraDeCola` | UI / acción |
|-----------------------------|-------------|
| **ON** (default) | No se ejecuta Finalizar. Se muestra acción **Solicitar Orden** (botón en toolbar, toast con CTA, o reemplazo del Finalizar para esos ítems). Al confirmar, se crea una **petición** hacia el admin. |
| **OFF** | El **supervisor** puede Finalizar el `#2`/`#3` como si tuviera bypass. El cocinero sigue sin poder (salvo decisión futura). |

Datos mínimos de la solicitud:

```javascript
{
  tipo: 'finalizar_fuera_de_orden',
  comandaId, platoId, platoIndex,
  platoNombre, cantidad,
  cocineroId, cocineroAlias,
  numeroColaActual,           // ej. 2
  numeroColaRequerido: 1,
  solicitadoPor: { userId, nombre, rol },
  motivo: String | null,      // opcional, texto del supervisor
  estado: 'pendiente',        // pendiente | aprobada | rechazada | cancelada
  createdAt
}
```

Tras **aprobación** del admin:

- Opción A (v1 recomendada): el backend marca un **token/override de un solo uso** en el plato y el supervisor (o el sistema) puede finalizar esa línea aunque no sea `#1`.
- Opción B: el admin finaliza desde el Panel (acción remota). Documentar ambas; **elegir A** para no sacar al admin del flujo de cocina.

### 3bis.2 Permiso nuevo en `roles.html`

Agregar en `PERMISOS_FUNDAMENTALES` (`roles.model.js`), grupo **App Mozos**:

| ID | Nombre UI | Descripción |
|----|-----------|-------------|
| `ver-panel-gestion-mozos` | Ver Panel de Gestión | Acceder al Panel de Gestión en App Mozos (peticiones/solicitudes de otros usuarios, p. ej. Solicitar Orden desde cocina) |

Asignación por defecto:

| Rol sistema | ¿Tiene el permiso? |
|-------------|-------------------|
| `admin` | **Sí** (todos los permisos) |
| `supervisor` | **No** |
| `mozos` / otros | **No** |

Editable en `roles.html` para roles personalizados (p. ej. un “gerente” sin ser admin).

### 3bis.3 Screen Panel de Gestión (App Mozos)

**Nuevo screen** (nombre sugerido: `PanelGestionScreen` / ruta `PanelGestion`).

| Aspecto | Detalle |
|---------|---------|
| Quién lo ve | Usuarios con permiso `ver-panel-gestion-mozos` (típicamente **admin**) |
| Post-login | Si el usuario tiene ese permiso, el **primer screen** tras login **no es Inicio**: es el **Panel de Gestión** |
| Contenido | Lista de **órdenes / peticiones** enviadas por otros usuarios (prioridad: solicitudes de finalizar fuera de orden desde KDS) |
| Acciones | Aprobar / Rechazar / Ver detalle (plato, cocinero, `#N`, solicitante, motivo) |
| Notificación App Mozos | Push / in-app / socket al llegar una solicitud nueva mientras el admin está en la app |
| Navegación | Desde el Panel se puede ir a Inicio (mesas) como hoy; badge de pendientes en bottom nav si aplica |

### 3bis.3b Notificación al admin en el Dashboard (obligatoria)

Toda orden/petición del **Panel de Gestión** (incluida **Solicitar Orden** desde cocina) **también notifica al admin en el Dashboard** web (`backend-gambusinas`), no solo en la App Mozos.

| Canal | Comportamiento |
|-------|----------------|
| Dashboard (panel web) | Crear notificación en el sistema de notificaciones del dashboard (`notificaciones` / campana del topbar vía `notificaciones-dashboard.js`). Tipo sugerido: `solicitud_gestion` / `solicitar_orden`. |
| Destinatarios | Admins y usuarios con `ver-panel-gestion-mozos` (y/o `ver-notificaciones`). |
| Contenido | Resumen: solicitante, plato, cantidad, cocinero, `#N` actual, mesa/comanda. |
| Acción desde Dashboard | Click en la notificación → detalle / pantalla de gestión de la solicitud (aprobar/rechazar) o deep-link equivalente en el panel. |
| Tiempo real | Socket o refresh del badge de notificaciones al crear la solicitud (mismo evento que alimenta App Mozos). |

**Principio:** una sola solicitud en backend → **dos superficies de aviso al admin**:

1. **App Mozos** → Panel de Gestión (lista + push).
2. **Dashboard** → centro de notificaciones / campana (igual de obligatorio).

El admin no debe depender de tener la App Mozos abierta: si está en el Dashboard, también ve la orden.

Flujo:

```
Supervisor en KDS marca Papa (#2) → Solicitar Orden
        ↓
   POST /api/.../solicitudes-gestion
        ↓
   ┌────────────────────────────┬────────────────────────────┐
   ▼                            ▼                            │
Socket/push App Mozos      Notificación Dashboard            │
→ Panel de Gestión         → campana / centro notif.         │
(admin)                    (admin)                           │
   └────────────────────────────┴────────────────────────────┘
        ↓
Admin aprueba/rechaza (desde Mozos o Dashboard)
        ↓
   Override one-shot / rechazo notificado al supervisor
```

### 3bis.4 Archivos previstos (Panel + solicitud)

| Área | Archivos |
|------|----------|
| Permiso | `roles.model.js`, `roles.html` (catálogo automático vía API) |
| Modelo/API | Nuevo modelo o colección `solicitudGestion` / endpoint bajo `/api/solicitudes-gestion` |
| App Cocina | CTA **Solicitar Orden** en toolbar / guard de `#2+` |
| App Mozos | `PanelGestionScreen.js`, registro en navigator (`App.js` / stack post-login), `initialRoute` condicional según permiso |
| Socket | Evento `solicitud-gestion-nueva` / `solicitud-gestion-actualizada` (Mozos + Dashboard) |
| Dashboard | Crear notificación al admin al crear cada solicitud (`notificacion.model` + `notificaciones-dashboard.js` / API notificaciones) |

---

## 4. Numeración: reutilizar la de la vista de cocineros

### 4.1 Criterio de orden (fuente de verdad)

Por cada `cocineroId` con platos en proceso (`procesandoPor.cocineroId` definido, estado aún finalizable — tipicamente `pedido` / en preparación, no `recoger`/`salio`/`entregado`):

1. Listar todos los platos (líneas) asignados a ese cocinero en el conjunto visible del día/turno.
2. Ordenar por `procesandoPor.timestamp` **ascendente** (más antiguo primero).
3. Desempate estable: `comandaId` + índice de plato (o `lineaId` si aplica).
4. Asignar `#1`, `#2`, … `#N`.

Esto alinea con `asignarNumeroGlobal()` / Ver Cocina Completo: **`#1` = más viejo**.

### 4.2 Granularidad en el KDS (marcar en cantidad + orden `#1`)

En el tablero KDS supervisor/general el trabajo se marca **por línea de plato con su cantidad** (`2 Pan solo`, `3 Lomo`, etc.).

**Regla al marcar en cantidad (mismo cocinero):**

| Situación | ¿Se puede marcar y finalizar esa cantidad? |
|-----------|--------------------------------------------|
| Mismo cocinero + la línea es su **`#1`** | **Sí** — se puede marcar en cantidad y finalizar **toda la cantidad** de ese `#1` |
| Mismo cocinero + la línea es su **`#2`, `#3`, …** | **No finalizar directo** — con solicitud ON → **Solicitar Orden**; con solicitud OFF → supervisor sí puede finalizar |

Resumen: **sí se finalizan platos en cantidad**, pero **solo la cantidad que pertenece al `#1` de ese cocinero**. El orden no impide cerrar varias unidades del `#1`; impide saltar al `#2+` del mismo cocinero.

| Concepto | Comportamiento |
|----------|----------------|
| Visual en tarjeta | `cantidad` + nombre (ej. `2 Pan solo`) |
| Número de orden `#N` | **Uno por línea asignada** al cocinero (FIFO por `procesandoPor.timestamp`) |
| Marcar en cantidad (verde ✓) | Si es `#1` del cocinero → selecciona la **línea completa** (toda su cantidad) |
| Finalizar | Si la línea es `#1` → se finaliza **toda la cantidad** de esa línea (API actual) |

Ejemplo — mismo cocinero Juan:

| Línea | Cola | Marcar cantidad + Finalizar |
|-------|------|-----------------------------|
| `2 Pan solo` | `#1` | **Sí** — se cierran los 2 Pan |
| `1 Papa a la huancaína` | `#2` | **No** — espera a ser `#1` |
| `3 Chaufa` | `#3` | **No** |

Tras finalizar los 2 Pan, Papa pasa a `#1` y **ahí sí** se puede marcar su cantidad (1) y finalizarla.

Varios cocineros: cada uno puede aportar **solo su `#1` (con su cantidad)** al mismo lote Finalizar.

> Si más adelante existe finalización por unidad (decremento de `cantidades[i]`), se podrá marcar k de N **solo** si esa línea/unidad es el `#1` del cocinero; las unidades del `#2+` siguen bloqueadas.

### 4.3 Utilidad compartida

Crear (o extender) helper en App Cocina:

```
appcocina/src/utils/ordenColaCocinero.js
```

Funciones sugeridas:

```javascript
/**
 * @returns Map<platoKey, numeroCola>  // 1..N por cocinero
 */
export function calcularNumerosColaPorCocinero(comandas)

/**
 * @returns boolean — true si este plato es #1 de su cocinero
 */
export function esPrimeroEnCola(plato, comandas)

/**
 * @returns number | null
 */
export function numeroColaDePlato(plato, comandas)

/**
 * Filtra un lote marcado: solo líneas que son #1 de su cocinero.
 * Usado por handleFinalizarPlatosGlobal / interceptor supervisor.
 */
export function filtrarLoteRespetandoOrden(platosMarcados, comandas)
```

Misma función debe usarse para:

1. Badge `#N` en UI supervisor.
2. Guard al **marcar** (estado `seleccionado`) y al **finalizar lote**.
3. Lógica espejada en backend (ver §6).

---

## 5. UI — Tablero KDS: marcar (cantidad) + finalizar

El flujo operativo del KDS **no** es “un botón Finalizar por plato aislado” como única vía. El flujo principal es:

```
Click en línea del plato (muestra cantidad × nombre)
  → ciclo de estado visual
  → verde ✓ = marcado / listo para finalizar
  → barra inferior: Finalizar (lote de todos los marcados)
```

Código de referencia:

| Pieza | Archivo / símbolo |
|-------|-------------------|
| Ciclo marcar | `togglePlatoCheck` en `comandastyle.jsx` → `platoStates` (`seleccionado`) |
| Cantidad en línea | `PlatoPreparacion.jsx` → `{cantidad} {nombre}` |
| Lote finalizar | `handleFinalizarPlatosGlobal` → platos con `estado === 'seleccionado'` |
| Supervisor | Interceptor `onSupervisorFinalizarPlato(platosAFinalizar)` |

La regla de orden debe adaptarse a **ese** flujo, no solo a un click individual.

### 5.1 Badge junto al nombre del cocinero

**Archivo principal:** `PlatoPreparacion.jsx` (badge `procesandoPor`), consumido desde tarjetas del supervisor (y tableros que muestren cocinero).

```
👨‍🍳 Juan #1
👨‍🍳 Juan #2
```

- El `#N` usa el mismo lenguaje visual que la vista de cocineros (`estiloNumeroSecuencial` / acento, o variante compacta en el badge).
- Recomendación: **siempre mostrar** el `#N` cuando hay cola; el flag solo controla el **bloqueo** de marcar-para-finalizar / finalizar.

### 5.2 Marcar platos (estado `seleccionado` / verde)

Con flag `obligarOrdenAsignacion` ON y usuario **no admin**:

| Acción | Plato `#1` del cocinero | Plato `#2+` del mismo cocinero |
|--------|-------------------------|--------------------------------|
| Ciclo hasta `dejar` (liberar) | Permitido | Permitido |
| Ciclo hasta `seleccionado` (verde ✓) | **Permitido** (para Finalizar) | Ver §5.2b |
| Feedback | — | Depende de `solicitudOrdenFueraDeCola` |

#### 5.2b Línea `#2+`: Finalizar vs Solicitar Orden

| Condición | Comportamiento |
|-----------|----------------|
| Solicitud ON + supervisor | Se puede marcar la línea en un estado de **solicitud** (o CTA dedicado). La barra no muestra Finalizar para esos ítems: muestra **Solicitar Orden**. Al confirmar → crea petición al Panel de Gestión / notifica admin. |
| Solicitud OFF + supervisor | Puede marcar verde y **Finalizar** `#2`/`#3` (bypass de orden para supervisor). |
| Cocinero (v1) | No finaliza `#2+`; no Solicitar Orden (bloqueado con mensaje). |
| Admin | Finalizar cualquier `#N` sin solicitud. |

Con flag OFF o usuario **admin**: marcar/finalizar como hoy (cualquier línea).

### 5.3 Finalizar lote / Solicitar Orden (toolbar)

Al pulsar la acción de barra con platos marcados:

1. Agrupar por `procesandoPor.cocineroId` y número de cola.
2. Separar en dos grupos:
   - **Finalizables ahora:** líneas `#1` (siempre) + líneas `#2+` si (admin) o (supervisor && solicitud OFF) o (tienen override aprobado).
   - **Requieren solicitud:** líneas `#2+` con solicitud ON y actor supervisor.
3. Si solo hay finalizables → Finalizar (política B sobre inválidos residuales).
4. Si hay ítems que requieren solicitud → el botón principal pasa a **Solicitar Orden** (o se muestra un segundo botón). No se llama a `finalizar` sobre esos ítems.
5. Tras enviar solicitud → toast: *Solicitud enviada al Panel de Gestión. El admin debe aprobar.*

**Política B (lote mixto `#1` + `#2` con solicitud ON):**

- Se finalizan los `#1`.
- Los `#2+` no se finalizan; se ofrecen en el mismo flujo como **Solicitar Orden** (una petición por plato o una petición agrupada — preferir **una por plato** para aprobación granular).

Admin: el lote procesa todos los marcados sin filtrar ni solicitar.

### 5.4 Marcar en cantidad — mismo cocinero y `#1`

Cuando el operador **marca en cantidad** (selecciona la línea que muestra `N × plato` para el lote Finalizar):

1. **Mismo cocinero + línea `#1`:** **sí se puede** marcar esa cantidad y finalizarla. El orden **no** limita cuántas unidades del `#1` se cierran: si el `#1` es `3 Lomo`, se marcan y finalizan los 3.
2. **Mismo cocinero + línea `#2+`:** no se finaliza directo. Con solicitud ON → **Solicitar Orden** al admin; con solicitud OFF → el supervisor sí puede finalizar esa cantidad.
3. **Varios cocineros en el lote:** se pueden marcar y finalizar a la vez las cantidades de **cada `#1`**. Los `#2+` van por Solicitar Orden (si aplica).

| Caso | Resultado |
|------|-----------|
| Mismo cocinero, `#1` con `cantidad = 3`, marcar → Finalizar | **OK** — se finalizan las **3** unidades del `#1` |
| Mismo cocinero, `#2` con cualquier cantidad | No Finalizar directo → **Solicitar Orden** (si solicitud ON) o Finalizar si solicitud OFF (solo supervisor) |
| Juan `#1` (`2 Pan`) + Martha `#1` (`3 Lomo`) en el mismo lote | **OK** — ambas cantidades `#1` se finalizan |
| Juan `#1` (`2 Pan`) + Juan `#2` (`1 Papa`) | Finalizar cantidad de `#1`; para Papa → Solicitar Orden (o finalizar si solicitud OFF) |

En v1 no hace falta un selector “marcar solo k de N” aparte: marcar el `#1` implica su cantidad completa. Lo importante del producto: **finalizar en cantidad está permitido siempre que sea el `#1` de ese cocinero**.

### 5.5 Tabla de interacción (resumen)

| Condición | Marcar / acción | Resultado |
|-----------|-----------------|-----------|
| Flag obligar OFF | Como hoy | Finalizar cualquier `#N` |
| Obligar ON + línea `#1` | Verde → Finalizar | Cierra toda la cantidad del `#1` |
| Obligar ON + Solicitud ON + `#2+` + supervisor | **Solicitar Orden** | Petición → Panel de Gestión Admin |
| Obligar ON + Solicitud OFF + `#2+` + supervisor | Verde → Finalizar | Supervisor puede cerrar `#2`/`#3` |
| Obligar ON + `#2+` + cocinero | Bloqueado | Mensaje de orden (sin solicitud en v1) |
| Admin | Cualquier `#N` | Finalizar directo |

### 5.6 Mensajes de error / CTA (UX)

Solicitar Orden (`#2+`, solicitud ON):

```
“Papa a la huancaína” es el #2 de Juan.
No se puede finalizar fuera de orden.
[ Solicitar Orden ]  → se envía al Panel de Gestión del admin
```

Tras enviar:

```
Solicitud enviada. El admin debe aprobarla en el Panel de Gestión.
```

Solicitud OFF (supervisor finaliza `#2`):

```
(Sin bloqueo — Finalizar actúa normal)
```

Backend sin override / sin ser admin:

```
ORDEN_COLA_REQUERIDO — Debe finalizar primero el #1 o enviar Solicitar Orden.
```

---

## 6. Backend — Enforcement (obligatorio)

La UI sola no basta. Validar en `finalizarPlato` (`procesamientoController.js`) en **cada** llamada del lote.

### 6.1 Algoritmo (por cada plato del lote)

```
1. Leer cocina.obligarOrdenAsignacion (default true)
2. Si false → continuar como hoy
3. Si el actor es rol admin → continuar (omitir orden)
4. Si existe override/aprobación vigente para este plato (solicitud aprobada one-shot) → continuar y consumir override
5. Determinar cocineroAtribuido = plato.procesandoPor.cocineroId
6. Buscar platos en proceso de ese cocinero; ordenar por procesandoPor.timestamp ASC
7. Si el plato actual NO es el primero:
   a. Si actor es supervisor/utilidad-supervisor Y cocina.solicitudOrdenFueraDeCola === false
      → continuar (supervisor puede finalizar #2/#3)
   b. Si no → 409 Conflict ORDEN_COLA_REQUERIDO
      (el cliente debe mostrar Solicitar Orden si solicitudOrdenFueraDeCola === true)
```

Endpoints adicionales (solicitud):

| Endpoint (sugerido) | Uso |
|---------------------|-----|
| `POST /api/solicitudes-gestion` | Crear Solicitar Orden |
| `GET /api/solicitudes-gestion` | Listar para Panel (admin) |
| `PUT /api/solicitudes-gestion/:id/aprobar` | Aprobar → genera override |
| `PUT /api/solicitudes-gestion/:id/rechazar` | Rechazar → notifica solicitante |

### 6.2 Quién puede omitir / solicitar

| Rol / permiso | ¿Finaliza `#2+` directo? | ¿Solicitar Orden? |
|---------------|--------------------------|-------------------|
| `admin` | Sí | No necesario |
| `supervisor` + solicitud **OFF** | Sí | No |
| `supervisor` + solicitud **ON** | No (salvo override aprobado) | **Sí** → Panel Admin |
| `cocinero` | No | No en v1 |
| `utilidad-supervisor` | Igual que supervisor | Igual que supervisor |
| `ver-panel-gestion-mozos` | N/A (recibe/aprueba en App Mozos) | Aprueba/rechaza |

> Bypass **directo** sin solicitud: solo **admin**, o **supervisor cuando `solicitudOrdenFueraDeCola` está desactivado**.

### 6.3 Endpoints afectados

| Endpoint | Acción |
|----------|--------|
| `PUT .../plato/:platoId/finalizar` | Validar que la línea es `#1` del cocinero atribuido (cantidad completa de la línea) |
| Lote via múltiples llamadas desde `handleFinalizarPlatosGlobal` | Cada ítem validado; front filtra antes (política B) |
| Finalizar comanda completa (si finaliza varios platos) | Misma validación por plato / rechazar los que violen orden |

No aplica a: liberar plato (`dejar`), tomar/reasignar, marcar visual sin finalizar, cambiar estado a `salio`/`entregado`.

---

## 7. Alcance por tablero

| Tablero | Componente | Badge `#N` | `#2+` con solicitud ON | Solicitud OFF (supervisor) |
|---------|------------|------------|------------------------|----------------------------|
| Vista Supervisor | `ComandaStyleSupervi` | **Sí** | **Solicitar Orden** → Panel Admin | Puede Finalizar `#2+` |
| Vista General | `comandastyle.jsx` | Opcional | Mismo si modo supervisor | Idem |
| Vista Personalizada | `ComandastylePerso.jsx` | Opcional | Idem | Idem |
| Ver Cocina Completo | `CocinaMonitorCompleto` | Ya tiene `#N` | Según actor | Idem |
| App Mozos Panel Gestión | `PanelGestionScreen` | N/A | Recibe/aprueba peticiones | N/A |

El KDS supervisor es el foco del **Solicitar Orden**. El Panel de Gestión en App Mozos es donde el admin gestiona esas peticiones; **el Dashboard notifica la misma orden al admin** (campana / centro de notificaciones).

---

## 8. Diagrama de flujo

```
┌──────────────────────────────────────────────────────────────┐
│  KDS: marcar línea / Finalizar o Solicitar Orden             │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
                   ¿Es #1 del cocinero?
                      │           │
                     sí          no
                      │           │
                      ▼           ▼
                 FINALIZAR    ¿rol admin?
                 (cantidad)      │      │
                                sí     no
                                 │      │
                                 ▼      ▼
                            FINALIZAR  ¿solicitudOrdenFueraDeCola?
                                           │              │
                                          ON             OFF
                                           │              │
                                           ▼              ▼
                                   [ Solicitar Orden ]
                                   → Panel Gestión Mozos
                                   → Notif. Dashboard (admin)
                                           │
                                           ▼
                                    Admin aprueba/rechaza
                                    (Mozos o Dashboard)
                                           │
                              aprueba → override one-shot → FINALIZAR
```

Tras finalizar un `#1`, el antiguo `#2` de ese cocinero pasa a `#1` y ya se puede Finalizar directo.

---

## 9. Fases de implementación

### Fase 1 — Configuración (panel + modelo)

1. Agregar `cocina.obligarOrdenAsignacion` y `cocina.solicitudOrdenFueraDeCola` (ambos default `true`).
2. Dos checkboxes en `configuracion.html` pestaña Cocina + load/guardar.
3. Verificar GET `/api/configuracion` expone ambos campos.

### Fase 2 — Utilidad de cola + UI marcar/finalizar / Solicitar Orden (KDS)

1. `ordenColaCocinero.js` (FIFO + filtro de lote).
2. Badge `#N` en `PlatoPreparacion`.
3. Guards en `togglePlatoCheck` / toolbar: `#1` → Finalizar; `#2+` → **Solicitar Orden** o Finalizar según flags.
4. API client para crear solicitud + toast de confirmación.

### Fase 3 — Backend enforcement + API solicitudes

1. Validación en `finalizarPlato` (admin / override / solicitud OFF + supervisor / `#1`).
2. CRUD solicitudes-gestión + override one-shot.
3. Socket/push hacia admins con `ver-panel-gestion-mozos`.

### Fase 4 — Panel de Gestión (App Mozos) + Dashboard + permiso

1. Permiso `ver-panel-gestion-mozos` en `roles.model.js` / visible en `roles.html`.
2. `PanelGestionScreen` + ruta en navigator.
3. Post-login: si tiene el permiso, **initial screen = Panel de Gestión** (no Inicio).
4. Lista aprobar/rechazar + notificaciones en vivo (App Mozos).
5. **Al crear cualquier solicitud del Panel de Gestión, notificar también al admin en el Dashboard** (campana / centro de notificaciones); permitir aprobar/rechazar desde ahí o abrir el detalle.

### Fase 5 — Tableros cocinero + monitor

1. Mismos guards de orden en General / Personalizado / Completo.
2. Solicitar Orden solo donde aplique (supervisor); cocinero bloqueado en v1.

---

## 10. Archivos a tocar (checklist)

| Archivo | Rol |
|---------|-----|
| `backend-gambusinas/src/database/models/configuracionSistema.model.js` | Defaults + schema `cocina` (2 flags) |
| `backend-gambusinas/public/configuracion.html` | 2 checkboxes + map |
| `backend-gambusinas/src/database/models/roles.model.js` | Permiso `ver-panel-gestion-mozos` |
| `backend-gambusinas/public/roles.html` | Visible vía catálogo de permisos (App Mozos) |
| `backend-gambusinas/.../procesamientoController.js` | Validar orden + override + solicitud OFF |
| `backend-gambusinas` — API solicitudes-gestión | **NUEVO** modelo/controller/routes + sockets |
| `appcocina/src/utils/ordenColaCocinero.js` | **NUEVO** — `#N` + filtro lote |
| `appcocina/.../PlatoPreparacion.jsx` | Badge `Alias #N` |
| `appcocina/.../comandastyle.jsx` | Guards + CTA **Solicitar Orden** |
| `appcocina/.../ComandaStyleSupervi.jsx` | Interceptor finalizar / solicitar |
| `gambusinas/Pages/.../PanelGestionScreen.js` | **NUEVO** — Panel de Gestión |
| `gambusinas/App.js` (o navigator post-login) | Ruta + **initial screen** = Panel si tiene permiso |
| `gambusinas` — servicio solicitudes + socket | Crear/listar/aprobar; badge pendientes |
| `backend-gambusinas` — notificaciones dashboard | Al crear solicitud → notificación al admin (campana) |
| `backend-gambusinas/public/assets/js/notificaciones-dashboard.js` | Mostrar tipo `solicitud_gestion` / deep-link |

---

## 11. Criterios de aceptación

- [ ] En `configuracion.html` → Cocina: checkbox **Obligar orden…**, **marcado por defecto**.
- [ ] En `configuracion.html` → Cocina: checkbox **Solicitar orden al admin…**, **marcado por defecto**.
- [ ] Con solicitud **desactivada**, el supervisor puede finalizar `#2`/`#3` aunque obligar orden esté activo.
- [ ] Con ambos ON, al intentar cerrar `#2+` aparece **Solicitar Orden** (no Finalizar directo).
- [ ] Existe permiso `ver-panel-gestion-mozos` en `roles.html` / catálogo de roles.
- [ ] La solicitud llega al **Panel de Gestión** (App Mozos).
- [ ] **La misma orden notifica al admin en el Dashboard** (campana / centro de notificaciones).
- [ ] Admin (o quien tenga el permiso) al loguearse en App Mozos ve primero el **Panel de Gestión**, no Inicio.
- [ ] Admin puede aprobar/rechazar desde Mozos o desde el Dashboard; tras aprobar, se puede finalizar ese plato fuera de orden (override).
- [ ] Con obligar orden ON, badge `#1`, `#2`, … por cocinero en KDS supervisor.
- [ ] Solo se finaliza directo el `#1` (cantidad completa) salvo admin / solicitud OFF / override.
- [ ] Marcar en cantidad del `#1` del mismo cocinero funciona; `#2+` va a Solicitar Orden o bypass según flags.
- [ ] Backend rechaza finalizar `#2+` sin derecho (409 `ORDEN_COLA_REQUERIDO`).

---

## 12. Casos de prueba

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Juan: `2 Pan` `#1`, `1 Papa` `#2`. Marcar Pan → Finalizar | OK; 2 Pan; Papa → `#1` |
| 2 | Solicitud ON. Supervisor intenta Papa `#2` | CTA **Solicitar Orden**; no finaliza |
| 3 | Supervisor envía solicitud; admin en Panel Mozos aprueba | Override; se puede finalizar Papa |
| 3b | Supervisor envía solicitud; admin solo en Dashboard | Ve notificación en campana; puede gestionar/aprobar desde Dashboard |
| 4 | Admin rechaza solicitud | Supervisor no puede finalizar; notificación de rechazo |
| 5 | Solicitud **OFF**. Supervisor finaliza Papa `#2` | OK sin pedir permiso |
| 6 | Obligar orden OFF | Cualquiera finaliza cualquier `#N` |
| 7 | Admin finaliza Papa `#2` sin solicitud | OK |
| 8 | Cocinero intenta su `#2` (v1) | Bloqueado, sin Solicitar Orden |
| 9 | Admin login App Mozos | Primer screen = **Panel de Gestión** |
| 10 | Usuario sin `ver-panel-gestion-mozos` | No ve Panel; post-login = Inicio |
| 11 | Juan `#1` + Martha `#1` marcar cantidades → Finalizar | OK ambas |
| 12 | Liberar `#1` sin finalizar | `#2` pasa a `#1` |

---

## 13. Decisiones de producto (cerradas)

1. **Default obligar orden = ON**; **default solicitud orden = ON**.
2. Bypass **directo** sin solicitud: **admin**, o **supervisor si solicitud está OFF**.
3. Con solicitud ON, `#2+` → **Solicitar Orden** → Panel de Gestión App Mozos **y notificación al admin en el Dashboard**.
4. Permiso nuevo: `ver-panel-gestion-mozos`; post-login Admin → Panel primero.
5. **Toda orden del Panel de Gestión notifica igualmente al admin en el Dashboard** (no solo App Mozos).
6. **Cola por cocinero**; criterio = `procesandoPor.timestamp`.
7. Flags en **configuración del sistema** (pestaña Cocina).
8. Marcar en cantidad del `#1` del mismo cocinero: **sí** se finaliza toda esa cantidad.
9. Aprobación v1: **override one-shot** en el plato (opción A).
10. Cocinero en v1: **sin** Solicitar Orden (solo bloqueo); se puede ampliar después.

---

## 14. Fuera de alcance (v1)

- Cambiar el algoritmo de asignación automática de platos.
- Forzar el orden visual de tarjetas en el KDS supervisor.
- Reordenar manualmente la cola (`#2` ↔ `#1`) desde UI.
- Selector “marcar solo k de N unidades” en el KDS.
- Otros tipos de petición en el Panel de Gestión distintos de `finalizar_fuera_de_orden` (el Panel puede nacer genérico, pero v1 solo implementa este tipo).
- Solicitar Orden desde el rol cocinero (fase posterior opcional).
