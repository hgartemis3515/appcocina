import React from 'react';
import {
  MONITOR_LAYOUT,
  MONITOR_TIPOGRAFIA,
  clampColumnas,
} from '../../config/monitorVisualConstants';
import {
  estiloNumeroSecuencial,
  textoNumeroSecuencial,
  estiloCantidadBadge,
} from '../../utils/monitorBadgeStyles';

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
  onSaveProfile,
  guardandoPerfil = false,
  perfilMensaje = null,
  colorFondo,
  colorTextoPrincipal,
  colorTextoSecundario,
  colorAcento,
  // Perfiles de personalización con nombre
  perfiles = [],
  perfilSelId = null,
  cargandoPerfiles = false,
  cargandoPerfilId = null,
  onSeleccionarPerfil = null,
  onGuardarPerfilComo = null,
  onSobrescribirPerfil = null,
  onEliminarPerfil = null,
  onRecargarPerfiles = null,
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

        {/* Número secuencial (#N en timers) */}
        <Section title="Número secuencial (timers)" colorAcento={colorAcento}>
          {[
            ['numeroSecColor', 'Color texto'],
            ['numeroSecContorno', 'Color contorno'],
            ['numeroSecFondo', 'Color fondo'],
          ].map(([key, text]) => (
            <label key={key} style={lbl}>
              {text}
              <input
                type="color"
                value={(configVisual[key] || '#22c55e').toString().slice(0, 7)}
                onChange={e => guardar({ [key]: e.target.value })}
                style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </label>
          ))}
          <label style={lbl}>
            Forma
            <select
              value={configVisual.numeroSecForma || 'redondeado'}
              onChange={e => guardar({ numeroSecForma: e.target.value })}
              style={{ ...inp, minWidth: '130px' }}
            >
              <option value="circulo">Círculo</option>
              <option value="redondeado">Redondeado</option>
              <option value="cuadrado">Cuadrado</option>
              <option value="pildora">Píldora</option>
            </select>
          </label>
          <label style={lbl}>
            Tamaño letra
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => guardar({ numeroSecTamanio: 'auto' })}
                style={{
                  ...inp,
                  cursor: 'pointer',
                  background: (configVisual.numeroSecTamanio === 'auto' || configVisual.numeroSecTamanio == null)
                    ? `${colorAcento}33` : 'transparent',
                }}
              >
                Auto
              </button>
              <BtnStep
                onClick={() => {
                  const cur = configVisual.numeroSecTamanio === 'auto' || configVisual.numeroSecTamanio == null
                    ? Math.max(18, (configVisual.tamanioFuentePlato || 36) * 0.55)
                    : Number(configVisual.numeroSecTamanio) || 18;
                  guardar({ numeroSecTamanio: Math.max(10, Math.round(cur) - 2) });
                }}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={10}
                max={72}
                value={
                  configVisual.numeroSecTamanio === 'auto' || configVisual.numeroSecTamanio == null
                    ? ''
                    : configVisual.numeroSecTamanio
                }
                placeholder="auto"
                onChange={e => {
                  const v = e.target.value;
                  if (v === '') guardar({ numeroSecTamanio: 'auto' });
                  else guardar({ numeroSecTamanio: Math.min(72, Math.max(10, Number(v) || 10)) });
                }}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => {
                  const cur = configVisual.numeroSecTamanio === 'auto' || configVisual.numeroSecTamanio == null
                    ? Math.max(18, (configVisual.tamanioFuentePlato || 36) * 0.55)
                    : Number(configVisual.numeroSecTamanio) || 18;
                  guardar({ numeroSecTamanio: Math.min(72, Math.round(cur) + 2) });
                }}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >+</BtnStep>
            </div>
          </label>
          <label style={lbl}>
            Peso
            <select
              value={String(configVisual.numeroSecPeso || '900')}
              onChange={e => guardar({ numeroSecPeso: e.target.value })}
              style={{ ...inp, minWidth: '120px' }}
            >
              <option value="600">Semi-negrita</option>
              <option value="700">Negrita</option>
              <option value="800">Extra</option>
              <option value="900">Máximo</option>
            </select>
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={configVisual.numeroSecPrefijo !== false}
              onChange={e => guardar({ numeroSecPrefijo: e.target.checked })}
            />
            Prefijo #
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={configVisual.numeroSecGlow !== false}
              onChange={e => guardar({ numeroSecGlow: e.target.checked })}
            />
            Glow
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginTop: '4px' }}>
            {[1, 2, 12].map(n => (
              <span key={n} style={estiloNumeroSecuencial(configVisual)}>
                {textoNumeroSecuencial(n, configVisual)}
              </span>
            ))}
          </div>
        </Section>

        {/* Cantidad ×N */}
        <Section title="Cantidad (×N)" colorAcento={colorAcento}>
          {[
            ['cantidadColor', 'Color texto'],
            ['cantidadContorno', 'Color contorno'],
            ['cantidadFondo', 'Color fondo'],
          ].map(([key, text]) => (
            <label key={key} style={lbl}>
              {text}
              <input
                type="color"
                value={(configVisual[key] || (key === 'cantidadFondo' ? '#0d0612' : '#ffffff')).toString().slice(0, 7)}
                onChange={e => guardar({ [key]: e.target.value })}
                style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </label>
          ))}
          <label style={lbl}>
            Tamaño
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => guardar({ cantidadTamanio: 'auto' })}
                style={{
                  ...inp,
                  cursor: 'pointer',
                  background: (configVisual.cantidadTamanio === 'auto' || configVisual.cantidadTamanio == null)
                    ? `${colorAcento}33` : 'transparent',
                }}
              >
                Auto
              </button>
              <BtnStep
                onClick={() => {
                  const cur = configVisual.cantidadTamanio === 'auto' || configVisual.cantidadTamanio == null
                    ? Math.max(14, (configVisual.tamanioFuentePlato || 36) * 0.6)
                    : Number(configVisual.cantidadTamanio) || 14;
                  guardar({ cantidadTamanio: Math.max(10, Math.round(cur) - 2) });
                }}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={10}
                max={72}
                value={
                  configVisual.cantidadTamanio === 'auto' || configVisual.cantidadTamanio == null
                    ? ''
                    : configVisual.cantidadTamanio
                }
                placeholder="auto"
                onChange={e => {
                  const v = e.target.value;
                  if (v === '') guardar({ cantidadTamanio: 'auto' });
                  else guardar({ cantidadTamanio: Math.min(72, Math.max(10, Number(v) || 10)) });
                }}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => {
                  const cur = configVisual.cantidadTamanio === 'auto' || configVisual.cantidadTamanio == null
                    ? Math.max(14, (configVisual.tamanioFuentePlato || 36) * 0.6)
                    : Number(configVisual.cantidadTamanio) || 14;
                  guardar({ cantidadTamanio: Math.min(72, Math.round(cur) + 2) });
                }}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >+</BtnStep>
            </div>
          </label>
          <label style={lbl}>
            Grosor contorno
            <input
              type="number"
              min={1}
              max={4}
              value={configVisual.cantidadGrosorContorno ?? 2}
              onChange={e => guardar({ cantidadGrosorContorno: Math.min(4, Math.max(1, Number(e.target.value) || 2)) })}
              style={{ ...inp, width: '64px', textAlign: 'center' }}
            />
          </label>
          <label style={lbl}>
            Radio cuadro
            <input
              type="number"
              min={0}
              max={20}
              value={configVisual.cantidadRadio ?? 10}
              onChange={e => guardar({ cantidadRadio: Math.min(20, Math.max(0, Number(e.target.value) || 0)) })}
              style={{ ...inp, width: '64px', textAlign: 'center' }}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginTop: '4px' }}>
            {[1, 2, 4].map(n => (
              <span key={n} style={estiloCantidadBadge(configVisual)}>
                ×{n}
              </span>
            ))}
          </div>
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
          <label style={lbl} title="Tamaño del cronómetro 'Más antiguo' que aparece en la cabecera de cada cocinero (junto al contador de platos). Vacío = automático.">
            Cronómetro cabecera (px)
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => guardar({ tamanioCronometroCabecera: null })}
                style={{
                  ...inp,
                  cursor: 'pointer',
                  background: (configVisual.tamanioCronometroCabecera == null)
                    ? `${colorAcento}33` : 'transparent',
                }}
                title="Automático (deriva del tamaño de fuente del cocinero)"
              >
                Auto
              </button>
              <BtnStep
                onClick={() => {
                  const cur = configVisual.tamanioCronometroCabecera == null
                    ? Math.max(MONITOR_TIPOGRAFIA.CRONO_CABECERA_MIN, Math.round((configVisual.tamanioFuenteCocinero || 28) * 0.85))
                    : Number(configVisual.tamanioCronometroCabecera) || 18;
                  guardar({ tamanioCronometroCabecera: Math.max(MONITOR_TIPOGRAFIA.CRONO_CABECERA_MIN, Math.round(cur) - 2) });
                }}
                colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={MONITOR_TIPOGRAFIA.CRONO_CABECERA_MIN}
                max={MONITOR_TIPOGRAFIA.CRONO_CABECERA_MAX}
                value={configVisual.tamanioCronometroCabecera == null ? '' : configVisual.tamanioCronometroCabecera}
                placeholder="auto"
                onChange={e => {
                  const v = e.target.value;
                  if (v === '') guardar({ tamanioCronometroCabecera: null });
                  else guardar({
                    tamanioCronometroCabecera: Math.min(
                      MONITOR_TIPOGRAFIA.CRONO_CABECERA_MAX,
                      Math.max(MONITOR_TIPOGRAFIA.CRONO_CABECERA_MIN, Number(v) || MONITOR_TIPOGRAFIA.CRONO_CABECERA_MIN)
                    ),
                  });
                }}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => {
                  const cur = configVisual.tamanioCronometroCabecera == null
                    ? Math.max(MONITOR_TIPOGRAFIA.CRONO_CABECERA_MIN, Math.round((configVisual.tamanioFuenteCocinero || 28) * 0.85))
                    : Number(configVisual.tamanioCronometroCabecera) || 18;
                  guardar({ tamanioCronometroCabecera: Math.min(MONITOR_TIPOGRAFIA.CRONO_CABECERA_MAX, Math.round(cur) + 2) });
                }}
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

        {/* Perfiles de personalización con nombre */}
        <Section title="Perfiles guardados" colorAcento={colorAcento}>
          <label style={{ ...lbl, minWidth: '240px', flex: '1 1 240px' }}>
            Perfil
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={perfilSelId || ''}
                onChange={e => onSeleccionarPerfil?.(e.target.value || null)}
                disabled={cargandoPerfiles || cargandoPerfilId !== null || perfiles.length === 0}
                style={{ ...inp, minWidth: '180px', flex: '1 1 180px' }}
              >
                <option value="">— Sin seleccionar —</option>
                {perfiles.map(p => (
                  <option key={p._id} value={p._id}>{p.nombre}</option>
                ))}
              </select>
              {cargandoPerfilId !== null ? (
                <span
                  title="Cargando perfil…"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px',
                    border: `2px solid ${colorAcento}55`,
                    borderTopColor: colorAcento,
                    borderRadius: '50%',
                    animation: 'kdsconfigspin 0.7s linear infinite',
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={onRecargarPerfiles}
                  disabled={cargandoPerfiles}
                  title="Recargar lista de perfiles"
                  style={{ ...inp, cursor: cargandoPerfiles ? 'wait' : 'pointer', padding: '6px 10px' }}
                >
                  ↻
                </button>
              )}
            </div>
            {cargandoPerfilId !== null && (
              <p style={{ fontSize: '11px', color: colorAcento, margin: '4px 0 0', width: '100%' }}>
                Cargando perfil…
              </p>
            )}
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                const nombre = window.prompt('Nombre del nuevo perfil:');
                if (nombre !== null) onGuardarPerfilComo?.(nombre);
              }}
              disabled={guardandoPerfil || !onGuardarPerfilComo}
              style={{
                padding: '8px 14px', fontSize: '13px', fontWeight: 700,
                background: colorAcento, color: colorFondo, border: 'none',
                borderRadius: '8px', cursor: guardandoPerfil ? 'wait' : 'pointer',
                opacity: guardandoPerfil ? 0.6 : 1,
              }}
            >
              Guardar como…
            </button>
            <button
              type="button"
              onClick={() => {
                if (!perfilSelId) return;
                const p = perfiles.find(x => String(x._id) === String(perfilSelId));
                if (!p) return;
                if (window.confirm(`¿Sobrescribir el perfil "${p.nombre}" con la configuración actual?`)) {
                  onSobrescribirPerfil?.(perfilSelId);
                }
              }}
              disabled={guardandoPerfil || !perfilSelId || !onSobrescribirPerfil}
              title="Sobrescribe el perfil seleccionado con la configuración actual"
              style={{
                padding: '8px 14px', fontSize: '13px', fontWeight: 600,
                background: 'transparent', color: colorTextoPrincipal,
                border: `1px solid ${colorAcento}66`, borderRadius: '8px',
                cursor: guardandoPerfil ? 'wait' : 'pointer',
                opacity: (!perfilSelId || guardandoPerfil) ? 0.5 : 1,
              }}
            >
              Sobrescribir
            </button>
            <button
              type="button"
              onClick={() => {
                if (!perfilSelId) return;
                const p = perfiles.find(x => String(x._id) === String(perfilSelId));
                if (!p) return;
                if (window.confirm(`¿Eliminar el perfil "${p.nombre}"?`)) {
                  onEliminarPerfil?.(perfilSelId);
                }
              }}
              disabled={guardandoPerfil || !perfilSelId || !onEliminarPerfil}
              style={{
                padding: '8px 14px', fontSize: '13px', fontWeight: 600,
                background: 'transparent', color: '#ef4444',
                border: '1px solid #ef444466', borderRadius: '8px',
                cursor: guardandoPerfil ? 'wait' : 'pointer',
                opacity: (!perfilSelId || guardandoPerfil) ? 0.5 : 1,
              }}
            >
              Eliminar
            </button>
          </div>
          {perfiles.length === 0 && !cargandoPerfiles && (
            <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '4px 0 0', width: '100%' }}>
              No hay perfiles guardados. Personaliza la apariencia y pulsa "Guardar como…" para crear uno.
            </p>
          )}
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '4px 0 0', width: '100%' }}>
            Los perfiles guardan toda la configuración de personalización (tamaños, fuente, colores, etc.)
            y pueden aplicarse a los monitores desde "Distribuir Cocina en monitores".
          </p>
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

      <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '12px', color: perfilMensaje?.tipo === 'error' ? '#ef4444' : (perfilMensaje?.tipo === 'ok' ? '#22c55e' : colorTextoSecundario) }}>
          {perfilMensaje?.texto || ''}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {onSaveProfile && (
            <button
              type="button"
              onClick={onSaveProfile}
              disabled={guardandoPerfil}
              title="Guarda la personalización como perfil automático del cocinero activo (flujo perfil=auto)"
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'transparent',
                color: colorTextoSecundario,
                border: `1px solid ${colorAcento}55`,
                borderRadius: '8px',
                cursor: guardandoPerfil ? 'wait' : 'pointer',
                opacity: guardandoPerfil ? 0.6 : 1,
              }}
            >
              Guardar perfil del cocinero (auto)
            </button>
          )}
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
    </div>
  );
};

export default MonitorConfigPanel;
export { FUENTES_DISPONIBLES };
