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

---

## 🚀 Sugerencias y Recomendaciones Adicionales (v3.0)

Esta sección extiende la documentación con propuestas específicas para mejorar la gestión de zonas, el procesamiento colaborativo y la escalabilidad del sistema KDS.

---

### 💡 Mejoras Sugeridas para ZoneSelector y Filtrado

#### 1. Indicador Visual de Carga por Zona

```jsx
// Badge con contador de comandas por zona
<ZoneButton>
  <span className="zone-name">{zona.nombre}</span>
  <Badge variant={getUrgencyVariant(zona.comandasPendientes)}>
    {zona.comandasPendientes}
  </Badge>
  {zona.tiempoPromedio > 15 && (
    <WarningIcon className="pulse-warning" />
  )}
</ZoneButton>

// Función de urgencia
const getUrgencyVariant = (count) => {
  if (count === 0) return 'success';
  if (count < 5) return 'info';
  if (count < 10) return 'warning';
  return 'danger';
};
```

#### 2. Filtro de Zona en Tiempo Real

```javascript
// Hook para filtrado reactivo por zona
const useZonaFilter = (comandas, zonaActivaId) => {
  return useMemo(() => {
    if (!zonaActivaId || zonaActivaId === 'todas') {
      return comandas;
    }
    
    return comandas.filter(comanda => {
      // Filtrar por zona asignada al plato
      return comanda.platos.some(plato => 
        plato.zonaId === zonaActivaId || 
        plato.plato?.zonaId === zonaActivaId
      );
    });
  }, [comandas, zonaActivaId]);
};
```

#### 3. Persistencia de Zona Seleccionada

```javascript
// Guardar zona activa en localStorage por usuario
const setZonaActiva = (zonaId) => {
  const userId = getCurrentUserId();
  localStorage.setItem(`zonaActiva_${userId}`, zonaId);
  // Actualizar estado
};

// Restaurar al cargar
useEffect(() => {
  const savedZona = localStorage.getItem(`zonaActiva_${userId}`);
  if (savedZona && zonas.includes(savedZona)) {
    setZonaActiva(savedZona);
  }
}, []);
```

---

### 👨‍🍳 Sistema de Procesamiento por Zona

#### Descripción

Cada cocinero puede "tomar" comandas o platos de su zona asignada, indicando a los demás que está trabajando en ellos. Esto evita duplicación de trabajo y mejora la coordinación.

#### 1. Modelo de Datos Extendido para Zonas

```javascript
// Extensión del modelo de zona
{
  _id: "zona_parrilla",
  nombre: "Parrilla",
  descripcion: "Cocina de parrilla y carnes",
  activo: true,
  capacidad: 5, // Máximo cocineros simultáneos
  
  // NUEVOS CAMPOS
  cocinerosActivos: [
    {
      cocineroId: "usr_123",
      nombre: "Juan Pérez",
      conectadoDesde: "2026-03-19T10:00:00Z",
      comandasEnProceso: 3
    }
  ],
  comandasCola: 8, // Comandas esperando
  tiempoPromedio: 12 // Minutos promedio
}

// Extensión del modelo de cocinero
{
  _id: "usr_123",
  name: "Juan Pérez",
  alias: "JuanParrilla",
  rol: "cocinero",
  
  // NUEVOS CAMPOS
  zonasAsignadas: ["zona_parrilla", "zona_ensamblaje"],
  zonaActivaActual: "zona_parrilla",
  comandasEnProceso: [
    { comandaId: "cmd_001", platos: ["plato_1", "plato_2"] }
  ],
  configuracionKDS: {
    vistaDefault: "tabla",
    animaciones: false,
    sonidos: true
  }
}
```

#### 2. Endpoint de Asignación de Zona

```javascript
// POST /api/cocina/cocinero/:id/zona
router.post('/cocinero/:id/zona', async (req, res) => {
  const { zonaId, accion } = req.body; // accion: 'unirse' | 'salir'
  
  const cocinero = await Cocinero.findById(req.params.id);
  
  if (accion === 'unirse') {
    // Verificar capacidad
    const zona = await Zona.findById(zonaId);
    if (zona.cocinerosActivos.length >= zona.capacidad) {
      return res.status(400).json({ 
        error: 'Zona a capacidad máxima' 
      });
    }
    
    // Agregar cocinero a zona
    await Zona.updateOne(
      { _id: zonaId },
      { $push: { cocinerosActivos: cocinero._id } }
    );
    
    // Actualizar estado del cocinero
    await Cocinero.updateOne(
      { _id: cocinero._id },
      { zonaActivaActual: zonaId }
    );
    
    // Emitir evento Socket
    io.to(`zona-${zonaId}`).emit('cocinero-unido', {
      cocinero: cocinero.toObject(),
      timestamp: new Date()
    });
  }
  
  res.json({ success: true });
});
```

#### 3. UI de Selección de Zona Mejorada

```jsx
const ZoneSelectorEnhanced = ({ zonas, zonaActiva, onSelect, cocineroId }) => {
  return (
    <div className="zone-selector">
      <div className="zone-header">
        <h4>Selecciona tu zona de trabajo</h4>
        <Badge>{zonas.length} zonas activas</Badge>
      </div>
      
      <div className="zones-grid">
        {zonas.map(zona => (
          <ZoneCard 
            key={zona.id}
            active={zonaActiva === zona.id}
            onClick={() => onSelect(zona.id)}
          >
            <div className="zone-info">
              <span className="zone-name">{zona.nombre}</span>
              <span className="zone-desc">{zona.descripcion}</span>
            </div>
            
            <div className="zone-stats">
              <div className="stat">
                <UsersIcon />
                <span>{zona.cocinerosActivos?.length || 0}/{zona.capacidad}</span>
              </div>
              <div className="stat">
                <ClipboardIcon />
                <span>{zona.comandasCola || 0}</span>
              </div>
              <div className="stat">
                <ClockIcon />
                <span>{zona.tiempoPromedio || 0}min</span>
              </div>
            </div>
            
            {/* Indicador de cocineros en la zona */}
            <div className="cocineros-activos">
              {zona.cocinerosActivos?.slice(0, 3).map(c => (
                <Avatar 
                  key={c.cocineroId} 
                  name={c.nombre}
                  size="xs"
                />
              ))}
              {zona.cocinerosActivos?.length > 3 && (
                <span>+{zona.cocinerosActivos.length - 3}</span>
              )}
            </div>
          </ZoneCard>
        ))}
      </div>
      
      <Button variant="secondary" onClick={() => onSelect('todas')}>
        Ver Todas las Comandas
      </Button>
    </div>
  );
};
```

---

### 🔄 Procesamiento de Plato/Comanda con Identificación de Cocinero

#### Descripción Funcional

Cuando un cocinero comienza a preparar un plato o comanda, el sistema debe:
1. Registrar quién está procesando
2. Mostrar visualmente esta información a otros cocineros
3. Opcionalmente bloquear el plato/comanda para evitar duplicación

#### 1. Flujo de Toma de Plato

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATO DISPONIBLE                          │
│  [  ☐ 1 Papa a la huancaína                    ]             │
│  Estado: En espera                                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              COCINERO 1 TOMA EL PLATO                        │
│  Click en "Tomar" → API: PUT /plato/procesando              │
│                                                              │
│  [  🟡 1 Papa a la huancaína                    ]             │
│  Estado: En proceso                                          │
│  └─ 👨‍🍳 Juan P. (desde 14:30)                                │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐      ┌─────────────────────────────────┐
│  OTROS COCINEROS    │      │      COCINERO 1 TERMINA          │
│  ven el plato con:  │      │  Click "Finalizar"               │
│  "Juan lo prepara"  │      │  API: PUT /plato/estado         │
│  NO pueden tomarlo  │      │  Estado: recoger                │
└─────────────────────┘      │  procesadoPor: Juan P.          │
                              └─────────────────────────────────┘
```

#### 2. Componente de Plato con Indicador de Procesamiento

```jsx
const PlatoConProcesamiento = ({ 
  plato, 
  comandaId, 
  onTomarPlato, 
  onLiberarPlato,
  usuarioActual 
}) => {
  const estaSiendoProcesado = plato.procesandoPor;
  const esMiProceso = plato.procesandoPor?.cocineroId === usuarioActual.id;
  const estaListo = plato.estado === 'recoger';
  
  return (
    <motion.div 
      className={`plato-item ${estaSiendoProcesado ? 'en-proceso' : ''}`}
      variants={platoVariants}
    >
      {/* Checkbox para finalizar */}
      {!estaListo && (
        <Checkbox 
          disabled={estaSiendoProcesado && !esMiProceso}
          checked={plato.isChecked}
          onChange={() => onTomarPlato(comandaId, plato._id)}
        />
      )}
      
      {/* Info del plato */}
      <div className="plato-info">
        <span className="cantidad">{plato.cantidad}</span>
        <span className="nombre">{plato.plato?.nombre}</span>
        
        {/* Indicador de procesamiento */}
        {estaSiendoProcesado && !estaListo && (
          <Badge 
            variant={esMiProceso ? 'success' : 'warning'}
            className="procesando-badge"
          >
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              👨‍🍳
            </motion.span>
            {esMiProceso ? 'Tu' : plato.procesandoPor.nombre.split(' ')[0]}
            <Tooltip>
              {plato.procesandoPor.nombre} está preparando este plato
              desde las {formatTime(plato.procesandoPor.timestamp)}
            </Tooltip>
          </Badge>
        )}
        
        {/* Indicador de quien terminó */}
        {estaListo && plato.procesadoPor && (
          <Badge variant="success" className="procesado-badge">
            ✓ {plato.procesadoPor.nombre.split(' ')[0]}
          </Badge>
        )}
      </div>
      
      {/* Botón de liberar (solo para quien tomó) */}
      {esMiProceso && (
        <Button 
          size="xs" 
          variant="ghost"
          onClick={() => onLiberarPlato(comandaId, plato._id)}
        >
          Liberar
        </Button>
      )}
    </motion.div>
  );
};
```

#### 3. Lógica de Toma de Comanda Completa

```javascript
// Hook para manejo de procesamiento
const useProcesamiento = () => {
  const { user } = useAuth();
  
  const tomarComanda = async (comandaId) => {
    try {
      await axios.put(`/api/comanda/${comandaId}/procesando`, {
        cocineroId: user.id,
        nombre: user.name
      });
      
      toast.success('Comanda asignada a ti');
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Esta comanda ya está siendo procesada');
      } else {
        toast.error('Error al tomar la comanda');
      }
    }
  };
  
  const liberarComanda = async (comandaId) => {
    await axios.delete(`/api/comanda/${comandaId}/procesando`);
    toast.info('Comanda liberada');
  };
  
  const finalizarComanda = async (comandaId) => {
    await axios.put(`/api/comanda/${comandaId}/status`, {
      nuevoStatus: 'entregado',
      completadoPor: {
        cocineroId: user.id,
        nombre: user.name
      }
    });
    
    toast.success('Comanda completada');
  };
  
  return { tomarComanda, liberarComanda, finalizarComanda };
};
```

#### 4. Eventos Socket para Sincronización

```javascript
// Frontend - Manejo de eventos
useEffect(() => {
  socket.on('plato-procesando', (data) => {
    // Actualizar UI con info del cocinero
    updatePlatoState(data.comandaId, data.platoId, {
      procesandoPor: data.cocinero
    });
    
    // Mostrar notificación si no soy yo
    if (data.cocinero.cocineroId !== currentUser.id) {
      toast.info(`${data.cocinero.nombre} tomó un plato`);
    }
  });
  
  socket.on('plato-liberado', (data) => {
    updatePlatoState(data.comandaId, data.platoId, {
      procesandoPor: null
    });
  });
  
  socket.on('comanda-procesando', (data) => {
    updateComandaState(data.comandaId, {
      procesandoPor: data.cocinero
    });
  });
  
  return () => {
    socket.off('plato-procesando');
    socket.off('plato-liberado');
    socket.off('comanda-procesando');
  };
}, []);
```

---

### 📊 Recomendaciones para Escalar con Zonas

#### 1. Distribución de Carga por Zona

```javascript
// Algoritmo de balanceo de carga
const calcularDistribucionOptima = (zonas, cocineros) => {
  const distribucion = {};
  
  zonas.forEach(zona => {
    const cocinerosEnZona = cocineros.filter(
      c => c.zonasAsignadas.includes(zona.id)
    );
    
    const comandasPorCocinero = Math.ceil(
      zona.comandasPendientes / cocinerosEnZona.length
    );
    
    distribucion[zona.id] = {
      cocineros: cocinerosEnZona,
      comandasAsignadas: comandasPorCocinero,
      capacidadAdecuada: zona.comandasPendientes <= zona.capacidad * 5
    };
  });
  
  return distribucion;
};
```

#### 2. Alertas de Sobrecarga por Zona

```jsx
const ZoneAlertSystem = ({ zonas }) => {
  const alertas = zonas.filter(z => 
    z.comandasCola > z.cocinerosActivos.length * 5
  );
  
  if (alertas.length === 0) return null;
  
  return (
    <AlertContainer>
      {alertas.map(zona => (
        <Alert key={zona.id} variant="warning">
          ⚠️ La zona <strong>{zona.nombre}</strong> tiene {zona.comandasCola} 
          comandas en cola con solo {zona.cocinerosActivos.length} cocinero(s).
          Considera solicitar apoyo.
        </Alert>
      ))}
    </AlertContainer>
  );
};
```

#### 3. Historial de Rendimiento por Zona

```javascript
// Endpoint para métricas
GET /api/cocina/zonas/:zonaId/metricas?periodo=dia

// Response
{
  zonaId: "zona_parrilla",
  periodo: "2026-03-19",
  metricas: {
    comandasProcesadas: 145,
    tiempoPromedio: 12.5,
    tiempoMaximo: 35,
    tiempoMinimo: 5,
    platosPorHora: 48,
    cocinerosActivos: [
      {
        nombre: "Juan Pérez",
        platosProcesados: 65,
        tiempoPromedio: 11.2
      }
    ],
    alertasGeneradas: 8,
    picosDemanda: ["12:30", "13:45", "20:15"]
  }
}
```

---

### 📋 Checklist de Implementación por Zona

#### Backend
- [ ] Modelo de Zona extendido con cocinerosActivos
- [ ] Modelo de Cocinero extendido con zonaActivaActual
- [ ] Endpoint POST /cocinero/:id/zona (unirse/salir)
- [ ] Endpoint PUT /comanda/:id/procesando
- [ ] Endpoint PUT /comanda/:id/plato/:platoId/procesando
- [ ] Eventos Socket: cocinero-unido, plato-procesando, comanda-procesando
- [ ] Endpoint de métricas por zona

#### Frontend
- [ ] ZoneSelectorEnhanced con stats de zona
- [ ] PlatoConProcesamiento con badge de cocinero
- [ ] Hook useProcesamiento
- [ ] Toasts de notificación de procesamiento
- [ ] Persistencia de zona seleccionada por usuario
- [ ] Alertas de sobrecarga por zona
- [ ] Dashboard de métricas por zona

#### Testing
- [ ] Test: Múltiples cocineros en misma zona
- [ ] Test: Bloqueo de plato tomado por otro
- [ ] Test: Liberación de plato/comanda
- [ ] Test: Métricas por zona
- [ ] Test: Alertas de sobrecarga

---

**Versión del Documento:** 2.0  
**Última Actualización:** Marzo 2026  
**Secciones agregadas:** Sugerencias y Recomendaciones v3.0
