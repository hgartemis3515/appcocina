# Integración de Cocineros y Zonas KDS en la App de Cocina

**Versión:** 1.0  
**Fecha:** Marzo 2026  
**Autor:** Sistema Las Gambusinas

---

## Resumen Ejecutivo

Este documento detalla el diseño e implementación de la integración entre el módulo de Cocineros/Zonas del backend y la App de Cocina, permitiendo que cada cocinero tenga una vista personalizada del tablero KDS basada en sus zonas asignadas y configuración personal.

---

## 1. Identificación del Cocinero y Flujo de Inicio de Sesión

### 1.1 Fuente del `usuarioId` del Cocinero

El `usuarioId` del cocinero **ya proviene del sistema de autenticación JWT** implementado en la App de Cocina (v6.0). El flujo actual es:

```
LoginPage.jsx → POST /api/admin/cocina/auth → JWT con { id, name, rol } → AuthContext
```

**Mecanismo actual:**
- El usuario ingresa su DNI en `LoginPage.jsx`
- El backend valida que el usuario existe en la colección `mozos` y tiene rol `cocinero` o `admin`
- Se genera un JWT con el `id` del usuario (que corresponde al `_id` en la colección `mozos`)
- El `AuthContext` guarda el token y el objeto `usuario` en `localStorage` bajo la clave `cocinaAuth`

**IMPORTANTE:** 
- NO se debe confiar en `localStorage.userRole` de forma aislada
- El `user.id` del `AuthContext` es la fuente de verdad para el `cocineroId`
- El token JWT se pasa en cada petición y al handshake de Socket.io

### 1.2 Flujo de Arranque Propuesto

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APP DE COCINA - FLUJO DE INICIO                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. App.jsx monta → AuthProvider verifica sesión en localStorage
   │
   ├─ Si hay sesión válida → Carga usuario y token
   │                       → Navega a MENU
   │
   └─ Si no hay sesión → Muestra LOGIN

2. Usuario ingresa DNI → AuthContext.login()
   │
   ├─ POST /api/admin/cocina/auth
   │
   ├─ Éxito → Guarda token, usuario
   │        → Llama a loadCocineroConfig()  ← NUEVO
   │        → Navega a MENU
   │
   └─ Error → Muestra mensaje

3. loadCocineroConfig() ejecuta:
   │
   ├─ GET /api/cocineros/:id/config
   │  Headers: Authorization: Bearer <token>
   │
   ├─ Respuesta OK:
   │  {
   │    aliasCocinero: "Cheff Juan",
   │    filtrosPlatos: { modoInclusion, platosPermitidos, categoriasPermitidas... },
   │    filtrosComandas: { areasPermitidas, mesasEspecificas, rangoHorario... },
   │    configTableroKDS: { tiempoAmarillo, tiempoRojo, columnasGrid... },
   │    zonasAsignadas: [ { _id, nombre, color, icono, filtrosPlatos, filtrosComandas } ]
   │  }
   │
   ├─ Guarda en:
   │  - Estado: cocineroConfig (AuthContext)
   │  - localStorage: 'cocinaKdsConfig'
   │
   └─ Error (404 o sin config):
      - Usa configuración por defecto
      - Muestra aviso: "Sin configuración personalizada. Usando valores por defecto."

4. Usuario navega a COCINA (ComandaStyle)
   │
   ├─ Carga comandas via GET /api/comanda/cocina/:fecha
   │
   ├─ Aplica filtros de cocinero/zonas usando kdsFilters.js  ← NUEVO
   │
   └─ Renderiza grid con comandas filtradas
```

### 1.3 Estado Global de Configuración de Cocinero

El estado debe vivir en **AuthContext** (ya existe `cocineroConfig`) y exponerse a través de un contexto dedicado o directamente desde `useAuth()`.

**Estructura del estado:**

```javascript
// AuthContext.jsx - Estado expandido
const [cocineroConfig, setCocineroConfig] = useState(null);
const [configLoading, setConfigLoading] = useState(false);
const [configError, setConfigError] = useState(null);

// Estructura de cocineroConfig
{
  // Identificación
  cocineroId: "ObjectId",
  aliasCocinero: "Cheff Juan",
  
  // Filtros de platos (propios del cocinero)
  filtrosPlatos: {
    modoInclusion: false,        // false = modo exclusivo (ocultar seleccionados)
    platosPermitidos: [1, 5, 12], // IDs de platos
    categoriasPermitidas: ["Entradas", "Platos principales"],
    tiposPermitidos: ["plato-carta normal", "platos-desayuno"]
  },
  
  // Filtros de comandas (propios del cocinero)
  filtrosComandas: {
    areasPermitidas: ["Terraza", "Interior"],
    mesasEspecificas: [1, 2, 3, 4, 5],
    rangoHorario: { inicio: "06:00", fin: "22:00" },
    soloPrioritarias: false
  },
  
  // Configuración visual del tablero KDS
  configTableroKDS: {
    tiempoAmarillo: 15,          // minutos
    tiempoRojo: 20,              // minutos
    maxTarjetasVisibles: 20,
    modoAltoVolumen: false,
    sonidoNotificacion: true,
    modoNocturno: true,
    columnasGrid: 5,
    filasGrid: 1,
    tamanioFuente: 15
  },
  
  // Zonas asignadas al cocinero (con sus filtros)
  zonasAsignadas: [
    {
      _id: "zona-123",
      nombre: "Parrilla",
      color: "#FF5733",
      icono: "flame",
      activo: true,
      filtrosPlatos: {
        modoInclusion: true,
        categoriasPermitidas: ["Carnes", "Parrillas"],
        tiposPermitidos: ["plato-carta normal"]
      },
      filtrosComandas: {
        areasPermitidas: [],
        mesasEspecificas: [],
        soloPrioritarias: false
      }
    },
    {
      _id: "zona-456",
      nombre: "Postres",
      color: "#3498DB",
      icono: "ice-cream",
      activo: true,
      filtrosPlatos: {
        modoInclusion: true,
        categoriasPermitidas: ["Postres", "Helados"],
        tiposPermitidos: []
      },
      filtrosComandas: {}
    }
  ],
  
  // Métricas del cocinero (solo lectura)
  estadisticas: {
    ultimaConexion: "2026-03-17T14:30:00.000Z",
    totalSesiones: 45,
    platosPreparados: 1234,
    tiempoPromedioPreparacion: 12.5
  },
  
  // Estado de la configuración
  activo: true,
  
  // Flags de UI
  zonaActivaId: null,  // Si el usuario selecciona una zona específica
  filtrosActivos: true // Indica si hay filtros aplicados
}
```

**Ubicación del estado:**
- **Principal:** `AuthContext.jsx` - Ya tiene `cocineroConfig` y `loadCocineroConfig()`
- **Persistencia:** `localStorage` clave `cocinaKdsConfig` para restauración rápida

---

## 2. Unificación de Configuración Local con configTableroKDS

### 2.1 Reglas de Prioridad

Se establece el siguiente orden de prioridad para la configuración:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRIORIDAD DE CONFIGURACIÓN                            │
└─────────────────────────────────────────────────────────────────────────────┘

1. BACKEND (configTableroKDS)    → Fuente de verdad para valores centralizados
2. LOCAL STORAGE (kdsConfig)     → Override puntual del usuario en este dispositivo
3. VALORES POR DEFECTO           → Fallback cuando no hay configuración

Regla específica:
- Configuración de SERVIDOR (filtros de platos/comandas, zonas) → SIEMPRE del backend
- Configuración de TABLERO (tiempos, grid, sonido) → Backend como default, localStorage puede sobrescribir
- Configuración de RED (URL del servidor) → SIEMPRE localStorage (por dispositivo)
```

### 2.2 Mapeo de Campos

| Campo Backend (configTableroKDS) | Campo localStorage (kdsConfig) | Notas |
|----------------------------------|-------------------------------|-------|
| `tiempoAmarillo` | `alertYellowMinutes` | Minutos para alerta amarilla |
| `tiempoRojo` | `alertRedMinutes` | Minutos para alerta roja |
| `sonidoNotificacion` | `soundEnabled` | Habilitar sonidos |
| `modoNocturno` | `nightMode` | Modo oscuro |
| `columnasGrid` | `design.cols` | Columnas del grid |
| `filasGrid` | `design.rows` | Filas del grid |
| `tamanioFuente` | `design.fontSize` | Tamaño de fuente |
| `maxTarjetasVisibles` | (nuevo) | Máximo tarjetas visibles |
| `modoAltoVolumen` | (nuevo) | Modo para volúmenes altos |

### 2.3 Comportamiento cuando el Admin Cambia la Configuración

**Escenario:** El admin modifica la configuración KDS de un cocinero desde `cocineros.html`.

**Flujo:**

```
1. Admin hace PUT /api/cocineros/:id/config
   │
2. Backend actualiza ConfigCocinero en MongoDB
   │
3. Backend emite evento Socket.io:
   │  cocinaNamespace.to(`cocinero-${cocineroId}`).emit('config-cocinero-actualizada', { config })
   │
4. App Cocina recibe evento (useSocketCocina)
   │
5. AuthContext.updateCocineroConfig(config) actualiza el estado
   │
6. ComandaStyle re-renderiza con nueva configuración
   │
7. Si hay cambios en filtros → Re-aplicar filtros a comandas visibles
```

**IMPORTANTE:** El backend actualmente NO tiene implementada la función `emitConfigCocineroActualizada`. Se debe crear en `src/socket/events.js`.

### 2.4 Estrategia de Fallback

```javascript
// Función para obtener configuración efectiva
function getConfiguracionEfectiva(cocineroConfig, localStorageConfig) {
  // Valores por defecto
  const defaults = {
    alertYellowMinutes: 15,
    alertRedMinutes: 20,
    soundEnabled: true,
    nightMode: true,
    design: { fontSize: 15, cols: 5, rows: 1 }
  };
  
  // Si no hay configuración del backend, usar defaults + localStorage
  if (!cocineroConfig) {
    return { ...defaults, ...localStorageConfig };
  }
  
  // Combinar: backend como base, localStorage como override para ciertos campos
  return {
    // Del backend (no sobrescribibles por usuario)
    filtrosPlatos: cocineroConfig.filtrosPlatos,
    filtrosComandas: cocineroConfig.filtrosComandas,
    zonasAsignadas: cocineroConfig.zonasAsignadas,
    
    // Del backend con override de localStorage
    alertYellowMinutes: localStorageConfig.alertYellowMinutes || cocineroConfig.configTableroKDS?.tiempoAmarillo || defaults.alertYellowMinutes,
    alertRedMinutes: localStorageConfig.alertRedMinutes || cocineroConfig.configTableroKDS?.tiempoRojo || defaults.alertRedMinutes,
    soundEnabled: localStorageConfig.soundEnabled ?? cocineroConfig.configTableroKDS?.sonidoNotificacion ?? defaults.soundEnabled,
    nightMode: localStorageConfig.nightMode ?? cocineroConfig.configTableroKDS?.modoNocturno ?? defaults.nightMode,
    design: {
      fontSize: localStorageConfig.design?.fontSize || cocineroConfig.configTableroKDS?.tamanioFuente || defaults.design.fontSize,
      cols: localStorageConfig.design?.cols || cocineroConfig.configTableroKDS?.columnasGrid || defaults.design.cols,
      rows: localStorageConfig.design?.rows || cocineroConfig.configTableroKDS?.filasGrid || defaults.design.rows
    }
  };
}
```

---

## 3. Diseño de kdsFilters para Aplicar Zonas y Filtros del Cocinero

### 3.1 Estructura del Módulo

Crear archivo: `appcocina/src/utils/kdsFilters.js`

```javascript
// kdsFilters.js - Módulo de filtros para KDS
import moment from 'moment-timezone';

/**
 * Determina si un plato debe mostrarse según la configuración del cocinero y sus zonas
 * 
 * @param {Object} plato - El plato a evaluar
 * @param {Object} configCocinero - Configuración del cocinero (filtrosPlatos)
 * @param {Array} zonasAsignadas - Zonas asignadas al cocinero con sus filtros
 * @param {string|null} zonaActivaId - ID de zona específica seleccionada (opcional)
 * @returns {boolean} - true si el plato debe mostrarse
 */
export function debeMostrarPlato(plato, configCocinero, zonasAsignadas = [], zonaActivaId = null) {
  // Si no hay configuración, mostrar todo
  if (!configCocinero && zonasAsignadas.length === 0) {
    return true;
  }
  
  const platoId = plato.platoId || plato.id || plato._id;
  const categoria = plato.plato?.categoria || plato.categoria || '';
  const tipo = plato.plato?.tipo || plato.tipo || '';
  
  // 1. Si hay zona activa específica, usar solo filtros de esa zona
  if (zonaActivaId) {
    const zonaActiva = zonasAsignadas.find(z => z._id === zonaActivaId && z.activo !== false);
    if (zonaActiva?.filtrosPlatos) {
      return pasaFiltrosZonaPlato(plato, zonaActiva.filtrosPlatos);
    }
  }
  
  // 2. Si hay zonas asignadas, verificar si pasa alguna zona (UNIÓN)
  if (zonasAsignadas.length > 0) {
    const zonasActivas = zonasAsignadas.filter(z => z.activo !== false);
    
    // Si hay zonas activas, el plato debe pasar AL MENOS UNA zona
    if (zonasActivas.length > 0) {
      const pasaAlgunaZona = zonasActivas.some(zona => 
        pasaFiltrosZonaPlato(plato, zona.filtrosPlatos || {})
      );
      
      if (!pasaAlgunaZona) {
        return false;
      }
    }
  }
  
  // 3. Aplicar filtros propios del cocinero (restrictivos adicionales)
  if (configCocinero?.filtrosPlatos) {
    return pasaFiltrosCocineroPlato(plato, configCocinero.filtrosPlatos);
  }
  
  return true;
}

/**
 * Determina si una comanda debe mostrarse según la configuración
 */
export function debeMostrarComanda(comanda, configCocinero, zonasAsignadas = [], zonaActivaId = null) {
  // Si no hay configuración, mostrar todo
  if (!configCocinero && zonasAsignadas.length === 0) {
    return true;
  }
  
  // 1. Si hay zona activa específica
  if (zonaActivaId) {
    const zonaActiva = zonasAsignadas.find(z => z._id === zonaActivaId && z.activo !== false);
    if (zonaActiva?.filtrosComandas) {
      if (!pasaFiltrosZonaComanda(comanda, zonaActiva.filtrosComandas)) {
        return false;
      }
    }
  }
  
  // 2. Verificar zonas asignadas (UNIÓN)
  if (zonasAsignadas.length > 0) {
    const zonasActivas = zonasAsignadas.filter(z => z.activo !== false);
    
    if (zonasActivas.length > 0) {
      const pasaAlgunaZona = zonasActivas.some(zona => 
        pasaFiltrosZonaComanda(comanda, zona.filtrosComandas || {})
      );
      
      if (!pasaAlgunaZona) {
        return false;
      }
    }
  }
  
  // 3. Aplicar filtros propios del cocinero
  if (configCocinero?.filtrosComandas) {
    return pasaFiltrosCocineroComanda(comanda, configCocinero.filtrosComandas);
  }
  
  return true;
}

/**
 * Filtra una lista de comandas aplicando todos los filtros
 */
export function aplicarFiltrosAComandas(comandas, cocineroConfig) {
  if (!cocineroConfig) {
    return comandas;
  }
  
  const { filtrosComandas, filtrosPlatos, zonasAsignadas, zonaActivaId } = cocineroConfig;
  
  return comandas
    .filter(comanda => debeMostrarComanda(comanda, { filtrosComandas }, zonasAsignadas, zonaActivaId))
    .map(comanda => ({
      ...comanda,
      platos: comanda.platos.filter(plato => 
        debeMostrarPlato(plato, { filtrosPlatos }, zonasAsignadas, zonaActivaId)
      )
    }))
    .filter(comanda => comanda.platos.length > 0); // Eliminar comandas sin platos visibles
}

// ============ FUNCIONES AUXILIARES ============

function pasaFiltrosZonaPlato(plato, filtros) {
  if (!filtros || Object.keys(filtros).length === 0) return true;
  
  const { modoInclusion, platosPermitidos = [], categoriasPermitidas = [], tiposPermitidos = [] } = filtros;
  
  const platoId = plato.platoId || plato.id || plato._id;
  const categoria = plato.plato?.categoria || plato.categoria || '';
  const tipo = plato.plato?.tipo || plato.tipo || '';
  
  // Modo inclusión: solo mostrar los que coinciden
  if (modoInclusion) {
    const coincidePlato = platosPermitidos.length === 0 || platosPermitidos.includes(Number(platoId));
    const coincideCategoria = categoriasPermitidas.length === 0 || categoriasPermitidas.includes(categoria);
    const coincideTipo = tiposPermitidos.length === 0 || tiposPermitidos.includes(tipo);
    
    return coincidePlato && coincideCategoria && coincideTipo;
  }
  
  // Modo exclusión: ocultar los que coinciden
  if (!modoInclusion) {
    const estaExcluido = 
      platosPermitidos.includes(Number(platoId)) ||
      categoriasPermitidas.includes(categoria) ||
      tiposPermitidos.includes(tipo);
    
    return !estaExcluido;
  }
  
  return true;
}

function pasaFiltrosZonaComanda(comanda, filtros) {
  if (!filtros || Object.keys(filtros).length === 0) return true;
  
  const { areasPermitidas = [], mesasEspecificas = [], soloPrioritarias = false, rangoHorario } = filtros;
  
  // Filtro por área
  if (areasPermitidas.length > 0) {
    const areaComanda = comanda.mesas?.area?.nombre || comanda.mesas?.area || '';
    if (!areasPermitidas.includes(areaComanda)) {
      return false;
    }
  }
  
  // Filtro por mesas específicas
  if (mesasEspecificas.length > 0) {
    const numMesa = comanda.mesas?.nummesa;
    if (!mesasEspecificas.includes(numMesa)) {
      return false;
    }
  }
  
  // Filtro por prioridad
  if (soloPrioritarias && !comanda.prioridadOrden) {
    return false;
  }
  
  // Filtro por rango horario
  if (rangoHorario?.inicio && rangoHorario?.fin) {
    const horaActual = moment().tz('America/Lima').format('HH:mm');
    if (horaActual < rangoHorario.inicio || horaActual > rangoHorario.fin) {
      return false;
    }
  }
  
  return true;
}

function pasaFiltrosCocineroPlato(plato, filtros) {
  // Mismos criterios que zona pero aplicados por el cocinero
  return pasaFiltrosZonaPlato(plato, filtros);
}

function pasaFiltrosCocineroComanda(comanda, filtros) {
  // Mismos criterios que zona pero aplicados por el cocinero
  return pasaFiltrosZonaComanda(comanda, filtros);
}

/**
 * Calcula estadísticas de filtrado para debugging
 */
export function calcularEstadisticasFiltrado(comandasOriginales, comandasFiltradas) {
  const platosOriginales = comandasOriginales.reduce((acc, c) => acc + (c.platos?.length || 0), 0);
  const platosFiltrados = comandasFiltradas.reduce((acc, c) => acc + (c.platos?.length || 0), 0);
  
  return {
    comandasOcultas: comandasOriginales.length - comandasFiltradas.length,
    platosOcultos: platosOriginales - platosFiltrados,
    porcentajeVisible: Math.round((comandasFiltradas.length / comandasOriginales.length) * 100) || 0
  };
}
```

### 3.2 Ejemplos de Combinación de Filtros

**Escenario 1: Cocinero con dos zonas (Parrilla + Postres)**

```
Zona Parrilla:
  - modoInclusion: true
  - categoriasPermitidas: ["Carnes", "Parrillas"]

Zona Postres:
  - modoInclusion: true
  - categoriasPermitidas: ["Postres", "Helados"]

Regla de UNIÓN: Plato se muestra si coincide con Parrilla O Postres

Ejemplo:
- "Filete de res" (Carnes) → ✅ Pasa Parrilla → Se muestra
- "Tiramisú" (Postres) → ✅ Pasa Postres → Se muestra
- "Ensalada César" (Ensaladas) → ❌ No pasa ninguna → Se oculta

Si además el cocinero tiene:
  - filtrosPlatos.platosPermitidos: [1, 5, 12] (modo exclusión)
  
Entonces "Filete de res" ID=20 → ✅ Pasa zona, ✅ No está excluido → Se muestra
     "Ensalada" ID=5 → ❌ Pasa zona = NO, pero también está excluido → Se oculta
```

**Escenario 2: Zona inactiva**

```
Zona "Desayunos":
  - activo: false
  - categoriasPermitidas: ["Desayunos"]

Esta zona se IGNORA en los filtros. El cocinero no ve platos de desayuno
a menos que otra zona activa los incluya.
```

### 3.3 Puntos de Aplicación de Filtros

Los filtros deben ejecutarse en:

1. **Al obtener comandas inicialmente** (`obtenerComandas` en ComandaStyle.jsx)
2. **En cada evento Socket.io**:
   - `nueva-comanda` → Filtrar antes de agregar al estado
   - `comanda-actualizada` → Re-filtrar comanda actualizada
   - `plato-actualizado` → Re-evaluar si el plato sigue siendo visible

**Patrón recomendado:**

```javascript
// En ComandaStyle.jsx
const filtrarComandas = useCallback((comandas) => {
  if (!cocineroConfig) return comandas;
  return aplicarFiltrosAComandas(comandas, cocineroConfig);
}, [cocineroConfig]);

// Al obtener comandas
const obtenerComandas = useCallback(async () => {
  const response = await axios.get(...);
  const comandasRaw = response.data;
  const comandasFiltradas = filtrarComandas(comandasRaw);
  setComandas(comandasFiltradas);
}, [filtrarComandas]);

// En handleNuevaComanda
const handleNuevaComanda = useCallback((comanda) => {
  if (!debeMostrarComanda(comanda, cocineroConfig?.filtrosComandas, cocineroConfig?.zonasAsignadas)) {
    console.log('[FILTRO] Nueva comanda oculta por filtros:', comanda.comandaNumber);
    return;
  }
  // ... agregar comanda
}, [cocineroConfig]);
```

---

## 4. Adaptación del Menú/UX de la App de Cocina para Zonas

### 4.1 Header Actualizado

**Header propuesto:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [14:35] 17/03/2026    COCINA LAS GAMBUSINAS    👨‍🍳 Cheff Juan              │
│                                         [● Realtime] [← Menú] [🔍] [⚙️]    │
│                                         ┌────────────────────────────────┐  │
│                                         │ 📍 Parrilla  │ 🍰 Postres      │  │
│                                         └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elementos nuevos:**
1. **Alias del cocinero** (ej: "👨‍🍳 Cheff Juan") - Del campo `aliasCocinero`
2. **Chips de Zonas** - Colores e iconos de cada zona asignada
3. **Indicador de filtro activo** - Si `zonaActivaId` está seteado

### 4.2 Selector de Zona Activa

**Decisión:** El cocinero PODRÁ seleccionar una zona activa específica desde la App, pero NO cambiar las zonas asignadas (eso lo hace el admin desde el dashboard).

**UX Propuesta:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📍 Zona Activa:                                                            │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │ 🔥 Parrilla  │  │ 🍰 Postres   │  │ 📍 Todas     │                     │
│  │  [ACTIVO]    │  │              │  │              │                     │
│  └──────────────┘  └──────────────┘  └──────────────┘                     │
│                                                                            │
│  Mostrando solo comandas de Parrilla                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Por defecto: "Todas las zonas" (aplica unión de filtros de todas las zonas)
- Al seleccionar una zona: Solo se aplican los filtros de esa zona + restricciones del cocinero
- El selector puede estar en el header o en un dropdown

### 4.3 Indicadores Visuales

1. **Cuando hay filtros activos:**
   - Icono de filtro en el header: 🔽 o 📍
   - Texto: "Vista filtrada por Zona" o "X platos ocultos"

2. **Cuando no hay comandas después de filtrar:**
   ```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                                                                        │
   │    🔍 No hay comandas que cumplan los filtros                          │
   │                                                                        │
   │    Zonas activas: Parrilla, Postres                                    │
   │    Mostrando: Todas las zonas                                          │
   │                                                                        │
   │    [Ver todas las comandas (sin filtros)]                              │
   │                                                                        │
   └────────────────────────────────────────────────────────────────────────┘
   ```

3. **Badge de estadísticas de filtrado:**
   ```
   [📊 12 visibles | 5 ocultos por filtros]
   ```

---

## 5. Integración con Socket.io y Rendimiento

### 5.1 Mantener Flujo Actual

El flujo actual de Socket.io debe mantenerse:

```
Namespace: /cocina
Room: fecha-{YYYY-MM-DD}
Eventos: nueva-comanda, comanda-actualizada, plato-actualizado, etc.
```

### 5.2 Capa de Filtrado Antes de Actualizar Estado

**Patrón centralizado:**

```javascript
// Nuevo hook o función en ComandaStyle.jsx
const aplicarFiltrosYCambiarEstado = useCallback((nuevasComandas, tipoActualizacion) => {
  const comandasFiltradas = aplicarFiltrosAComandas(nuevasComandas, cocineroConfig);
  
  // Métricas de debug (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    const stats = calcularEstadisticasFiltrado(nuevasComandas, comandasFiltradas);
    console.log(`[FILTRO] ${tipoActualizacion}: ${stats.comandasOcultas} comandas ocultas, ${stats.platosOcultos} platos ocultos`);
  }
  
  setComandas(comandasFiltradas);
}, [cocineroConfig]);
```

### 5.3 Room Específico por Cocinero (Opcional)

Para notificaciones de configuración actualizada:

```javascript
// En useSocketCocina.js - después del login
socket.emit('join-cocinero', cocineroId);

// El backend crearía el room: cocinero-{cocineroId}
// Y emitiría config-cocinero-actualizada solo a ese room
```

### 5.4 Métricas de Rendimiento

Registrar en consola (desarrollo) o en un futuro panel:

```javascript
const metricasFiltrado = {
  comandasRecibidas: 0,
  comandasFiltradas: 0,
  platosFiltrados: 0,
  tiempoFiltrado: 0 // ms
};
```

---

## 6. Casos Especiales y Recomendaciones

### 6.1 Cocinero sin Zonas Asignadas

**Comportamiento:**
- Si `zonasAsignadas = []` pero tiene `filtrosPlatos`/`filtrosComandas`:
  - Aplicar solo filtros del `ConfigCocinero`
  - La App funciona como antes pero con configuración centralizada
  
- Si no tiene ningún tipo de configuración:
  - Mostrar TODAS las comandas y platos
  - Banner: "Sin configuración personalizada. Usando valores por defecto."

### 6.2 Cambio de Configuración en Tiempo Real

**Evento `config-cocinero-actualizada`:**

```javascript
// En useSocketCocina.js
socket.on('config-cocinero-actualizada', (data) => {
  console.log('[SOCKET] Configuración actualizada:', data);
  
  // Actualizar AuthContext
  updateCocineroConfig(data.config);
  
  // Re-aplicar filtros a comandas existentes
  if (comandas.length > 0) {
    const reFiltradas = aplicarFiltrosAComandas(comandas, data.config);
    setComandas(reFiltradas);
  }
  
  // Toast de notificación
  setToastMessage({
    type: 'info',
    message: 'Configuración KDS actualizada por el supervisor',
    duration: 5000
  });
});
```

**Botón de "Refrescar Configuración" (fallback):**
- Visible solo para supervisores o en modo debug
- Ubicación: Dentro de ConfigModal
- Llama a `loadCocineroConfig()` manualmente

### 6.3 Sincronización de Métricas

**Al iniciar sesión:**
```javascript
POST /api/cocineros/:id/conexion
Body: { tipo: 'inicio' }
```

**Al finalizar lote de platos:**
```javascript
// El backend ya actualiza estadísticas cuando se cambian estados de platos
// No es necesario enviar evento adicional desde la App
```

### 6.4 Manejo de Errores

**Cuando falla `GET /api/cocineros/:id/config`:**

1. Loguear error en consola
2. Usar configuración por defecto
3. Mostrar banner informativo:
   ```
   ⚠️ No se pudo cargar la configuración del servidor. Usando valores por defecto.
   [Reintentar]
   ```
4. Mantener la App funcional

**Cuando el backend está caído:**
- Socket.io mostrará "Desconectado"
- Polling fallback seguirá funcionando
- Los filtros usarán la última configuración conocida (localStorage)

---

## 7. Plan de Implementación Concreto

### Fase 1: Preparación (Sin cambiar funcionalidad existente)

- [ ] **1.1** Crear `appcocina/src/utils/kdsFilters.js` con todas las funciones de filtrado
- [ ] **1.2** Crear test unitario básico para `kdsFilters.js`
- [ ] **1.3** Documentar estructura de datos esperada en JSDoc

### Fase 2: Carga de Configuración

- [ ] **2.1** Modificar `AuthContext.jsx`:
  - Expandir `loadCocineroConfig()` para incluir `zonasAsignadas`
  - Agregar función `loadCocineroZonas()` que llame a `GET /api/cocineros/:id/zonas`
  - Agregar estado `zonasAsignadas` y `zonaActivaId`
- [ ] **2.2** Actualizar endpoint backend `GET /api/cocineros/:id/config` para incluir zonas pobladas
- [ ] **2.3** Verificar que el login carga la configuración correctamente

### Fase 3: Aplicación de Filtros

- [ ] **3.1** Importar `kdsFilters` en `ComandaStyle.jsx`
- [ ] **3.2** Crear función `filtrarComandas()` centralizada
- [ ] **3.3** Modificar `obtenerComandas()` para aplicar filtros
- [ ] **3.4** Modificar `handleNuevaComanda()` para filtrar
- [ ] **3.5** Modificar `handleComandaActualizada()` para filtrar
- [ ] **3.6** Modificar `handlePlatoActualizado()` para re-evaluar visibilidad

### Fase 4: UI de Zonas

- [ ] **4.1** Agregar alias del cocinero en header (`SicarComandaCard` o header principal)
- [ ] **4.2** Crear componente `ZoneChips` para mostrar zonas asignadas
- [ ] **4.3** Crear selector de zona activa (dropdown o tabs)
- [ ] **4.4** Agregar indicador de "Vista filtrada" cuando hay filtros activos
- [ ] **4.5** Agregar mensaje de "Sin comandas" con información de filtros

### Fase 5: Sincronización en Tiempo Real

- [ ] **5.1** Implementar `emitConfigCocineroActualizada` en `src/socket/events.js` del backend
- [ ] **5.2** Agregar room `cocinero-{id}` cuando el socket se conecta
- [ ] **5.3** Manejar evento `config-cocinero-actualizada` en `useSocketCocina.js`
- [ ] **5.4** Re-aplicar filtros cuando cambia la configuración

### Fase 6: Unificación de Configuración

- [ ] **6.1** Modificar `ConfigModal.jsx` para:
  - Mostrar valores del backend como defaults
  - Permitir override local para ciertos campos
  - Mostrar indicador de "Configuración del servidor" vs "Preferencia local"
- [ ] **6.2** Implementar lógica de `getConfiguracionEfectiva()`
- [ ] **6.3** Sincronizar cambios locales con el servidor (opcional)

### Fase 7: Testing y Validación

- [ ] **7.1** Probar con cocinero sin zonas asignadas
- [ ] **7.2** Probar con cocinero con una zona
- [ ] **7.3** Probar con cocinero con múltiples zonas
- [ ] **7.4** Probar cambio de zona activa
- [ ] **7.5** Probar actualización de configuración en tiempo real
- [ ] **7.6** Probar comportamiento cuando backend está caído
- [ ] **7.7** Verificar métricas de filtrado en consola

---

## 8. Endpoints del Backend Requeridos

| Método | Endpoint | Propósito | Estado |
|--------|----------|-----------|--------|
| GET | `/api/cocineros/:id/config` | Obtener configuración KDS completa (con zonas pobladas) | ✅ Existe |
| GET | `/api/cocineros/:id/zonas` | Obtener solo zonas asignadas | ⚠️ Verificar |
| POST | `/api/cocineros/:id/conexion` | Registrar inicio de sesión | ✅ Existe |

**Mejoras sugeridas al backend:**

1. `GET /api/cocineros/:id/config` debe incluir `zonasAsignadas` pobladas (no solo IDs)
2. Implementar `emitConfigCocineroActualizada` en Socket.io
3. Crear room `cocinero-{id}` para notificaciones específicas

---

## 9. Consideraciones de Seguridad

1. **JWT obligatorio:** Todas las peticiones a `/api/cocineros/*` requieren token válido
2. **Validación de pertenencia:** El backend debe verificar que el `:id` en la URL corresponde al usuario autenticado
3. **Sin IDs hardcodeados:** Nunca guardar IDs en localStorage sin validación del token
4. **Logout limpia todo:** Al cerrar sesión, limpiar `cocinaKdsConfig` además de `cocinaAuth`

---

## 10. Métricas de Éxito

- Tiempo de carga de configuración < 500ms
- Filtros aplicados en < 50ms para 100 comandas
- Sin regresiones en funcionalidad existente
- UX clara para el cocinero (sabe qué está viendo y por qué)

---

**Fin del Documento**
