# Estado de Implementación - Integración Cocineros y Zonas KDS

**Fecha:** Marzo 2026  
**Estado:** Refactorización completada - Dos componentes separados

---

## Arquitectura Actual (v2.0)

### Separación de Componentes KDS

Se ha refactorizado la arquitectura para separar claramente las dos vistas del tablero KDS:

| Componente | Vista | Descripción |
|------------|-------|-------------|
| `Comandastyle.jsx` | Vista General | Muestra todas las comandas del día sin filtros de zonas |
| `ComandastylePerso.jsx` | Vista Personalizada | Filtra comandas según zonas y configuración del cocinero |

### Flujo de Navegación

```
MenuPage.jsx
    │
    ├─ "Vista General" → onNavigate('COCINA') → Comandastyle.jsx
    │
    └─ "Vista Personalizada" → onNavigate('COCINA_PERSONALIZADA') → ComandastylePerso.jsx
```

---

## Archivos Creados/Modificados

### ✅ Completados

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `appcocina/src/components/Principal/Comandastyle.jsx` | Vista General KDS sin filtros de zonas | ✅ Refactorizado |
| `appcocina/src/components/Principal/ComandastylePerso.jsx` | Vista Personalizada KDS con filtros de zonas | ✅ Creado |
| `appcocina/src/components/pages/MenuPage.jsx` | Menú con navegación a componentes específicos | ✅ Modificado |
| `appcocina/src/components/App.jsx` | Router con rutas COCINA y COCINA_PERSONALIZADA | ✅ Modificado |
| `appcocina/src/utils/kdsFilters.js` | Módulo de filtros KDS para platos y comandas | ✅ Creado |
| `appcocina/src/contexts/AuthContext.jsx` | Contexto con zonas y configuración | ✅ Modificado |
| `appcocina/src/components/common/ZoneSelector.jsx` | Componente para seleccionar zonas activas | ✅ Creado |

---

## Funcionalidades por Componente

### 1. Comandastyle.jsx (Vista General)

**Características:**
- Muestra TODAS las comandas del día sin filtros de zonas/cocinero
- Solo validaciones técnicas básicas (IsActive, platos con nombre, status en_espera)
- Indicador fijo en header: "👁 Vista General"
- NO depende de `cocineroConfig`, `zonaActivaId`, `viewMode`
- NO importa ni usa `kdsFilters.js` ni `ZoneSelector.jsx`

**Imports:**
```javascript
import { useAuth } from "../../contexts/AuthContext";
// NO importa kdsFilters ni ZoneSelector
```

**Del AuthContext usa solo:**
```javascript
const { userRole, canPerformSensitiveActions, getToken, userName } = useAuth();
```

### 2. ComandastylePerso.jsx (Vista Personalizada)

**Características:**
- Aplica filtros de `kdsFilters.js` usando `cocineroConfig` y `zonasAsignadas`
- Filtrado en tiempo real según `zonaActivaId`
- Indicador fijo en header: "🔽 Vista Personalizada"
- Muestra `CocineroInfo` con alias y zonas
- Badge de estadísticas de filtrado

**Imports:**
```javascript
import { 
  aplicarFiltrosAComandas, 
  debeMostrarComanda, 
  debeMostrarPlato,
  calcularEstadisticasFiltrado 
} from "../../utils/kdsFilters";
import { CocineroInfo, ZoneChipsCompact, FilterStatusBadge } from "../common/ZoneSelector";
```

**Del AuthContext usa:**
```javascript
const { 
  userRole, 
  canPerformSensitiveActions, 
  getToken,
  cocineroConfig,
  configLoading,
  configError,
  zonaActivaId,
  setZonaActiva,
  getZonasActivas,
  userName
} = useAuth();
```

**Función de filtrado:**
```javascript
const filtrarComandasPersonalizadas = useCallback((comandasAFiltrar) => {
  // ... lógica de filtrado usando cocineroConfig y zonaActivaId
  return aplicarFiltrosAComandas(comandasAFiltrar, configExtendida);
}, [cocineroConfig, zonaActivaId, configLoading]);
```

---

## Módulo kdsFilters.js

Funciones principales:
- `debeMostrarPlato()` - Determina si un plato debe mostrarse según filtros
- `debeMostrarComanda()` - Determina si una comanda debe mostrarse
- `aplicarFiltrosAComandas()` - Aplica todos los filtros a una lista
- `filtrarPlatosDeComanda()` - Filtra platos de una comanda específica
- `calcularEstadisticasFiltrado()` - Estadísticas para debugging
- `getConfiguracionEfectiva()` - Combina config servidor + local

---

## Router (App.jsx)

```javascript
// Rutas disponibles
const VIEWS = ['LOADING', 'LOGIN', 'MENU', 'COCINA', 'COCINA_PERSONALIZADA'];

// COCINA = Vista General → Comandastyle.jsx
// COCINA_PERSONALIZADA = Vista Personalizada → ComandastylePerso.jsx

// Persistencia en localStorage
localStorage.setItem('cocinaLastView', 'COCINA' | 'COCINA_PERSONALIZADA');
```

---

## Pendientes de Implementación

### Backend - Eventos Socket.io

**Prioridad: Alta**

En `Backend-LasGambusinas/src/socket/events.js`:

```javascript
// Agregar función global
global.emitConfigCocineroActualizada = (cocineroId, config) => {
  cocinaNamespace.to(`cocinero-${cocineroId}`).emit('config-cocinero-actualizada', {
    cocineroId,
    config,
    timestamp: new Date()
  });
};
```

### Testing

**Escenarios a probar:**
1. ✅ Vista General muestra todas las comandas
2. ✅ Vista Personalizada filtra según zonas
3. ✅ Navegación entre vistas desde el menú
4. ⏳ Cambio de zona activa en Vista Personalizada
5. ⏳ Eventos config-cocinero-actualizada
6. ⏳ Persistencia al recargar página

---

## Guía de Modificación

### Si necesitas cambiar la lógica del tablero KDS general:

**Archivo a modificar:** `Comandastyle.jsx`

Ejemplos:
- Cambiar tiempos de alerta (amarillo/rojo)
- Modificar paginación
- Agregar/quitar botones de acción
- Cambiar ordenamiento de comandas

### Si necesitas cambiar los filtros de zonas:

**Archivo a modificar:** `ComandastylePerso.jsx`

Ejemplos:
- Modificar lógica de filtrado
- Cambiar cómo se muestran las zonas
- Ajustar estadísticas de filtrado

**También podría afectar:** `kdsFilters.js`

### Si necesitas cambiar la lógica compartida:

**Archivos a modificar:** Ambos componentes

Considerar extraer a un hook compartido (`useComandastyleCore`) en el futuro.

---

## Notas Técnicas

- Los filtros se aplican en memoria sobre los datos ya recibidos
- No se requieren llamadas adicionales al backend por cada evento Socket
- La configuración se cachea en localStorage para restauración rápida
- Las zonas inactivas (`activo: false`) se ignoran en los filtros
- Cada componente es independiente y no comparte estado con el otro
- La navegación se maneja mediante el router interno en `App.jsx`

---

## Seguridad

- La carga de `cocineroConfig` y `zonasAsignadas` siempre proviene del backend
- Solo `ComandastylePerso` depende de la configuración del cocinero
- `Comandastyle` (Vista General) no requiere configuración personalizada
- Ambas vistas respetan el rol del usuario autenticado

---

**Fin del Documento**
