import React from 'react';
import {
  MONITOR_LAYOUT,
  MONITOR_TIPOGRAFIA,
  clampColumnas,
} from '../../config/monitorVisualConstants';

const FUENTES_DISPONIBLES = [
  { id: 'inter', label: 'Inter (default)', value: 'Inter, system-ui, sans-serif' },
  { id: 'arial', label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { id: 'helvetica', label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { id: 'segoe', label: 'Segoe UI', value: '"Segoe UI", Tahoma, sans-serif' },
  { id: 'verdana', label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { id: 'georgia', label: 'Georgia', value: 'Georgia, serif' },
  { id: 'times', label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { id: 'courier', label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { id: 'roboto', label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
  { id: 'monospace', label: 'Monoespaciada', value: 'ui-monospace, monospace' },
];

const inputStyle = (colorFondo, colorTexto, colorAcento) => ({
  padding: '6px 10px',
  background: colorFondo,
  color: colorTexto,
  border: `1px solid ${colorAcento}40`,
  borderRadius: '6px',
  fontSize: '13px',
});

const labelStyle = (colorSec) => ({
  fontSize: '12px',
  color: colorSec,
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  fontWeight: 500,
});

const sectionTitle = (colorAcento) => ({
  fontSize: '11px',
  fontWeight: 700,
  color: colorAcento,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '10px',
  width: '100%',
});

const Section = ({ title, colorAcento, children }) => (
  <div style={{ minWidth: '200px', flex: '1 1 220px' }}>
    <div style={sectionTitle(colorAcento)}>{title}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
      {children}
    </div>
  </div>
);

const BtnStep = ({ onClick, children, colorAcento, colorFondo, colorTexto }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      border: `1px solid ${colorAcento}55`,
      background: `${colorAcento}18`,
      color: colorTexto,
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 700,
      lineHeight: 1,
    }}
  >
    {children}
  </button>
);

/**
 * Panel de personalización visual para Ver Cocina (Completo y Personalizado).
 */
const MonitorConfigPanel = ({
  configVisual,
  localDesign,
  onChange,
  onReset,
  colorFondo,
  colorTextoPrincipal,
  colorTextoSecundario,
  colorAcento,
}) => {
  const guardar = (patch) => onChange({ ...localDesign, ...patch });

  const ajustarTamanio = (campo, delta, min, max) => {
    const actual = configVisual[campo] || 20;
    const nuevo = Math.min(max, Math.max(min, actual + delta));
    guardar({ [campo]: nuevo });
  };

  const ajustarTodosTamanios = (delta) => {
    guardar({
      tamanioFuentePlato: Math.min(
        MONITOR_TIPOGRAFIA.PLATO_MAX,
        Math.max(MONITOR_TIPOGRAFIA.PLATO_MIN, (configVisual.tamanioFuentePlato || 36) + delta)
      ),
      tamanioFuenteDetalle: Math.min(
        MONITOR_TIPOGRAFIA.DETALLE_MAX,
        Math.max(MONITOR_TIPOGRAFIA.DETALLE_MIN, (configVisual.tamanioFuenteDetalle || 20) + delta)
      ),
      tamanioFuenteCronometro: Math.min(
        MONITOR_TIPOGRAFIA.CRONO_MAX,
        Math.max(MONITOR_TIPOGRAFIA.CRONO_MIN, (configVisual.tamanioFuenteCronometro || 28) + delta)
      ),
    });
  };

  const presetFuente = FUENTES_DISPONIBLES.find(f => f.value === configVisual.fuenteFamilia);
  const fuenteActual = presetFuente?.id
    || (localDesign.fuenteFamiliaCustom ? 'custom' : 'inter');

  const columnasActuales = clampColumnas(configVisual.layoutColumnas || 1);

  const setColumnas = (n) => guardar({ layoutColumnas: clampColumnas(n) });

  const inp = inputStyle(colorFondo, colorTextoPrincipal, colorAcento);
  const lbl = labelStyle(colorTextoSecundario);

  const layoutBtn = (cols, label) => {
    const activo = columnasActuales === cols;
    return (
      <button
        key={cols}
        type="button"
        onClick={() => setColumnas(cols)}
        title={label}
        style={{
          padding: '8px 14px',
          borderRadius: '8px',
          border: `2px solid ${activo ? colorAcento : `${colorAcento}33`}`,
          background: activo ? `${colorAcento}22` : 'transparent',
          color: activo ? colorAcento : colorTextoSecundario,
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: activo ? 700 : 500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          minWidth: '64px',
        }}
      >
        <span style={{ fontSize: '18px', letterSpacing: cols === 1 ? 0 : '2px' }}>
          {cols === 1 ? '▬' : '▬'.repeat(Math.min(cols, 4))}
        </span>
        {label}
      </button>
    );
  };

  return (
    <div style={{ padding: '16px 24px 20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 32px' }}>
        {/* Diseño de lista */}
        <Section title="Diseño de lista" colorAcento={colorAcento}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {layoutBtn(1, '1 columna')}
            {layoutBtn(2, '2 columnas')}
            {layoutBtn(3, '3 columnas')}
            {layoutBtn(4, '4 columnas')}
            <label style={{ ...lbl, minWidth: '140px' }}>
              Columnas (1–{MONITOR_LAYOUT.COLUMNAS_MAX})
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <BtnStep
                  onClick={() => setColumnas(columnasActuales - 1)}
                  colorAcento={colorAcento}
                  colorTexto={colorTextoPrincipal}
                >
                  −
                </BtnStep>
                <input
                  type="number"
                  min={MONITOR_LAYOUT.COLUMNAS_MIN}
                  max={MONITOR_LAYOUT.COLUMNAS_MAX}
                  value={columnasActuales}
                  onChange={e => setColumnas(e.target.value)}
                  style={{ ...inp, width: '56px', textAlign: 'center' }}
                />
                <BtnStep
                  onClick={() => setColumnas(columnasActuales + 1)}
                  colorAcento={colorAcento}
                  colorTexto={colorTextoPrincipal}
                >
                  +
                </BtnStep>
              </div>
            </label>
          </div>
          {columnasActuales > 1 && (
            <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '4px 0 0', width: '100%' }}>
              Con 2+ columnas se muestran tarjetas en cuadrícula (no bloques por cocinero).
            </p>
          )}
          <label style={lbl}>
            Espaciado entre filas
            <select
              value={configVisual.espaciadoFilas || 'normal'}
              onChange={e => guardar({ espaciadoFilas: e.target.value })}
              style={{ ...inp, minWidth: '120px' }}
            >
              <option value="unido">Unido (sin espacio)</option>
              <option value="compacto">Compacto</option>
              <option value="normal">Normal</option>
              <option value="amplio">Amplio</option>
            </select>
          </label>
          {(columnasActuales > 1) && (
            <label style={lbl}>
              Disposición en tarjeta
              <select
                value={configVisual.disposicionTarjeta || 'vertical'}
                onChange={e => guardar({ disposicionTarjeta: e.target.value })}
                style={{ ...inp, minWidth: '140px' }}
              >
                <option value="vertical">Vertical (nombre arriba)</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </label>
          )}
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
            <input
              type="checkbox"
              checked={configVisual.animacionesTarjetas !== false}
              onChange={e => guardar({ animacionesTarjetas: e.target.checked })}
            />
            Animaciones de tarjetas
          </label>
        </Section>

        {/* Tipografía */}
        <Section title="Tipografía" colorAcento={colorAcento}>
          <label style={{ ...lbl, minWidth: '180px' }}>
            Tipo de fuente
            <select
              value={fuenteActual}
              onChange={e => {
                if (e.target.value === 'custom') return;
                const f = FUENTES_DISPONIBLES.find(x => x.id === e.target.value);
                if (f) {
                  const { fuenteFamiliaCustom, ...rest } = localDesign;
                  onChange({ ...rest, fuenteFamilia: f.value });
                }
              }}
              style={{ ...inp, minWidth: '180px', fontFamily: configVisual.fuenteFamilia }}
            >
              {fuenteActual === 'custom' && (
                <option value="custom">Personalizada</option>
              )}
              {FUENTES_DISPONIBLES.map(f => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>
          </label>
          <label style={lbl}>
            Fuente personalizada
            <input
              type="text"
              placeholder="Ej: Arial, sans-serif"
              value={localDesign.fuenteFamiliaCustom ?? (presetFuente ? '' : (configVisual.fuenteFamilia || ''))}
              onChange={e => {
                const custom = e.target.value;
                if (custom.trim()) {
                  guardar({ fuenteFamiliaCustom: custom, fuenteFamilia: custom });
                } else {
                  const { fuenteFamiliaCustom, ...rest } = localDesign;
                  const f = FUENTES_DISPONIBLES.find(x => x.id === 'inter');
                  onChange({ ...rest, fuenteFamilia: f?.value || FUENTES_DISPONIBLES[0].value });
                }
              }}
              style={{ ...inp, minWidth: '160px' }}
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: colorTextoSecundario }}>Todo el texto</span>
            <BtnStep onClick={() => ajustarTodosTamanios(-2)} colorAcento={colorAcento} colorTexto={colorTextoPrincipal}>−</BtnStep>
            <BtnStep onClick={() => ajustarTodosTamanios(2)} colorAcento={colorAcento} colorTexto={colorTextoPrincipal}>+</BtnStep>
          </div>
          <label style={lbl}>
            Nombre plato (px)
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <BtnStep
                onClick={() => ajustarTamanio('tamanioFuentePlato', -2, MONITOR_TIPOGRAFIA.PLATO_MIN, MONITOR_TIPOGRAFIA.PLATO_MAX)}
                colorAcento={colorAcento} colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={MONITOR_TIPOGRAFIA.PLATO_MIN}
                max={MONITOR_TIPOGRAFIA.PLATO_MAX}
                value={configVisual.tamanioFuentePlato}
                onChange={e => guardar({
                  tamanioFuentePlato: Math.min(
                    MONITOR_TIPOGRAFIA.PLATO_MAX,
                    Math.max(MONITOR_TIPOGRAFIA.PLATO_MIN, Number(e.target.value) || MONITOR_TIPOGRAFIA.PLATO_MIN)
                  ),
                })}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => ajustarTamanio('tamanioFuentePlato', 2, MONITOR_TIPOGRAFIA.PLATO_MIN, MONITOR_TIPOGRAFIA.PLATO_MAX)}
                colorAcento={colorAcento} colorTexto={colorTextoPrincipal}
              >+</BtnStep>
            </div>
          </label>
          <label style={lbl}>
            Detalle (px)
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <BtnStep
                onClick={() => ajustarTamanio('tamanioFuenteDetalle', -1, MONITOR_TIPOGRAFIA.DETALLE_MIN, MONITOR_TIPOGRAFIA.DETALLE_MAX)}
                colorAcento={colorAcento} colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={MONITOR_TIPOGRAFIA.DETALLE_MIN}
                max={MONITOR_TIPOGRAFIA.DETALLE_MAX}
                value={configVisual.tamanioFuenteDetalle}
                onChange={e => guardar({
                  tamanioFuenteDetalle: Math.min(
                    MONITOR_TIPOGRAFIA.DETALLE_MAX,
                    Math.max(MONITOR_TIPOGRAFIA.DETALLE_MIN, Number(e.target.value) || MONITOR_TIPOGRAFIA.DETALLE_MIN)
                  ),
                })}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => ajustarTamanio('tamanioFuenteDetalle', 1, MONITOR_TIPOGRAFIA.DETALLE_MIN, MONITOR_TIPOGRAFIA.DETALLE_MAX)}
                colorAcento={colorAcento} colorTexto={colorTextoPrincipal}
              >+</BtnStep>
            </div>
          </label>
          <label style={lbl}>
            Cronómetro (px)
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <BtnStep
                onClick={() => ajustarTamanio('tamanioFuenteCronometro', -2, MONITOR_TIPOGRAFIA.CRONO_MIN, MONITOR_TIPOGRAFIA.CRONO_MAX)}
                colorAcento={colorAcento} colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={MONITOR_TIPOGRAFIA.CRONO_MIN}
                max={MONITOR_TIPOGRAFIA.CRONO_MAX}
                value={configVisual.tamanioFuenteCronometro}
                onChange={e => guardar({
                  tamanioFuenteCronometro: Math.min(
                    MONITOR_TIPOGRAFIA.CRONO_MAX,
                    Math.max(MONITOR_TIPOGRAFIA.CRONO_MIN, Number(e.target.value) || MONITOR_TIPOGRAFIA.CRONO_MIN)
                  ),
                })}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => ajustarTamanio('tamanioFuenteCronometro', 2, MONITOR_TIPOGRAFIA.CRONO_MIN, MONITOR_TIPOGRAFIA.CRONO_MAX)}
                colorAcento={colorAcento} colorTexto={colorTextoPrincipal}
              >+</BtnStep>
            </div>
          </label>
          <label style={lbl}>
            Peso del nombre
            <select
              value={configVisual.pesoFuentePlato || '800'}
              onChange={e => guardar({ pesoFuentePlato: e.target.value })}
              style={{ ...inp, minWidth: '120px' }}
            >
              <option value="400">Normal</option>
              <option value="600">Semi-negrita</option>
              <option value="700">Negrita</option>
              <option value="800">Extra negrita</option>
              <option value="900">Máximo</option>
            </select>
          </label>
        </Section>

        {/* Colores */}
        <Section title="Colores" colorAcento={colorAcento}>
          {[
            ['colorFondo', 'Fondo'],
            ['colorFilaPlato', 'Fila / tarjeta'],
            ['colorTextoPrincipal', 'Texto principal'],
            ['colorTextoSecundario', 'Texto secundario'],
            ['colorAcento', 'Acento'],
            ['colorAlertaAmarilla', 'Alerta amarilla'],
            ['colorAlertaRoja', 'Alerta roja'],
          ].map(([key, text]) => (
            <label key={key} style={lbl}>
              {text}
              <input
                type="color"
                value={configVisual[key]}
                onChange={e => guardar({ [key]: e.target.value })}
                style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </label>
          ))}
        </Section>

        {/* Ver por cocinero (nueva sección) */}
        <Section title="Ver por cocinero" colorAcento={colorAcento}>
          <label style={lbl}>
            Agrupación
            <select
              value={configVisual.modoAgrupacion || 'bloques'}
              onChange={e => guardar({ modoAgrupacion: e.target.value })}
              style={{ ...inp, minWidth: '150px' }}
            >
              <option value="bloques">Bloques por cocinero (col-1)</option>
              <option value="tarjetas">Tarjetas independientes</option>
            </select>
          </label>
          <label style={lbl}>
            Temporizadores
            <select
              value={configVisual.modoTimers || 'completos'}
              onChange={e => guardar({ modoTimers: e.target.value })}
              style={{ ...inp, minWidth: '140px' }}
            >
              <option value="completos">Completos (todos)</option>
              <option value="resumidos">Resumidos (solo el más antiguo)</option>
            </select>
          </label>
          <label style={lbl}>
            Estilo temporizador
            <select
              value={configVisual.estiloTemporizador || 'vertical'}
              onChange={e => guardar({ estiloTemporizador: e.target.value })}
              style={{ ...inp, minWidth: '150px' }}
            >
              <option value="vertical">Vertical (columna derecha)</option>
              <option value="horizontal">Horizontal (línea)</option>
            </select>
          </label>
          <label style={lbl}>
            Intensidad de alerta
            <select
              value={configVisual.intensidadAlerta || 'normal'}
              onChange={e => guardar({ intensidadAlerta: e.target.value })}
              style={{ ...inp, minWidth: '130px' }}
            >
              <option value="suave">Suave</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta (más glow)</option>
            </select>
          </label>
          <label style={lbl}>
            Máx temporizadores visibles
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <BtnStep
                onClick={() => guardar({ maxTimersVisibles: Math.max(2, (configVisual.maxTimersVisibles || 6) - 1) })}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number" min="2" max="20"
                value={configVisual.maxTimersVisibles ?? 6}
                onChange={e => guardar({ maxTimersVisibles: Number(e.target.value) })}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => guardar({ maxTimersVisibles: Math.min(20, (configVisual.maxTimersVisibles || 6) + 1) })}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >+</BtnStep>
            </div>
          </label>
          <label style={lbl}>
            Tamaño fuente cocinero (px)
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <BtnStep
                onClick={() => guardar({
                tamanioFuenteCocinero: Math.max(
                  MONITOR_TIPOGRAFIA.COCINERO_MIN,
                  (configVisual.tamanioFuenteCocinero || 28) - 2
                ),
              })}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={MONITOR_TIPOGRAFIA.COCINERO_MIN}
                max={MONITOR_TIPOGRAFIA.COCINERO_MAX}
                value={configVisual.tamanioFuenteCocinero ?? 28}
                onChange={e => guardar({
                  tamanioFuenteCocinero: Math.min(
                    MONITOR_TIPOGRAFIA.COCINERO_MAX,
                    Math.max(MONITOR_TIPOGRAFIA.COCINERO_MIN, Number(e.target.value) || MONITOR_TIPOGRAFIA.COCINERO_MIN)
                  ),
                })}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => guardar({
                tamanioFuenteCocinero: Math.min(
                  MONITOR_TIPOGRAFIA.COCINERO_MAX,
                  (configVisual.tamanioFuenteCocinero || 28) + 2
                ),
              })}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >+</BtnStep>
            </div>
          </label>
          <label style={lbl}>
            Umbral carga alta (platos)
            <input
              type="number" min="3" max="30"
              value={configVisual.umbralCargaAlta ?? 8}
              onChange={e => guardar({ umbralCargaAlta: Number(e.target.value) })}
              style={{ ...inp, width: '64px' }}
            />
          </label>
          <label style={lbl}>
            Umbral sobrecargado (platos)
            <input
              type="number" min="5" max="40"
              value={configVisual.umbralSobrecarga ?? 12}
              onChange={e => guardar({ umbralSobrecarga: Number(e.target.value) })}
              style={{ ...inp, width: '64px' }}
            />
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.mostrarMesas !== false}
              onChange={e => guardar({ mostrarMesas: e.target.checked })}
            />
            Mostrar mesas
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.mostrarCabeceraCocinero !== false}
              onChange={e => guardar({ mostrarCabeceraCocinero: e.target.checked })}
            />
            Cabecera de cocinero
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.colorPorCocinero !== false}
              onChange={e => guardar({ colorPorCocinero: e.target.checked })}
            />
            Color por cocinero
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.mostrarEtiquetaPlato === true}
              onChange={e => guardar({ mostrarEtiquetaPlato: e.target.checked })}
            />
            Etiqueta "Plato:"
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.mostrarIconoCocinero !== false}
              onChange={e => guardar({ mostrarIconoCocinero: e.target.checked })}
            />
            Icono de cocinero
          </label>
        </Section>

        {/* Alertas y contenido */}
        <Section title="Alertas y contenido" colorAcento={colorAcento}>
          <label style={lbl}>
            Alerta amarilla (min)
            <input
              type="number" min="1" max="120"
              value={configVisual.tiempoAmarillo}
              onChange={e => guardar({ tiempoAmarillo: Number(e.target.value) })}
              style={{ ...inp, width: '72px' }}
            />
          </label>
          <label style={lbl}>
            Alerta roja (min)
            <input
              type="number" min="1" max="180"
              value={configVisual.tiempoRojo}
              onChange={e => guardar({ tiempoRojo: Number(e.target.value) })}
              style={{ ...inp, width: '72px' }}
            />
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.mostrarCocineroTomado !== false}
              onChange={e => guardar({ mostrarCocineroTomado: e.target.checked })}
            />
            Mostrar cocinero
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.mostrarComplementos !== false}
              onChange={e => guardar({ mostrarComplementos: e.target.checked })}
            />
            Mostrar complementos
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.mostrarNotificacionEntrada !== false}
              onChange={e => guardar({ mostrarNotificacionEntrada: e.target.checked })}
            />
            Notif. entrada
          </label>
          <label style={lbl}>
            Texto notificación
            <input
              type="text"
              value={configVisual.textoNotificacionEntrada || 'Entra plato'}
              onChange={e => guardar({ textoNotificacionEntrada: e.target.value })}
              style={{ ...inp, minWidth: '130px' }}
            />
          </label>
          <label style={lbl}>
            Duración notif. (seg)
            <input
              type="number" min="3" max="60"
              value={configVisual.duracionNotificacionEntrada ?? 8}
              onChange={e => guardar({ duracionNotificacionEntrada: Number(e.target.value) })}
              style={{ ...inp, width: '72px' }}
            />
          </label>
        </Section>
      </div>

      {/* Vista previa */}
      <div
        style={{
          marginTop: '18px',
          padding: '14px 18px',
          borderRadius: '10px',
          border: `1px solid ${colorAcento}33`,
          background: configVisual.colorFilaPlato,
          fontFamily: configVisual.fuenteFamilia,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {configVisual.mostrarCabeceraCocinero !== false && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: `${configVisual.colorAcento}22`,
                border: `2px solid ${configVisual.colorAcento}`,
                color: configVisual.colorAcento,
                fontSize: '12px',
                fontWeight: 800,
              }}
            >
              JU
            </span>
            <span style={{ fontSize: `${Math.min(configVisual.tamanioFuenteCocinero || 28, 20)}px`, fontWeight: 800, color: configVisual.colorAcento }}>
              Juan
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: `${Math.min(configVisual.tamanioFuentePlato, 28)}px`,
            fontWeight: configVisual.pesoFuentePlato || MONITOR_TIPOGRAFIA.PESO_DEFAULT,
            color: configVisual.colorTextoPrincipal,
          }}>
            Pachamanca
          </span>
          <span style={{
            color: configVisual.colorAcento,
            fontSize: `${Math.min(configVisual.tamanioFuentePlato * 0.7, 20)}px`,
            fontWeight: 900,
            background: `${configVisual.colorAcento}18`,
            padding: '0 8px',
            borderRadius: '6px',
          }}>
            ×4
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: `${Math.min(configVisual.tamanioFuenteCronometro * 1.15, 22)}px`, fontWeight: 900, color: configVisual.colorAcento }}>
            ⏱(
          </span>
          {['18:20', '15:40', '09:10', '03:25'].map((t, i) => (
            <span
              key={i}
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: `${Math.min(configVisual.tamanioFuenteCronometro, 18)}px`,
                fontWeight: 800,
                fontFamily: 'ui-monospace, monospace',
                fontVariantNumeric: 'tabular-nums',
                color: i === 0 ? '#fff' : i < 2 ? configVisual.colorAlertaAmarilla : configVisual.colorAcento,
                background: i === 0 ? configVisual.colorAlertaRoja : `${i < 2 ? configVisual.colorAlertaAmarilla : configVisual.colorAcento}22`,
                border: `1px solid ${i === 0 ? configVisual.colorAlertaRoja : i < 2 ? configVisual.colorAlertaAmarilla : configVisual.colorAcento}88`,
              }}
            >
              {t}
            </span>
          ))}
          <span style={{ fontSize: `${Math.min(configVisual.tamanioFuenteCronometro * 1.15, 22)}px`, fontWeight: 900, color: configVisual.colorAcento }}>
            )
          </span>
        </div>
        {configVisual.mostrarMesas !== false && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: configVisual.colorTextoSecundario, fontWeight: 600, textTransform: 'uppercase' }}>
              Mesas
            </span>
            {['M12', 'M14', 'M18', 'M20'].map((m, i) => (
              <span
                key={i}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: configVisual.colorTextoSecundario,
                  background: 'transparent',
                  border: `1px solid ${configVisual.colorAcento}33`,
                }}
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            background: 'transparent',
            color: colorTextoSecundario,
            border: `1px solid ${colorAcento}40`,
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Restaurar valores por defecto
        </button>
      </div>
    </div>
  );
};

export default MonitorConfigPanel;
export { FUENTES_DISPONIBLES };
