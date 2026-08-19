import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import moment from 'moment-timezone';
import axios from 'axios';
import { getServerBaseUrl } from '../../config/apiConfig';
import { clampColumnas } from '../../config/monitorVisualConstants';
import PlatoMonitorRow from './PlatoMonitorRow';
import CocineroPlatoCard from './CocineroPlatoCard';
import MonitorTarjetasGrid from './MonitorTarjetasGrid';
import CocineroBlockHeader from './CocineroBlockHeader';
import CocineroSelectorDropdown from './CocineroSelectorDropdown';
import MonitorEmptyState from './MonitorEmptyState';
import MonitorConfigPanel from './MonitorConfigPanel';
import SearchBar from '../additionals/SearchBar';
import useCocinaMonitorTimer from '../../hooks/useCocinaMonitorTimer';
import { calcularSegundos, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';
import { asignarNumeroGlobal, colorLineaDesdeId } from '../../utils/numeracionTimersMonitor';
import { BADGE_DEFAULTS } from '../../utils/monitorBadgeStyles';
import { fetchConfiguracionCocina } from '../../hooks/useConfiguracionCocina';
import { grupoIdEstable } from '../../hooks/useCocinaMonitorFilter';
// PLAN GUARNICIONES_SEPARADAS v1.1.1 §10: helpers para el panel de guarniciones
import {
  nombreCocinaComplemento,
  tiempoInicioGuarnicion,
  tiempoInicioGrupo,
  recolectarGuarnicionesMonitor,
  agrupacionGuarnicionesOn,
  tituloGrupoGuarniciones,
  formatearReferenciaPadre,
  lineaListaGuarniciones,
  tokenGuarnicion,
} from '../../utils/guarnicionesKds';
// §10: resolver el nombre de cocina del plato padre (alias nombreCocina, no el
// nombre comercial que incluye complementos).
import { obtenerNombreDisplayCocina } from '../../utils/platoHelpers';
import { primerCocineroIdFiltro, esUnSoloCocineroFiltro } from '../../utils/cocineroFiltroIds';
import NotasMonitorFranja from './NotasMonitorFranja';
import { recolectarNotasMonitor, cocineroDesdeProcesandoPor, pronombreReferenciaPrincipal } from '../../utils/notasMonitor';

const STORAGE_DESIGN_KEY = 'cocinaMonitorDesign';

const colorAcentoPorCocineroHeader = (alias) => {
  if (!alias) return '#d4af37';
  const paleta = ['#d4af37', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee', '#facc15'];
  let h = 0;
  for (let i = 0; i < alias.length; i++) h = (h * 31 + alias.charCodeAt(i)) >>> 0;
  return paleta[h % paleta.length];
};

// Toda clave de este objeto viaja en Guardar/Cargar perfil (snapshotConfigPerfil).
const DEFAULT_CONFIG = {
  fuenteFamilia: 'Inter, system-ui, sans-serif',
  fuenteFamiliaCustom: '',
  tamanioFuentePlato: 36,
  tamanioFuenteDetalle: 20,
  tamanioFuenteCronometro: 28,
  tamanioCronometroCabecera: null,
  tamanioFuenteCocinero: 28,
  colorFondo: '#0a0a0f',
  colorTextoPrincipal: '#ffffff',
  colorTextoSecundario: '#9ca3af',
  colorAcento: '#d4af37',
  colorAlertaAmarilla: '#fbbf24',
  colorAlertaRoja: '#ef4444',
  colorFilaPlato: '#1a1a28',
  espaciadoFilas: 'normal',
  layoutColumnas: 1,
  // PLAN GUARNICIONES_SEPARADAS v1.1.1 §10: columnas del panel de guarniciones
  // (split 50/50 cuando "Lista complementos" está activo).
  layoutColumnasGuarniciones: 1,
  // §10: si false, las guarniciones heredan el diseño de lista de los platos
  // (mismas columnas). Si true, se habilita la personalización independiente
  // del panel de guarniciones (columnas, etc.).
  diferenciarDisenoGuarniciones: false,
  ocultarCronometroGuarniciones: false,
  ocultarCuadroGuarniciones: false,
  ocultarBuscadorPlatos: false,
  mostrarTitulosListasSplit: false,
  tituloListaPlatos: 'PLATOS',
  tituloListaGuarniciones: 'Lista de Guarniciones',
  grosorSeparadorSplit: 2,
  colorSeparadorSplit: null,
  alinearTituloListaSplit: 'izquierda',
  colorTituloListaSplit: null,
  tamanioTituloListaSplit: 13,
  pesoTituloListaSplit: '800',
  fuenteFamiliaTituloListaSplit: null,
  mostrarPronombreCocineroGuarnicion: true,
  mostrarTablaNotas: true,
  tituloTablaNotas: 'Notas:',
  colorTextoNotas: null,
  tamanioFuenteNotas: 14,
  pesoFuenteNotas: '600',
  fuenteFamiliaNotas: null,
  alinearTablaNotas: 'izquierda',
  referenciaPadreGuarnicion: 'de',
  fuenteFamiliaGuarnicion: null,
  tamanioFuenteGuarnicion: null,
  pesoFuenteGuarnicion: null,
  colorTextoGuarnicion: null,
  colorTextoPadreGuarnicion: null,
  tamanioFuentePadreGuarnicion: null,
  colorFondoGuarnicion: null,
  colorAcentoGuarnicion: null,
  espaciadoFilasGuarnicion: null,
  disposicionTarjeta: 'vertical',
  pesoFuentePlato: '800',
  animacionesTarjetas: true,
  ...BADGE_DEFAULTS,
  mostrarCocineroTomado: true,
  mostrarComplementos: true,
  tiempoAmarillo: 5,
  tiempoRojo: 20,
  modoNocturno: true,
  mostrarNotificacionEntrada: true,
  textoNotificacionEntrada: 'Entra plato',
  duracionNotificacionEntrada: 8,
  // Rediseño por cocinero
  modoAgrupacion: 'bloques',     // 'bloques' (col-1) | 'tarjetas' (multi-col)
  mostrarMesas: true,
  modoTimers: 'completos',       // 'completos' | 'resumidos'
  maxTimersVisibles: 6,
  mostrarCabeceraCocinero: true,
  colorPorCocinero: true,
  umbralCargaAlta: 8,
  umbralSobrecarga: 12,
  // Estilo referencia KDS
  estiloTemporizador: 'vertical',  // 'vertical' (columna derecha) | 'horizontal' (línea)
  intensidadAlerta: 'normal',      // 'suave' | 'normal' | 'alta'
  mostrarEtiquetaPlato: false,     // mostrar "Plato:" antes del nombre
  mostrarIconoCocinero: true,      // avatar con iniciales del cocinero
  // === Nuevas herramientas de personalización ===
  // Color del cronómetro (chip de temporizador). null = automático según alerta.
  cronometroColor: null,
  cronometroContorno: null,
  cronometroFondo: null,
  // Contorno de la letra del cronómetro (text stroke). null = sin contorno.
  cronometroContornoLetra: null,
  // Fondo tipo resaltado detrás de las cifras (como subrayado de texto en Word). null = sin fondo.
  cronometroFondoTexto: null,
  cronometroForma: 'redondeado',
  cronometroAncho: null,
  cronometroAlto: null,
  cronometroRadio: null,
  tarjetaRadio: 14,
  tarjetaPadding: null,
  tarjetaGap: 16,
  // Quitar el nombre del cocinero del cuerpo de la tarjeta y moverlo a una barra superior (compacta)
  quitarNombreCocineroTarjeta: false,
  // Ocultar placas "ATENCIÓN" y "URGENTE" dentro de las tarjetas
  ocultarAtencionUrgente: false,
  // Animaciones de alerta por color cuando la tarjeta entra en ATENCIÓN / URGENTE
  animacionesAlerta: true,
  // Tipo de animación (nombre de keyframe) para cada estado
  animacionAtencion: 'resplandorUrgente',
  animacionUrgente: 'urgentePulse',
  // Color personalizado por animación (null = usar color de alerta amarillo/rojo)
  colorAnimacionAtencion: null,
  colorAnimacionUrgente: null,
  // Color de fondo de la tarjeta (si null usa colorFilaPlato)
  colorFondoTarjeta: null,
  // Degradado de la tarjeta: desactivado = color fijo (sin degradado negro)
  degradadoTarjeta: true,
  // Segundo color del degradado (null = automático según alerta)
  colorDegradadoTarjeta: null,
  // Emojis personalizados para animaciones con iconos (null = defaults de la animación)
  emojisAnimacionAtencion: null,
  emojisAnimacionUrgente: null,
  // Tamaño de los emojis en px (null = automático según animación)
  tamanioEmojiAtencion: null,
  tamanioEmojiUrgente: null,
  // Cantidad de emojis a renderizar (null = automático)
  cantidadEmojiAtencion: null,
  cantidadEmojiUrgente: null,
  // AutoAgrandamiento: las tarjetas reducen/aumentan su tamaño según cuántos platos haya en pantalla
  autoAgrandamiento: false,
  // AutoAcomodamiento: cada tarjeta se dimensiona según su contenido (texto más largo = tarjeta más grande)
  autoAcomodamiento: false,
  // Aprovechar espacio: altura al contenido + masonry (deja de ser simétrico)
  aprovecharEspacio: false,
};

/** Snapshot de Personalizar: todas las claves de DEFAULT_CONFIG + extras del panel. */
const EXCLUDE_PERFIL_KEYS = new Set(['deshabilitarOrdenSecuencialGuarniciones']);

const snapshotConfigPerfil = (configVisual) => {
  const out = {};
  if (!configVisual || typeof configVisual !== 'object') return out;
  for (const k of Object.keys(DEFAULT_CONFIG)) {
    if (EXCLUDE_PERFIL_KEYS.has(k)) continue;
    out[k] = Object.prototype.hasOwnProperty.call(configVisual, k)
      ? configVisual[k]
      : DEFAULT_CONFIG[k];
  }
  for (const k of Object.keys(configVisual)) {
    if (EXCLUDE_PERFIL_KEYS.has(k)) continue;
    if (!(k in out)) out[k] = configVisual[k];
  }
  return out;
};

const ICONO_MAP = {
  'flame': '🔥', 'tools-kitchen': '🍳', 'chef-hat': '👨‍🍳',
  'pot': '🍲', 'grill': '🍖', 'meat': '🥩',
  'ice-cream': '🍦', 'cake': '🍰', 'default': '📍'
};

/**
 * CocinaMonitorLayout - Componente principal del monitor Ver Cocina
 *
 * v3.0:
 * - Modo "por cocinero" (modoCocineros=true): agrupa en bloques de cocinero con
 *   cabecera + tarjetas cocinero+plato, y temporizadores individuales.
 * - Modo "por plato" (modoCocineros=false): comportamiento anterior con PlatoMonitorRow.
 * - Selector de cocineros en la barra superior (props cocineros/ onCambiarCocinero).
 *
 * v2.2:
 * - Agrupa platos por nombre (suma cantidades de diferentes comandas)
 * - Muestra nombre del cocinero que tomó el plato
 * - Cronómetro con alertas de color (amarillo/rojo) configurables
 * - Panel de configuración en barra superior (fuentes, tamaños, colores, umbrales)
 * - Barra de notificación "Entra plato ####" del último plato agregado
 *
 * Props:
 * - platosPendientes: array de grupos { nombre, cantidadTotal, platos, tiempoInicio, key,
 *                                        cocinero, timers[] } (modoCocineros) o formato v2
 * - configVisual: apariencia + umbrales (puede ser override local)
 * - nombreVista, modoFijo, onVolver, vistasCocina, vistaActivaId, onCambiarVista
 * - modoCocineros: si true, usa CocineroPlatoCard / CocineroBlockHeader (default: detecta
 *                  cocinero en los items)
 * - cocineros: lista de cocineros activos para el selector (opcional)
 * - cocineroActivoId: id del cocinero seleccionado (null = General)
 * - onCambiarCocinero: callback del selector
 * - nombreCocineroActivo: nombre/alias del cocinero seleccionado (para empty state)
 */
const CocinaMonitorLayout = ({
  platosPendientes = [],
  configVisual: configVistaProp = {},
  nombreVista = 'COMPLETO',
  modoFijo = false,
  onVolver = null,
  vistasCocina = null,
  vistaActivaId = null,
  onCambiarVista = null,
  cocineros = null,
  cocineroActivoId = null,
  onCambiarCocinero = null,
  nombreCocineroActivo = null,
  // Búsqueda de platos (variante monitor)
  searchTerm = '',
  onSearchChange = null,
  totalPlatosEncontrados = 0,
  totalComandasEncontradas = 0,
  hayFiltroBusqueda = false,
  sugerenciasBusqueda = [],
  onSugerenciaClick = null,
  modoCocineros: modoCocinerosProp = null,
  // Perfil de personalización Ver Cocina (flujo Distribuir Cocina en monitores)
  getToken = null,
  // Comandas crudas: el panel de guarniciones las recorre para mostrar
  // extras asignados aunque el plato padre no esté en platosPendientes.
  comandas = null,
}) => {
  const tick = useCocinaMonitorTimer();
  const [reloj, setReloj] = useState(moment().tz('America/Lima').format('HH:mm:ss'));

  // Estado de configuración local (editable en barra superior).
  // Merge: defaults < config de la vista < config local guardada en localStorage.
  const [localDesign, setLocalDesign] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DESIGN_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      return snapshotConfigPerfil({ ...DEFAULT_CONFIG, ...(parsed && typeof parsed === 'object' ? parsed : {}) });
    } catch { return snapshotConfigPerfil(DEFAULT_CONFIG); }
  });

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  // PLAN GUARNICIONES_SEPARADAS v1.1 §10: toggle "Activar Lista complementos".
  // Estado inicial: query ?listaGuarniciones=1 (ventanas hijas kiosk) > localStorage > false.
  // Si el flag global está OFF, el split nunca se aplica.
  const [listaGuarnicionesOn, setListaGuarnicionesOn] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('listaGuarniciones');
      if (q === '1' || q === 'true') return true;
      if (q === '0' || q === 'false') return false;
      return localStorage.getItem('cocina.listaComplementos') === '1';
    } catch { return false; }
  });
  useEffect(() => {
    // Persistir solo en sesión interactiva (no kiosk). En kiosk el estado lo gobierna la URL.
    if (!modoFijo) {
      try { localStorage.setItem('cocina.listaComplementos', listaGuarnicionesOn ? '1' : '0'); } catch { /* noop */ }
    }
  }, [listaGuarnicionesOn, modoFijo]);
  // Perfil de personalización Ver Cocina (flujo Distribuir Cocina en monitores)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilMensaje, setPerfilMensaje] = useState(null);
  const [perfilAutoAplicado, setPerfilAutoAplicado] = useState(false);
  // Auto-save debounced del localDesign al perfil auto del cocinero (MongoDB).
  // skip: evita guardar justo después de cargar un perfil (load → setLocalDesign).
  const autoSaveSkipRef = useRef(true); // true al montar para no guardar el estado inicial
  const autoSaveTimerRef = useRef(null);
  const [autoGuardando, setAutoGuardando] = useState(false);
  const [ultimoPlato, setUltimoPlato] = useState(null); // { nombre, cantidadTotal, ts, delta }
  const previousStateRef = useRef(new Map()); // key -> cantidadTotal
  const skipNotifInicialRef = useRef(true);
  const notifTimeoutRef = useRef(null);
  // PLAN GUARNICIONES_SEPARADAS v1.1: flag global + tiempos (para split 50/50 y alertas).
  const [flagGuarnicionesGlobal, setFlagGuarnicionesGlobal] = useState(true);
  const [deshabilitarOrdenGuarniciones, setDeshabilitarOrdenGuarniciones] = useState(true);
  const [deshabilitarAgrupacionGuarniciones, setDeshabilitarAgrupacionGuarniciones] = useState(false);
  const [tiemposGuarnicion, setTiemposGuarnicion] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await fetchConfiguracionCocina(getToken);
        if (!mounted) return;
        setFlagGuarnicionesGlobal(cfg.permitirGuarnicionesSeparadas !== false);
        setDeshabilitarOrdenGuarniciones(cfg.deshabilitarOrdenSecuencialGuarniciones !== false);
        setDeshabilitarAgrupacionGuarniciones(cfg.deshabilitarAgrupacionGuarniciones === true);
        if (cfg.tiemposGuarnicion) setTiemposGuarnicion(cfg.tiemposGuarnicion);
      } catch (e) {
        // defaults ya cargados
      }
    })();
    return () => { mounted = false; };
  }, [getToken]);

  // Config visual final combinada
  const configVisual = {
    ...DEFAULT_CONFIG,
    ...configVistaProp,
    ...localDesign,
    deshabilitarOrdenSecuencialGuarniciones: deshabilitarOrdenGuarniciones,
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setReloj(moment().tz('America/Lima').format('HH:mm:ss'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sincronizar personalización entre ventanas/pestañas (misma PC, varios monitores)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_DESIGN_KEY) return;
      // La otra ventana ya persistió; evitar auto-save redundante acá.
      autoSaveSkipRef.current = true;
      try {
        setLocalDesign(e.newValue ? JSON.parse(e.newValue) : {});
      } catch {
        setLocalDesign({});
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Detectar platos nuevos o aumento de cantidad para "Entra plato ####"
  useEffect(() => {
    if (!platosPendientes || platosPendientes.length === 0) {
      previousStateRef.current = new Map();
      return;
    }

    const prevState = previousStateRef.current;
    const nuevoEstado = new Map(platosPendientes.map(p => [p.grupoId || p.key, p.cantidadTotal]));

    // Evitar notificación al cargar la vista por primera vez
    if (skipNotifInicialRef.current) {
      skipNotifInicialRef.current = false;
      previousStateRef.current = nuevoEstado;
      return;
    }

    let platoNotificacion = null;

    // Recorrer de atrás hacia adelante: el último cambio tiene prioridad
    for (let i = platosPendientes.length - 1; i >= 0; i--) {
      const p = platosPendientes[i];
      const prevCantidad = prevState.get(p.grupoId || p.key);
      if (prevCantidad === undefined) {
        platoNotificacion = { nombre: p.nombre, cantidadTotal: p.cantidadTotal, delta: p.cantidadTotal };
        break;
      }
      if (p.cantidadTotal > prevCantidad) {
        platoNotificacion = {
          nombre: p.nombre,
          cantidadTotal: p.cantidadTotal,
          delta: p.cantidadTotal - prevCantidad,
        };
        break;
      }
    }

    previousStateRef.current = nuevoEstado;

    if (platoNotificacion && configVisual.mostrarNotificacionEntrada !== false) {
      setUltimoPlato({ ...platoNotificacion, ts: Date.now() });
      const duracion = (configVisual.duracionNotificacionEntrada || 8) * 1000;
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
      notifTimeoutRef.current = setTimeout(() => {
        setUltimoPlato(null);
      }, duracion);
    }
    // eslint-disable-next-line
  }, [platosPendientes]);

  useEffect(() => {
    return () => {
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };
  }, []);

  const guardarConfigLocal = useCallback((nuevaConfig) => {
    const completa = snapshotConfigPerfil({
      ...DEFAULT_CONFIG,
      ...configVistaProp,
      ...(nuevaConfig && typeof nuevaConfig === 'object' ? nuevaConfig : {}),
    });
    setLocalDesign(completa);
    try {
      localStorage.setItem(STORAGE_DESIGN_KEY, JSON.stringify(completa));
    } catch (err) {
      console.warn('[CocinaMonitorLayout] Error guardando config local:', err.message);
    }
  }, [configVistaProp]);

  const armarConfigPerfil = useCallback(
    () => snapshotConfigPerfil({
      ...DEFAULT_CONFIG,
      ...configVistaProp,
      ...localDesign,
    }),
    [configVistaProp, localDesign]
  );

  const aplicarConfigPerfil = useCallback((config) => {
    const completa = snapshotConfigPerfil({
      ...DEFAULT_CONFIG,
      ...(config && typeof config === 'object' ? config : {}),
    });
    autoSaveSkipRef.current = true;
    setLocalDesign(completa);
    try { localStorage.setItem(STORAGE_DESIGN_KEY, JSON.stringify(completa)); } catch { /* noop */ }
    return completa;
  }, []);

  // Guardar el diseño actual como perfil del cocinero activo en backend.
  // Flujo "Distribuir Cocina en monitores" → botón "Guardar Perfil".
  const guardarPerfilCocinero = useCallback(async () => {
    const idPerfil = primerCocineroIdFiltro(cocineroActivoId);
    if (!idPerfil) {
      setPerfilMensaje({ tipo: 'error', texto: 'Selecciona un cocinero para guardar su perfil' });
      return;
    }
    if (!getToken) {
      setPerfilMensaje({ tipo: 'error', texto: 'Sin token de auth' });
      return;
    }
    try {
      setGuardandoPerfil(true);
      setPerfilMensaje(null);
      const baseUrl = getServerBaseUrl();
      const token = getToken();
      await axios.put(
        `${baseUrl}/api/cocineros/${idPerfil}/perfil-ver-cocina`,
        { config: armarConfigPerfil() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      autoSaveSkipRef.current = true; // evita auto-save redundante tras guardado explícito
      setPerfilMensaje({ tipo: 'ok', texto: 'Perfil guardado ✓' });
      setTimeout(() => setPerfilMensaje(null), 3000);
    } catch (err) {
      console.error('[CocinaMonitorLayout] Error guardando perfil:', err);
      setPerfilMensaje({ tipo: 'error', texto: err?.response?.data?.error || 'Error al guardar perfil' });
    } finally {
      setGuardandoPerfil(false);
    }
  }, [cocineroActivoId, getToken, armarConfigPerfil]);

  // ===== Perfiles de personalización con nombre (flujo Distribuir Cocina) =====
  const [perfiles, setPerfiles] = useState([]);
  const [perfilSelId, setPerfilSelId] = useState(null);
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);
  const [cargandoPerfilId, setCargandoPerfilId] = useState(null);

  const cargarPerfiles = useCallback(async () => {
    if (!getToken) return;
    try {
      setCargandoPerfiles(true);
      const baseUrl = getServerBaseUrl();
      const token = getToken();
      const res = await axios.get(`${baseUrl}/api/perfiles-ver-cocina`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setPerfiles(res.data?.data || []);
    } catch (err) {
      console.warn('[CocinaMonitorLayout] Error cargando perfiles:', err.message);
    } finally {
      setCargandoPerfiles(false);
    }
  }, [getToken]);

  // Cargar lista de perfiles al abrir el panel de personalización.
  useEffect(() => {
    if (showConfigPanel) cargarPerfiles();
  }, [showConfigPanel, cargarPerfiles]);

  const seleccionarPerfil = useCallback(async (perfilId) => {
    if (!perfilId) { setPerfilSelId(null); return; }
    if (!getToken) return;
    setCargandoPerfilId(perfilId);
    setPerfilMensaje(null);
    try {
      const baseUrl = getServerBaseUrl();
      const token = getToken();
      // Fetch fresco del perfil por ID (más robusto que usar la lista en cache).
      const res = await axios.get(
        `${baseUrl}/api/perfiles-ver-cocina/${perfilId}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
      );
      const perfil = res.data?.data;
      const config = perfil?.config;
      const nombre = perfil?.nombre || 'Perfil';
      if (config && typeof config === 'object') {
        aplicarConfigPerfil(config);
        setPerfilSelId(perfilId);
        setPerfilMensaje({ tipo: 'ok', texto: `Perfil "${nombre}" cargado ✓` });
        setTimeout(() => setPerfilMensaje(null), 3000);
      } else {
        setPerfilMensaje({ tipo: 'error', texto: 'El perfil no tiene configuración válida' });
        setTimeout(() => setPerfilMensaje(null), 4000);
      }
    } catch (err) {
      console.warn('[CocinaMonitorLayout] Error cargando perfil:', err.message);
      // Fallback: usar la lista en cache si el fetch falla
      const p = perfiles.find((x) => String(x._id) === String(perfilId));
      if (p && p.config) {
        aplicarConfigPerfil(p.config);
        setPerfilSelId(perfilId);
        setPerfilMensaje({ tipo: 'ok', texto: `Perfil "${p.nombre}" cargado (cache) ✓` });
        setTimeout(() => setPerfilMensaje(null), 3000);
      } else {
        setPerfilMensaje({ tipo: 'error', texto: err?.response?.data?.error || 'Error al cargar perfil' });
        setTimeout(() => setPerfilMensaje(null), 4000);
      }
    } finally {
      setCargandoPerfilId(null);
    }
  }, [getToken, perfiles, aplicarConfigPerfil]);

  const guardarPerfilComo = useCallback(async (nombre) => {
    if (!getToken) return;
    const nom = (nombre || '').trim();
    if (!nom) {
      setPerfilMensaje({ tipo: 'error', texto: 'Ingresa un nombre para el perfil' });
      return false;
    }
    try {
      setGuardandoPerfil(true);
      setPerfilMensaje(null);
      const baseUrl = getServerBaseUrl();
      const token = getToken();
      const res = await axios.post(
        `${baseUrl}/api/perfiles-ver-cocina`,
        { nombre: nom, config: armarConfigPerfil() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const creado = res.data?.data;
      setPerfilMensaje({ tipo: 'ok', texto: `Perfil "${nom}" guardado ✓` });
      setTimeout(() => setPerfilMensaje(null), 3000);
      await cargarPerfiles();
      if (creado?._id) setPerfilSelId(creado._id);
      return true;
    } catch (err) {
      console.error('[CocinaMonitorLayout] Error guardando perfil con nombre:', err);
      setPerfilMensaje({ tipo: 'error', texto: err?.response?.data?.error || 'Error al guardar perfil' });
      return false;
    } finally {
      setGuardandoPerfil(false);
    }
  }, [getToken, armarConfigPerfil, cargarPerfiles]);

  const sobrescribirPerfil = useCallback(async (perfilId) => {
    if (!perfilId || !getToken) return;
    const p = perfiles.find((x) => String(x._id) === String(perfilId));
    if (!p) return;
    try {
      setGuardandoPerfil(true);
      setPerfilMensaje(null);
      const baseUrl = getServerBaseUrl();
      const token = getToken();
      await axios.put(
        `${baseUrl}/api/perfiles-ver-cocina/${perfilId}`,
        { config: armarConfigPerfil() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPerfilMensaje({ tipo: 'ok', texto: `Perfil "${p.nombre}" actualizado ✓` });
      setTimeout(() => setPerfilMensaje(null), 3000);
      await cargarPerfiles();
    } catch (err) {
      console.error('[CocinaMonitorLayout] Error sobrescribiendo perfil:', err);
      setPerfilMensaje({ tipo: 'error', texto: err?.response?.data?.error || 'Error al actualizar perfil' });
    } finally {
      setGuardandoPerfil(false);
    }
  }, [getToken, armarConfigPerfil, perfiles, cargarPerfiles]);

  const eliminarPerfil = useCallback(async (perfilId) => {
    if (!perfilId || !getToken) return;
    const p = perfiles.find((x) => String(x._id) === String(perfilId));
    if (!p) return;
    try {
      setGuardandoPerfil(true);
      setPerfilMensaje(null);
      const baseUrl = getServerBaseUrl();
      const token = getToken();
      await axios.delete(
        `${baseUrl}/api/perfiles-ver-cocina/${perfilId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPerfilMensaje({ tipo: 'ok', texto: `Perfil "${p.nombre}" eliminado` });
      setTimeout(() => setPerfilMensaje(null), 3000);
      if (String(perfilSelId) === String(perfilId)) setPerfilSelId(null);
      await cargarPerfiles();
    } catch (err) {
      console.error('[CocinaMonitorLayout] Error eliminando perfil:', err);
      setPerfilMensaje({ tipo: 'error', texto: err?.response?.data?.error || 'Error al eliminar perfil' });
    } finally {
      setGuardandoPerfil(false);
    }
  }, [getToken, perfiles, perfilSelId, cargarPerfiles]);

  // Cargar perfil del cocinero desde backend cuando la URL trae ?perfil=auto
  // o un perfil con nombre vía ?perfilId=<id> (ventanas hijas del flujo
  // "Distribuir Cocina en monitores").
  useEffect(() => {
    if (perfilAutoAplicado) return;
    if (!modoFijo) return;
    let perfilId = null;
    let perfilAuto = false;
    try {
      const params = new URLSearchParams(window.location.search);
      perfilId = params.get('perfilId');
      perfilAuto = params.get('perfil') === 'auto';
      if (!perfilId && !perfilAuto) return;
      if (!perfilId && perfilAuto && !primerCocineroIdFiltro(cocineroActivoId)) return;
    } catch { return; }
    if (!getToken) return;
    setPerfilAutoAplicado(true);
    (async () => {
      try {
        const baseUrl = getServerBaseUrl();
        const token = getToken();
        if (perfilId) {
          const res = await axios.get(
            `${baseUrl}/api/perfiles-ver-cocina/${perfilId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const perfil = res.data?.data?.config;
          if (perfil && typeof perfil === 'object' && Object.keys(perfil).length > 0) {
            aplicarConfigPerfil(perfil);
          }
        } else {
          const res = await axios.get(
            `${baseUrl}/api/cocineros/${primerCocineroIdFiltro(cocineroActivoId)}/perfil-ver-cocina`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const perfil = res.data?.data;
          if (perfil && typeof perfil === 'object' && Object.keys(perfil).length > 0) {
            aplicarConfigPerfil(perfil);
          }
        }
      } catch (err) {
        console.warn('[CocinaMonitorLayout] No se pudo cargar perfil ver-cocina:', err.message);
      }
    })();
  }, [modoFijo, cocineroActivoId, getToken, perfilAutoAplicado]);

  // ===== Auto-save debounced del localDesign al perfil auto del cocinero (MongoDB) =====
  // Persiste la personalización del panel "Personalizar" en el backend automáticamente,
  // sin necesidad de pulsar "Guardar perfil". Solo aplica en la consola principal
  // (no modoFijo, que son ventanas hijas que solo muestran el perfil asignado),
  // cuando hay un cocinero activo y NO se está editando un perfil con nombre
  // (perfilSelId), ya que esos se guardan explícitamente. Se omite justo después de
  // cargar un perfil (skip ref) para no re-persistir lo recién cargado.
  useEffect(() => {
    if (modoFijo) return;
    if (!primerCocineroIdFiltro(cocineroActivoId)) return;
    if (!getToken) return;
    if (perfilSelId) return; // editando un perfil con nombre: guardado explícito
    if (autoSaveSkipRef.current) {
      autoSaveSkipRef.current = false;
      return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoGuardando(true);
        const baseUrl = getServerBaseUrl();
        const token = getToken();
        await axios.put(
          `${baseUrl}/api/cocineros/${primerCocineroIdFiltro(cocineroActivoId)}/perfil-ver-cocina`,
          { config: snapshotConfigPerfil({ ...DEFAULT_CONFIG, ...configVistaProp, ...localDesign }) },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 6000 }
        );
      } catch (err) {
        console.warn('[CocinaMonitorLayout] Auto-save perfil falló:', err.message);
      } finally {
        setAutoGuardando(false);
      }
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [localDesign, cocineroActivoId, getToken, perfilSelId, modoFijo]);

  // Config visual final
  const fuenteFamilia = configVisual.fuenteFamilia;
  const colorFondo = configVisual.colorFondo;
  const colorTextoPrincipal = configVisual.colorTextoPrincipal;
  const colorTextoSecundario = configVisual.colorTextoSecundario;
  const colorAcento = configVisual.colorAcento;
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla;
  const colorAlertaRoja = configVisual.colorAlertaRoja;

  const amarilloMin = configVisual.tiempoAmarillo;
  const rojoMin = configVisual.tiempoRojo;
  const totalPendientes = platosPendientes.length;
  const urgentes = platosPendientes.filter(p => {
    if (!p.tiempoInicio) return false;
    const segundos = Math.floor((Date.now() - new Date(p.tiempoInicio).getTime()) / 1000);
    return segundos / 60 >= rojoMin;
  }).length;

  const icono = configVisual.icono || '🍳';
  const iconoEmoji = ICONO_MAP[icono] || icono || '🍳';
  const layoutColumnas = clampColumnas(configVisual.layoutColumnas || 1);
  const esGrid = layoutColumnas > 1;
  // PLAN GUARNICIONES_SEPARADAS v1.1.1 §10: columnas del panel de guarniciones.
  // Si NO se activa "diferenciar diseño", las guarniciones heredan las columnas
  // de los platos principales (mismo diseño de lista).
  const diferenciarDiseno = configVisual.diferenciarDisenoGuarniciones === true;
  const layoutColumnasGuarniciones = clampColumnas(
    diferenciarDiseno ? (configVisual.layoutColumnasGuarniciones || 1) : (configVisual.layoutColumnas || 1)
  );
  const esGridGuarniciones = layoutColumnasGuarniciones > 1;
  const splitActivo = listaGuarnicionesOn && flagGuarnicionesGlobal;
  const agrupacionOn = agrupacionGuarnicionesOn({
    permitirGuarnicionesSeparadas: flagGuarnicionesGlobal,
    deshabilitarAgrupacionGuarniciones,
  });
  const modoRefPadre = configVisual.referenciaPadreGuarnicion || 'de';
  const ocultarCronometroG = configVisual.ocultarCronometroGuarniciones === true;
  const mostrarTitulosSplit = splitActivo && configVisual.mostrarTitulosListasSplit === true;
  const colorAcentoGuarn = tokenGuarnicion(configVisual, 'colorAcentoGuarnicion', colorAcento);
  const grosorSeparador = Math.min(16, Math.max(1, Number(configVisual.grosorSeparadorSplit) || 2));
  const colorSeparador = configVisual.colorSeparadorSplit || colorAcentoGuarn;
  const ALIGN_TITULO = { izquierda: 'left', centro: 'center', derecha: 'right' };
  const estiloTituloSplit = {
    flexShrink: 0,
    padding: '8px 16px',
    background: colorFondo,
    borderBottom: `${grosorSeparador}px solid ${colorSeparador}`,
    fontFamily: configVisual.fuenteFamiliaTituloListaSplit || fuenteFamilia,
    fontWeight: configVisual.pesoTituloListaSplit || 800,
    fontSize: `${Number(configVisual.tamanioTituloListaSplit) || 13}px`,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: configVisual.colorTituloListaSplit || colorTextoPrincipal,
    textAlign: ALIGN_TITULO[configVisual.alinearTituloListaSplit] || 'left',
  };
  const espaciadoGuarn = tokenGuarnicion(configVisual, 'espaciadoFilasGuarnicion', configVisual.espaciadoFilas || 'normal');
  const gapGrid =
    configVisual.espaciadoFilas === 'unido' ? '0px' :
    configVisual.espaciadoFilas === 'compacto' ? '8px' :
    configVisual.espaciadoFilas === 'amplio' ? '20px' : '12px';
  const gapGridGuarniciones =
    espaciadoGuarn === 'unido' ? '0px' :
    espaciadoGuarn === 'compacto' ? '8px' :
    espaciadoGuarn === 'amplio' ? '20px' : '12px';

  // Detección automática del modo "por cocinero": si los items tienen `cocinero` y `timers`
  const modoCocineros = modoCocinerosProp != null
    ? modoCocinerosProp
    : Array.isArray(platosPendientes) && platosPendientes.some(p => p && p.cocinero && Array.isArray(p.timers));

  const mapaPronombresCocinero = useMemo(() => {
    const m = new Map();
    (cocineros || []).forEach((c) => {
      const p = String(c.pronombre || '').trim();
      if (c && c._id && p) m.set(String(c._id), p);
    });
    return m;
  }, [cocineros]);

  const mostrarPronombreRef = configVisual.mostrarPronombreCocineroGuarnicion !== false;
  const ocultarPronombreSiId = esUnSoloCocineroFiltro(cocineroActivoId)
    ? primerCocineroIdFiltro(cocineroActivoId)
    : null;

  // Panel derecho: agrupación ON = 1 ítem por plato; OFF = 1 ítem por extra.
  const guarnicionesPanel = useMemo(() => {
    if (!splitActivo) return [];
    const items = recolectarGuarnicionesMonitor(Array.isArray(comandas) ? comandas : [], {
      cocineroIdFiltrado: cocineroActivoId,
    });
    const gruposMap = new Map();
    for (const item of items) {
      const { comanda, plato, platoIndex, comp } = item;
      const nombrePadre = obtenerNombreDisplayCocina(plato, { forzar: true }) || 'Plato';
      const comandaId = String(comanda._id || comanda.id || comanda.numero || '');
      const mesaNum = comanda.mesaNumero ?? comanda.mesas?.nummesa ?? comanda.mesas?.numero ?? comanda.mesa?.numero ?? comanda.mesa ?? null;
      const comandaNumero = comanda.numero || comanda.numeroMesa || null;
      const nombreG = nombreCocinaComplemento(comp) || 'Guarnición';
      const qty = Number(comp.cantidad) || 1;
      const ppG = comp.procesandoPor;
      const cidG = ppG?.cocineroId;
      const cocinero = (cidG)
        ? {
            id: String(cidG),
            alias: ppG.alias || ppG.nombre || 'Cocinero',
            nombre: ppG.nombre || ppG.alias || '',
            pronombre: String(ppG.pronombre || '').trim() || mapaPronombresCocinero.get(String(cidG)) || '',
          }
        : null;
      const cocineroPrincipal = cocineroDesdeProcesandoPor(plato.procesandoPor, mapaPronombresCocinero);
      const cid = modoCocineros && cocinero?.id ? cocinero.id : '';
      const key = agrupacionOn
        ? `${cid}::gg::${comandaId}:${platoIndex}`
        : `${cid}::g::${comandaId}:${platoIndex}:${comp._id || nombreG}`;
      if (!gruposMap.has(key)) {
        gruposMap.set(key, {
          nombre: nombreG,
          cantidadTotal: 0,
          platos: [],
          tiempoInicio: null,
          key,
          grupoId: grupoIdEstable(key),
          cocinero: modoCocineros ? cocinero : null,
          cocineroPrincipal,
          timers: [],
          comps: [],
          esGuarnicion: true,
          padresSet: new Set(),
          mesaNum,
          comandaNumero,
          comandaId,
          platoIndex,
        });
      }
      const g = gruposMap.get(key);
      g.cantidadTotal += qty;
      g.comps.push(comp);
      g.platos.push({ plato, comanda, cocinero, cocineroPrincipal });
      if (nombrePadre) g.padresSet.add(nombrePadre);
      if (modoCocineros && !g.cocinero && cocinero) g.cocinero = cocinero;
      if (!g.cocineroPrincipal && cocineroPrincipal) g.cocineroPrincipal = cocineroPrincipal;
      if (!agrupacionOn) {
        const tiempoInicio = tiempoInicioGuarnicion(comp);
        const lineaId = `${comandaId}:${platoIndex}:g:${comp._id || nombreG}`;
        const colorLinea = colorLineaDesdeId(lineaId);
        for (let u = 0; u < qty; u++) {
          g.timers.push({
            tiempoInicio,
            cantidad: 1,
            mesa: mesaNum,
            comandaNumero,
            comandaId,
            platoIndex,
            unidadIndex: u,
            lineaId,
            colorLinea,
          });
        }
        const t = tiempoInicio ? new Date(tiempoInicio).getTime() : null;
        if (t != null && (g.tiempoInicio === null || t < new Date(g.tiempoInicio).getTime())) {
          g.tiempoInicio = tiempoInicio;
        }
      }
    }
    const grupos = Array.from(gruposMap.values()).map((g) => {
      const padres = Array.from(g.padresSet).filter(Boolean);
      const padreTxt = padres.join(' · ');
      const { padresSet, mesaNum, comandaNumero, comandaId, platoIndex, comps, ...rest } = g;
      const nombre = agrupacionOn ? (tituloGrupoGuarniciones(comps) || rest.nombre) : rest.nombre;
      const tiempoInicio = agrupacionOn ? tiempoInicioGrupo(comps) : rest.tiempoInicio;
      let timers = rest.timers;
      if (agrupacionOn) {
        const lineaId = `${comandaId}:${platoIndex}:gg`;
        timers = tiempoInicio
          ? [{
              tiempoInicio,
              cantidad: 1,
              mesa: mesaNum,
              comandaNumero,
              comandaId,
              platoIndex,
              unidadIndex: 0,
              lineaId,
              colorLinea: colorLineaDesdeId(lineaId),
            }]
          : [];
      }
      if (ocultarCronometroG) timers = [];
      return {
        ...rest,
        nombre,
        comps,
        cantidadTotal: agrupacionOn ? 1 : rest.cantidadTotal,
        tiempoInicio,
        timers,
        subtitulo: formatearReferenciaPadre(padreTxt, modoRefPadre),
        lineaLista: lineaListaGuarniciones(comps, padreTxt, modoRefPadre),
        nombrePadre: padreTxt,
        cocineroPrincipal: rest.cocineroPrincipal || null,
        pronombrePrincipal: pronombreReferenciaPrincipal(rest.cocineroPrincipal, {
          mapaCocineros: mapaPronombresCocinero,
          mostrar: mostrarPronombreRef,
          ocultarSiIds: [ocultarPronombreSiId],
        }),
      };
    });
    grupos.sort((a, b) => {
      const ta = a.tiempoInicio ? new Date(a.tiempoInicio).getTime() : 0;
      const tb = b.tiempoInicio ? new Date(b.tiempoInicio).getTime() : 0;
      return ta - tb;
    });
    return modoCocineros ? asignarNumeroGlobal(grupos) : grupos;
  }, [splitActivo, comandas, modoCocineros, cocineroActivoId, agrupacionOn, modoRefPadre, ocultarCronometroG, mapaPronombresCocinero, mostrarPronombreRef, ocultarPronombreSiId]);

  const notasPlatos = useMemo(() => {
    if (configVisual.mostrarTablaNotas === false) return [];
    return recolectarNotasMonitor(platosPendientes, {
      mapaCocineros: mapaPronombresCocinero,
      nombrePlatoFn: (p) => obtenerNombreDisplayCocina(p, { forzar: true }) || p?.nombre || 'Plato',
      mostrarPronombre: mostrarPronombreRef,
      ocultarSiCocineroId: ocultarPronombreSiId,
    });
  }, [platosPendientes, mapaPronombresCocinero, configVisual.mostrarTablaNotas, mostrarPronombreRef, ocultarPronombreSiId]);

  const notasGuarniciones = useMemo(() => {
    if (configVisual.mostrarTablaNotas === false) return [];
    return recolectarNotasMonitor(guarnicionesPanel, {
      mapaCocineros: mapaPronombresCocinero,
      nombrePlatoFn: (p) => obtenerNombreDisplayCocina(p, { forzar: true }) || p?.nombre || 'Plato',
      mostrarPronombre: mostrarPronombreRef,
      ocultarSiCocineroId: ocultarPronombreSiId,
    });
  }, [guarnicionesPanel, mapaPronombresCocinero, configVisual.mostrarTablaNotas, mostrarPronombreRef, ocultarPronombreSiId]);

  // Modo de agrupación visual efectivo:
  // - tarjetas independientes si multi-columna O config.modoAgrupacion === 'tarjetas'
  // - bloques por cocinero en columna única SOLO en vista General.
  //   Si hay un cocinero filtrado, el header (foto + alias + PLATOS + MÁS ANTIGUO)
  //   es redundante: ya se ve en el selector.
  const modoBloques = modoCocineros
    && !esUnSoloCocineroFiltro(cocineroActivoId)
    && layoutColumnas === 1
    && (configVisual.modoAgrupacion || 'bloques') === 'bloques'
    && configVisual.mostrarCabeceraCocinero !== false;

  // Agrupar items por cocineroId (solo en modo bloques)
  const bloquesCocinero = useMemo(() => {
    if (!modoCocineros) return [];
    const map = new Map();
    for (const item of platosPendientes) {
      const cid = item.cocinero?.id || '_sin_cocinero';
      const alias = item.cocinero?.alias || 'Cocinero';
      const nombre = item.cocinero?.nombre || '';
      if (!map.has(cid)) {
        map.set(cid, {
          cocinero: { id: cid, alias, nombre, fotoUrl: item.cocinero?.fotoUrl || '' },
          tarjetas: [],
          totalPlatos: 0,
        });
      }
      const bloque = map.get(cid);
      bloque.tarjetas.push(item);
      bloque.totalPlatos += item.cantidadTotal || 0;
    }
    const bloques = Array.from(map.values());
    // Orden: alerta máxima (rojo>amarillo>normal) desc -> totalPlatos desc
    const peso = (b) => {
      let max = 0;
      for (const t of b.tarjetas) for (const ti of (t.timers || [])) {
        const s = calcularSegundos(ti.tiempoInicio);
        const a = nivelAlerta(s, configVisual.tiempoAmarillo, configVisual.tiempoRojo);
        max = Math.max(max, a === 'rojo' ? 2 : a === 'amarillo' ? 1 : 0);
      }
      return max;
    };
    bloques.sort((a, b) => peso(b) - peso(a) || b.totalPlatos - a.totalPlatos);
    // Numeración global de timers por bloque de cocinero (1 = más viejo)
    return bloques.map((b) => ({
      ...b,
      tarjetas: asignarNumeroGlobal(b.tarjetas),
    }));
  }, [platosPendientes, modoCocineros, configVisual.tiempoAmarillo, configVisual.tiempoRojo]);

  // Lista plana: numeración global de timers en toda la vista
  const platosConTimersNumerados = useMemo(
    () => (modoCocineros ? asignarNumeroGlobal(platosPendientes) : platosPendientes),
    [platosPendientes, modoCocineros],
  );

  // Cocineros activos (para la barra superior cuando se "quita" el nombre de las tarjetas)
  const cocinerosActivos = useMemo(() => {
    if (!modoCocineros) return [];
    const map = new Map();
    for (const item of platosPendientes) {
      const cid = item.cocinero?.id || '_sin_cocinero';
      if (!map.has(cid)) {
        map.set(cid, {
          id: cid,
          alias: item.cocinero?.alias || 'Cocinero',
          nombre: item.cocinero?.nombre || '',
          fotoUrl: item.cocinero?.fotoUrl || '',
          totalPlatos: 0,
        });
      }
      map.get(cid).totalPlatos += item.cantidadTotal || 0;
    }
    return Array.from(map.values());
  }, [platosPendientes, modoCocineros]);

  const animOn = configVisual.animacionesTarjetas !== false;
  const presenceMode = animOn ? 'popLayout' : undefined;

  // === AutoAgrandamiento ===
  // Factor de escala según cantidad de platos en pantalla. Cuantos menos platos,
  // más grandes las tarjetas; cuantos más, más pequeñas (para que todas quepan).
  const autoAgrandamientoOn = configVisual.autoAgrandamiento === true;
  const totalPlatosLista = platosPendientes.length;
  const autoScale = (() => {
    if (!autoAgrandamientoOn) return 1;
    if (totalPlatosLista <= 0) return 1;
    // Rangos suaves (basados en platos visibles)
    if (totalPlatosLista <= 3) return 1.35;
    if (totalPlatosLista <= 6) return 1.2;
    if (totalPlatosLista <= 10) return 1.05;
    if (totalPlatosLista <= 16) return 0.92;
    if (totalPlatosLista <= 24) return 0.82;
    return 0.72;
  })();

  // === AutoAcomodamiento ===
  // Cada tarjeta se dimensiona según su contenido (no todas del mismo ancho).
  const autoAcomodamientoOn = configVisual.autoAcomodamiento === true;
  const aprovecharEspacioOn = configVisual.aprovecharEspacio === true;
  const zoomLista = autoAgrandamientoOn ? autoScale : undefined;

  return (
    <div
      style={{
        background: colorFondo,
        color: colorTextoPrincipal,
        fontFamily: fuenteFamilia,
        minHeight: '100vh',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: modoFijo ? '14px 24px' : '10px 24px',
          borderBottom: `2px solid ${colorAcento}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '30px' }}>{iconoEmoji}</span>
          <h1
            style={{
              fontSize: modoFijo ? '28px' : '24px',
              fontWeight: 800,
              color: colorAcento,
              letterSpacing: '0.05em',
            }}
          >
            {nombreVista.toUpperCase()}
          </h1>
          {/* Nombres de cocineras a la derecha del título cuando se quitan de las tarjetas */}
          {configVisual.quitarNombreCocineroTarjeta === true && cocinerosActivos.length > 0 && (
            <>
              <span style={{ color: colorTextoSecundario, fontSize: '18px', fontWeight: 700 }}>·</span>
              {cocinerosActivos.map((c) => {
                const colorC = (configVisual.colorPorCocinero !== false)
                  ? colorAcentoPorCocineroHeader(c.alias)
                  : colorAcento;
                return (
                  <span
                    key={c.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: `${colorC}1f`,
                      border: `1px solid ${colorC}66`,
                      color: colorC,
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {c.fotoUrl ? (
                      <img
                        src={c.fotoUrl}
                        alt={c.alias}
                        style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          objectFit: 'cover', border: `2px solid ${colorC}`,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: `${colorC}22`, border: `2px solid ${colorC}`,
                          color: colorC, fontSize: '9px', fontWeight: 800,
                        }}
                      >
                        {(c.alias || '?').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {c.alias}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: colorFondo,
                        background: colorC,
                        borderRadius: '999px',
                        padding: '1px 7px',
                        minWidth: '22px',
                        textAlign: 'center',
                      }}
                    >
                      {c.totalPlatos}
                    </span>
                  </span>
                );
              })}
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {!modoFijo && onVolver && (
            <button
              onClick={onVolver}
              title="Volver al menú principal"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'transparent',
                color: colorTextoSecundario,
                border: `2px solid ${colorAcento}55`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
            >
              ◀ Menú
            </button>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: colorTextoSecundario, textTransform: 'uppercase' }}>
              Pendientes
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: colorTextoPrincipal }}>
              {totalPendientes}
            </div>
          </div>
          {urgentes > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: colorAlertaRoja, textTransform: 'uppercase' }}>
                Urgentes
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: colorAlertaRoja }}>
                {urgentes}
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: colorTextoSecundario }}>Hora</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: colorTextoPrincipal, fontVariantNumeric: 'tabular-nums' }}>
              {reloj}
            </div>
          </div>
          {!modoFijo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {autoGuardando && (
                <span
                  title="Guardando personalización en el servidor…"
                  style={{ fontSize: '11px', color: colorTextoSecundario, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="animate-spin" style={{ display: 'inline-block', width: '10px', height: '10px', border: `2px solid ${colorAcento}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Guardando…
                </span>
              )}
              <button
                onClick={() => setShowConfigPanel(s => !s)}
                title="Personalizar apariencia"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: showConfigPanel ? colorAcento : 'transparent',
                  color: showConfigPanel ? colorFondo : colorTextoSecundario,
                  border: `2px solid ${showConfigPanel ? colorAcento : `${colorAcento}55`}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '16px' }}>⚙</span>
                Personalizar
              </button>
              {/* PLAN GUARNICIONES_SEPARADAS v1.1 §10: botón a la derecha de Personalizar.
                  Solo se muestra si el flag global permitirGuarnicionesSeparadas está ON. */}
              {flagGuarnicionesGlobal && (
                <button
                  onClick={() => setListaGuarnicionesOn(v => !v)}
                  title={listaGuarnicionesOn ? 'Lista de complementos activada (split 50/50)' : 'Activar Lista de complementos (split 50/50)'}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: listaGuarnicionesOn ? '#7CB342' : 'transparent',
                    color: listaGuarnicionesOn ? colorFondo : colorTextoSecundario,
                    border: `2px solid ${listaGuarnicionesOn ? '#7CB342' : `${colorAcento}55`}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🥗</span>
                  {listaGuarnicionesOn ? 'Lista complementos ON' : 'Activar Lista complementos'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Panel de personalización visual */}
      <AnimatePresence>
        {showConfigPanel && !modoFijo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              overflow: 'auto',
              maxHeight: 'min(70vh, 520px)',
              borderBottom: `2px solid ${colorAcento}33`,
              flexShrink: 0,
              background: `${colorFondo}ee`,
            }}
          >
            <MonitorConfigPanel
              configVisual={configVisual}
              localDesign={localDesign}
              onChange={guardarConfigLocal}
              onReset={() => {
                localStorage.removeItem(STORAGE_DESIGN_KEY);
                setLocalDesign(snapshotConfigPerfil(DEFAULT_CONFIG));
                setPerfilSelId(null);
              }}
              onSaveProfile={guardarPerfilCocinero}
              guardandoPerfil={guardandoPerfil}
              perfilMensaje={perfilMensaje}
              colorFondo={colorFondo}
              colorTextoPrincipal={colorTextoPrincipal}
              colorTextoSecundario={colorTextoSecundario}
              colorAcento={colorAcento}
              perfiles={perfiles}
              perfilSelId={perfilSelId}
              cargandoPerfiles={cargandoPerfiles}
              cargandoPerfilId={cargandoPerfilId}
              onSeleccionarPerfil={seleccionarPerfil}
              onGuardarPerfilComo={guardarPerfilComo}
              onSobrescribirPerfil={sobrescribirPerfil}
              onEliminarPerfil={eliminarPerfil}
              onRecargarPerfiles={cargarPerfiles}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra unificada: selector compacto de cocinero + buscador de platos
          (solo Ver Cocina Completo, no fijo) */}
      {cocineros && !modoFijo && onCambiarCocinero && (
        <div
          style={{
            padding: '8px 24px',
            borderBottom: `1px solid ${colorAcento}11`,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexShrink: 0,
            flexWrap: 'nowrap',
            minHeight: '48px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: colorTextoSecundario,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            Cocinero
          </span>
          <CocineroSelectorDropdown
            cocineros={cocineros}
            valor={cocineroActivoId}
            onChange={onCambiarCocinero}
            colorFondo={colorFondo}
            colorTextoPrincipal={colorTextoPrincipal}
            colorTextoSecundario={colorTextoSecundario}
            colorAcento={colorAcento}
            ancho={220}
          />
          {onSearchChange && !configVisual.ocultarBuscadorPlatos && (
            <>
              <div
                style={{
                  width: '1px',
                  alignSelf: 'stretch',
                  background: `${colorAcento}22`,
                  margin: '0 4px',
                  flexShrink: 0,
                }}
              />
              <SearchBar
                variant="monitor"
                compact
                placeholder="Buscar plato por nombre o código (L1, M23...)..."
                onSearch={onSearchChange}
                totalPlatosEncontrados={totalPlatosEncontrados}
                totalComandasEncontradas={totalComandasEncontradas}
                hayFiltroActivo={hayFiltroBusqueda}
                sugerencias={sugerenciasBusqueda}
                onSugerenciaClick={onSugerenciaClick}
                monitorTheme={{
                  colorFondo,
                  colorTextoPrincipal,
                  colorTextoSecundario,
                  colorAcento,
                  colorAlertaAmarilla,
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Selector de vistas (solo modo personalizado, no fijo) */}
      {vistasCocina && !modoFijo && (
        <div
          style={{
            padding: '10px 24px',
            borderBottom: `1px solid ${colorAcento}11`,
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {vistasCocina.map(v => (
            <button
              key={v._id}
              onClick={() => onCambiarVista?.(v._id)}
              style={{
                padding: '8px 18px',
                borderRadius: '999px',
                fontSize: '15px',
                fontWeight: 600,
                border: `2px solid ${v._id === vistaActivaId ? colorAcento : colorAcento}33`,
                background: v._id === vistaActivaId ? colorAcento : 'transparent',
                color: v._id === vistaActivaId ? colorFondo : colorTextoPrincipal,
                cursor: 'pointer',
              }}
            >
              {v.icono ? `${ICONO_MAP[v.icono] || '📍'} ` : ''}{v.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Barra de notificación "Entra plato ####" */}
      <AnimatePresence>
        {ultimoPlato && (
          <motion.div
            key={`notif-${ultimoPlato.ts}`}
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: '10px 24px',
              background: `${colorAlertaAmarilla}22`,
              borderBottom: `2px solid ${colorAlertaAmarilla}55`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ fontSize: '20px' }}
            >
              🔔
            </motion.span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: colorAlertaAmarilla }}>
              {configVisual.textoNotificacionEntrada || 'Entra plato'}{' '}
              <span style={{ fontWeight: 800 }}>{ultimoPlato.nombre}</span>
              <span style={{ marginLeft: '8px', color: colorAcento }}>×{ultimoPlato.delta ?? ultimoPlato.cantidadTotal}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de platos */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        // PLAN GUARNICIONES_SEPARADAS v1.1.1 §10: split 50/50 cuando "Lista
        // complementos" está activo. Izquierda = platos principales, derecha =
        // panel de guarniciones.
        ...(splitActivo ? { display: 'flex', flexDirection: 'row', overflow: 'hidden' } : {}),
      }}>
        {/* Panel izquierdo: platos principales (ancho 50% cuando split activo) */}
        <div style={splitActivo
          ? { flex: '1 1 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `${grosorSeparador}px solid ${colorSeparador}` }
          : { flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {mostrarTitulosSplit && (
          <div style={estiloTituloSplit}>
            {configVisual.tituloListaPlatos || 'PLATOS'}
          </div>
        )}
        <div style={splitActivo ? { flex: 1, overflowY: 'auto', overflowX: 'hidden' } : undefined}>
        {totalPendientes === 0 ? (
          <MonitorEmptyState
            nombreVista={nombreVista}
            nombreCocinero={nombreCocineroActivo}
            terminoBusqueda={hayFiltroBusqueda ? searchTerm : null}
          />
        ) : modoBloques ? (
          <div
            style={{
              padding: '0 0 16px 0',
              zoom: autoAgrandamientoOn ? autoScale : undefined,
            }}
          >
            <LayoutGroup>
              <AnimatePresence initial={false} mode={presenceMode}>
                {bloquesCocinero.map((bloque) => (
                  <BloqueCocinero
                    key={bloque.cocinero.id}
                    bloque={bloque}
                    configVisual={configVisual}
                    tick={tick}
                  />
                ))}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        ) : modoCocineros ? (
          <MonitorTarjetasGrid
            key={`monitor-cols-${layoutColumnas}`}
            columns={layoutColumnas}
            gap={gapGrid}
            zoom={zoomLista}
            aprovecharEspacio={aprovecharEspacioOn}
            presenceMode={presenceMode}
          >
            {platosConTimersNumerados.map((item) => (
              <CocineroPlatoCard
                key={item.grupoId || item.key}
                item={item}
                configVisual={configVisual}
                mostrarCocinero={!esUnSoloCocineroFiltro(cocineroActivoId)}
                modoTarjeta={esGrid}
                autoAcomodamiento={autoAcomodamientoOn}
                tick={tick}
              />
            ))}
          </MonitorTarjetasGrid>
        ) : (
          <MonitorTarjetasGrid
            key={`monitor-cols-${layoutColumnas}`}
            columns={layoutColumnas}
            gap={gapGrid}
            zoom={zoomLista}
            aprovecharEspacio={aprovecharEspacioOn}
            presenceMode={presenceMode}
          >
            {platosPendientes.map((item) => (
              <PlatoMonitorRow
                key={item.grupoId || item.key}
                item={item}
                configVisual={configVisual}
                tick={tick}
                modoTarjeta={esGrid}
              />
            ))}
          </MonitorTarjetasGrid>
        )}
        </div>
        {configVisual.mostrarTablaNotas !== false && (
          <NotasMonitorFranja
            lineas={notasPlatos}
            titulo={configVisual.tituloTablaNotas || 'Notas:'}
            configVisual={configVisual}
            colorTexto={colorTextoSecundario}
            fuenteFamilia={fuenteFamilia}
          />
        )}
        </div>

        {/* Panel derecho de guarniciones. */}
        {splitActivo && (
          <div style={{
            flex: '1 1 50%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: `${colorFondo}f5`,
          }}>
            {mostrarTitulosSplit && (
              <div style={estiloTituloSplit}>
                {configVisual.tituloListaGuarniciones || 'Lista de Guarniciones'}
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {guarnicionesPanel.length === 0 ? (
              <div style={{
                margin: 'auto', textAlign: 'center', color: colorTextoSecundario,
                fontSize: '14px', opacity: 0.7,
              }}>
                No hay guarniciones pendientes
              </div>
            ) : (
              <MonitorTarjetasGrid
                key={`guarn-cols-${layoutColumnasGuarniciones}`}
                columns={layoutColumnasGuarniciones}
                gap={gapGridGuarniciones}
                zoom={zoomLista}
                aprovecharEspacio={aprovecharEspacioOn}
                presenceMode={presenceMode}
                stackedStyle={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: gapGridGuarniciones,
                  padding: gapGridGuarniciones,
                  alignItems: 'stretch',
                  zoom: zoomLista,
                }}
              >
                {guarnicionesPanel.map((item) => (
                  <CocineroPlatoCard
                    key={item.grupoId || item.key}
                    item={item}
                    configVisual={configVisual}
                    mostrarCocinero={false}
                    modoTarjeta={esGridGuarniciones}
                    autoAcomodamiento={autoAcomodamientoOn}
                    tick={tick}
                  />
                ))}
              </MonitorTarjetasGrid>
            )}
            </div>
            {configVisual.mostrarTablaNotas !== false && (
              <NotasMonitorFranja
                lineas={notasGuarniciones}
                titulo={configVisual.tituloTablaNotas || 'Notas:'}
                configVisual={configVisual}
                colorTexto={colorTextoSecundario}
                fuenteFamilia={fuenteFamilia}
              />
            )}
          </div>
        )}
      </div>

      {/* Marca de modo fijo (esquina) */}
      {modoFijo && (
        <div
          style={{
            position: 'fixed',
            bottom: '8px',
            right: '12px',
            fontSize: '12px',
            color: colorTextoSecundario,
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        >
          Monitor Ver Cocina · Solo lectura
        </div>
      )}
    </div>
  );
};

/**
 * BloqueCocinero - Cabecera colapsable de cocinero + lista de tarjetas (modo bloques).
 */
const BloqueCocinero = React.forwardRef(({ bloque, configVisual, tick }, ref) => {
  const [expandido, setExpandido] = useState(true);
  const animOn = configVisual.animacionesTarjetas !== false;

  return (
    <motion.div
      ref={ref}
      layout={animOn}
      initial={animOn ? { opacity: 0, y: -6 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={animOn
        ? { opacity: 0, height: 0, transition: { duration: 0.22 } }
        : { opacity: 0, transition: { duration: 0 } }}
      transition={animOn
        ? { layout: { type: 'spring', stiffness: 360, damping: 34 }, duration: 0.22 }
        : { duration: 0 }}
      style={{ marginBottom: '8px' }}
    >
      {configVisual.mostrarCabeceraCocinero !== false && (
        <CocineroBlockHeader
          cocinero={bloque.cocinero}
          tarjetas={bloque.tarjetas}
          totalPlatos={bloque.totalPlatos}
          configVisual={configVisual}
          inicialExpandido={expandido}
          onToggle={() => setExpandido(v => !v)}
        />
      )}
      <AnimatePresence initial={false} mode={animOn ? 'popLayout' : undefined}>
        {expandido && (
          <motion.div
            initial={animOn ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={animOn ? { height: 0, opacity: 0 } : { opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: animOn ? 0.22 : 0 }}
            style={{ overflow: 'hidden' }}
          >
            <LayoutGroup>
              <AnimatePresence initial={false} mode={animOn ? 'popLayout' : undefined}>
                {bloque.tarjetas.map((item) => (
                  <CocineroPlatoCard
                    key={item.grupoId || item.key}
                    item={item}
                    configVisual={configVisual}
                    mostrarCocinero={false}
                    modoTarjeta={false}
                    tick={tick}
                  />
                ))}
              </AnimatePresence>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

BloqueCocinero.displayName = 'BloqueCocinero';

export default CocinaMonitorLayout;