# Plan: Botón Personalizar — Tipografía funcional y hasta 10 columnas

**Versión:** 1.0  
**Fecha:** Julio 2026  
**Proyecto:** App Cocina (`appcocina`)  
**Estado:** Implementado (Julio 2026)  
**Relacionado con:**
- `PLAN_VISTA_VER_COCINA.md`
- `PLAN_SELECTOR_COCINEROS_VER_COCINA_COMPLETO.md`
- `PLAN_BARRA_COCINEROS_BUSCADOR_VER_COCINA_COMPLETO.md`

---

## 1. Resumen ejecutivo

En **Ver Cocina Completo** y **Ver Cocina Personalizado**, el botón **⚙ Personalizar** del header abre un panel de configuración visual (`MonitorConfigPanel`). Hoy el panel expone controles de **Diseño de lista**, **Tipografía**, **Colores**, **Ver por cocinero** y **Alertas**, pero:

| Problema reportado | Causa raíz identificada |
|--------------------|-------------------------|
| Las funciones de **Tipografía no funcionan** (o casi no se notan) | Los componentes de renderizado ignoran varios tokens de `configVisual`; hay tamaños y pesos hardcodeados; fuentes web no cargadas |
| **Diseño de lista** solo llega a **4 columnas** | UI y layout capan `layoutColumnas` en 4 aunque el usuario necesita hasta **10** |

**Objetivo:** que cada control del panel Personalizar tenga efecto visible y predecible en la vista, y ampliar el grid de lista/tarjetas a **1–10 columnas**.

---

## 2. Arquitectura actual

### 2.1 Flujo del botón Personalizar

```
┌─────────────────────────────────────────────────────────────────┐
│ CocinaMonitorCompleto / CocinaMonitorPersonalizado              │
│   └─ pasa configVisual base (defaults de vista)                 │
│         └─ CocinaMonitorLayout                                  │
│               ├─ botón "⚙ Personalizar" → showConfigPanel       │
│               ├─ merge: DEFAULT_CONFIG < vista < localDesign    │
│               ├─ localStorage: cocinaMonitorDesign              │
│               └─ MonitorConfigPanel (onChange → guardar local)  │
└─────────────────────────────────────────────────────────────────┘
```

**Archivos clave:**

| Archivo | Rol |
|---------|-----|
| `CocinaMonitorLayout.jsx` | Botón, merge de config, grid CSS, reparte `configVisual` a hijos |
| `MonitorConfigPanel.jsx` | UI de personalización (tipografía, columnas, colores…) |
| `CocineroPlatoCard.jsx` | Tarjeta principal en Ver Cocina Completo (modo cocinero) |
| `PlatoMonitorRow.jsx` | Fila legacy (modo plato sin cocinero) |
| `CocineroBlockHeader.jsx` | Cabecera de bloque por cocinero |
| `TemporizadorChips.jsx` | Cronómetros individuales |
| `MesaChips.jsx` | Chips de mesa |

### 2.2 Persistencia

| Clave | Contenido |
|-------|-----------|
| `cocinaMonitorDesign` | Overrides locales del panel Personalizar (`localDesign`) |
| Sincronización | Evento `storage` entre pestañas/ventanas del monitor |

El merge final es:

```javascript
const configVisual = { ...DEFAULT_CONFIG, ...configVistaProp, ...localDesign };
```

`localDesign` **debe ganar** sobre los defaults de la vista. El guardado en panel funciona; el fallo está en **consumo** de los tokens en los componentes hijos.

### 2.3 Modos de renderizado que afectan columnas

| Condición | Layout resultante |
|-----------|-------------------|
| `modoCocineros` + `modoAgrupacion === 'bloques'` + 1 columna | Lista vertical por bloques de cocinero — **sin grid** |
| `modoCocineros` + `layoutColumnas > 1` | Grid de `CocineroPlatoCard` |
| `!modoCocineros` + `layoutColumnas > 1` | Grid de `PlatoMonitorRow` |

Por defecto en Ver Cocina Completo: `modoAgrupacion: 'bloques'` y `layoutColumnas: 1` → el usuario debe elegir **2+ columnas** o **Agrupación → Tarjetas independientes** para ver el grid.

---

## 3. Diagnóstico — por qué la Tipografía no funciona

### 3.1 Mapa de controles vs. implementación real

| Control en panel | Token `configVisual` | ¿Se aplica en vista? | Componente / nota |
|------------------|----------------------|----------------------|-------------------|
| Tipo de fuente | `fuenteFamilia` | ⚠️ Parcial | Solo `fontFamily` en contenedor; **Roboto** no está cargada en `index.html` |
| Fuente personalizada | `fuenteFamilia` + `fuenteFamiliaCustom` | ⚠️ Bug UX | Al elegir preset no se limpia `fuenteFamiliaCustom`; el input puede quedar desincronizado |
| Todo el texto ± | `tamanioFuentePlato`, `Detalle`, `Cronometro` | ⚠️ Parcial | Algunos textos ignoran los tokens |
| Nombre plato (px) | `tamanioFuentePlato` | ✅ Sí | `CocineroPlatoCard`, `PlatoMonitorRow` |
| Detalle (px) | `tamanioFuenteDetalle` | ⚠️ Parcial | Complementos sí; mesas/etiquetas no |
| Cronómetro (px) | `tamanioFuenteCronometro` | ✅ Sí | `TemporizadorChips`, `PlatoMonitorRow` |
| Peso del nombre | `pesoFuentePlato` | ❌ **No** | `CocineroPlatoCard` usa `fontWeight: 900` fijo |
| Tamaño fuente cocinero | `tamanioFuenteCocinero` | ✅ Sí | `CocineroPlatoCard`, `CocineroBlockHeader` |

### 3.2 Hardcodes que anulan la tipografía

**`CocineroPlatoCard.jsx`** (vista principal Ver Cocina Completo):

```javascript
// Línea ~195 — ignora pesoFuentePlato
fontWeight: 900,

// Tamaños fijos que no escalan:
fontSize: '16px'   // placa URGENTE
fontSize: '14px'   // placa ATENCIÓN
fontSize: '13px'   // etiqueta Mesas, iniciales avatar
```

**`MesaChips.jsx`:**

```javascript
fontSize: '13px'   // siempre fijo — debería usar tamanioFuenteDetalle * factor
```

**`TemporizadorChips.jsx`:**

```javascript
fontFamily: 'ui-monospace, "Courier New", monospace'  // intencional para dígitos
// El tamaño SÍ usa tamanioFuenteCronometro — OK
```

**`public/index.html`:**

- No hay `<link>` a Google Fonts ni `@font-face` para **Inter** ni **Roboto**.
- El selector ofrece Roboto pero el navegador hace fallback a Arial → el usuario cree que "no cambia".

### 3.3 Bug en detección de fuente activa

En `MonitorConfigPanel.jsx`:

```javascript
const fuenteActual = FUENTES_DISPONIBLES.find(f => f.value === configVisual.fuenteFamilia)?.id
  || (configVisual.fuenteFamilia?.includes('Arial') ? 'arial' : 'inter');
```

Si el usuario escribió una fuente custom, el `<select>` no refleja el valor real y puede resetear al cambiar otro control.

### 3.4 Resumen de causas

1. **Tokens no cableados** (`pesoFuentePlato`, escalado de detalle en chips/alertas).
2. **Fuentes web no cargadas** (Roboto, opcionalmente Inter explícita).
3. **Estado inconsistente** entre preset y fuente custom.
4. **Modo bloques** en 1 columna hace que cambios de columnas no se vean hasta cambiar agrupación o columnas.

---

## 4. Diagnóstico — límite de 4 columnas

| Ubicación | Código actual | Efecto |
|-----------|---------------|--------|
| `MonitorConfigPanel.jsx` | Botones solo para 1, 2, 3, 4 | No hay opción 5–10 en UI |
| `CocinaMonitorLayout.jsx` L241 | `Math.min(4, Math.max(1, layoutColumnas))` | **Cap duro** aunque se guarde otro valor en localStorage |

```javascript
// Actual — impide 10 columnas
const layoutColumnas = Math.min(4, Math.max(1, configVisual.layoutColumnas || 1));
```

---

## 5. Diseño de la solución

### 5.1 Constantes centralizadas

Crear `src/config/monitorVisualConstants.js`:

```javascript
export const MONITOR_LAYOUT = {
  COLUMNAS_MIN: 1,
  COLUMNAS_MAX: 10,
  COLUMNAS_DEFAULT: 1,
};

export const MONITOR_TIPOGRAFIA = {
  PLATO_MIN: 14,
  PLATO_MAX: 96,
  DETALLE_MIN: 10,
  DETALLE_MAX: 48,
  CRONO_MIN: 12,
  CRONO_MAX: 80,
  COCINERO_MIN: 18,
  COCINERO_MAX: 40,
  PESO_DEFAULT: '800',
};
```

### 5.2 Tipografía — reglas de aplicación

| Token | Regla de uso en componentes |
|-------|----------------------------|
| `fuenteFamilia` | `fontFamily` en raíz de cada tarjeta/fila **y** heredar; cronómetros mantienen monospace como **stack secundario** |
| `tamanioFuentePlato` | Nombre del plato + badge `×N` (proporcional `* 0.6`) |
| `tamanioFuenteDetalle` | Complementos, mesas, etiquetas secundarias, chips MesaChips |
| `tamanioFuenteCronometro` | Valor del cronómetro en `TemporizadorChips` y `PlatoMonitorRow` |
| `tamanioFuenteCocinero` | Alias del cocinero en tarjeta y cabecera de bloque |
| `pesoFuentePlato` | `fontWeight` del nombre del plato (reemplazar `900` fijo) |

**Escalado de alertas** (URGENTE / ATENCIÓN):

```javascript
const fsUrgente = Math.round(tamanioFuenteDetalle * 0.85);
const fsAtencion = Math.round(tamanioFuenteDetalle * 0.75);
```

**MesaChips:**

```javascript
fontSize: `${Math.round((configVisual.tamanioFuenteDetalle || 20) * 0.65)}px`
```

### 5.3 Cargar fuentes web

En `public/index.html` (o CSS global):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
```

Actualizar entradas en `FUENTES_DISPONIBLES` para que coincidan con familias cargadas.

### 5.4 Arreglar estado fuente custom

En `MonitorConfigPanel` al elegir preset:

```javascript
onChange={e => {
  const f = FUENTES_DISPONIBLES.find(x => x.id === e.target.value);
  if (f) {
    const { fuenteFamiliaCustom, ...rest } = localDesign;
    onChange({ ...rest, fuenteFamilia: f.value });
  }
}}
```

Al escribir custom: guardar `fuenteFamiliaCustom` + `fuenteFamilia`.

Al reset: limpiar ambos.

### 5.5 Hasta 10 columnas — UI y layout

**Opción recomendada:** combinar botones 1–4 + control numérico o slider 1–10.

```
Diseño de lista
[1 col] [2] [3] [4]  Columnas: [−] [ 7 ] [+]  (máx. 10)
```

**Layout en `CocinaMonitorLayout.jsx`:**

```javascript
import { MONITOR_LAYOUT } from '../../config/monitorVisualConstants';

const layoutColumnas = Math.min(
  MONITOR_LAYOUT.COLUMNAS_MAX,
  Math.max(MONITOR_LAYOUT.COLUMNAS_MIN, configVisual.layoutColumnas || 1)
);
```

**CSS grid** (sin cambio de sintaxis):

```javascript
gridTemplateColumns: `repeat(${layoutColumnas}, minmax(0, 1fr))`
```

**Consideraciones UX con 10 columnas:**

| Columnas | Comportamiento sugerido |
|----------|-------------------------|
| 1–4 | Botones rápidos + preview de barras |
| 5–10 | Input numérico; en preview del panel mostrar `repeat(N, 1fr)` miniatura |
| 7+ | Reducir `minHeight` de tarjeta o sugerir `espaciadoFilas: 'compacto'` automáticamente (opcional) |

**Modo bloques:** si `layoutColumnas > 1`, forzar `modoAgrupacion: 'tarjetas'` o mostrar hint en panel: *"Con más de 1 columna se usa disposición en tarjetas"*.

Implementación sugerida en `CocinaMonitorLayout`:

```javascript
const modoBloques = modoCocineros
  && layoutColumnas === 1
  && (configVisual.modoAgrupacion || 'bloques') === 'bloques'
  && configVisual.mostrarCabeceraCocinero !== false;
```

Así, al elegir 2+ columnas, el grid se activa aunque antes estuviera en bloques.

### 5.6 Vista previa del panel

La preview en `MonitorConfigPanel` ya usa `configVisual` — verificar que:

- Muestre el **peso** configurado (no siempre 800 fijo en preview si el usuario eligió Normal).
- El mini-grid de columnas refleje N hasta 10 (texto `7 columnas` en lugar de solo iconos de barras).

---

## 6. Cambios por archivo

### Fase 1 — Infraestructura (≈ 0.25 día)

| # | Archivo | Cambio |
|---|---------|--------|
| F1.1 | `src/config/monitorVisualConstants.js` | **NUEVO** — límites columnas y tipografía |
| F1.2 | `public/index.html` | Cargar Inter + Roboto |
| F1.3 | `MonitorConfigPanel.jsx` | Importar constantes; arreglar fuente custom |

### Fase 2 — Tipografía en componentes (≈ 0.5 día)

| # | Archivo | Cambio |
|---|---------|--------|
| F2.1 | `CocineroPlatoCard.jsx` | Usar `pesoFuentePlato`; escalar URGENTE/ATENCIÓN/mesas |
| F2.2 | `PlatoMonitorRow.jsx` | Verificar peso y fuente (ya parcialmente OK) |
| F2.3 | `CocineroBlockHeader.jsx` | Escalar badges de carga con `tamanioFuenteDetalle` |
| F2.4 | `MesaChips.jsx` | Recibir y usar `tamanioFuenteDetalle` |
| F2.5 | `TemporizadorChips.jsx` | Opcional: `fontFamily` del config para prefijo; mantener mono en dígitos |
| F2.6 | `MonitorConfigPanel.jsx` | Preview con peso real; inputs usan constantes min/max |

### Fase 3 — Columnas hasta 10 (≈ 0.25 día)

| # | Archivo | Cambio |
|---|---------|--------|
| F3.1 | `MonitorConfigPanel.jsx` | Botones 1–4 + stepper/input 1–10 |
| F3.2 | `CocinaMonitorLayout.jsx` | `COLUMNAS_MAX = 10`; lógica `modoBloques` con columnas |
| F3.3 | `CocinaMonitorLayout.jsx` | `layoutBtn` iconos o label para 5–10 |

### Fase 4 — QA y pulido (≈ 0.25 día)

| # | Tarea |
|---|-------|
| F4.1 | Probar en Ver Cocina Completo y Personalizado |
| F4.2 | Probar persistencia `localStorage` + segunda pestaña |
| F4.3 | Probar modo fijo (TV): panel oculto — sin regresión |
| F4.4 | Verificar que colores y alertas siguen funcionando |

**Estimación total:** 1–1.5 días.

---

## 7. Wireframe — panel Personalizar (propuesto)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚙ Personalizar                                                    [✕]   │
├──────────────────────────────────────────────────────────────────────────┤
│ DISEÑO DE LISTA                                                          │
│ [1 col][2][3][4]   Columnas: [−] [ 7 ] [+]  (1–10)                      │
│ Espaciado: [Normal ▼]   Disposición tarjeta: [Vertical ▼]  (si cols > 1) │
├──────────────────────────────────────────────────────────────────────────┤
│ TIPOGRAFÍA                                                               │
│ Fuente: [Inter ▼]   Custom: [________________]                           │
│ Todo ±   Plato [−][36][+]   Detalle [−][20][+]   Crono [−][28][+]       │
│ Peso nombre: [Extra negrita ▼]                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ … Colores | Ver por cocinero | Alertas …                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ [ Vista previa en vivo con fuente/peso/tamaños aplicados ]               │
│                              [ Restaurar valores por defecto ]             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Casos de prueba

### 8.1 Tipografía

| Acción | Resultado esperado |
|--------|-------------------|
| Cambiar fuente a **Roboto** | Texto del plato cambia visiblemente (fuente cargada) |
| Cambiar fuente custom `Georgia, serif` | Toda la tarjeta usa Georgia |
| Subir **Nombre plato** a 48px | Nombre crece; badge ×N escala proporcional |
| Bajar **Detalle** a 12px | Complementos y chips de mesa más pequeños |
| Subir **Cronómetro** a 40px | Bloques de tiempo más grandes |
| **Peso → Normal (400)** | Nombre del plato visiblemente más liviano |
| **Todo el texto +** | Los tres tamaños suben juntos |
| Recargar página | Valores persisten desde `cocinaMonitorDesign` |

### 8.2 Columnas

| Acción | Resultado esperado |
|--------|-------------------|
| Elegir **10 columnas** | Grid `repeat(10, 1fr)` con tarjetas en fila |
| Elegir **7 columnas** con 14 platos | 2 filas (7+7) sin overflow horizontal |
| 1 columna + modo bloques | Cabeceras de cocinero + lista vertical |
| 3 columnas | Sale de modo bloques; grid de tarjetas |
| Valor 11 en input | Se clampea a 10 |
| localStorage con `layoutColumnas: 8` | Al abrir, muestra 8 columnas |

### 8.3 Regresión

| Escenario | OK |
|-----------|-----|
| Modo fijo (TV) | Sin botón Personalizar |
| Colores del panel | Siguen aplicándose |
| Alertas amarillo/rojo | Umbrales respetados |
| Buscador de platos en barra | Sin interferencia con config visual |

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| 10 columnas ilegibles en tablet | Documentar uso en TV/monitor grande; espaciado compacto |
| Google Fonts offline en cocina | Fallback `system-ui`; fuentes del sistema en lista |
| Tarjetas muy estrechas con 10 cols | `minmax(0, 1fr)` + `word-break` ya en tarjeta vertical |
| Modo bloques confunde al usuario | Auto-switch a tarjetas con 2+ columnas + hint en panel |

---

## 10. Checklist de archivos

```
appcocina/
  public/index.html                         [MODIFICAR — fonts]
  src/config/monitorVisualConstants.js    [NUEVO]
  src/components/monitor/
    MonitorConfigPanel.jsx                  [MODIFICAR — tipografía + 10 cols]
    CocinaMonitorLayout.jsx                 [MODIFICAR — cap 10 + modoBloques]
    CocineroPlatoCard.jsx                   [MODIFICAR — peso + escalado]
    PlatoMonitorRow.jsx                     [VERIFICAR]
    CocineroBlockHeader.jsx                 [MODIFICAR — escalado]
    MesaChips.jsx                           [MODIFICAR — tamanioFuenteDetalle]
    TemporizadorChips.jsx                   [OPCIONAL]
  docs/
    PLAN_PERSONALIZAR_VISTA_COCINA_TIPOGRAFIA_COLUMNAS.md  [ESTE DOC]
```

---

## 11. Criterios de aceptación

1. **Tipo de fuente:** al cambiar Inter → Roboto → Arial, el nombre del plato en la vista refleja el cambio sin recargar manualmente más allá del guardado automático.
2. **Tamaños:** controles Nombre / Detalle / Cronómetro / Todo el texto modifican el render en tiempo real.
3. **Peso del nombre:** Normal / Negrita / Extra negrita se distinguen claramente en `CocineroPlatoCard`.
4. **Fuente personalizada:** escribir una familia CSS válida la aplica; al volver a un preset se limpia el custom.
5. **Columnas:** el usuario puede elegir de **1 a 10** columnas y el grid respeta el valor.
6. Con **2+ columnas**, la vista muestra tarjetas en grid (no solo bloques de cocinero en columna única).
7. La configuración persiste en `localStorage` y se sincroniza entre pestañas del monitor.
8. La vista previa del panel refleja tipografía y peso configurados.

---

## 12. Nota sobre ConfigModal del KDS (tablero comandas)

El **ConfigModal** de las tablas KDS (`ComandaStyle`, `ConfigModal.jsx`) es un sistema **distinto** (`ConfigContext`, `columnasGrid` del tablero Kanban). Este plan cubre solo el botón **Personalizar** del **monitor Ver Cocina** (`CocinaMonitorLayout`). No mezclar `columnasGrid` (KDS) con `layoutColumnas` (monitor).

---

*Documento listo para implementación. Siguiente paso recomendado: Fase 1 (constantes + fonts) en branch dedicada.*
