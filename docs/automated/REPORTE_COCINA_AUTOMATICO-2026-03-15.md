# Reporte Automático del App de Cocina – Las Gambusinas (2026-03-15)

## 1. Resumen Ejecutivo

- El frontend tiene base de seguridad mejorada (auth en `AuthContext`, `ProtectedRoute`, handshake JWT en socket), pero persisten riesgos altos: token en `localStorage`, endpoints REST críticos sin uso del cliente HTTP autenticado centralizado y acciones sensibles sin control explícito de rol en UI.
- Se detectaron problemas operativos de integridad del tablero KDS: filtros muy estrictos que pueden ocultar comandas, búsqueda limitada solo a nombre de plato, y persistencia local de estado visual por plato sin limpieza por fecha.
- Hay inconsistencias de lógica que impactan operación diaria: rol para prioridad alta (`cocina`) no alineado con login (`cocinero/admin`), filtros de reportes que no afectan métricas, y código huérfano de “entregado” que quedó sin función activa.
- En rendimiento, el diseño actual mezcla varios intervalos por segundo, animaciones permanentes por tarjeta y operaciones costosas de clonación/búsqueda que pueden degradar pantallas con alto volumen.
- La documentación existe y es amplia (`APP_COCINA_DOCUMENTACION_COMPLETA.md`, `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md`), pero tiene secciones desalineadas con la implementación actual de cocina (login, estados, columnas, polling y endpoints).

---

## 2. Seguridad en Frontend y Comunicación con Backend
### 2.1 Issues críticos / altos

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

### 2.3 Checklist de higiene de seguridad en la App de Cocina
- [ ] Manejo correcto de tokens/sesión
- [x] Navegación protegida (Login → Menú → KDS)
- [ ] Manejo seguro de errores en UI
- [x] Evitar XSS/inyecciones en la interfaz
- [ ] WebSockets gestionados correctamente (auth / reconexión / flood)

---

## 3. Lógica de UI, Consistencia e Integridad de Información

### Problemas detectados

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

### Invariantes que la App de Cocina debería garantizar

| Invariante | Estado actual |
|---|---|
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

---

## 4. Rendimiento y Arquitectura de la App de Cocina

### Hallazgos principales

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

---

## 5. Documentación y Guías Operativas de Cocina

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

---

## 6. Oportunidades de Alto Impacto en UX/Producto (“pantalla 10 000 USD”)

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

---

## 7. PRs sugeridos a partir de este reporte

1. `security/kds-rest-auth-hardening`: Migrar REST de cocina al cliente autenticado central y aplicar control de permisos homogéneo en acciones sensibles.
2. `fix/kds-board-integrity`: Corregir filtros de visibilidad, ampliar búsqueda (comanda/mesa/mozo/plato) y limpiar estados locales por fecha/turno.
3. `fix/kds-priority-role-alignment`: Alinear roles de prioridad con autenticación real (`cocinero/admin/...`) y reforzar feedback de permisos.
4. `perf/kds-render-budget`: Reducir intervalos por tarjeta, optimizar animaciones y eliminar clonado profundo en hot path.
5. `docs/kds-sync-marzo-2026`: Actualizar `APP_COCINA_DOCUMENTACION_COMPLETA.md`, `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES.md` y guía de operación local/runbook.
