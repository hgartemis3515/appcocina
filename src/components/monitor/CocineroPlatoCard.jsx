import React from 'react';
import { motion } from 'framer-motion';
import { calcularSegundos, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';
import { escalaDetalle, MONITOR_TIPOGRAFIA, DURACION_ANIMACION, colorNombrePlatoMonitor, colorDetallePlatoMonitor, estiloDetalleGuarnicionPlato } from '../../config/monitorVisualConstants';
import TemporizadorChips from './TemporizadorChips';
import MesaChips from './MesaChips';
import GuarnicionListaLinea from './GuarnicionListaLinea';
import NotaEnCuadroMonitor from './NotaEnCuadroMonitor';
import { estiloCantidadBadge, radioForma, textoCantidadBadge } from '../../utils/monitorBadgeStyles';
import { tokenGuarnicion, nombresListaGuarniciones, textosGuarnicionesDeGrupo, platoConCantidadDeLinea } from '../../utils/guarnicionesKds';
import { pronombreReferenciaPrincipal, tokensEstiloPronombreGuarnicion } from '../../utils/notasMonitor';
import { grupoTieneParaLlevar, obtenerNombreDisplayCocina } from '../../utils/platoHelpers';
import BadgeParaLlevar from './BadgeParaLlevar';

/**
 * CocineroPlatoCard - Tarjeta por combinación cocinero + plato.
 *
 * Estética KDS premium (estilo referencia):
 *  - Fondo vino/negro, borde neón (rojo en crítico, acento en normal).
 *  - Esquinas redondeadas, contraste alto, lectura inmediata.
 *  - Izquierda: cocinero fucsia arriba, plato enorme blanco, badge ×N bloque,
 *    complementos, abajo placa URGENTE + mesas chips.
 *  - Derecha: columna vertical de temporizadores individuales (antiguo→nuevo arriba→abajo).
 *
 * El color de borde / glow refleja la alerta MÁXIMA entre los timers.
 *
 * Props:
 * - item: grupo del filtro con { nombre, cantidadTotal, platos, timers, cocinero, ... }
 * - configVisual: apariencia + umbrales + flags de personalización
 * - mostrarCocinero: si true renderiza línea de cocinero arriba (modo tarjetas)
 * - modoTarjeta: layout grid (true) vs lista (false)
 * - Numeración: solo en temporizadores (numeroGlobal), no en la tarjeta
 */
const colorAcentoPorCocinero = (alias) => {
  if (!alias) return '#ff4fa3';
  const paleta = ['#ff4fa3', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee', '#facc15'];
  let h = 0;
  for (let i = 0; i < alias.length; i++) h = (h * 31 + alias.charCodeAt(i)) >>> 0;
  return paleta[h % paleta.length];
};

// Iconos por animación de alerta (renderizados en un overlay absoluto dentro de la tarjeta).
// Cada entrada: [{ emoji, pos, anim, dur, size }]
const ICONOS_POR_ANIM = {
  sirenaAlerta: [{ emoji: '🚨', pos: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, anim: 'kdsIconSpin', dur: '2s', size: '42px' }],
  rayoUrgente: [
    { emoji: '⚡', pos: { top: '20%', left: 0 }, anim: 'kdsIconCross', dur: '1.4s', size: '34px' },
    { emoji: '⚡', pos: { top: '60%', left: 0 }, anim: 'kdsIconCross', dur: '1.8s', size: '28px' },
  ],
  explosionFuego: [
    { emoji: '🔥', pos: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, anim: 'kdsIconPulse', dur: '1.6s', size: '46px' },
    { emoji: '🔥', pos: { top: '20%', left: '20%' }, anim: 'kdsIconPulse', dur: '1.8s', size: '24px' },
    { emoji: '🔥', pos: { bottom: '18%', right: '18%' }, anim: 'kdsIconPulse', dur: '2s', size: '24px' },
  ],
  ondaChoque: [{ emoji: '⚠️', pos: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, anim: 'kdsIconPulse', dur: '1.2s', size: '40px' }],
  tormentaAlerta: [
    { emoji: '⚡', pos: { top: '10%', left: '10%' }, anim: 'kdsIconFlash', dur: '0.7s', size: '30px' },
    { emoji: '⚠️', pos: { bottom: '12%', right: '12%' }, anim: 'kdsIconFlash', dur: '1.1s', size: '26px' },
  ],
  pulsoRadioactivo: [{ emoji: '☢️', pos: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, anim: 'kdsIconSpin', dur: '4s', size: '40px' }],
  alarmaGiratoria: [{ emoji: '⚠️', pos: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, anim: 'kdsIconSpin', dur: '6s', size: '90px' }],
  fuegoCruzado: [
    { emoji: '🔥', pos: { top: '20%', left: '10%' }, anim: 'kdsIconPulse', dur: '1.4s', size: '26px' },
    { emoji: '⚠️', pos: { bottom: '20%', right: '10%' }, anim: 'kdsIconPulse', dur: '1.6s', size: '26px' },
  ],
  semaforoUrgente: [{ emoji: '🚦', pos: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, anim: 'kdsIconFlash', dur: '1s', size: '38px' }],
  barreraPeligro: [{ emoji: '⚠️', pos: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, anim: 'kdsIconFlash', dur: '1s', size: '34px' }],
  meteoritoAlerta: [
    { emoji: '💥', pos: { top: '-20px', left: '10%' }, anim: 'kdsIconFall', dur: '1.8s', size: '28px' },
    { emoji: '⚠️', pos: { top: '-20px', left: '50%' }, anim: 'kdsIconFall', dur: '2.4s', size: '24px' },
    { emoji: '💥', pos: { top: '-20px', left: '75%' }, anim: 'kdsIconFall', dur: '2.1s', size: '26px' },
  ],
  nucleoSobrecarga: [
    { emoji: '☢️', pos: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, anim: 'kdsIconPulse', dur: '1.2s', size: '50px' },
    { emoji: '⚠️', pos: { top: '15%', right: '15%' }, anim: 'kdsIconFlash', dur: '0.9s', size: '22px' },
    { emoji: '⚠️', pos: { bottom: '15%', left: '15%' }, anim: 'kdsIconFlash', dur: '1.1s', size: '22px' },
  ],
};

/**
 * Genera posiciones repartidas para `count` iconos dentro del overlay.
 */
const posicionesPara = (count) => {
  if (count <= 1) return [{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }];
  if (count === 2) return [
    { top: '30%', left: '25%', transform: 'translate(-50%,-50%)' },
    { top: '70%', left: '75%', transform: 'translate(-50%,-50%)' },
  ];
  if (count === 3) return [
    { top: '25%', left: '50%', transform: 'translate(-50%,-50%)' },
    { top: '68%', left: '25%', transform: 'translate(-50%,-50%)' },
    { top: '68%', left: '75%', transform: 'translate(-50%,-50%)' },
  ];
  if (count === 4) return [
    { top: '22%', left: '22%', transform: 'translate(-50%,-50%)' },
    { top: '22%', left: '78%', transform: 'translate(-50%,-50%)' },
    { top: '78%', left: '22%', transform: 'translate(-50%,-50%)' },
    { top: '78%', left: '78%', transform: 'translate(-50%,-50%)' },
  ];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const pos = [];
  const stepR = rows > 1 ? 70 / (rows - 1) : 0;
  const stepC = cols > 1 ? 70 / (cols - 1) : 0;
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    pos.push({
      top: `${15 + r * stepR}%`,
      left: `${15 + c * stepC}%`,
      transform: 'translate(-50%,-50%)',
    });
  }
  return pos;
};

/**
 * AlertaOverlay - Capa absoluta dentro de la tarjeta que pinta el fondo animado
 * (gradiente/ondas) y los iconos móviles para las animaciones de alerta complejas.
 *
 * Props extra para personalizar emojis:
 * - emojisCustom: string con emojis (ej. "🔥⚠️💥"). Si se omite, usa los defaults de la animación.
 * - sizeCustom: tamaño en px de los emojis (null = auto).
 * - countCustom: cantidad de emojis a renderizar (null = auto).
 */
const AlertaOverlay = ({ nombre, color, emojisCustom = null, sizeCustom = null, countCustom = null }) => {
  if (!nombre) return null;
  const defaults = ICONOS_POR_ANIM[nombre];

  let iconos;
  if (emojisCustom && emojisCustom.trim()) {
    const lista = Array.from(emojisCustom.trim());
    const count = Math.max(1, Math.min(12, countCustom || lista.length));
    const size = sizeCustom || 40;
    const posiciones = posicionesPara(count);
    iconos = posiciones.map((pos, i) => ({
      emoji: lista[i % lista.length],
      pos,
      anim: 'kdsIconPulse',
      dur: '1.4s',
      size: `${size}px`,
    }));
  } else {
    iconos = defaults || [];
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        '--kds-alerta-color': color,
        animation: `${nombre} ${DURACION_ANIMACION(nombre)} ease-in-out infinite`,
      }}
    >
      {iconos.map((ic, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            fontSize: ic.size,
            ...ic.pos,
            animation: `${ic.anim} ${ic.dur} ease-in-out infinite`,
            opacity: 0.85,
            filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.5))',
          }}
        >
          {ic.emoji}
        </span>
      ))}
    </div>
  );
};

const CocineroPlatoCard = React.forwardRef(({
  item,
  configVisual = {},
  mostrarCocinero = false,
  modoTarjeta = false,
  autoAcomodamiento = false,
  tick = 0,
}, ref) => {
  const { nombre, cantidadTotal, platos = [], timers = [], cocinero } = item;
  const esGuarnicion = item.esGuarnicion === true;
  const nombreVisible = esGuarnicion
    ? nombre
    : (obtenerNombreDisplayCocina(platos[0] || item, { forzar: true }) || nombre);
  const textoPronombreRef = esGuarnicion
    ? (item.pronombrePrincipal !== undefined
      ? (item.pronombrePrincipal || '')
      : pronombreReferenciaPrincipal(
          item.cocineroPrincipal || platos[0]?.cocineroPrincipal || platos[0]?.plato?.procesandoPor,
          { mostrar: configVisual.mostrarPronombreCocineroGuarnicion !== false },
        ))
    : '';
  const pickG = (key, fallback) => (esGuarnicion ? tokenGuarnicion(configVisual, key, fallback) : fallback);

  // Config
  const amarilloMin = configVisual.tiempoAmarillo ?? 5;
  const rojoMin = configVisual.tiempoRojo ?? 20;
  const colorAcento = pickG('colorAcentoGuarnicion', configVisual.colorAcento || '#d4af37');
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla || '#fbbf24';
  const colorAlertaRoja = configVisual.colorAlertaRoja || '#ff2a4d';
  const tamanioFuentePlato = pickG('tamanioFuenteGuarnicion', configVisual.tamanioFuentePlato || 38);
  const tamanioFuenteDetalle = configVisual.tamanioFuenteDetalle || 18;
  const tamanioFuenteCocinero = configVisual.tamanioFuenteCocinero || 24;
  const tamanioFuenteCronometro = configVisual.tamanioFuenteCronometro || 28;
  const pesoFuentePlato = pickG('pesoFuenteGuarnicion', configVisual.pesoFuentePlato || MONITOR_TIPOGRAFIA.PESO_DEFAULT);
  const colorTextoPrincipal = pickG('colorTextoGuarnicion', configVisual.colorTextoPrincipal || '#ffffff');
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#b8a8c8';
  const colorNombrePlato = esGuarnicion ? colorTextoPrincipal : colorNombrePlatoMonitor(configVisual);
  const colorDetallePlato = colorDetallePlatoMonitor(configVisual);
  const colorTextoPadre = (esGuarnicion && configVisual.colorTextoPadreGuarnicion)
    ? configVisual.colorTextoPadreGuarnicion
    : colorTextoSecundario;
  const tamanioFuentePadre = (esGuarnicion && configVisual.tamanioFuentePadreGuarnicion != null && configVisual.tamanioFuentePadreGuarnicion !== '')
    ? Number(configVisual.tamanioFuentePadreGuarnicion)
    : null;
  const espaciado = pickG('espaciadoFilasGuarnicion', configVisual.espaciadoFilas || 'normal');
  const fuenteFamilia = pickG('fuenteFamiliaGuarnicion', configVisual.fuenteFamilia || 'Inter, system-ui, sans-serif');
  const usarColorCocinero = configVisual.colorPorCocinero !== false;
  const mostrarIconoCocinero = configVisual.mostrarIconoCocinero !== false;
  const mostrarEtiquetaPlato = configVisual.mostrarEtiquetaPlato === true;
  const estiloTemporizador = configVisual.estiloTemporizador || 'vertical';
  const disposicionVertical = modoTarjeta && (configVisual.disposicionTarjeta || 'vertical') === 'vertical';
  // Nuevas herramientas
  const quitarNombreCocinero = configVisual.quitarNombreCocineroTarjeta === true;
  const ocultarAtencionUrgente = configVisual.ocultarAtencionUrgente === true;
  const animacionesAlerta = configVisual.animacionesAlerta !== false;

  // Alerta máxima de los timers (define color de la tarjeta)
  let alertaMaxima = 'normal';
  for (const t of timers) {
    const s = calcularSegundos(t.tiempoInicio);
    const a = nivelAlerta(s, amarilloMin, rojoMin);
    if (a === 'rojo') { alertaMaxima = 'rojo'; break; }
    if (a === 'amarillo') alertaMaxima = 'amarillo';
  }

  const esCritico = alertaMaxima === 'rojo';
  const esAlerta = alertaMaxima === 'amarillo';
  const colorCocinero = usarColorCocinero ? colorAcentoPorCocinero(cocinero?.alias) : colorAcento;

  const hayNotaCuadro = item.hayNotaCuadro === true || String(item.notasCuadro || '').trim() !== '';
  const textoNotaCuadro = configVisual.notasJuntoAGuarniciones !== false
    ? String(item.notasCuadro || '').trim()
    : '';
  const forzarCuadroPorNota = esGuarnicion
    && configVisual.ocultarCuadroGuarniciones === true
    && configVisual.cuadroGuarnicionSiHayNota !== false
    && hayNotaCuadro;

  if (esGuarnicion && configVisual.ocultarCuadroGuarniciones === true) {
    const textoNombres = nombresListaGuarniciones(
      item.comps,
      platoConCantidadDeLinea(platos[0]),
      platos[0]?.comanda,
      platos[0]?.platoIndex,
    ) || `- ${nombre}`;
    return (
      <GuarnicionListaLinea
        texto={textoNombres}
        textoPadre={item.subtitulo || ''}
        textoCocinero={textoPronombreRef}
        textoNota={textoNotaCuadro}
        configVisual={configVisual}
        fuenteFamilia={fuenteFamilia}
        tamanioFuente={tamanioFuentePlato}
        pesoFuente={pesoFuentePlato}
        colorTexto={colorTextoPrincipal}
        colorPadre={colorTextoPadre}
        tamanioPadre={tamanioFuentePadre}
        espaciado={espaciado}
        cronometroIso={timers[0]?.tiempoInicio || item.tiempoInicio || null}
        ocultarCronometro={configVisual.ocultarCronometroGuarniciones === true}
        colorCronometro={colorTextoPrincipal}
        tamanioCronometro={tamanioFuenteCronometro}
        conCuadro={forzarCuadroPorNota}
        colorCuadro={colorAcento}
      />
    );
  }

  // Colores estilo referencia
  const FONDO_VINO = pickG('colorFondoGuarnicion', configVisual.colorFondoTarjeta || configVisual.colorFilaPlato || '#1a0f1f');
  const FONDO_VINO_HOVER = '#241029';
  const colorBorde = esCritico
    ? colorAlertaRoja
    : esAlerta
      ? colorAlertaAmarilla
      : `${colorAcento}77`;
  const glowBorde = esCritico
    ? `0 0 18px ${colorAlertaRoja}88, inset 0 0 12px ${colorAlertaRoja}33`
    : esAlerta
      ? `0 0 8px ${colorAlertaAmarilla}33`
      : 'none';

  // Complementos / observaciones
  // PLAN GUARNICIONES_SEPARADAS §10: en tarjeta de guarnición el subtítulo es
  // "de {nombreCocinaPadre}" (no se re-listan los complementos del plato).
  let complementosTexto = '';
  if (esGuarnicion) {
    complementosTexto = item.subtitulo || '';
  } else {
    const complementosSet = new Set();
    for (const texto of textosGuarnicionesDeGrupo(platos)) {
      complementosSet.add(texto);
    }
    if (configVisual.notasJuntoAGuarniciones === false) {
      for (const p of platos) {
        const platoRef = p?.plato;
        const obs = platoRef?.observaciones || platoRef?.nota || platoRef?.notaEspecial;
        if (obs) complementosSet.add(obs);
      }
    }
    complementosTexto = Array.from(complementosSet).join(' · ');
  }
  const fsPadreBase = tamanioFuentePadre || tamanioFuenteDetalle;
  const estiloPron = tokensEstiloPronombreGuarnicion(configVisual, {
    color: colorTextoPadre,
    fontSize: fsPadreBase,
    fontFamily: fuenteFamilia,
  });
  const mostrarComplementos = configVisual.mostrarComplementos !== false;
  const hayParaLlevar = !esGuarnicion && grupoTieneParaLlevar(platos);

  const fsUrgente = escalaDetalle(tamanioFuenteDetalle, 0.85);
  const fsAtencion = escalaDetalle(tamanioFuenteDetalle, 0.75);
  const fsEtiquetaMesa = escalaDetalle(tamanioFuenteDetalle, 0.65);
  const fsIniciales = escalaDetalle(tamanioFuenteDetalle, 0.65);
  const esUnido = espaciado === 'unido';
  const paddingY = esUnido ? '14px' : espaciado === 'compacto' ? '12px' : espaciado === 'amplio' ? '22px' : '16px';
  const paddingX = esUnido ? '14px' : espaciado === 'compacto' ? '14px' : '18px';

  // Animación de alerta (color) sobre el wrapper interno de la tarjeta.
  // Se aplica al inner div (no al motion.div) para no chocar con los transforms
  // de framer-motion (layout/exit/enter).
  const animacionAtencionCfg = configVisual.animacionAtencion || 'resplandorUrgente';
  const animacionUrgenteCfg = configVisual.animacionUrgente || 'urgentePulse';
  const animacionAlertaNombre = animacionesAlerta
    ? (esCritico ? animacionUrgenteCfg : esAlerta ? animacionAtencionCfg : null)
    : null;
  const duracionAnim = DURACION_ANIMACION(animacionAlertaNombre);
  const animacionAlerta = animacionAlertaNombre
    ? `${animacionAlertaNombre} ${duracionAnim} ease-in-out infinite`
    : 'none';
  // Color de la animación: color personalizado si está definido, si no el de alerta
  const colorAnimacionAtencion = configVisual.colorAnimacionAtencion || colorAlertaAmarilla;
  const colorAnimacionUrgente = configVisual.colorAnimacionUrgente || colorAlertaRoja;
  const colorAlertaParaVar = esCritico
    ? colorAnimacionUrgente
    : esAlerta
      ? colorAnimacionAtencion
      : colorAcento;

  // === AutoAcomodamiento (por tarjeta) ===
  // Cada tarjeta escala su fuente/padding según el largo del texto, así las
  // tarjetas con más letras se agrandan y las con menos se reducen — pero
  // respetando el grid de N columnas y llenando el 100% del espacio.
  const longitudContenido = (nombre?.length || 0);
  const factorContenido = (() => {
    if (!autoAcomodamiento) return 1;
    if (longitudContenido <= 8) return 0.82;
    if (longitudContenido <= 16) return 0.92;
    if (longitudContenido <= 26) return 1.05;
    if (longitudContenido <= 40) return 1.16;
    return 1.28;
  })();
  const fsPlatoAcomodado = Math.round(tamanioFuentePlato * factorContenido);
  const fsDetalleAcomodado = Math.round(tamanioFuenteDetalle * factorContenido);
  const padYAcomodado = autoAcomodamiento
    ? `${Math.round(parseFloat(paddingY) * factorContenido)}px`
    : paddingY;
  const padXAcomodado = autoAcomodamiento
    ? `${Math.round(parseFloat(paddingX) * factorContenido)}px`
    : paddingX;
  const padOverride = configVisual.tarjetaPadding;
  const paddingTarjeta = (padOverride != null && padOverride !== '')
    ? `${Math.max(0, Number(padOverride) || 0)}px`
    : `${padYAcomodado} ${padXAcomodado}`;
  const radioTarjeta = radioForma('redondeado', {
    esUnido,
    radioPx: configVisual.tarjetaRadio != null && configVisual.tarjetaRadio !== ''
      ? configVisual.tarjetaRadio
      : (esUnido ? 0 : 14),
    defaultPx: 14,
  });
  const gapTarjeta = configVisual.tarjetaGap != null && configVisual.tarjetaGap !== ''
    ? Math.max(0, Number(configVisual.tarjetaGap) || 16)
    : 16;

  // Fondo de la tarjeta: degradado configurable o color fijo
  const usarDegradado = configVisual.degradadoTarjeta !== false;
  const colorDegradadoAuto = esCritico
    ? `${colorAlertaRoja}1f`
    : esAlerta
      ? `${colorAlertaAmarilla}1f`
      : `${colorAcento}1f`;
  const colorDegradado = configVisual.colorDegradadoTarjeta || colorDegradadoAuto;
  const fondoTarjeta = usarDegradado
    ? `linear-gradient(135deg, ${FONDO_VINO}, ${colorDegradado})`
    : FONDO_VINO;

  // Outer: solo layout (framer-motion controla transforms aquí).
  // Guarnición / compacto / aprovecharEspacio: altura al contenido
  // (sin minHeight 130 ni spacer vacío que estira la tarjeta).
  const compacto = esUnido || espaciado === 'compacto' || esGuarnicion;
  const aprovecharEspacio = configVisual.aprovecharEspacio === true;
  const hayDetallesGuarnicion = !esGuarnicion && mostrarComplementos && !!complementosTexto;
  const alturaAlContenido = compacto || aprovecharEspacio || hayDetallesGuarnicion;
  const hayPie = (!ocultarAtencionUrgente && (esCritico || esAlerta))
    || (configVisual.mostrarMesas !== false && !esGuarnicion);
  const outerStyle = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    maxWidth: '100%',
    minHeight: (modoTarjeta && !alturaAlContenido) ? '130px' : 'auto',
    height: alturaAlContenido ? 'auto' : undefined,
    alignSelf: aprovecharEspacio ? 'start' : 'stretch',
    position: 'relative',
    width: '100%',
    flexShrink: 1,
    zIndex: 0,
  };

  // Inner: visual + animación de alerta (incluye transform sin chocar con framer).
  const innerStyle = {
    background: fondoTarjeta,
    color: colorTextoPrincipal,
    border: esUnido ? `1px solid ${colorBorde}` : `2px solid ${colorBorde}`,
    borderRadius: radioTarjeta,
    padding: paddingTarjeta,
    fontFamily: fuenteFamilia,
    display: 'flex',
    flexDirection: disposicionVertical ? 'column' : 'row',
    alignItems: disposicionVertical ? 'stretch' : (compacto ? 'center' : 'stretch'),
    gap: `${gapTarjeta}px`,
    minWidth: 0,
    flex: alturaAlContenido ? '0 0 auto' : 1,
    boxShadow: esUnido ? 'none' : glowBorde,
    position: 'relative',
    overflow: hayDetallesGuarnicion ? 'visible' : 'hidden',
    '--kds-alerta-color': colorAlertaParaVar,
    '--kds-fondo-base': FONDO_VINO,
    animation: animacionAlerta,
  };

  // Lado izquierdo: bloque textual (~65%)
  const ladoIzquierdo = (
    <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', gap: compacto ? '3px' : '6px', minWidth: 0, justifyContent: compacto ? 'center' : 'flex-start' }}>
      {/* Cocinero arriba (fucsia, solo si mostrarCocinero y NO se quitó el nombre) */}
      {mostrarCocinero && cocinero && !quitarNombreCocinero && !esGuarnicion && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {mostrarIconoCocinero && (
            cocinero.fotoUrl ? (
              <img
                src={cocinero.fotoUrl}
                alt={cocinero.alias || cocinero.nombre || 'Cocinero'}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `2px solid ${colorCocinero}`,
                  boxShadow: `0 0 6px ${colorCocinero}55`,
                  flexShrink: 0,
                }}
              />
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: `${colorCocinero}22`,
                  border: `2px solid ${colorCocinero}`,
                  color: colorCocinero,
                  fontSize: `${fsIniciales}px`,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {(cocinero.alias || cocinero.nombre || '?').slice(0, 2).toUpperCase()}
              </span>
            )
          )}
          <span
            style={{
              fontSize: `${tamanioFuenteCocinero}px`,
              fontWeight: 800,
              color: colorCocinero,
              lineHeight: 1.1,
              textShadow: `0 0 8px ${colorCocinero}55`,
            }}
          >
            {cocinero.alias || cocinero.nombre || 'Cocinero'}
          </span>
        </div>
      )}

      {/* Plato + cantidad (numeración solo en temporizadores) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {mostrarEtiquetaPlato && (
          <span style={{ fontSize: `${tamanioFuenteDetalle}px`, color: colorTextoSecundario, fontWeight: 600, textTransform: 'uppercase' }}>
            Plato:
          </span>
        )}
        <div
          style={{
            fontSize: `${fsPlatoAcomodado}px`,
            fontWeight: pesoFuentePlato,
            lineHeight: 1.05,
            color: colorNombrePlato,
            textShadow: '0 2px 8px rgba(0,0,0,0.45)',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            whiteSpace: 'normal',
          }}
        >
          {nombreVisible}
        </div>
        {hayParaLlevar && (
          <BadgeParaLlevar fontSize={Math.max(11, Math.round(escalaDetalle(tamanioFuenteDetalle, 0.7)))} />
        )}
        {/* Badge cantidad - personalizable (default blanco) */}
        <span style={estiloCantidadBadge(configVisual)}>
          {textoCantidadBadge(cantidadTotal, configVisual)}
        </span>
      </div>

      {/* Complementos / sabores / referencia (Bistec) C1 */}
      {esGuarnicion && (item.subtitulo || textoPronombreRef) ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            gap: '6px',
            minWidth: 0,
          }}
        >
          {item.subtitulo ? (
            <span
              style={{
                fontSize: `${tamanioFuentePadre || fsDetalleAcomodado}px`,
                color: colorTextoPadre,
                fontWeight: 500,
                minWidth: 0,
              }}
            >
              {item.subtitulo}
            </span>
          ) : null}
          {textoPronombreRef ? (
            <span
              style={{
                fontSize: `${estiloPron.fontSize}px`,
                fontWeight: 700,
                color: estiloPron.color,
                fontFamily: estiloPron.fontFamily,
                flexShrink: 0,
              }}
            >
              {textoPronombreRef}
            </span>
          ) : null}
        </div>
      ) : null}
      {!esGuarnicion && mostrarComplementos && complementosTexto ? (
        <div style={estiloDetalleGuarnicionPlato(fsDetalleAcomodado, colorDetallePlato)}>
          {complementosTexto}
        </div>
      ) : null}

      <NotaEnCuadroMonitor
        texto={textoNotaCuadro}
        configVisual={configVisual}
        colorFallback={colorTextoSecundario}
      />

      {/* Espaciador solo si hay pie (mesas / urgente). En guarnición, compacto
          y aprovecharEspacio no se estira: evita el hueco vacío bajo el nombre. */}
      {hayPie && !compacto && !aprovecharEspacio && (
        <div style={{ flex: 1, minHeight: '4px' }} />
      )}

      {hayPie && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {esCritico && !ocultarAtencionUrgente && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 14px',
              borderRadius: '8px',
              fontSize: `${fsUrgente}px`,
              fontWeight: 900,
              color: '#fff',
              background: colorAlertaRoja,
              border: `1px solid #fff3`,
              boxShadow: `0 0 14px ${colorAlertaRoja}cc, inset 0 0 8px #fff3`,
              textShadow: '0 0 6px #fff',
              animation: 'kdspulse 1.5s ease-in-out infinite',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            ! URGENTE
          </span>
        )}
        {esAlerta && !esCritico && !ocultarAtencionUrgente && (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: `${fsAtencion}px`,
              fontWeight: 800,
              color: '#1a0f1f',
              background: colorAlertaAmarilla,
              border: `1px solid ${colorAlertaAmarilla}88`,
            }}
          >
            ⏳ ATENCIÓN
          </span>
        )}
        {configVisual.mostrarMesas !== false && !esGuarnicion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: `${fsEtiquetaMesa}px`, color: colorTextoSecundario, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {timers.length > 1 ? 'Mesas:' : 'Mesa:'}
            </span>
            <MesaChips timers={timers} configVisual={{ ...configVisual, colorTextoSecundario, colorAcento }} />
          </div>
        )}
        </div>
      )}
    </div>
  );

  const ocultarCronometroG = (esGuarnicion && configVisual.ocultarCronometroGuarniciones === true)
    || item.soloContadorEnCocina === true;
  const ladoDerecho = ocultarCronometroG ? null : (
    <div
      style={{
        flex: '0 0 auto',
        minWidth: 0,
        maxWidth: disposicionVertical ? 'none' : (estiloTemporizador === 'vertical' ? '160px' : 'none'),
        width: disposicionVertical ? '100%' : undefined,
        display: 'flex',
        alignItems: compacto ? 'center' : 'flex-start',
        justifyContent: disposicionVertical ? 'flex-start' : 'flex-end',
      }}
    >
      <TemporizadorChips
        timers={timers}
        configVisual={configVisual}
        tick={tick}
        ocultarNumeroSecuencial={esGuarnicion && configVisual.deshabilitarOrdenSecuencialGuarniciones !== false}
      />
    </div>
  );

  const mostrarOverlay = animacionAlertaNombre && (esCritico || esAlerta);
  const contenido = (
    <>
      {mostrarOverlay && (
        <AlertaOverlay
          nombre={animacionAlertaNombre}
          color={colorAlertaParaVar}
          emojisCustom={esCritico ? configVisual.emojisAnimacionUrgente : configVisual.emojisAnimacionAtencion}
          sizeCustom={esCritico ? configVisual.tamanioEmojiUrgente : configVisual.tamanioEmojiAtencion}
          countCustom={esCritico ? configVisual.cantidadEmojiUrgente : configVisual.cantidadEmojiAtencion}
        />
      )}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: disposicionVertical ? 'column' : 'row',
          alignItems: disposicionVertical ? 'stretch' : (compacto ? 'center' : 'stretch'),
          gap: `${gapTarjeta}px`,
          flex: 1,
          minWidth: 0,
        }}
      >
        {ladoIzquierdo}
        {ladoDerecho}
      </div>
    </>
  );

  const animOn = configVisual.animacionesTarjetas !== false;
  const cardKey = item.grupoId || item.key;

  if (!animOn) {
    return (
      <div style={outerStyle}>
        <div style={innerStyle}>{contenido}</div>
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      layout
      key={cardKey}
      initial={{ opacity: 0, y: -14, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.88,
        x: 48,
        filter: 'blur(3px)',
        transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
      }}
      transition={{
        layout: { type: 'spring', stiffness: 360, damping: 34, mass: 0.85 },
        opacity: { duration: 0.22 },
        scale: { duration: 0.24 },
        y: { type: 'spring', stiffness: 400, damping: 30 },
      }}
      style={{ ...outerStyle, willChange: 'transform, opacity' }}
    >
      <div style={innerStyle}>{contenido}</div>
    </motion.div>
  );
});

CocineroPlatoCard.displayName = 'CocineroPlatoCard';

export default CocineroPlatoCard;