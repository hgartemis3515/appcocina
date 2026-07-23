# Plan: Orden cronológico, numeración y platos unidos en Ver Cocina Completo

**Versión:** 1.0  
**Fecha:** Julio 2026  
**Proyecto:** App Cocina (`appcocina`)  
**Estado:** Implementado (Julio 2026)  
**Relacionado con:**
- `PLAN_VISTA_VER_COCINA.md`
- `PLAN_PERSONALIZAR_VISTA_COCINA_TIPOGRAFIA_COLUMNAS.md`
- `PLAN_SELECTOR_COCINEROS_VER_COCINA_COMPLETO.md`

---

## 1. Resumen ejecutivo

En **Ver Cocina Completo** (vista donde el cocinero ve sus platos, incl. selector / kiosko):

1. Las tarjetas se ordenan de **más viejo → más nuevo**, de izquierda a derecha y de arriba hacia abajo.
2. Cada tarjeta muestra un **número de orden** `#1`, `#2`, … (`#1` = más antiguo).
3. En **Personalizar → Espaciado entre filas** existe la opción **Unido (sin espacio)** para eliminar el hueco entre tarjetas y aprovechar el interespacio.

---

## 2. Situación previa

| Tema | Antes |
|------|-------|
| Orden | `criterio: 'prioridad'`, `direccion: 'desc'` (prioridadOrden, luego tiempo) |
| Layout grid | Gap 8 / 12 / 20 px según `espaciadoFilas` |
| Numeración | Solo en timers internos (`1-`, `2-` en `TemporizadorChips`) |
| Espacio | `compacto` \| `normal` \| `amplio` — sin modo sin gap |

---

## 3. Orden: más viejo → más nuevo

**Archivo:** `src/components/monitor/CocinaMonitorCompleto.jsx`

```js
useCocinaMonitorFilter(comandasParaMonitor, null, {
  criterio: 'tiempo',
  direccion: 'asc',
}, { agruparPorCocinero: true, cocineroIdFiltrado: cocineroActivoId });
```

- Criterio de edad: `tiempoInicio` del grupo (plato más antiguo del grupo).
- El grid CSS coloca el array en orden de lectura: **fila a fila, L→R**.
- Alcance: solo Ver Cocina Completo. Vista Personalizado / KDS interactivo sin cambio de sort.
- En modo bloques: cada bloque conserva el orden de `platosPendientes` dentro del cocinero; el reorden de *bloques* por alerta se mantiene.

---

## 4. Numeración `#1` … `#N`

| Pieza | Cambio |
|-------|--------|
| `CocinaMonitorLayout.jsx` | En cada `.map` de platos / `bloque.tarjetas`: `numeroOrden={index + 1}` |
| `CocineroPlatoCard.jsx` | Prop `numeroOrden`; badge `#N` junto al nombre |
| `PlatoMonitorRow.jsx` | Misma prop y badge (modo legacy) |

**Reglas:**

- `#1` = grupo más antiguo visible; el último = más nuevo.
- Numeración **dinámica**: al salir/finalizar un plato, el resto se reenumera 1…N.
- No confundir con los `1-`, `2-` de timers dentro de la misma tarjeta.
- Con cocinero filtrado: una sola secuencia. En General + bloques: numeración por bloque (por cocinero).

---

## 5. Personalizar: espaciado `unido`

| Valor | Gap grid | Padding contenedor | Radio tarjeta |
|-------|----------|--------------------|---------------|
| `unido` | 0 | 0 | 0 |
| `compacto` | 8px | 8px | actual |
| `normal` | 12px | 12px | actual |
| `amplio` | 20px | 20px | actual |

**UI:** `MonitorConfigPanel` → Espaciado entre filas → opción `Unido (sin espacio)`.

**Consumo:**

- `CocinaMonitorLayout`: `gapGrid` / padding = `0px` si `espaciadoFilas === 'unido'`.
- Tarjetas: `borderRadius: 0`, borde 1px, sin box-shadow de separación; padding interno de contenido se mantiene.

**Persistencia:** `localStorage` clave `cocinaMonitorDesign` (sin clave nueva).

---

## 6. Archivos tocados

| Archivo | Rol |
|---------|-----|
| `CocinaMonitorCompleto.jsx` | Sort `tiempo` / `asc` |
| `CocinaMonitorLayout.jsx` | `numeroOrden`, gap `unido` |
| `CocineroPlatoCard.jsx` | Badge `#N` + estilo unido |
| `PlatoMonitorRow.jsx` | Badge `#N` + estilo unido |
| `MonitorConfigPanel.jsx` | Opción “Unido (sin espacio)” |
| `TemporizadorChips.jsx` | Gap interno compacto también con `unido` |

---

## 7. Criterios de aceptación

- [x] Con cocinero filtrado y N grupos: top-left = más viejo = `#1`; hacia la derecha y abajo = más nuevos.
- [x] Al completar el más viejo, el siguiente pasa a `#1` y el resto se compacta.
- [x] Personalizar → Espaciado → **Unido**: gap y padding del grid en 0; tarjetas pegadas.
- [x] Compacto / Normal / Amplio sin regresiones; config se guarda con el resto del diseño.
- [x] Vista Personalizado / KDS interactivo sin cambio de orden por este plan.

---

## 8. Flujo

```
CocinaMonitorCompleto
  └─ useCocinaMonitorFilter (tiempo asc)
       └─ CocinaMonitorLayout
            ├─ Personalizar → MonitorConfigPanel (espaciadoFilas incl. unido)
            └─ CocineroPlatoCard / PlatoMonitorRow (numeroOrden + estilo unido)
```
