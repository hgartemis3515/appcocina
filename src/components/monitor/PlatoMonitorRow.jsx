import React from 'react';
import { motion } from 'framer-motion';
import { calcularSegundos, formatearCronometro, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';

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
const PlatoMonitorRow = ({ item, configVisual = {}, tick = 0, modoTarjeta = false }) => {
  const { nombre, cantidadTotal, platos = [], tiempoInicio } = item;

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
  const platoRef = platos[0]?.plato;
  if (platoRef) {
    const comps = platoRef.complementosSeleccionados || platoRef.complementos || [];
    comps.forEach(c => {
      if (typeof c === 'string') {
        complementosSet.add(c);
        return;
      }
      const grupo = c.grupo ? `${c.grupo}: ` : '';
      const opcion = c.opcion || c.nombre || '';
      const cant = c.cantidad > 1 ? ` ×${c.cantidad}` : '';
      if (opcion) complementosSet.add(`${grupo}${opcion}${cant}`.trim());
    });
    const obs = platoRef.observaciones || platoRef.nota;
    if (obs) complementosSet.add(obs);
  }
  const complementosTexto = Array.from(complementosSet).slice(0, 6).join(' · ');

  // Detectar si alguno es para llevar
  const hayParaLlevar = platos.some(p => p.comanda.tipoServicio === 'para_llevar');

  // Config visual
  const fuenteFamilia = configVisual.fuenteFamilia || 'Inter, system-ui, sans-serif';
  const tamanioFuentePlato = configVisual.tamanioFuentePlato || 36;
  const tamanioFuenteDetalle = configVisual.tamanioFuenteDetalle || 20;
  const tamanioFuenteCronometro = configVisual.tamanioFuenteCronometro || 28;
  const colorTextoPrincipal = configVisual.colorTextoPrincipal || '#ffffff';
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#9ca3af';
  const colorAcento = configVisual.colorAcento || '#d4af37';
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla || '#fbbf24';
  const colorAlertaRoja = configVisual.colorAlertaRoja || '#ef4444';
  const colorFilaPlato = configVisual.colorFilaPlato || '#1a1a28';
  const espaciado = configVisual.espaciadoFilas || 'normal';
  const pesoFuentePlato = configVisual.pesoFuentePlato || '800';
  const disposicionVertical = modoTarjeta && (configVisual.disposicionTarjeta || 'vertical') === 'vertical';

  const paddingY = espaciado === 'compacto' ? '12px' : espaciado === 'amplio' ? '28px' : '18px';
  const paddingX = modoTarjeta ? '16px' : '24px';

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
          whiteSpace: disposicionVertical ? 'normal' : 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          wordBreak: disposicionVertical ? 'break-word' : undefined,
        }}
      >
        {nombre}
        <span
          style={{
            color: colorAcento,
            marginLeft: disposicionVertical ? '8px' : '12px',
            fontSize: `${tamanioFuentePlato * 0.7}px`,
            fontWeight: 900,
          }}
        >
          ×{cantidadTotal}
        </span>
      </div>

      {mostrarComplementos && complementosTexto && (
        <div
          style={{
            fontSize: `${tamanioFuenteDetalle}px`,
            color: colorTextoSecundario,
            marginTop: '4px',
            whiteSpace: disposicionVertical ? 'normal' : 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: disposicionVertical ? 'break-word' : undefined,
          }}
        >
          {complementosTexto}
        </div>
      )}

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
        {hayParaLlevar && <span style={{ color: colorAcento }}>· Para llevar</span>}
        {mostrarCocinero && cocinerosTexto && (
          <span style={{ color: colorAcento, fontWeight: 600 }}>
            👨‍🍳 {cocinerosTexto}
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
    borderBottom: modoTarjeta ? 'none' : `1px solid ${colorAcento}15`,
    borderLeft: bordeIzquierdo,
    border: modoTarjeta ? bordeAlerta : undefined,
    borderRadius: modoTarjeta ? '12px' : 0,
    padding: `${paddingY} ${paddingX}`,
    fontFamily: fuenteFamilia,
    display: 'flex',
    flexDirection: disposicionVertical ? 'column' : 'row',
    alignItems: disposicionVertical ? 'stretch' : 'center',
    justifyContent: disposicionVertical ? 'flex-start' : 'space-between',
    minHeight: modoTarjeta ? '120px' : '72px',
    height: modoTarjeta ? '100%' : undefined,
    boxShadow: modoTarjeta ? `0 2px 12px ${colorAcento}11` : 'none',
    minWidth: 0,
  };

  // En modo tarjeta/grid: sin animaciones layout (evita duplicados visuales al cambiar columnas)
  if (modoTarjeta) {
    return (
      <div style={estiloFila}>
        {contenidoNombre}
        {contenidoCronometro}
      </div>
    );
  }

  return (
    <motion.div
      layout={false}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ duration: 0.25 }}
      style={estiloFila}
    >
      {contenidoNombre}
      {contenidoCronometro}
    </motion.div>
  );
};

export default PlatoMonitorRow;