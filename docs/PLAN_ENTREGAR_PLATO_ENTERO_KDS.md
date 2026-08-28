# Entregar plato entero (atajo KDS por rol)

Atajo de un clic en las tablas KDS: **Finalizar plato** (`pedido/en_espera` → `recoger`) + **Entregar plato** (`recoger` → `salio`) en la misma acción, para no pasar por el pass.

## Por qué es un permiso (no una regla)

En `roles.html` hay dos pestañas:

| Catálogo | Semántica | Admin |
|----------|-----------|--------|
| **Permisos** | Capacidades (mostrar botón, ver pantalla) | Tiene todas |
| **Reglas** | Restricciones (`hasRegla` → **false** en admin) | No aplican |

Este atajo es una **capacidad**: quien lo tiene ve el botón. El patrón es el mismo que `ver-boton-prioridad-kds`. Si fuera regla, el admin nunca lo vería.

**Id:** `entregar-plato-entero-kds`  
**Nombre en roles:** Entregar plato entero  
**Grupo:** App Cocina  

No otorga transiciones nuevas. Quien ya puede finalizar y entregar por separado solo gana el botón combinado.

## Dónde se asigna

Dashboard → **Roles** → pestaña Permisos → grupo **App Cocina** → *Entregar plato entero*.

| Rol sistema | Default |
|-------------|---------|
| admin | Sí (todos los permisos) |
| supervisor | Sí |
| cocinero | Sí |
| mozos / cajero | No |

Los roles **personalizados** no lo heredan: hay que marcarlo. Tras cambiar permisos, **volver a iniciar sesión** en App Cocina (el JWT lleva la lista).

Al arrancar el backend, `inicializarRolesSistema` reescribe los permisos de roles de sistema desde `PERMISOS_POR_ROL_SISTEMA`.

## UI KDS

Barra inferior, **a la derecha** del botón contextual (Tomar / Dejar / **Finalizar plato** / Entregar):

`[Finalizar plato] [Entregar plato entero] [Finalizar comanda] …`

Visible en Vista General, Personalizada y Supervisor (`comandastyle.jsx` + `ComandastylePerso.jsx`).

- Visible solo con el permiso (admin siempre).
- Habilitado si el contextual está en `FINALIZAR_PLATO` o `ENTREGAR_PLATO`.
- Deshabilitado en Tomar, Dejar, Solicitar Orden o sin selección.

## Flujo de estados

```
pedido / en_espera  --Finalizar-->  recoger  --Entregar (pass)-->  salio  --Mozo-->  entregado
                         \________________ Entregar plato entero ________________/
```

1. Guarniciones seleccionadas (si hay) → finalizar primero (evita 409 `FALTAN_GUARNICIONES`).
2. Platos en preparación seleccionados (verde) → mismo lote que Finalizar (incluye filtro de cola si `obligarOrdenAsignacion`).
3. Esos platos, más los que ya estaban en `recoger` marcados para entregar → `salio`.

Si el paso 2 falla (orden de cola, no es el #1, etc.), no se marca `salio`. Hay que respetar cola o usar Solicitar Orden, igual que Finalizar.

El mozo sigue entregando al comensal desde `salio`. No se salta a `entregado`.

## APIs (sin endpoint nuevo)

| Paso | API |
|------|-----|
| Finalizar | `PUT /api/comanda/:id/plato/:platoId/estado` `{ nuevoEstado: "recoger" }` o `…/finalizar` |
| Guarnición | `PUT …/guarnicion/:compId/finalizar` |
| Salida pass | `PUT …/estado` `{ nuevoEstado: "salio" }` |

Misma validación que los dos botones sueltos: atribución al que tomó el plato, supervisor/`utilidad-supervisor`, autocierre de guarniciones, sockets `plato-actualizado` y push *salió de cocina*.

## Código

| Pieza | Path |
|-------|------|
| Permiso | `backend-gambusinas/src/database/models/roles.model.js` |
| Lógica cliente | `appcocina/src/utils/entregarPlatoEnteroKds.js` |
| Botón | `appcocina/src/components/Principal/BotonEntregarPlatoEntero.jsx` |
| Tablas | `comandastyle.jsx`, `ComandastylePerso.jsx` |

## Pruebas

1. Rol **sin** el permiso: el botón no aparece; Finalizar y Entregar siguen igual.
2. Rol **con** el permiso: botón a la derecha de Finalizar.
3. Plato tomado, toque verde → Entregar plato entero → en Mongo `salio` (no se queda en `recoger`).
4. Con orden obligatorio, marcar solo el #2 → se bloquea igual que Finalizar.
5. Plato ya en pass (`recoger`, toque entregar) → el atajo solo confirma `salio`.
6. Supervisor sobre plato de otro cocinero: mismo criterio que Finalizar/Entregar.
7. Tras el atajo, el mozo ve el plato en `salio` para entregar a mesa.

## Relacionado

- Flujo pass: `docs/PLAN_FLUJO_SALIO_ENTREGA_PLATOS.md`
- Cola / Solicitar Orden: `appcocina/docs/PLAN_OBLIGAR_ORDEN_ASIGNACION_KDS_SUPERVISOR.md`
- Catálogo de roles: `backend-gambusinas/docs/USUARIOS_ROLES_PERMISOS.md`
