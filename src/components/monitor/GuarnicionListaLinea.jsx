import React from 'react';
import { calcularSegundos, formatearCronometro } from '../../hooks/useCocinaMonitorTimer';
import NotaEnCuadroMonitor from './NotaEnCuadroMonitor';
import { tokensEstiloPronombreGuarnicion } from '../../utils/notasMonitor';

/**
 * Línea de lista (cuadro OFF) para el panel derecho de Ver Cocina Completo.
 * Sin fondo, borde ni radio de tarjeta. Cronómetro opcional a la derecha, plano.
 */
const GAP = { unido: 0, compacto: 4, normal: 8, amplio: 14 };

const GuarnicionListaLinea = ({
  texto,
  textoPadre = '',
  textoCocinero = '',
  fuenteFamilia,
  tamanioFuente,
  pesoFuente,
  colorTexto,
  colorPadre,
  tamanioPadre,
  espaciado = 'normal',
  cronometroIso = null,
  ocultarCronometro = true,
  colorCronometro,
  tamanioCronometro,
  textoNota = '',
  configVisual = {},
  conCuadro = false,
  colorCuadro,
}) => {
  const gap = GAP[espaciado] ?? GAP.normal;
  const mostrarReloj = !ocultarCronometro && cronometroIso;
  const crono = mostrarReloj
    ? formatearCronometro(calcularSegundos(cronometroIso))
    : '';
  const colorMarco = colorCuadro || colorTexto;
  const fsPadre = tamanioPadre || Math.max(10, Math.round((tamanioFuente || 18) * 0.75));
  const estiloPron = tokensEstiloPronombreGuarnicion(configVisual, {
    color: colorPadre || colorTexto,
    fontSize: fsPadre,
    fontFamily: fuenteFamilia,
  });

  return (
    <div
      style={{
        display: 'block',
        padding: `${gap}px 8px`,
        background: 'transparent',
        border: conCuadro ? `2px solid ${colorMarco}` : 'none',
        borderRadius: conCuadro ? 8 : 0,
        boxSizing: 'border-box',
        fontFamily: fuenteFamilia,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <span
          style={{
            fontSize: `${tamanioFuente}px`,
            fontWeight: pesoFuente,
            color: colorTexto,
            lineHeight: 1.25,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {texto}
          {textoPadre ? (
            <>
              {' '}
              <span
                style={{
                  fontSize: `${fsPadre}px`,
                  fontWeight: 500,
                  color: colorPadre || colorTexto,
                }}
              >
                {textoPadre}
              </span>
            </>
          ) : null}
          {textoCocinero ? (
            <>
              {' '}
              <span
                style={{
                  fontSize: `${estiloPron.fontSize}px`,
                  fontWeight: 700,
                  color: estiloPron.color,
                  fontFamily: estiloPron.fontFamily,
                  flexShrink: 0,
                }}
              >
                {textoCocinero}
              </span>
            </>
          ) : null}
        </span>
        {mostrarReloj && (
          <span
            style={{
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
              fontSize: `${tamanioCronometro || Math.max(14, (tamanioFuente || 18) * 0.7)}px`,
              fontWeight: 700,
              color: colorCronometro || colorTexto,
            }}
          >
            {crono}
          </span>
        )}
      </div>
      <NotaEnCuadroMonitor
        texto={textoNota}
        configVisual={configVisual}
        colorFallback={colorPadre || colorTexto}
      />
    </div>
  );
};

export default GuarnicionListaLinea;
