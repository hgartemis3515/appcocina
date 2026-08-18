# Bug: Ver Cocina Completo no oculta el plato al finalizar (hasta recargar)

Estado: **Corregido** · Fecha: 2026-08-18

## Objetivo de la vista

Ver Cocina Completo es un monitor **pasivo**. No se toma ni se finaliza ahí.

| Acción en las 3 tablas KDS (General / Personalizada / Supervisor) | Qué debe verse en Ver Cocina Completo |
|---|---|
| Asignar / tomar un plato a un cocinero | Aparece en el bloque de ese cocinero, con cronómetro y orden `#1/#2/#3` |
| Finalizar guarnición (`estadoCocina: recoger`) | Desaparece **solo esa guarnición**; el principal se queda |
| Finalizar el plato principal (`estado: recoger`) | Desaparece **solo ese plato** (el grupo reduce cantidad; si era el último, se va) |

Mongo ya guardaba `recoger`. Recargar GET `/api/comanda/cocina/:fecha` ocultaba el plato. El fallo era **solo el parche en vivo**.

## Síntoma

1. Supervisor (u otro KDS) asigna un plato → Ver Cocina Completo **sí** lo muestra.
2. El mismo operador finaliza el plato → pasa a Recoger en KDS.
3. En Ver Cocina Completo el cocinero **sigue viendo** su plato (timer y #N).
4. Recargar la página → el plato desaparece.

## Causa

Dos fallos se sumaban.

### 1. Room de socket distinta al tomar vs al finalizar (principal)

`useSocketCocina` (Ver Cocina) se une solo a `fecha-HOY`.

El GET de cocina también trae **comandas atrasadas** (`createdAt` de días anteriores aún no entregadas).

| Evento | Rooms | ¿Llega a Ver Cocina (fecha-hoy)? |
|---|---|---|
| `plato-procesando` (tomar / asignar) | `fecha-hoy` **y** `fecha-createdAt` | Sí → el plato aparece |
| `plato-actualizado` (finalizar → recoger) | **solo** `fecha-createdAt` | No, si la comanda no es de hoy → el plato se queda |

Por eso asignar funcionaba en vivo y finalizar no, hasta recargar.

### 2. Parche en cliente frágil

`useCocinaMonitorData` reemplazaba la comanda entera del payload. Si `_id` no coincidía (ObjectId vs string) **añadía** otra comanda y dejaba la vieja (el plato seguía visible). Si `platos` no venía como array, se **descartaba** el evento y no se aplicaba `nuevoEstado: recoger`.

El filtro de Ver Cocina (`useCocinaMonitorFilter`) solo pinta platos en `pedido`/`en_espera` **con** `procesandoPor`. Hay que setear `estado: recoger` **y** limpiar `procesandoPor` en esa línea.

Guarniciones no mueven `platos[].estado`; solo `complementosSeleccionados.estadoCocina`.

## Corrección

1. **Backend** `emitPlatoActualizado`: emitir a `fecha-hoy` y `fecha-createdAt` (igual que tomar). Payload plano (`toObject()`), `comandaId`/`platoId` string.
2. **Cliente** `useCocinaMonitorData`: parche granular de la línea (`estado` + quitar `procesandoPor`) **antes** de fusionar la comanda. Al finalizar, **no** agregar una comanda nueva si el id no matchea.
3. Match de plato por `_id` de línea (normalizado), no por id de catálogo.

## Cómo verificar

1. Abrir Ver Cocina Completo (o un monitor filtrado por cocinero).
2. En Supervisor/KDS, tomar un plato → aparece en Completo con timer y #N.
3. Finalizar ese plato → desaparece **sin recargar**.
4. Plato con extras: finalizar guarnición → solo desaparece la extra; finalizar principal → desaparece el principal.
5. Repetir con una comanda **atrasada** (día anterior aún abierta).
