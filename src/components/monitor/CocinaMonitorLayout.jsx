import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import moment from 'moment-timezone';
import axios from 'axios';
import { getServerBaseUrl } from '../../config/apiConfig';
import { clampColumnas } from '../../config/monitorVisualConstants';
import PlatoMonitorRow from './PlatoMonitorRow';
import CocineroPlatoCard from './CocineroPlatoCard';
import CocineroBlockHeader from './CocineroBlockHeader';
import CocineroSelectorDropdown from './CocineroSelectorDropdown';
import MonitorEmptyState from './MonitorEmptyState';
import MonitorConfigPanel from './MonitorConfigPanel';
import SearchBar from '../additionals/SearchBar';
import useCocinaMonitorTimer from '../../hooks/useCocinaMonitorTimer';
import { calcularSegundos, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';
import { asignarNumeroGlobal } from '../../utils/numeracionTimersMonitor';
import { BADGE_DEFAULTS } from '../../utils/monitorBadgeStyles';

const STORAGE_DESIGN_KEY = 'cocinaMonitorDesign';

const DEFAULT_CONFIG = {
  fuenteFamilia: 'Inter, system-ui, sans-serif',
  tamanioFuentePlato: 36,
  tamanioFuenteDetalle: 20,
  tamanioFuenteCronometro: 28,
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
}) => {
  const tick = useCocinaMonitorTimer();
  const [reloj, setReloj] = useState(moment().tz('America/Lima').format('HH:mm:ss'));

  // Estado de configuración local (editable en barra superior).
  // Merge: defaults < config de la vista < config local guardada en localStorage.
  const [localDesign, setLocalDesign] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DESIGN_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  // Perfil de personalización Ver Cocina (flujo Distribuir Cocina en monitores)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilMensaje, setPerfilMensaje] = useState(null);
  const [perfilAutoAplicado, setPerfilAutoAplicado] = useState(false);
  const [ultimoPlato, setUltimoPlato] = useState(null); // { nombre, cantidadTotal, ts, delta }
  const previousStateRef = useRef(new Map()); // key -> cantidadTotal
  const skipNotifInicialRef = useRef(true);
  const notifTimeoutRef = useRef(null);

  // Config visual final combinada
  const configVisual = { ...DEFAULT_CONFIG, ...configVistaProp, ...localDesign };

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
    setLocalDesign(nuevaConfig);
    try {
      localStorage.setItem(STORAGE_DESIGN_KEY, JSON.stringify(nuevaConfig));
    } catch (err) {
      console.warn('[CocinaMonitorLayout] Error guardando config local:', err.message);
    }
  }, []);

  // Guardar el localDesign actual como perfil del cocinero activo en backend.
  // Flujo "Distribuir Cocina en monitores" → botón "Guardar Perfil".
  const guardarPerfilCocinero = useCallback(async () => {
    if (!cocineroActivoId) {
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
        `${baseUrl}/api/cocineros/${cocineroActivoId}/perfil-ver-cocina`,
        { config: localDesign || {} },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPerfilMensaje({ tipo: 'ok', texto: 'Perfil guardado ✓' });
      setTimeout(() => setPerfilMensaje(null), 3000);
    } catch (err) {
      console.error('[CocinaMonitorLayout] Error guardando perfil:', err);
      setPerfilMensaje({ tipo: 'error', texto: err?.response?.data?.error || 'Error al guardar perfil' });
    } finally {
      setGuardandoPerfil(false);
    }
  }, [cocineroActivoId, getToken, localDesign]);

  // Cargar perfil del cocinero desde backend cuando la URL trae ?perfil=auto
  // (ventanas hijas del flujo Distribuir Cocina en monitores).
  useEffect(() => {
    if (perfilAutoAplicado) return;
    if (!modoFijo) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const perfil = params.get('perfil');
      if (perfil !== 'auto') return;
      if (!cocineroActivoId) return;
    } catch { return; }
    if (!getToken) return;
    setPerfilAutoAplicado(true);
    (async () => {
      try {
        const baseUrl = getServerBaseUrl();
        const token = getToken();
        const res = await axios.get(
          `${baseUrl}/api/cocineros/${cocineroActivoId}/perfil-ver-cocina`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const perfil = res.data?.data;
        if (perfil && typeof perfil === 'object' && Object.keys(perfil).length > 0) {
          // El perfil del backend tiene prioridad sobre el localStorage en modo fijo.
          setLocalDesign(perfil);
        }
      } catch (err) {
        console.warn('[CocinaMonitorLayout] No se pudo cargar perfil del cocinero:', err.message);
      }
    })();
  }, [modoFijo, cocineroActivoId, getToken, perfilAutoAplicado]);

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
  const gapGrid =
    configVisual.espaciadoFilas === 'unido' ? '0px' :
    configVisual.espaciadoFilas === 'compacto' ? '8px' :
    configVisual.espaciadoFilas === 'amplio' ? '20px' : '12px';

  // Detección automática del modo "por cocinero": si los items tienen `cocinero` y `timers`
  const modoCocineros = modoCocinerosProp != null
    ? modoCocinerosProp
    : Array.isArray(platosPendientes) && platosPendientes.some(p => p && p.cocinero && Array.isArray(p.timers));

  // Modo de agrupación visual efectivo:
  // - tarjetas independientes si multi-columna O config.modoAgrupacion === 'tarjetas'
  // - bloques por cocinero en columna única (default)
  const modoBloques = modoCocineros
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

  const animOn = configVisual.animacionesTarjetas !== false;
  const presenceMode = animOn ? 'popLayout' : undefined;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
                setLocalDesign({});
              }}
              onSaveProfile={guardarPerfilCocinero}
              guardandoPerfil={guardandoPerfil}
              perfilMensaje={perfilMensaje}
              colorFondo={colorFondo}
              colorTextoPrincipal={colorTextoPrincipal}
              colorTextoSecundario={colorTextoSecundario}
              colorAcento={colorAcento}
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
          {onSearchChange && (
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

      {/* Controles superiores (no en modo fijo) */}
      {!modoFijo && (
        <div style={{ padding: '8px 24px', display: 'flex', gap: '10px', flexShrink: 0 }}>
          {onVolver && (
            <button
              onClick={onVolver}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '14px',
                background: 'transparent', color: colorTextoSecundario,
                border: `1px solid ${colorAcento}33`, cursor: 'pointer',
              }}
            >
              ◀ Menú
            </button>
          )}
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
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {totalPendientes === 0 ? (
          <MonitorEmptyState
            nombreVista={nombreVista}
            nombreCocinero={nombreCocineroActivo}
            terminoBusqueda={hayFiltroBusqueda ? searchTerm : null}
          />
        ) : modoBloques ? (
          <div style={{ padding: '0 0 16px 0' }}>
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
          <div
            key={`monitor-cols-${layoutColumnas}`}
            style={esGrid ? {
              display: 'grid',
              gridTemplateColumns: `repeat(${layoutColumnas}, minmax(0, 1fr))`,
              gap: gapGrid,
              padding: gapGrid,
              alignContent: 'start',
            } : undefined}
          >
            <LayoutGroup>
              <AnimatePresence initial={false} mode={presenceMode}>
                {platosConTimersNumerados.map((item) => (
                  <CocineroPlatoCard
                    key={item.grupoId || item.key}
                    item={item}
                    configVisual={configVisual}
                    mostrarCocinero
                    modoTarjeta={esGrid}
                    tick={tick}
                  />
                ))}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        ) : (
          <div
            key={`monitor-cols-${layoutColumnas}`}
            style={esGrid ? {
              display: 'grid',
              gridTemplateColumns: `repeat(${layoutColumnas}, minmax(0, 1fr))`,
              gap: gapGrid,
              padding: gapGrid,
              alignContent: 'start',
            } : undefined}
          >
            <LayoutGroup>
              <AnimatePresence initial={false} mode={presenceMode}>
                {platosPendientes.map((item) => (
                  <PlatoMonitorRow
                    key={item.grupoId || item.key}
                    item={item}
                    configVisual={configVisual}
                    tick={tick}
                    modoTarjeta={esGrid}
                  />
                ))}
              </AnimatePresence>
            </LayoutGroup>
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
const BloqueCocinero = ({ bloque, configVisual, tick }) => {
  const [expandido, setExpandido] = useState(true);
  const animOn = configVisual.animacionesTarjetas !== false;

  return (
    <motion.div
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
};

export default CocinaMonitorLayout;