# Estado de Implementación - Integración Cocineros y Zonas KDS

**Fecha:** Marzo 2026  
**Estado:** Fase 1-5 Completada, Fase 6-7 Pendiente

---

## Archivos Creados/Modificados

### ✅ Completados

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `appcocina/docs/INTEGRACION_COCINEROS_ZONAS_KDS.md` | Documento de análisis y diseño completo | ✅ Creado |
| `appcocina/src/utils/kdsFilters.js` | Módulo de filtros KDS para platos y comandas | ✅ Creado |
| `appcocina/src/contexts/AuthContext.jsx` | Contexto actualizado con zonas, configuración y viewMode | ✅ Modificado |
| `appcocina/src/components/common/ZoneSelector.jsx` | Componente para seleccionar zonas activas | ✅ Creado |
| `appcocina/src/hooks/useSocketCocina.js` | Hook actualizado para eventos de configuración | ✅ Modificado |
| `appcocina/src/components/pages/MenuPage.jsx` | Menú con selección de Vista General/Personalizada | ✅ Modificado |
| `appcocina/src/components/Principal/Comandastyle.jsx` | Integración completa de filtros y vistas | ✅ Modificado |

---

## Funcionalidades Implementadas

### 1. Módulo kdsFilters.js

Funciones principales:
- `debeMostrarPlato()` - Determina si un plato debe mostrarse según filtros
- `debeMostrarComanda()` - Determina si una comanda debe mostrarse
- `aplicarFiltrosAComandas()` - Aplica todos los filtros a una lista
- `filtrarPlatosDeComanda()` - Filtra platos de una comanda específica
- `calcularEstadisticasFiltrado()` - Estadísticas para debugging
- `getConfiguracionEfectiva()` - Combina config servidor + local

### 2. AuthContext Expandido

Nuevos estados:
- `configError` - Error al cargar configuración
- `zonaActivaId` - ID de zona seleccionada actualmente
- `viewMode` - Modo de vista actual ('general' | 'personalizada')

Nuevas funciones:
- `loadCocineroConfig()` - Carga config + zonas del backend
- `updateCocineroConfig()` - Actualiza config desde Socket
- `setZonaActiva()` - Cambia zona activa
- `getZonasActivas()` - Obtiene zonas activas
- `setViewMode()` - Cambia modo de vista (general/personalizada)

### 3. ZoneSelector Componente

Variantes:
- `ZoneSelector` - Versión completa con chips y descripción
- `ZoneChipsCompact` - Versión compacta para header
- `CocineroInfo` - Info del cocinero + zonas en header
- `FilterStatusBadge` - Badge indicando filtros activos

### 4. useSocketCocina Actualizado

Nuevos eventos manejados:
- `config-cocinero-actualizada` - Config actualizada por admin
- `zona-asignada` - Nueva zona asignada
- `zona-removida` - Zona removida

### 5. Sistema de Vistas KDS (NUEVO)

#### Vista General
- Muestra todas las comandas del día sin filtros de cocinero/Zonas KDS
- Solo validaciones técnicas básicas (comandas activas, con platos, etc.)
- Indicador visual en header: "👁 Vista General"
- Selector de zonas atenuado (solo informativo)

#### Vista Personalizada
- Aplica filtros de `kdsFilters.js` usando `cocineroConfig` y `zonasAsignadas`
- Filtrado en tiempo real según `zonaActivaId`
- Indicador visual en header: "🔽 Vista Personalizada"
- Chips de zonas activas con selector funcional
- Badge de estadísticas de filtrado (comandos ocultos/visibles)

#### Flujo de Filtrado Centralizado
```javascript
// Función centralizada en ComandaStyle.jsx
const filtrarComandasSegunVista = useCallback((comandasAFiltrar) => {
  if (viewMode === 'general') {
    // Sin filtros de zonas/config
    return comandasAFiltrar;
  }
  // Vista Personalizada: aplicar kdsFilters
  return aplicarFiltrosAComandas(comandasAFiltrar, {
    ...cocineroConfig,
    zonaActivaId
  });
}, [viewMode, cocineroConfig, zonaActivaId]);
```

#### Integración en Socket Handlers
- `handleNuevaComanda` - Filtra antes de agregar al estado
- `handleComandaActualizada` - Re-filtra comanda actualizada
- `obtenerComandas` - Aplica filtros en carga inicial

---

## Pendientes de Implementación

### Fase 6: Backend - Implementar eventos Socket.io

**Prioridad: Alta**

En `Backend-LasGambusinas/src/socket/events.js`:

```javascript
// Agregar función global
global.emitConfigCocineroActualizada = (cocineroId, config) => {
  // Emitir al room específico del cocinero
  cocinaNamespace.to(`cocinero-${cocineroId}`).emit('config-cocinero-actualizada', {
    cocineroId,
    config,
    timestamp: new Date()
  });
  
  // También emitir al namespace admin
  adminNamespace.emit('cocinero-config-actualizada', { cocineroId });
};
```

### Fase 7: Testing

**Escenarios a probar:**
1. ✅ Cocinero sin zonas asignadas → Vista General sugerida
2. ✅ Cocinero con zonas → Vista Personalizada por defecto
3. ✅ Cambio entre vistas sin recargar página
4. ✅ Zonas activas/inactivas, cambio de zonaActivaId
5. ⏳ Eventos config-cocinero-actualizada mientras el cocinero está en cada vista
6. ⏳ Persistencia de viewMode al recargar página
7. ⏳ Filtrado en tiempo real con nuevas comandas vía Socket

---

## Uso de los Nuevos Componentes

### Ejemplo en Header

```jsx
import { CocineroInfo, FilterStatusBadge } from '../common/ZoneSelector';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { 
    userName, 
    cocineroConfig, 
    zonaActivaId, 
    setZonaActiva,
    viewMode,
    setViewMode
  } = useAuth();

  return (
    <header>
      {/* Indicador de modo de vista */}
      <button onClick={() => setViewMode(viewMode === 'general' ? 'personalizada' : 'general')}>
        {viewMode === 'general' ? '👁 Vista General' : '🔽 Vista Personalizada'}
      </button>
      
      {/* Info del cocinero y zonas (solo en personalizada) */}
      {viewMode === 'personalizada' && (
        <CocineroInfo
          aliasCocinero={cocineroConfig?.aliasCocinero}
          userName={userName}
          zonasAsignadas={cocineroConfig?.zonasAsignadas}
          zonaActivaId={zonaActivaId}
          onZonaChange={setZonaActiva}
          nightMode={true}
        />
      )}
    </header>
  );
};
```

### Ejemplo de Filtrado

```jsx
import { aplicarFiltrosAComandas, calcularEstadisticasFiltrado } from '../../utils/kdsFilters';
import { useAuth } from '../../contexts/AuthContext';

const ComandaList = () => {
  const { cocineroConfig, zonaActivaId, viewMode } = useAuth();
  const [comandasOriginales, setComandasOriginales] = useState([]);

  // Filtrar según modo de vista
  const comandasVisibles = useMemo(() => {
    if (viewMode === 'general') {
      return comandasOriginales;
    }
    
    const configCompleta = {
      ...cocineroConfig,
      zonaActivaId
    };
    
    return aplicarFiltrosAComandas(comandasOriginales, configCompleta);
  }, [comandasOriginales, cocineroConfig, zonaActivaId, viewMode]);

  return (/* ... */);
};
```

---

## Dependencias Backend

### Endpoints Requeridos

| Endpoint | Método | Propósito | Estado |
|----------|--------|-----------|--------|
| `/api/cocineros/:id/config` | GET | Obtener configuración KDS + zonas | ✅ Existe |
| `/api/cocineros/:id/zonas` | GET | Obtener solo zonas asignadas | ⚠️ Verificar |
| `/api/cocineros/:id/conexion` | POST | Registrar inicio de sesión | ✅ Existe |

### Eventos Socket.io

| Evento | Dirección | Propósito | Estado |
|--------|-----------|-----------|--------|
| `config-cocinero-actualizada` | Server→App | Notificar cambio de config | ⏳ Pendiente |
| `zona-asignada` | Server→App | Notificar nueva zona | ⏳ Pendiente |
| `zona-removida` | Server→App | Notificar zona removida | ⏳ Pendiente |

---

## Próximos Pasos Recomendados

1. **Inmediato:** Probar el flujo completo de vistas en la App
2. **Corto plazo:** Implementar eventos Socket.io en backend
3. **Medio plazo:** Testing exhaustivo con múltiples cocineros
4. **Largo plazo:** Documentación de usuario final

---

## Notas Técnicas

- Los filtros se aplican en memoria sobre los datos ya recibidos
- No se requieren llamadas adicionales al backend por cada evento Socket
- La configuración se cachea en localStorage para restauración rápida
- Las zonas inactivas (`activo: false`) se ignoran en los filtros
- El modo inclusión/exclusión se aplica según configuración de cada zona
- El `viewMode` se persiste en localStorage con clave `cocinaViewMode`
- Cambiar entre vistas NO recarga las comandas del backend
- Las estadísticas de filtrado se calculan en cada cambio de vista/zona

---

## Seguridad

- La carga de `cocineroConfig` y `zonasAsignadas` siempre proviene del backend
- El `viewMode` es solo una preferencia de UI, no afecta permisos
- Aunque en Vista General se muestran todas las comandas, la App sigue respetando el rol del usuario
- El evento `config-cocinero-actualizada` solo re-aplica filtros en Vista Personalizada
- El selector de zonas en el header solo aparece en Vista Personalizada

---

**Fin del Documento**
