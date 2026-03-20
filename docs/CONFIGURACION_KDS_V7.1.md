# Configuración del Sistema KDS - Versión 7.1

**Fecha de Implementación:** Marzo 2026  
**Versión de Configuración:** 7.1.0

---

## Resumen de Decisiones de Configuración

Este documento resume las decisiones de lógica de configuración tomadas para completar el sistema multi-cocinero y los perfiles predefinidos del KDS.

### Archivos Creados/Modificados

| Archivo | Descripción |
|---------|-------------|
| `src/config/kdsConfigConstants.js` | Constantes de configuración, perfiles predefinidos, validaciones y lógica de limpieza |
| `src/contexts/ConfigContext.jsx` | Contexto React para gestión centralizada de configuración |
| `src/hooks/useKdsBehavior.js` | Hook que conecta configuración con comportamiento del KDS |
| `src/components/Principal/ConfigModal.jsx` | Modal de configuración rediseñado con tabs y perfiles |
| `src/components/App.jsx` | Integración de ConfigProvider |

---

## 1. Opciones de Multi-Cocinero

### Lógica de Negocio Definida

#### 1.1 Mostrar Cocinero Asignado
- **Default:** `true`
- **Descripción:** Muestra badges con el nombre del cocinero que está procesando cada plato
- **Impacto:**
  - Badges visuales en tarjetas de comanda
  - Indicador en platos siendo procesados
  - Columna adicional en vista de tabla
- **Cuándo activar:** Siempre que haya más de 1 cocinero trabajando

#### 1.2 Notificar Asignaciones
- **Default:** `true`
- **Descripción:** Muestra notificaciones toast cuando otro cocinero toma o libera un plato
- **Impacto:**
  - Toasts de notificación en la UI
  - Escucha eventos de otros cocineros
  - Sonido suave de notificación
- **Cuándo activar:** Equipos grandes donde la coordinación es crítica
- **Cuándo desactivar:** Cocinas de alta velocidad donde las notificaciones pueden distraer

#### 1.3 Modo Colaborativo
- **Default:** `true`
- **Descripción:** Permite que múltiples cocineros trabajen en la misma comanda simultáneamente
- **Comportamiento:**
  - Cuando está activo: Cada cocinero puede tomar platos diferentes de la misma comanda
  - Cuando está desactivado: Un solo cocinero puede "bloquear" una comanda
- **Cuándo activar:** Cocinas con flujo de trabajo flexible
- **Cuándo desactivar:** Cocinas donde cada comanda debe ser responsabilidad de un solo cocinero

#### 1.4 Bloqueo Automático
- **Default:** `false`
- **Descripción:** Bloquea automáticamente una comanda cuando un cocinero empieza a procesarla
- **Requisito:** Solo funciona cuando `modoColaborativo = false`
- **Impacto:**
  - Overlay de bloqueo visual en comandas tomadas
  - Indicador de quién tiene el bloqueo
  - Validación en frontend antes de permitir tomar
- **Cuándo activar:** Cocinas donde se requiere responsabilidad única por comanda

#### 1.5 Fallback a Broadcast
- **Default:** `true`
- **Descripción:** Vuelve a broadcast si los rooms personales de Socket.io fallan
- **Cuándo activar:** Siempre (recomendado para resiliencia)

#### 1.6 Sonido de Asignación
- **Default:** `true`
- **Descripción:** Reproduce un sonido cuando se recibe una notificación de asignación
- **Depende de:** `notificarAsignaciones = true`

---

## 2. Perfiles Predefinidos

### 2.1 Restaurante Pequeño
**Para:** Menos de 20 comandas simultáneas, 1-2 cocineros, una pantalla

| Opción | Valor |
|--------|-------|
| Alerta Amarilla | 15 min |
| Alerta Roja | 20 min |
| Vista | Tarjetas expandidas |
| Grid | 4x1 |
| Animaciones | Activadas |
| Multi-cocinero | Badges ON, Colaborativo ON |
| Sonidos | ON (no repetir) |

### 2.2 Comida Rápida
**Para:** Más de 50 comandas, múltiples cocineros y pantallas

| Opción | Valor |
|--------|-------|
| Alerta Amarilla | 10 min |
| Alerta Roja | 15 min |
| Vista | Tabla compacta |
| Grid | 6x2 |
| Animaciones | Desactivadas |
| Multi-cocinero | Badges ON, Notificaciones OFF |
| Sonidos | ON (repetir) |

### 2.3 Fine Dining
**Para:** Pocas comandas elaboradas, máximo detalle

| Opción | Valor |
|--------|-------|
| Alerta Amarilla | 25 min |
| Alerta Roja | 35 min |
| Vista | Tarjetas expandidas |
| Grid | 3x1 |
| Animaciones | Activadas |
| Multi-cocinero | Badges ON, Notificaciones ON |
| Sonidos | ON (no repetir) |

### 2.4 Multi-Cocinero
**Para:** 4+ cocineros trabajando simultáneamente

| Opción | Valor |
|--------|-------|
| Alerta Amarilla | 15 min |
| Alerta Roja | 20 min |
| Vista | Tarjetas medianas |
| Grid | 5x1 |
| Animaciones | Activadas |
| Multi-cocinero | Todo activado excepto Bloqueo |
| Sonidos | ON (repetir) |

---

## 3. Sistema de Versionado y Limpieza

### 3.1 Versión de Configuración
- **Versión actual:** `7.1.0`
- Se incrementa cuando la estructura de datos cambia
- Fuerza limpieza automática de configuraciones antiguas

### 3.2 Estrategia de Limpieza

#### Por Cambio de Versión
Limpia:
- `platoStates` (estados visuales de platos)
- `platosChecked` (checkboxes de platos)

#### Por Cambio de Día
Limpia:
- `platoStates`
- `platosChecked`

#### Por Logout
Limpia:
- `kdsConfig`
- `platoStates`
- `platosChecked`
- `cocinaZonaActiva`
- `kdsLastCleanup`

### 3.3 Claves de localStorage

| Clave | Descripción | Limpieza |
|-------|-------------|----------|
| `kdsConfig` | Configuración del KDS | Logout, Reset |
| `kdsConfigVersion` | Versión de configuración | Nunca |
| `platoStates` | Estados visuales de platos | Versión, Día, Logout |
| `platosChecked` | Checkboxes de platos | Versión, Día, Logout |
| `cocinaZonaActiva` | Zona seleccionada | Logout |
| `cocinaViewMode` | Modo de vista | Nunca |
| `kdsLastCleanup` | Timestamp última limpieza | Nunca |

---

## 4. Validaciones de Configuración

### 4.1 Validaciones de Tiempos
- Alerta amarilla: 5-60 minutos
- Alerta roja: 10-120 minutos
- Alerta roja debe ser > alerta amarilla

### 4.2 Validaciones de Diseño
- Columnas: 1-8
- Filas: 1-4
- Fuente: 12-24px

### 4.3 Validaciones Multi-Cocinero
- `bloqueoAutomatico` requiere `modoColaborativo = false`
- Si se activa `modoColaborativo`, se desactiva automáticamente `bloqueoAutomatico`

---

## 5. Integración con Socket.io

### 5.1 Rooms por Cocinero
```javascript
// Backend
socket.join(`cocinero-${usuario.id}`);

// Frontend
socket.emit('join-cocinero', cocineroId);
```

### 5.2 Rooms por Zona (Pendiente Backend)
```javascript
// Cuando el backend lo implemente
socket.join(`zona-${zonaId}`);
```

### 5.3 Eventos de Configuración
| Evento | Descripción |
|--------|-------------|
| `config-cocinero-actualizada` | Configuración del cocinero actualizada |
| `zona-asignada` | Nueva zona asignada al cocinero |
| `zona-removida` | Zona removida del cocinero |

---

## 6. Uso del Sistema

### 6.1 En Componentes
```jsx
import { useConfig, useMultiCocineroConfig } from '../contexts/ConfigContext';

const MiComponente = () => {
  const { config, updateConfig, aplicarPerfilPredefinido } = useConfig();
  const { mostrarCocineroAsignado, modoColaborativo } = useMultiCocineroConfig();
  
  // Usar configuración...
};
```

### 6.2 Hook de Comportamiento
```jsx
import useKdsBehavior from '../hooks/useKdsBehavior';

const MiVista = () => {
  const kds = useKdsBehavior();
  
  // Ordenar comandas
  const ordenadas = kds.sortComandas(comandas);
  
  // Verificar nivel de alerta
  const nivel = kds.getAlertLevel(comanda.createdAt);
  
  // Verificar si puedo tomar un plato
  const puedoTomar = kds.canTakePlato(plato);
};
```

---

## 7. Pendientes para Futuras Versiones

### 7.1 Backend
- [ ] Implementar rooms por zona en Socket.io
- [ ] Middleware de autenticación para Socket.io que verifique token JWT
- [ ] Log de eventos dirigidos para debugging
- [ ] Límite de reconexiones por room para evitar memory leaks

### 7.2 Frontend
- [ ] Vista de tabla compacta completa
- [ ] Manejar desconexión/reconexión con re-unión a rooms
- [ ] Indicador visual de "Eventos personalizados activos"
- [ ] Sistema de preferencias por dispositivo (no por usuario)

### 7.3 Testing
- [ ] Tests unitarios para `kdsConfigConstants.js`
- [ ] Tests de integración para `ConfigContext`
- [ ] Tests de comportamiento para `useKdsBehavior`
- [ ] Tests E2E de perfiles predefinidos

---

**Documento actualizado:** Marzo 2026  
**Autor:** Sistema de Documentación Automática v7.1
