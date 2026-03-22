# 📱 Documentación Completa - App de Cocina (Las Gambusinas)

**Versión:** 7.3.0  
**Última Actualización:** Marzo 2026  
**Tecnología:** React Web + Socket.io + Framer Motion

---

## 📋 Historial de Cambios

### v7.3.0 (Marzo 2026) - Sistema de Zonas y Vista Personalizada

- ✅ **Vista Personalizada por Cocinero**: Nuevo componente `ComandastylePerso.jsx` con filtros específicos
- ✅ **Sistema de Zonas**: Asignación de zonas a cocineros con filtros de platos y comandas
- ✅ **Selector de Zonas**: Componente `ZoneSelector.jsx` para cambiar entre zonas activas
- ✅ **Filtros Avanzados**: Módulo `kdsFilters.js` con lógica de filtrado por plato, categoría, tipo, área, mesa
- ✅ **Hook Compartido**: `useComandastyleCore.js` extrae lógica común entre vistas General y Personalizada
- ✅ **Configuración Sincronizada**: `cocineroConfig` cargada desde backend y sincronizada via Socket.io
- ✅ **Navegación Mejorada**: Dos modos de vista (`general` | `personalizada`) seleccionables desde el menú
- ✅ **Rooms Personales**: Socket.io con rooms por cocinero para actualizaciones de configuración

### v7.2.1 (Marzo 2026) - Ciclo de Estados Diferenciado

- ✅ **Ciclo de estados diferenciado**: Flujo diferente según si el plato está tomado por el cocinero actual
- ✅ **Estado visual "dejar" (rojo)**: Permite al cocinero indicar que quiere liberar un plato tomado
- ✅ **Corrección del botón contextual**: Ahora responde correctamente a platos en amarillo/rojo
- ✅ **Estado visual automático**: Platos con `procesandoPor` se muestran en amarillo automáticamente

### v7.2.0 (Marzo 2026) - Sistema Multi-Cocinero

- ✅ **Sistema Multi-Cocinero**: Botón contextual en barra inferior para Tomar/Dejar/Finalizar platos
- ✅ **Badge de cocinero**: Muestra quién está procesando cada plato (badge verde "Tú" para propio, amarillo para otros)
- ✅ **Validación de propiedad**: Solo el cocinero que tomó un plato puede finalizarlo
- ✅ **Eventos Socket.io**: `plato-procesando`, `plato-liberado`, `conflicto-procesamiento` sincronizados
- ✅ **Prevención de conflictos**: Error 403 si otro cocinero intenta finalizar plato ajeno

### v7.1.0 (Marzo 2026) - Autenticación y Configuración

- ✅ **Sistema de autenticación**: Login con DNI funcionando correctamente
- ✅ **Socket.io con JWT**: Conexión segura al namespace `/cocina`
- ✅ **Rooms por fecha**: Sincronización de comandas del día
- ✅ **Configuración centralizada**: ConfigContext para preferencias

### v6.0.0 (Marzo 2026) - Sistema de Autenticación y Menú

- ✅ **Login de Cocina**: Nueva pantalla de autenticación con DNI
- ✅ **Menú Principal**: Navegación centralizada antes del tablero KDS
- ✅ **Protección de Rutas**: Control de acceso con AuthContext y ProtectedRoute
- ✅ **Botón "Regresar"**: En header para volver al menú sin cerrar sesión
- ✅ **Persistencia de Sesión**: Token JWT 8h en localStorage, restauración automática

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Sistema de Autenticación y Navegación](#-sistema-de-autenticación-y-navegación)
3. [Arquitectura y Tecnologías](#arquitectura-y-tecnologías)
4. [Sistema de Zonas y Vista Personalizada (v7.3)](#-sistema-de-zonas-y-vista-personalizada-v73)
5. [Interfaz de Usuario (UI/UX)](#interfaz-de-usuario-uiux)
6. [Funcionalidades Principales](#funcionalidades-principales)
7. [Sistema de Estados y Flujos](#sistema-de-estados-y-flujos)
8. [Componentes y Funciones Detalladas](#componentes-y-funciones-detalladas)
9. [Integración con Backend](#integración-con-backend)
10. [Flujos de Trabajo Completos](#flujos-de-trabajo-completos)

---

## 🎯 Visión General

### ¿Qué es el App de Cocina?

El **App de Cocina** es una aplicación web React diseñada para gestionar comandas de restaurante en tiempo real. Funciona como un **KDS (Kitchen Display System)** profesional que permite a los cocineros y a la **gestión de cocina**:

- **Visualizar** comandas entrantes en tiempo real
- **Gestionar** el estado de cada plato individualmente
- **Finalizar** platos y comandas completas
- **Monitorear** tiempos de preparación con alertas visuales
- **Trabajar** con múltiples comandas simultáneamente
- **Organizar** la carga de trabajo según zonas y configuración personal

### Contexto de negocio: app tipo KDS de comida rápida

Esta app está pensada para funcionar como la pantalla de cocina de cadenas de **comida rápida**, donde:

- La cocina y la persona gestionadora controlan en una sola vista todas las comandas
- Cada comanda se representa como una **tarjeta visual** que agrupa los platos
- Los cocineros pueden decidir qué platos empezar primero según tiempo y tipo
- El sistema de colores (verde/amarillo/rojo) sirve como guía rápida
- **Las zonas permiten dividir el trabajo** entre múltiples cocineros o estaciones

### Características Principales

✅ **Tiempo Real**: Actualizaciones instantáneas vía WebSocket (Socket.io)  
✅ **Sistema de Checkboxes**: Control granular por plato individual  
✅ **Multi-Selección**: Seleccionar y finalizar múltiples comandas  
✅ **Vista Personalizada**: Filtros por zona, tipo de plato, área, mesa  
✅ **Prioridad Alta**: Botón para priorizar comanda (rol cocina)  
✅ **Alertas Visuales**: Colores según tiempo transcurrido  
✅ **Modo Oscuro**: Interfaz optimizada para cocinas  
✅ **Responsive**: Adaptable a diferentes tamaños de pantalla  
✅ **Animaciones**: Transiciones suaves con Framer Motion  

---

## 🔐 Sistema de Autenticación y Navegación

### Descripción General

El flujo de navegación ahora soporta múltiples vistas:

```
Login (DNI) → Menú Principal → [Vista General | Vista Personalizada]
```

### Arquitectura de Navegación

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.jsx                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    AuthProvider                          │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              AppRouter (estado simple)           │    │    │
│  │  │  currentView: LOADING | LOGIN | MENU |           │    │    │
│  │  │               COCINA | COCINA_PERSONALIZADA       │    │    │
│  │  │                                                  │    │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │    │    │
│  │  │  │  LOGIN   │→→│   MENU   │→→│    COCINA    │   │    │    │
│  │  │  │  Page    │  │   Page   │  │ (ComandaStyle)│   │    │    │
│  │  │  └──────────┘  └──────────┘  └──────────────┘   │    │    │
│  │  │                     │                              │    │    │
│  │  │                     ↓                              │    │    │
│  │  │              ┌──────────────┐                      │    │    │
│  │  │              │  COCINA_     │                      │    │    │
│  │  │              │ PERSONALIZADA │                     │    │    │
│  │  │              │(ComandastylePerso)                  │    │    │
│  │  │              └──────────────┘                      │    │    │
│  │  └─────────────────────────────────────────────────────┘    │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Componentes del Sistema de Autenticación

#### 1. AuthContext.jsx - Contexto de Autenticación Extendido

**Ubicación:** `appcocina/src/contexts/AuthContext.jsx`

**Funcionalidades:**
- Gestión del estado de sesión (usuario, token, loading)
- Login mediante DNI contra endpoint `/api/admin/cocina/auth`
- Logout y limpieza de sesión
- **Carga automática de configuración del cocinero** (`loadCocineroConfig`)
- **Gestión de zonas asignadas** (`getZonasActivas`, `setZonaActiva`)
- **Modo de vista** (`viewMode`: 'general' | 'personalizada')

**Estado:**
```javascript
const {
  user,              // { id, name, rol, permisos }
  token,             // JWT token
  loading,           // boolean - cargando sesión
  error,             // string - mensaje de error
  isAuthenticated,   // boolean - sesión activa
  login,             // (username, password, recordar) => Promise
  logout,            // () => void
  hasRole,           // (roles[]) => boolean
  getToken,          // () => string
  // v7.3: Configuración del cocinero
  cocineroConfig,    // { zonasAsignadas, filtrosPlatos, filtrosComandas, ... }
  configLoading,     // boolean
  loadCocineroConfig,// () => Promise
  updateCocineroConfig,// (newConfig) => void
  // Gestión de zonas
  zonaActivaId,      // string | null
  setZonaActiva,     // (zonaId) => void
  getZonasActivas,   // () => Array
  // Modo de vista
  viewMode,          // 'general' | 'personalizada'
  setViewMode,       // (mode) => void
} = useAuth();
```

#### 2. ConfigContext.jsx - Contexto de Configuración KDS

**Ubicación:** `appcocina/src/contexts/ConfigContext.jsx`

**Funcionalidades:**
- Carga automática con migración de versiones
- Limpieza automática de estados obsoletos
- Sincronización entre pestañas (storage events)
- Validación de configuración

**Estado:**
```javascript
const {
  config,             // Configuración actual
  perfilActivo,       // ID del perfil activo
  isSaving,           // boolean
  lastSaved,          // Date
  updateConfig,       // (updates) => void
  resetConfig,        // () => void
  getPerfilActivo,    // () => Perfil | null
  PERFILES,           // Perfiles predefinidos
} = useConfig();
```

#### 3. LoginPage.jsx - Pantalla de Login

**Ubicación:** `appcocina/src/components/pages/LoginPage.jsx`

**Características:**
- Interfaz con branding "COCINA LAS GAMBUSINAS"
- Input de DNI (8 dígitos numéricos)
- Validación visual en tiempo real
- Función "Recordarme"
- Animaciones Framer Motion

#### 4. MenuPage.jsx - Menú Principal

**Ubicación:** `appcocina/src/components/pages/MenuPage.jsx`

**Opciones disponibles:**
- **Vista Personalizada (KDS)**: Navega a `ComandastylePerso` con filtros de zona
- **Vista General**: Navega a `ComandaStyle` sin filtros
- **Configuración**: Abre directamente el modal de configuración

**Funcionalidades:**
- Muestra nombre, rol y alias del cocinero
- Muestra zonas asignadas (si las hay)
- Botón "Cerrar Sesión" con confirmación

---

## 🗂️ Sistema de Zonas y Vista Personalizada (v7.3)

### Descripción General

El sistema de zonas permite asignar áreas específicas de trabajo a cada cocinero. Cada zona puede tener filtros personalizados de platos y comandas.

### Componentes Principales

#### 1. ZoneSelector.jsx - Selector de Zonas

**Ubicación:** `appcocina/src/components/common/ZoneSelector.jsx`

**Funcionalidades:**
- Muestra lista de zonas asignadas al cocinero
- Permite seleccionar zona activa o "Todas"
- Indicador visual de zona actual

```javascript
<ZoneSelector
  zonas={zonasAsignadas}
  zonaActivaId={zonaActivaId}
  onSelect={setZonaActiva}
  nightMode={true}
/>
```

#### 2. ComandastylePerso.jsx - Vista Personalizada

**Ubicación:** `appcocina/src/components/Principal/ComandastylePerso.jsx`

**Diferencias con ComandaStyle:**
- Usa `useComandastyleCore` con `customFilter`
- Aplica filtros de zona y cocinero
- Muestra ZoneSelector en header
- Filtra platos según `kdsFilters.js`

#### 3. useComandastyleCore.js - Hook Compartido

**Ubicación:** `appcocina/src/hooks/useComandastyleCore.js`

**Responsabilidades:**
- Suscripción a Socket.io y manejo de eventos
- Obtención y estado base de comandas
- Ordenamiento por prioridadOrden y createdAt
- Paginación y estados visuales
- Filtrado opcional inyectable

```javascript
const {
  comandas,
  loading,
  error,
  connected,
  connectionStatus,
  toggleExpand,
  toggleSelect,
  showToast,
  getAlertColor,
  // ...
} = useComandastyleCore({
  getToken: () => token,
  customFilter: (comandas) => aplicarFiltrosAComandas(comandas, cocineroConfig),
  cocineroConfig,
  cocineroId: userId,
  config: { soundEnabled, alertYellowMinutes, alertRedMinutes }
});
```

#### 4. kdsFilters.js - Módulo de Filtros

**Ubicación:** `appcocina/src/utils/kdsFilters.js`

**Funciones principales:**

```javascript
// Determina si un plato debe mostrarse
debeMostrarPlato(plato, configCocinero, zonasAsignadas, zonaActivaId)

// Determina si una comanda debe mostrarse
debeMostrarComanda(comanda, configCocinero, zonasAsignadas, zonaActivaId)

// Aplica filtros a lista de comandas
aplicarFiltrosAComandas(comandas, cocineroConfig)

// Calcula estadísticas de filtrado
calcularEstadisticasFiltrado(comandasOriginales, comandasFiltradas)
```

**Lógica de Filtrado:**

1. Si hay zona activa específica → usar solo filtros de esa zona
2. Si hay zonas asignadas → el plato debe pasar AL MENOS UNA zona (UNIÓN)
3. Aplicar filtros propios del cocinero (restrictivos adicionales)

**Filtros de Plato disponibles:**
- `platosPermitidos[]`: IDs de platos permitidos
- `categoriasPermitidas[]`: Categorías permitidas
- `tiposPermitidos[]`: Tipos de plato permitidos
- `modoFiltro`: 'todos' | 'solo' | 'no-ver'

**Filtros de Comanda disponibles:**
- `areasPermitidas[]`: Áreas/mesonas permitidas
- `mesasEspecificas[]`: Números de mesa específicos
- `rangoHorario`: { inicio, fin }
- `soloPrioritarias`: boolean
- `estadosPermitidos[]`: Estados de comanda

### Estructura de Configuración del Cocinero

```javascript
{
  cocineroId: "usr_123",
  aliasCocinero: "Juan",
  
  // Filtros propios del cocinero
  filtrosPlatos: {
    modoFiltro: 'todos', // 'todos' | 'solo' | 'no-ver'
    platosPermitidos: [],
    categoriasPermitidas: [],
    tiposPermitidos: []
  },
  
  filtrosComandas: {
    areasPermitidas: [],
    mesasEspecificas: [],
    rangoHorario: { inicio: null, fin: null },
    soloPrioritarias: false
  },
  
  // Zonas asignadas con sus filtros
  zonasAsignadas: [
    {
      _id: "zona_1",
      nombre: "Parrilla",
      activo: true,
      filtrosPlatos: {
        modoFiltro: 'solo',
        tiposPermitidos: ['carne', 'pollo']
      },
      filtrosComandas: {
        areasPermitidas: ['mesona_1']
      }
    }
  ],
  
  // Configuración del tablero
  configTableroKDS: {
    tiempoAmarillo: 15,
    tiempoRojo: 20,
    maxTarjetasVisibles: 20,
    sonidoNotificacion: true,
    modoNocturno: true,
    columnasGrid: 5,
    filasGrid: 1,
    tamanioFuente: 15
  }
}
```

---

## 🏗️ Arquitectura y Tecnologías

### Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.x | Framework UI |
| **Socket.io Client** | 4.x | Comunicación en tiempo real |
| **Framer Motion** | 12.x | Animaciones y transiciones |
| **Axios** | 1.x | Peticiones HTTP |
| **Moment.js + Timezone** | 2.x | Manejo de fechas/horas |
| **React Icons** | 5.x | Iconografía |
| **React Router DOM** | 7.x | Navegación |
| **TailwindCSS** | 3.x | Estilos |

### Estructura de Archivos

```
appcocina/
├── src/
│   ├── components/
│   │   ├── pages/                    # Páginas de navegación
│   │   │   ├── LoginPage.jsx         # Pantalla de login (DNI)
│   │   │   └── MenuPage.jsx          # Menú principal
│   │   ├── common/                   # Componentes compartidos
│   │   │   ├── ProtectedRoute.jsx    # Protección de rutas
│   │   │   └── ZoneSelector.jsx      # Selector de zonas (v7.3)
│   │   ├── Principal/
│   │   │   ├── ComandaStyle.jsx      # Vista General (Kanban)
│   │   │   ├── ComandastylePerso.jsx # Vista Personalizada (v7.3)
│   │   │   ├── ConfigModal.jsx       # Configuración del sistema
│   │   │   ├── ReportsModal.jsx      # Reportes y estadísticas
│   │   │   ├── RevertirModal.jsx     # Revertir estados
│   │   │   ├── AnotacionesModal.jsx  # Anotaciones en comandas
│   │   │   ├── PlatoPreparacion.jsx  # Componente de plato individual
│   │   │   ├── PlatoConProcesamiento.jsx
│   │   │   └── DejarPlatoModal.jsx   # Modal para liberar plato
│   │   ├── additionals/
│   │   │   └── SearchBar.jsx         # Barra de búsqueda
│   │   └── pdf/
│   │       ├── pdfbutton.jsx         # Botón de impresión PDF
│   │       └── pdfcomanda.jsx        # Generador de PDF
│   ├── contexts/
│   │   ├── AuthContext.jsx           # Contexto de autenticación
│   │   └── ConfigContext.jsx         # Contexto de configuración KDS
│   ├── hooks/
│   │   ├── useSocketCocina.js        # Hook Socket.io
│   │   ├── useKdsBehavior.js         # Hook comportamiento KDS
│   │   ├── useProcesamiento.js       # Hook procesamiento platos
│   │   └── useComandastyleCore.js    # Hook compartido (v7.3)
│   ├── config/
│   │   ├── apiConfig.js              # Configuración de API
│   │   ├── apiClient.js              # Cliente HTTP
│   │   └── kdsConfigConstants.js     # Constantes KDS
│   ├── utils/
│   │   └── kdsFilters.js             # Módulo de filtros (v7.3)
│   └── index.js                      # Punto de entrada
```

### Flujo de Datos

```
Backend (Node.js + Socket.io)
    ↓
Socket.io Namespace: /cocina
    ↓
useSocketCocina Hook → useComandastyleCore Hook
    ↓
kdsFilters.js (filtrado)
    ↓
ComandaStyle / ComandastylePerso Component
    ↓
UI (Tarjetas, Botones, Modales)
    ↓
Usuario (Cocinero)
```

---

## 🎨 Interfaz de Usuario (UI/UX)

### Layout Principal

La interfaz está dividida en **4 secciones principales**:

#### 1. Header Superior (Barra de Navegación)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Hora] [Fecha]  COCINA LAS GAMBUSINAS  [Pendientes: 2]                 │
│                              [● Realtime] [← Menú] [🔍] [📊] [⚙️] [↩️] [⛶]│
│                    [ZoneSelector si vista personalizada]                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- **Hora y Fecha**: Actualización en tiempo real
- **Título**: "COCINA LAS GAMBUSINAS"
- **Contador de Comandas**: Número de comandas pendientes
- **Indicador de Conexión**: 🟢 Conectado / 🔴 Desconectado
- **ZoneSelector**: Solo en Vista Personalizada
- **Botones de Acción**: Menú, Buscar, Reportes, Config, Revertir, Fullscreen

#### 2. Barra de Búsqueda (Opcional)

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 [Input de búsqueda por número de comanda, mesa, mozo...] │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Área Principal - Grid de Comandas (Kanban)

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Orden #1 │  │ Orden #2 │  │ Orden #3 │  │ Orden #4 │    │
│  │ [Platos] │  │ [Platos] │  │ [Platos] │  │ [Platos] │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  [Paginación: ← Página 1 de 3 →]                            │
└─────────────────────────────────────────────────────────────┘
```

#### 4. Barra Inferior Sticky (Acciones Globales)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [Tomar/Dejar/Finalizar X Platos] [Finalizar #Y ✓] [REVERTIR] [🚀 Prioridad] [Pág]│
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Tarjeta de Comanda (SicarComandaCard)

```
┌─────────────────────────────────────┐
│         [✓ Grande si seleccionada] │
│ ┌─────────────────────────────────┐│
│ │ Orden #331          M1     🚀   ││
│ │ 1                   ⏱️ 03:29:07 ││
│ │ 👤 admin  Prep 1/3 Listos 2     ││
│ └─────────────────────────────────┘│
│ ┌─────────────────────────────────┐│
│ │ 📋 EN PREPARACIÓN (1/3)         ││
│ │ ☐ 1 Papa a la huancaína         ││
│ │    👨‍🍳 [Tú]                      ││
│ │ ~~Tamal~~ 🔴 Mozo Juan          ││
│ │                                 ││
│ │ ✅ PREPARADOS (2/3)             ││
│ │ ✓ 1 Tamal + zarza criolla      ││
│ │ ✓ 1 Ensalada especial           ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Estados Visuales de Platos

| Estado Visual | Color | Icono | Significado |
|---------------|-------|-------|-------------|
| `normal` | Gris | ☐ | Sin marcar |
| `procesando` | Amarillo | ⏳ | En proceso de marcar |
| `dejar` | Rojo | ↩️ | Liberar plato tomado |
| `seleccionado` | Verde | ✓ | Listo para finalizar |
| `eliminado` | Rojo tachado | ✕ | Plato eliminado por mozo |

---

## ⚙️ Funcionalidades Principales

### 1. Sistema de Checkboxes por Plato

**Objetivo**: Permitir marcar platos individuales para finalizarlos en batch.

**Cómo Funciona:**
1. Click en plato → Toggle estado visual
2. Estados: normal → procesando → seleccionado → normal
3. Si está tomado por mí: normal → dejar → seleccionado → normal
4. Click en "Finalizar X Platos" → API calls en paralelo

### 2. Selección de Comandas (Multi-Selección)

**Zonas que Seleccionan Comanda:**
- ✅ Header rojo (orden/mozo/tiempo)
- ✅ Barra "EN PREPARACIÓN"
- ✅ Barra "PREPARADOS"
- ✅ Platos en "PREPARADOS"

**Zonas que NO Seleccionan:**
- ❌ Platos en "EN PREPARACIÓN" (solo toggle check)

### 3. Finalización de Platos (Batch Processing)

```
1. Usuario marca platos con checkboxes
   ↓
2. Click en "Finalizar X Platos"
   ↓
3. Validación: ¿Hay platos marcados?
   ↓
4. API Calls en Paralelo (Promise.allSettled)
   ↓
5. Socket.io emite "plato-actualizado"
   ↓
6. Frontend actualiza UI
```

### 4. Sistema de Alertas por Tiempo

| Tiempo Transcurrido | Color Header | Significado |
|---------------------|--------------|-------------|
| **< 15 minutos** | 🟢 Gris | Normal |
| **15-20 minutos** | 🟡 Amarillo | Alerta |
| **> 20 minutos** | 🔴 Rojo | Urgente |

### 5. Prioridad Alta (VIP)

**Comportamiento:**
- Solo visible si rol `cocina`
- Botón prioriza comanda seleccionada o primera en espera
- Ordenamiento por `prioridadOrden` DESC, luego `createdAt` ASC
- Icono 🚀 en header de tarjetas prioritarias

### 6. Comunicación en Tiempo Real (Socket.io)

**Namespace:** `/cocina`

**Eventos Recibidos:**

| Evento | Descripción |
|--------|-------------|
| `nueva-comanda` | Nueva comanda creada |
| `comanda-actualizada` | Comanda modificada |
| `plato-actualizado` | Estado de plato cambiado |
| `plato-procesando` | Plato tomado por cocinero |
| `plato-liberado` | Plato liberado |
| `conflicto-procesamiento` | Conflicto al tomar plato |
| `config-cocinero-actualizada` | Configuración actualizada |
| `zona-asignada` | Nueva zona asignada |

### 7. Sistema Multi-Cocinero (v7.2)

**Características:**
- Botón contextual: "Tomar" → "Dejar" → "Finalizar"
- Badge de cocinero en cada plato tomado
- Validación: solo quien tomó puede finalizar
- Prevención de conflictos con error 409/403

---

## 📡 Integración con Backend

### Endpoints Utilizados

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| `POST` | `/api/admin/cocina/auth` | Login App Cocina |
| `GET` | `/api/cocina/:fecha` | Obtener comandas del día |
| `PUT` | `/api/comanda/:id/plato/:platoId/estado` | Cambiar estado de plato |
| `PUT` | `/api/comanda/:id/plato/:platoId/procesando` | Tomar plato |
| `DELETE` | `/api/comanda/:id/plato/:platoId/procesando` | Liberar plato |
| `PUT` | `/api/comanda/:id/plato/:platoId/finalizar` | Finalizar plato |
| `PUT` | `/api/comanda/:id/status` | Cambiar estado comanda |
| `PUT` | `/api/comanda/:id/prioridad` | Priorizar comanda |
| `GET` | `/api/cocineros/:id/config` | Obtener configuración |
| `GET` | `/api/cocineros/:id/zonas` | Obtener zonas asignadas |

### Socket.io Events

**Emitidos por el Servidor:**

```javascript
// Nueva comanda
socket.on('nueva-comanda', (data) => { comanda: Comanda });

// Comanda actualizada
socket.on('comanda-actualizada', (data) => { comandaId, comanda });

// Plato tomado/liberado
socket.on('plato-procesando', (data) => { comandaId, platoId, cocinero });
socket.on('plato-liberado', (data) => { comandaId, platoId, cocineroId });

// Conflicto
socket.on('conflicto-procesamiento', (data) => { mensaje, procesadoPor });

// Configuración actualizada
socket.on('config-cocinero-actualizada', (data) => { cocineroId, config });
```

**Emitidos por el Cliente:**

```javascript
// Unirse a room por fecha
socket.emit('join-fecha', fechaActual);

// Unirse a room personal
socket.emit('join-cocinero', cocineroId);

// Heartbeat
socket.emit('heartbeat');
```

---

## 🔧 Hooks Personalizados

### useSocketCocina

**Ubicación:** `appcocina/src/hooks/useSocketCocina.js`

Hook para manejar conexión Socket.io con autenticación JWT.

```javascript
const {
  socket,           // Instancia del socket
  connected,        // boolean
  connectionStatus, // 'conectado' | 'desconectado' | 'auth_error'
  authError         // string | null
} = useSocketCocina({
  onNuevaComanda,
  onComandaActualizada,
  onPlatoActualizado,
  onConfigCocineroActualizada,
  obtenerComandas,
  token,
  cocineroId
});
```

### useKdsBehavior

**Ubicación:** `appcocina/src/hooks/useKdsBehavior.js`

Hook que conecta la configuración con el comportamiento del KDS.

```javascript
const {
  sortComandas,           // (comandas) => sortedComandas
  getAlertLevel,          // (createdAt) => 'normal' | 'yellow' | 'red'
  shouldShowCriticalAlert,// (createdAt) => boolean
  getCardClasses,         // (comanda, isExpanded) => string
  getFontSizeStyle,       // () => { fontSize: string }
  getGridConfig,          // () => { cols, rows, totalSlots }
} = useKdsBehavior();
```

### useProcesamiento

**Ubicación:** `appcocina/src/hooks/useProcesamiento.js`

Hook para manejar el flujo de Tomar/Liberar/Finalizar platos.

```javascript
const {
  loading,
  error,
  tomarPlato,      // (comandaId, platoId, cocineroId)
  liberarPlato,    // (comandaId, platoId, cocineroId, motivo)
  finalizarPlato,  // (comandaId, platoId, cocineroId)
  tomarComanda,    // (comandaId, cocineroId)
  liberarComanda   // (comandaId, cocineroId)
} = useProcesamiento({
  getToken,
  showToast,
  onProcesamientoChange
});
```

### useComandastyleCore

**Ubicación:** `appcocina/src/hooks/useComandastyleCore.js`

Hook compartido que extrae la lógica común entre vistas KDS.

```javascript
const {
  // Estado
  comandas,
  loading,
  error,
  lastRefresh,
  
  // Estados visuales
  expandedComandas,
  selectedOrders,
  currentPage,
  toastMessage,
  
  // Conexión
  connected,
  connectionStatus,
  authError,
  
  // Acciones
  obtenerComandas,
  toggleExpand,
  toggleSelect,
  clearSelection,
  showToast,
  setCurrentPage,
  
  // Utilidades
  calcularTiempos,
  getAlertColor
} = useComandastyleCore({
  getToken,
  customFilter,      // Función de filtrado personalizada
  cocineroConfig,
  cocineroId,
  config
});
```

---

## 🧪 Tests

### Archivos de Test

**Ubicación:** `appcocina/src/components/Principal/__tests__/`

- `vistasKDS.test.js`: Tests para las vistas del KDS

**Ubicación:** `appcocina/src/utils/__tests__/`

- `kdsFilters.test.js`: Tests para el módulo de filtros

---

## 📊 Constantes de Configuración

### kdsConfigConstants.js

**Ubicación:** `appcocina/src/config/kdsConfigConstants.js`

```javascript
// Versión de configuración
KDS_CONFIG_VERSION = '7.2.0';

// Tiempos de alerta
TIEMPOS_ALERTA = {
  AMARILLA_DEFAULT: 15,
  ROJA_DEFAULT: 20,
  CRITICA_DEFAULT: 25,
  // ...rangos min/max
};

// Diseño del grid
DISENO_GRID = {
  COLUMNAS_DEFAULT: 5,
  FILAS_DEFAULT: 1,
  FUENTE_DEFAULT: 15,
  // ...rangos min/max
};

// Modos de vista
MODO_VISTA = {
  TARJETAS: 'tarjetas',
  TABLA: 'tabla'
};

// Criterios de ordenamiento
ORDENAMIENTO = {
  TIEMPO: 'tiempo',
  MESA: 'mesa',
  PRIORIDAD: 'prioridad',
  CREACION: 'creacion'
};

// Configuración por defecto
DEFAULT_KDS_CONFIG = { ... };

// Claves de localStorage
STORAGE_KEYS = {
  CONFIG: 'kdsConfig',
  CONFIG_VERSION: 'kdsConfigVersion',
  PLATO_STATES: 'platoStates',
  ZONA_ACTIVA: 'cocinaZonaActiva',
  VIEW_MODE: 'cocinaViewMode',
  // ...
};
```

---

## 🚀 Scripts Disponibles

```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```

---

## 📝 Notas de Desarrollo

### Variables de Entorno

Crear archivo `.env` en la raíz:

```
REACT_APP_IP=192.168.1.100
REACT_APP_API_COMANDA=http://192.168.1.100:3000/api/comanda
REACT_APP_ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.100
```

### Seguridad

- Token JWT obligatorio para Socket.io
- Validación de expiración de token en frontend
- Logout automático por inactividad (30 min)
- Lista blanca de hosts permitidos
- Limpieza automática de estados obsoletos

---

**Fin de la Documentación - App de Cocina v7.3.0**
