# Plan: Distribuir Cocina — Perfil de personalización por monitor

Estado: **Implementado** · Fecha: 2026-08-15

## Objetivo

En el flujo **Distribuir Cocina en monitores** (App Cocina → página
`DistribuirCocinaMonitoresPage`), cada monitor pasivo (2–8) ya permitía
asignar qué cocinero se muestra. Este plan agrega, además, asignar **qué
perfil de personalización Ver Cocina** aplica a cada monitor (o ninguno /
default), de forma independiente por monitor.

Adicionalmente, corrige que el guardado de perfiles de personalización
(ver cocinero) **no persistía todas las herramientas** del panel
`MonitorConfigPanel`: la whitelist del backend descartaba claves.

---

## 1. Perfil por monitor

### Modelo de datos

`backend-gambusinas/src/database/models/pantallaCocina.model.js` — nuevos
campos en `PantallaCocina`:

| Campo | Tipo | Default | Significado |
|---|---|---|---|
| `perfilAuto` | Boolean | `false` | `true` → aplicar perfil personal del cocinero (`?perfil=auto`) |
| `perfilVerCocinaId` | ObjectId → `PerfilVerCocina` | `null` | id del perfil con nombre guardado (`?perfilId=<id>`) |

Tres estados mutuamente excluyentes:

| `perfilAuto` | `perfilVerCocinaId` | URL generada | Comportamiento |
|---|---|---|---|
| `false` | `null` | (sin sufijo) | Sin perfil: apariencia default de la vista |
| `true` | `null` | `&perfil=auto` | Perfil personal del cocinero asignado |
| `false` | `<id>` | `&perfilId=<id>` | Perfil con nombre guardado |

### API

**`PUT /api/pantallas-cocina/distribucion`**

Body extendido — cada item ahora acepta `perfilAplicar`:

```json
{
  "items": [
    { "id": "<PantallaCocinaId>", "cocineroId": "<MozoId>|null", "modoVista": "completo", "perfilAplicar": "none|auto|<PerfilVerCocinaId>" }
  ]
}
```

- `perfilAplicar: "none"` → `perfilAuto=false`, `perfilVerCocinaId=null`
- `perfilAplicar: "auto"` → `perfilAuto=true`, `perfilVerCocinaId=null`
- `perfilAplicar: "<id>"` → `perfilAuto=false`, `perfilVerCocinaId=<id>`
- Valores inválidos (no ObjectId de 24 hex) se normalizan a `"none"` en el
  controller para evitar `CastError` en `bulkWrite`.

**`GET /api/pantallas-cocina/activas`** ahora popula `perfilVerCocinaId`
con `nombre`, así el frontend puede mostrar el nombre del perfil asignado.

### Frontend — `DistribuirCocinaMonitoresPage.jsx`

- Se elimina el estado **global** `perfilAplicar` (un perfil para todos).
- Se agrega el estado **por monitor** `asignacionPerfil: { [num]: 'none'|'auto'|'<id>' }`
  y su correspondiente `asignacionPerfilInicial` para detectar cambios.
- `cargarDatos` hidrata `asignacionPerfil` desde `p.perfilAuto` /
  `p.perfilVerCocinaId` de cada pantalla.
- Nuevos helpers:
  - `getPerfilOptsForMonitor(num)` → `{}` | `{ aplicarPerfil: true }` |
    `{ perfilId: <id> }` para `monitorWindowManager`.
  - `getPerfilSuffixForMonitor(num)` → `''` | `'&perfil=auto'` |
    `'&perfilId=<id>'` para URLs del `.bat` y Monitor Hub.
- `guardarDistribucion` envía `perfilAplicar` por item.
- `hayCambios` también considera cambios en `asignacionPerfil`.
- UI:
  - Cada tarjeta de monitor tiene un `<select>` **Perfil de
    personalización** (Sin perfil / Perfil del cocinero auto / perfiles
    con nombre). Se deshabilita si el monitor no tiene cocinero asignado.
  - El modal **Generar .bat kiosk** ahora muestra, por monitor, dos
    selects (cocinero + perfil) en vez del select global de perfil.
  - La barra superior conserva el botón **↻ Perfiles** para recargar la
    lista, pero ya no tiene el select global.

### Propagación a ventanas

- `abrirOActualizarVentana(num)` pasa `getPerfilOptsForMonitor(num)` a
  `abrirMonitorCocinero` / `redirigirVentanaMonitor`.
- `enviarAMonitorHub` arma cada slot con `getPerfilSuffixForMonitor(num)`.
- `generarBatKiosk` incrusta `getPerfilSuffixForMonitor(m.num)` en cada
  bloque `start` del `.bat`.

### Consumo en la ventana hija

Sin cambios: `CocinaMonitorLayout` ya lee `?perfilId=<id>` y `?perfil=auto`
de la URL (efecto existente) y aplica el perfil sobre `localDesign`.

---

## 2. Guardado completo de perfiles (ver cocinero)

### Problema

El panel `MonitorConfigPanel` escribe ~28 claves en `localDesign` que NO
estaban en la whitelist `PERFIL_VER_COCINA_KEYS` del controller
(`backend-gambusinas/src/controllers/cocinerosController.js`). Al
sanitizar, esas claves se **descartaban** y nunca se persistían en
`PerfilVerCocina.config` ni en `ConfigCocinero.perfilVerCocina`.

### Claves faltantes agregadas a la whitelist

```
disposicionTarjeta, animacionesTarjetas, fuenteFamiliaCustom,
cantidadColor, cantidadContorno, cantidadFondo, cantidadTamanio,
cantidadGrosorContorno, cantidadRadio,
cronometroColor, cronometroContorno, cronometroFondo,
colorDegradadoTarjeta, degradadoTarjeta,
quitarNombreCocineroTarjeta, ocultarAtencionUrgente, animacionesAlerta,
animacionAtencion, animacionUrgente, colorAnimacionAtencion, colorAnimacionUrgente,
emojisAnimacionAtencion, tamanioEmojiAtencion, cantidadEmojiAtencion,
emojisAnimacionUrgente, tamanioEmojiUrgente, cantidadEmojiUrgente,
autoAgrandamiento, autoAcomodamiento, textoNotificacionEntrada
```

Esto afecta a los tres endpoints que sanitizan con la misma whitelist:
`PUT /api/cocineros/:id/perfil-ver-cocina`,
`POST /api/perfiles-ver-cocina`,
`PUT /api/perfiles-ver-cocina/:id`.

### Notas

- Las claves `cantidadPeso` y `cantidadSeguirAlerta` existen en
  `BADGE_DEFAULTS` pero **no** se editan desde el panel, así que no se
  agregan a la whitelist (no aparecerían en `localDesign`).
- `colorFondoTarjeta` está en `DEFAULT_CONFIG` pero tampoco se edita
  desde el panel; se omite por la misma razón.
- La sanitización sigue siendo por whitelist (no se acepta cualquier
  clave) para mantener el contrato cerrado y evitar inyección de campos
  no visuales.

---

## 3. Auto-save del perfil en MongoDB (ver cocinero)

Antes, la personalización del panel "Personalizar" de `CocinaMonitorLayout`
se persistía en MongoDB **solo** al pulsar "Guardar perfil del cocinero
(auto)". Los cambios en vivo quedaban en `localStorage` (`cocinaMonitorDesign`)
y se perdían al limpiar cache / cambiar de PC.

Ahora el `localDesign` se **auto-guarda** (debounced 1500 ms) en el perfil
auto del cocinero activo (`ConfigCocinero.perfilVerCocina` vía
`PUT /api/cocineros/:id/perfil-ver-cocina`), sin botón.

### Reglas del auto-save

- Solo en la **consola principal** (`modoFijo = false`). Las ventanas hijas
  (`modoFijo`, flujo Distribuir) solo muestran el perfil asignado y no lo
  re-guardan.
- Requiere `cocineroActivoId` (si el selector está en "General", no hay
  destino y no se guarda).
- Si se está editando un **perfil con nombre** (`perfilSelId` no null), el
  auto-save se desactiva: esos perfiles se guardan explícitamente con
  "Sobrescribir" / "Guardar como…".
- Se omite justo después de **cargar** un perfil (carga inicial, carga de
  perfil con nombre, aplicación de `?perfil=auto` / `?perfilId=` en modo
  fijo, sincronización `storage` entre ventanas) para no re-persistir lo
  recién cargado. Se usa un ref `autoSaveSkipRef` como bandera.

### Indicador visual

Junto al botón "Personalizar" aparece un sutil "Guardando…" mientras la
petición PUT está en curso (`autoGuardando`). No hay botón de guardado
manual obligatorio; el botón "Guardar perfil del cocinero (auto)" se
mantiene como guardado inmediato/explicito.

### Resultado

- La personalización del Ver Cocina monitor sobrevive a cache clears y
  cambio de PC: al volver a entrar (o en una ventana hija con
  `?perfil=auto`) se carga desde `ConfigCocinero.perfilVerCocina`.
- El flujo "Distribuir Cocina en monitores" con `perfil=auto` por monitor
  ahora refleja siempre la última personalización del cocinero.

---

## Migración / compatibilidad

- No requiere migración: los campos nuevos `perfilAuto` y
  `perfilVerCocinaId` tienen defaults (`false` / `null`), equivalentes al
  comportamiento anterior (sin perfil por monitor).
- Pantallas existentes sin `perfilAplicar` en el payload se tratan como
  `"none"` (sin perfil), igual que antes.
- Perfiles existentes cargan igual; al re-guardarlos ahora persisten
  todas las herramientas (incluidas las que antes se perdían).

## Archivos modificados

Backend:
- `src/database/models/pantallaCocina.model.js`
- `src/repository/vistaCocina.repository.js`
- `src/controllers/vistaCocinaController.js`
- `src/controllers/cocinerosController.js`

Frontend (App Cocina):
- `src/components/monitor/CocinaMonitorLayout.jsx`
- `src/components/pages/DistribuirCocinaMonitoresPage.jsx`

## Pendientes / futuros

- Mostrar el nombre del perfil asignado en la tarjeta del monitor (ya
  llega populado desde la API; queda como mejora visual menor).
- Considerar migrar `perfilAuto` + `perfilVerCocinaId` a un único campo
  `perfilAplicar: String` si se quiere simplificar el modelo.
