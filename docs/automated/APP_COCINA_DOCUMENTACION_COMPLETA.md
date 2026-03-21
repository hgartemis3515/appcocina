# 📱 Documentación Completa - App de Cocina (Las Gambusinas)

**Versión:** 7.2.1  
**Última Actualización:** Marzo 2026  
**Tecnología:** React Web + Socket.io + Framer Motion

**Cambios Recientes (v7.2.1):**
- ✅ **Ciclo de estados diferenciado**: Flujo diferente según si el plato está tomado por el cocinero actual
- ✅ **Estado visual "dejar" (rojo)**: Permite al cocinero indicar que quiere liberar un plato tomado
- ✅ **Corrección del botón contextual**: Ahora responde correctamente a platos en amarillo/rojo
- ✅ **Estado visual automático**: Platos con `procesandoPor` se muestran en amarillo automáticamente

**Cambios Recientes (v7.2):**
- ✅ **Sistema Multi-Cocinero**: Botón contextual en barra inferior para Tomar/Dejar/Finalizar platos
- ✅ **Badge de cocinero**: Muestra quién está procesando cada plato (badge verde "Tú" para propio, amarillo para otros)
- ✅ **Validación de propiedad**: Solo el cocinero que tomó un plato puede finalizarlo
- ✅ **Eventos Socket.io**: `plato-procesando`, `plato-liberado`, `conflicto-procesamiento` sincronizados
- ✅ **Prevención de conflictos**: Error 403 si otro cocinero intenta finalizar plato ajeno

**Cambios Recientes (v7.1):**
- ✅ **Sistema de autenticación**: Login con DNI funcionando correctamente
- ✅ **Socket.io con JWT**: Conexión segura al namespace `/cocina`
- ✅ **Rooms por fecha**: Sincronización de comandas del día
- ✅ **Configuración centralizada**: ConfigContext para preferencias

**Nota sobre v7.2:** El sistema multi-cocinero ha sido reintegrado de forma compatible con el flujo existente. El botón de la barra inferior ahora muestra dinámicamente "Tomar plato", "Dejar plato" o "Finalizar plato" según el estado de los platos seleccionados.

**Cambios Recientes (v6.0) - Sistema de Autenticación y Menú:**
- ✅ **Login de Cocina**: Nueva pantalla de autenticación con DNI
- ✅ **Menú Principal**: Navegación centralizada antes del tablero KDS
- ✅ **Protección de Rutas**: Control de acceso con AuthContext y ProtectedRoute
- ✅ **Botón "Regresar"**: En header para volver al menú sin cerrar sesión
- ✅ **Persistencia de Sesión**: Token JWT 8h en localStorage, restauración automática
- ✅ **Endpoint de Auth**: `POST /api/admin/cocina/auth` (valida rol cocinero/admin)

**Cambios Recientes (v5.4):**
- ✅ **Prioridad Alta**: Botón en toolbar para priorizar comanda (VIP/cliente especial); solo rol `cocina`
- ✅ Ordenamiento por `prioridadOrden` (DESC) + `createdAt` (ASC); icono 🚀 en tarjetas prioritarias
- ✅ Endpoint `PUT /api/comanda/:id/prioridad` y evento socket `comanda-actualizada` con prioridad
- ✅ Reset de prioridad al pasar comanda a "recoger"; responsive y toasts de confirmación

**Cambios Recientes (v5.3):**
- ✅ Eliminada sección "EN ESPERA" redundante
- ✅ Badges movidos al header (Prep X/Total, Listos Y, Elim Z)
- ✅ Visualización de platos eliminados con audit trail (mozo + hora)
- ✅ Zonas click refinadas: Header/barras seleccionan, platos Preparación solo togglean
- ✅ StopPropagation mejorado para evitar bubbling no deseado

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Sistema de Autenticación y Navegación (v6.0)](#-sistema-de-autenticación-y-navegación-v60)
3. [Arquitectura y Tecnologías](#arquitectura-y-tecnologías)
4. [Interfaz de Usuario (UI/UX)](#interfaz-de-usuario-uiux)
5. [Funcionalidades Principales](#funcionalidades-principales)
6. [Sistema de Estados y Flujos](#sistema-de-estados-y-flujos)
7. [Componentes y Funciones Detalladas](#componentes-y-funciones-detalladas)
8. [Integración con Backend](#integración-con-backend)
9. [Flujos de Trabajo Completos](#flujos-de-trabajo-completos)
10. [Casos de Uso y Escenarios](#casos-de-uso-y-escenarios)
11. [Sugerencias y Recomendaciones (v7.0)](#-sección-de-sugerencias-y-recomendaciones-v70)
12. [Estado Actual del Sistema (v7.1)](#-resumen-de-implementación-v71---estado-actual)

---

## 🎯 Visión General

### ¿Qué es el App de Cocina?

El **App de Cocina** es una aplicación web React diseñada para gestionar comandas de restaurante en tiempo real. Funciona como un **KDS (Kitchen Display System)** profesional que permite a los cocineros y a la **gestión de cocina**:

- **Visualizar** comandas entrantes en tiempo real
- **Gestionar** el estado de cada plato individualmente
- **Finalizar** platos y comandas completas
- **Monitorear** tiempos de preparación con alertas visuales
- **Trabajar** con múltiples comandas simultáneamente
- **Organizar** la carga de trabajo de cocina según el **tiempo estimado de preparación de cada plato**, priorizando lo que toma más tiempo

### Contexto de negocio: app tipo KDS de comida rápida

Esta app está pensada para funcionar como la pantalla de cocina de cadenas de **comida rápida** (ej. KFC, Popeyes, otros restaurantes de servicio rápido), donde:

- **La cocina y la persona gestionadora** controlan en una sola vista todas las comandas que se prepararán.
- Cada comanda se representa como una **tarjeta visual** que agrupa los platos y muestra claramente su tiempo en cocina.
- Los cocineros pueden **decidir qué platos empezar primero** según:
  - El tiempo que ya llevan en cocina.
  - El tipo de preparación (platos que demoran más vs. platos rápidos).
- El sistema de colores (verde/amarillo/rojo) sirve como una guía rápida para ordenar la producción, evitando cuellos de botella y atrasos.
- La lógica está orientada a **flujo continuo** de comandas, típico de cocinas de comida rápida: muchas órdenes pequeñas, alta rotación y necesidad de priorización dinámica.

### Características Principales

✅ **Tiempo Real**: Actualizaciones instantáneas vía WebSocket (Socket.io)  
✅ **Sistema de Checkboxes**: Control granular por plato individual  
✅ **Multi-Selección**: Seleccionar y finalizar múltiples comandas  
✅ **Prioridad Alta**: Botón para priorizar comanda (rol cocina); ordenamiento y icono 🚀  
✅ **Alertas Visuales**: Colores según tiempo transcurrido (verde/amarillo/rojo)  
✅ **Modo Oscuro**: Interfaz optimizada para cocinas  
✅ **Responsive**: Adaptable a diferentes tamaños de pantalla  
✅ **Animaciones**: Transiciones suaves con Framer Motion  

---

## 🔐 Sistema de Autenticación y Navegación (v6.0)

### Descripción General

A partir de la versión 6.0, el App de Cocina cuenta con un sistema de autenticación y navegación que protege el acceso al tablero KDS. El flujo ahora es:

```
Login (DNI) → Menú Principal → Tablero KDS (ComandaStyle)
```

### Arquitectura de Navegación

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.jsx                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    AuthProvider                          │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              AppRouter (estado simple)           │    │    │
│  │  │  currentView: 'LOADING' | 'LOGIN' | 'MENU' | 'COCINA'  │   │
│  │  │                                                  │    │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │    │    │
│  │  │  │  LOGIN   │→→│   MENU   │→→│    COCINA    │   │    │    │
│  │  │  │  Page    │  │   Page   │  │ (ComandaStyle)│   │    │    │
│  │  │  └──────────┘  └──────────┘  └──────────────┘   │    │    │
│  │  │       ↑             ↑                │          │    │    │
│  │  │       │             └────────────────┘          │    │    │
│  │  │       │                  "Regresar"             │    │    │
│  │  │       └─────────────────────────────────────────┘    │    │
│  │  │                     "Cerrar Sesión"                  │    │
│  │  └─────────────────────────────────────────────────────┘    │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Componentes del Sistema de Autenticación

#### 1. AuthContext.jsx - Contexto de Autenticación

**Ubicación:** `appcocina/src/contexts/AuthContext.jsx`

**Funcionalidades:**
- Gestión del estado de sesión (usuario, token, loading)
- Login mediante DNI contra endpoint `/api/admin/cocina/auth`
- Logout y limpieza de sesión
- Restauración automática de sesión desde localStorage
- Verificación de roles (`hasRole()`)

**Estado:**
```javascript
const {
  user,           // { id, name, rol, permisos }
  token,          // JWT token
  loading,        // boolean - cargando sesión
  error,          // string - mensaje de error
  isAuthenticated,// boolean - sesión activa
  login,          // (dni) => Promise
  logout,         // () => void
  hasRole,        // (roles[]) => boolean
  setError        // (msg) => void
} = useAuth();
```

#### 2. LoginPage.jsx - Pantalla de Login

**Ubicación:** `appcocina/src/components/pages/LoginPage.jsx`

**Características:**
- Interfaz con branding "COCINA LAS GAMBUSINAS"
- Input de DNI (8 dígitos numéricos)
- Validación visual en tiempo real
- Mensajes de error claros (DNI inválido, no registrado, sin permisos)
- Animaciones Framer Motion
- Estado de carga mientras se verifica

**Endpoint utilizado:**
```
POST /api/admin/cocina/auth
Body: { dni: "12345678" }
Response: { token, usuario: { id, name, rol, permisos } }
```

#### 3. MenuPage.jsx - Menú Principal

**Ubicación:** `appcocina/src/components/pages/MenuPage.jsx`

**Opciones disponibles:**
- **Ver Comandas (KDS)**: Navega al tablero Kanban
- **Configuración**: Abre directamente el modal de configuración

**Opciones futuras (preparadas pero deshabilitadas):**
- Reportes del Día
- Historial (Días anteriores)
- Estadísticas de Tiempos de Preparación

**Funcionalidades:**
- Muestra nombre y rol del usuario autenticado
- Botón "Cerrar Sesión" con confirmación
- Diseño responsive para pantallas de cocina

#### 4. ProtectedRoute.jsx - Protección de Rutas

**Ubicación:** `appcocina/src/components/common/ProtectedRoute.jsx`

**Función:**
- Verifica que el usuario esté autenticado antes de renderizar contenido protegido
- Muestra spinner mientras se verifica la sesión
- Redirige al Login si no hay sesión activa

### Flujo de Autenticación

```
1. Usuario accede al App de Cocina
   ↓
2. App.jsx verifica si hay sesión en localStorage (cocinaAuth)
   ↓
3a. Si hay sesión válida → Ir al Menú
3b. Si no hay sesión → Mostrar Login
   ↓
4. Usuario ingresa DNI → Click "INGRESAR"
   ↓
5. Frontend llama POST /api/admin/cocina/auth
   ↓
6a. Si éxito → Guarda token en localStorage, navega al Menú
6b. Si error → Muestra mensaje de error
   ↓
7. Desde el Menú, usuario puede:
   - Ver Comandas → Navega a ComandaStyle
   - Configuración → Navega a ComandaStyle con modal abierto
   - Cerrar Sesión → Limpia localStorage, vuelve al Login
```

### Persistencia de Sesión

- **Almacenamiento:** `localStorage.setItem('cocinaAuth', JSON.stringify({ token, usuario }))`
- **Duración del Token:** 8 horas (configurado en backend JWT)
- **Restauración:** Al refrescar la página, `AuthContext` carga la sesión desde localStorage
- **Limpieza:** Al hacer logout o si el token expira

### Protección del Tablero KDS

La conexión Socket.io al namespace `/cocina` y la unión al room por fecha **solo ocurren cuando el usuario está en la vista de COCINA**, no en el Login ni en el Menú. Esto significa:

1. El socket no se conecta hasta que el usuario hace clic en "Ver Comandas"
2. Al salir de la vista de cocina (Regresar), el socket se desconecta
3. Al volver a entrar, se reconecta automáticamente

### Botón "Regresar" en el Header

En `ComandaStyle.jsx`, el header ahora incluye un botón naranja **"← Menú"** que:

- Cierra todos los modales abiertos (config, reportes, revertir, búsqueda)
- Navega de vuelta al Menú Principal
- **NO cierra la sesión** (el usuario sigue autenticado)

**Ubicación en el header:**
```
[← Menú] [🔍 Buscar] [📊 Reportes] [⚙️ Config] [↩️ Revertir] [⛶ Fullscreen]
```

### Endpoints de Autenticación

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| `POST` | `/api/admin/cocina/auth` | Login para App Cocina (solo DNI) |
| `POST` | `/api/admin/auth` | Login para Dashboard Admin |
| `POST` | `/api/admin/mozos/auth` | Login para App Mozos |

**Validaciones del backend para `/api/admin/cocina/auth`:**
- DNI debe estar registrado en la colección `mozos`
- El usuario debe tener rol `cocinero` o `admin`
- El usuario debe estar activo (`activo !== false`)

---

## 🏗️ Arquitectura y Tecnologías

### Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.x | Framework UI |
| **Socket.io Client** | 4.x | Comunicación en tiempo real |
| **Framer Motion** | 10.x | Animaciones y transiciones |
| **Axios** | 1.x | Peticiones HTTP |
| **Moment.js + Timezone** | 2.x | Manejo de fechas/horas |
| **React Icons** | 4.x | Iconografía |

### Estructura de Archivos

```
appcocina/
├── src/
│   ├── components/
│   │   ├── pages/                    # NUEVO - Páginas de navegación
│   │   │   ├── LoginPage.jsx         # Pantalla de login (DNI)
│   │   │   └── MenuPage.jsx          # Menú principal
│   │   ├── common/                   # NUEVO - Componentes compartidos
│   │   │   └── ProtectedRoute.jsx    # Protección de rutas
│   │   ├── Principal/
│   │   │   ├── ComandaStyle.jsx      # Componente principal (Kanban)
│   │   │   ├── ConfigModal.jsx       # Configuración del sistema
│   │   │   ├── ReportsModal.jsx      # Reportes y estadísticas
│   │   │   ├── RevertirModal.jsx     # Revertir estados
│   │   │   ├── AnotacionesModal.jsx  # Anotaciones en comandas
│   │   │   └── PlatoPreparacion.jsx  # Componente de plato individual
│   │   ├── additionals/
│   │   │   └── SearchBar.jsx         # Barra de búsqueda
│   │   └── pdf/
│   │       ├── pdfbutton.jsx         # Botón de impresión PDF
│   │       └── pdfcomanda.jsx        # Generador de PDF
│   ├── contexts/                     # NUEVO - Contextos de React
│   │   └── AuthContext.jsx           # Contexto de autenticación
│   ├── hooks/
│   │   └── useSocketCocina.js        # Hook personalizado Socket.io
│   ├── config/
│   │   └── apiConfig.js              # Configuración de API
│   └── index.js                      # Punto de entrada
```

### Flujo de Datos

```
Backend (Node.js + Socket.io)
    ↓
Socket.io Namespace: /cocina
    ↓
useSocketCocina Hook
    ↓
ComandaStyle Component
    ↓
UI (Tarjetas, Botones, Modales)
    ↓
Usuario (Cocinero)
```

---

## 🎨 Interfaz de Usuario (UI/UX)

### Layout Principal

La interfaz está dividida en **4 secciones principales**:

#### 1. **Header Superior** (Barra de Navegación)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Hora] [Fecha]  COCINA LAS GAMBUSINAS  [Pendientes: 2]                 │
│                              [● Realtime] [← Menú] [🔍] [📊] [⚙️] [↩️] [⛶]│
└─────────────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- **Hora y Fecha**: Actualización en tiempo real (formato: `HH:mm` y `DD/MM/YYYY`)
- **Título**: "COCINA LAS GAMBUSINAS" (centro)
- **Contador de Comandas**: Número de comandas pendientes (amarillo destacado)
- **Indicador de Conexión**: 
  - 🟢 "● Realtime" (verde) = Conectado
  - 🔴 "● Desconectado" (rojo) = Sin conexión
- **Botones de Acción**:
  - **← Menú** (naranja): Vuelve al menú principal sin cerrar sesión
  - 🔍 **Buscar**: Muestra/oculta barra de búsqueda
  - 📊 **Reportes**: Abre modal de reportes y estadísticas
  - ⚙️ **Config**: Abre modal de configuración
  - ↩️ **Revertir**: Abre modal para revertir estados
  - ⛶ **Pantalla Completa**: Toggle fullscreen

#### 2. **Barra de Búsqueda** (Opcional, se puede ocultar)

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 [Input de búsqueda por número de comanda, mesa, mozo...] │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- Filtra comandas en tiempo real mientras se escribe
- Busca en: número de comanda, mesa, nombre del mozo, platos

#### 3. **Área Principal - Grid de Comandas** (Kanban)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Orden #1 │  │ Orden #2 │  │ Orden #3 │  │ Orden #4 │    │
│  │          │  │          │  │          │  │          │    │
│  │ [Platos] │  │ [Platos] │  │ [Platos] │  │ [Platos] │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
│  [Paginación: ← Página 1 de 3 →]                            │
└─────────────────────────────────────────────────────────────┘
```

**Características:**
- **Grid Responsive**: Ajusta número de columnas según tamaño de pantalla
- **Paginación**: Muestra 5-10 comandas por página (configurable)
- **Scroll Vertical**: Si hay muchas comandas
- **Animaciones**: Entrada/salida suave de tarjetas (Framer Motion)

#### 4. **Barra Inferior Sticky** (Acciones Globales)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [Finalizar X Platos] [Finalizar #Y ✓] [REVERTIR] [🚀 Prioridad Alta] [Página 1] │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Botones:**
- **"Finalizar X Platos"** (Verde): Finaliza platos marcados con checkboxes
- **"Finalizar #Y ✓"** (Azul): Finaliza comanda(s) seleccionada(s) completa(s)
- **"REVERTIR"** (Gris/Rojo): Revertir estados de comandas
- **"🚀 Prioridad Alta (1)" / "(Auto)"** (Verde si habilitado, gris si no): Prioriza la comanda seleccionada o la primera en espera; solo visible para rol `cocina` (localStorage.userRole)
- **Paginación: "Página 1"** o controles `← →`

---

### Tarjeta de Comanda (SicarComandaCard)

Cada comanda se muestra en una **tarjeta individual** con la siguiente estructura:

```
┌─────────────────────────────────────┐
│         [✓ Grande si seleccionada] │
│ ┌─────────────────────────────────┐│
│ │ Orden #331          M1          ││
│ │ 1                   ⏱️ 03:29:07 ││
│ │ 👤 admin  Prep 1/3 Listos 2     ││
│ └─────────────────────────────────┘│
│ ┌─────────────────────────────────┐│
│ │ 📋 EN PREPARACIÓN (1/3)         ││
│ │ ☐ 1 Papa a la huancaína         ││
│ │ ~~Tamal~~ 🔴 Mozo Juan          ││
│ │                                 ││
│ │ ✅ PREPARADOS (2/3)             ││
│ │ ✓ 1 Tamal + zarza criolla      ││
│ │ ✓ 1 Ensalada especial           ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### Elementos de la Tarjeta

**1. Header (Parte Superior)**
- **Color de Fondo**: Cambia según tiempo transcurrido
  - 🟢 **Gris** (< 15 min): Normal
  - 🟡 **Amarillo** (15-20 min): Alerta
  - 🔴 **Rojo** (> 20 min): Urgente
- **Contenido**:
  - **Orden #XXX**: Número de comanda (izquierda)
  - **🚀 (rojo)**: Icono de prioridad alta si `comanda.prioridadOrden > 0` (comanda priorizada)
  - **Mesa M#**: Número de mesa (derecha)
  - **Cronómetro**: Tiempo transcurrido `HH:MM:SS` (actualiza cada segundo)
  - **Número de Tarjeta**: Posición en el grid (1, 2, 3...)
  - **👤 Nombre del Mozo**: Quien tomó la comanda
  - **Badges Inline**: 
    - `Prep X/Total` - Platos en preparación
    - `Listos Y` - Platos listos
    - `Elim Z` - Platos eliminados (si hay)
    - `¡Urgente!` - Si tiempo > 20 min
- **Zona Clickeable**: Click en header → Selecciona/deselecciona comanda

**2. Sección de Platos Agrupados**

Los platos se agrupan en **2 secciones principales**:

##### a) **EN PREPARACIÓN** (Fondo oscuro/claro según modo)
- **Barra Header**: Click en barra "EN PREPARACIÓN" → Selecciona comanda
- Platos con estado `"en_espera"`, `"ingresante"` o `"pedido"`
- Cada plato tiene:
  - ☐ **Checkbox**: Cuadrado blanco/gris (click para marcar)
  - **Cantidad + Nombre**: Ej. "1 Papa a la huancaína"
  - **Estados Visuales**:
    - ⚪ **Blanco**: Sin marcar
    - 🟡 **Amarillo**: Procesando (click en plato)
    - 🟢 **Verde con ✓**: Marcado para finalizar
- **Zona Clickeable**: 
  - **Click en plato completo** → Solo togglea check del plato (NO selecciona comanda)
  - **Click en barra header** → Selecciona comanda
- **Platos Eliminados**: Se muestran inline con:
  - ~~Texto tachado rojo~~ (strike-through)
  - Badge `🔴 {NombreMozo} {Hora}` con información del mozo que eliminó
  - Tooltip: "Eliminado por {mozo} a las {hora}"

##### b) **PREPARADOS** (Fondo verde claro)
- **Barra Header**: Click en barra "PREPARADOS" → Selecciona comanda
- Platos con estado `"recoger"`
- Cada plato muestra:
  - ✓ **Checkmark verde**: Indica que está listo
  - **Cantidad + Nombre**: Ej. "1 Tamal + zarza criolla"
- **Zona Clickeable**: 
  - **Click en plato completo** → Selecciona/deselecciona comanda
  - **Click en barra header** → Selecciona comanda

**3. Checkmark Grande de Selección**
- Aparece cuando la tarjeta está **seleccionada**
- **Zonas de Selección**:
  - Click en **Header rojo** → Selecciona comanda
  - Click en **Barra "EN PREPARACIÓN"** → Selecciona comanda
  - Click en **Barra "PREPARADOS"** → Selecciona comanda
  - Click en **Plato en Preparados** → Selecciona comanda
- **Zonas NO Seleccionan**:
  - Click en **Plato en Preparación** → Solo togglea check (stopPropagation)
- **Animación**: Scale-in con spring animation
- **Posición**: Centro superior de la tarjeta
- **Color**: Verde (#22c55e) para coincidir con botón "Finalizar Comanda"

---

## ⚙️ Funcionalidades Principales

### 1. Sistema de Checkboxes por Plato

**Objetivo**: Permitir marcar platos individuales para finalizarlos en batch.

**Cómo Funciona:**

1. **Marcar Plato**:
   - Click en **cualquier parte del plato** en "EN PREPARACIÓN" → Toggle `isChecked`
   - **NO selecciona la comanda** (stopPropagation activo)
   - Estados visuales:
     - ⚪ **Blanco**: Sin marcar
     - 🟡 **Amarillo**: Procesando (click en plato)
     - 🟢 **Verde con ✓**: Marcado para finalizar

2. **Estados Visuales**:
   ```
   Estado Inicial:  ☐ Blanco (sin marcar)
   Click en Plato:  🟡 Amarillo (processing)
   Click de nuevo:  ☑️ Verde con ✓ (checked)
   ```

3. **Finalizar Platos Marcados**:
   - Click en botón **"Finalizar X Platos"** (barra inferior)
   - Envía API calls en paralelo para cada plato marcado
   - Actualiza estado a `"recoger"`
   - Socket.io actualiza UI automáticamente
   - Platos se mueven a sección "PREPARADOS"

**Código Clave:**
```javascript
// Estado de checkboxes
const [platosChecked, setPlatosChecked] = useState(new Map());
// Estructura: { [comandaId]: { [platoId]: { isChecked: boolean, isProcessing: boolean } } }

// Toggle checkbox
const togglePlatoCheck = useCallback((comandaId, platoId) => {
  setPlatosChecked(prev => {
    const nuevo = new Map(prev);
    const comandaChecks = nuevo.get(comandaId) || new Map();
    const nuevoComandaChecks = new Map(comandaChecks);
    const estadoActual = nuevoComandaChecks.get(platoId) || { isChecked: false, isProcessing: false };
    
    nuevoComandaChecks.set(platoId, {
      isChecked: !estadoActual.isChecked,
      isProcessing: !estadoActual.isChecked
    });
    nuevo.set(comandaId, nuevoComandaChecks);
    return nuevo;
  });
}, []);
```

---

### 2. Selección de Comandas (Multi-Selección)

**Objetivo**: Seleccionar una o múltiples comandas para finalizarlas juntas.

**Cómo Funciona:**

1. **Seleccionar Comanda**:
   - Click en el **header rojo** → Toggle selección
   - Click en la **barra "EN PREPARACIÓN"** → Toggle selección
   - Click en la **barra "PREPARADOS"** → Toggle selección
   - Click en un **plato en Preparados** → Toggle selección
   - **NO selecciona**: Click en plato en Preparación (solo togglea check)

2. **Indicador Visual**:
   - **Checkmark grande (✓)** aparece en la parte superior de la tarjeta
   - **Borde verde** alrededor de la tarjeta (4px, glow)
   - **Sombra elevada** para destacar

3. **Botón "Finalizar Comanda"**:
   - **Sin selección**: Deshabilitado ("Finalizar Comanda")
   - **1 comanda seleccionada**: "Finalizar #331 (2/3 listos)" con progreso
   - **2+ comandas seleccionadas**: "Finalizar 2 Comandas" (si todas listas)

**Código Clave:**
```javascript
// Estado de selección (Set para multi-selección)
const [comandasSeleccionadas, setComandasSeleccionadas] = useState(new Set());

// Handler de selección
const handleSelectComanda = useCallback((comandaId) => {
  setComandasSeleccionadas(prev => {
    const nuevo = new Set(prev);
    if (nuevo.has(comandaId)) {
      nuevo.delete(comandaId); // Deseleccionar
    } else {
      nuevo.add(comandaId); // Seleccionar
    }
    return nuevo;
  });
}, []);
```

---

### 3. Finalización de Platos (Batch Processing)

**Objetivo**: Finalizar múltiples platos de diferentes comandas en una sola acción.

**Flujo Completo:**

```
1. Usuario marca platos con checkboxes
   ↓
2. Click en "Finalizar X Platos"
   ↓
3. Validación: ¿Hay platos marcados?
   ↓
4. API Calls en Paralelo (Promise.allSettled):
   PUT /api/comanda/:id/plato/:platoId/estado
   { nuevoEstado: "recoger" }
   ↓
5. Backend actualiza estado → Socket.io emite evento
   ↓
6. Frontend recibe "plato-actualizado" → Actualiza UI
   ↓
7. Limpia checkboxes de platos exitosos
   ↓
8. Muestra toast de éxito/error
```

**Código Clave:**
```javascript
const handleFinalizarPlatosGlobal = useCallback(async () => {
  const totalMarcados = getTotalPlatosMarcados();
  if (totalMarcados === 0) {
    console.warn('⚠️ No hay platos seleccionados');
    return;
  }

  // Recopilar todos los platos marcados
  const platosProcesados = [];
  platosChecked.forEach((comandaChecks, comandaId) => {
    comandaChecks.forEach((checkState, platoId) => {
      if (checkState.isChecked) {
        const comanda = comandas.find(c => c._id === comandaId);
        const plato = comanda?.platos?.find(p => {
          const pId = p.platoId?.toString() || p._id?.toString();
          return pId === platoId?.toString();
        });
        
        if (plato && (plato.estado === "en_espera" || plato.estado === "ingresante")) {
          platosProcesados.push({ comandaId, platoId });
        }
      }
    });
  });

  // Procesar en paralelo
  const resultados = await Promise.allSettled(
    platosProcesados.map(async ({ comandaId, platoId }) => {
      try {
        await axios.put(
          `${apiUrl}/${comandaId}/plato/${platoId}/estado`,
          { nuevoEstado: "recoger" }
        );
        return { comandaId, platoId, exito: true };
      } catch (error) {
        return { comandaId, platoId, exito: false, error };
      }
    })
  );

  // Limpiar checkboxes exitosos
  setPlatosChecked(prev => {
    const nuevo = new Map(prev);
    resultados.forEach(result => {
      if (result.status === 'fulfilled' && result.value.exito) {
        const { comandaId, platoId } = result.value;
        const comandaChecks = nuevo.get(comandaId);
        if (comandaChecks) {
          const nuevoComandaChecks = new Map(comandaChecks);
          nuevoComandaChecks.delete(platoId);
          nuevo.set(comandaId, nuevoComandaChecks);
        }
      }
    });
    return nuevo;
  });
}, [platosChecked, comandas]);
```

---

### 4. Finalización de Comanda Completa

**Objetivo**: Marcar una comanda completa como "entregada" (todos los platos a "entregado").

**Flujo Completo:**

```
1. Usuario selecciona comanda(s) (click en header)
   ↓
2. Validación: ¿Todos los platos están en "recoger" o "entregado"?
   ↓
3. Si NO → Alert: "Aún hay platos en preparación"
   ↓
4. Si SÍ → Modal de confirmación:
   "¿Finalizar Orden #313? Todos los platos se marcarán como entregados."
   ↓
5. Usuario confirma → API Call:
   PUT /api/comanda/:id/status
   { nuevoStatus: "entregado" }
   ↓
6. Backend:
   - Actualiza status comanda a "entregado"
   - Marca TODOS los platos a "entregado"
   - Recalcula estado de mesa
   - Emite Socket.io "comanda-actualizada"
   ↓
7. Frontend:
   - Recibe evento Socket.io
   - Mueve tarjeta a sección "Entregado" o la oculta
   - Limpia selección y checkboxes
   - Muestra toast de éxito
```

**Código Clave:**
```javascript
const handleFinalizarComandaCompletaGlobal = useCallback(async () => {
  // Validar que hay comandas seleccionadas
  if (comandasSeleccionadas.size === 0) {
    alert('⚠️ Por favor, selecciona al menos una comanda para finalizar.');
    return;
  }

  // Obtener comandas seleccionadas
  const comandasParaFinalizar = Array.from(comandasSeleccionadas).map(comandaId => {
    return comandas.find(c => c._id === comandaId);
  }).filter(Boolean);

  // Validar que todas tienen todos los platos listos
  const invalidas = comandasParaFinalizar.filter(comanda => {
    return !comandaTieneTodosPlatosListos(comanda._id);
  });

  if (invalidas.length > 0) {
    const numeros = invalidas.map(c => `#${c.comandaNumber || c._id}`).join(', ');
    alert(`⚠️ ${invalidas.length} comanda(s) aún tiene(n) platos en preparación: ${numeros}`);
    return;
  }

  // Mostrar modal de confirmación
  setModalFinalizarComanda({
    visible: true,
    comandaId: comandasParaFinalizar[0]._id,
    comandaNumber: comandasParaFinalizar[0].comandaNumber,
    mozoName: comandasParaFinalizar[0].mozos?.name || 'N/A',
    textoConfirmacion: comandasParaFinalizar.length === 1
      ? `¿Finalizar Orden ${comandasParaFinalizar[0].comandaNumber}?`
      : `¿Finalizar ${comandasParaFinalizar.length} comandas?`,
    onConfirmar: async () => {
      // Batch API para todas las comandas
      const resultados = await Promise.allSettled(
        comandasParaFinalizar.map(async (comanda) => {
          await axios.put(`${apiUrl}/${comanda._id}/status`, { nuevoStatus: "entregado" });
        })
      );
      
      // Limpiar selección y checks
      setComandasSeleccionadas(new Set());
      setPlatosChecked(prev => {
        const nuevo = new Map(prev);
        comandasParaFinalizar.forEach(comanda => nuevo.delete(comanda._id));
        return nuevo;
      });
    }
  });
}, [comandas, comandasSeleccionadas]);
```

---

### 5. Sistema de Alertas por Tiempo

**Objetivo**: Alertar visualmente cuando una comanda lleva mucho tiempo en preparación.

**Lógica de Colores:**

| Tiempo Transcurrido | Color Header | Significado |
|---------------------|--------------|-------------|
| **< 15 minutos** | 🟢 Gris (`bg-gray-500`) | Normal |
| **15-20 minutos** | 🟡 Amarillo (`bg-yellow-600`) | Alerta |
| **> 20 minutos** | 🔴 Rojo (`bg-red-700`) | Urgente |

**Cálculo del Tiempo:**
```javascript
const calcularTiempoTranscurrido = (comanda) => {
  if (!comanda.createdAt) return { horas: 0, minutos: 0, segundos: 0 };
  
  const ahora = moment().tz("America/Lima");
  const creacion = moment(comanda.createdAt).tz("America/Lima");
  const diffSegundos = ahora.diff(creacion, "seconds");
  
  return {
    horas: Math.floor(diffSegundos / 3600),
    minutos: Math.floor((diffSegundos % 3600) / 60),
    segundos: diffSegundos % 60
  };
};

// Actualización cada segundo
useEffect(() => {
  const interval = setInterval(() => {
    setTiempoDisplay(prev => {
      // Recalcular tiempo para cada comanda
      return calcularTiempoTranscurrido(comanda);
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [comanda.createdAt]);
```

**Cronómetro Visual:**
- Formato: `HH:MM:SS` (ej: `01:22:34`)
- Actualización: Cada 1 segundo
- Color del texto: Blanco (siempre visible sobre fondo coloreado)

---

### 6. Audit Trail Visual - Platos Eliminados

**Objetivo**: Mostrar visualmente qué platos fueron eliminados por mozos y quién los eliminó.

**Características:**
- **Visualización Inline**: Platos eliminados se muestran dentro de la sección "EN PREPARACIÓN"
- **Estilo Visual**:
  - ~~Texto tachado rojo~~ (strike-through)
  - Fondo rojo claro (`bg-red-500/15`)
  - Opacidad 60% para indicar estado eliminado
  - Badge con información: `🔴 {NombreMozo} {Hora}`
- **Información Mostrada**:
  - Nombre del plato eliminado
  - Cantidad original
  - Nombre del mozo que eliminó
  - Hora de eliminación (formato `HH:mm`)
  - Motivo de eliminación (si está disponible)
- **Tooltip**: Al hacer hover muestra "Eliminado por {mozo} a las {hora}"
- **Contador en Header**: Badge `Elim X` muestra cantidad de platos eliminados

**Fuente de Datos:**
- Backend proporciona `historialPlatos[]` con información completa
- Socket.io emite `comanda:plato-eliminado` cuando un mozo elimina un plato
- Frontend extrae información del mozo desde `historialPlatos[].usuario`

**Ejemplo Visual:**
```
EN PREPARACIÓN (1/3)
☐ 1 Papa a la huancaína
~~1 Tamal~~ 🔴 Juan 14:20  ← Plato eliminado
```

### 7. Comunicación en Tiempo Real (Socket.io)

**Objetivo**: Actualizar la UI automáticamente cuando hay cambios en el backend.

**Namespace:** `/cocina`

**Room por Fecha:** Al conectar, el socket se une a `fecha-{YYYY-MM-DD}` para recibir solo eventos del día actual.

**Eventos Recibidos:**

| Evento Socket.io | Descripción | Acción en Frontend |
|------------------|-------------|-------------------|
| `nueva-comanda` | Nueva comanda creada | Agregar tarjeta nueva con animación |
| `comanda-actualizada` | Comanda modificada (incl. prioridadOrden) | Actualizar tarjeta y reordenar por prioridad + createdAt |
| `plato-actualizado` | Estado de plato cambiado | Actualizar solo ese plato (granular) |
| `plato-entregado` | Plato marcado como entregado por mozo | Sincronizar estado en cocina |
| `comanda-eliminada` | Comanda eliminada/anulada | Remover tarjeta con animación |
| `comanda:plato-eliminado` | Plato eliminado de comanda por mozo | Mostrar inline en Preparación con info del mozo |
| `plato-cancelado-urgente` | **NUEVO** Mozo cancela plato que ya estaba en "recoger" | Alerta urgente en cocina con sonido |
| `plato-anulado` | **NUEVO** Cocina anula un plato | Actualizar UI con plato anulado |
| `comanda-anulada` | **NUEVO** Cocina anula comanda completa | Remover tarjeta o marcar como anulada |

**Hook Personalizado: `useSocketCocina`**

```javascript
const {
  socket,
  connected,
  connectionStatus  // 'conectado' | 'desconectado'
} = useSocketCocina({
  onNuevaComanda: handleNuevaComanda,
  onComandaActualizada: handleComandaActualizada,
  onPlatoActualizado: handlePlatoActualizado,
  onPlatoCanceladoUrgente: handlePlatoCanceladoUrgente,  // NUEVO
  onPlatoAnulado: handlePlatoAnulado,                     // NUEVO
  onComandaAnulada: handleComandaAnulada,                 // NUEVO
  obtenerComandas: obtenerComandas
});
```

**Manejo de Reconexión:**
- **Auto-reconexión**: Si se pierde conexión, intenta reconectar automáticamente (hasta 5 intentos)
- **Heartbeat**: Ping cada 30 segundos para mantener conexión activa
- **Polling Fallback**: Si está desconectado, refresca comandas cada 30s vía HTTP
- **Indicador Visual**: Muestra estado de conexión en header (`connectionStatus`)

---

### 8. Prioridad Alta (VIP / Cliente Especial)

**Objetivo**: Permitir a cocineros con rol `cocina` priorizar una comanda para que aparezca al principio del kanban (urgente/VIP).

**Requisitos:**
- Solo visible si `localStorage.userRole === 'cocina'`.
- Botón en toolbar inferior, a la derecha de "REVERTIR".

**Comportamiento:**
1. **Selección**: Si hay comanda seleccionada (highlight azul), se prioriza esa; si no, la primera con `status === 'enespera'` (auto).
2. **API**: `PUT /api/comanda/:id/prioridad` con body `{ prioridadOrden: Date.now() }` (peso único alto).
3. **Socket**: El backend emite `comanda-actualizada`; el front reordena y muestra toast "#comandaNumber priorizada".
4. **Ordenamiento**: Las comandas se ordenan por `prioridadOrden` DESC (mayor primero), luego por `createdAt` ASC. Se usa copia `[...prev]` para no mutar.
5. **Visual**: En el header de cada tarjeta se muestra icono 🚀 en rojo si `comanda.prioridadOrden > 0`.
6. **Reset UX**: Al cambiar una comanda a estado "recoger" (finalizar platos/comanda), se resetea `prioridadOrden = 0` vía PUT.
7. **Sonido**: Si `config.soundEnabled`, se reproduce sonido de alerta al priorizar (misma lógica que notificaciones).

**Resumen técnico:**
- Handler: prioriza `comandaSeleccionada` o primera en espera → `axios.put(..., { prioridadOrden: Date.now() })` → limpia selección → toast.
- `useEffect` sobre `comandas[]` y callback socket `comanda-actualizada`: sort por `(a, b) => (b.prioridadOrden || 0) - (a.prioridadOrden || 0) || new Date(a.createdAt) - new Date(b.createdAt)`.

---

### 9. Zonas Click Precisas

**Objetivo**: Comportamiento claro y predecible para selección de comandas vs toggle de platos (y uso de comanda seleccionada para Prioridad Alta).

**Zonas que Seleccionan Comanda:**
- ✅ **Header rojo** (orden/mozo/tiempo) → `onClick={onToggleSelect}`
- ✅ **Barra "EN PREPARACIÓN"** → `onClick={onToggleSelect}`
- ✅ **Barra "PREPARADOS"** → `onClick={onToggleSelect}`
- ✅ **Platos en "PREPARADOS"** → `onClick={onToggleSelect}` (todo el cuadro clickeable)

**Zonas que NO Seleccionan Comanda:**
- ❌ **Platos en "EN PREPARACIÓN"** → Solo togglean check del plato
  - `e.stopPropagation()` activo
  - `e.preventDefault()` para evitar comportamiento por defecto
  - `pointer-events-none` en elementos internos (checkbox, texto) para evitar interferencias

**Implementación Técnica:**
```javascript
// Platos en Preparación - Solo toggle, NO selección
<motion.div
  onClick={(e) => {
    e.stopPropagation(); // Bloquear bubbling
    e.preventDefault();
    togglePlatoCheck(comandaId, platoId);
  }}
>
  <motion.div className="pointer-events-none"> {/* Checkbox */}
  <span className="pointer-events-none"> {/* Texto */}
</motion.div>

// Platos en Preparados - Selección comanda
<motion.div
  onClick={onToggleSelect} // Seleccionar comanda
>
  <div className="pointer-events-none"> {/* Check */}
  <span className="pointer-events-none"> {/* Texto */}
</motion.div>
```

### 10. Búsqueda y Filtrado

**Objetivo**: Encontrar comandas específicas rápidamente.

**Campos de Búsqueda:**
- Número de comanda (ej: "313")
- Número de mesa (ej: "M1", "Mesa 5")
- Nombre del mozo (ej: "admin", "Juan")
- Nombre de plato (ej: "Papa", "Tamal")

**Implementación:**
```javascript
const [searchTerm, setSearchTerm] = useState("");

useEffect(() => {
  if (!searchTerm.trim()) {
    setFilteredComandas(todasComandas);
    return;
  }

  const termino = searchTerm.toLowerCase();
  const filtradas = todasComandas.filter(comanda => {
    // Buscar en número de comanda
    const comandaNumber = String(comanda.comandaNumber || '').toLowerCase();
    if (comandaNumber.includes(termino)) return true;

    // Buscar en mesa
    const mesa = String(comanda.mesas?.nummesa || '').toLowerCase();
    if (mesa.includes(termino)) return true;

    // Buscar en mozo
    const mozo = (comanda.mozos?.name || comanda.mozos?.nombre || '').toLowerCase();
    if (mozo.includes(termino)) return true;

    // Buscar en platos
    const platos = comanda.platos?.map(p => {
      const nombre = p.plato?.nombre || p.nombre || '';
      return nombre.toLowerCase();
    }).join(' ') || '';
    if (platos.includes(termino)) return true;

    return false;
  });

  setFilteredComandas(filtradas);
}, [searchTerm, todasComandas]);
```

---

### 11. Paginación

**Objetivo**: Mostrar comandas en páginas para mejor rendimiento.

**Configuración:**
- **Comandas por página**: 5-10 (configurable)
- **Navegación**: Botones `←` y `→` o click en número de página

**Implementación:**
```javascript
const COMANDAS_POR_PAGINA = 5;
const [currentPage, setCurrentPage] = useState(0);

const totalPages = Math.ceil(filteredComandas.length / COMANDAS_POR_PAGINA);
const comandasPagina = filteredComandas.slice(
  currentPage * COMANDAS_POR_PAGINA,
  (currentPage + 1) * COMANDAS_POR_PAGINA
);
```

---

### 11. Modo Oscuro/Claro

**Objetivo**: Adaptar interfaz a preferencias del usuario.

**Características:**
- **Modo Oscuro** (default): Fondo negro/gris oscuro, texto blanco
- **Modo Claro**: Fondo blanco, texto negro
- **Toggle**: Desde modal de configuración

**Variables CSS Dinámicas:**
```javascript
const nightMode = config.nightMode;

const bgMain = nightMode ? 'bg-gray-900' : 'bg-gray-100';
const textMain = nightMode ? 'text-white' : 'text-gray-900';
const bgCard = nightMode ? 'bg-gray-800' : 'bg-white';
const borderCard = nightMode ? 'border-gray-700' : 'border-gray-300';
```

---

### 12. Configuración del Sistema

**Modal de Configuración** (`ConfigModal.jsx`)

**Opciones Configurables:**

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| **Alertas Amarillas** | Number | 15 min | Minutos para alerta amarilla |
| **Alertas Rojas** | Number | 20 min | Minutos para alerta roja |
| **Sonidos** | Boolean | true | Habilitar/deshabilitar sonidos |
| **Auto-Impresión** | Boolean | false | Imprimir automáticamente nuevas comandas |
| **Modo Oscuro** | Boolean | true | Toggle modo oscuro/claro |
| **Tamaño de Fuente** | Number | 15px | Tamaño de texto en tarjetas |
| **Columnas Grid** | Number | 5 | Número de columnas en grid |
| **Filas Grid** | Number | 1 | Número de filas en grid |

**Persistencia:**
- Guarda en `localStorage` del navegador
- Se carga automáticamente al iniciar la app

---

## 🔄 Sistema de Estados y Flujos

### Estados de Comanda

```
enespera → recoger → entregado → pagado
   ↑         ↓
   └─────────┘ (Revertir)
```

**Descripción:**
- **`enespera`**: Comanda recién creada, platos en preparación
- **`recoger`**: Todos los platos listos, esperando que el mozo los recoja
- **`entregado`**: Comanda entregada al mozo, todos los platos marcados como entregados
- **`pagado`**: Comanda pagada (no se muestra en cocina)

### Estados de Plato

```
ingresante → en_espera → recoger → entregado
     ↑          ↓
     └──────────┘ (Revertir)
```

**Descripción:**
- **`ingresante`**: Plato recién agregado a la comanda
- **`en_espera`**: Plato en preparación
- **`recoger`**: Plato listo para que el mozo lo recoja
- **`entregado`**: Plato entregado al mozo

### Flujo de Trabajo Típico

```
1. Mozo crea comanda → Backend emite "nueva-comanda"
   ↓
2. App Cocina recibe evento → Muestra tarjeta nueva
   ↓
3. Cocinero ve comanda → Platos en "EN PREPARACIÓN"
   ↓
4. Cocinero marca platos con checkboxes → Estado local (isChecked: true)
   ↓
5. Cocinero click "Finalizar X Platos" → API calls en batch
   ↓
6. Backend actualiza platos a "recoger" → Socket.io emite "plato-actualizado"
   ↓
7. App Cocina actualiza UI → Platos se mueven a "LISTOS"
   ↓
8. Si todos los platos listos → Cocinero puede "Finalizar Comanda Completa"
   ↓
9. Backend marca comanda "entregado" → Socket.io emite "comanda-actualizada"
   ↓
10. App Cocina oculta tarjeta o la mueve a "Entregado"
```

---

## 🧩 Componentes y Funciones Detalladas

### ComandaStyle.jsx - Componente Principal

**Responsabilidades:**
- Gestión de estado global de comandas
- Renderizado del grid Kanban
- Manejo de eventos Socket.io
- Coordinación de acciones del usuario

**Funciones Principales:**

#### `obtenerComandas()`
**Descripción**: Obtiene todas las comandas activas del backend.

**Endpoint**: `GET /api/comanda/fecha/:fecha`

**Lógica:**
```javascript
const obtenerComandas = useCallback(async () => {
  try {
    const fechaActual = moment().tz("America/Lima").format('YYYY-MM-DD');
    const apiUrl = getApiUrl();
    const response = await axios.get(`${apiUrl}/fecha/${fechaActual}`);
    
    const comandasRecibidas = response.data.comandas || [];
    
    // Validar que todas las comandas tengan platos con nombres
    const comandasValidas = comandasRecibidas.filter(comanda => {
      if (!comanda.platos || comanda.platos.length === 0) return false;
      return comanda.platos.every(plato => {
        const nombre = plato.plato?.nombre || plato.nombre;
        return nombre && nombre.trim().length > 0;
      });
    });
    
    setComandas(comandasValidas);
    setFilteredComandas(comandasValidas);
  } catch (error) {
    console.error('Error al obtener comandas:', error);
  }
}, []);
```

#### `handleNuevaComanda(comanda)`
**Descripción**: Maneja nueva comanda recibida vía Socket.io.

**Efectos:**
- Agrega comanda al estado
- Reproduce sonido (si está habilitado)
- Marca como "nueva" para animación de entrada
- Actualiza contador de comandas pendientes

**Lógica:**
```javascript
const handleNuevaComanda = useCallback((comanda) => {
  // Validar que la comanda tenga platos válidos
  if (!comanda.platos || comanda.platos.length === 0) {
    console.warn('⚠️ Nueva comanda sin platos:', comanda.comandaNumber);
    return;
  }

  // Verificar que todos los platos tengan nombre
  const todosPlatosConNombre = comanda.platos.every(plato => {
    const nombre = plato.plato?.nombre || plato.nombre;
    return nombre && nombre.trim().length > 0;
  });

  if (!todosPlatosConNombre) {
    console.warn('⚠️ Nueva comanda con platos sin nombre. Esperando actualización...');
    return;
  }

  setComandas(prev => {
    // Evitar duplicados
    const existe = prev.some(c => c._id === comanda._id);
    if (existe) return prev;
    
    // Agregar al inicio (más reciente primero)
    return [comanda, ...prev];
  });

  // Marcar como nueva para animación
  newComandasRef.current.add(comanda._id);
  setTimeout(() => {
    newComandasRef.current.delete(comanda._id);
  }, 3000);

  // Reproducir sonido
  if (config.soundEnabled) {
    playNotificationSound();
  }
}, [config.soundEnabled]);
```

#### `handlePlatoActualizado(data)`
**Descripción**: Actualiza un plato específico sin refiltrar todas las comandas (actualización granular).

**Parámetros:**
- `data.comandaId`: ID de la comanda
- `data.platoId`: ID del plato
- `data.nuevoEstado`: Nuevo estado del plato
- `data.timestamp`: Timestamp del cambio

**Lógica:**
```javascript
const handlePlatoActualizado = useCallback((data) => {
  setComandas(prev => {
    const nuevasComandas = [...prev];
    const comandaIndex = nuevasComandas.findIndex(c => c._id === data.comandaId);
    
    if (comandaIndex === -1) return prev;

    const comanda = nuevasComandas[comandaIndex];
    const platoIndex = comanda.platos.findIndex(p => {
      const pId = p.platoId?.toString() || p._id?.toString();
      return pId === data.platoId?.toString();
    });

    if (platoIndex === -1) return prev;

    // Actualizar solo el plato específico
    const platoActualizado = { ...comanda.platos[platoIndex] };
    platoActualizado.estado = data.nuevoEstado;
    platoActualizado.tiempos = platoActualizado.tiempos || {};
    platoActualizado.tiempos[data.nuevoEstado] = data.timestamp || new Date();

    const nuevosPlatos = [...comanda.platos];
    nuevosPlatos[platoIndex] = platoActualizado;
    
    const nuevaComanda = { ...comanda, platos: nuevosPlatos };
    nuevasComandas[comandaIndex] = nuevaComanda;

    // Limpiar checkbox del plato actualizado
    setPlatosChecked(prev => {
      const nuevo = new Map(prev);
      const comandaChecks = nuevo.get(data.comandaId);
      if (comandaChecks) {
        const nuevoComandaChecks = new Map(comandaChecks);
        nuevoComandaChecks.delete(data.platoId);
        nuevo.set(data.comandaId, nuevoComandaChecks);
      }
      return nuevo;
    });

    return nuevasComandas;
  });
}, [];
```

---

### PlatoPreparacion.jsx - Componente de Plato Individual

**Ubicación:** [`appcocina/src/components/Principal/PlatoPreparacion.jsx`](appcocina/src/components/Principal/PlatoPreparacion.jsx)

**Descripción:** Componente aislado para renderizar un plato en la sección "EN PREPARACIÓN". Maneja su propio estado visual y animaciones Framer Motion.

**Props:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `plato` | Object | Objeto del plato completo |
| `comandaId` | String | ID de la comanda padre |
| `platoId` | String | ID del plato |
| `platoIndex` | Number | **Importante** Índice del plato en el array (usado para anulación) |
| `cantidad` | Number | Cantidad del plato |
| `nombre` | String | Nombre del plato |
| `estadoVisual` | String | Estado visual: `'normal'` \| `'procesando'` \| `'seleccionado'` |
| `nightMode` | Boolean | Modo oscuro activo |
| `isEliminado` | Boolean | Si el plato fue eliminado por mozo |
| `onToggle` | Function | Callback al hacer click `(comandaId, platoIndex)` |
| `complementosSeleccionados` | Array | Complementos seleccionados |

**Estados Visuales y Animaciones:**

| Estado | Animación | Color de Fondo |
|--------|-----------|----------------|
| `normal` | Sin animación | Transparente |
| `procesando` | Pulse amarillo con sombra | `bg-yellow-400/30` |
| `seleccionado` | Pulse verde con sombra | `bg-green-500/30` |
| `eliminado` | Sin animación, opacidad reducida | `bg-red-500/15` |

**Uso de platoIndex:**
```javascript
// 🔥 CORREGIDO: Ahora usa platoIndex en lugar de platoId para el endpoint de anulación
const handleClick = (e) => {
  e.stopPropagation();
  if (!isEliminado && onToggle && platoIndex !== undefined) {
    onToggle(comandaId, platoIndex); // Pasar índice, no ID
  }
};
```

**Animaciones Framer Motion:**
```javascript
const containerVariants = {
  normal: { scale: 1, opacity: 1 },
  procesando: {
    scale: [1, 1.015, 1],
    opacity: [1, 0.95, 1],
    boxShadow: ['0 0 8px rgba(251, 191, 36, 0.3)', '0 0 16px rgba(251, 191, 36, 0.5)'],
    transition: { duration: 1.8, repeat: Infinity }
  },
  seleccionado: {
    boxShadow: ['0 0 12px rgba(34, 197, 94, 0.4)', '0 0 20px rgba(34, 197, 94, 0.6)'],
    transition: { duration: 2.2, repeat: Infinity }
  }
};
```

---

### AnotacionesModal.jsx - Modal de Anotaciones

**Ubicación:** [`appcocina/src/components/Principal/AnotacionesModal.jsx`](appcocina/src/components/Principal/AnotacionesModal.jsx)

**Descripción:** Modal para agregar/editar observaciones y anotaciones especiales en una comanda.

**Props:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `comanda` | Object | Objeto de la comanda completa |
| `onClose` | Function | Callback para cerrar el modal |

**Funcionalidades:**
- Textarea para escribir observaciones
- Guardado vía API: `PUT /api/comanda/:id`
- Manejo de errores con alertas
- UI en modo oscuro

**Ejemplo de Uso:**
```jsx
<AnotacionesModal
  comanda={comandaSeleccionada}
  onClose={() => setAnotacionesModalVisible(false)}
/>
```

**Endpoint Utilizado:**
```javascript
await axios.put(`${getApiUrl()}/${comanda._id}`, {
  ...comanda,
  observaciones: anotaciones
});
```

---

## 🔌 Integración con Backend

### Endpoints de Autenticación

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| `POST` | `/api/admin/cocina/auth` | Login para App Cocina (solo DNI) |
| `POST` | `/api/admin/auth` | Login para Dashboard Admin |
| `POST` | `/api/admin/mozos/auth` | Login para App Mozos |

### Endpoints de Comandas

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| `GET` | `/api/comanda/fecha/:fecha` | Obtener comandas del día |
| `GET` | `/api/comanda/cocina/:fecha` | Endpoint optimizado para cocina (incluye solo comandas activas) |
| `PUT` | `/api/comanda/:id/plato/:platoId/estado` | Cambiar estado de plato |
| `PUT` | `/api/comanda/:id/plato/:platoIndex/anular` | **NUEVO** Anular plato por índice (cocina) |
| `PUT` | `/api/comanda/:id/status` | Cambiar estado de comanda completa |
| `PUT` | `/api/comanda/:id/prioridad` | Establecer prioridad alta (body: `{ prioridadOrden: number }`); emite `comanda-actualizada` |
| `PUT` | `/api/comanda/:id/revertir` | Revertir comanda a estado anterior |
| `PUT` | `/api/comanda/:id` | Actualizar comanda (usado para anotaciones/observaciones) |

### Formato de Datos

**Comanda:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "comandaNumber": 313,
  "mesas": {
    "nummesa": 1
  },
  "mozos": {
    "name": "admin",
    "mozoId": 1
  },
  "platos": [
    {
      "platoId": "507f1f77bcf86cd799439012",
      "plato": {
        "nombre": "Papa a la huancaína",
        "_id": "507f1f77bcf86cd799439012"
      },
      "estado": "en_espera",
      "cantidad": 1,
      "tiempos": {
        "en_espera": "2026-02-14T13:00:00.000Z"
      }
    }
  ],
  "status": "enespera",
  "createdAt": "2026-02-14T13:00:00.000Z",
  "prioridadOrden": 0,
  "historialPlatos": []
}
```

---

### Configuración de API (apiConfig.js)

**Prioridad de Configuración de URL:**

El archivo [`apiConfig.js`](appcocina/src/config/apiConfig.js) implementa un sistema de prioridad para determinar la URL del backend:

```
1. localStorage ('kdsConfig.apiUrl')  → Máxima prioridad (configurado por usuario)
2. process.env.REACT_APP_IP          → Variable de entorno centralizada
3. process.env.REACT_APP_API_COMANDA → Variable de entorno específica
4. DEFAULT_API_URL                   → 'http://localhost:3000/api/comanda'
```

**Funciones Principales:**

| Función | Propósito |
|---------|-----------|
| `getApiUrl()` | Obtiene URL completa del API (`/api/comanda`) |
| `getServerBaseUrl()` | Obtiene URL base para Socket.io (sin `/api/comanda`) |
| `setApiUrl(url)` | Guarda URL en localStorage |
| `isConfigured()` | Verifica si hay configuración guardada |

**Ejemplo de Uso:**
```javascript
import { getApiUrl, getServerBaseUrl } from '../config/apiConfig';

// Para peticiones HTTP
const apiUrl = getApiUrl(); // http://192.168.1.100:3000/api/comanda

// Para Socket.io
const socketUrl = getServerBaseUrl(); // http://192.168.1.100:3000
```

---

## 📊 Flujos de Trabajo Completos

### Flujo 1: Nueva Comanda Entrante

```
┌─────────────┐
│ Mozo crea   │
│ comanda     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Backend procesa │
│ y emite evento  │
└──────┬──────────┘
       │
       ▼
┌──────────────────────┐
│ Socket.io:           │
│ "nueva-comanda"      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ App Cocina recibe    │
│ handleNuevaComanda() │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Valida platos        │
│ (todos con nombre)   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Agrega a estado      │
│ Reproduce sonido     │
│ Animación entrada    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Muestra tarjeta      │
│ en grid Kanban       │
└──────────────────────┘
```

### Flujo 2: Finalizar Platos Individuales

```
┌──────────────────────┐
│ Cocinero marca       │
│ checkboxes de platos │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Estado local:         │
│ isChecked: true       │
│ (fondo verde)       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Click "Finalizar     │
│ X Platos"            │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Validación:          │
│ ¿Hay platos marcados?│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ API Calls en paralelo│
│ Promise.allSettled() │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Backend actualiza    │
│ estados a "recoger"  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Socket.io emite      │
│ "plato-actualizado"  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Frontend recibe      │
│ handlePlatoActualizado│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Actualiza UI:        │
│ - Platos a "LISTOS"  │
│ - Limpia checkboxes  │
│ - Actualiza contador │
└──────────────────────┘
```

### Flujo 3: Finalizar Comanda Completa

```
┌──────────────────────┐
│ Cocinero selecciona  │
│ comanda(s)           │
│ (click en header)    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Checkmark grande ✓   │
│ aparece en tarjeta   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Botón "Finalizar     │
│ Comanda" se habilita │
│ (si todos listos)    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Click en botón        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Validación:          │
│ ¿Todos platos listos?│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Modal confirmación:  │
│ "¿Finalizar Orden    │
│ #313?"               │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Usuario confirma     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ API Call:            │
│ PUT /status          │
│ { nuevoStatus:       │
│   "entregado" }      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Backend:              │
│ - Status → "entregado"│
│ - Todos platos →     │
│   "entregado"        │
│ - Recalcula mesa     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Socket.io emite      │
│ "comanda-actualizada"│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Frontend:            │
│ - Oculta tarjeta     │
│ - Limpia selección   │
│ - Toast de éxito     │
└──────────────────────┘
```

---

## 🎯 Casos de Uso y Escenarios

### Escenario 1: Comanda Simple (1 Plato)

**Situación**: Mozo crea comanda con 1 plato.

**Flujo:**
1. Comanda aparece en grid
2. Plato en "EN PREPARACIÓN"
3. Cocinero marca checkbox
4. Click "Finalizar 1 Plato"
5. Plato se mueve a "LISTOS"
6. Como solo hay 1 plato, automáticamente se habilita "Finalizar Comanda"
7. Cocinero finaliza comanda completa
8. Tarjeta desaparece (comanda entregada)

---

### Escenario 2: Comanda Múltiple (Varios Platos)

**Situación**: Comanda con 5 platos, algunos se terminan antes que otros.

**Flujo:**
1. Comanda aparece con 5 platos en "EN PREPARACIÓN"
2. Cocinero termina 2 platos → Los marca con checkboxes
3. Click "Finalizar 2 Platos" → Esos 2 se mueven a "LISTOS"
4. Comanda sigue visible (aún hay 3 en preparación)
5. Cocinero termina otros 2 → Los marca
6. Click "Finalizar 2 Platos" → Ahora hay 4 en "LISTOS"
7. Último plato se termina → Se marca
8. Click "Finalizar 1 Plato" → Todos en "LISTOS"
9. Botón "Finalizar Comanda" se habilita
10. Cocinero finaliza comanda completa

---

### Escenario 3: Múltiples Comandas Simultáneas

**Situación**: Hay 3 comandas activas, cocinero quiere finalizar 2 juntas.

**Flujo:**
1. Cocinero selecciona Comanda #313 (click en header)
2. Selecciona Comanda #314 (click en header)
3. Ambas muestran checkmark grande ✓
4. Verifica que ambas tienen todos los platos listos
5. Botón muestra "Finalizar 2 Comandas ✓"
6. Click en botón → Modal: "¿Finalizar 2 comandas (#313, #314)?"
7. Confirma → Ambas comandas se finalizan en batch
8. Ambas tarjetas desaparecen

---

### Escenario 4: Comanda Urgente (Tiempo Excedido)

**Situación**: Comanda lleva más de 20 minutos.

**Flujo:**
1. Header de tarjeta cambia a **rojo** (`bg-red-700`)
2. Cronómetro muestra tiempo en rojo (ej: `00:25:43`)
3. Cocinero prioriza esta comanda
4. Finaliza platos rápidamente
5. Comanda se completa y desaparece

---

### Escenario 5: Error de Conexión

**Situación**: Se pierde conexión Socket.io.

**Flujo:**
1. Indicador en header cambia a 🔴 "Desconectado"
2. App intenta reconectar automáticamente
3. Si reconexión > 30s, muestra warning en consola
4. Al reconectar, se re-une a room y refresca comandas
5. Indicador vuelve a 🟢 "Realtime"

---

## 🎨 Detalles de Interfaz

### Colores y Temas

**Modo Oscuro (Default):**
- Fondo principal: `bg-gray-900` (#111827)
- Fondo tarjetas: `bg-gray-800` (#1F2937)
- Texto principal: `text-white` (#FFFFFF)
- Bordes: `border-gray-700` (#374151)

**Modo Claro:**
- Fondo principal: `bg-gray-100` (#F3F4F6)
- Fondo tarjetas: `bg-white` (#FFFFFF)
- Texto principal: `text-gray-900` (#111827)
- Bordes: `border-gray-300` (#D1D5DB)

**Colores de Estado:**
- Verde (Listo): `bg-green-500` (#22C55E)
- Amarillo (Alerta): `bg-yellow-600` (#CA8A04)
- Rojo (Urgente): `bg-red-700` (#B91C1C)
- Azul (Seleccionado): `border-blue-500` (#3B82F6)

### Animaciones

**Entrada de Tarjeta:**
```javascript
initial={{ opacity: 0, scale: 0.8, y: 100 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
transition={{ type: "spring", stiffness: 300, damping: 24 }}
```

**Salida de Tarjeta:**
```javascript
exit={{ opacity: 0, scale: 0.8, y: -50 }}
```

**Checkmark Grande:**
```javascript
initial={{ scale: 0, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{ type: "spring", stiffness: 500, damping: 15 }}
```

**Checkbox Check:**
```javascript
className="animate-scale-in" // CSS keyframe animation
```

---

## 📝 Resumen de Funcionalidades

### ✅ Implementado

#### Sistema de Autenticación y Navegación (v6.0)
- [x] **Login con DNI**: Pantalla de autenticación específica para cocina
- [x] **Menú Principal**: Navegación centralizada antes del tablero KDS
- [x] **Protección de Rutas**: Control de acceso con AuthContext y ProtectedRoute
- [x] **Persistencia de Sesión**: Token JWT 8h en localStorage con restauración automática
- [x] **Botón "Regresar"**: Volver al menú sin cerrar sesión
- [x] **Cerrar Sesión**: Limpieza completa de sesión con confirmación
- [x] **Validación de Rol**: Solo usuarios con rol `cocinero` o `admin` pueden acceder

#### Funcionalidades del Tablero KDS
- [x] Sistema de checkboxes por plato individual
- [x] Barra inferior sticky con botones de acción
- [x] Selección múltiple de comandas
- [x] Finalización batch de platos
- [x] Finalización de comanda completa
- [x] Alertas visuales por tiempo (verde/amarillo/rojo)
- [x] Cronómetro HH:MM:SS en tiempo real
- [x] Agrupación de platos por estado (Preparación/Preparados)
- [x] Comunicación en tiempo real vía Socket.io
- [x] Búsqueda y filtrado de comandas
- [x] Paginación de comandas
- [x] Modo oscuro/claro
- [x] Configuración personalizable
- [x] Reportes y estadísticas
- [x] Revertir estados de comandas
- [x] Animaciones suaves con Framer Motion
- [x] Sonidos de notificación
- [x] Indicador de conexión Socket.io
- [x] Pantalla completa (fullscreen)
- [x] **Audit Trail Visual**: Platos eliminados con información del mozo
- [x] **Badges en Header**: Contadores inline (Prep X/Total, Listos Y, Elim Z)
- [x] **Zonas Click Precisas**: Header y barras seleccionan, platos Preparación solo togglean
- [x] **StopPropagation Mejorado**: Prevención de bubbling en clicks de platos
- [x] **Componente PlatoPreparacion**: Plato individual aislado con animaciones Framer Motion
- [x] **Modal Anotaciones**: Editor de observaciones para comandas
- [x] **Socket.io Room por Fecha**: Unión a room `fecha-{YYYY-MM-DD}` para eventos específicos
- [x] **Eventos Socket.io Extendidos**: plato-entregado, plato-cancelado-urgente, plato-anulado, comanda-anulada
- [x] **Anulación de Platos por Índice**: Endpoint `/plato/:platoIndex/anular` con platoIndex
- [x] **ConnectionStatus State**: Estado de conexión ('conectado'/'desconectado') además de boolean
- [x] **Polling Fallback**: HTTP cada 30s si Socket.io desconectado
- [x] **Prioridad Alta**: Botón para priorizar comanda (VIP/cliente especial)

### 🔄 Mejoras Futuras Sugeridas

#### Funcionalidades del Menú (Preparadas pero no implementadas)
- [ ] **Reportes del Día**: Estadísticas y resumen de actividad
- [ ] **Historial**: Ver comandas de días anteriores
- [ ] **Estadísticas de Tiempos**: Análisis de tiempos de preparación por plato
- [ ] **Gráficos de Rendimiento**: Métricas visuales de cocina

#### Funcionalidades Generales
- [ ] Impresión automática de comandas nuevas
- [ ] Notificaciones push del navegador
- [ ] Historial de cambios de estado
- [ ] Filtros avanzados (por mozo, mesa, rango de tiempo)
- [ ] Exportación de reportes a PDF/Excel
- [ ] Modo de vista compacta/expandida
- [ ] Atajos de teclado para acciones rápidas
- [ ] Soporte para múltiples pantallas (multi-monitor)
- [ ] Integración con sistemas de impresión de cocina

---

## 🔧 Configuración y Personalización

### Variables de Configuración

Todas las configuraciones se guardan en `localStorage` y se cargan automáticamente:

```javascript
const config = {
  alertYellowMinutes: 15,      // Minutos para alerta amarilla
  alertRedMinutes: 20,          // Minutos para alerta roja
  soundEnabled: true,           // Sonidos habilitados
  autoPrint: false,             // Auto-impresión
  nightMode: true,              // Modo oscuro
  design: {
    fontSize: 15,               // Tamaño de fuente (px)
    cols: 5,                    // Columnas en grid
    rows: 1                     // Filas en grid
  }
};
```

### Personalización de Colores

Los colores se pueden modificar en el código cambiando las clases Tailwind CSS:

```javascript
// Header según tiempo
const bgColor = minutosActuales >= alertRedMinutes
  ? "bg-red-700"      // Rojo (> 20 min)
  : minutosActuales >= alertYellowMinutes
    ? "bg-yellow-600"  // Amarillo (15-20 min)
    : "bg-gray-500";   // Gris (< 15 min)
```

---

## 📚 Referencias y Recursos

### Documentación Técnica

- **React**: https://react.dev/
- **Socket.io Client**: https://socket.io/docs/v4/client-api/
- **Framer Motion**: https://www.framer.com/motion/
- **Moment.js**: https://momentjs.com/docs/

### Archivos Clave del Proyecto

- `appcocina/src/components/Principal/ComandaStyle.jsx` - Componente principal
- `appcocina/src/hooks/useSocketCocina.js` - Hook Socket.io
- `appcocina/src/config/apiConfig.js` - Configuración de API
- `Backend-LasGambusinas/routes/comanda.routes.js` - Endpoints backend

---

## 🎓 Conclusión

El **App de Cocina** es un sistema completo y profesional para gestión de comandas en tiempo real. Combina:

- ✅ **Interfaz intuitiva** inspirada en KDS profesionales
- ✅ **Tiempo real** con Socket.io
- ✅ **Control granular** por plato individual
- ✅ **Multi-selección** para eficiencia
- ✅ **Alertas visuales** para priorización
- ✅ **Animaciones suaves** para mejor UX

El sistema está diseñado para ser **escalable**, **confiable** y **fácil de usar** por cocineros en un ambiente de trabajo rápido y dinámico.

---

## ⚠️ Errores de lógica conocidos y limitaciones actuales

Aunque la aplicación está en producción y es estable, existen algunas decisiones de lógica y limitaciones que es importante tener en cuenta:

### 1. Filtrado estricto de comandas y platos

- En `ComandaStyle` se **filtran**:
  - Comandas con `IsActive === false` o marcadas como eliminadas.
  - Comandas sin platos.
  - Comandas cuyos platos no tienen nombre cargado correctamente.
- **Efecto práctico**:
  - Si el backend envía una comanda “incompleta” (platos aún sin nombre o datos desnormalizados), **esa comanda no se muestra en cocina** hasta que los datos estén completos.
  - Esto puede generar la sensación de que “falta una comanda” cuando en realidad está siendo filtrada por validación.
- Recomendación operativa:
  - Revisar que el backend siempre envíe platos con nombre y que no se creen comandas vacías.

### 2. Tiempo y alertas basadas en la comanda, no por plato

- El color del header (verde/amarillo/rojo) y el cronómetro se calculan a partir de `createdAt` de la **comanda completa**.
- **Limitación**:
  - En comandas con platos de muy distinta complejidad, la alerta de tiempo refleja el **tiempo total de la orden**, no el tiempo real de cada plato.
  - Esto significa que un plato que recién se agregó puede aparecer en una tarjeta ya “roja” si la comanda original es antigua.
- A nivel de operación, se asume que esta aproximación es suficiente para cocinas tipo fast‑food, pero no es un control fino por plato.

### 3. Persistencia local de estados de platos

- Los estados visuales de platos (`platoStates` y `platosChecked`) se guardan en `localStorage` para mantener:
  - Cuáles platos se marcaron como procesando/seleccionados.
  - Checkboxes activos entre renders y refrescos.
- **Posibles efectos**:
  - Si cambian estructuras de comandas/platos en backend (IDs reutilizados, cambios de día sin limpiar storage), pueden quedar **estados “fantasma”** de platos antiguos.
  - No hay una limpieza automática por fecha; la limpieza depende de cambios de datos y de la propia lógica de actualización.

### 4. Dependencia fuerte del endpoint de cocina por fecha

- `obtenerComandas()` usa un endpoint optimizado `/cocina/:fecha` con fecha en zona horaria `America/Lima`.
- **Riesgos**:
  - Si el servidor no está sincronizado en hora o hay diferencias de timezone, comandas cercanas al cambio de día pueden:
    - No entrar en el rango esperado.
    - Aparecer en el día anterior/siguiente según cómo el backend interprete la fecha.

### 5. Nombres de platos eliminados obtenidos de múltiples fuentes

- Para platos eliminados se intenta reconstruir el nombre desde:
  - `historialPlatos.nombreOriginal`.
  - El objeto `plato` si viene populado.
  - Un fetch adicional a `/api/platos/:id` cuando falta el nombre.
- **Limitación**:
  - Si ninguna de estas fuentes responde correctamente, la UI puede mostrar textos genéricos tipo `Plato #id` de forma temporal o permanente.
  - Esto no afecta la lógica de estados, pero puede ser confuso para el usuario de cocina.

---

**Versión del Documento:** 1.3  
**Última Actualización:** Marzo 2026  
**Autor:** Sistema Las Gambusinas

---

## 📋 Historial de Cambios

### v1.5 (Marzo 2026) - v7.1 de la App
- **Sistema Multi-Cocinero**: Funcionalidades para colaboración entre cocineros
- **Eventos de Configuración**: Rooms personales, emisión dirigida, validación frontend
- **Testing de Vistas**: Framework de tests unitarios e integración definido
- **Hook useComandastyleCore**: Lógica compartida extraída para reutilización
- **Sistema de Procesamiento**: Modelo extendido con procesandoPor/procesadoPor
- **UI de Procesamiento**: Componentes con badges animados de cocinero
- **Endpoints nuevos**: PUT/DELETE para procesamiento de platos
- **Eventos Socket.io nuevos**: plato-procesando, plato-liberado, conflicto-procesamiento

### v1.3 (Marzo 2026) - v6.0 de la App
- **Sistema de Autenticación**: Login con DNI para App de Cocina
- **Menú Principal**: Navegación centralizada antes del tablero KDS
- **Protección de Rutas**: AuthContext y ProtectedRoute
- **Botón "Regresar"**: En header para volver al menú
- **Nuevos componentes**: LoginPage.jsx, MenuPage.jsx, ProtectedRoute.jsx
- **Endpoint de autenticación**: Documentado `/api/admin/cocina/auth`
- **Persistencia de sesión**: Token JWT 8h en localStorage

### v1.2 (Marzo 2026)
- **Nuevos componentes documentados**: PlatoPreparacion.jsx, AnotacionesModal.jsx
- **Eventos Socket.io expandidos**: plato-entregado, plato-cancelado-urgente, plato-anulado, comanda-anulada
- **API Configuration**: Documentada prioridad de configuración (localStorage > REACT_APP_IP > localhost)
- **Room por fecha**: Documentado mecanismo de rooms Socket.io para eventos del día
- **Endpoint de anulación**: Agregado `/api/comanda/:id/plato/:platoIndex/anular`
- **ConnectionStatus state**: Nuevo estado de conexión textual además del boolean
- **Polling fallback**: Mecanismo de respaldo HTTP cuando Socket.io está desconectado

### v1.1 (Marzo 2026)
- Documentación inicial completa
- Sistema de checkboxes y multi-selección
- Alertas visuales por tiempo
- Flujos de trabajo documentados

---

## 🚀 Sección de Sugerencias y Recomendaciones (v7.0)

Esta sección contiene propuestas de mejora y funcionalidades recomendadas para escalar el App de Cocina a un entorno de alta demanda con múltiples cocineros procesando más de 50 comandas simultáneamente.

---

### 💡 Sugerencias para el Modal de Configuración (ConfigModal.jsx)

El modal de configuración actual es funcional pero puede mejorarse significativamente para adaptarse a diferentes perfiles de cocina y flujos de trabajo.

#### 1. Propuestas de Nuevas Opciones de Configuración

##### 1.1 Configuración de Vista

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| **Modo de Vista** | Select | `tarjetas` | Cambiar entre vista de tarjetas (Kanban) y vista de tabla compacta |
| **Tamaño de Tarjeta** | Select | `mediano` | Tamaño de tarjetas: `compacto`, `mediano`, `expandido` |
| **Mostrar Imágenes** | Boolean | `false` | Mostrar imágenes de platos en las tarjetas (si disponibles) |
| **Agrupar por Mesa** | Boolean | `false` | Agrupar comandas de la misma mesa en una sola tarjeta |
| **Ordenamiento Default** | Select | `tiempo` | Criterio de orden: `tiempo`, `mesa`, `prioridad`, `creación` |

##### 1.2 Configuración de Tiempos y Alertas

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| **Alerta Sonora Crítica** | Number | 25 min | Minutos para alerta sonora adicional (más urgente) |
| **Vibración en Móvil** | Boolean | `true` | Vibración en dispositivos móviles para alertas |
| **Sonido Personalizado** | File | default | Permitir subir sonido personalizado para nuevas comandas |
| **Repetir Sonido** | Boolean | `true` | Repetir sonido cada X segundos si no se atiende |

##### 1.3 Configuración de Multi-Cocinero

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| **Mostrar Cocinero Asignado** | Boolean | `true` | Mostrar qué cocinero está procesando cada plato/comanda |
| **Notificar Asignaciones** | Boolean | `true` | Notificar cuando otro cocinero tome una comanda |
| **Modo Colaborativo** | Boolean | `true` | Permitir que múltiples cocineros trabajen en la misma comanda |
| **Bloqueo Automático** | Boolean | `false` | Bloquear comandas mientras un cocinero las procesa |

##### 1.4 Configuración de Rendimiento

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| **Animaciones** | Boolean | `true` | Habilitar/deshabilitar animaciones para mejor rendimiento |
| **Caché de Datos** | Boolean | `true` | Mantener caché local de comandas para carga rápida |
| **Actualización en Segundo Plano** | Boolean | `true` | Actualizar datos cuando la app está en segundo plano |
| **Limite de Comandas en Memoria** | Number | 100 | Máximo de comandas a mantener en memoria |

#### 2. Mejoras de UI/UX Sugeridas para ConfigModal

```jsx
// Estructura sugerida para el modal con tabs
<Tabs defaultActiveKey="general">
  <TabPane tab="General" key="general">
    {/* Configuración general: tema, sonido, etc. */}
  </TabPane>
  <TabPane tab="Vista" key="vista">
    {/* Configuración de vista: tarjetas, tabla, columnas */}
  </TabPane>
  <TabPane tab="Alertas" key="alertas">
    {/* Configuración de tiempos y alertas */}
  </TabPane>
  <TabPane tab="Colaboración" key="colaboracion">
    {/* Configuración de multi-cocinero */}
  </TabPane>
  <TabPane tab="Avanzado" key="avanzado">
    {/* Configuración de rendimiento y debug */}
  </TabPane>
</Tabs>
```

#### 3. Perfiles de Configuración Predefinidos

Se recomienda implementar perfiles que los usuarios puedan seleccionar rápidamente:

| Perfil | Descripción | Configuraciones Clave |
|--------|-------------|----------------------|
| **Restaurante Pequeño** | Pocas comandas, una pantalla | Animaciones ON, Sonidos ON, Vista tarjetas expandida |
| **Comida Rápida** | Alto volumen, muchas pantallas | Animaciones OFF, Vista tabla, Alertas cada 10 min |
| **Fine Dining** | Pocas comandas, máximo detalle | Animaciones ON, Imágenes ON, Tiempos extendidos |
| **Multi-Cocinero** | Varios cocineros trabajando | Modo colaborativo ON, Bloqueo ON, Notificaciones ON |

---

### 🔄 Sistema de Dos Estilos de Vista: Tarjetas vs Tabla

#### Propuesta de Implementación

El sistema actual utiliza exclusivamente una vista de tarjetas estilo Kanban. Para manejar eficientemente más de 50 comandas simultáneas, se propone implementar un segundo modo de vista: **Vista de Tabla Compacta**.

#### 1. Vista de Tarjetas (Actual - Kanban)

**Ideal para:** Menos de 30 comandas activas

**Ventajas:**
- Visualización clara del estado de cada comanda
- Fácil identificación de tiempos y prioridades
- Animaciones suaves para mejor UX
- Información completa visible de un vistazo

**Desventajas con +50 comandas:**
- Requiere mucho scroll horizontal/vertical
- Difícil ver el panorama general
- Paginación excesiva
- Consumo de memoria elevado

#### 2. Vista de Tabla Compacta (Propuesta)

**Ideal para:** Más de 30 comandas activas, ambientes de alta demanda

**Ventajas:**
- Muestra 20-30 comandas por pantalla sin scroll
- Fácil comparación entre comandas
- Ordenamiento y filtrado rápido por columnas
- Menor consumo de recursos

**Desventajas:**
- Menos información visual por comanda
- Requiere clicks adicionales para ver detalles
- Menos intuitivo para nuevos usuarios

#### 3. Especificación Técnica de Vista Tabla

```jsx
// Estructura de columnas sugerida
const COLUMNAS_TABLA = [
  { key: 'prioridad', label: '🚀', width: 40, sortable: true },
  { key: 'orden', label: 'Orden', width: 70, sortable: true },
  { key: 'mesa', label: 'Mesa', width: 60, sortable: true },
  { key: 'tiempo', label: 'Tiempo', width: 80, sortable: true, 
    render: (tiempo) => <TimerBadge tiempo={tiempo} /> },
  { key: 'platosPendientes', label: 'Pend.', width: 50, sortable: true },
  { key: 'platosListos', label: 'Listos', width: 50, sortable: true },
  { key: 'mozo', label: 'Mozo', width: 80 },
  { key: 'cocineroAsignado', label: 'Asignado', width: 100 },
  { key: 'acciones', label: 'Acciones', width: 150, fixed: true }
];

// Ejemplo de renderizado de fila
<Table.Row 
  className={getRowClass(comanda)}
  onClick={() => toggleSelect(comanda._id)}
>
  <Table.Cell>{comanda.prioridadOrden > 0 && '🚀'}</Table.Cell>
  <Table.Cell>#{comanda.comandaNumber}</Table.Cell>
  <Table.Cell>M{comanda.mesas?.nummesa}</Table.Cell>
  <Table.Cell>
    <span className={getTimerColor(comanda)}>
      {formatTime(comanda.createdAt)}
    </span>
  </Table.Cell>
  <Table.Cell>{countPendientes(comanda)}</Table.Cell>
  <Table.Cell>{countListos(comanda)}</Table.Cell>
  <Table.Cell>{comanda.mozos?.name}</Table.Cell>
  <Table.Cell>
    <CocineroBadge cocinero={comanda.cocineroAsignado} />
  </Table.Cell>
  <Table.Cell>
    <ButtonGroup>
      <Button onClick={(e) => { e.stopPropagation(); verDetalle(comanda); }}>
        Ver
      </Button>
      <Button onClick={(e) => { e.stopPropagation(); finalizar(comanda); }}>
        ✓
      </Button>
    </ButtonGroup>
  </Table.Cell>
</Table.Row>
```

#### 4. Toggle Entre Vistas

```jsx
// Componente de toggle en toolbar
<ViewToggle>
  <ToggleButton 
    active={viewMode === 'tarjetas'} 
    onClick={() => setViewMode('tarjetas')}
  >
    📋 Tarjetas
  </ToggleButton>
  <ToggleButton 
    active={viewMode === 'tabla'} 
    onClick={() => setViewMode('tabla')}
  >
    📊 Tabla
  </ToggleButton>
</ViewToggle>

// Persistencia de preferencia
useEffect(() => {
  localStorage.setItem('cocinaViewMode', viewMode);
}, [viewMode]);
```

#### 5. Detalle Expandido en Vista Tabla

Al hacer click en una fila de la tabla, se expande un panel con el detalle de la comanda:

```jsx
// Panel de detalle expandible
<ExpandableRow open={expandedComanda === comanda._id}>
  <div className="expanded-content">
    <div className="platos-grid">
      {comanda.platos.map(plato => (
        <PlatoCard 
          key={plato._id}
          plato={plato}
          onToggle={() => togglePlato(comanda._id, plato._id)}
          procesadoPor={plato.procesadoPor}
        />
      ))}
    </div>
    <div className="actions">
      <Button onClick={() => finalizarPlatos(comanda._id)}>
        Finalizar Marcados
      </Button>
    </div>
  </div>
</ExpandableRow>
```

#### 6. Consideraciones de Rendimiento

```javascript
// Virtualización para tablas con muchas filas
import { FixedSizeList } from 'react-window';

const VirtualizedTable = ({ comandas }) => (
  <FixedSizeList
    height={600}
    itemCount={comandas.length}
    itemSize={60}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <ComandaRow comanda={comandas[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

---

### 👨‍🍳 Sistema de Procesamiento con Identificación de Cocinero

#### Funcionalidad Propuesta

Permitir que cada plato y comanda muestre qué cocinero está procesándolo, mejorando la coordinación en equipos de cocina grandes.

#### 1. Modelo de Datos Extendido

```javascript
// Extensión del modelo de plato en comanda
{
  platoId: "507f1f77bcf86cd799439012",
  plato: { nombre: "Papa a la huancaína", _id: "..." },
  estado: "en_espera",
  cantidad: 1,
  
  // NUEVOS CAMPOS
  procesandoPor: {
    cocineroId: "usr_123",
    nombre: "Juan Pérez",
    alias: "JuanCocina",
    timestamp: "2026-03-19T14:30:00Z"
  },
  procesadoPor: { // Cuando el plato está listo
    cocineroId: "usr_123",
    nombre: "Juan Pérez",
    timestamp: "2026-03-19T14:45:00Z"
  }
}

// Extensión del modelo de comanda
{
  _id: "...",
  comandaNumber: 331,
  status: "enespera",
  
  // NUEVOS CAMPOS
  procesandoPor: {
    cocineroId: "usr_123",
    nombre: "Juan Pérez",
    desde: "2026-03-19T14:30:00Z"
  },
  completadoPor: {
    cocineroId: "usr_123",
    nombre: "Juan Pérez",
    timestamp: "2026-03-19T14:50:00Z"
  }
}
```

#### 2. Endpoints Necesarios

```javascript
// Marcar plato como "en proceso" por un cocinero
PUT /api/comanda/:comandaId/plato/:platoId/procesando
Body: {
  cocineroId: "usr_123",
  nombre: "Juan Pérez"
}

// Marcar comanda completa como "en proceso"
PUT /api/comanda/:comandaId/procesando
Body: {
  cocineroId: "usr_123",
  nombre: "Juan Pérez"
}

// Liberar plato/comanda (cuando otro cocinero lo toma)
DELETE /api/comanda/:comandaId/plato/:platoId/procesando
```

#### 3. Eventos Socket.io

```javascript
// Nuevos eventos a implementar
socket.on('plato-procesando', (data) => {
  // data: { comandaId, platoId, cocinero }
  // Actualizar UI para mostrar "Juan está preparando este plato"
});

socket.on('plato-liberado', (data) => {
  // data: { comandaId, platoId }
  // Otro cocinero liberó el plato, actualizar UI
});

socket.on('comanda-procesando', (data) => {
  // data: { comandaId, cocinero }
  // La comanda completa está siendo procesada por un cocinero
});
```

#### 4. UI para Indicar Procesamiento

##### En Vista de Tarjetas

```jsx
// Badge de cocinero en plato
<PlatoItem>
  <Checkbox />
  <span>{plato.nombre}</span>
  {plato.procesandoPor && (
    <CocineroBadge variant="procesando">
      👨‍🍳 {plato.procesandoPor.nombre.split(' ')[0]}
      <Tooltip>
        {plato.procesandoPor.nombre} está preparando este plato
        desde las {formatTime(plato.procesandoPor.timestamp)}
      </Tooltip>
    </CocineroBadge>
  )}
</PlatoItem>

// Badge de cocinero en header de comanda
<ComandaHeader>
  {/* ... contenido actual ... */}
  {comanda.procesandoPor && (
    <div className="cocinero-asignado">
      <span className="pulse-dot"></span>
      {comanda.procesandoPor.nombre}
    </div>
  )}
</ComandaHeader>
```

##### En Vista de Tabla

```jsx
// Columna de cocinero asignado
<Table.Cell>
  {comanda.procesandoPor ? (
    <Badge color="orange">
      👨‍🍳 {comanda.procesandoPor.alias || comanda.procesandoPor.nombre}
    </Badge>
  ) : (
    <Badge color="gray">Sin asignar</Badge>
  )}
</Table.Cell>
```

#### 5. Flujo de Trabajo con Procesamiento

```
1. Cocinero ve comanda disponible
   ↓
2. Click en "Tomar Comanda" o "Tomar Plato"
   ↓
3. API: PUT /procesando
   ↓
4. Socket: emite "plato-procesando" o "comanda-procesando"
   ↓
5. Todos los clientes ven: "Juan está preparando..."
   ↓
6. Otros cocineros NO pueden tomar esa comanda/plato (bloqueo opcional)
   ↓
7. Juan termina el plato → Click "Finalizar"
   ↓
8. Se registra procesadoPor con timestamp
   ↓
9. Socket: emite "plato-actualizado"
```

#### 6. Configuración de Bloqueo

```jsx
// Opciones de bloqueo en ConfigModal
<FormGroup>
  <Checkbox 
    checked={config.bloqueoAutomatico}
    onChange={(e) => setConfig('bloqueoAutomatico', e.target.checked)}
  >
    Bloquear comandas mientras alguien las procesa
  </Checkbox>
  
  <NumberInput 
    value={config.tiempoBloqueo}
    label="Minutos máx. de bloqueo (0 = sin límite)"
    onChange={(val) => setConfig('tiempoBloqueo', val)}
  />
</FormGroup>
```

---

### 📊 Recomendaciones para Alta Demanda (+50 Comandas)

#### 1. Arquitectura de Escalabilidad

##### Backend

```javascript
// Implementar paginación en el endpoint de cocina
GET /api/comanda/cocina/:fecha?page=1&limit=20&status=en_espera

// Implementar filtros en backend
GET /api/comanda/cocina/:fecha?zona=parrilla&prioridad=alta

// Usar Redis para caché de comandas activas
const cachedComandas = await redis.get(`comandas:${fecha}:activas`);
if (cachedComandas) {
  return JSON.parse(cachedComandas);
}
// Si no está en caché, obtener de DB y cachear
```

##### Frontend

```javascript
// Implementar infinite scroll en lugar de paginación tradicional
import { useInfiniteQuery } from '@tanstack/react-query';

const { 
  data, 
  fetchNextPage, 
  hasNextPage 
} = useInfiniteQuery({
  queryKey: ['comandas', fecha],
  queryFn: ({ pageParam = 1 }) => fetchComandas(fecha, pageParam),
  getNextPageParam: (lastPage, pages) => lastPage.nextPage,
});

// Virtualización de lista para mejor rendimiento
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  data={comandas}
  itemContent={(index, comanda) => <ComandaCard comanda={comanda} />}
/>
```

#### 2. Optimización de Socket.io

```javascript
// Configuración optimizada para muchos clientes
const socket = io('/cocina', {
  transports: ['websocket'],
  upgrade: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  
  // Nuevas opciones
  forceNew: false,
  multiplex: true,
  
  // Throttling de eventos
  perMessageDeflate: {
    threshold: 1024 // Solo comprimir mensajes > 1KB
  }
});

// Throttling de updates en el cliente
const throttledUpdate = useMemo(
  () => throttle((comanda) => {
    updateComanda(comanda);
  }, 100),
  []
);

socket.on('comanda-actualizada', throttledUpdate);
```

#### 3. Gestión de Estado para Alto Volumen

```javascript
// Usar Zustand o Redux con normalización para estado grande
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useComandaStore = create(
  devtools((set, get) => ({
    // Estado normalizado
    comandas: {}, // { [id]: comanda }
    platos: {},   // { [id]: plato }
    orden: [],    // [comandaId1, comandaId2, ...]
    
    // Acciones optimizadas
    updatePlato: (comandaId, platoId, updates) => {
      set(produce(state => {
        state.platos[platoId] = { ...state.platos[platoId], ...updates };
      }));
    },
    
    // Selectores memoizados
    getComandasOrdenadas: () => {
      const { comandas, orden } = get();
      return orden.map(id => comandas[id]);
    }
  }))
);
```

#### 4. Estrategias de Particionamiento por Zona

```javascript
// Cada cocinero solo recibe comandas de su zona
socket.emit('unirse-zona', { zonaId: 'parrilla' });

// El backend solo envía eventos relevantes
io.to('zona-parrilla').emit('nueva-comanda', comanda);

// Selector de zona en UI
<ZoneSelector>
  {zonas.map(zona => (
    <ZoneButton 
      key={zona.id}
      active={zonaActiva === zona.id}
      onClick={() => setZonaActiva(zona.id)}
    >
      {zona.nombre}
      <Badge>{getComandasPorZona(zona.id).length}</Badge>
    </ZoneButton>
  ))}
  <ZoneButton active={zonaActiva === 'todas'}>
    Ver Todas
  </ZoneButton>
</ZoneSelector>
```

#### 5. Monitoreo y Métricas

```javascript
// Dashboard de métricas en tiempo real
<MetricsPanel>
  <MetricCard title="Comandas Activas" value={comandas.length} />
  <MetricCard title="En Preparación" value={enPreparacion.length} />
  <MetricCard title="Promedio Tiempo" value={avgTiempoPreparacion} />
  <MetricCard title="Cola" value={cola} trend="up" />
  <MetricCard title="Cocineros Activos" value={cocinerosActivos.length} />
  
  {/* Alertas de capacidad */}
  {comandas.length > 40 && (
    <Alert variant="warning">
      ⚠️ Alta demanda: {comandas.length} comandas activas
    </Alert>
  )}
  
  {comandas.length > 60 && (
    <Alert variant="critical">
      🚨 Capacidad crítica: Considerar ayuda adicional
    </Alert>
  )}
</MetricsPanel>
```

#### 6. Recomendaciones de Hardware

| Comandas Simultáneas | Pantallas Recomendadas | Servidor |
|----------------------|------------------------|----------|
| 10-30 | 1 pantalla 27"+ | 1 vCPU, 2GB RAM |
| 30-50 | 2 pantallas o 1 ultra-wide | 2 vCPU, 4GB RAM |
| 50-100 | 3-4 pantallas o video wall | 4 vCPU, 8GB RAM |
| 100+ | Sistema distribuido por zona | 8+ vCPU, 16GB+ RAM |

#### 7. Plan de Contingencia

```javascript
// Modo offline/fallback
const useOfflineMode = () => {
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      // Cambiar a modo de sincronización local
      enableLocalSync();
    };
    
    const handleOnline = () => {
      setIsOffline(false);
      // Sincronizar cambios locales con servidor
      syncLocalChanges();
    };
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
  
  return { isOffline };
};

// Indicador de modo offline en UI
{isOffline && (
  <OfflineBanner>
    📴 Modo sin conexión - Los cambios se sincronizarán cuando vuelva la conexión
  </OfflineBanner>
)}
```

---

### 📋 Checklist de Implementación Sugerida

#### Fase 1: Fundamentos (2-3 semanas)
- [ ] Implementar toggle de vista Tarjetas/Tabla
- [ ] Agregar nuevas opciones al ConfigModal
- [ ] Optimizar rendimiento para +30 comandas
- [ ] Implementar virtualización de listas

#### Fase 2: Colaboración (2-3 semanas)
- [ ] Sistema de identificación de cocinero en platos
- [ ] Sistema de identificación de cocinero en comandas
- [ ] Endpoints de procesamiento
- [ ] Eventos Socket.io de procesamiento

#### Fase 3: Escalabilidad (3-4 semanas)
- [ ] Particionamiento por zonas
- [ ] Paginación server-side
- [ ] Caché Redis para comandas
- [ ] Dashboard de métricas

#### Fase 4: Resiliencia (1-2 semanas)
- [ ] Modo offline con sincronización
- [ ] Reconexión robusta
- [ ] Alertas de capacidad
- [ ] Monitoreo de rendimiento

---

## 📋 Estado Actual del Sistema v7.1

**⚠️ IMPORTANTE:** Las funcionalidades de procesamiento multi-cocinero documentadas en versiones anteriores fueron **eliminadas voluntariamente** porque causaban problemas en el funcionamiento de la app de cocina.

### Sistema Actual Funcionando

El sistema opera actualmente con un flujo simplificado:

| Componente | Estado | Descripción |
|------------|--------|-------------|
| **ComandaStyle.jsx** | ✅ Funcionando | Componente principal KDS |
| **useSocketCocina.js** | ✅ Funcionando | Socket con autenticación JWT |
| **AuthContext** | ✅ Funcionando | Login con DNI |
| **ConfigContext** | ✅ Funcionando | Configuración centralizada |
| **PlatoPreparacion.jsx** | ✅ Funcionando | Renderizado de platos |
| **RevertirModal.jsx** | ✅ Funcionando | Reversión de estados |
| **ReportsModal.jsx** | ✅ Funcionando | Reportes |
| **ConfigModal.jsx** | ✅ Funcionando | Configuración |

### Flujo de Trabajo Actual

1. Usuario se autentica con DNI → `AuthContext`
2. Navega al menú principal → `MenuPage`
3. Accede al tablero KDS → `ComandaStyle.jsx`
4. Recibe comandas en tiempo real → `useSocketCocina.js`
5. Marca platos como listos con checkboxes
6. Finaliza comandas completas

### Funcionalidades NO Utilizadas

Los siguientes archivos existen en el código pero **no están integrados ni se utilizan**:

| Archivo | Estado |
|---------|--------|
| `useProcesamiento.js` | ⚠️ Existe pero no se usa |
| `useComandastyleCore.js` | ⚠️ Existe pero no se usa |
| `PlatoConProcesamiento.jsx` | ⚠️ Existe pero no se usa |
| Backend `procesamientoController.js` | ⚠️ Existe pero el frontend no lo consume |

### Temas Técnicos (Referencia)

A continuación se documenta el código técnico de las funcionalidades multi-cocinero para referencia futura, aunque actualmente no están activas:

---

### 📡 Tema 1 - Eventos de Configuración de Cocinero

#### Objetivo

Permitir que cada cocinero reciba únicamente los eventos de Socket.io relevantes para su configuración personal (zona asignada, preferencias), evitando que todos los clientes reciban todos los eventos indiscriminadamente.

#### Funcionalidades Implementadas

##### 1. Rooms Personales por Cocinero

Cada cocinero se une a su propio room personal además del room general por fecha:

```javascript
// Backend - Al autenticar cocinero
socket.join(`cocinero-${usuario.id}`);

// Frontend - Conexión con identificación
const socket = io('/cocina', {
  auth: {
    cocineroId: usuario.id,
    token: token
  }
});

socket.emit('join-room', `cocinero-${usuario.id}`);
```

##### 2. Emisión Dirigida a Room Específica

En lugar de broadcast a todos los clientes, los eventos se emiten al room específico:

```javascript
// Backend - Controller
// Antes (broadcast):
io.to('cocina').emit('evento', data);

// Ahora (dirigido):
io.to(`cocinero-${cocineroId}`).emit('evento', data);

// Ejemplo: Notificar solo al cocinero que tomó un plato
io.to(`cocinero-${plato.procesandoPor.cocineroId}`).emit('plato-liberado', {
  comandaId,
  platoId
});
```

##### 3. Validación en Frontend

El frontend valida que los eventos recibidos son para el cocinero correcto:

```javascript
// Frontend - useSocketCocina.js
useEffect(() => {
  socket.on('evento-personal', (data) => {
    // Validar que el evento es para este cocinero
    if (data.cocineroId !== usuario.id) {
      console.warn('Evento recibido para otro cocinero, ignorando');
      return;
    }
    // Procesar evento
    handleEventoPersonal(data);
  });
}, [usuario.id]);
```

#### Estado Actual

| Componente | Estado | Notas |
|------------|--------|-------|
| Rooms por cocinero | ✅ Implementado | Backend y Frontend listos |
| Emisión dirigida | ✅ Implementado | Eventos de procesamiento usan rooms |
| Validación frontend | ✅ Implementado | Chequeo de cocineroId en eventos |
| Documentación API | ⚠️ Parcial | Necesita ejemplos de uso |

#### Qué Falta para Funcionar Perfectamente

**Backend:**
- [ ] Implementar rooms por zona (`zona-parrilla`, `zona-barra`, etc.)
- [ ] Middleware de autenticación para Socket.io que verifique token JWT
- [ ] Log de eventos dirigidos para debugging
- [ ] Límite de reconexiones por room para evitar memory leaks

**Frontend:**
- [ ] Manejar desconexión/reconexión con re-unión a rooms
- [ ] Indicador visual de "Eventos personalizados activos"
- [ ] Fallback a broadcast si rooms fallan

**Testing:**
- [ ] Tests de integración para eventos dirigidos
- [ ] Simular múltiples cocineros conectados simultáneamente

---

### 🧪 Tema 2 - Testing de Vistas

#### Objetivo

Garantizar que el sistema de vistas (Vista General vs Vista por Zona) funciona correctamente, que los filtros se aplican apropiadamente, y que no hay contaminación de datos entre vistas.

#### Funcionalidades Requeridas

##### 1. Tests Unitarios para kdsFilters.js

Archivo de funciones puras para filtrado y ordenamiento de comandas:

```javascript
// kdsFilters.js - Funciones a testear

// Filtra comandas por zona asignada
export const filtrarPorZona = (comandas, zonaId) => {
  if (!zonaId || zonaId === 'todas') return comandas;
  return comandas.filter(c => c.zonaAsignada === zonaId);
};

// Ordena comandas por prioridad y tiempo
export const ordenarComandas = (comandas) => {
  return [...comandas].sort((a, b) => {
    const prioridadA = a.prioridadOrden || 0;
    const prioridadB = b.prioridadOrden || 0;
    if (prioridadA !== prioridadB) {
      return prioridadB - prioridadA; // Mayor prioridad primero
    }
    return new Date(a.createdAt) - new Date(b.createdAt); // Más antiguo primero
  });
};

// Filtra platos en preparación
export const filtrarPlatosPreparacion = (platos) => {
  return platos.filter(p => 
    p.estado === 'en_espera' || 
    p.estado === 'ingresante' || 
    p.estado === 'pedido'
  );
};

// Cuenta platos por estado
export const contarPlatosPorEstado = (platos) => {
  return {
    preparacion: platos.filter(p => ['en_espera', 'ingresante'].includes(p.estado)).length,
    listos: platos.filter(p => p.estado === 'recoger').length,
    entregados: platos.filter(p => p.estado === 'entregado').length
  };
};
```

##### 2. Tests de Integración para Navegación y Separación de Vistas

```javascript
// __tests__/integration/vistas.test.js

describe('Sistema de Vistas', () => {
  
  test('Vista General no aplica filtros de zona', () => {
    const comandas = mockComandas();
    const resultado = filtrarPorZona(comandas, 'todas');
    expect(resultado.length).toBe(comandas.length);
  });
  
  test('Vista Zona solo muestra comandas de la zona seleccionada', () => {
    const comandas = [
      { _id: 1, zonaAsignada: 'parrilla' },
      { _id: 2, zonaAsignada: 'barra' },
      { _id: 3, zonaAsignada: 'parrilla' }
    ];
    const resultado = filtrarPorZona(comandas, 'parrilla');
    expect(resultado.length).toBe(2);
    expect(resultado.every(c => c.zonaAsignada === 'parrilla')).toBe(true);
  });
  
  test('Cambio de vista limpia selección de comandas', async () => {
    const { result } = renderHook(() => useComandas());
    
    act(() => {
      result.current.seleccionarComanda('comanda-1');
    });
    
    expect(result.current.comandasSeleccionadas.size).toBe(1);
    
    act(() => {
      result.current.cambiarVista('zona-parrilla');
    });
    
    expect(result.current.comandasSeleccionadas.size).toBe(0);
  });
  
  test('Estado de checkboxes persiste entre cambios de vista', async () => {
    const { result } = renderHook(() => useComandas());
    
    act(() => {
      result.current.togglePlatoCheck('comanda-1', 'plato-1');
    });
    
    act(() => {
      result.current.cambiarVista('zona-barra');
    });
    
    act(() => {
      result.current.cambiarVista('todas');
    });
    
    expect(result.current.platosChecked.get('comanda-1')?.get('plato-1')?.isChecked).toBe(true);
  });
});
```

##### 3. Validación de Vista General

```javascript
// Test específico para asegurar que Vista General no contamina con filtros

describe('Vista General - Sin Filtros de Zona', () => {
  
  test('Vista General ignora zonaAsignada en comandas', () => {
    const comandasMixtas = [
      { _id: 1, zonaAsignada: 'parrilla', status: 'enespera' },
      { _id: 2, zonaAsignada: null, status: 'enespera' },
      { _id: 3, zonaAsignada: 'barra', status: 'enespera' }
    ];
    
    const resultado = procesarComandasVistaGeneral(comandasMixtas);
    
    // Todas las comandas deben aparecer
    expect(resultado.length).toBe(3);
  });
  
  test('Vista General no modifica propiedad zonaAsignada', () => {
    const comanda = { _id: 1, zonaAsignada: 'parrilla' };
    const procesada = procesarComandasVistaGeneral([comanda])[0];
    
    expect(procesada.zonaAsignada).toBe('parrilla');
  });
});
```

#### Estado Actual (CORREGIDO - Marzo 2026)

| Tipo de Test | Estado | Cobertura |
|--------------|--------|-----------|
| Tests unitarios kdsFilters | ⚠️ Pendiente | 0% |
| Tests integración vistas | ⚠️ Pendiente | 0% |
| Tests validación Vista General | ⚠️ Pendiente | 0% |
| Tests E2E navegación | ⚠️ Pendiente | 0% |

**NOTA:** El archivo `kdsFilters.js` existe con las funciones implementadas. Falta crear y ejecutar los tests.

#### Qué Falta para Funcionar Perfectamente

**Infraestructura de Testing:**
- [ ] Configurar Jest + React Testing Library
- [ ] Crear mocks para Socket.io
- [ ] Crear mocks para API calls (axios)
- [ ] Configurar coverage reports

**Tests a Implementar:**
- [ ] Test suite completo para `kdsFilters.js`
- [ ] Tests de integración para `useComandas` hook
- [ ] Tests de renderizado para `ComandaStyle.jsx`
- [ ] Tests de navegación entre vistas
- [ ] Tests de persistencia de estado entre vistas

**CI/CD:**
- [ ] Integrar tests en pipeline de CI
- [ ] Configurar tests automáticos en PR
- [ ] Agregar badge de coverage en README

---

### 🪝 Tema 3 - Hook Común useComandastyleCore

#### Objetivo

Extraer la lógica compartida entre `ComandaStyle.jsx` (Vista General) y futuros componentes de vista por zona, evitando duplicación de código y facilitando el mantenimiento.

#### Arquitectura del Hook

```javascript
// hooks/useComandastyleCore.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketCocina } from './useSocketCocina';
import { getApiUrl } from '../config/apiConfig';
import axios from 'axios';
import moment from 'moment-timezone';

/**
 * Hook base para gestión de comandas en el KDS.
 * Proporciona funcionalidad común para ambas vistas (General y Zona).
 * 
 * @param {Object} options - Configuración del hook
 * @param {Function} options.customFilter - Función de filtrado personalizada (opcional)
 * @param {string} options.zonaId - ID de zona para filtrar (opcional)
 * @param {Object} options.config - Configuración del usuario (alertas, sonidos, etc.)
 * @returns {Object} Estado y funciones para manejar comandas
 */
export const useComandastyleCore = ({
  customFilter = null,
  zonaId = null,
  config = {}
}) => {
  // ==================== ESTADO BASE ====================
  
  const [comandas, setComandas] = useState([]);
  const [filteredComandas, setFilteredComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  
  // Estado de selección
  const [comandasSeleccionadas, setComandasSeleccionadas] = useState(new Set());
  const [platosChecked, setPlatosChecked] = useState(new Map());
  
  // Referencias
  const newComandasRef = useRef(new Set());
  const platosStatesRef = useRef(new Map());
  
  // ==================== OBTENCIÓN DE COMANDAS ====================
  
  const obtenerComandas = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fechaActual = moment().tz('America/Lima').format('YYYY-MM-DD');
      const apiUrl = getApiUrl();
      
      const response = await axios.get(`${apiUrl}/fecha/${fechaActual}`);
      let comandasRecibidas = response.data.comandas || [];
      
      // Aplicar filtro personalizado si existe
      if (customFilter) {
        comandasRecibidas = customFilter(comandasRecibidas);
      }
      
      // Filtrar por zona si está especificada
      if (zonaId && zonaId !== 'todas') {
        comandasRecibidas = comandasRecibidas.filter(
          c => c.zonaAsignada === zonaId
        );
      }
      
      // Validar comandas
      const comandasValidas = comandasRecibidas.filter(comanda => {
        if (!comanda.platos || comanda.platos.length === 0) return false;
        return comanda.platos.every(plato => {
          const nombre = plato.plato?.nombre || plato.nombre;
          return nombre && nombre.trim().length > 0;
        });
      });
      
      setComandas(comandasValidas);
      setFilteredComandas(comandasValidas);
    } catch (err) {
      console.error('Error al obtener comandas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [customFilter, zonaId]);
  
  // ==================== ORDENAMIENTO ====================
  
  const ordenarComandas = useCallback((comandasList) => {
    return [...comandasList].sort((a, b) => {
      // Primero por prioridad (DESC)
      const prioridadA = a.prioridadOrden || 0;
      const prioridadB = b.prioridadOrden || 0;
      if (prioridadA !== prioridadB) {
        return prioridadB - prioridadA;
      }
      // Luego por fecha de creación (ASC)
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }, []);
  
  // ==================== PAGINACIÓN ====================
  
  const COMANDAS_POR_PAGINA = config.comandasPorPagina || 5;
  
  const totalPages = Math.ceil(filteredComandas.length / COMANDAS_POR_PAGINA);
  const comandasPagina = filteredComandas.slice(
    currentPage * COMANDAS_POR_PAGINA,
    (currentPage + 1) * COMANDAS_POR_PAGINA
  );
  
  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  }, [totalPages]);
  
  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  }, []);
  
  // ==================== BÚSQUEDA ====================
  
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredComandas(ordenarComandas(comandas));
      return;
    }
    
    const termino = searchTerm.toLowerCase();
    const filtradas = comandas.filter(comanda => {
      const comandaNumber = String(comanda.comandaNumber || '').toLowerCase();
      if (comandaNumber.includes(termino)) return true;
      
      const mesa = String(comanda.mesas?.nummesa || '').toLowerCase();
      if (mesa.includes(termino)) return true;
      
      const mozo = (comanda.mozos?.name || '').toLowerCase();
      if (mozo.includes(termino)) return true;
      
      const platos = comanda.platos?.map(p => 
        (p.plato?.nombre || p.nombre || '').toLowerCase()
      ).join(' ') || '';
      if (platos.includes(termino)) return true;
      
      return false;
    });
    
    setFilteredComandas(ordenarComandas(filtradas));
    setCurrentPage(0);
  }, [searchTerm, comandas, ordenarComandas]);
  
  // ==================== SOCKET.IO ====================
  
  const handleNuevaComanda = useCallback((comanda) => {
    // Validar
    if (!comanda.platos || comanda.platos.length === 0) return;
    
    // Aplicar filtro de zona si corresponde
    if (zonaId && zonaId !== 'todas' && comanda.zonaAsignada !== zonaId) {
      return; // Ignorar comanda de otra zona
    }
    
    setComandas(prev => {
      const existe = prev.some(c => c._id === comanda._id);
      if (existe) return prev;
      return ordenarComandas([comanda, ...prev]);
    });
    
    newComandasRef.current.add(comanda._id);
    setTimeout(() => {
      newComandasRef.current.delete(comanda._id);
    }, 3000);
    
    if (config.soundEnabled) {
      // Reproducir sonido
    }
  }, [zonaId, config.soundEnabled, ordenarComandas]);
  
  const handleComandaActualizada = useCallback((comanda) => {
    setComandas(prev => {
      const index = prev.findIndex(c => c._id === comanda._id);
      if (index === -1) return prev;
      
      const nuevas = [...prev];
      nuevas[index] = comanda;
      return ordenarComandas(nuevas);
    });
  }, [ordenarComandas]);
  
  const handlePlatoActualizado = useCallback((data) => {
    setComandas(prev => {
      const nuevas = [...prev];
      const comandaIndex = nuevas.findIndex(c => c._id === data.comandaId);
      if (comandaIndex === -1) return prev;
      
      const comanda = { ...nuevas[comandaIndex] };
      const platos = [...comanda.platos];
      const platoIndex = platos.findIndex(p => 
        (p.platoId?.toString() || p._id?.toString()) === data.platoId?.toString()
      );
      
      if (platoIndex !== -1) {
        platos[platoIndex] = {
          ...platos[platoIndex],
          estado: data.nuevoEstado,
          tiempos: {
            ...platos[platoIndex].tiempos,
            [data.nuevoEstado]: data.timestamp
          }
        };
      }
      
      nuevas[comandaIndex] = { ...comanda, platos };
      return nuevas;
    });
    
    // Limpiar checkbox del plato
    setPlatosChecked(prev => {
      const nuevo = new Map(prev);
      const comandaChecks = nuevo.get(data.comandaId);
      if (comandaChecks) {
        const nuevosChecks = new Map(comandaChecks);
        nuevosChecks.delete(data.platoId);
        nuevo.set(data.comandaId, nuevosChecks);
      }
      return nuevo;
    });
  }, []);
  
  const { socket, connected, connectionStatus } = useSocketCocina({
    onNuevaComanda: handleNuevaComanda,
    onComandaActualizada: handleComandaActualizada,
    onPlatoActualizado: handlePlatoActualizado,
    obtenerComandas
  });
  
  // ==================== SELECCIÓN ====================
  
  const toggleSelectComanda = useCallback((comandaId) => {
    setComandasSeleccionadas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(comandaId)) {
        nuevo.delete(comandaId);
      } else {
        nuevo.add(comandaId);
      }
      return nuevo;
    });
  }, []);
  
  const togglePlatoCheck = useCallback((comandaId, platoId) => {
    setPlatosChecked(prev => {
      const nuevo = new Map(prev);
      const comandaChecks = nuevo.get(comandaId) || new Map();
      const nuevosChecks = new Map(comandaChecks);
      const actual = nuevosChecks.get(platoId) || { isChecked: false, isProcessing: false };
      
      nuevosChecks.set(platoId, {
        isChecked: !actual.isChecked,
        isProcessing: !actual.isChecked
      });
      nuevo.set(comandaId, nuevosChecks);
      return nuevo;
    });
  }, []);
  
  // ==================== EFECTOS ====================
  
  useEffect(() => {
    obtenerComandas();
  }, [obtenerComandas]);
  
  // ==================== RETURN ====================
  
  return {
    // Estado
    comandas,
    filteredComandas,
    comandasPagina,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    totalPages,
    comandasSeleccionadas,
    platosChecked,
    newComandasRef,
    platosStatesRef,
    
    // Socket
    socket,
    connected,
    connectionStatus,
    
    // Funciones
    obtenerComandas,
    ordenarComandas,
    nextPage,
    prevPage,
    setCurrentPage,
    toggleSelectComanda,
    togglePlatoCheck,
    setPlatosChecked,
    setComandasSeleccionadas
  };
};
```

#### Funcionalidades que Permite Inyectar

```javascript
// Ejemplo de uso en Vista General
const VistaGeneral = () => {
  const {
    comandas,
    loading,
    toggleSelectComanda,
    // ... resto del estado
  } = useComandastyleCore({
    config: userConfig
    // Sin customFilter ni zonaId = Vista General
  });
  
  // Renderizado...
};

// Ejemplo de uso en Vista por Zona
const VistaZona = ({ zonaId }) => {
  const {
    comandas,
    // ... resto
  } = useComandastyleCore({
    zonaId, // Filtra automáticamente por zona
    customFilter: (comandas) => {
      // Filtro adicional personalizado
      return comandas.filter(c => c.prioridadOrden > 0);
    },
    config: userConfig
  });
  
  // Renderizado...
};
```

#### Estado Actual (CORREGIDO - Marzo 2026)

| Componente | Estado | Notas |
|------------|--------|-------|
| Extracción de lógica | ✅ Completado | Hook implementado completamente |
| Hook funcional | ✅ Implementado | `useComandastyleCore.js` funciona |
| Integración en ComandaStyle | ❌ Pendiente | No se ha migrado al hook |
| Integración en ComandastylePerso | ❌ Pendiente | No se ha creado la vista personalizada |
| Tests del hook | ⚠️ Pendiente | Requiere implementación |

**NOTA:** El hook está completamente implementado en `useComandastyleCore.js` con todas las funcionalidades documentadas. El archivo `ComandaStyle.jsx` actual NO usa este hook (tiene su propia lógica inline). Falta refactorizar para usar el hook común.

#### Qué Falta para Funcionar Perfectamente

**Refactorización (PRIORIDAD MEDIA):**
- [ ] Refactorizar `ComandaStyle.jsx` para usar `useComandastyleCore`
- [ ] Crear componente `VistaZona.jsx` usando el hook
- [ ] Eliminar lógica duplicada de `ComandaStyle.jsx`

**Testing:**
- [ ] Unit tests para cada función del hook
- [ ] Tests de integración con Socket.io
- [ ] Tests de renderizado con React Testing Library

---

### 🔄 Tema 4 - Sistema de Procesamiento (Backend)

#### Objetivo

Implementar en el backend la capacidad de rastrear qué cocinero está procesando cada plato, permitiendo evitar conflictos y mostrar información de colaboración en tiempo real.

#### ✅ Estado: COMPLETAMENTE IMPLEMENTADO

**Archivo:** `Backend-LasGambusinas/src/controllers/procesamientoController.js`

El backend tiene implementados los 5 endpoints completos:
- `PUT /api/comanda/:id/plato/:platoId/procesando` - Tomar plato
- `DELETE /api/comanda/:id/plato/:platoId/procesando` - Liberar plato  
- `PUT /api/comanda/:id/plato/:platoId/finalizar` - Finalizar plato
- `PUT /api/comanda/:id/procesando` - Tomar comanda completa
- `DELETE /api/comanda/:id/procesando` - Liberar comanda

#### Modelo de Datos (IMPLEMENTADO)

**Archivo:** `Backend-LasGambusinas/src/database/models/comanda.model.js`

```javascript
// models/Comanda.js - Campos nuevos en el schema de platos

const platoSchema = new Schema({
  platoId: { type: Schema.Types.ObjectId, ref: 'Plato' },
  cantidad: { type: Number, default: 1 },
  estado: { 
    type: String, 
    enum: ['ingresante', 'en_espera', 'recoger', 'entregado'],
    default: 'en_espera'
  },
  
  // ==================== NUEVOS CAMPOS ====================
  procesandoPor: {
    cocineroId: { type: Schema.Types.ObjectId, ref: 'Usuario' },
    nombre: { type: String },
    alias: { type: String },
    desde: { type: Date }
  },
  procesadoPor: {
    cocineroId: { type: Schema.Types.ObjectId, ref: 'Usuario' },
    nombre: { type: String },
    timestamp: { type: Date }
  }
  // ========================================================
});
```

#### Endpoints Implementados

##### 1. Marcar Plato como "En Procesamiento"

```javascript
// PUT /api/comanda/:id/plato/:platoId/procesando
// Body: { cocineroId, nombre, alias? }

router.put('/:id/plato/:platoId/procesando', async (req, res) => {
  const { id, platoId } = req.params;
  const { cocineroId, nombre, alias } = req.body;
  
  try {
    const comanda = await Comanda.findById(id);
    if (!comanda) {
      return res.status(404).json({ error: 'Comanda no encontrada' });
    }
    
    const plato = comanda.platos.find(p => 
      p.platoId?.toString() === platoId || p._id?.toString() === platoId
    );
    
    if (!plato) {
      return res.status(404).json({ error: 'Plato no encontrado' });
    }
    
    // Verificar si ya está siendo procesado por otro cocinero
    if (plato.procesandoPor && plato.procesandoPor.cocineroId?.toString() !== cocineroId) {
      return res.status(409).json({
        error: 'Plato ya en procesamiento',
        procesandoPor: plato.procesandoPor
      });
    }
    
    // Marcar como procesando
    plato.procesandoPor = {
      cocineroId,
      nombre,
      alias: alias || nombre,
      desde: new Date()
    };
    
    await comanda.save();
    
    // Emitir evento Socket.io
    const io = req.app.get('io');
    io.to(`cocinero-${cocineroId}`).emit('plato-procesando', {
      comandaId: id,
      platoId,
      cocinero: { cocineroId, nombre, alias }
    });
    
    // También emitir a todos para actualización de UI
    io.to('cocina').emit('comanda-actualizada', comanda);
    
    res.json({ success: true, comanda });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

##### 2. Liberar Plato (Dejar de Procesar)

```javascript
// DELETE /api/comanda/:id/plato/:platoId/procesando
// Body: { cocineroId }

router.delete('/:id/plato/:platoId/procesando', async (req, res) => {
  const { id, platoId } = req.params;
  const { cocineroId } = req.body;
  
  try {
    const comanda = await Comanda.findById(id);
    if (!comanda) {
      return res.status(404).json({ error: 'Comanda no encontrada' });
    }
    
    const plato = comanda.platos.find(p => 
      p.platoId?.toString() === platoId || p._id?.toString() === platoId
    );
    
    if (!plato) {
      return res.status(404).json({ error: 'Plato no encontrado' });
    }
    
    // Verificar que sea el mismo cocinero quien libera
    if (plato.procesandoPor?.cocineroId?.toString() !== cocineroId) {
      return res.status(403).json({
        error: 'Solo quien tomó el plato puede liberarlo',
        tomadoPor: plato.procesandoPor
      });
    }
    
    // Liberar
    plato.procesandoPor = null;
    await comanda.save();
    
    // Emitir evento
    const io = req.app.get('io');
    io.to('cocina').emit('plato-liberado', { comandaId: id, platoId });
    io.to('cocina').emit('comanda-actualizada', comanda);
    
    res.json({ success: true, comanda });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

##### 3. Finalizar Plato (Marcar como Listo)

```javascript
// PUT /api/comanda/:id/plato/:platoId/finalizar
// Body: { cocineroId, nombre }

router.put('/:id/plato/:platoId/finalizar', async (req, res) => {
  const { id, platoId } = req.params;
  const { cocineroId, nombre } = req.body;
  
  try {
    const comanda = await Comanda.findById(id);
    if (!comanda) {
      return res.status(404).json({ error: 'Comanda no encontrada' });
    }
    
    const plato = comanda.platos.find(p => 
      p.platoId?.toString() === platoId || p._id?.toString() === platoId
    );
    
    if (!plato) {
      return res.status(404).json({ error: 'Plato no encontrado' });
    }
    
    // Actualizar estado
    plato.estado = 'recoger';
    plato.procesadoPor = {
      cocineroId,
      nombre,
      timestamp: new Date()
    };
    plato.procesandoPor = null;
    
    // Actualizar tiempo
    plato.tiempos = plato.tiempos || {};
    plato.tiempos.recoger = new Date();
    
    await comanda.save();
    
    // Emitir evento
    const io = req.app.get('io');
    io.to('cocina').emit('plato-actualizado', {
      comandaId: id,
      platoId,
      nuevoEstado: 'recoger',
      procesadoPor: plato.procesadoPor
    });
    
    res.json({ success: true, comanda });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Eventos Socket.io Nuevos

| Evento | Dirección | Datos | Descripción |
|--------|-----------|-------|-------------|
| `plato-procesando` | Server → Client | `{ comandaId, platoId, cocinero }` | Un cocinero comenzó a procesar un plato |
| `plato-liberado` | Server → Client | `{ comandaId, platoId }` | Un cocinero liberó un plato |
| `plato-finalizado` | Server → Client | `{ comandaId, platoId, procesadoPor }` | Plato marcado como listo |
| `conflicto-procesamiento` | Server → Client | `{ comandaId, platoId, tomadoPor }` | Conflicto al intentar tomar plato |

#### Estado Actual (CORREGIDO - Marzo 2026)

| Componente | Estado | Notas |
|------------|--------|-------|
| Modelo extendido | ✅ Implementado | Schema con procesandoPor/procesadoPor aplicado |
| Endpoint procesando (plato) | ✅ Implementado | `PUT /api/comanda/:id/plato/:platoId/procesando` |
| Endpoint liberar (plato) | ✅ Implementado | `DELETE /api/comanda/:id/plato/:platoId/procesando` |
| Endpoint finalizar (plato) | ✅ Implementado | `PUT /api/comanda/:id/plato/:platoId/finalizar` |
| Endpoint procesando (comanda) | ✅ Implementado | `PUT /api/comanda/:id/procesando` |
| Endpoint liberar (comanda) | ✅ Implementado | `DELETE /api/comanda/:id/procesando` |
| Eventos Socket | ✅ Implementado | Integrados en procesamientoController.js |
| Hook useProcesamiento | ✅ Implementado | `useProcesamiento.js` completo |
| Componente PlatoConProcesamiento | ✅ Implementado | Con badges animados y botones |
| Integración en ComandaStyle | ❌ Pendiente | Falta conectar los componentes |

#### Qué Falta para Funcionar Perfectamente

**Integración Frontend (PRIORIDAD ALTA):**
- [ ] Importar `useProcesamiento` en `ComandaStyle.jsx`
- [ ] Reemplazar renderizado de platos con `PlatoConProcesamiento`
- [ ] Conectar callbacks de tomar/liberar/finalizar
- [ ] Probar flujo completo end-to-end

**Testing:**
- [ ] Tests unitarios para cada endpoint
- [ ] Tests de integración con Socket.io
- [ ] Tests de conflictos (409)
- [ ] Tests de permisos (403)

---

### 🎨 Tema 5 - UI de Procesamiento (Frontend)

#### Objetivo

Mostrar en la interfaz de cocina qué platos están siendo procesados y por quién, permitiendo a los cocineros coordinarse y evitar duplicar trabajo.

#### ✅ Estado: COMPONENTES IMPLEMENTADOS, FALTA INTEGRACIÓN

**Archivos implementados:**
- `appcocina/src/hooks/useProcesamiento.js` - Hook completo con todas las funciones
- `appcocina/src/components/Principal/PlatoConProcesamiento.jsx` - Componentes de UI

#### Componentes Implementados

##### 1. Hook useProcesamiento

```javascript
// hooks/useProcesamiento.js

import { useState, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/apiConfig';
import { toast } from 'react-toastify';

export const useProcesamiento = (usuario) => {
  const [loading, setLoading] = useState(false);
  
  // Tomar un plato para procesarlo
  const tomarPlato = useCallback(async (comandaId, platoId) => {
    if (!usuario) {
      toast.error('Debes estar autenticado para procesar platos');
      return { success: false };
    }
    
    setLoading(true);
    
    try {
      const response = await axios.put(
        `${getApiUrl()}/${comandaId}/plato/${platoId}/procesando`,
        {
          cocineroId: usuario.id,
          nombre: usuario.name,
          alias: usuario.alias || usuario.name
        }
      );
      
      toast.success(`Tomaste el plato para preparar`);
      return { success: true, comanda: response.data.comanda };
    } catch (error) {
      if (error.response?.status === 409) {
        // Conflicto - otro cocinero ya lo tomó
        const tomadoPor = error.response.data.procesandoPor;
        toast.warning(
          `Este plato ya lo está preparando ${tomadoPor.nombre}`,
          { autoClose: 5000 }
        );
        return { success: false, conflicto: true, tomadoPor };
      }
      
      toast.error('Error al tomar el plato');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [usuario]);
  
  // Liberar un plato (dejar de procesarlo)
  const liberarPlato = useCallback(async (comandaId, platoId) => {
    if (!usuario) return { success: false };
    
    setLoading(true);
    
    try {
      await axios.delete(
        `${getApiUrl()}/${comandaId}/plato/${platoId}/procesando`,
        { data: { cocineroId: usuario.id } }
      );
      
      toast.info('Plato liberado');
      return { success: true };
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Solo quien tomó el plato puede liberarlo');
        return { success: false, forbidden: true };
      }
      
      toast.error('Error al liberar el plato');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [usuario]);
  
  // Finalizar un plato (marcar como listo)
  const finalizarPlato = useCallback(async (comandaId, platoId) => {
    if (!usuario) return { success: false };
    
    setLoading(true);
    
    try {
      const response = await axios.put(
        `${getApiUrl()}/${comandaId}/plato/${platoId}/finalizar`,
        {
          cocineroId: usuario.id,
          nombre: usuario.name
        }
      );
      
      toast.success('¡Plato listo para recoger!');
      return { success: true, comanda: response.data.comanda };
    } catch (error) {
      toast.error('Error al finalizar el plato');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [usuario]);
  
  return {
    loading,
    tomarPlato,
    liberarPlato,
    finalizarPlato
  };
};
```

##### 2. Componente PlatoConProcesamiento

```jsx
// components/PlatoConProcesamiento.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProcesamiento } from '../../hooks/useProcesamiento';

const PlatoConProcesamiento = ({ 
  plato, 
  comandaId, 
  usuario,
  isChecked,
  onCheckToggle,
  nightMode 
}) => {
  const { tomarPlato, liberarPlato, loading } = useProcesamiento(usuario);
  
  const estaProcesandoEsteUsuario = 
    plato.procesandoPor?.cocineroId === usuario?.id;
  
  const estaProcesandoOtro = 
    plato.procesandoPor && !estaProcesandoEsteUsuario;
  
  const handleTomar = async (e) => {
    e.stopPropagation();
    if (!estaProcesandoOtro) {
      await tomarPlato(comandaId, plato.platoId || plato._id);
    }
  };
  
  const handleLiberar = async (e) => {
    e.stopPropagation();
    await liberarPlato(comandaId, plato.platoId || plato._id);
  };
  
  return (
    <motion.div
      className={`
        relative p-3 rounded-lg mb-2 transition-all
        ${isChecked ? 'bg-green-500/30' : 'bg-transparent'}
        ${estaProcesandoEsteUsuario ? 'ring-2 ring-orange-400' : ''}
        ${estaProcesandoOtro ? 'opacity-60' : ''}
      `}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center justify-between">
        {/* Checkbox y nombre */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCheckToggle}
            className={`
              w-6 h-6 rounded border-2 flex items-center justify-center
              ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-400'}
            `}
          >
            {isChecked && <span className="text-white">✓</span>}
          </button>
          
          <span className={`${nightMode ? 'text-white' : 'text-gray-900'}`}>
            {plato.cantidad}x {plato.plato?.nombre || plato.nombre}
          </span>
        </div>
        
        {/* Badge de procesamiento */}
        <AnimatePresence>
          {plato.procesandoPor && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                ${estaProcesandoEsteUsuario 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-blue-500 text-white'}
              `}
            >
              <span className="animate-pulse">👨‍🍳</span>
              <span>{plato.procesandoPor.alias || plato.procesandoPor.nombre}</span>
              
              {/* Botón liberar solo para quien tomó */}
              {estaProcesandoEsteUsuario && (
                <button
                  onClick={handleLiberar}
                  disabled={loading}
                  className="ml-1 px-1 rounded bg-white/20 hover:bg-white/30"
                >
                  ✕
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Botón "Tomar" si no está siendo procesado */}
      {!plato.procesandoPor && plato.estado === 'en_espera' && (
        <button
          onClick={handleTomar}
          disabled={loading}
          className={`
            absolute top-1 right-1 text-xs px-2 py-0.5 rounded
            ${nightMode 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
          `}
        >
          Tomar
        </button>
      )}
    </motion.div>
  );
};

export default PlatoConProcesamiento;
```

##### 3. Componente ComandaProcesamientoBadge

```jsx
// components/ComandaProcesamientoBadge.jsx

import React from 'react';
import { motion } from 'framer-motion';

const ComandaProcesamientoBadge = ({ 
  platos, 
  usuario,
  nightMode 
}) => {
  // Obtener cocineros únicos que están procesando
  const cocinerosProcesando = platos
    .filter(p => p.procesandoPor)
    .map(p => ({
      id: p.procesandoPor.cocineroId,
      nombre: p.procesandoPor.nombre,
      alias: p.procesandoPor.alias
    }))
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  
  if (cocinerosProcesando.length === 0) return null;
  
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {cocinerosProcesando.map((cocinero) => {
        const esUsuarioActual = cocinero.id === usuario?.id;
        
        return (
          <motion.span
            key={cocinero.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
              ${esUsuarioActual 
                ? 'bg-orange-500 text-white' 
                : 'bg-blue-600 text-white'}
            `}
          >
            <span className="animate-pulse">👨‍🍳</span>
            <span>{cocinero.alias || cocinero.nombre}</span>
          </motion.span>
        );
      })}
    </div>
  );
};

export default ComandaProcesamientoBadge;
```

#### Animaciones CSS

```css
/* Animación para badges de procesamiento */
@keyframes pulse-procesando {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 8px rgba(249, 115, 22, 0);
  }
}

.badge-procesando {
  animation: pulse-procesando 2s infinite;
}

/* Indicador de "Tomado por otro" */
.plato-tomado-otro {
  position: relative;
  overflow: hidden;
}

.plato-tomado-otro::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 5px,
    rgba(0, 0, 0, 0.05) 5px,
    rgba(0, 0, 0, 0.05) 10px
  );
  pointer-events: none;
}
```

#### Estado Actual (v7.2.1 - Marzo 2026)

| Componente | Estado | Notas |
|------------|--------|-------|
| Hook useProcesamiento | ✅ Integrado | Conectado en ComandaStyle.jsx |
| PlatoPreparacion con badge | ✅ Implementado | Badge de cocinero con props procesandoPor/usuarioActualId |
| Botón contextual | ✅ Implementado | En barra inferior con Tomar/Dejar/Finalizar dinámico |
| Eventos Socket.io | ✅ Implementado | Listeners para plato-procesando, plato-liberado, conflicto-procesamiento |
| Validación backend | ✅ Implementado | Error 403 si otro cocinero intenta finalizar plato ajeno |
| Función determinarAccionBoton | ✅ Implementado | Lógica de decisión del botón contextual |
| Estado visual "dejar" | ✅ Implementado | Plato en rojo para indicar intención de liberar |
| Ciclo de estados diferenciado | ✅ Implementado | Flujo diferente según si el plato está tomado por mí |

---

### 🆕 Cambios Recientes v7.2.1 - Sistema de Estados Visuales Mejorado

#### Descripción General

Se implementó un sistema de **3 estados visuales diferenciados** según el contexto del plato, permitiendo al cocinero que tomó un plato tener opciones claras para **dejarlo** (liberar) o **finalizarlo**.

#### 1. Ciclos de Estados Diferenciados

**Para platos SIN TOMAR (ningún cocinero asignado):**
```
Normal → Procesando (amarillo) → Seleccionado (verde) → Normal
```
- **Amarillo**: Indica intención de tomar el plato
- **Verde**: Indica listo para finalizar

**Para platos TOMADOS POR EL COCINERO ACTUAL:**
```
Normal → Dejar (rojo) → Seleccionado (verde) → Normal
```
- **Normal (con badge "Tú")**: Plato tomado, en preparación
- **Rojo**: Indica intención de liberar/dejar el plato
- **Verde**: Indica listo para finalizar

#### 2. Estado Visual "dejar" (Rojo)

**Implementación en `PlatoPreparacion.jsx`:**

```javascript
// Nuevo estado en containerVariants
dejar: {
  scale: [1, 1.02, 1],
  opacity: [1, 0.9, 1],
  boxShadow: [
    '0 0 8px rgba(239, 68, 68, 0.3)',
    '0 0 16px rgba(239, 68, 68, 0.5)',
    '0 0 8px rgba(239, 68, 68, 0.3)',
  ],
  transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
}

// Nuevo estilo de fondo
case 'dejar':
  return nightMode ? 'bg-red-500/30 text-red-300 border-red-500/50' : 'bg-red-500/20 text-red-700 border-red-500/50';

// Icono animado ↩️
{visualState === 'dejar' && (
  <motion.span animate="dejar">↩️</motion.span>
)}
```

**Propósito:** El estado rojo indica visualmente que el cocinero quiere liberar el plato que previamente tomó.

#### 3. Función `togglePlatoCheck` Mejorada

**Ubicación:** `ComandaStyle.jsx` líneas ~1296-1353

```javascript
const togglePlatoCheck = useCallback((comandaId, platoIndex) => {
  const key = `${comandaId}-${platoIndex}`;
  const miUsuarioId = userId?.toString();
  
  // Verificar si el plato está tomado por mí
  const comanda = comandas.find(c => c._id === comandaId);
  const plato = comanda?.platos?.[platoIndex];
  const tomadoPorMi = plato?.procesandoPor?.cocineroId?.toString() === miUsuarioId;
  
  setPlatoStates(prev => {
    const nuevo = new Map(prev);
    const estadoActual = nuevo.get(key) || 'normal';
    
    let nuevoEstado;
    if (tomadoPorMi) {
      // Ciclo para mis platos: Normal → Dejar → Seleccionado → Normal
      if (estadoActual === 'normal') nuevoEstado = 'dejar';
      else if (estadoActual === 'dejar') nuevoEstado = 'seleccionado';
      else nuevoEstado = 'normal';
    } else {
      // Ciclo normal: Normal → Procesando → Seleccionado → Normal
      if (estadoActual === 'normal') nuevoEstado = 'procesando';
      else if (estadoActual === 'procesando') nuevoEstado = 'seleccionado';
      else nuevoEstado = 'normal';
    }
    
    nuevo.set(key, nuevoEstado);
    return nuevo;
  });
}, [comandas, userId]);
```

**Propósito:** Diferenciar el ciclo de clicks según si el plato ya fue tomado por el cocinero actual.

#### 4. Lógica del Botón Contextual Actualizada

**Función `determinarAccionBoton`:**

| Estado Visual | Condición | Modo Botón | Color | Acción |
|--------------|-----------|------------|-------|--------|
| `dejar` + tomado por mí | - | DEJAR_PLATO | 🔴 Rojo | Liberar plato |
| `seleccionado` + tomado por mí | - | FINALIZAR_PLATO | 🟢 Verde | Finalizar → `recoger` |
| `procesando` sin tomar | - | TOMAR_PLATO | 🔵 Azul | Asignarse el plato |
| Tomado por otro | - | SIN_ACCION | ⚫ Gris | Bloqueado con mensaje |

#### 5. Corrección en Cálculo de Platos Seleccionados

**Problema anterior:** `getTotalPlatosMarcados()` solo contaba checkboxes boolean, ignorando estados visuales.

**Solución implementada:**

```javascript
// Antes (incorrecto)
const hayPlatosSeleccionados = getTotalPlatosMarcados() > 0;

// Después (correcto)
const platosConInteraccion = obtenerPlatosSeleccionadosInfo();
const hayPlatosSeleccionados = platosConInteraccion.length > 0;
```

**Propósito:** El botón ahora responde correctamente a platos en amarillo (`procesando`) o rojo (`dejar`).

#### 6. Estado Visual Automático para Platos Tomados

**Problema:** Un plato con `procesandoPor` asignado no se mostraba visualmente en amarillo.

**Solución en renderizado de platos:**

```javascript
let estadoVisual = estadoVisualLocal;
if (plato.procesandoPor?.cocineroId && estadoVisualLocal === 'normal') {
  estadoVisual = 'procesando'; // Forzar amarillo visual
}
```

**Propósito:** Garantizar que cualquier plato tomado por un cocinero se muestre visualmente destacado (amarillo) aunque el usuario no haya interactuado con él.

#### 7. Handlers para Eventos Socket.io de Procesamiento

**Actualización en `handlePlatoActualizado`:**

```javascript
// Evento: Plato tomado por un cocinero
if (data.tipo === 'PLATO_TOMADO') {
  setComandas(prev => prev.map(comanda => ({
    ...comanda,
    platos: comanda.platos.map(p => 
      p._id?.toString() === data.platoId?.toString()
        ? { ...p, procesandoPor: data.procesandoPor }
        : p
    )
  })));
  return; // No continuar con lógica de cambio de estado
}

// Evento: Plato liberado
if (data.tipo === 'PLATO_LIBERADO') {
  setComandas(prev => prev.map(comanda => ({
    ...comanda,
    platos: comanda.platos.map(p => 
      p._id?.toString() === data.platoId?.toString()
        ? { ...p, procesandoPor: null }
        : p
    )
  })));
  return;
}
```

**Propósito:** Actualizar el campo `procesandoPor` de forma granular sin recargar toda la lista de comandas.

#### 8. Exclusión de Platos Ajenos en Finalización

**Actualización en `handleFinalizarPlatosGlobal`:**

```javascript
// v7.2: EXCLUIR platos tomados por otro cocinero
const miUsuarioId = userId?.toString();
const tomadoPorOtro = plato.procesandoPor?.cocineroId && 
                      plato.procesandoPor.cocineroId.toString() !== miUsuarioId;
if (tomadoPorOtro) {
  console.warn(`⚠️ Plato "${nombre}" excluido: tomado por ${procesandoPor?.alias}`);
  return;
}
```

**Propósito:** Prevenir que un cocinero finalice platos que otro cocinero está preparando.

---

#### Flujo Completo del Sistema Multi-Cocinero v7.2.1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE PLATO SIN TOMAR                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Click en plato normal → Amarillo (procesando)                           │
│  2. Botón muestra "Tomar plato" (azul)                                      │
│  3. Click en "Tomar" → Backend asigna procesandoPor                         │
│  4. Badge muestra "Tú" (verde)                                              │
│  5. Plato permanece en amarillo con badge                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE PLATO TOMADO POR MÍ                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Click en plato con badge "Tú" → Rojo (dejar)                            │
│  2. Botón muestra "Dejar plato" (rojo)                                      │
│  3. Opción A: Click en "Dejar" → Backend libera → Badge desaparece          │
│  4. Opción B: Click de nuevo en plato → Verde (seleccionado)                │
│  5. Botón muestra "Finalizar plato" (verde)                                 │
│  6. Click en "Finalizar" → Estado cambia a 'recoger'                        │
│  7. Plato se mueve a sección "Listos/Preparados"                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### Cómo Funciona el Sistema Multi-Cocinero v7.2

**Flujo del Botón Contextual:**

1. **Usuario selecciona platos** con el sistema de checkboxes existente (click -> procesando -> seleccionado)

2. **El sistema analiza los platos seleccionados:**
   - Si algún plato está tomado por otro cocinero → Botón deshabilitado con mensaje "Ocupado por [nombre]"
   - Si todos los platos están tomados por el usuario actual → Botón verde "Finalizar X Platos"
   - Si hay platos sin tomar → Botón azul "Tomar X Platos"

3. **Acciones:**
   - **Tomar plato**: Llama a `PUT /api/comanda/:id/plato/:platoId/procesando` con `cocineroId`
   - **Finalizar plato**: Llama a `PUT /api/comanda/:id/plato/:platoId/estado` con `nuevoEstado: "recoger"` y `cocineroId`
   - Backend valida que solo el cocinero que tomó el plato pueda finalizarlo

4. **Sincronización:**
   - Socket.io emite `plato-procesando` cuando alguien toma un plato
   - Todas las apps reciben el evento y actualizan la UI
   - Badge muestra "Tú" (verde) o nombre del cocinero (amarillo)

---

**Versión del Documento:** 1.9  
**Última Actualización:** Marzo 2026  
**Cambios en esta versión:**
- Reintegrado sistema multi-cocinero v7.2 de forma compatible
- Botón contextual en barra inferior reemplaza botón simple "Finalizar Platos"
- Badges de cocinero en PlatoPreparacion
- Validación de propiedad en backend
- **v7.2.1**: Ciclo de 3 estados diferenciado (amarillo/rojo/verde)
- **v7.2.1**: Estado visual "dejar" para liberar platos tomados
- **v7.2.1**: Corrección en cálculo de platos seleccionados para botón contextual
- **v7.2.1**: Estado visual automático para platos con procesandoPor asignado


