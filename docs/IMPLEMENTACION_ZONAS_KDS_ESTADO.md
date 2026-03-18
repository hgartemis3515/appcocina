# Estado de Implementación - Integración Cocineros y Zonas KDS

**Fecha:** Marzo 2026  
**Estado:** Fase 1-3 Completada, Fase 4-7 Pendiente

---

## Archivos Creados/Modificados

### ✅ Completados

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `appcocina/docs/INTEGRACION_COCINEROS_ZONAS_KDS.md` | Documento de análisis y diseño completo | ✅ Creado |
| `appcocina/src/utils/kdsFilters.js` | Módulo de filtros KDS para platos y comandas | ✅ Creado |
| `appcocina/src/contexts/AuthContext.jsx` | Contexto actualizado con zonas y configuración | ✅ Modificado |
| `appcocina/src/components/common/ZoneSelector.jsx` | Componente para seleccionar zonas activas | ✅ Creado |
| `appcocina/src/hooks/useSocketCocina.js` | Hook actualizado para eventos de configuración | ✅ Modificado |

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

Nuevas funciones:
- `loadCocineroConfig()` - Carga config + zonas del backend
- `updateCocineroConfig()` - Actualiza config desde Socket
- `setZonaActiva()` - Cambia zona activa
- `getZonasActivas()` - Obtiene zonas activas

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

---

## Pendientes de Implementación

### Fase 4: Integración en ComandaStyle.jsx

**Prioridad: Alta**

Modificaciones necesarias en `appcocina/src/components/Principal/comandastyle.jsx`:

```javascript
// 1. Importar módulos
import { 
  aplicarFiltrosAComandas, 
  calcularEstadisticasFiltrado 
} from '../../utils/kdsFilters';
import { CocineroInfo, ZoneChipsCompact } from '../common/ZoneSelector';

// 2. Obtener configuración del contexto
const { 
  cocineroConfig, 
  zonaActivaId, 
  setZonaActiva, 
  getZonasActivas 
} = useAuth();

// 3. Crear función de filtrado centralizada
const filtrarComandas = useCallback((comandas) => {
  if (!cocineroConfig) return comandas;
  
  const configConZona = {
    ...cocineroConfig,
    zonaActivaId
  };
  
  return aplicarFiltrosAComandas(comandas, configConZona);
}, [cocineroConfig, zonaActivaId]);

// 4. Modificar obtenerComandas
const obtenerComandas = useCallback(async () => {
  // ... código existente ...
  const comandasFiltradas = filtrarComandas(comandasValidas);
  setComandas(comandasFiltradas);
  setFilteredComandas(comandasFiltradas);
}, [filtrarComandas]);

// 5. Modificar handleNuevaComanda
const handleNuevaComanda = useCallback((nuevaComanda) => {
  // Verificar si debe mostrarse según filtros
  if (!debeMostrarComanda(nuevaComanda, cocineroConfig?.filtrosComandas, 
      cocineroConfig?.zonasAsignadas, zonaActivaId)) {
    console.log('[FILTRO] Nueva comanda oculta:', nuevaComanda.comandaNumber);
    return;
  }
  // ... resto del código ...
}, [cocineroConfig, zonaActivaId]);

// 6. Agregar handler para actualización de config
const handleConfigCocineroActualizada = useCallback((data) => {
  if (data.refresh) {
    loadCocineroConfig();
  } else if (data.config) {
    updateCocineroConfig(data.config);
    // Re-aplicar filtros
    const reFiltradas = filtrarComandas(comandas);
    setComandas(reFiltradas);
    setFilteredComandas(reFiltradas);
  }
}, [loadCocineroConfig, updateCocineroConfig, filtrarComandas, comandas]);

// 7. Actualizar header para mostrar zonas
<div className="flex items-center gap-4">
  <CocineroInfo
    aliasCocinero={cocineroConfig?.aliasCocinero}
    userName={userName}
    zonasAsignadas={cocineroConfig?.zonasAsignadas}
    zonaActivaId={zonaActivaId}
    onZonaChange={setZonaActiva}
    nightMode={config.nightMode}
  />
</div>
```

### Fase 5: Actualizar ConfigModal.jsx

**Prioridad: Media**

Modificar para:
- Mostrar valores del backend como defaults
- Indicar configuración del servidor vs preferencia local
- Sincronizar cambios con el servidor (opcional)

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
1. Cocinero sin zonas asignadas
2. Cocinero con una zona
3. Cocinero con múltiples zonas
4. Cambio de zona activa
5. Actualización de configuración en tiempo real
6. Backend caído (fallback)
7. Métricas de filtrado en consola

---

## Uso de los Nuevos Componentes

### Ejemplo en Header

```jsx
import { CocineroInfo } from '../common/ZoneSelector';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { 
    userName, 
    cocineroConfig, 
    zonaActivaId, 
    setZonaActiva 
  } = useAuth();

  return (
    <header>
      <CocineroInfo
        aliasCocinero={cocineroConfig?.aliasCocinero}
        userName={userName}
        zonasAsignadas={cocineroConfig?.zonasAsignadas}
        zonaActivaId={zonaActivaId}
        onZonaChange={setZonaActiva}
        nightMode={true}
      />
    </header>
  );
};
```

### Ejemplo de Filtrado

```jsx
import { aplicarFiltrosAComandas, calcularEstadisticasFiltrado } from '../../utils/kdsFilters';
import { useAuth } from '../../contexts/AuthContext';

const ComandaList = () => {
  const { cocineroConfig, zonaActivaId } = useAuth();
  const [comandas, setComandas] = useState([]);

  useEffect(() => {
    const configCompleta = {
      ...cocineroConfig,
      zonaActivaId
    };
    
    const filtradas = aplicarFiltrosAComandas(comandasOriginales, configCompleta);
    setComandas(filtradas);

    // Debug
    if (process.env.NODE_ENV === 'development') {
      const stats = calcularEstadisticasFiltrado(comandasOriginales, filtradas);
      console.log('Estadísticas de filtrado:', stats);
    }
  }, [comandasOriginales, cocineroConfig, zonaActivaId]);

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
| `config-cocinero-actualizada` | Server→App | Notificar cambio de config | ❌ Pendiente |
| `zona-asignada` | Server→App | Notificar nueva zona | ❌ Pendiente |
| `zona-removida` | Server→App | Notificar zona removida | ❌ Pendiente |

---

## Próximos Pasos Recomendados

1. **Inmediato:** Implementar Fase 4 (integración en ComandaStyle.jsx)
2. **Corto plazo:** Implementar eventos Socket.io en backend
3. **Medio plazo:** Completar Fase 5 (ConfigModal sincronizado)
4. **Largo plazo:** Testing exhaustivo y documentación de usuario

---

## Notas Técnicas

- Los filtros se aplican en memoria sobre los datos ya recibidos
- No se requieren llamadas adicionales al backend por cada evento Socket
- La configuración se cachea en localStorage para restauración rápida
- Las zonas inactivas (`activo: false`) se ignoran en los filtros
- El modo inclusión/exclusión se aplica según configuración de cada zona
