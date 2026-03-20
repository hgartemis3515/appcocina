<<<<<<< HEAD
# Reporte Automático del App de Cocina – Las Gambusinas (2026-03-15)

## 1. Resumen Ejecutivo

- El frontend tiene base de seguridad mejorada (auth en `AuthContext`, `ProtectedRoute`, handshake JWT en socket), pero persisten riesgos altos: token en `localStorage`, endpoints REST críticos sin uso del cliente HTTP autenticado centralizado y acciones sensibles sin control explícito de rol en UI.
- Se detectaron problemas operativos de integridad del tablero KDS: filtros muy estrictos que pueden ocultar comandas, búsqueda limitada solo a nombre de plato, y persistencia local de estado visual por plato sin limpieza por fecha.
- Hay inconsistencias de lógica que impactan operación diaria: rol para prioridad alta (`cocina`) no alineado con login (`cocinero/admin`), filtros de reportes que no afectan métricas, y código huérfano de “entregado” que quedó sin función activa.
- En rendimiento, el diseño actual mezcla varios intervalos por segundo, animaciones permanentes por tarjeta y operaciones costosas de clonación/búsqueda que pueden degradar pantallas con alto volumen.
- La documentación existe y es amplia (`APP_COCINA_DOCUMENTACION_COMPLETA.md`, `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md`), pero tiene secciones desalineadas con la implementación actual de cocina (login, estados, columnas, polling y endpoints).
=======
# Reporte Automático del App de Cocina – Las Gambusinas (2026-03-16)

## 1. Resumen Ejecutivo

- Se detectaron hallazgos de seguridad de severidad alta en el frontend: persistencia de sesión en `localStorage`, uso inconsistente de autenticación en llamadas REST y controles de autorización frágiles en acciones sensibles.
- En la lógica de operación del KDS hay riesgos reales de integridad visual: filtros que pueden ocultar comandas válidas, estados de platos persistidos por índice y desalineación entre permisos esperados y botones habilitados.
- El rendimiento puede degradarse con alto volumen por intervalos por tarjeta, animaciones permanentes y recomputaciones frecuentes en render.
- La documentación principal está parcialmente desactualizada respecto al código actual (auth con `username + password`, reglas de “entregado” desde cocina, endpoints de anulación y polling fallback).
- Se identificaron oportunidades de producto de alto impacto con esfuerzo acotado: KPIs en vivo, modos por estación, atajos de operación y mejor resiliencia visual ante desconexión.
>>>>>>> c92dc1edbc62be2e5b3b353028700242e6dd95d1

---

## 2. Seguridad en Frontend y Comunicación con Backend
### 2.1 Issues críticos / altos

<<<<<<< HEAD
#### 1) Token de sesión persistido en `localStorage`
- **Severidad:** alta
- **Área afectada:** contexto de autenticación y persistencia de sesión.
- **Qué está mal:** el JWT se guarda/restaura desde `localStorage` (`cocinaAuth`), junto con datos de usuario.
- **Por qué es riesgoso:** en una app web de red local, una inyección XSS o acceso físico al navegador permite extraer sesión reutilizable.
- **Recomendación:** mover sesión a cookie segura `HttpOnly` cuando sea posible; si no, reducir superficie con expiración corta, rotación y limpieza defensiva por inactividad, cierre y cambio de usuario.

#### 2) Endpoints REST de operación usan `axios` directo sin cliente autenticado central
- **Severidad:** alta
- **Área afectada:** `ComandaStyle`, `RevertirModal`, `AnotacionesModal`.
- **Qué está mal:** existe `apiClient` con interceptor de `Authorization`, pero el flujo principal de cocina usa `axios` directo y no adjunta token de forma homogénea.
- **Por qué es riesgoso:** queda ambigüedad de autorización real; si backend no exige token en todos esos endpoints, acciones críticas podrían ejecutarse por confianza de red.
- **Recomendación:** migrar llamadas REST al cliente central (`apiClient`) y exigir autorización server-side por endpoint.
- **Hipótesis a validar con backend:** si hoy la seguridad depende de otro canal (cookie/sesión), documentarlo explícitamente y mantenerlo consistente.

#### 3) Acciones sensibles sin gating robusto de permisos en UI
- **Severidad:** alta
- **Área afectada:** flujos de anulación, reversión y finalización masiva.
- **Qué está mal:** se importa `canPerformSensitiveActions` pero no se usa; varios botones/acciones sensibles dependen de selección, no de permiso.
- **Por qué es riesgoso:** operadores autenticados con rol no autorizado podrían intentar acciones de alto impacto; si backend falla validación de rol, hay riesgo de abuso.
- **Recomendación:** aplicar control de permiso en UI por rol real y mantener validación fuerte en backend como fuente de verdad.

#### 4) Exposición de infraestructura en configuración frontend
- **Severidad:** alta
- **Área afectada:** configuración de entorno y conectividad backend.
- **Qué está mal:** `.env` del frontend incluye IP privada real y host permitido (`REACT_APP_IP`, `REACT_APP_API_COMANDA`, `REACT_APP_ALLOWED_HOSTS`).
- **Por qué es riesgoso:** las variables `REACT_APP_*` se incluyen en build cliente; exponen detalles de red interna y acoplan despliegue a infraestructura fija.
- **Recomendación:** externalizar configuración sensible fuera del bundle público, usar dominios internos estables y pipeline por ambiente.

#### 5) Transporte y URL backend privilegian `http://` en todo el flujo
- **Severidad:** alta
- **Área afectada:** `apiConfig` y conexiones REST/socket.
- **Qué está mal:** normalización y defaults de URL usan `http://` y no fuerzan TLS.
- **Por qué es riesgoso:** tráfico legible/manipulable en segmentos de red donde no exista aislamiento fuerte.
- **Recomendación:** soportar y preferir `https://`/WSS en producción, con validación de esquema por ambiente.

### 2.2 Issues medios / bajos

#### 6) Mensajes de error backend se muestran directamente en `alert`
- **Severidad:** media
- **Área afectada:** modales de anotaciones y anulación.
- **Qué está mal:** se expone `error.response.data.message`/`error` en UI operativa.
- **Por qué es riesgoso:** fuga de detalles internos y experiencia inconsistente para personal de cocina.
- **Recomendación:** normalizar mensajes de usuario y llevar detalle técnico a logging controlado.

#### 7) Logging operativo excesivo en consola
- **Severidad:** media
- **Área afectada:** tablero principal y eventos socket.
- **Qué está mal:** se imprime información extensa de comandas, platos y estados.
- **Por qué es riesgoso:** facilita fuga accidental de datos operativos y dificulta depuración útil por ruido.
- **Recomendación:** limitar logs a `development` y usar niveles estructurados.

#### 8) Limpieza de listeners socket no totalmente explícita
- **Severidad:** baja
- **Área afectada:** `useSocketCocina`.
- **Qué está mal:** en cleanup se usa `socket.off('*')`, patrón no estándar para remover listeners específicos registrados.
- **Por qué es riesgoso:** posible deuda técnica para mantenimiento de eventos y reconexiones complejas.
- **Recomendación:** desuscribir eventos nombrados explícitamente en cleanup.

#### 9) Dependencias probablemente innecesarias en frontend
- **Severidad:** baja
- **Área afectada:** `package.json`.
- **Qué está mal:** hay señales de paquetes no utilizados en runtime web (`install`, `dotenv` cliente, `@react-native-async-storage/async-storage`).
- **Por qué es riesgoso:** mayor superficie de actualización y vulnerabilidades.
- **Recomendación:** auditoría de dependencias y limpieza periódica.
=======
#### 1) Uso inconsistente de cliente autenticado para llamadas sensibles
- Severidad: alta
- Área afectada: `comandastyle.jsx`, `RevertirModal.jsx`, `AnotacionesModal.jsx`, `AuthContext.jsx`.
- Qué está mal: existe un cliente central (`apiClient.js`) con interceptor de `Authorization`, pero la mayoría de acciones operativas usa `axios` directo sin esa capa común.
- Por qué es riesgoso: el contrato de seguridad queda disperso y propenso a llamadas sin control homogéneo de sesión/errores; en red local web esto facilita fallos de autorización por omisión o inconsistencias entre pantallas.
- Recomendación: migrar llamadas críticas a `apiClient` (o wrapper único), exigir `Authorization` de forma consistente y centralizar normalización de errores.

#### 2) Persistencia de token JWT en `localStorage`
- Severidad: alta
- Área afectada: `AuthContext.jsx`, `apiClient.js`.
- Qué está mal: el token de sesión se guarda en `localStorage` (`cocinaAuth`) y además se expone para otras capas de UI.
- Por qué es riesgoso: ante XSS, sesión compartida o acceso físico al navegador, el token puede ser extraído y reutilizado.
- Recomendación: preferir cookie `HttpOnly` cuando el backend lo permita; si no, reducir tiempo de vida efectivo en frontend, endurecer logout forzado y limpiar de forma agresiva al detectar anomalías.

#### 3) Controles de autorización de UI inconsistentes para acciones sensibles
- Severidad: alta
- Área afectada: toolbar en `comandastyle.jsx`, flujo de prioridad/anulación/reversión.
- Qué está mal: la habilitación de prioridad depende de `userRole === 'cocina'`, mientras el propio flujo de login/documentación menciona roles `cocinero/admin`; además se importa `canPerformSensitiveActions` pero no se usa para gobernar acciones críticas.
- Por qué es riesgoso: se pueden bloquear usuarios legítimos o exponer rutas funcionales de forma incoherente; esto incrementa errores operativos y decisiones de seguridad basadas en UI en vez de política explícita.
- Recomendación: unificar matriz de permisos en `AuthContext` y aplicar el mismo criterio en todos los botones sensibles, con validación de rol también en backend.

### 2.2 Issues medios / bajos

#### 4) Configuración de backend flexible en cliente con validación laxa en desarrollo
- Severidad: media
- Área afectada: `apiConfig.js`, `ConfigModal.jsx`.
- Qué está mal: la URL de backend es editable y se guarda en `localStorage`; en desarrollo, si no hay hosts permitidos, se acepta cualquier host.
- Por qué es riesgoso: en entornos de pruebas compartidos o redes mixtas se puede redirigir tráfico a un backend incorrecto.
- Recomendación: exigir lista explícita de hosts por entorno y mostrar estado de “origen confiable/no confiable” antes de guardar.

#### 5) Exposición de mensajes de backend en alertas de UI
- Severidad: media
- Área afectada: `comandastyle.jsx`, `AnotacionesModal.jsx`, `RevertirModal.jsx`.
- Qué está mal: en varios `catch` se muestra `error.response?.data?.message` directamente al operador.
- Por qué es riesgoso: mensajes internos pueden filtrar detalles técnicos y generar confusión operativa.
- Recomendación: mapear errores por código a mensajes de negocio estables y enviar detalle técnico solo a logs controlados.

#### 6) Peticiones `fetch` por ítem en tarjeta para resolver nombres faltantes
- Severidad: baja
- Área afectada: `SicarComandaCard` dentro de `comandastyle.jsx`.
- Qué está mal: se invoca `fetch` a `/api/platos/:id` por cada plato sin nombre en historial.
- Por qué es riesgoso: amplía superficie de tráfico y complica trazabilidad de autenticación/caché.
- Recomendación: endpoint batch o caché compartida de nombres por `platoId` con TTL y deduplicación central.

#### 7) Gestión de socket correcta en lo base, pero sin protección explícita anti-flood en cliente
- Severidad: baja
- Área afectada: `useSocketCocina.js`.
- Qué está mal: hay heartbeat y reconexión, pero no existe limitación explícita de frecuencia de eventos de negocio desde cliente.
- Por qué es riesgoso: no es un vector único de ataque, pero sí una debilidad de robustez en despliegues web internos.
- Recomendación: complementar del lado servidor con rate limiting por socket y del lado cliente con guardas de emisión por evento.
>>>>>>> c92dc1edbc62be2e5b3b353028700242e6dd95d1

### 2.3 Checklist de higiene de seguridad en la App de Cocina
- [ ] Manejo correcto de tokens/sesión
- [x] Navegación protegida (Login → Menú → KDS)
- [ ] Manejo seguro de errores en UI
- [x] Evitar XSS/inyecciones en la interfaz
- [ ] WebSockets gestionados correctamente (auth / reconexión / flood)

---

## 3. Lógica de UI, Consistencia e Integridad de Información

### Problemas detectados

<<<<<<< HEAD
#### 1) Filtro de tablero puede ocultar comandas válidas
- **Flujo afectado:** visualización principal de cocina.
- **Impacto en operación:** si una comanda llega con platos sin nombre hidratado o con `status` distinto a `en_espera`, puede desaparecer del tablero aunque siga activa.
- **Cambio lógico recomendado:** mostrar estado “pendiente de sincronización” en vez de ocultar, y tolerar alias de estado (`enespera`/`en_espera`) de manera consistente.

#### 2) Búsqueda limitada solo a nombre de plato
- **Flujo afectado:** búsqueda y filtrado.
- **Impacto en operación:** no se puede ubicar rápido por número de comanda, mesa o mozo en hora pico.
- **Cambio lógico recomendado:** extender búsqueda a `comandaNumber`, mesa y mozo (además de platos), con normalización de texto.

#### 3) Prioridad alta condicionada a rol `cocina` no alineado con auth
- **Flujo afectado:** priorización VIP.
- **Impacto en operación:** usuarios válidos (`cocinero` o `admin`) pueden no ver/habilitar la acción de prioridad.
- **Cambio lógico recomendado:** unificar matriz de roles entre login, contexto y botones (`cocinero/admin/supervisor`) y mantener validación backend.

#### 4) Filtros de `ReportsModal` no modifican métricas
- **Flujo afectado:** reportes y decisiones operativas.
- **Impacto en operación:** el usuario cambia filtros de mozo/mesa/estado, pero los totales y rankings permanecen globales.
- **Cambio lógico recomendado:** calcular estadísticas sobre dataset filtrado y mostrar “filtros activos”.

#### 5) Persistencia local de `platoStates` sin limpieza temporal
- **Flujo afectado:** selección/finalización de platos.
- **Impacto en operación:** pueden aparecer estados visuales “fantasma” tras cambios de día, estructura de platos o reutilización de pantalla.
- **Cambio lógico recomendado:** limpiar por fecha de operación y por cierre/anulación de comanda; preferir estado derivado de backend para evitar drift.

#### 6) Claves serializadas con `split('-')` en anulación
- **Flujo afectado:** anulación de platos desde modal.
- **Impacto en operación:** si el formato de IDs cambia a uno con guiones, el parseo puede fallar y anular selección incorrecta.
- **Cambio lógico recomendado:** usar delimitador seguro (`::`) o estructura serializada con JSON.
- **Hipótesis:** hoy con ObjectId clásico puede no fallar, pero es deuda de robustez.

#### 7) Código huérfano de “entregado” con función inexistente
- **Flujo afectado:** modal de confirmación de entregado.
- **Impacto en operación:** riesgo de error en tiempo de ejecución si se activa esa ruta en futuras iteraciones.
- **Cambio lógico recomendado:** eliminar bloque de UI huérfano o reimplementar flujo completo coherente con regla actual de cocina (`recoger`).

#### 8) Configuración de grid (cols/rows) no controla layout real
- **Flujo afectado:** diseño y paginación del tablero.
- **Impacto en operación:** operador configura diseño esperando columnas/filas visibles, pero en práctica solo cambia tamaño de página y no el grid real.
- **Cambio lógico recomendado:** alinear `gridTemplateColumns/Rows` con configuración o renombrar opción para evitar expectativa incorrecta.
=======
#### 1) Filtro estricto oculta comandas con datos parcialmente hidratados
- Flujo afectado: visualización principal y búsqueda.
- Impacto en operación real: una comanda puede no aparecer si algún plato llega sin nombre temporalmente, ocultando trabajo pendiente en horas pico.
- Cambio lógico recomendado: mostrar estado “comanda en sincronización” en lugar de ocultarla completa y reintentar hidratación de datos.

#### 2) Persistencia local de estado visual por índice de plato (`comandaId-platoIndex`)
- Flujo afectado: selección múltiple, finalización por lote, anulación.
- Impacto en operación real: cambios de estructura en `platos` pueden dejar checks/estados “fantasma” y provocar acciones sobre elementos no esperados.
- Cambio lógico recomendado: clave estable por subdocumento de plato (`plato._id`) y limpieza automática por cambio de fecha, comanda cerrada o comanda eliminada.

#### 3) Inconsistencia entre roles reales y habilitación de prioridad
- Flujo afectado: prioridad alta.
- Impacto en operación real: operadores con rol válido pueden quedar sin acceso al flujo VIP, o depender de estado de UI confuso.
- Cambio lógico recomendado: usar un único helper de permisos (`hasRole`/`canPerformSensitiveActions`) y eliminar comparaciones hardcodeadas de string.

#### 4) Auto-transición a `recoger` puede competir con acciones manuales
- Flujo afectado: finalización de platos y finalización de comanda completa.
- Impacto en operación real: posibles carreras de estado (PUT simultáneos), toasts duplicados o latencia visual en sincronización.
- Cambio lógico recomendado: orquestar transición en una sola vía idempotente y marcar “comanda en transición” para bloquear dobles disparos.

#### 5) Revertir limita a 24h aunque la UI comunica “sin límite”
- Flujo afectado: reversión de platos/comandas.
- Impacto en operación real: cocina puede no encontrar pedidos reversibles de turnos largos y asumir que “desaparecieron”.
- Cambio lógico recomendado: alinear regla real de tiempo con el texto operativo o hacer el rango configurable.

#### 6) Filtros de `ReportsModal` no modifican métricas
- Flujo afectado: reportes del día.
- Impacto en operación real: lectura de datos engañosa (el usuario cree filtrar por mozo/mesa/estado y los números no cambian).
- Cambio lógico recomendado: aplicar filtros al dataset antes de cálculos y mostrar “filtros activos” en el encabezado del reporte.
>>>>>>> c92dc1edbc62be2e5b3b353028700242e6dd95d1

### Invariantes que la App de Cocina debería garantizar

| Invariante | Estado |
|---|---|
<<<<<<< HEAD
| Si una comanda aparece en “lista para mozo”, no debe seguir visible en el tablero principal de preparación | Se cumple parcialmente |
| Una comanda activa no debe desaparecer solo por hidratar tarde el nombre de un plato | No se garantiza |
| La suma de platos en preparación + listos + anulados/eliminados debe corresponder al total operativo visible | Se cumple parcialmente |
| Un click en plato de preparación no debe seleccionar/deseleccionar la comanda completa | Se cumple |
| Un plato finalizado debe corresponder exactamente al subdocumento seleccionado | Se cumple parcialmente |
| Estados visuales locales no deben sobrevivir al cambio de día/turno | No se garantiza |
| Los filtros de reportes deben afectar números y exportación PDF | No se garantiza |
| La prioridad VIP debe responder al rol correcto y mantenerse consistente entre orden y badge | Se cumple parcialmente |
| Una acción sensible debe requerir permiso de rol en UI y backend | Se cumple parcialmente |
| Errores de backend no deben mostrarse crudos al operador | No se garantiza |
=======
| Una comanda eliminada (`IsActive=false` o `eliminada=true`) no debe permanecer en el tablero | Se cumple parcialmente |
| Si todos los platos activos están en `recoger`, la comanda debe pasar a estado listo para mozos sin duplicar transiciones | Se cumple parcialmente |
| Una comanda en estado distinto de `en_espera` no debe mostrarse en el carril principal de cocina | Se cumple |
| Un plato anulado (`anulado=true`) no debe mostrarse como reversible en el modal de revertir | Se cumple |
| La selección visual de platos no debe sobrevivir a reordenamientos/cambios estructurales | No se garantiza |
| Acciones sensibles (priorizar, anular, revertir) deben estar habilitadas solo para roles autorizados y coherentes | No se garantiza |
| Los filtros de reportes deben impactar los KPIs y exportaciones mostradas | No se garantiza |
| La UI nunca debe ocultar comandas activas por hidratación parcial de campos no críticos | No se garantiza |
>>>>>>> c92dc1edbc62be2e5b3b353028700242e6dd95d1

---

## 4. Rendimiento y Arquitectura de la App de Cocina

### Hallazgos

<<<<<<< HEAD
- Hay dos relojes por segundo: uno global en `ComandaStyle` y otro por tarjeta en `SicarComandaCard`; esto escala mal con muchas comandas.
- Se usa clonado profundo con `JSON.parse(JSON.stringify(...))` al actualizar comanda por socket; costo alto y pérdida potencial de tipos/fechas.
- El render de tarjetas tiene animaciones permanentes (pulsos, escalados, badges animados) que pueden impactar CPU/GPU en pantallas 24/7.
- Para platos eliminados con nombre faltante se hacen `fetch` por plato desde tarjeta; patrón N+1 que empeora en lotes grandes.
- Hay múltiples búsquedas lineales y derivaciones repetidas en render (find/indexOf/filter/map sobre arreglos grandes).

### Mejoras realistas para el stack actual

- Centralizar un “ticker” único de tiempo y derivar presentación por memoización.
- Sustituir deep clone por actualización inmutable granular de solo los campos afectados.
- Mover cálculo pesado de listas/estadísticas a `useMemo` y/o hooks de dominio (`useComandasKDS`).
- Crear modo “alto volumen” de UI: menos animaciones y refresh visual por lotes.
- Resolver nombres de platos faltantes con endpoint batch o caché global por `platoId`.
- Unificar capa de datos REST+Socket para separar transporte, reglas de negocio y presentación.
=======
- Hay actualización por segundo en el contenedor principal y además intervalos por tarjeta (`SicarComandaCard`), lo que multiplica renders con muchas comandas.
- Se usan operaciones costosas en caliente, incluyendo clonados profundos de comandas y búsquedas repetidas (`find`, `indexOf`, `filter`) dentro de bucles de render/interacción.
- Las tarjetas combinan varias animaciones permanentes de Framer Motion; en pantallas 24/7 con alto volumen esto puede impactar CPU/GPU.
- Parte de la lógica de datos y de presentación está mezclada en `comandastyle.jsx` (archivo grande, múltiples responsabilidades), dificultando escalar y testear.
- La resolución de nombres faltantes de platos por llamada individual añade carga de red y latencia visual.

### Mejoras realistas para el stack actual

- Extraer un hook de dominio (`useKdsComandas`) para separar transporte (REST/Socket), normalización y reglas de transición.
- Centralizar un “ticker” global para tiempos y evitar intervalos por tarjeta.
- Normalizar datos por id (`comandasById`, `platosById`) para reducir búsquedas lineales y simplificar updates granulares.
- Implementar un modo “alto volumen” con animaciones mínimas, menos sombras y menor frecuencia de repintado visual.
- Unificar la capa de red en `apiClient` para reducir lógica repetida y facilitar control de errores/rendimiento.
>>>>>>> c92dc1edbc62be2e5b3b353028700242e6dd95d1

---

## 5. Documentación y Guías Operativas de Cocina

<<<<<<< HEAD
### Desalineaciones detectadas con el código actual

- `APP_COCINA_DOCUMENTACION_COMPLETA.md` indica login con body `{ dni }`, pero el frontend envía `{ username, password }`.
- El mismo documento afirma flujos de “finalizar comanda a entregado” desde cocina; en implementación actual cocina trabaja a `recoger` y entrega queda para mozos.
- Se documenta prioridad por `localStorage.userRole`, pero hoy el botón usa `userRole` del `AuthContext`.
- Se documenta endpoint de anulación como `/plato/:platoIndex/anular`; en frontend actual se usa `/anular-plato/:platoIndex`.
- Se documenta búsqueda por comanda/mesa/mozo/plato, pero el código filtra solo por nombre de plato.
- `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md` afirma “polling eliminado”, mientras `useSocketCocina` mantiene fallback de polling cada 30s cuando no hay socket.
- No existe `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES-2.md` en el repo; se está usando `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md`.
- `README.md` sigue siendo base de CRA y no cubre operación real de App Cocina.

### Mejoras de documentación propuestas

#### Mejora 1
- **Documento objetivo:** `APP_COCINA_DOCUMENTACION_COMPLETA.md`
- **Sección a actualizar/crear:** `Login y Sesión (v6.x)`
- **Qué falta o está incorrecto:** payload real de login, almacenamiento de sesión, restauración y expiración por inactividad.
- **Contenido propuesto (2–5 frases):** Documentar que el login envía `username` y `password` (DNI), no solo `dni`. Explicar cómo se restaura sesión desde `cocinaAuth`, cuándo se fuerza logout y qué señales ve el usuario en UI. Incluir ejemplo operativo de sesión expirada durante turno y recuperación segura.

#### Mejora 2
- **Documento objetivo:** `APP_COCINA_DOCUMENTACION_COMPLETA.md`
- **Sección a actualizar/crear:** `Matriz de estados de cocina`
- **Qué falta o está incorrecto:** todavía describe transición a `entregado` desde cocina.
- **Contenido propuesto (2–5 frases):** Aclarar que cocina finaliza a `recoger` y que la entrega final corresponde al flujo de mozos. Explicar auto-trigger de cambio de comanda a `recoger` cuando todos los platos activos están listos. Añadir ejemplo de comanda mixta con platos anulados/eliminados.

#### Mejora 3
- **Documento objetivo:** `APP_COCINA_DOCUMENTACION_COMPLETA.md`
- **Sección a actualizar/crear:** `Prioridad alta, permisos y roles`
- **Qué falta o está incorrecto:** regla de rol y criterio de habilitación no reflejan la lógica real.
- **Contenido propuesto (2–5 frases):** Definir claramente qué roles pueden priorizar y cómo se valida en frontend y backend. Incluir caso de uso “priorizar comanda seleccionada” y fallback “auto-priorizar primera en espera”. Añadir nota de seguridad para no depender de valores manipulables del cliente.

#### Mejora 4
- **Documento objetivo:** `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md` (y crear alias/renombre a `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES-2.md` si ese es el estándar interno)
- **Sección a actualizar/crear:** `Flujo cocina-backend por Socket y fallback`
- **Qué falta o está incorrecto:** afirma que no hay polling fallback y conserva flujos de columnas/estados que ya no aplican.
- **Contenido propuesto (2–5 frases):** Dibujar flujo real: conexión socket autenticada, eventos de negocio y polling de respaldo cuando `disconnected`. Precisar estados visibles en tablero principal y qué eventos disparan refresh total vs actualización granular. Incluir ejemplo de reconexión con banner operativo.

#### Mejora 5
- **Documento objetivo:** `APP_COCINA_DOCUMENTACION_COMPLETA.md`
- **Sección a actualizar/crear:** `Runbook de operación de cocina`
- **Qué falta o está incorrecto:** no hay procedimientos accionables de contingencia.
- **Contenido propuesto (2–5 frases):** Definir pasos para “no llegan comandas”, “socket desconectado”, “pantalla congelada” y “desfase de colores/tiempos”. Incluir checklist de 1 minuto para operador y criterios de escalamiento a soporte con timestamp y captura.

#### Mejora 6
- **Documento objetivo:** `README.md` (o sección `Setup Local` dentro de `APP_COCINA_DOCUMENTACION_COMPLETA.md`)
- **Sección a actualizar/crear:** `Levantar App Cocina en local`
- **Qué falta o está incorrecto:** hoy solo hay contenido genérico de CRA.
- **Contenido propuesto (2–5 frases):** Documentar scripts reales, variables de entorno (`REACT_APP_IP`, `REACT_APP_API_COMANDA`, `REACT_APP_ALLOWED_HOSTS`) y orden de prioridad de `apiConfig`. Añadir ejemplo de configuración para red local y cómo validar conexión inicial REST+Socket.
=======
### Desalineaciones detectadas entre documentación y código

- `APP_COCINA_DOCUMENTACION_COMPLETA.md` describe login “solo DNI” y body `{ dni }`, pero el código actual usa `username + password` (DNI como contraseña) en `AuthContext`.
- El mismo documento mantiene secciones de flujo “entregado” desde cocina, mientras el código actual está centrado en transición a `recoger` y deja “entregado” al dominio de mozos.
- Se documentan endpoints de anulación/reversión que no coinciden con los llamados actuales (`/anular-plato/:index`, `/anular-todo`).
- Hay afirmaciones de “polling eliminado”, pero `useSocketCocina` todavía mantiene polling fallback cuando el socket está desconectado.
- El requerimiento de entrada menciona `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES-2.md`, pero en el repo existe `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md` (conviene unificar naming).

### Mejoras de documentación propuestas

#### 1) Contrato real de autenticación de App Cocina
- Documento objetivo: `APP_COCINA_DOCUMENTACION_COMPLETA.md`.
- Sección a actualizar: “Sistema de Autenticación y Navegación (v6.0)”.
- Qué falta o está incorrecto: payload de login, nomenclatura de campos y validaciones de rol no reflejan el código actual.
- Contenido propuesto: explicar que el frontend envía `username` y `password` (DNI), cómo se restaura sesión y cómo se maneja expiración/inactividad. Incluir ejemplo de flujo: login exitoso, restauración al recargar y logout forzado por 401.

#### 2) Matriz de estados y responsabilidades Cocina vs Mozos
- Documento objetivo: `APP_COCINA_DOCUMENTACION_COMPLETA.md`.
- Sección a actualizar: “Sistema de Estados y Flujos”.
- Qué falta o está incorrecto: mezcla reglas históricas de `entregado` desde cocina con lógica vigente centrada en `recoger`.
- Contenido propuesto: separar explícitamente qué transición ejecuta cocina y cuál mozos. Incluir ejemplo: “finalizar platos en cocina -> `recoger`; entrega final -> app de mozos”.

#### 3) Endpoints reales de anulación, reversión y prioridad
- Documento objetivo: `APP_COCINA_DOCUMENTACION_COMPLETA.md`.
- Sección a actualizar: “Integración con Backend / Endpoints”.
- Qué falta o está incorrecto: rutas y nombres de endpoints no están alineados con llamadas actuales del frontend.
- Contenido propuesto: listar endpoints realmente consumidos por `comandastyle` y `RevertirModal`, con actor, propósito y payload mínimo. Añadir ejemplo de anulación por índice y anulación total.

#### 4) Flujo de conectividad Socket + fallback HTTP
- Documento objetivo: `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md`.
- Sección a actualizar: “Implementación en App Cocina”.
- Qué falta o está incorrecto: se declara eliminación de polling, pero el hook mantiene fallback cuando se pierde conexión.
- Contenido propuesto: documentar estados `conectado/desconectado/auth_error`, reconexión, heartbeat y polling de contingencia. Incluir ejemplo operativo: “si socket cae, cada 30s se reconsulta por HTTP”.

#### 5) Runbook operativo para turno de cocina
- Documento objetivo: `APP_COCINA_DOCUMENTACION_COMPLETA.md`.
- Sección a crear: “Runbook de contingencias en cocina”.
- Qué falta o está incorrecto: no hay guía accionable para incidencias típicas.
- Contenido propuesto: pasos breves para “no llegan comandas”, “error de auth socket”, “pantalla congelada” y “reconexión”. Incluir uno o dos criterios de escalamiento con timestamp y evidencia mínima.
>>>>>>> c92dc1edbc62be2e5b3b353028700242e6dd95d1

---

## 6. Oportunidades de Alto Impacto en UX/Producto (“pantalla 10 000 USD”)

<<<<<<< HEAD
#### 1) Modo “Servicio” y “Producción alta”
- **Impacto:** alto
- **Esfuerzo:** medio
- **Idea:** agregar toggle de perfil visual para turnos normales vs picos (animaciones reducidas, tipografía optimizada, menos ruido visual).

#### 2) KPIs en vivo dentro del tablero
- **Impacto:** alto
- **Esfuerzo:** medio
- **Idea:** mostrar tiempo promedio por comanda activa, cola crítica (>X min), comandas priorizadas y tasa de salida por hora.

#### 3) Vistas por estación (caliente, fría, pase) y “solo urgentes”
- **Impacto:** alto
- **Esfuerzo:** medio-alto
- **Idea:** filtrar por categorías/áreas de plato con presets persistentes para cada pantalla de cocina.

#### 4) Atajos de teclado para operación rápida
- **Impacto:** medio-alto
- **Esfuerzo:** bajo-medio
- **Idea:** teclas para seleccionar, finalizar, priorizar y revertir sin depender de mouse/touch.

#### 5) Estado de conexión operativo “a prueba de turno”
- **Impacto:** alto
- **Esfuerzo:** medio
- **Idea:** semáforo de red (`Online`, `Reconectando`, `Degradado`) con última sincronización visible y acción guiada.

#### 6) Panel de auditoría en tiempo real
- **Impacto:** medio
- **Esfuerzo:** medio
- **Idea:** timeline lateral con eventos relevantes (prioridad, anulación, reversión, auto-cambio a recoger) para coordinación entre cocineros.
=======
#### 1) Barra de KPIs operativos en tiempo real
- Impacto: alto
- Esfuerzo: medio
- Idea: mostrar “backlog activo”, “% platos listos”, “edad de la comanda más antigua” y “tiempo promedio de preparación del turno” en la parte superior del KDS.

#### 2) Modo por estación de cocina (fría/caliente/pase)
- Impacto: alto
- Esfuerzo: medio
- Idea: aprovechar filtros por plato/categoría para ofrecer vistas rápidas por estación, con presets guardables por cocinero.

#### 3) Atajos de teclado para operación rápida
- Impacto: medio-alto
- Esfuerzo: bajo
- Idea: acciones rápidas para seleccionar tarjeta, marcar plato, finalizar lote y abrir anulación/reversión sin depender solo de mouse/touch.

#### 4) Modo “alto volumen” con latencia visual mínima
- Impacto: alto
- Esfuerzo: medio
- Idea: desactivar animaciones intensas, reducir densidad gráfica y mantener solo señales críticas (urgencia, prioridad, desconexión) para pantallas grandes de producción.

#### 5) Estado de conectividad y resiliencia de primer nivel
- Impacto: alto
- Esfuerzo: medio
- Idea: panel persistente de salud con “última sincronización”, estado socket, intentos de reconexión y acción guiada para recuperar operación sin ambigüedad.
>>>>>>> c92dc1edbc62be2e5b3b353028700242e6dd95d1

---

## 7. PRs sugeridos a partir de este reporte

<<<<<<< HEAD
1. `security/kds-rest-auth-hardening`: Migrar REST de cocina al cliente autenticado central y aplicar control de permisos homogéneo en acciones sensibles.
2. `fix/kds-board-integrity`: Corregir filtros de visibilidad, ampliar búsqueda (comanda/mesa/mozo/plato) y limpiar estados locales por fecha/turno.
3. `fix/kds-priority-role-alignment`: Alinear roles de prioridad con autenticación real (`cocinero/admin/...`) y reforzar feedback de permisos.
4. `perf/kds-render-budget`: Reducir intervalos por tarjeta, optimizar animaciones y eliminar clonado profundo en hot path.
5. `docs/kds-sync-marzo-2026`: Actualizar `APP_COCINA_DOCUMENTACION_COMPLETA.md`, `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md` y guía de operación local/runbook.
=======
- `docs: alinear autenticación y flujos reales de App Cocina (v6.0)`.
- `docs: actualizar matriz de estados Cocina vs Mozos y endpoints vigentes`.
- `docs: corregir sección Socket/polling fallback en diagrama de flujos`.
- `frontend: unificar llamadas REST sensibles en apiClient con Authorization y errores normalizados`.
- `frontend: estabilizar claves de selección de platos por subdocumento y limpieza de estado visual`.
>>>>>>> c92dc1edbc62be2e5b3b353028700242e6dd95d1
