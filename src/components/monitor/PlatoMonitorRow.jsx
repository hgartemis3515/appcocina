import React from 'react';
import { motion } from 'framer-motion';
import { calcularSegundos, formatearCronometro, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';
import { estiloCantidadBadge, radioForma, textoCantidadBadge } from '../../utils/monitorBadgeStyles';
import { colorNombrePlatoMonitor, colorDetallePlatoMonitor, estiloDetalleGuarnicionPlato } from '../../config/monitorVisualConstants';
import { textosGuarnicionesDeGrupo } from '../../utils/guarnicionesKds';
import NotaEnCuadroMonitor from './NotaEnCuadroMonitor';
import { grupoTieneParaLlevar, obtenerNombreDisplayCocina } from '../../utils/platoHelpers';
import BadgeParaLlevar from './BadgeParaLlevar';

/**
 * PlatoMonitorRow - Fila AGRUPADA de un plato en el monitor Ver Cocina
 *
 * v2.2: Recibe un GRUPO que suma cantidades de diferentes comandas.
 *       Muestra el nombre del cocinero que tomó el plato (configurable).
 *       Cronómetro del plato más antiguo del grupo. Cuando se finaliza
 *       un plato (pasa a recoger), la cantidad se reduce automáticamente
 *       porque el filtro lo excluye y el grupo se recalcula.
 *
 * Props:
 * - item: { nombre, cantidadTotal, platos, tiempoInicio, key }
 * - configVisual: apariencia + umbrales de alerta
 * - modoTarjeta: true cuando la lista usa varias columnas (estilo tarjeta)
 */
const PlatoMonitorRow = React.forwardRef(({ item, configVisual = {}, tick = 0, modoTarjeta = false }, ref) => {
  const { nombre, cantidadTotal, platos = [], tiempoInicio } = item;
  const nombreVisible = obtenerNombreDisplayCocina(platos[0]?.plato || item, { forzar: true }) || nombre;

  // Cronómetro (del plato más antiguo del grupo)
  const segundos = calcularSegundos(tiempoInicio);
  const cronometro = formatearCronometro(segundos);

  // Umbrales de alerta (configurables en barra superior)
  const amarilloMin = configVisual.tiempoAmarillo ?? 5;
  const rojoMin = configVisual.tiempoRojo ?? 20;
  const alerta = nivelAlerta(segundos, amarilloMin, rojoMin);

  // Cocineros que tomaron este plato (de los platos individuales del grupo)
  const mostrarCocinero = configVisual.mostrarCocineroTomado !== false;
  const cocinerosSet = new Map(); // id -> { alias, nombre }
  for (const p of platos) {
    const pp = p.plato.procesandoPor;
    if (pp && pp.cocineroId) {
      const cid = String(pp.cocineroId);
      cocinerosSet.set(cid, {
        alias: pp.alias || pp.nombre || 'Cocinero',
        nombre: pp.nombre || pp.alias || '',
      });
    }
  }
  const cocineros = Array.from(cocinerosSet.values());
  // Texto a mostrar: alias o nombre de cada cocinero único
  const cocinerosTexto = cocineros.map(c => c.alias).join(', ');

  // Origen de asignación en el grupo (auto / overflow) para badge en monitor
  const tieneAuto = platos.some(p => p.plato?.asignacionMeta?.origen === 'auto');
  const tieneOverflow = platos.some(p => p.plato?.asignacionMeta?.origen === 'overflow');

  // Mesas / comandas (resumido)
  const mesasSet = new Set();
  const comandasSet = new Set();
  for (const p of platos) {
    const mesaNum = p.comanda.mesaNumero ?? p.comanda.mesas?.nummesa ?? p.comanda.mesas?.numero ?? p.comanda.mesa?.numero ?? p.comanda.mesa;
    if (mesaNum != null && mesaNum !== '') mesasSet.add(mesaNum);
    const num = p.comanda.numero || p.comanda.numeroMesa;
    if (num) comandasSet.add(num);
  }
  const mesasTexto = Array.from(mesasSet).slice(0, 5).join(', ');
  const comandasTexto = Array.from(comandasSet).slice(0, 5).join(', ');

  // Complementos / notas (todos los platos del grupo comparten la misma clave)
  const mostrarComplementos = configVisual.mostrarComplementos !== false;
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
  const complementosTexto = Array.from(complementosSet).join(' · ');

  // Detectar si alguno es para llevar
  const hayParaLlevar = grupoTieneParaLlevar(platos);

  // Config visual
  const fuenteFamilia = configVisual.fuenteFamilia || 'Inter, system-ui, sans-serif';
  const tamanioFuentePlato = configVisual.tamanioFuentePlato || 36;
  const tamanioFuenteDetalle = configVisual.tamanioFuenteDetalle || 20;
  const tamanioFuenteCronometro = configVisual.tamanioFuenteCronometro || 28;
  const colorTextoPrincipal = configVisual.colorTextoPrincipal || '#ffffff';
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#9ca3af';
  const colorNombrePlato = colorNombrePlatoMonitor(configVisual);
  const colorDetallePlato = colorDetallePlatoMonitor(configVisual);
  const colorAcento = configVisual.colorAcento || '#d4af37';
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla || '#fbbf24';
  const colorAlertaRoja = configVisual.colorAlertaRoja || '#ef4444';
  const colorFilaPlato = configVisual.colorFilaPlato || '#1a1a28';
  const espaciado = configVisual.espaciadoFilas || 'normal';
  const pesoFuentePlato = configVisual.pesoFuentePlato || '800';
  const disposicionVertical = modoTarjeta && (configVisual.disposicionTarjeta || 'vertical') === 'vertical';
  const esUnido = espaciado === 'unido';

  const paddingY = esUnido ? '14px' : espaciado === 'compacto' ? '12px' : espaciado === 'amplio' ? '28px' : '18px';
  const paddingX = modoTarjeta || esUnido ? '16px' : '24px';

  const colorAlerta = alerta === 'rojo' ? colorAlertaRoja : alerta === 'amarillo' ? colorAlertaAmarilla : colorAcento;
  const bordeAlerta = alerta !== 'normal' ? `3px solid ${colorAlerta}` : `3px solid ${colorAcento}44`;
  const bordeIzquierdo = modoTarjeta ? 'none' : (alerta !== 'normal' ? `5px solid ${colorAlerta}` : `5px solid ${colorAcento}55`);
  const fondoFila = alerta === 'rojo'
    ? `${colorAlertaRoja}18`
    : alerta === 'amarillo'
      ? `${colorAlertaAmarilla}14`
      : colorFilaPlato;

  const contenidoNombre = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: `${tamanioFuentePlato}px`,
          fontWeight: pesoFuentePlato,
          lineHeight: 1.15,
          whiteSpace: 'normal',
          overflow: 'visible',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ minWidth: 0, color: colorNombrePlato }}>{nombreVisible}</span>
        {hayParaLlevar && (
          <BadgeParaLlevar fontSize={Math.max(11, Math.round((tamanioFuenteDetalle || 20) * 0.55))} />
        )}
        <span style={estiloCantidadBadge(configVisual)}>
          {textoCantidadBadge(cantidadTotal, configVisual)}
        </span>
      </div>

      {mostrarComplementos && complementosTexto && (
        <div
          style={{
            ...estiloDetalleGuarnicionPlato(tamanioFuenteDetalle, colorDetallePlato),
            marginTop: '4px',
          }}
        >
          {complementosTexto}
        </div>
      )}

      <NotaEnCuadroMonitor
        texto={configVisual.notasJuntoAGuarniciones !== false ? item.notasCuadro : ''}
        configVisual={configVisual}
        colorFallback={colorTextoSecundario}
      />

      <div
        style={{
          fontSize: `${tamanioFuenteDetalle}px`,
          color: colorTextoSecundario,
          marginTop: '3px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {mesasTexto && <span>Mesa(s): {mesasTexto}</span>}
        {mostrarCocinero && cocinerosTexto && (
          <span style={{ color: colorAcento, fontWeight: 600 }}>
            👨‍🍳 {cocinerosTexto}
            {tieneAuto && <span title="Auto" style={{ marginLeft: 4 }}>⚡</span>}
            {tieneOverflow && <span title="Overflow" style={{ marginLeft: 4 }}>↻</span>}
          </span>
        )}
      </div>
    </div>
  );

  const contenidoCronometro = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: disposicionVertical ? 'flex-start' : 'flex-end',
        marginLeft: disposicionVertical ? 0 : '24px',
        marginTop: disposicionVertical ? '10px' : 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: `${tamanioFuenteCronometro}px`,
          fontWeight: 800,
          color: colorAlerta,
          fontVariantNumeric: 'tabular-nums',
          textShadow: alerta !== 'normal' ? `0 0 14px ${colorAlerta}77` : 'none',
        }}
      >
        {cronometro}
      </div>
      {alerta === 'rojo' && (
        <div style={{ fontSize: '14px', fontWeight: 700, color: colorAlertaRoja, marginTop: '2px' }}>
          ⚠ URGENTE
        </div>
      )}
      {alerta === 'amarillo' && (
        <div style={{ fontSize: '14px', fontWeight: 700, color: colorAlertaAmarilla, marginTop: '2px' }}>
          ⏳ Atención
        </div>
      )}
    </div>
  );

  const estiloFila = {
    background: fondoFila,
    color: colorTextoPrincipal,
    borderBottom: modoTarjeta || esUnido ? 'none' : `1px solid ${colorAcento}15`,
    borderLeft: esUnido ? (alerta !== 'normal' ? `3px solid ${colorAlerta}` : `1px solid ${colorAcento}44`) : bordeIzquierdo,
    border: modoTarjeta
      ? (esUnido ? `1px solid ${alerta !== 'normal' ? colorAlerta : `${colorAcento}44`}` : bordeAlerta)
      : (esUnido ? `1px solid ${colorAcento}33` : undefined),
    borderRadius: esUnido
      ? radioForma('redondeado', { esUnido: true, radioPx: configVisual.tarjetaRadio, defaultPx: 0 })
      : (modoTarjeta
        ? radioForma('redondeado', { radioPx: configVisual.tarjetaRadio ?? 12, defaultPx: 12 })
        : 0),
    padding: (configVisual.tarjetaPadding != null && configVisual.tarjetaPadding !== '')
      ? `${Math.max(0, Number(configVisual.tarjetaPadding) || 0)}px`
      : `${paddingY} ${paddingX}`,
    fontFamily: fuenteFamilia,
    display: 'flex',
    flexDirection: disposicionVertical ? 'column' : 'row',
    alignItems: disposicionVertical ? 'stretch' : 'center',
    justifyContent: disposicionVertical ? 'flex-start' : 'space-between',
    minHeight: (modoTarjeta && configVisual.aprovecharEspacio !== true && !(mostrarComplementos && complementosTexto)) ? '120px' : (modoTarjeta ? 'auto' : '72px'),
    height: (modoTarjeta && configVisual.aprovecharEspacio !== true && !(mostrarComplementos && complementosTexto)) ? '100%' : undefined,
    boxShadow: esUnido ? 'none' : (modoTarjeta ? `0 2px 12px ${colorAcento}11` : 'none'),
    minWidth: 0,
  };

  // Animaciones (Personalizar → Animaciones de tarjetas; default ON)
  const animOn = configVisual.animacionesTarjetas !== false;
  const mostrarCronometro = item.soloContadorEnCocina !== true;

  if (!animOn) {
    return (
      <div style={estiloFila}>
        {contenidoNombre}
        {mostrarCronometro && contenidoCronometro}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.9,
        x: 40,
        filter: 'blur(3px)',
        transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
      }}
      transition={{
        layout: { type: 'spring', stiffness: 360, damping: 34 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.22 },
      }}
      style={{ ...estiloFila, willChange: 'transform, opacity' }}
    >
      {contenidoNombre}
      {mostrarCronometro && contenidoCronometro}
    </motion.div>
  );
});

PlatoMonitorRow.displayName = 'PlatoMonitorRow';

export default PlatoMonitorRow;