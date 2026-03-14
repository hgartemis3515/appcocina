# Reporte Automático del App de Cocina – Las Gambusinas (2026-03-14)

## 1. Resumen Ejecutivo

- Se detectaron riesgos **altos de seguridad** en autenticación/autorización: el JWT se guarda en `localStorage`, se restaura sin validación de expiración real y no se observa envío sistemático del token en llamadas REST ni en la conexión Socket del frontend.
- Hay riesgos operativos de **consistencia de tablero KDS**: filtros y reglas actuales pueden ocultar comandas válidas, y el estado visual persistente por plato puede generar selecciones “fantasma” entre cambios de data.
- La arquitectura actual funciona, pero tiene puntos de **escalabilidad frágil**: múltiples intervalos por tarjeta, lógica pesada en render y animaciones permanentes que pueden degradar pantallas con alto volumen.
- El repositorio auditado **no contiene** `APP_COCINA_DOCUMENTACION_COMPLETA.md` ni `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES-2.md`; hoy existe prácticamente solo documentación base de CRA en `README.md`.
- Hay oportunidades concretas de alto impacto para convertir la pantalla KDS en una experiencia premium (KPIs en vivo, modos por estación y resiliencia visual de conexión) con cambios acotados.

---

## 2. Seguridad en Frontend y Comunicación con Backend
### 2.1 Issues críticos / altos

#### 1) Sesión persistida en `localStorage` sin endurecimiento suficiente
- Severidad: **alta**
- Área afectada: `AuthContext` y flujo de sesión.
- Qué está mal: la sesión (`token` + usuario) se persiste en `localStorage` y se restaura con validación mínima; no se valida expiración real del JWT en frontend ni existe mecanismo de rotación/invalidación local.
- Riesgo real: en un entorno web de cocina, un XSS o acceso físico al navegador permite exfiltrar token y reutilizar sesión.
- Recomendación: mover token a cookie `HttpOnly` cuando sea posible; si no, aplicar expiración estricta local + revocación activa + limpieza de sesión por inactividad y en logout forzado.

#### 2) Flujo de autenticación incompleto entre login y consumo de APIs/eventos
- Severidad: **alta**
- Área afectada: llamadas REST en `comandastyle`, `RevertirModal`, `AnotacionesModal` y socket en `useSocketCocina`.
- Qué está mal: tras login se obtiene token, pero en frontend no se observa estrategia homogénea para adjuntarlo en `Authorization` ni en handshake de Socket.
- Riesgo real: el modelo de seguridad queda ambiguo y puede terminar aceptando acciones por “confianza de red local” en vez de identidad/autorización robusta.
- Recomendación: centralizar cliente HTTP con interceptor + header Bearer; autenticación de Socket por token (auth payload o cookie segura) y validación server-side por evento.
- Nota de hipótesis: si el backend autentica por otro canal (ej. cookie de sesión fuera de este repo), validar y documentar explícitamente ese contrato.

#### 3) Controles de permiso en UI basados en `localStorage` (`userRole`)
- Severidad: **alta**
- Área afectada: acciones de prioridad y gating de botones en `comandastyle`.
- Qué está mal: se usa `localStorage.getItem('userRole')` para habilitar acciones sensibles de UI.
- Riesgo real: cualquier operador con acceso al navegador puede modificar ese valor y desbloquear acciones.
- Recomendación: usar solo claims del contexto autenticado y, sobre todo, validar autorización en backend para cada endpoint crítico (`prioridad`, `anular`, `status`, `revertir`).

#### 4) Socket sin evidencia de controles anti-flood/autorización por evento
- Severidad: **alta**
- Área afectada: `useSocketCocina`.
- Qué está mal: conexión al namespace `/cocina` y emisión `join-fecha` sin evidencia de token ni controles de frecuencia desde frontend.
- Riesgo real: en red local con múltiples dispositivos, un cliente no confiable podría suscribirse o generar ruido de eventos que degraden disponibilidad.
- Recomendación: handshake autenticado, límite de eventos por cliente, deduplicación y esquema de replay-safe en backend; en frontend, backoff progresivo y deshabilitar reintentos agresivos ante errores de auth.

#### 5) Configuración de URL backend editable desde UI sin restricciones de confianza
- Severidad: **alta**
- Área afectada: `apiConfig` + `ConfigModal`.
- Qué está mal: la URL del backend se guarda en `localStorage` y puede apuntar a hosts arbitrarios; además existe una IP privada hardcodeada como default en modal.
- Riesgo real: redirección involuntaria/maliciosa a backend no confiable, fuga de datos operativos y dependencia fuerte de configuración manual.
- Recomendación: permitir solo lista blanca de hosts/IPs por ambiente, validar protocolo y origen, y eliminar defaults de infraestructura específica del local.

### 2.2 Issues medios / bajos

#### 6) Exposición de mensajes internos del backend en UI
- Severidad: **media**
- Área afectada: manejo de errores en login, anulación, anotaciones y finalizaciones.
- Qué está mal: se muestran `data.error`/`message` en alertas o UI sin normalización.
- Riesgo real: filtración de detalles internos y mensajes no aptos para operación.
- Recomendación: capa de mapeo de errores por código de negocio, con mensajes operativos controlados y logging técnico separado.

#### 7) Sobreexposición de datos operativos en consola
- Severidad: **media**
- Área afectada: logs extensivos de comandas/platos y estado de conexión.
- Qué está mal: se registran detalles de negocio y diagnóstico en consola en runtime.
- Riesgo real: en equipos compartidos, esa información puede quedar visible o capturada por extensiones.
- Recomendación: feature-flag de logs (`development` only) y sanitización de payloads.

#### 8) Riesgo de acumulación de listeners de heartbeat
- Severidad: **media**
- Área afectada: `useSocketCocina` heartbeat.
- Qué está mal: en cada ciclo se registra `socket.once('heartbeat-ack')`; con pérdida de acks puede acumular callbacks pendientes.
- Riesgo real: degradación gradual de memoria/comportamiento en sesiones largas.
- Recomendación: usar un único listener estable + timestamp de último ack y watchdog.

#### 9) Superficie de dependencias mayor a la necesaria
- Severidad: **baja**
- Área afectada: `package.json`.
- Qué está mal: aparecen paquetes no utilizados en frontend productivo (`dotenv` en CRA cliente, `install`, `@react-native-async-storage/async-storage`).
- Riesgo real: mayor superficie de vulnerabilidades y mantenimiento.
- Recomendación: limpieza de dependencias y política de revisión periódica (lockfile + auditoría de CVEs).

### 2.3 Checklist de higiene de seguridad en la App de Cocina
- [ ] Manejo correcto de tokens/sesión
- [ ] Navegación protegida (Login → Menú → KDS)
- [ ] Manejo seguro de errores en UI
- [x] Evitar XSS/inyecciones en la interfaz
- [ ] WebSockets gestionados correctamente (auth / reconexión / flood)

---

## 3. Lógica de UI, Consistencia e Integridad de Información

### Problemas detectados y cambio lógico recomendado

#### 1) Filtro de visibilidad demasiado estricto puede ocultar comandas válidas
- Flujo afectado: búsqueda/filtrado y tablero principal.
- Impacto en operación: una comanda con datos parciales (por ejemplo nombre de plato aún no poblado) puede desaparecer del tablero y perderse de vista en hora pico.
- Cambio recomendado: degradar a modo “pendiente de hidratación” en vez de ocultar toda la comanda; mostrar placeholder controlado y reintento.

#### 2) El tablero principal excluye status `recoger` por diseño actual
- Flujo afectado: transición preparación → recoger y coordinación con mozos.
- Impacto en operación: cocina puede perder trazabilidad visual inmediata de comandas recién listas.
- Cambio recomendado: vista configurable “solo cocina” vs “cocina+paso a recoger”; al menos un carril resumido de “recién listas”.

#### 3) Estado visual de platos persistido por clave `comandaId-platoIndex`
- Flujo afectado: selección múltiple, finalizar platos, anulación.
- Impacto en operación: al reordenar o mutar lista de platos, puede quedar checkbox/estado visual desfasado (selección fantasma o acción sobre plato equivocado).
- Cambio recomendado: usar clave estable del subdocumento de plato (`plato._id`) y limpieza por fecha/comanda cerrada/eliminada.

#### 4) Auto-finalización de comanda y acciones manuales pueden competir
- Flujo afectado: finalización en batch + auto-cambio de status.
- Impacto en operación: múltiples PUT casi simultáneos pueden generar resultados no deterministas o ruido de errores.
- Cambio recomendado: consolidar un único orquestador de transición con idempotencia explícita y debounce por comanda.

#### 5) Modal de “marcar entregado” quedó huérfano/inconsistente
- Flujo afectado: entrega final.
- Impacto en operación: flujo muerto que confunde mantenimiento y aumenta riesgo de regresiones.
- Cambio recomendado: eliminar completamente el bloque no usado o reconectar con una acción válida y autorizada.

#### 6) Reportes con filtros visuales que no impactan los cálculos
- Flujo afectado: reportes del día.
- Impacto en operación: usuario cree estar filtrando por mozo/mesa/estado, pero las métricas no cambian.
- Cambio recomendado: aplicar filtros al dataset previo a métricas y reflejar “filtros activos” en cabecera del reporte.

#### 7) Parseo de keys con `split('-')` en algunos flujos
- Flujo afectado: anulación/reversión basada en clave serializada.
- Impacto en operación: si los IDs migran a formato con guiones (UUID), puede romper selección.
- Cambio recomendado: serialización robusta (JSON de objeto clave o separador seguro + parse centralizado).
- Nota de hipótesis: con ObjectId de Mongo actual (sin guiones) puede no fallar hoy, pero es deuda técnica.

### Invariantes que la App de Cocina debería garantizar

| Invariante | Estado actual |
|---|---|
| Si una comanda tiene todos sus platos activos en `recoger`, debe salir del carril principal de preparación | Se cumple parcialmente |
| Una comanda con platos activos no debe “desaparecer” por fallas de hidratación de nombre | No se garantiza |
| La suma visual de platos en preparación + listos + anulados/eliminados debe corresponder al total operativo | Se cumple parcialmente |
| Una acción de finalizar plato debe impactar exactamente al plato seleccionado | Se cumple parcialmente |
| Una selección visual no debe sobrevivir a cambio de día/comanda eliminada | No se garantiza |
| Prioridad alta debe ser coherente entre badge, ordenamiento y backend | Se cumple parcialmente |
| Filtros de reportes deben afectar datos presentados y exportados | No se garantiza |
| Reconexión Socket no debe duplicar listeners/eventos | Se cumple parcialmente |
| Cualquier acción sensible (anular, priorizar, revertir) debe estar autorizada server-side | No se garantiza desde frontend |
| Errores de backend no deben exponer internals al operador de cocina | No se garantiza |

---

## 4. Rendimiento y Arquitectura de la App de Cocina

### Hallazgos principales

#### 1) Coste por intervalos: reloj global + reloj por tarjeta
- Se observan actualizaciones cada segundo en componente principal y también dentro de cada tarjeta (`SicarComandaCard`), multiplicando renders con volumen alto.
- Mejora sugerida: centralizar “ticker” global y propagar tiempo derivado memoizado.

#### 2) Operaciones pesadas en hot path de render
- Hay clonado profundo con `JSON.parse(JSON.stringify(...))`, cálculos repetidos y búsquedas lineales frecuentes (`find`, `indexOf`) sobre listas mutables.
- Mejora sugerida: normalizar comandas/platos por id, usar `useMemo` para colecciones derivadas y actualizar granularmente por id.

#### 3) Uso intensivo de Framer Motion en grillas grandes
- Varias animaciones permanentes (pulsos, escalados, transiciones por item) pueden degradar GPU/CPU en pantallas 24/7.
- Mejora sugerida: modo “operación intensiva” con animaciones mínimas y respeto a `prefers-reduced-motion`.

#### 4) Flujo de Socket acoplado a callbacks cerrados
- `useSocketCocina` monta listeners una vez y depende de callbacks con estado cambiante, lo que puede crear lecturas obsoletas de estado en ciertos casos.
- Mejora sugerida: refs para estado mutable crítico o listeners que lean estado desde store central.

#### 5) Búsqueda de nombres faltantes de platos con llamadas por item
- En la tarjeta se disparan fetches por plato faltante, potencialmente repetitivos.
- Mejora sugerida: endpoint batch o caché global por `platoId` con TTL.

### Recomendaciones realistas para el stack actual

- Extraer un hook de dominio `useComandasKDS` para separar transporte (REST/Socket), reglas de transición y estado de UI.
- Reducir frecuencia de repintado de cronómetro visible (por ejemplo cada 5s) manteniendo precisión interna por timestamp.
- Introducir memoización de listas derivadas (`enEspera`, `todasComandas`, contadores) y evitar recomputar en cada render.
- Implementar “modo alto volumen” configurable: menos sombras/animaciones, badges simplificados, actualización visual por lotes.
- Reemplazar claves de selección por ids estables de subdocumento y reset explícito en cambios de dataset/fecha.

---

## 5. Documentación y Guías Operativas de Cocina

### Estado actual de documentación en este repositorio

- No se encontró `APP_COCINA_DOCUMENTACION_COMPLETA.md`.
- No se encontró `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES-2.md`.
- El único documento visible es `README.md` base de Create React App, insuficiente para operación KDS.

### Mejoras de documentación recomendadas

#### Mejora 1
- Documento objetivo: `APP_COCINA_DOCUMENTACION_COMPLETA.md` (si existe en otra rama/repo, sincronizar aquí; si no, crear base).
- Sección a crear/actualizar: `Arquitectura de Autenticación (Login → Menú → KDS)`.
- Qué falta o está incorrecto: no hay descripción del contrato de sesión, vigencia de token ni comportamiento de restauración.
- Contenido propuesto: describir el flujo de login por DNI, persistencia de sesión y condiciones de expiración/cierre. Aclarar qué endpoints requieren token y cómo se envía. Incluir ejemplo operativo: “si token vence durante turno, redirigir a login sin perder estado crítico visible”.

#### Mejora 2
- Documento objetivo: `APP_COCINA_DOCUMENTACION_COMPLETA.md`.
- Sección a crear/actualizar: `Contrato REST de Cocina y Transiciones de Estado`.
- Qué falta o está incorrecto: no existe matriz clara de estados de plato/comanda ni reglas idempotentes.
- Contenido propuesto: listar transiciones permitidas (`en_espera` → `recoger`, reversión, anulación), actor responsable y respuesta esperada ante conflicto. Ejemplo: “si llega transición inválida por carrera de eventos, UI debe reconciliar con snapshot del backend”.

#### Mejora 3
- Documento objetivo: `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES-2.md`.
- Sección a crear/actualizar: `Flujo Socket Cocina (conexión, reconexión y fallback)`.
- Qué falta o está incorrecto: faltan eventos específicos (`nueva-comanda`, `plato-actualizado`, `comanda-eliminada`, `plato-anulado`) y su impacto de UI.
- Contenido propuesto: mapear cada evento a callback y efecto visual/estado; incluir diagrama de reconexión y polling fallback. Ejemplo: “desconectado > 30s: banner persistente + refresh periódico”.

#### Mejora 4
- Documento objetivo: `APP_COCINA_DOCUMENTACION_COMPLETA.md`.
- Sección a crear/actualizar: `Guía de configuración de entorno y despliegue local`.
- Qué falta o está incorrecto: no hay guía de variables (`REACT_APP_IP`, `REACT_APP_API_COMANDA`), prioridad de resolución de URL ni validaciones.
- Contenido propuesto: explicar prioridad real de `apiConfig`, formatos aceptados y riesgos de configurar hosts no confiables. Incluir ejemplo de `.env` y checklist de verificación en arranque.

#### Mejora 5
- Documento objetivo: `APP_COCINA_DOCUMENTACION_COMPLETA.md`.
- Sección a crear/actualizar: `Runbook Operativo de Cocina`.
- Qué falta o está incorrecto: no hay procedimiento de contingencia para desconexión, congelamiento de pantalla o desfase de estados.
- Contenido propuesto: pasos concretos para operador y para soporte técnico, con tiempos objetivo de recuperación. Ejemplo: “si no llegan comandas por 2 minutos: validar indicador realtime, ejecutar refresco seguro, escalar con captura de timestamp”.

#### Mejora 6
- Documento objetivo: `DIAGRAMA_FLUJO_DATOS_Y_FUNCIONES-2.md`.
- Sección a crear/actualizar: `Invariantes funcionales del KDS`.
- Qué falta o está incorrecto: no hay lista de invariantes verificables entre UI y backend.
- Contenido propuesto: documentar 5–10 invariantes críticos y cómo monitorearlos. Ejemplo: “comanda con todos platos listos no debe permanecer en carril de preparación”.

---

## 6. Oportunidades de Alto Impacto en UX/Producto (“pantalla 10 000 USD”)

### Ideas priorizadas (impacto/esfuerzo)

#### 1) Capa de KPIs en tiempo real sobre el tablero
- Impacto: **alto**
- Esfuerzo: **medio**
- Idea: mostrar SLA por franja horaria, tiempo promedio por estación y cola crítica en vivo sin salir de la pantalla KDS.

#### 2) Modos de operación por estación (caliente/fría/pase)
- Impacto: **alto**
- Esfuerzo: **medio**
- Idea: filtros persistentes por estación y vista “solo urgentes” para reducir ruido cognitivo en cocinas grandes.

#### 3) Atajos de teclado y acciones rápidas de turno
- Impacto: **medio-alto**
- Esfuerzo: **bajo-medio**
- Idea: finalizar/revertir/priorizar por teclado y navegación entre tarjetas sin mouse/touch.

#### 4) Modo “alto volumen” con render optimizado
- Impacto: **alto**
- Esfuerzo: **medio**
- Idea: desactivar animaciones costosas, reducir frecuencia de repintado y agrupar actualizaciones visuales.

#### 5) UX de reconexión de nivel operativo
- Impacto: **alto**
- Esfuerzo: **medio**
- Idea: estados claros `Online / Reconectando / Degradado`, con acciones sugeridas y contador de “última sincronización” para evitar incertidumbre del personal.

#### 6) Trazabilidad de acciones de cocina en UI
- Impacto: **medio**
- Esfuerzo: **medio**
- Idea: panel lateral de auditoría reciente (quién priorizó, quién revirtió, qué se anuló) para coordinación de equipo durante el turno.

---

## 7. PRs sugeridos a partir de este reporte

1. **`security/auth-hardening-kds`**: unificar estrategia de autenticación REST/Socket, enviar token de forma consistente y eliminar autorización por `localStorage`.
2. **`fix/kds-state-integrity`**: migrar claves de selección a ids estables de plato, limpiar estados persistidos por fecha y corregir flujos huérfanos.
3. **`perf/kds-render-optimization`**: centralizar ticker de tiempo, memoizar derivados de comandas y activar modo de animación reducida.
4. **`docs/kds-operational-baseline`**: incorporar documentación completa de arquitectura, runbook de incidentes y flujos Socket/REST.
5. **`ux/kds-premium-ops`**: KPIs en vivo, modos por estación y reconexión guiada para operación profesional en pantallas grandes.
