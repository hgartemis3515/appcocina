# Plan: Barra superior KDS + Historial + Vista personalizable + Responsive móvil

**Versión:** 1.2  
**Fecha:** Agosto 2026  
**Proyecto:** App Cocina (`appcocina`)  
**Estado:** Implementado (F0–F4)  
**Alcance:** Las 3 tablas KDS operativas (General, Personalizada, Supervisor)  
**Changelog v1.1:** Regla de inclusión de **comandas parciales** en Historial (al menos un plato ya entregado; pendientes en gris; excluir full-pendientes).  
**Changelog v1.2:** Implementación completa F0–F4. `KdsTopBar` compartido, `HistorialModal` con regla parcial/finalizada, Config Vista v7.3 con presets y grid CSS real, endpoint `/historial-cocina`, filtros de Reportes cableados.

**Relacionado con:**
- `CONFIGURACION_KDS_V7.1.md` (configuración Vista / perfiles)
- `IMPLEMENTACION_ZONAS_KDS_ESTADO.md` (separación de las 3 vistas)
- `APP_COCINA_PLAN_IMPLEMENTACION_SALIO.md` (ciclo `en_espera → recoger → salio → entregado`)
- `PLAN_PERSONALIZAR_VISTA_COCINA_TIPOGRAFIA_COLUMNAS.md` (Personalizar de **Ver Cocina** — monitor pasivo; **no confundir** con Config → Vista del KDS)

---

## Resumen ejecutivo

Las tres tablas KDS comparten una barra superior densamente empaquetada, pensada para monitores de cocina, que **no se adapta** a teléfonos (Samsung S24, Huawei, Xiaomi). No existe un **Historial** usable para consultar platos/comandas ya finalizados; solo hay un stub deshabilitado en el menú, Reportes del día (filtros no cableados) y Revertir (solo platos en `recoger`).

Este plan propone:

1. **Reordenar y compactar la barra superior** con jerarquía clara y overflow en móvil.
2. **Responsive automático** (breakpoints + safe-area) para teléfonos Android comunes.
3. **Botón Historial** en la barra: comandas con al menos un plato ya entregado por cocina (`salio` / “Entregó el plato”, y/o `entregado`), **incluyendo comandas aún incompletas** (otros platos pendientes en gris). **No** listar comandas con todos los platos pendientes.
4. **Filtros de historial** (fecha, mozo, estado, cocinero, mesa…) con **día actual por defecto** (zona America/Lima).
5. **Mejorar Config → Vista** para que las opciones realmente personalicen la comodidad del tablero KDS.
6. **Recomendaciones** de UX, arquitectura y priorización.

---

## 1. Situación actual

### 1.1 Las 3 tablas KDS

| Vista | Ruta / entrada | Componente | Diferencia clave |
|-------|----------------|------------|------------------|
| **General** | `COCINA` | `comandastyle.jsx` | Todas las comandas activas del día |
| **Personalizada** | `COCINA_PERSONALIZADA` | `ComandastylePerso.jsx` | Filtra por zonas del cocinero + strip `CocineroInfo` |
| **Supervisor** | `COCINA_SUPERVISOR` | `ComandaStyleSupervi.jsx` | Envuelve General; toma/deja/finaliza con flujo supervisor |

Las tres comparten el mismo patrón de UI: header fijo + grid de tarjetas + barra inferior de acciones.

### 1.2 Barra superior actual

Estructura en General / Personalizada (`h-16`, `px-6`, una sola fila sin wrap):

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  HH:mm          [ COCINA LAS GAMBUSINAS ]     [Vista] [Pendientes] [Socket] [botones…] │
│  DD/MM/YYYY                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Cluster derecho (izq → der):**

| # | Control | Notas |
|---|---------|-------|
| 1 | Badge de vista | “Vista General” / “Vista Personalizada” |
| 2 | Contador pendientes | Número grande amarillo |
| 3 | Socket | Realtime / Desconectado / Error Auth |
| 4 | **PPA** | Tickets pago adelantado |
| 5 | **Menú** | Volver al menú |
| 6 | **Buscar** | Toggle buscador |
| 7 | **Reportes** | Stats del día |
| 8 | **Config** | Modal configuración |
| 9 | **Revertir** | Deshacer `recoger` → `en_espera` |
| 10 | **Fullscreen** | Expand / compress |

Supervisor añade badge flotante + **Asignar** encima del mismo header.

**Problemas:**

| Problema | Impacto |
|----------|---------|
| Título absoluto centrado + cluster denso | Colisión / overflow en anchos 360–412 px |
| Botones con icono + texto | No caben; no hay menú overflow |
| Sin breakpoints en KDS | El menú sí tiene `sm:`; el tablero no |
| Tarjetas fijas `300×520` | En teléfono queda 1 columna incómoda y scroll alto |
| Barra inferior sticky ancha | Botones grandes lado a lado desbordan |

### 1.3 Historial hoy

| Pieza | Estado |
|-------|--------|
| Tile “Historial” en `MenuPage` | `enabled: false` — stub “Días anteriores” |
| Botón en barra KDS | **No existe** |
| Reportes | Stats en memoria; dropdowns mozo/mesa/estado **no filtran** |
| Revertir | Solo platos en `recoger` ≤ 24 h del día actual |
| `historialPlatos` / `historialEstados` | Auditoría de ediciones/anulaciones, no pantalla de cocina |

Cuando todos los platos activos pasan a `salio` / `entregado`, la tarjeta **desaparece del KDS**. No hay forma de revisar “qué se terminó” sin salir a Reportes/Revertir incompletos.

### 1.4 Config → Vista hoy

| Control | ¿Se guarda? | ¿Afecta el tablero? |
|---------|-------------|---------------------|
| Tamaño de Fuente (12–24) | Sí → `design.fontSize` | **Sí** |
| Tamaño de Tarjeta (compacto/mediano/expandido) | Sí | **No** (cosmético) |
| Columnas / Filas del Grid | Sí → `design.cols/rows` | Solo **paginación** (`cols × rows`), no CSS grid real |
| Ordenamiento por defecto | Sí | Parcial (vía `useKdsBehavior`) |
| Modo Tarjetas / Tabla | Sí | **No** — siempre Kanban |
| Preview en vivo | — | Engañoso: muestra columnas CSS que el KDS no usa |
| `mostrarImagenes` / `agruparPorMesa` | En defaults | **No expuestos** en UI |

`PERFILES_PREDEFINIDOS` está vacío (`{}`). No hay preset “Teléfono”.

### 1.5 APIs relevantes (backend)

| Endpoint | Uso potencial |
|----------|---------------|
| `GET /api/comanda/fecha/:fecha` | Comandas del día (Revertir ya lo usa) |
| `GET /api/comanda/cocina/:fecha` | Endpoint optimizado cocina (tablero activo) |
| `GET /api/comanda/fechastatus/:fecha` | Variante por status/entregado |
| Modelo plato | `estado`, `tiempos.recoger`, `tiempos.salio`, `procesadoPor`, etc. |
| Modelo comanda | `mozoNombre`, `status`, `historialPlatos`, mesa, orden |

---

## 2. Objetivos

### 2.1 Barra superior

- Jerarquía clara: **estado operativo** (hora, pendientes, conexión) separado de **acciones**.
- Mismos botones en las 3 vistas; orden coherente e idéntico.
- En desktop: usable sin menú oculto excesivo.
- En móvil: compacta, touch-friendly (≥ 44 px), sin overflow horizontal.

### 2.2 Responsive automático (S24 / Huawei / Xiaomi)

- Adaptación por **viewport** (CSS + breakpoints), no por marca de dispositivo.
- Probar explícitamente en:
  - **Samsung S24** (~360–412 CSS px, Chrome)
  - **Huawei** (navegador propio / WebView)
  - **Xiaomi** (MIUI browser / WebView)
- Respetar `env(safe-area-inset-*)` (notch / barra de gestos).
- Grid de tarjetas fluido; barra inferior apilable o con “Más acciones”.

### 2.3 Historial

- Botón **Historial** visible en la barra superior de las 3 KDS.
- Mostrar comandas que tengan **al menos un plato ya entregado** por cocina (“Entregó el plato” → `salio`, y/o `entregado`):
  - Comandas **totalmente finalizadas** (todos los platos ya salieron / entregados).
  - Comandas **parciales** (1+ platos entregados **y** 1+ platos aún pendientes): la comanda entra al historial; los pendientes se ven en **gris** como pendientes.
- **No mostrar** comandas donde **ningún** plato ha sido entregado aún (full pendientes → solo viven en el tablero KDS activo).
- Al abrir una comanda del historial: **comanda completa** (entregados + pendientes grises + metadatos).
- Filtros: fecha (rango opcional), **mozo**, mesa, cocinero, estado de plato/comanda, búsqueda texto.
- **Default al abrir:** solo **día actual** (America/Lima).

### 2.4 Config → Vista

- Que cada control **cambie de verdad** la comodidad del tablero.
- Renombrar o cablear opciones muertas; alinear preview con realidad.
- Presets útiles (escritorio cocina / tablet / teléfono).

---

## 3. Propuesta de barra superior

### 3.1 Principios de orden

1. **Izquierda:** identidad temporal (hora + fecha) + badge de vista corto.
2. **Centro (desktop):** título corto o vacío en móvil (evitar título absoluto que tapa controles).
3. **Derecha:** métricas críticas + acciones agrupadas por frecuencia de uso.

**Orden recomendado de acciones (frecuencia / criticidad):**

```
[Buscar] [Historial] [PPA] [Reportes] [Revertir] [Config] [Menú] [Fullscreen]
```

| Botón | Por qué ese lugar |
|-------|-------------------|
| Buscar | Uso continuo en servicio |
| **Historial** | Nuevo; consulta frecuente “¿ya salió X?” |
| PPA | Operativo puntual |
| Reportes | Consulta, no acción de plato |
| Revertir | Corrección; menos frecuente que Historial |
| Config | Setup |
| Menú / Fullscreen | Navegación / pantalla |

### 3.2 Layout desktop (≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ HH:mm   [General]   COCINA                    ⚠ 12   ● RT   🔍 📜 PPA … ⚙ ⛶   │
│ 03/08/26                                                                        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- Título opcionalmente acortado a **COCINA** o ocultable vía Vista.
- Contador: icono + número (sin label largo “Comandas Pendientes”).
- Socket: solo punto de color + tooltip (texto “Realtime” en `title`).

### 3.3 Layout tablet (768–1023 px)

- Icon-only en botones secundarios (Reportes, Config, Revertir, Fullscreen) con `title` / `aria-label`.
- Historial y Buscar mantienen label corto o icono + badge.

### 3.4 Layout teléfono (< 768 px) — S24 / Huawei / Xiaomi

```
┌─────────────────────────────────────────────┐
│ HH:mm  [G]   ⚠12  ●    🔍  📜  ⋮          │
│ 03/08                                  Menú │  ← o Menú dentro del overflow
└─────────────────────────────────────────────┘
```

**Fila única compacta (~48–56 px):**

| Visible siempre | En menú overflow `⋮` |
|-----------------|----------------------|
| Hora | Reportes |
| Badge vista (G / P / S) | Revertir |
| Pendientes | Config |
| Socket (punto) | Fullscreen |
| Buscar | PPA (si hay tickets: badge en ⋮ o icono PPA siempre si count > 0) |
| **Historial** | Menú (alternativa: Menú siempre visible) |

**Recomendación:** si `ppaCount > 0`, mostrar icono PPA fuera del overflow (prioridad operativa).

### 3.5 Componente compartido (evitar drift entre 3 vistas)

Extraer un componente único:

```
src/components/Principal/KdsTopBar.jsx
```

Props: `vista` (`general` | `personalizada` | `supervisor`), contadores, handlers, `socketStatus`, `ppaCount`.

Usarlo desde `comandastyle.jsx`, `ComandastylePerso.jsx` y wrapper Supervisor.  
**Personalizada** mantiene su segunda strip (zonas / `CocineroInfo`) debajo, sin mezclarla en el top bar.

### 3.6 Barra inferior (acompañamiento responsive)

Fuera del top bar pero necesario para teléfonos:

- Desktop: igual que hoy.
- Móvil: acciones primarias contextuales (Tomar / Finalizar / Entregar) a ancho completo; secundarias en sheet “Más”.
- `padding-bottom: env(safe-area-inset-bottom)`.

---

## 4. Responsive automático — detalle

### 4.1 Estrategia (no fingerprinting de marca)

Detectar por **ancho CSS** + `pointer: coarse` opcional:

| Breakpoint | Target aproximado | Comportamiento |
|------------|-------------------|----------------|
| `< 480px` | S24 / mid-range vertical | Top bar overflow, 1 col cards, font táctil |
| `480–767px` | Teléfono landscape / phablet | 1–2 cols, labels cortos |
| `768–1023px` | Tablet cocina | 2–3 cols, icon-only toolbar |
| `≥ 1024px` | Monitor KDS | Layout actual mejorado |

**No** ramificar por “Huawei vs Xiaomi” en código. Sí: checklist de QA en esos dispositivos (ver §9).

### 4.2 Grid de tarjetas

| Hoy | Propuesto |
|-----|-----------|
| `minmax(300px, 300px)` / alto 520 fijo | `minmax(min(100%, var(--kds-card-min)), 1fr)` |
| Pagina por `cols×rows` sin CSS columns | Opción A: columnas CSS reales desde Vista; Opción B: renombrar a “Tarjetas por página” y dejar CSS automático por breakpoint |

**Recomendación:** híbrido:

1. En móvil, **forzar 1 columna** (salvo que el usuario elija “2 columnas compactas” en Vista).
2. En desktop, respetar `columnasGrid` como columnas CSS **y** como tamaño de página.
3. Alturas de tarjeta según `tamanoTarjeta` (compacto / mediano / expandido) — cablear de una vez.

### 4.3 Modales (Config, Historial, Reportes, Revertir)

- Full-width en `< 768px`, `max-h-[100dvh]`, scroll interno.
- Controles ≥ 44×44 px.
- Evitar `position: fixed` que choque con teclado virtual Android al filtrar por texto.

### 4.4 Quirks a validar en QA

| Dispositivo | Riesgo |
|-------------|--------|
| S24 + Chrome | Baseline; `100dvh`, safe-area |
| Huawei browser | `fullscreen` API inconsistente; fallback a clase CSS altura |
| Xiaomi / MIUI WebView | zoom de fuente del sistema; probar `text-size-adjust: 100%` |
| Todos | teclado cubre filtros del Historial |

---

## 5. Historial — diseño funcional

### 5.1 Entrada

- Botón **Historial** en `KdsTopBar` (las 3 vistas).
- Abre modal pantalla completa / panel lateral ancho (desktop: drawer derecho ~480–560 px o modal 90vw; móvil: full screen).
- El tile del menú principal puede habilitarse después apuntando al mismo módulo (fase 2).

### 5.2 Qué muestra (definición de producto)

#### Regla de oro — inclusión de comandas

Una comanda **entra al Historial** si y solo si tiene **≥ 1 plato activo** en estado de entrega de cocina ya hecha:

| Plato “ya entregado” (cuenta para incluir) | Significado en cocina |
|--------------------------------------------|------------------------|
| `salio` | Acción **“Entregó el plato”** (salió del pass) |
| `entregado` | Mozo ya entregó en salón (ciclo más avanzado) |

| Resultado | ¿Aparece en Historial? |
|-----------|------------------------|
| Todos los platos aún pendientes (`pedido` / `en_espera` / etc. sin ningún `salio`/`entregado`) | **No** — solo tablero KDS vivo |
| ≥ 1 plato `salio` o `entregado`, y el resto pendiente | **Sí** — comanda **parcial** |
| Todos los platos `salio` / `entregado` (comanda cerrada para cocina) | **Sí** — comanda **finalizada** |

```
Ejemplo — Mesa 12, Orden #45 (3 platos)
  ✅ 2× Lomo saltado     → salio      (entregó cocina)     ← motiva la inclusión
  ✅ 1× Chicha           → entregado
  ⏳ 1× Ají de gallina   → en_espera  → se muestra en GRIS “Pendiente”

→ La comanda SÍ aparece en Historial (parcial / “falta terminar”).

Ejemplo — Mesa 8, Orden #20 (2 platos)
  ⏳ 1× Arroz chaufa     → en_espera
  ⏳ 1× Papa a la huancaína → pedido

→ La comanda NO aparece en Historial (full pendientes).
```

**Platos anulados/eliminados:** no cuentan como “pendientes” ni como “entregados” para la regla de inclusión (ignorar en el cómputo; opcional mostrarlos tachados en el detalle).

**`recoger` (listo en pass, aún no “Entregó”):** por defecto **no** cuenta como entregado para incluir la comanda. Si la comanda ya entró por otro plato `salio`/`entregado`, el plato en `recoger` se muestra con estilo intermedio (p. ej. amarillo “En pass”), no gris pendiente.  
**Filtro avanzado opcional:** tratar `recoger` como criterio de inclusión (cruce con Revertir) — desactivado por default.

#### Presentación de platos dentro de la comanda

Al listar o expandir una comanda del historial se muestra **siempre la comanda completa**:

| Estado del plato | Estilo visual | Etiqueta |
|------------------|---------------|----------|
| `salio` | Color normal / énfasis “entregado cocina” | Entregó / Salió + hora |
| `entregado` | Similar o check completo | Entregado + hora |
| `recoger` | Intermedio (no gris) | En pass / Por entregar |
| Pendientes (`pedido`, `en_espera`, …) | **Gris** (texto y badge atenuados) | **Pendiente** |
| Anulado / eliminado | Tachado opcional | Anulado |

Badge de cabecera de comanda sugerido:

- `Parcial · 1/3 entregados` — aún faltan platos  
- `Finalizada · 3/3` — nada pendiente  

#### Fila de lista (modo por comanda — default recomendado)

```
[Parcial 2/3]  Mesa 12 · Orden #45 · Mozo: Ana · último salió 14:32
  ✅ 2× Lomo saltado     salio 14:28
  ✅ 1× Chicha           entregado 14:32
  ⬜ 1× Ají de gallina   Pendiente   ← gris
  [Ver detalle]
```

#### Fila de lista (modo por plato entregado — alternativo)

```
[14:28 salió]  Mesa 12 · Orden #45 · Mozo: Ana
  2× Lomo saltado · Cocinero: Luis · 14 min
  [Ver comanda]  → abre la misma comanda completa (entregados + pendientes grises)
```

En ambos modos, **“Ver comanda” / detalle** muestra todos los platos con la tabla de estilos de arriba (pendientes en gris).

### 5.3 Modos de lista

| Modo | Descripción | Default |
|------|-------------|---------|
| **Por comanda** | Una fila por comanda elegible (≥ 1 plato `salio`/`entregado`), con preview de platos (pendientes en gris) | **Sí** — alinea con “ver qué falta terminar” |
| **Por plato entregado** | Una fila por cada plato `salio`/`entregado`; al expandir, comanda completa con pendientes grises | Alternativa |

Toggle en cabecera del Historial.

### 5.4 Filtros

| Filtro | Tipo | Default |
|--------|------|---------|
| **Fecha** | date (y opcional “hasta”) | **Hoy (America/Lima)** |
| Rango rápido | Hoy / Ayer / Últimos 7 días | — |
| **Mozo** | select (nombres únicos del dataset del día) | Todos |
| Mesa | texto / select | Todos |
| Cocinero (`procesadoPor`) | select | Todos (en Personalizada: preseleccionar cocinero logueado — opcional) |
| Estado plato (énfasis) | `salio` / `entregado` / ambos | Ambos (solo afecta resaltado; la comanda sigue trayendo pendientes) |
| Progreso comanda | Parciales / Finalizadas / Todas elegibles | **Todas elegibles** (parciales + finalizadas) |
| Búsqueda | nombre plato, #orden, mesa | vacío |

**Regla:** al abrir Historial, resetear filtros a default (día actual). No persistir fecha anterior entre sesiones (evita confusión “¿dónde están las de hoy?”). Opcional: recordar solo preferencia de modo lista / columnas.

**Filtro “Parciales”:** solo comandas con ≥ 1 entregado **y** ≥ 1 pendiente (gris).  
**Filtro “Finalizadas”:** todos los platos activos ya `salio`/`entregado`.

### 5.5 Datos y API

**Fase 1 (rápida):** reutilizar `GET /api/comanda/fecha/:fecha` (o `fechastatus`) y en cliente:

```
elegible = comandas.filter(c =>
  platosActivos(c).some(p => ['salio', 'entregado'].includes(estado(p)))
)
// platosActivos = no eliminados / no anulados
// Incluye comandas parciales; excluye full-pendientes
```

Devolver/mostrar **todos** los platos de esas comandas (no solo los `salio`), para poder pintar pendientes en gris.

**Fase 2 (recomendada si el volumen crece):**

```
GET /api/comanda/historial-cocina
  ?fecha=YYYY-MM-DD
  &fechaHasta=YYYY-MM-DD   (opcional)
  &mozoId=...
  &cocineroId=...
  &progreso=parcial|finalizada|todas   (default: todas elegibles)
  &mesa=...
  &q=...
```

Criterio servidor: comandas del rango con **al menos un** plato en `salio` o `entregado`.  
Payload: comanda completa proyectada (mesa, orden, mozoNombre, status, platos[{ id, nombre, estado, tiempos, procesadoPor }], conteo `entregados/total`).

Índices ya cercanos: fecha + estados de plato; validar rendimiento con `listarComandaPorFecha`.

### 5.6 Tiempo real

- Mientras el modal está abierto en **día = hoy**:
  - Si un plato pasa a `salio`/`entregado` en una comanda que **antes era full-pendiente** → la comanda **entra** al Historial (parcial).
  - Si se entrega otro plato de una comanda ya listada → actualizar conteo `x/y` y quitar gris de ese plato.
  - Si el último pendiente se entrega → badge pasa a **Finalizada**.
- Días pasados: solo fetch estático.

### 5.7 Relación con Reportes y Revertir

| Herramienta | Rol |
|-------------|-----|
| **Historial** | Consulta operativa “qué salió / qué comanda” |
| **Reportes** | Agregados / PDF / métricas (arreglar filtros existentes en paralelo o después) |
| **Revertir** | Acción correctiva sobre `recoger` |

Desde Historial **no** revertir `salio` en v1 (política de cocina; si se necesita, link explícito a flujo aparte).  
Desde una fila `recoger` (si se incluye en filtro avanzado) sí se puede deep-link a Revertir.

### 5.8 Archivos nuevos sugeridos

```
appcocina/src/components/Principal/
  HistorialModal.jsx          ← shell + filtros + lista
  HistorialComandaDetalle.jsx ← panel comanda completa
  HistorialPlatoRow.jsx       ← fila de evento
hooks/
  useHistorialCocina.js        ← fetch, filtro elegibles (≥1 salio/entregado), default hoy
utils/
  historialComandaRules.js    ← NUEVO (recomendado): isComandaElegibleHistorial, classifyPlatoHistorial
```

Integración: estado `showHistorial` en las 3 vistas vía `KdsTopBar` / core hook si existe (`useComandastyleCore`).

**Tests unitarios sugeridos** (`historialComandaRules`):

- full pendiente → no elegible  
- 1 `salio` + 2 `en_espera` → elegible parcial  
- todos `salio`/`entregado` → elegible finalizada  
- solo `recoger` sin `salio` → no elegible (v1.1)  
- platos anulados no cuentan en el denominador de “pendiente”

---

## 6. Config → Vista — mejoras

### 6.1 Problema a resolver

Hoy el usuario cree que “Columnas / Tamaño de tarjeta / Modo tabla” personalizan el KDS; en realidad casi solo cambia la fuente y cuántas tarjetas caben por página. El preview miente.

### 6.2 Controles propuestos (tab Vista)

#### A. Densidad y tipografía (comodidad)

| Control | Comportamiento real |
|---------|---------------------|
| **Tamaño de fuente** | Como hoy (12–24), aplicado a cards |
| **Tamaño de tarjeta** | Mapeo CSS: compacto (alto ~380, padding menor) / mediano (~520) / expandido (~640, más espacio platos) |
| **Espaciado del grid** | gap sm / md / lg |
| **Densidad de platos** | compacta / normal (line-height y tamaño nombre plato) |

#### B. Layout del tablero

| Control | Comportamiento real |
|---------|---------------------|
| **Columnas visibles** | CSS `grid-template-columns: repeat(N, 1fr)` **y** page size |
| **Filas por página** | page size = cols × rows (dejar claro en label: “Tarjetas por página: N”) |
| **Modo de vista** | Fase 1: solo Tarjetas cableado; Tabla compacta en fase 2 o **ocultar** hasta implementar |
| **Adaptación móvil** | Toggle: “Forzar 1 columna en teléfono” (default **on**) |

#### C. Contenido de tarjeta

| Control | Default | Notas |
|---------|---------|-------|
| Mostrar mozo | on | |
| Mostrar cocinero asignado | on | Alineado a doc multi-cocinero |
| Mostrar imágenes de plato | off | Ya en defaults; exponer |
| Agrupar por mesa | off | Exponer solo si hay implementación clara |
| Mostrar título “COCINA LAS GAMBUSINAS” | on desktop / off móvil auto | Reduce choque en barra |
| Compactar barra superior | off | Fuerza icon-only incluso en desktop |

#### D. Presets (reemplazan perfiles vacíos)

| Preset | Valores sugeridos |
|--------|-------------------|
| **Monitor cocina** | 5 cols × 1 fila, fuente 15, tarjeta mediana |
| **Tablet** | 2–3 cols, fuente 16, compacto |
| **Teléfono** | 1 col, fuente 16–18, tarjeta compacta, barra compacta, forzar 1 col móvil |
| **Restablecer** | `DEFAULT_KDS_CONFIG` |

Al elegir preset, aplicar y permitir ajuste fino. Incrementar `KDS_CONFIG_VERSION` (ej. `7.3.0`) al cambiar shape.

### 6.3 Preview honesto

- Si modo tarjetas: preview con **el mismo** `minmax` / alto que usará el grid.
- Texto: “En este dispositivo se verán ~X tarjetas por página”.
- En viewport estrecho del propio modal, mostrar aviso: “Vista previa móvil: 1 columna”.

### 6.4 Cableado técnico

| Archivo | Cambio |
|---------|--------|
| `kdsConfigConstants.js` | Nuevos campos + presets + bump versión |
| `ConfigModal.jsx` | UI Vista reorganizada por secciones A–D |
| `useKdsBehavior.js` | Aplicar `tamanoTarjeta`, `modoVista`, gaps |
| `comandastyle.jsx` / `ComandastylePerso.jsx` | CSS grid según config; quitar hardcode 300×520 |
| `ConfigContext.jsx` | Migración al leer versión antigua |

**Recomendación fuerte:** en v1 del plan, **no implementar Modo Tabla** a medias. O se hace una tabla usable (filas de platos, selección, acciones) o se oculta la opción. Dejar un select muerto empeora la confianza en Config.

---

## 7. Recomendaciones del plan

### 7.1 Producto / UX

1. **Default por comanda (parcial + finalizada):** el cocinero necesita ver “entregué 2, falta 1” en contexto; pendientes en **gris** evitan confundirlos con entregados.
2. **Nunca listar full-pendientes** en Historial: eso es ruido duplicado del tablero KDS vivo.
3. **Día actual por defecto** y chips Hoy/Ayer: reduce errores de fecha en el caos del servicio.
4. **No mezclar Historial con Revertir** en un solo modal: consulta ≠ corrección.
5. **Barra con overflow `⋮`** antes que scroll horizontal: en Android el scroll horizontal de toolbar es fácil de no descubrir.
6. **PPA con badge numérico** siempre visible si hay pendientes, aunque el resto esté en overflow.
7. Extraer **`KdsTopBar` compartido** antes de tocar Historial en 3 archivos: evita divergencia General/Perso/Supervi.
8. Modo “por plato” como toggle secundario para buscar “¿a qué hora salió el lomo?”, siempre con enlace a la comanda completa.

### 7.2 Técnica

1. Empezar Historial con **API existente** + filtro cliente; endpoint dedicado solo si latencia/payload duelen.
2. Bump de `KDS_CONFIG_VERSION` + migración al cablear `tamanoTarjeta`.
3. Preferir **`100dvh` + safe-area** sobre `h-screen` en móvil.
4. Tests: extender `vistasKDS.test.js` / filtros historial unitarios; smoke manual en 3 teléfonos reales.
5. No acoplar este trabajo al Personalizar de **Ver Cocina** (monitor TV): APIs visuales distintas.

### 7.3 Priorización sugerida (fases)

| Fase | Entrega | Valor |
|------|---------|-------|
| **F0** | Extraer `KdsTopBar` + overflow móvil + safe-area (sin Historial aún) | Desbloquea teléfonos |
| **F1** | Botón + `HistorialModal` día actual; regla parcial/finalizada; pendientes grises; filtros mozo/fecha/progreso | Pedido principal |
| **F2** | Cablear Vista: tarjeta, columnas CSS reales, presets Monitor/Tablet/Teléfono, preview honesto | Comodidad |
| **F3** | Endpoint historial + rango fechas + socket live + habilitar tile menú | Escala |
| **F4** | Modo tabla compacta (si aún se necesita) + arreglar filtros de Reportes | Nice-to-have |

### 7.4 Fuera de alcance (explícito)

- Cambiar máquina de estados `salio` / `entregado`.
- Reemplazar Reportes PDF.
- Historial de anulaciones/edits de mozos (eso es auditoría admin).
- Rediseño completo de cards de plato (solo densidad vía Vista).

---

## 8. Criterios de aceptación

### Barra + responsive

- [ ] En viewport 360×800 (S24-like) la barra **no** genera scroll horizontal ni solapa el título con botones.
- [ ] Acciones secundarias accesibles vía `⋮` con targets ≥ 44 px.
- [ ] Las 3 vistas muestran el mismo orden de acciones.
- [ ] Safe-area inferior no tapa Tomar/Finalizar/Entregar.
- [ ] QA pasado en al menos un Samsung, un Huawei y un Xiaomi (o emulación + 1 dispositivo real mínimo).

### Historial

- [ ] Botón Historial visible en General, Personalizada y Supervisor.
- [ ] Al abrir, filtro de fecha = **hoy (Lima)** sin acción del usuario.
- [ ] Entra una comanda con ≥ 1 plato `salio`/`entregado` aunque queden platos pendientes (**parcial**).
- [ ] Esa comanda muestra los platos pendientes en **gris** con etiqueta **Pendiente**.
- [ ] Una comanda con **todos** los platos pendientes **no** aparece en Historial.
- [ ] Comandas 100 % entregadas aparecen con badge Finalizada.
- [ ] Filtro por mozo funciona sobre el dataset cargado.
- [ ] Filtro Parciales / Finalizadas respeta §5.2 / §5.4.
- [ ] “Ver comanda” / detalle muestra **todos** los platos + mesa/mozo/orden/tiempos.
- [ ] Cambiar a “Ayer” recarga datos; volver a “Hoy” restaura default.

### Vista

- [ ] Cambiar tamaño de tarjeta altera alto/padding reales en el KDS.
- [ ] Columnas alteran el grid visible en desktop (no solo el número de página).
- [ ] Preset “Teléfono” deja 1 columna + fuente legible + barra compacta.
- [ ] Preview refleja el comportamiento real (o advierte la diferencia móvil).
- [ ] Opciones no implementadas no aparecen (o están deshabilitadas con “Próximamente”).

---

## 9. Plan de pruebas (QA)

| Caso | Cómo |
|------|------|
| Overflow toolbar 360 / 412 / 768 / 1280 | DevTools + dispositivos reales |
| Historial vacío (sin ningún `salio`/`entregado` del día) | Mensaje claro “Sin entregas registradas hoy” |
| Comanda parcial (1 entregado + 2 pendientes) | Aparece; pendientes en gris “Pendiente”; badge Parcial x/y |
| Comanda full pendiente | **No** aparece en Historial; sigue solo en KDS |
| Comanda 100 % entregada | Aparece; badge Finalizada |
| Historial con muchas comandas | Scroll virtual o paginación; no freeze |
| Filtro mozo / Parciales / Finalizadas | Resultados coherentes; empty state si no hay match |
| Personalizada + Historial | Datos coherentes (¿global del día o solo zonas? — **recomendación:** historial **global del local** con filtro cocinero opcional; no limitar por zona salvo toggle) |
| Supervisor | Mismo Historial; sin romper Asignar |
| Config preset Teléfono → volver Monitor | Migración sin corromper localStorage |
| Teclado Android en búsqueda Historial | Campos visibles / scroll into view |

**Decisiones de producto:**

1. En Vista Personalizada, ¿el Historial lista todo el restaurante o solo platos de las zonas del cocinero?  
   **Recomendación:** listar **todo el día** + filtro cocinero preseleccionado al usuario logueado (deseleccionable).
2. ¿`recoger` cuenta para incluir la comanda?  
   **Decisión del plan (v1.1):** **No** por defecto; solo `salio` / `entregado` (“Entregó el plato” y siguientes).

---

## 10. Esfuerzo estimado (orientativo)

| Fase | Esfuerzo relativo |
|------|-------------------|
| F0 Top bar compartida + responsive | M–L |
| F1 Historial modal + filtros día | L |
| F2 Vista cableada + presets | M |
| F3 API dedicada + live + menú | M |
| F4 Tabla + Reportes filters | L (opcional) |

*(M = mediano, L = largo; sin fechas de calendario — priorizar F0→F1→F2.)*

---

## 11. Resumen de archivos a tocar

```
appcocina/
├── docs/
│   └── PLAN_KDS_BARRA_HISTORIAL_VISTA_RESPONSIVE.md   ← este documento
├── src/
│   ├── components/Principal/
│   │   ├── KdsTopBar.jsx                 ← NUEVO
│   │   ├── HistorialModal.jsx            ← NUEVO
│   │   ├── HistorialComandaDetalle.jsx   ← NUEVO
│   │   ├── HistorialPlatoRow.jsx         ← NUEVO
│   │   ├── ConfigModal.jsx               ← tab Vista
│   │   ├── comandastyle.jsx              ← consumir top bar + grid
│   │   ├── ComandastylePerso.jsx         ← igual
│   │   └── ComandaStyleSupervi.jsx       ← igual / props
│   ├── hooks/
│   │   ├── useHistorialCocina.js          ← NUEVO
│   │   └── useKdsBehavior.js             ← aplicar densidad/layout
│   ├── utils/
│   │   └── historialComandaRules.js      ← NUEVO: elegible / parcial / gris pendiente
│   ├── config/
│   │   └── kdsConfigConstants.js         ← v7.3 + presets
│   └── contexts/
│       └── ConfigContext.jsx             ← migración
backend-gambusinas/                       ← solo F3
└── src/controllers/comandaController.js  ← endpoint historial-cocina (opcional)
```

---

## 12. Decisión pendiente (checklist de kickoff)

Antes de implementar F1, confirmar con el equipo:

1. ~~¿Historial incluye solo `salio`+`entregado`, o también `recoger`?~~ → **Cerrado v1.1:** inclusión por `salio`/`entregado`; `recoger` no incluye; pendientes (`en_espera`/…) solo como filas grises si la comanda ya es elegible.
2. ¿En Personalizada el default del filtro cocinero es el usuario logueado?
3. ¿Modal full-screen vs drawer en desktop?
4. ¿Habilitar también el tile del `MenuPage` en la misma entrega o solo botón KDS?
5. ¿El modo lista default queda en **Por comanda** (recomendado v1.1) o **Por plato**?

---

*Documento de planificación. No implica cambios de código hasta que se apruebe el alcance y la fase de inicio (recomendado: F0 + F1).*
