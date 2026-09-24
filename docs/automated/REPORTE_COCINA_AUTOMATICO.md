# Reporte Automático del App de Cocina – Las Gambusinas (2026-03-16)

## 1. Resumen Ejecutivo

- Se detectaron hallazgos de seguridad de severidad alta en el frontend: persistencia de sesión en `localStorage`, uso inconsistente de autenticación en llamadas REST y controles de autorización frágiles en acciones sensibles.
- En la lógica de operación del KDS hay riesgos reales de integridad visual: filtros que pueden ocultar comandas válidas, estados de platos persistidos por índice y desalineación entre permisos esperados y botones habilitados.
- El rendimiento puede degradarse con alto volumen por intervalos por tarjeta, animaciones permanentes y recomputaciones frecuentes en render.
- La documentación principal está parcialmente desactualizada respecto al código actual (auth con `username + password`, reglas de “entregado” desde cocina, endpoints de anulación y polling fallback).
- Se identificaron oportunidades de producto de alto impacto con esfuerzo acotado: KPIs en vivo, modos por estación, atajos de operación y mejor resiliencia visual ante desconexión.

---

## 2. Seguridad en Frontend y Comunicación con Backend
### 2.1 Issues críticos / altos

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

### 2.3 Checklist de higiene de seguridad en la App de Cocina
- [ ] Manejo correcto de tokens/sesión
- [x] Navegación protegida (Login → Menú → KDS)
- [ ] Manejo seguro de errores en UI
- [x] Evitar XSS/inyecciones en la interfaz
- [ ] WebSockets gestionados correctamente (auth / reconexión / flood)

---

## 3. Lógica de UI, Consistencia e Integridad de Información

### Problemas detectados

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

### Invariantes que la App de Cocina debería garantizar

| Invariante | Estado |
|---|---|
| Una comanda eliminada (`IsActive=false` o `eliminada=true`) no debe permanecer en el tablero | Se cumple parcialmente |
| Si todos los platos activos están en `recoger`, la comanda debe pasar a estado listo para mozos sin duplicar transiciones | Se cumple parcialmente |
| Una comanda en estado distinto de `en_espera` no debe mostrarse en el carril principal de cocina | Se cumple |
| Un plato anulado (`anulado=true`) no debe mostrarse como reversible en el modal de revertir | Se cumple |
| La selección visual de platos no debe sobrevivir a reordenamientos/cambios estructurales | No se garantiza |
| Acciones sensibles (priorizar, anular, revertir) deben estar habilitadas solo para roles autorizados y coherentes | No se garantiza |
| Los filtros de reportes deben impactar los KPIs y exportaciones mostradas | No se garantiza |
| La UI nunca debe ocultar comandas activas por hidratación parcial de campos no críticos | No se garantiza |

---

## 4. Rendimiento y Arquitectura de la App de Cocina

### Hallazgos

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

---

## 5. Documentación y Guías Operativas de Cocina

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

---

## 6. Oportunidades de Alto Impacto en UX/Producto (“pantalla 10 000 USD”)

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

---

## 7. PRs sugeridos a partir de este reporte

- `docs: alinear autenticación y flujos reales de App Cocina (v6.0)`.
- `docs: actualizar matriz de estados Cocina vs Mozos y endpoints vigentes`.
- `docs: corregir sección Socket/polling fallback en diagrama de flujos`.
- `frontend: unificar llamadas REST sensibles en apiClient con Authorization y errores normalizados`.
- `frontend: estabilizar claves de selección de platos por subdocumento y limpieza de estado visual`.
