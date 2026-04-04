# Plan de Implementación: Sistema de Toma de Plato/Comanda en ComandaStyleSupervi

**Fecha:** Abril 2026  
**Versión:** 1.0  
**Objetivo:** Implementar funcionalidad de asignación de cocineros al momento de "Tomar" platos o comandas, registrando desempeño para cocineros.html

---

## 📋 Resumen Ejecutivo

### Situación Actual

| Componente | Estado | Observación |
|------------|--------|-------------|
| **Backend Multi-Cocinero** | ✅ Implementado v7.2.1 | Endpoints, modelo de datos, Socket.io |
| **Hook useProcesamiento** | ✅ Existe | Funciones `tomarPlato`, `tomarComanda`, etc. |
| **ComandaStyleSupervi** | ⚠️ Parcial | Solo modal manual sin contexto |
| **Integración visual** | ❌ No existe | No muestra cocinero asignado en tarjetas |

### Lo que YA existe en el Backend

```
Endpoints de Procesamiento (v7.2.1):
├── PUT    /api/comanda/:id/plato/:platoId/procesando  → Tomar plato
├── DELETE /api/comanda/:id/plato/:platoId/procesando  → Liberar plato
├── PUT    /api/comanda/:id/plato/:platoId/finalizar   → Finalizar plato
├── PUT    /api/comanda/:id/procesando                 → Tomar comanda completa
└── DELETE /api/comanda/:id/procesando                 → Liberar comanda

Modelo de Datos (comanda.model.js):
├── platos[].procesandoPor: { cocineroId, nombre, alias, timestamp }
├── platos[].procesadoPor: { cocineroId, nombre, alias, timestamp }
├── procesandoPor (nivel comanda)
└── procesadoPor (nivel comanda)

Eventos Socket.io:
├── plato-procesando
├── plato-liberado
├── comanda-procesando
├── comanda-liberada
└── conflicto-procesamiento
```

---

## 🎯 Objetivo del Plan

Permitir que desde **ComandaStyleSupervi** el supervisor pueda:

1. **Ver** qué cocinero tiene asignado cada plato/comanda
2. **Tomar** platos/comandas seleccionando un cocinero específico
3. **Reasignar** platos de un cocinero a otro
4. **Registrar** el desempeño para métricas en `cocineros.html`

---

## 📐 Arquitectura Propuesta

### Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ComandaStyleSupervi                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Selecciona plato/comanda con checkboxes                     │  │
│  │ 2. Click en botón "Tomar" del toolbar                          │  │
│  │ 3. Modal muestra lista de cocineros                            │  │
│  │ 4. Selecciona cocinero                                         │  │
│  │ 5. API: PUT /api/comanda/:id/plato/:platoId/procesando        │  │
│  │ 6. Socket emite 'plato-procesando'                             │  │
│  │ 7. UI actualiza con badge del cocinero                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Componentes a Modificar

```
appcocina/src/
├── components/Principal/
│   ├── ComandaStyleSupervi.jsx    ← MODIFICAR (integrar hooks)
│   ├── ComandaStyle.jsx           ← MODIFICAR (aceptar props supervisor)
│   ├── SicarComandaCard.jsx       ← MODIFICAR (mostrar cocinero asignado)
│   └── TomarCocineroModal.jsx     ← CREAR (modal de selección)
├── hooks/
│   ├── useProcesamiento.js        ← YA EXISTE (reutilizar)
│   └── useAsignacionCocinero.js   ← YA EXISTE (adaptar)
└── contexts/
    └── AuthContext.jsx            ← YA EXISTE (obtener userId/cocineroId)
```

---

## 🔧 Fase 1: Integración de Hooks (Prioridad Alta)

### 1.1 Modificar ComandaStyleSupervi.jsx

**Archivo:** `appcocina/src/components/Principal/ComandaStyleSupervi.jsx`

**Cambios necesarios:**

```jsx
// AGREGAR imports
import useProcesamiento from '../../hooks/useProcesamiento';
import TomarCocineroModal from './TomarCocineroModal';

// AGREGAR estados
const [modalTomarAbierto, setModalTomarAbierto] = useState(false);
const [platosSeleccionados, setPlatosSeleccionados] = useState([]);
const [comandaSeleccionada, setComandaSeleccionada] = useState(null);

// INTEGRAR hook existente
const {
  tomarPlato,
  tomarComanda,
  liberarPlato,
  liberarComanda,
  loading: procesando
} = useProcesamiento({
  getToken,
  showToast: (msg) => setToastLocal({ ...msg, duration: 3000 }),
  onProcesamientoChange: (data) => {
    console.log('[Supervi] Procesamiento actualizado:', data);
    // Recargar comandas o actualizar estado local
  }
});

// NUEVO handler para abrir modal de "Tomar"
const handleAbrirModalTomar = useCallback(() => {
  // Obtener platos/comandas seleccionados desde ComandaStyle
  const seleccion = obtenerSeleccionActual(); // Nueva función
  if (seleccion.length === 0) {
    setToastLocal({ type: 'warning', text: 'Selecciona al menos un plato o comanda' });
    return;
  }
  setPlatosSeleccionados(seleccion);
  setModalTomarAbierto(true);
}, []);

// NUEVO handler para confirmar toma
const handleConfirmarToma = useCallback(async (cocineroId) => {
  setModalTomarAbierto(false);
  
  // Tomar cada plato seleccionado
  for (const item of platosSeleccionados) {
    if (item.tipo === 'plato') {
      await tomarPlato(item.comandaId, item.platoId, cocineroId);
    } else if (item.tipo === 'comanda') {
      await tomarComanda(item.comandaId, cocineroId);
    }
  }
}, [platosSeleccionados, tomarPlato, tomarComanda]);
```

### 1.2 Crear TomarCocineroModal.jsx

**Archivo nuevo:** `appcocina/src/components/Principal/TomarCocineroModal.jsx`

```jsx
/**
 * TomarCocineroModal - Modal para seleccionar cocinero al "Tomar" plato/comanda
 * 
 * Similar a AsignarCocineroModal pero enfocado en procesamiento (no asignación estática).
 * Permite seleccionar qué cocinero tomará los platos/comandas seleccionados.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUserCheck, FaSpinner, FaUser } from 'react-icons/fa';

const TomarCocineroModal = ({
  isOpen,
  onClose,
  cocineros,
  loading,
  procesando,
  onConfirmar,
  platosSeleccionados,
  comandaSeleccionada
}) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getTitulo = () => {
    if (comandaSeleccionada) {
      return `Tomar Comanda #${comandaSeleccionada.comandaNumber}`;
    }
    if (platosSeleccionados?.length === 1) {
      return `Tomar "${platosSeleccionados[0].platoNombre}"`;
    }
    return `Tomar ${platosSeleccionados?.length || 0} platos`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <FaUserCheck className="text-green-400 text-lg" />
                </div>
                <h3 className="text-lg font-bold text-white">{getTitulo()}</h3>
              </div>
              <button onClick={onClose} disabled={procesando} className="text-gray-400 hover:text-white">
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Contenido */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-4">
                Selecciona el cocinero que preparará {platosSeleccionados?.length || 'la'} {platosSeleccionados?.length === 1 ? 'plato' : 'platos'}:
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-3xl text-green-500" />
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cocineros.map((cocinero) => (
                    <button
                      key={cocinero._id}
                      onClick={() => onConfirmar(cocinero._id)}
                      disabled={procesando}
                      className="w-full p-3 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-green-900/30 hover:border-green-600 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm">
                        {cocinero.alias?.charAt(0)?.toUpperCase() || cocinero.nombre?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">{cocinero.alias || cocinero.nombre}</p>
                        {cocinero.alias && cocinero.nombre && cocinero.alias !== cocinero.nombre && (
                          <p className="text-gray-500 text-xs">{cocinero.nombre}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <button
              onClick={onClose}
              disabled={procesando}
              className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              Cancelar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TomarCocineroModal;
```

---

## 🔧 Fase 2: Visualización de Cocinero Asignado (Prioridad Alta)

### 2.1 Modificar SicarComandaCard.jsx

**Archivo:** `appcocina/src/components/Principal/SicarComandaCard.jsx`

**Agregar badge de cocinero asignado:**

```jsx
// En el header de cada tarjeta, agregar:
{comanda.procesandoPor && (
  <div className="flex items-center gap-1 bg-green-600/20 px-2 py-1 rounded">
    <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-xs text-white">
      {comanda.procesandoPor.alias?.[0] || comanda.procesandoPor.nombre?.[0]}
    </div>
    <span className="text-xs text-green-300">
      {comanda.procesandoPor.alias || comanda.procesandoPor.nombre}
    </span>
  </div>
)}

// En cada plato, agregar indicador:
{plato.procesandoPor && (
  <div className="flex items-center gap-1 text-xs text-yellow-400 mt-1">
    <span>👨‍🍳</span>
    <span>{plato.procesandoPor.alias || plato.procesandoPor.nombre}</span>
  </div>
)}
```

### 2.2 Estilos visuales sugeridos

| Estado | Badge | Color |
|--------|-------|-------|
| Sin tomar | - | - |
| Procesando | 👨‍🍳 Alias | Verde (`bg-green-600/20`) |
| Procesado | ✅ Alias | Azul (`bg-blue-600/20`) |

---

## 🔧 Fase 3: Comunicación con ComandaStyle (Prioridad Media)

### 3.1 Props nuevas para ComandaStyle

**Modificar ComandaStyle.jsx para aceptar props de supervisor:**

```jsx
const ComandaStyle = ({ 
  onGoToMenu, 
  initialOptions,
  // NUEVOS PROPS
  isSupervisorView = false,
  onPlatosSeleccionadosChange = null,
  onComandaSeleccionadaChange = null
}) => {
  // ... código existente
  
  // Notificar cambios de selección al padre (ComandaStyleSupervi)
  useEffect(() => {
    if (isSupervisorView && onPlatosSeleccionadosChange) {
      onPlatosSeleccionadosChange(Array.from(platosChecked.entries()));
    }
  }, [platosChecked, isSupervisorView, onPlatosSeleccionadosChange]);
  
  useEffect(() => {
    if (isSupervisorView && onComandaSeleccionadaChange) {
      onComandaSeleccionadaChange(Array.from(comandasSeleccionadas));
    }
  }, [comandasSeleccionadas, isSupervisorView, onComandaSeleccionadaChange]);
};
```

### 3.2 En ComandaStyleSupervi

```jsx
<ComandaStyle
  onGoToMenu={onGoToMenu}
  initialOptions={initialOptions}
  isSupervisorView={true}
  onPlatosSeleccionadosChange={setPlatosSeleccionados}
  onComandaSeleccionadaChange={setComandasSeleccionadas}
/>
```

---

## 🔧 Fase 4: Botón "Tomar" en Toolbar (Prioridad Alta)

### 4.1 Modificar toolbar inferior

**En ComandaStyleSupervi, agregar botón dinámico:**

```jsx
{/* Botón Tomar - Solo en Vista Supervisor */}
{tienePermiso && (
  <button
    onClick={handleAbrirModalTomar}
    disabled={procesando || (platosSeleccionados.length === 0 && comandasSeleccionadas.size === 0)}
    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all
      ${procesando || (platosSeleccionados.length === 0 && comandasSeleccionadas.size === 0)
        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
        : 'bg-green-600 hover:bg-green-700 text-white'}`}
  >
    {procesando ? (
      <>
        <FaSpinner className="animate-spin" />
        <span>Procesando...</span>
      </>
    ) : (
      <>
        <FaUserCheck />
        <span>Tomar ({platosSeleccionados.length + comandasSeleccionadas.size})</span>
      </>
    )}
  </button>
)}
```

---

## 🔧 Fase 5: Integración con Socket.io (Prioridad Alta)

### 5.1 Listeners en useSocketCocina

**El hook ya tiene soporte para eventos de procesamiento:**

```jsx
// Asegurar que useSocketCocina maneja estos eventos:
// - plato-procesando
// - plato-liberado
// - comanda-procesando
// - comanda-liberada
// - conflicto-procesamiento

socket.on('plato-procesando', (data) => {
  // Actualizar UI con el cocinero que tomó el plato
  setComandas(prev => actualizarProcesandoPlato(prev, data));
});
```

---

## 🔧 Fase 6: Métricas para cocineros.html (Prioridad Media)

### 6.1 Datos que YA se registran

El backend ya guarda en el modelo Comanda:

```javascript
procesadoPor: {
  cocineroId: ObjectId,
  nombre: String,
  alias: String,
  timestamp: Date
}
```

### 6.2 Endpoint de métricas (YA EXISTE)

```
GET /api/cocineros/:id/metricas
GET /api/cocineros/metricas/todos
```

### 6.3 Cierre de caja incluye

```javascript
cocineros: {
  totalCocineros,
  cocinerosActivos,
  totalPlatosPreparados,
  tiempoPromedioPreparacion,
  porcentajeDentroSLA,
  desempeñoPorCocinero: [...],
  rankingCocineros: [...]
}
```

---

## 📋 Checklist de Implementación

### Fase 1: Integración de Hooks
- [ ] Importar `useProcesamiento` en `ComandaStyleSupervi.jsx`
- [ ] Crear estados para manejar selección
- [ ] Crear handlers `handleAbrirModalTomar` y `handleConfirmarToma`

### Fase 2: Modal de Selección
- [ ] Crear archivo `TomarCocineroModal.jsx`
- [ ] Integrar con `useAsignacionCocinero` para cargar cocineros
- [ ] Manejar estados de loading y error

### Fase 3: Visualización
- [ ] Modificar `SicarComandaCard.jsx` para mostrar badge de cocinero
- [ ] Agregar indicadores visuales en platos
- [ ] Estilizar con colores distintivos

### Fase 4: Comunicación
- [ ] Modificar `ComandaStyle.jsx` para aceptar props de supervisor
- [ ] Implementar callbacks de selección
- [ ] Probar flujo bidireccional

### Fase 5: Socket.io
- [ ] Verificar listeners de eventos de procesamiento
- [ ] Manejar actualizaciones en tiempo real
- [ ] Manejar conflictos (409)

### Fase 6: Testing
- [ ] Probar toma de plato individual
- [ ] Probar toma de comanda completa
- [ ] Probar liberación
- [ ] Verificar métricas en `cocineros.html`

---

## 🧪 Casos de Prueba

### Caso 1: Tomar Plato Individual
```
1. Supervisor abre Vista Supervisor
2. Selecciona un plato con checkbox
3. Click en "Tomar (1)"
4. Modal muestra lista de cocineros
5. Selecciona "Chef Juan"
6. API: PUT /api/comanda/:id/plato/:platoId/procesando
7. Socket emite 'plato-procesando'
8. Tarjeta muestra "👨‍🍳 Chef Juan"
```

### Caso 2: Tomar Comanda Completa
```
1. Supervisor selecciona una comanda
2. Click en "Tomar Comanda"
3. Modal muestra lista de cocineros
4. Selecciona "Chef María"
5. API: PUT /api/comanda/:id/procesando
6. Todos los platos se asignan a María
```

### Caso 3: Conflicto (Plato ya tomado)
```
1. Plato ya tiene "👨‍🍳 Chef Juan"
2. Supervisor intenta tomarlo con otro cocinero
3. API devuelve 409
4. Modal muestra: "⚠️ Este plato ya está siendo procesado por Chef Juan"
```

---

## ⚠️ Consideraciones Importantes

### 1. Autenticación
- Todos los endpoints requieren JWT
- El `cocineroId` debe coincidir con el usuario autenticado o ser admin/supervisor

### 2. Permisos
- Solo `supervisor` y `admin` pueden asignar cocineros desde Vista Supervisor
- Los cocineros normales solo pueden tomar platos para sí mismos

### 3. Concurrencia
- Manejar conflictos con error 409
- Mostrar mensajes claros cuando un plato ya está tomado

### 4. Auditoría
- Registrar liberaciones con motivo
- El backend ya registra `PLATO_DEJADO_COCINA` en auditoría

---

## 📚 Referencias

- Backend: `Backend-LasGambusinas/docs/automated/BACKEND_LASGAMBUSINAS_DOCUMENTACION_COMPLETA.md`
- App Cocina: `appcocina/docs/automated/APP_COCINA_DOCUMENTACION_COMPLETA.md`
- Hook: `appcocina/src/hooks/useProcesamiento.js`
- Modelo: `Backend-LasGambusinas/src/database/models/comanda.model.js`

---

**Versión del Plan:** 1.0  
**Autor:** Sistema Las Gambusinas  
**Revisión:** Pendiente
