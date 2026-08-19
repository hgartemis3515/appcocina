import React from 'react';
import { motion } from 'framer-motion';
import { calcularSegundos, formatearCronometro, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';
import { estiloCantidadBadge } from '../../utils/monitorBadgeStyles';
import { formatearReferenciaPadre, tokenGuarnicion, nombresListaGuarniciones } from '../../utils/guarnicionesKds';
import GuarnicionListaLinea from './GuarnicionListaLinea';

/**
 * GuarnicionMonitorRow - Fila de una guarnición en el panel derecho del
 * monitor Ver Cocina (PLAN GUARNICIONES_SEPARADAS v1.1.1 §10).
 *
 * Repite EXACTAMENTE el estilo de personalización de PlatoMonitorRow
 * (fuentes, tamaños, colores, paddings, bordes, cronómetro, animaciones,
 * disposición de tarjeta) para que la lista de guarniciones se vea igual
 * que la de platos normales. La única diferencia de contenido:
 *  - Título: nombre de la guarnición (ej. "Arroz").
 *  - Sub-texto: "de {nombreCocinaPadre}" (alias de cocina del plato padre).
 *  - NO muestra "Mesa(s)" ni "👨‍🍳 cocinero" (esos datos los gobierna el
 *    cronómetro del plato padre, igual que en una tarjeta de plato).
 *  - Badge "🥗 Guarnición" + alerta de tiempo propia de la guarnición.
 *
 * Props:
 * - item: { nombreGuarnicion, nombrePadre, cantidad, tiempoInicio, alerta, key }
 * - configVisual: misma config que PlatoMonitorRow (hereda la personalización).
 * - modoTarjeta: true cuando la lista usa varias columnas.
 */
const GuarnicionMonitorRow = React.forwardRef(({ item, configVisual = {}, tick = 0, modoTarjeta = false }, ref) => {
  const nombre = item.nombreGuarnicion || 'Guarnición';
  const cantidadTotal = item.cantidad || 1;
  const nombrePadre = item.nombrePadre || '';

  // Cronómetro: usa el tiempo del plato padre (la guarnición se prepara en
  // paralelo al principal; el timer del padre es la referencia de pase).
  const segundos = calcularSegundos(item.tiempoInicio);
  const cronometro = formatearCronometro(segundos);

  // Umbrales de alerta (mismos que PlatoMonitorRow — personalización compartida).
  const amarilloMin = configVisual.tiempoAmarillo ?? 5;
  const rojoMin = configVisual.tiempoRojo ?? 20;
  const alerta = nivelAlerta(segundos, amarilloMin, rojoMin);

  // Alerta propia de la guarnición (PLAN GUARNICIONES_SEPARADAS §4: tiempos
  // máximos por guarnición). Si la guarnición está atrasada respecto a su
  // tiempo medio, prevalece sobre la alerta del padre para priorización.
  const alertaGuarnicion = item.alerta;
  const alertaFinal = alertaGuarnicion === 'critica' ? 'rojo'
    : alertaGuarnicion === 'alerta' ? 'amarillo'
    : alerta;

  // Estilos (idénticos a PlatoMonitorRow para respetar la personalización).
  const fuenteFamilia = tokenGuarnicion(configVisual, 'fuenteFamiliaGuarnicion', configVisual.fuenteFamilia || 'Inter, system-ui, sans-serif');
  const tamanioFuentePlato = tokenGuarnicion(configVisual, 'tamanioFuenteGuarnicion', configVisual.tamanioFuentePlato || 36);
  const tamanioFuenteDetalle = configVisual.tamanioFuenteDetalle || 20;
  const tamanioFuenteCronometro = configVisual.tamanioFuenteCronometro || 28;
  const colorTextoPrincipal = tokenGuarnicion(configVisual, 'colorTextoGuarnicion', configVisual.colorTextoPrincipal || '#ffffff');
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#9ca3af';
  const colorTextoPadre = configVisual.colorTextoPadreGuarnicion || colorTextoSecundario;
  const tamanioFuentePadre = (configVisual.tamanioFuentePadreGuarnicion != null && configVisual.tamanioFuentePadreGuarnicion !== '')
    ? Number(configVisual.tamanioFuentePadreGuarnicion)
    : null;
  const colorAcento = tokenGuarnicion(configVisual, 'colorAcentoGuarnicion', configVisual.colorAcento || '#d4af37');
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla || '#fbbf24';
  const colorAlertaRoja = configVisual.colorAlertaRoja || '#ef4444';
  const colorFilaPlato = tokenGuarnicion(configVisual, 'colorFondoGuarnicion', configVisual.colorFilaPlato || '#1a1a28');
  const espaciado = tokenGuarnicion(configVisual, 'espaciadoFilasGuarnicion', configVisual.espaciadoFilas || 'normal');
  const pesoFuentePlato = tokenGuarnicion(configVisual, 'pesoFuenteGuarnicion', configVisual.pesoFuentePlato || '800');
  const disposicionVertical = modoTarjeta && (configVisual.disposicionTarjeta || 'vertical') === 'vertical';
  const esUnido = espaciado === 'unido';
  const refPadre = formatearReferenciaPadre(nombrePadre, configVisual.referenciaPadreGuarnicion || 'de');

  if (configVisual.ocultarCuadroGuarniciones === true) {
    return (
      <GuarnicionListaLinea
        texto={nombresListaGuarniciones(item.comps) || `- ${nombre}`}
        textoPadre={refPadre}
        fuenteFamilia={fuenteFamilia}
        tamanioFuente={tamanioFuentePlato}
        pesoFuente={pesoFuentePlato}
        colorTexto={colorTextoPrincipal}
        colorPadre={colorTextoPadre}
        tamanioPadre={tamanioFuentePadre}
        espaciado={espaciado}
        cronometroIso={item.tiempoInicio || null}
        ocultarCronometro={configVisual.ocultarCronometroGuarniciones === true}
        colorCronometro={colorTextoPrincipal}
        tamanioCronometro={tamanioFuenteCronometro}
      />
    );
  }

  const paddingY = esUnido ? '14px' : espaciado === 'compacto' ? '12px' : espaciado === 'amplio' ? '28px' : '18px';
  const paddingX = modoTarjeta || esUnido ? '16px' : '24px';

  const colorAlerta = alertaFinal === 'rojo' ? colorAlertaRoja : alertaFinal === 'amarillo' ? colorAlertaAmarilla : colorAcento;
  const bordeAlerta = alertaFinal !== 'normal' ? `3px solid ${colorAlerta}` : `3px solid ${colorAcento}44`;
  const bordeIzquierdo = modoTarjeta ? 'none' : (alertaFinal !== 'normal' ? `5px solid ${colorAlerta}` : `5px solid ${colorAcento}55`);
  const fondoFila = alertaFinal === 'rojo'
    ? `${colorAlertaRoja}18`
    : alertaFinal === 'amarillo'
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
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</span>
        <span style={estiloCantidadBadge(configVisual)}>
          ×{cantidadTotal}
        </span>
      </div>

      {/* Sub-texto: "de {nombreCocinaPadre}" — referencia al plato padre.
          Usa el nombre de cocina (alias) si existe, no el nombre comercial. */}
      {(nombrePadre || refPadre) && (
        <div
          style={{
            fontSize: `${tamanioFuenteDetalle}px`,
            color: colorTextoSecundario,
            marginTop: '4px',
            whiteSpace: disposicionVertical ? 'normal' : 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: disposicionVertical ? 'break-word' : undefined,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontSize: '11px', fontWeight: 700, color: '#a3e635',
              background: '#65a30d22', padding: '1px 6px', borderRadius: '8px',
              border: '1px solid #65a30d44', flexShrink: 0,
            }}
          >
            🥗 Guarnición
          </span>
          {refPadre && (
            <span
              style={{
                fontSize: `${tamanioFuentePadre || tamanioFuenteDetalle}px`,
                color: colorTextoPadre,
              }}
            >
              {refPadre}
            </span>
          )}
        </div>
      )}
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
          textShadow: alertaFinal !== 'normal' ? `0 0 14px ${colorAlerta}77` : 'none',
        }}
      >
        {cronometro}
      </div>
      {alertaFinal === 'rojo' && (
        <div style={{ fontSize: '14px', fontWeight: 700, color: colorAlertaRoja, marginTop: '2px' }}>
          ⚠ URGENTE
        </div>
      )}
      {alertaFinal === 'amarillo' && (
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
    borderLeft: esUnido ? (alertaFinal !== 'normal' ? `3px solid ${colorAlerta}` : `1px solid ${colorAcento}44`) : bordeIzquierdo,
    border: modoTarjeta
      ? (esUnido ? `1px solid ${alertaFinal !== 'normal' ? colorAlerta : `${colorAcento}44`}` : bordeAlerta)
      : (esUnido ? `1px solid ${colorAcento}33` : undefined),
    borderRadius: esUnido ? 0 : (modoTarjeta ? '12px' : 0),
    padding: `${paddingY} ${paddingX}`,
    fontFamily: fuenteFamilia,
    display: 'flex',
    flexDirection: disposicionVertical ? 'column' : 'row',
    alignItems: disposicionVertical ? 'stretch' : 'center',
    justifyContent: disposicionVertical ? 'flex-start' : 'space-between',
    minHeight: (modoTarjeta && configVisual.aprovecharEspacio !== true) ? '120px' : (modoTarjeta ? 'auto' : '72px'),
    height: (modoTarjeta && configVisual.aprovecharEspacio !== true) ? '100%' : undefined,
    boxShadow: esUnido ? 'none' : (modoTarjeta ? `0 2px 12px ${colorAcento}11` : 'none'),
    minWidth: 0,
  };

  const animOn = configVisual.animacionesTarjetas !== false;

  if (!animOn) {
    return (
      <div style={estiloFila}>
        {contenidoNombre}
        {configVisual.ocultarCronometroGuarniciones !== true && contenidoCronometro}
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
        opacity: 0, scale: 0.9, transition: { duration: 0.2 },
      }}
      style={estiloFila}
    >
      {contenidoNombre}
      {configVisual.ocultarCronometroGuarniciones !== true && contenidoCronometro}
    </motion.div>
  );
});

export default GuarnicionMonitorRow;
