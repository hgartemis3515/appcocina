import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment-timezone';
import PlatoMonitorRow from './PlatoMonitorRow';
import MonitorEmptyState from './MonitorEmptyState';
import MonitorConfigPanel from './MonitorConfigPanel';
import useCocinaMonitorTimer from '../../hooks/useCocinaMonitorTimer';

const STORAGE_DESIGN_KEY = 'cocinaMonitorDesign';

const DEFAULT_CONFIG = {
  fuenteFamilia: 'Inter, system-ui, sans-serif',
  tamanioFuentePlato: 36,
  tamanioFuenteDetalle: 20,
  tamanioFuenteCronometro: 28,
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
  mostrarCocineroTomado: true,
  mostrarComplementos: true,
  tiempoAmarillo: 5,
  tiempoRojo: 20,
  modoNocturno: true,
  mostrarNotificacionEntrada: true,
  textoNotificacionEntrada: 'Entra plato',
  duracionNotificacionEntrada: 8,
};

const ICONO_MAP = {
  'flame': '🔥', 'tools-kitchen': '🍳', 'chef-hat': '👨‍🍳',
  'pot': '🍲', 'grill': '🍖', 'meat': '🥩',
  'ice-cream': '🍦', 'cake': '🍰', 'default': '📍'
};

/**
 * CocinaMonitorLayout - Componente principal del monitor Ver Cocina
 *
 * v2.2:
 * - Agrupa platos por nombre (suma cantidades de diferentes comandas)
 * - Muestra nombre del cocinero que tomó el plato
 * - Cronómetro con alertas de color (amarillo/rojo) configurables
 * - Panel de configuración en barra superior (fuentes, tamaños, colores, umbrales)
 * - Barra de notificación "Entra plato ####" del último plato agregado
 *
 * Props:
 * - platosPendientes: array de grupos { nombre, cantidadTotal, platos, tiempoInicio, key }
 * - configVisual: apariencia + umbrales (puede ser override local)
 * - nombreVista, modoFijo, onVolver, onAbrirApariencia, vistasCocina, vistaActivaId, onCambiarVista
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
  const layoutColumnas = Math.min(4, Math.max(1, configVisual.layoutColumnas || 1));
  const esGrid = layoutColumnas > 1;
  const gapGrid = configVisual.espaciadoFilas === 'compacto' ? '8px' : configVisual.espaciadoFilas === 'amplio' ? '20px' : '12px';

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
              colorFondo={colorFondo}
              colorTextoPrincipal={colorTextoPrincipal}
              colorTextoSecundario={colorTextoSecundario}
              colorAcento={colorAcento}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
          <MonitorEmptyState nombreVista={nombreVista} />
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
            {esGrid ? (
              platosPendientes.map(item => (
                <PlatoMonitorRow
                  key={item.grupoId || item.key}
                  item={item}
                  configVisual={configVisual}
                  tick={tick}
                  modoTarjeta
                />
              ))
            ) : (
              <AnimatePresence initial={false}>
                {platosPendientes.map(item => (
                  <PlatoMonitorRow
                    key={item.grupoId || item.key}
                    item={item}
                    configVisual={configVisual}
                    tick={tick}
                    modoTarjeta={false}
                  />
                ))}
              </AnimatePresence>
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

export default CocinaMonitorLayout;