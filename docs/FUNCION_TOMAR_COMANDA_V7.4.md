# Especificación: Función "Tomar Comanda" - v7.4

**Fecha:** Marzo 2026  
**Estado:** Implementado con errores pendientes  
**Prioridad:** Alta

---

## 1. Resumen Ejecutivo

La función "Tomar Comanda" ha sido implementada en el backend y frontend. Sin embargo, existen **errores pendientes de corrección** relacionados con la visualización del check ✓ en la tarjeta de comanda.

### Estado Actual

| Componente | Estado | Detalle |
|------------|--------|---------|
| Backend - Tomar Comanda | ✅ Implementado | Asigna `procesandoPor` a comanda y todos sus platos |
| Backend - Dejar Comanda | ✅ Implementado | Libera comanda y todos sus platos |
| Backend - Finalizar Comanda | ✅ Implementado | Finaliza todos los platos de la comanda |
| Frontend - Socket Handler | ✅ Implementado | Actualiza `comandas` y `platoStates` |
| Frontend - Estados visuales | ✅ Implementado | Sistema de 3 estados (normal/dejar/finalizar) |
| Frontend - Check ✓ en tarjeta | ❌ ERROR | Se muestra en condiciones incorrectas |

---

## 2. Errores Pendientes

### ERROR 1: El Check ✓ se muestra incorrectamente

**Ubicación:** `appcocina/src/components/Principal/comandastyle.jsx` líneas 4067-4093

**Problema:** El check ✓ verde grande se muestra cuando `isSelected` es true, pero esto no coincide con el sistema de 3 estados implementado.

**Código Actual (INCORRECTO):**
```javascript
// Líneas 4067-4092
<AnimatePresence>
  {isSelected && (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
      // ... muestra el check ✓
    >
      <div className="text-white text-4xl font-bold">✓</div>
    </motion.div>
  )}
</AnimatePresence>
```

**Código Corregido (DEBERÍA SER):**
```javascript
<AnimatePresence>
  {/* Solo mostrar el check ✓ cuando el contorno es VERDE (estado finalizar) */}
  {tomadaPorMi && comandaState === 'finalizar' && (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 15 
      }}
    >
      <div 
        className="text-white text-4xl font-bold" 
        style={{ 
          textShadow: '0 0 20px rgba(34, 197, 94, 0.8), 2px 2px 4px rgba(0,0,0,0.8)',
          fontFamily: 'Arial, sans-serif',
          filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.8))',
          animation: 'glow 2s ease-in-out infinite'
        }}
      >
        ✓
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

### ERROR 2: Confusión con 4 estados en lugar de 3

**Problema:** El sistema tiene una variable `isSelected` que actúa como un "cuarto estado" no documentado, causando confusión en el flujo.

**Sistema de Estados Esperado (3 estados):**

| Estado | Contorno | Check ✓ | Acción del botón |
|--------|----------|---------|------------------|
| `normal` | Sin contorno especial | No | "Tomar Comanda" |
| `dejar` | Rojo | No | "Dejar Comanda" |
| `finalizar` | Verde | **Sí** | "Finalizar Comanda" |

**Nota sobre `isSelected`:** Esta variable controla la selección para acciones en lote (anular, imprimir, etc.) y NO debe mostrar el check ✓. El check solo debe aparecer cuando el estado visual es `finalizar`.

### ERROR 3: Mismo problema en ComandastylePerso.jsx

**Ubicación:** `appcocina/src/components/Principal/ComandastylePerso.jsx` líneas 4229-4255

**Problema:** El mismo error del check ✓ se repite en la vista personalizada de comandas.

**Código Actual (INCORRECTO):**
```javascript
// Líneas 4229-4255
<AnimatePresence>
  {isSelected && (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
      // ... muestra el check ✓
    >
      <div className="text-white text-4xl font-bold">✓</div>
    </motion.div>
  )}
</AnimatePresence>
```

**Variables disponibles para la corrección (líneas 4172-4173):**
```javascript
const tomadaPorMi = comanda.procesandoPor?.cocineroId?.toString() === usuarioActualId?.toString();
const comandaState = comandaStates?.get(comandaId) || 'normal';
```

**Código Corregido:**
```javascript
<AnimatePresence>
  {/* Solo mostrar el check ✓ cuando el contorno es VERDE (estado finalizar) */}
  {tomadaPorMi && comandaState === 'finalizar' && (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
      // ... resto del código
    >
      <div className="text-white text-4xl font-bold">✓</div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## 3. Descripción del Problema Original

Actualmente, cuando un cocinero utiliza la función **"Tomar Comanda"**, la comanda se marca como tomada a nivel general (muestra el badge amarillo con el nombre del cocinero), pero los **platos individuales de la comanda no cambian su estado visual** a "procesando" (amarillo).

### Comportamiento Esperado
Cuando un cocinero hace clic en **"Tomar Comanda"**, el sistema debe comportarse como si el cocinero hubiera utilizado la función **"Tomar Plato"** en cada uno de los platos de la comanda:

1. Todos los platos deben mostrarse en **amarillo** (estado "procesando")
2. Todos los platos deben tener asignado el `procesandoPor` con la información del cocinero
3. Los platos deben cambiar de estado `'pedido'` a `'en_espera'`
4. El estado visual local (`platoStates`) debe actualizarse a `'procesando'`

### Estado Actual (Incorrecto)
```
┌─────────────────────────────────────┐
│  Orden #123  │  M5  │ 👨‍🍳 Juan      │  ← Comanda tomada
├─────────────────────────────────────┤
│  □ 1 Lomo Saltado                   │  ← Plato en estado NORMAL
│  □ 1 Arroz con Pollo                │  ← Plato en estado NORMAL
│  □ 2 Tallarines                     │  ← Plato en estado NORMAL
└─────────────────────────────────────┘
```

### Estado Esperado (Correcto)
```
┌─────────────────────────────────────┐
│  Orden #123  │  M5  │ 👨‍🍳 Juan      │  ← Comanda tomada
├─────────────────────────────────────┤
│  ⏳ 1 Lomo Saltado     👨‍🍳 Tú       │  ← Plato en PROCESO (amarillo)
│  ⏳ 1 Arroz con Pollo  👨‍🍳 Tú       │  ← Plato en PROCESO (amarillo)
│  ⏳ 2 Tallarines       👨‍🍳 Tú       │  ← Plato en PROCESO (amarillo)
└─────────────────────────────────────┘
```

---

## 4. Función de Referencia: "Tomar Plato" (Ya Implementada)

Esta es la función que ya funciona correctamente y debe servir como referencia:

### Backend - Endpoint: `PUT /api/comanda/:id/plato/:platoId/procesando`

**Ubicación:** `Backend-LasGambusinas/src/controllers/procesamientoController.js`

### Lo que hace la función "Tomar Plato":

1. **Valida** que el cocineroId esté presente
2. **Busca** la comanda y el plato específico
3. **Verifica** que el plato no esté tomado por otro cocinero
4. **Asigna** `procesandoPor` al plato con la info del cocinero
5. **Cambia** el estado del plato de `'pedido'` a `'en_espera'`
6. **Emite** evento Socket para actualizar en tiempo real

---

## 5. Función "Tomar Comanda" - Estado de Implementación

### Backend - Endpoint: `PUT /api/comanda/:id/procesando`

**Ubicación:** `Backend-LasGambusinas/src/controllers/procesamientoController.js` (líneas 455-573)

**Estado:** ✅ IMPLEMENTADO CORRECTAMENTE

```javascript
// El backend YA hace lo siguiente:
router.put('/comanda/:id/procesando', adminAuth, async (req, res) => {
  // ... validaciones ...
  
  // 1. Asigna procesandoPor a la comanda
  await Comanda.updateOne({ _id: comandaId }, {
    $set: {
      procesandoPor: { ...cocineroInfo, timestamp }
    }
  });
  
  // 2. Recorre TODOS los platos y les asigna procesandoPor
  for (let i = 0; i < comanda.platos.length; i++) {
    const plato = comanda.platos[i];
    if (!plato.eliminado && !plato.anulado && !plato.procesandoPor?.cocineroId) {
      await Comanda.updateOne({ _id: comandaId }, {
        $set: {
          [`platos.${i}.procesandoPor`]: { ...cocineroInfo, timestamp },
          [`platos.${i}.estado`]: plato.estado === 'pedido' ? 'en_espera' : plato.estado
        }
      });
      platosTomados++;
    }
  }
  
  // 3. Emite evento con la comanda ACTUALIZADA
  const comandaActualizada = await Comanda.findById(comandaId).populate(...).lean();
  global.emitComandaProcesando(comandaId, cocineroInfo, comandaActualizada);
});
```

### Frontend - Socket Handler

**Ubicación:** `appcocina/src/components/Principal/comandastyle.jsx` (líneas 993-1016)

**Estado:** ✅ IMPLEMENTADO

```javascript
case 'COMANDA_TOMADA':
  // Actualizar estado local de la comanda
  setComandas(prev => prev.map(comanda => {
    if (comanda._id !== data.comandaId) return comanda;
    return { ...comanda, procesandoPor: data.procesandoPor };
  }));
  
  // Si viene la comanda completa con platos, actualizar también los platos
  if (data.comanda && data.comanda.platos) {
    setPlatoStates(prev => {
      const nuevo = new Map(prev);
      data.comanda.platos.forEach((plato, index) => {
        if (plato.procesandoPor?.cocineroId) {
          const key = `${data.comandaId}-${index}`;
          nuevo.set(key, 'procesando');
        }
      });
      return nuevo;
    });
  }
  break;
```

### Socket Event Emitter

**Ubicación:** `Backend-LasGambusinas/src/socket/events.js` (líneas 1602-1631)

**Estado:** ✅ IMPLEMENTADO

```javascript
global.emitComandaProcesando = async (comandaId, cocinero, comandaActualizada = null) => {
  const comanda = comandaActualizada || await comandaModel.findById(comandaId)
    .populate({ path: "platos.plato", select: "nombre precio categoria" });
    
  const eventData = {
    comandaId: comandaId?.toString(),
    comandaNumber: comanda.comandaNumber,
    cocinero,
    comanda, // ✅ Incluye comanda completa con platos actualizados
    timestamp
  };

  cocinaNamespace.to(roomName).emit('comanda-procesando', eventData);
};
```

---

## 6. Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    COCINERO HACE CLIC EN                        │
│                    "TOMAR COMANDA"                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND                                     │
│  handleTomarComanda() → tomarComanda(comandaId, userId)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND: PUT /api/comanda/:id/procesando     │
│                                                                 │
│  1. Validar cocineroId                                          │
│  2. Buscar comanda                                              │
│  3. Verificar que no esté tomada por otro                       │
│  4. Obtener info del cocinero                                   │
│  5. Asignar procesandoPor a la comanda                          │
│  6. 🔥 Recorrer TODOS los platos:                               │
│     - Si no está eliminado/anulado                              │
│     - Si no está tomado por otro                                │
│     - Asignar procesandoPor al plato                            │
│     - Cambiar estado de 'pedido' a 'en_espera'                  │
│  7. Obtener comanda actualizada poblada                         │
│  8. Emitir evento Socket con comanda actualizada                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SOCKET: comanda-procesando                   │
│                                                                 │
│  Enviar a todos los clientes:                                   │
│  {                                                              │
│    comandaId,                                                   │
│    cocinero: { cocineroId, nombre, alias },                     │
│    comanda: { ...platos con procesandoPor actualizado }         │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND: Socket Handler                     │
│                                                                 │
│  1. Actualizar setComandas con la comanda recibida              │
│  2. 🔥 Actualizar setPlatoStates:                               │
│     - Por cada plato con procesandoPor                          │
│     - Setear estado visual a 'procesando'                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UI ACTUALIZADA                               │
│                                                                 │
│  ┌─────────────────────────────────────┐                        │
│  │  Orden #123  │  M5  │ 👨‍🍳 Juan      │                        │
│  ├─────────────────────────────────────┤                        │
│  │  ⏳ 1 Lomo Saltado     👨‍🍳 Tú       │ ← Amarillo             │
│  │  ⏳ 1 Arroz con Pollo  👨‍🍳 Tú       │ ← Amarillo             │
│  │  ⏳ 2 Tallarines       👨‍🍳 Tú       │ ← Amarillo             │
│  └─────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Sistema de 3 Estados para Comandas (v7.4)

### Estados Visuales

| Estado | Descripción | Contorno | Check ✓ | Badge |
|--------|-------------|----------|---------|-------|
| `normal` | Comanda sin tomar o tomada por otro | Default | No | - |
| `dejar` | Tomada por mí, quiero dejarla | Rojo | No | "👨‍🍳 Yo" (amarillo) |
| `finalizar` | Tomada por mí, lista para entregar | Verde | **Sí** | "👨‍🍳 Yo" (amarillo) |

### Código de Estados (Backend)

**Ubicación:** `Backend-LasGambusinas/src/controllers/procesamientoController.js`

```javascript
// Sistema de 3 estados:
// 1. normal → Tomar Comanda → asigna procesandoPor a comanda y platos
// 2. dejar → Dejar Comanda → limpia procesandoPor de comanda y platos
// 3. finalizar → Finalizar Comanda → marca todos los platos como 'recoger'
```

### Código de Estados (Frontend)

**Ubicación:** `appcocina/src/components/Principal/comandastyle.jsx`

```javascript
// v7.4: Estados visuales de comandas para el ciclo de 3 estados
const [comandaStates, setComandaStates] = useState(new Map()); 
// Map<comandaId, 'normal'|'dejar'|'finalizar'>

// Determinar el estado visual de la comanda
const tomadaPorMi = comanda.procesandoPor?.cocineroId?.toString() === usuarioActualId?.toString();
const comandaState = comandaStates?.get(comandaId) || 'normal';

// Determinar el color del contorno según el estado
if (tomadaPorMi) {
  if (comandaState === 'dejar') {
    // Estado DEJAR: contorno rojo
    borderStyle = '4px solid #ef4444';
  } else if (comandaState === 'finalizar') {
    // Estado FINALIZAR: contorno verde
    borderStyle = '4px solid #22c55e';
  }
}
```

---

## 8. Correcciones Necesarias

### Corrección 1: Check ✓ solo con contorno verde

**Archivo:** `appcocina/src/components/Principal/comandastyle.jsx`

**Líneas:** 4067-4093

**Cambio:**
```diff
- {isSelected && (
+ {tomadaPorMi && comandaState === 'finalizar' && (
```

**Explicación:** El check ✓ grande solo debe mostrarse cuando:
1. La comanda está tomada por mí (`tomadaPorMi`)
2. El estado visual es `finalizar` (contorno verde)

Esto elimina la confusión de 4 estados. El `isSelected` es para selección en lote, NO para mostrar el check.

### Corrección 2: Verificar Socket Handler para COMANDA_TOMADA

**Archivo:** `appcocina/src/components/Principal/comandastyle.jsx`

**Líneas:** 993-1016

**Estado:** ✅ YA IMPLEMENTADO CORRECTAMENTE

El handler ya actualiza `platoStates` cuando recibe `data.comanda.platos`.

### Corrección 3: Verificar que el evento Socket incluya la comanda completa

**Archivo:** `Backend-LasGambusinas/src/socket/events.js`

**Líneas:** 1602-1631

**Estado:** ✅ YA IMPLEMENTADO CORRECTAMENTE

El evento `comanda-procesando` ya incluye la comanda completa con los platos actualizados.

---

## 9. Puntos Críticos a Verificar

### Backend
- [x] Usar `updateOne` con `$set` para cada plato
- [x] Volver a cargar la comanda después de actualizar para enviar datos frescos en el Socket
- [x] Verificar que los logs muestren `platosTomados > 0`

### Frontend
- [x] El evento Socket debe incluir la comanda completa con los `platos` actualizados
- [x] El handler `COMANDA_TOMADA` debe actualizar `platoStates` para cada plato
- [ ] **PENDIENTE:** Verificar en consola del navegador que el evento llega con `data.comanda.platos`
- [ ] **PENDIENTE:** Cambiar la condición del check ✓ de `isSelected` a `tomadaPorMi && comandaState === 'finalizar'`

### Base de Datos
- [ ] Verificar en MongoDB que los platos tengan `procesandoPor` después de tomar la comanda
- [ ] Verificar que el estado de los platos sea `'en_espera'` (no `'pedido'`)

---

## 10. Comandos de Depuración

### Verificar en MongoDB:
```javascript
// Buscar comanda y ver estado de platos
db.comandas.findOne({ comandaNumber: 123 }, {
  "platos.estado": 1,
  "platos.procesandoPor": 1,
  procesandoPor: 1
})
```

### Logs del Backend:
```
[TomarComanda] Request recibido { comandaId: '...', cocineroId: '...' }
[TomarComanda] Comanda tomada con platos { comandaId: '...', cocineroId: '...', platosTomados: 3 }
```

### Logs del Frontend (consola navegador):
```
[Procesamiento] Cambio recibido: COMANDA_TOMADA
```

---

## 11. Archivos Involucrados

| Archivo | Tipo | Estado | Descripción |
|---------|------|--------|-------------|
| `Backend-LasGambusinas/src/controllers/procesamientoController.js` | Backend | ✅ OK | Endpoints de tomar plato/comanda |
| `Backend-LasGambusinas/src/socket/events.js` | Backend | ✅ OK | Emisión de eventos Socket |
| `appcocina/src/hooks/useProcesamiento.js` | Frontend | ✅ OK | Hook de procesamiento |
| `appcocina/src/components/Principal/comandastyle.jsx` | Frontend | ❌ ERROR | Vista de comandas - Check ✓ incorrecto (líneas 4067-4093) |
| `appcocina/src/components/Principal/ComandastylePerso.jsx` | Frontend | ❌ ERROR | Vista personalizada - Check ✓ incorrecto (líneas 4229-4255) |

---

## 12. Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v7.2 | Marzo 2026 | Sistema multi-cocinero con identificación en platos |
| v7.3 | Marzo 2026 | Funciones de tomar/dejar comanda completa |
| v7.4 | Marzo 2026 | Tomar comanda también toma todos los platos. **PENDIENTE:** Corregir visualización del check ✓ |

---

## 13. Próximos Pasos

### 1. Corregir el Check ✓ en comandastyle.jsx

**Archivo:** `appcocina/src/components/Principal/comandastyle.jsx`

**Línea:** 4068

**Cambio:**
```diff
- {isSelected && (
+ {tomadaPorMi && comandaState === 'finalizar' && (
```

### 2. Corregir el Check ✓ en ComandastylePerso.jsx

**Archivo:** `appcocina/src/components/Principal/ComandastylePerso.jsx`

**Línea:** 4230

**Cambio:**
```diff
- {isSelected && (
+ {tomadaPorMi && comandaState === 'finalizar' && (
```

### 3. Testear el Flujo Completo

1. **Tomar Comanda:**
   - Clic en "Tomar Comanda"
   - Verificar que el badge amarillo aparezca con el nombre del cocinero
   - Verificar que TODOS los platos se pongan amarillos (estado procesando)

2. **Ciclar Estados:**
   - Clic en la comanda tomada → contorno ROJO (estado dejar)
   - Clic nuevamente → contorno VERDE (estado finalizar)
   - **El check ✓ debe aparecer SOLO en este momento**
   - Clic nuevamente → vuelve a estado normal

3. **Finalizar Comanda:**
   - Con el contorno verde (y check visible), clic en "Finalizar Comanda"
   - Verificar que todos los platos pasen a estado "recoger"

### 4. Verificar en Consola

Abrir la consola del navegador y verificar:

```javascript
// Al tomar comanda:
[Procesamiento] Cambio recibido: COMANDA_TOMADA
// Debe mostrar data.comanda.platos con procesandoPor en cada plato
```

### 5. Verificar en Base de Datos

```javascript
// En MongoDB:
db.comandas.findOne({ comandaNumber: 123 }, {
  procesandoPor: 1,
  "platos.procesandoPor": 1,
  "platos.estado": 1
})
// Todos los platos deben tener procesandoPor asignado
```

---

**Autor:** Sistema de documentación automática  
**Última actualización:** Marzo 2026
