# Especificación: Función "Tomar Comanda" - v7.4.3

**Fecha:** Marzo 2026  
**Estado:** ✅ CORREGIDO - Bug de los 3 clicks solucionado  
**Prioridad:** Alta

---

## 1. Resumen Ejecutivo

La función "Tomar Comanda" permite que un cocinero tome una comanda completa con todos sus platos en una sola acción. Incluye un sistema de 3 estados visuales para gestionar el flujo de trabajo.

### Estado Actual

| Componente | Estado | Detalle |
|------------|--------|---------|
| Backend - Tomar Comanda | ✅ Implementado | Asigna `procesandoPor` a comanda y todos sus platos |
| Backend - Dejar Comanda | ✅ Implementado | Libera comanda y registra auditoría con motivo |
| Backend - Finalizar Comanda | ✅ Implementado | Finaliza todos los platos de la comanda |
| Frontend - Socket Handler | ✅ Implementado | Actualiza `comandas` y `platoStates` |
| Frontend - Estados visuales | ✅ **CORREGIDO** | Ciclo de 3 clicks funciona correctamente |
| Frontend - Check ✓ en tarjeta | ✅ Corregido | Solo aparece en estado 'finalizar' |
| Frontend - Modal Dejar Comanda | ✅ Implementado | Muestra lista de platos y motivo para auditoría |

---

## 2. BUG CORREGIDO - CICLO DE ESTADOS (v7.4.2 → v7.4.3)

### ⚠️ PROBLEMA ORIGINAL (v7.4.2)

**Síntoma:** Se requerían **5 clicks** en la tarjeta de comanda para habilitar el botón "Finalizar Comanda" en lugar de los **3 clicks** esperados (1er click: dejar, 2do click: finalizar, 3er click: normal).

**Comportamiento con Bug:**
- Click 1: Sin cambio visible
- Click 2: Sin cambio visible  
- Click 3: Aparece estado "dejar" (rojo)
- Click 4: Aparece estado "finalizar" (verde)
- Click 5: Vuelve a normal

### 🔍 CAUSA RAÍZ

**Archivo:** `appcocina/src/components/Principal/comandastyle.jsx`  
**Línea:** ~3148-3152

El problema estaba en que **DOS funciones se ejecutaban simultáneamente** al hacer click en la tarjeta:

```javascript
// ❌ CÓDIGO CON BUG (v7.4.2)
onToggleSelect={() => {
  toggleSelectOrder(comanda._id);      // ← Función 1: Alterna selectedOrders
  // v7.4: Si la comanda está tomada por mí, ciclar estados
  handleComandaCardClick(comanda._id); // ← Función 2: Cicla comandaStates
}}
```

#### Análisis del Conflicto

1. **`toggleSelectOrder(comanda._id)`**:
   - Alterna la comanda en el Set `selectedOrders`
   - Este Set se usa para seleccionar comandas NO tomadas (para tomarlas en lote)
   - NO debería usarse para comandas ya tomadas por el cocinero

2. **`handleComandaCardClick(comanda._id)`**:
   - Cicla los estados en el Map `comandaStates`
   - Este es el sistema correcto para comandas tomadas por mí
   - Estados: `undefined → 'dejar' → 'finalizar' → eliminar del mapa`

#### Por qué causaba 5 clicks

El problema era que cuando la comanda estaba tomada por mí:
- `toggleSelectOrder` ejecutaba su lógica de toggle (agregaba/quitaba de `selectedOrders`)
- `handleComandaCardClick` también ejecutaba su lógica de ciclo de estados

Esto creaba un conflicto porque **la lógica del botón usaba `comandaPrincipal`** que dependía de `selectedOrders`, pero el estado visual (`comandaStates`) estaba ciclando independientemente.

### ✅ SOLUCIÓN IMPLEMENTADA (v7.4.3)

**Fecha de corrección:** Marzo 2026  
**Corregido por:** Opus 4.7  
**Método:** Opción A - Separar las funciones según contexto

Se implementó una condición que verifica si la comanda está tomada por el usuario actual antes de decidir qué función ejecutar:

```javascript
// ✅ CÓDIGO CORREGIDO (v7.4.3) - Líneas 3148-3157
onToggleSelect={() => {
  const tomadaPorMi = comanda.procesandoPor?.cocineroId?.toString() === userId?.toString();
  if (tomadaPorMi) {
    // Comanda tomada por mí: solo ciclar estados (dejar → finalizar → normal)
    handleComandaCardClick(comanda._id);
  } else {
    // Comanda no tomada: usar sistema de selección normal
    toggleSelectOrder(comanda._id);
  }
}}
```

### 📝 LECCIONES APRENDIDAS - PARA EVITAR REPETIR ESTE BUG

1. **NUNCA ejecutar dos funciones de estado simultáneamente** en un evento de click sin verificar el contexto primero.

2. **Separar sistemas de estado por contexto:**
   - `selectedOrders` → Solo para comandas NO tomadas (selección en lote)
   - `comandaStates` → Solo para comandas tomadas por mí (ciclo dejar/finalizar)

3. **Verificar propiedad antes de operar:** Siempre comprobar `tomadaPorMi` antes de decidir qué sistema de estado usar.

4. **Documentar la decisión:** Al tener dos sistemas similares, documentar claramente cuándo usar cada uno.

5. **Patrón a seguir:** Antes de agregar una nueva función a un evento existente, verificar si hay conflicto con la función actual.

### Archivos Modificados

| Archivo | Líneas | Cambio Realizado |
|---------|--------|------------------|
| `comandastyle.jsx` | 3148-3157 | Agregada condición `tomadaPorMi` para separar lógica de click |
| `ComandastylePerso.jsx` | Similar | Mismo cambio aplicado |

---

## 3. Flujo de Trabajo Esperado (CORREGIDO)

### Descripción del Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE TRABAJO - TOMAR COMANDA                     │
└─────────────────────────────────────────────────────────────────────────────┘

PASO 1: SELECCIONAR COMANDA (no tomada)
┌─────────────────────────────────────┐
│  Usuario hace clic en una tarjeta   │
│  de comanda (no tomada)             │
│                                     │
│  Estado: selectedOrders = {comandaId}│
│  Visual: Contorno verde selección   │
│  Botón: "Tomar Comanda #123" (azul) │
└─────────────────────────────────────┘
                    │
                    ▼
PASO 2: TOMAR COMANDA
┌─────────────────────────────────────────────────────────────────────────────┐
│  Usuario hace clic en "Tomar Comanda"                                       │
│                                                                             │
│  ⚠️ IMPORTANTE: Después de tomar, la comanda se DESELECCIONA automáticamente│
│                                                                             │
│  Estado: selectedOrders = {} (vacío)                                        │
│  Estado: comandaStates NO tiene esta comanda (sin estado)                  │
│  Visual: Todos los platos en AMARILLO (procesando)                         │
│  Badge: "👨‍🍳 Tú" (amarillo)                                                  │
│  Contorno: Sin contorno especial                                            │
│  Botón: NINGUNO (debe hacer click en tarjeta para opciones)                │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
PASO 3: CICLO DE 3 CLICKS EN TARJETA (comanda tomada por mí)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ESTADO 0: Sin selección (estado inicial después de tomar)          │   │
│  │  - Contorno: Sin contorno especial                                   │   │
│  │  - Check ✓: No                                                       │   │
│  │  - Botón: NINGUNO                                                    │   │
│  │  - comandaStates: no tiene esta comanda                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │ (1er click en tarjeta)                           │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ESTADO 1: dejar                                                     │   │
│  │  - Contorno: ROJO (#ef4444)                                          │   │
│  │  - Check ✓: No                                                       │   │
│  │  - Botón: "Dejar Comanda #123" (rojo)                               │   │
│  │  - Acción del botón: Abre modal para dejar la comanda               │   │
│  │  - comandaStates: { comandaId: 'dejar' }                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │ (2do click en tarjeta)                           │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ESTADO 2: finalizar                                                 │   │
│  │  - Contorno: VERDE (#22c55e)                                         │   │
│  │  - Check ✓: SÍ (animado, grande)                                     │   │
│  │  - Botón: "Finalizar #123" (verde)                                   │   │
│  │  - Acción del botón: Finaliza la comanda                             │   │
│  │  - comandaStates: { comandaId: 'finalizar' }                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │ (3er click en tarjeta)                           │
│                          ▼                                                  │
│                    Vuelve a ESTADO 0: Sin selección                         │
│                    (se elimina el estado del mapa)                          │
│                    comandaStates.delete(comandaId)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tabla Resumen de Estados Esperados

| Estado | Click | Contorno | Check ✓ | Botón | Valor en comandaStates |
|--------|-------|----------|---------|-------|------------------------|
| Sin selección | - | Sin contorno | No | **Ninguno** | `undefined` (no existe en el mapa) |
| `dejar` | 1er click | **Rojo** (#ef4444) | No | "Dejar Comanda" (rojo) | `'dejar'` |
| `finalizar` | 2do click | **Verde** (#22c55e) | **Sí** (animado) | "Finalizar" (verde) | `'finalizar'` |
| Sin selección | 3er click | Sin contorno | No | **Ninguno** | `undefined` (eliminado del mapa) |

---

## 4. Funcionamiento del Botón de Acción

### Lógica de Detección de Comanda

El botón detecta automáticamente la comanda relevante usando esta prioridad:

1. **Primero**: Buscar comanda con estado activo en `comandaStates` (dejar o finalizar)
2. **Segundo**: Si hay una comanda en `selectedOrders` (comandas no tomadas)
3. **Tercero**: Si no hay nada, no mostrar botón

```javascript
// CÓDIGO IMPLEMENTADO
let comandaPrincipal = null;

// 1. Prioridad: comanda con estado activo en comandaStates (tomada por mí)
const comandaConEstado = Array.from(comandaStates.entries())
  .find(([id, state]) => state === 'dejar' || state === 'finalizar');
if (comandaConEstado) {
  comandaPrincipal = comandas.find(c => c._id === comandaConEstado[0]);
}

// 2. Si no hay estado activo, buscar en selectedOrders (comandas no tomadas)
if (!comandaPrincipal && selectedOrders.size === 1) {
  comandaPrincipal = comandas.find(c => c._id === Array.from(selectedOrders)[0]);
}
```

### Lógica del Botón

```javascript
if (comandaPrincipal) {
  if (tomadaPorOtro) {
    // Comanda tomada por otro - botón deshabilitado
    buttonConfig = {
      label: `Tomada por ${comandaPrincipal.procesandoPor?.alias || 'otro'}`,
      color: 'bg-gray-600 cursor-not-allowed',
      action: () => {}
    };
  } else if (!comandaPrincipal.procesandoPor?.cocineroId) {
    // Comanda no tomada → "Tomar Comanda"
    buttonConfig = {
      label: `Tomar Comanda #${comandaPrincipal.comandaNumber}`,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => handleTomarComanda(comandaPrincipal._id)
    };
  } else if (tomadaPorMi) {
    // Comanda tomada por mí - ciclo de 2 estados
    const comandaState = comandaStates.get(comandaPrincipal._id);
    
    if (comandaState === 'dejar') {
      // 1er click: Dejar Comanda
      buttonConfig = {
        label: `Dejar Comanda #${comandaPrincipal.comandaNumber}`,
        color: 'bg-red-500 hover:bg-red-600',
        action: () => handleDejarComanda(comandaPrincipal._id)
      };
    } else if (comandaState === 'finalizar') {
      // 2do click: Finalizar
      buttonConfig = {
        label: `Finalizar #${comandaPrincipal.comandaNumber}`,
        color: 'bg-green-600 hover:bg-green-700',
        action: () => handleFinalizarComandaCard(comandaPrincipal._id)
      };
    } else {
      // Sin selección visual → SIN botón
      buttonConfig = null;
    }
  }
}
```

---

## 5. Función handleTomarComanda

### Código Implementado

```javascript
const handleTomarComanda = useCallback(async (comandaId) => {
  if (!userId) {
    setToastMessage({ type: 'error', message: '⚠️ Usuario no identificado', duration: 3000 });
    return;
  }
  
  const result = await tomarComanda(comandaId, userId);
  
  if (result.success) {
    // IMPORTANTE: Deseleccionar la comanda para que el usuario pueda interactuar
    // con el ciclo de 2 estados sin interferencia de la selección en lote
    setSelectedOrders(new Set());
    
    // Eliminar cualquier estado previo de la comanda (queda sin selección visual)
    // El usuario debe hacer click en la tarjeta para activar el ciclo
    setComandaStates(prev => {
      const nuevo = new Map(prev);
      nuevo.delete(comandaId);
      return nuevo;
    });
    
    // Actualizar estados visuales de los platos
    setPlatoStates(prev => {
      const nuevo = new Map(prev);
      const comanda = comandas.find(c => c._id === comandaId);
      if (comanda && comanda.platos) {
        comanda.platos.forEach((plato, index) => {
          const key = `${comandaId}-${index}`;
          nuevo.set(key, 'procesando');
        });
      }
      return nuevo;
    });
    
    setToastMessage({
      type: 'success',
      message: '👨‍🍳 Comanda tomada - Click en la tarjeta para opciones',
      duration: 3000
    });
  }
}, [userId, tomarComanda, comandas, setPlatoStates, setComandaStates]);
```

### Puntos Clave

1. **Deselección automática**: `setSelectedOrders(new Set())` limpia la selección después de tomar
2. **Sin estado inicial**: La comanda queda sin selección visual hasta que el usuario hace click en la tarjeta
3. **Feedback al usuario**: Toast indica que puede hacer click en la tarjeta para opciones

---

## 6. Modal de "Dejar Comanda"

### Características

1. **Lista de platos a liberar**: Muestra los platos que el cocinero tomó
2. **Motivo obligatorio**: Dropdown con opciones predefinidas
3. **Auditoría**: Registra la acción con el motivo en el backend

### Opciones de Motivo

- Cambio de prioridad
- Falta de insumos
- Error al tomar la comanda
- Solicitud del cliente
- Emergencia
- Cambio de turno
- Otro motivo (con campo de texto adicional)

---

## 7. Backend - Endpoints

### Tomar Comanda
- **Endpoint:** `PUT /api/comanda/:id/procesando`
- **Body:** `{ cocineroId }`
- **Response:** Comanda actualizada con `procesandoPor` en cada plato

### Dejar Comanda
- **Endpoint:** `DELETE /api/comanda/:id/procesando`
- **Body:** `{ cocineroId, motivo }`
- **Auditoría:** Registra acción `COMANDA_DEJADA_COCINA`

### Finalizar Comanda
- **Endpoint:** `PUT /api/comanda/:id/finalizar`
- **Body:** `{ cocineroId }`
- **Response:** Comanda con todos los platos en estado `'recoger'`

---

## 8. Socket Events

### Evento: `comanda-procesando` (Tomar Comanda)

```javascript
{
  comandaId: "123",
  comandaNumber: 45,
  cocinero: { cocineroId: "abc", nombre: "Juan", alias: "Juan" },
  comanda: { /* comanda completa con platos actualizados */ },
  timestamp: "2026-03-24T10:00:00Z"
}
```

### Evento: `comanda-liberada` (Dejar Comanda)

```javascript
{
  comandaId: "123",
  comandaNumber: 45,
  cocineroId: "abc",
  comanda: { /* comanda actualizada sin procesandoPor */ },
  timestamp: "2026-03-24T10:05:00Z"
}
```

### Evento: `comanda-finalizada` (Finalizar Comanda)

```javascript
{
  comandaId: "123",
  comandaNumber: 45,
  cocinero: { cocineroId: "abc", nombre: "Juan", alias: "Juan" },
  comanda: { /* comanda con platos en estado 'recoger' */ },
  timestamp: "2026-03-24T10:10:00Z"
}
```

---

## 9. Persistencia al Recargar Página

### Implementación

```javascript
useEffect(() => {
  if (comandas.length === 0) return;
  
  // Inicializar platoStates para platos con procesandoPor
  setPlatoStates(prev => {
    const nuevo = new Map(prev);
    comandas.forEach(comanda => {
      if (comanda.platos && comanda.procesandoPor?.cocineroId) {
        comanda.platos.forEach((plato, index) => {
          if (plato.procesandoPor?.cocineroId) {
            const key = `${comanda._id}-${index}`;
            nuevo.set(key, 'procesando');
          }
        });
      }
    });
    return nuevo;
  });
  
  // NOTA: NO inicializar comandaStates automáticamente
  // Las comandas tomadas quedan sin estado visual hasta que el usuario haga click
}, [comandas, userId]);
```

---

## 10. Archivos Involucrados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `Backend-LasGambusinas/src/controllers/procesamientoController.js` | Backend | Endpoints de tomar/dejar/finalizar comanda |
| `Backend-LasGambusinas/src/socket/events.js` | Backend | Emisión de eventos Socket |
| `Backend-LasGambusinas/src/repository/comanda.repository.js` | Backend | Proyección `PROYECCION_COCINA` incluye `procesandoPor` |
| `appcocina/src/hooks/useProcesamiento.js` | Frontend | Hook de procesamiento con soporte de motivo |
| `appcocina/src/hooks/useSocketCocina.js` | Frontend | Socket handlers para eventos de comanda |
| `appcocina/src/components/Principal/comandastyle.jsx` | Frontend | Vista de comandas - **CORREGIDO v7.4.3** |
| `appcocina/src/components/Principal/ComandastylePerso.jsx` | Frontend | Vista personalizada - **CORREGIDO v7.4.3** |

---

## 11. Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v7.2 | Marzo 2026 | Sistema multi-cocinero con identificación en platos |
| v7.3 | Marzo 2026 | Funciones de tomar/dejar comanda completa |
| v7.4 | Marzo 2026 | Tomar comanda también toma todos los platos |
| v7.4.1 | Marzo 2026 | Correcciones parciales del ciclo de estados |
| v7.4.2 | Marzo 2026 | **BUG DETECTADO:** Requiere 5 clicks en lugar de 3. Conflicto entre `toggleSelectOrder` y `handleComandaCardClick` |
| v7.4.3 | Marzo 2026 | **✅ BUG CORREGIDO:** Solución implementada separando funciones según contexto con verificación `tomadaPorMi`. **Selección única:** Solo se puede seleccionar UNA comanda a la vez, al seleccionar otra se desmarca la anterior |

---

**Autor:** Sistema de documentación automática  
**Última actualización:** Marzo 2026  
**Estado:** ✅ CORREGIDO Y DOCUMENTADO
