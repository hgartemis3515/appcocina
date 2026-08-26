import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getServerBaseUrl } from '../../config/apiConfig';
import {
  CLAVES_CONTADOR_DEFAULT,
  ETIQUETAS_CONTADOR_DEFAULT,
  MAX_CLAVES_CONTADOR,
  claveNombreComplemento,
  normalizarClavesContador,
} from '../../utils/nombreComplementoCanonico';
import {
  MONITOR_LAYOUT,
  MONITOR_TIPOGRAFIA,
  clampColumnas,
  ANIMACIONES_ALERTA,
  DURACION_ANIMACION,
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

/** Ancho/alto en px con Auto (null = automático). */
const DimPx = ({ label, value, onChange, min = 20, max = 280, inp, lbl, colorAcento, colorFondo, colorTexto }) => {
  const esAuto = value == null || value === '';
  const n = esAuto ? null : Number(value);
  return (
    <label style={lbl}>
      {label}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onChange(null)}
          style={{
            ...inp,
            cursor: 'pointer',
            background: esAuto ? `${colorAcento}33` : 'transparent',
          }}
        >
          Auto
        </button>
        <BtnStep
          onClick={() => onChange(Math.max(min, (n || min) - 4))}
          colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTexto}
        >−</BtnStep>
        <input
          type="number"
          min={min}
          max={max}
          value={esAuto ? '' : n}
          placeholder="auto"
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') onChange(null);
            else onChange(Math.min(max, Math.max(min, Number(v) || min)));
          }}
          style={{ ...inp, width: '64px', textAlign: 'center' }}
        />
        <BtnStep
          onClick={() => onChange(Math.min(max, (n || min) + 4))}
          colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTexto}
        >+</BtnStep>
        <span style={{ fontSize: '11px', opacity: 0.7 }}>px</span>
      </div>
    </label>
  );
};

/** Fuera del panel: si se define adentro, cada tick del reloj remonta el input y Windows cierra el picker. */
const ColorG = ({ k, label, fallback, configVisual, guardar, lbl, inp, colorAcento }) => {
  const raw = configVisual[k];
  const hex = String(raw || fallback || '#ffffff').slice(0, 7);
  return (
    <div style={lbl}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input
          type="color"
          value={hex}
          onChange={(e) => guardar({ [k]: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
        />
        <button
          type="button"
          onClick={() => guardar({ [k]: null })}
          title="Heredar de platos"
          style={{
            ...inp,
            cursor: 'pointer',
            padding: '6px 10px',
            background: raw == null ? `${colorAcento}33` : 'transparent',
          }}
        >
          Heredar
        </button>
      </div>
    </div>
  );
};

const CheckG = ({ k, label, help, defaultOn = false, configVisual, guardar, lbl, colorAcento, colorTextoPrincipal, colorTextoSecundario }) => (
  <label style={{ ...lbl, flexDirection: 'column', alignItems: 'flex-start', minWidth: '220px' }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={defaultOn ? configVisual[k] !== false : configVisual[k] === true}
        onChange={(e) => guardar({ [k]: e.target.checked })}
        style={{ width: '16px', height: '16px', accentColor: colorAcento, cursor: 'pointer' }}
      />
      <span style={{ fontSize: '12px', color: colorTextoPrincipal, fontWeight: 600 }}>{label}</span>
    </span>
    {help ? (
      <span style={{ fontSize: '11px', color: colorTextoSecundario, marginLeft: '24px' }}>{help}</span>
    ) : null}
  </label>
);

/**
 * Vista previa de una animación de alerta. Renderiza una tarjeta miniatura
 * que ejecuta la keyframe seleccionada con el color de alerta correspondiente.
 */
const PreviewAnimacion = ({ nombre, color, colorFondo, colorTexto, colorAcento, etiqueta, emojisCustom = null, sizeCustom = null, countCustom = null }) => {
  const duracion = DURACION_ANIMACION(nombre);
  // Emojis a mostrar en la vista previa
  let iconos = [];
  if (emojisCustom && emojisCustom.trim()) {
    const lista = Array.from(emojisCustom.trim());
    const count = Math.max(1, Math.min(4, countCustom || lista.length));
    const size = sizeCustom || 22;
    for (let i = 0; i < count; i++) {
      iconos.push({
        emoji: lista[i % lista.length],
        pos: { top: `${20 + (i % 2) * 50}%`, left: `${20 + Math.floor(i / 2) * 50}%`, transform: 'translate(-50%,-50%)' },
        size: `${size}px`,
      });
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <span style={{ fontSize: '11px', color: colorAcento, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Vista previa · {etiqueta}
      </span>
      <div
        style={{
          '--kds-alerta-color': color,
          '--kds-fondo-base': '#1a0f1f',
          position: 'relative',
          background: '#1a0f1f',
          color: colorTexto,
          border: `2px solid ${color}`,
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          fontWeight: 700,
          width: 'fit-content',
          minWidth: '200px',
          overflow: 'hidden',
          animation: nombre ? `${nombre} ${duracion} ease-in-out infinite` : 'none',
        }}
      >
        {iconos.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            {iconos.map((ic, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  fontSize: ic.size,
                  ...ic.pos,
                  animation: 'kdsIconPulse 1.4s ease-in-out infinite',
                  opacity: 0.85,
                }}
              >
                {ic.emoji}
              </span>
            ))}
          </div>
        )}
        <span style={{ position: 'relative', zIndex: 1 }}>🍳 Pachamanca ×2</span>
      </div>
    </div>
  );
};

const SelectorContadorComplementos = ({
  configVisual,
  guardar,
  getToken,
  opcionesLive = [],
  colorAcento,
  colorTextoPrincipal,
  colorTextoSecundario,
  lbl,
  inp,
}) => {
  const [catalogo, setCatalogo] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const clavesSel = normalizarClavesContador(configVisual.contadorGuarnicionesClaves);

  useEffect(() => {
    if (!getToken) return undefined;
    let cancel = false;
    (async () => {
      try {
        const token = typeof getToken === 'function' ? getToken() : null;
        if (!token) return;
        const res = await axios.get(`${getServerBaseUrl()}/api/complementos-plantilla/opciones-catalogo`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ops = res.data?.opciones || [];
        if (!cancel && Array.isArray(ops)) setCatalogo(ops);
      } catch {
        /* se usa el listado en vivo */
      }
    })();
    return () => { cancel = true; };
  }, [getToken]);

  const opciones = useMemo(() => {
    const map = new Map();
    for (const k of CLAVES_CONTADOR_DEFAULT) {
      map.set(k, { clave: k, nombre: ETIQUETAS_CONTADOR_DEFAULT[k] || k, platos: 0, destacado: true });
    }
    for (const o of catalogo) {
      const clave = o.clave || claveNombreComplemento(o.nombre);
      if (!clave) continue;
      map.set(clave, {
        clave,
        nombre: o.nombre || ETIQUETAS_CONTADOR_DEFAULT[clave] || clave,
        platos: Number(o.platos) || 0,
        destacado: CLAVES_CONTADOR_DEFAULT.includes(clave),
      });
    }
    for (const o of opcionesLive) {
      const clave = o.clave || claveNombreComplemento(o.nombre);
      if (!clave) continue;
      const prev = map.get(clave);
      map.set(clave, {
        clave,
        nombre: (prev && prev.nombre) || o.nombre || clave,
        platos: Math.max(prev ? prev.platos : 0, Number(o.platos) || 0),
        destacado: CLAVES_CONTADOR_DEFAULT.includes(clave) || (prev && prev.destacado),
      });
    }
    const q = busqueda.trim().toLowerCase();
    return [...map.values()]
      .filter((o) => !q || o.nombre.toLowerCase().includes(q) || o.clave.includes(q))
      .sort((a, b) => Number(b.destacado) - Number(a.destacado) || b.platos - a.platos || a.nombre.localeCompare(b.nombre, 'es'));
  }, [catalogo, opcionesLive, busqueda]);

  const toggle = (clave) => {
    const has = clavesSel.includes(clave);
    if (has) {
      if (clavesSel.length <= 1) return;
      guardar({ contadorGuarnicionesClaves: clavesSel.filter((k) => k !== clave) });
      return;
    }
    if (clavesSel.length >= MAX_CLAVES_CONTADOR) return;
    guardar({ contadorGuarnicionesClaves: [...clavesSel, clave] });
  };

  return (
    <div style={{ ...lbl, flexDirection: 'column', alignItems: 'stretch', minWidth: '280px', flex: '1 1 280px' }}>
      <span>Complementos del contador ({clavesSel.length}/{MAX_CLAVES_CONTADOR})</span>
      <span style={{ fontSize: '11px', color: colorTextoSecundario, fontWeight: 400 }}>
        Elige 1, 2 o 3. Arroz, Papa frita y Ensalada vienen marcados. Se guarda en el perfil.
      </span>
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar complemento…"
        style={{ ...inp, width: '100%' }}
      />
      <div
        style={{
          maxHeight: '160px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '4px 0',
        }}
      >
        {opciones.map((o) => {
          const on = clavesSel.includes(o.clave);
          const lleno = !on && clavesSel.length >= MAX_CLAVES_CONTADOR;
          const ultimo = on && clavesSel.length <= 1;
          const bloqueado = lleno || ultimo;
          return (
            <label
              key={o.clave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: bloqueado ? 'not-allowed' : 'pointer',
                opacity: lleno ? 0.45 : 1,
                fontSize: '12px',
                color: colorTextoPrincipal,
              }}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={bloqueado}
                onChange={() => toggle(o.clave)}
                style={{ width: '16px', height: '16px', accentColor: colorAcento }}
              />
              <span style={{ fontWeight: o.destacado ? 700 : 500 }}>{o.nombre}</span>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: colorTextoSecundario }}>
                {o.platos ? `${o.platos} plato(s)` : (o.destacado ? 'sugerido' : '')}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

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
  getToken = null,
  opcionesContadorLive = [],
}) => {
  // Snapshot visible: Guardar perfil / Guardar como / Sobrescribir / auto-save
  // persisten lo que el panel muestra, no un subconjunto de localDesign.
  const guardar = (patch) => onChange({ ...configVisual, ...localDesign, ...patch });

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

  // PLAN GUARNICIONES_SEPARADAS v1.1.1 §10: columnas del panel de guarniciones
  // (split 50/50 cuando "Lista complementos" está activo).
  const diferenciarDiseno = configVisual.diferenciarDisenoGuarniciones === true;
  const columnasGuarnicionesActuales = clampColumnas(
    diferenciarDiseno ? (configVisual.layoutColumnasGuarniciones || 1) : (configVisual.layoutColumnas || 1)
  );
  const setColumnasGuarniciones = (n) => guardar({ layoutColumnasGuarniciones: clampColumnas(n) });
  const toggleDiferenciar = (val) => guardar({ diferenciarDisenoGuarniciones: val });

  const inp = inputStyle(colorFondo, colorTextoPrincipal, colorAcento);
  const lbl = labelStyle(colorTextoSecundario);

  const presetFuenteG = FUENTES_DISPONIBLES.find(f => f.value === configVisual.fuenteFamiliaGuarnicion);
  const fuenteGuarnicionActual = presetFuenteG?.id
    || (configVisual.fuenteFamiliaGuarnicion ? 'custom' : '');

  const checkGProps = {
    configVisual, guardar, lbl, colorAcento, colorTextoPrincipal, colorTextoSecundario,
  };
  const colorGProps = { configVisual, guardar, lbl, inp, colorAcento };

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
              checked={configVisual.aprovecharEspacio === true}
              onChange={e => guardar({ aprovecharEspacio: e.target.checked })}
            />
            Aprovechar espacio
          </label>
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '-2px 0 6px', width: '100%' }}>
            Cada tarjeta se ajusta a su texto (Bistec queda baja, Lomo saltado queda alta) y el hueco libre se llena con otra tarjeta. El grid deja de ser simétrico.
          </p>
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

        <Section title="Guarniciones" colorAcento={colorAcento}>
          <CheckG k="ocultarCronometroGuarniciones" label="Ocultar cronómetro de guarniciones" help="Solo el panel derecho. Los platos principales conservan su reloj." {...checkGProps} />
          <CheckG k="ocultarCuadroGuarniciones" label="Quitar cuadro de la tarjeta" help="Lista de letras: - Arroz, PFrita, Ensal (Bistec)" {...checkGProps} />
          {configVisual.ocultarCuadroGuarniciones === true && (
            <CheckG
              k="cuadroGuarnicionSiHayNota"
              label="Poner cuadro si hay nota especial"
              help="La guarnición con observación o nota especial vuelve a tarjeta con marco; las que no tienen nota siguen juntas en lista."
              {...checkGProps}
              defaultOn
            />
          )}
          <CheckG
            k="ocultarBuscadorPlatos"
            label="Quitar buscador de platos y poner contador de guarniciones"
            help="Misma barra: el selector se queda a la izquierda. En el lugar del buscador aparece Arroz x1, Papa frita x3, Ensalada x2. Se guarda en el perfil."
            {...checkGProps}
            guardar={(patch) => guardar({
              ...patch,
              mostrarContadorGuarniciones: patch.ocultarBuscadorPlatos === true,
            })}
          />
          {configVisual.ocultarBuscadorPlatos === true && (
            <>
              <CheckG
                k="contadorGuarnicionesConPronombre"
                label="Contador con pronombre"
                help="Usa el apodo del complemento (PFrita, Ensal) en vez del nombre largo."
                {...checkGProps}
              />
              <ColorG
                key="colorTextoContadorGuarniciones"
                k="colorTextoContadorGuarniciones"
                label="Color contador"
                fallback={colorTextoSecundario}
                {...colorGProps}
              />
              <label style={lbl}>
                Tamaño contador (px)
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <BtnStep
                    onClick={() => guardar({
                      tamanioFuenteContadorGuarniciones: Math.max(
                        10,
                        (Number(configVisual.tamanioFuenteContadorGuarniciones) || 13) - 1
                      ),
                    })}
                    colorAcento={colorAcento}
                    colorTexto={colorTextoPrincipal}
                  >−</BtnStep>
                  <input
                    type="number"
                    min={10}
                    max={36}
                    value={configVisual.tamanioFuenteContadorGuarniciones ?? 13}
                    onChange={(e) => guardar({
                      tamanioFuenteContadorGuarniciones: Math.min(36, Math.max(10, Number(e.target.value) || 13)),
                    })}
                    style={{ ...inp, width: '56px', textAlign: 'center' }}
                  />
                  <BtnStep
                    onClick={() => guardar({
                      tamanioFuenteContadorGuarniciones: Math.min(
                        36,
                        (Number(configVisual.tamanioFuenteContadorGuarniciones) || 13) + 1
                      ),
                    })}
                    colorAcento={colorAcento}
                    colorTexto={colorTextoPrincipal}
                  >+</BtnStep>
                  <button
                    type="button"
                    onClick={() => guardar({ tamanioFuenteContadorGuarniciones: null })}
                    title="Tamaño automático"
                    style={{ ...inp, cursor: 'pointer', padding: '6px 8px' }}
                  >
                    Auto
                  </button>
                </div>
              </label>
              <label style={lbl}>
                Fuente contador
                <select
                  value={configVisual.fuenteFamiliaContadorGuarniciones || ''}
                  onChange={(e) => guardar({ fuenteFamiliaContadorGuarniciones: e.target.value || null })}
                  style={{ ...inp, minWidth: '160px' }}
                >
                  <option value="">Heredar</option>
                  {FUENTES_DISPONIBLES.map((f) => (
                    <option key={f.id} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </label>
              <SelectorContadorComplementos
                configVisual={configVisual}
                guardar={guardar}
                getToken={getToken}
                opcionesLive={opcionesContadorLive}
                colorAcento={colorAcento}
                colorTextoPrincipal={colorTextoPrincipal}
                colorTextoSecundario={colorTextoSecundario}
                lbl={lbl}
                inp={inp}
              />
            </>
          )}
          <label style={lbl}>
            Partición platos / guarniciones
            <select
              value={configVisual.orientacionSplit || 'vertical'}
              onChange={(e) => guardar({ orientacionSplit: e.target.value === 'horizontal' ? 'horizontal' : 'vertical' })}
              style={{ ...inp, minWidth: '220px' }}
            >
              <option value="vertical">Vertical (lado a lado, por defecto)</option>
              <option value="horizontal">Horizontal (una debajo de la otra)</option>
            </select>
          </label>
          <CheckG k="mostrarTitulosListasSplit" label="Mostrar títulos de listas" help="Barras PLATOS / Lista de Guarniciones. Solo con split 50/50." {...checkGProps} />
          <CheckG k="mostrarPronombreCocineroGuarnicion" label="Pronombre del cocinero junto al plato referencial" help="Siempre a la derecha: (Bistec) C1. Es quien atiende el plato principal, no la guarnición. El código (C1) se edita en Personalizar cocineros. Se guarda en el perfil." {...checkGProps} defaultOn />
          <CheckG
            k="notasJuntoAGuarniciones"
            label="Nota especial junto a las guarniciones"
            help="Marcado por defecto. La observación o nota del plato va en el cuadro de guarniciones. Si el plato no tiene guarnición, va junto al cuadro del plato. Oculta la franja de notas al pie."
            {...checkGProps}
            defaultOn
          />
          {configVisual.notasJuntoAGuarniciones === false && (
            <CheckG k="mostrarTablaNotas" label="Mostrar notas del mozo al pie" help="Franja fija abajo: Notas: - Piña (Bistec) C1. Observaciones de comanda y nota especial del plato. Se guarda en el perfil." {...checkGProps} defaultOn />
          )}
          <label style={lbl}>
            Grosor línea split (px)
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <BtnStep
                onClick={() => guardar({ grosorSeparadorSplit: Math.max(1, (Number(configVisual.grosorSeparadorSplit) || 2) - 1) })}
                colorAcento={colorAcento}
                colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={1}
                max={16}
                value={configVisual.grosorSeparadorSplit ?? 2}
                onChange={(e) => guardar({ grosorSeparadorSplit: Math.min(16, Math.max(1, Number(e.target.value) || 2)) })}
                style={{ ...inp, width: '56px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => guardar({ grosorSeparadorSplit: Math.min(16, (Number(configVisual.grosorSeparadorSplit) || 2) + 1) })}
                colorAcento={colorAcento}
                colorTexto={colorTextoPrincipal}
              >+</BtnStep>
            </div>
          </label>
          <ColorG key="colorSeparadorSplit" k="colorSeparadorSplit" label="Color línea split" fallback={colorAcento} {...colorGProps} />
          {configVisual.mostrarTitulosListasSplit === true && (
            <>
              <label style={lbl}>
                Título lista platos
                <input
                  type="text"
                  value={configVisual.tituloListaPlatos ?? 'PLATOS'}
                  onChange={(e) => guardar({ tituloListaPlatos: e.target.value })}
                  style={{ ...inp, minWidth: '140px' }}
                />
              </label>
              <label style={lbl}>
                Título lista guarniciones
                <input
                  type="text"
                  value={configVisual.tituloListaGuarniciones ?? 'Lista de Guarniciones'}
                  onChange={(e) => guardar({ tituloListaGuarniciones: e.target.value })}
                  style={{ ...inp, minWidth: '180px' }}
                />
              </label>
              <label style={lbl}>
                Alinear títulos
                <select
                  value={configVisual.alinearTituloListaSplit || 'izquierda'}
                  onChange={(e) => guardar({ alinearTituloListaSplit: e.target.value })}
                  style={{ ...inp, minWidth: '120px' }}
                >
                  <option value="izquierda">Izquierda</option>
                  <option value="centro">Centro</option>
                  <option value="derecha">Derecha</option>
                </select>
              </label>
              <ColorG key="colorTituloListaSplit" k="colorTituloListaSplit" label="Color títulos" fallback={colorTextoPrincipal} {...colorGProps} />
              <label style={lbl}>
                Tamaño títulos (px)
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <BtnStep
                    onClick={() => guardar({ tamanioTituloListaSplit: Math.max(10, (Number(configVisual.tamanioTituloListaSplit) || 13) - 1) })}
                    colorAcento={colorAcento}
                    colorTexto={colorTextoPrincipal}
                  >−</BtnStep>
                  <input
                    type="number"
                    min={10}
                    max={48}
                    value={configVisual.tamanioTituloListaSplit ?? 13}
                    onChange={(e) => guardar({ tamanioTituloListaSplit: Math.min(48, Math.max(10, Number(e.target.value) || 13)) })}
                    style={{ ...inp, width: '56px', textAlign: 'center' }}
                  />
                  <BtnStep
                    onClick={() => guardar({ tamanioTituloListaSplit: Math.min(48, (Number(configVisual.tamanioTituloListaSplit) || 13) + 1) })}
                    colorAcento={colorAcento}
                    colorTexto={colorTextoPrincipal}
                  >+</BtnStep>
                </div>
              </label>
              <label style={lbl}>
                Peso títulos
                <select
                  value={configVisual.pesoTituloListaSplit || '800'}
                  onChange={(e) => guardar({ pesoTituloListaSplit: e.target.value })}
                  style={{ ...inp, minWidth: '120px' }}
                >
                  <option value="400">Normal</option>
                  <option value="600">Semi-negrita</option>
                  <option value="700">Negrita</option>
                  <option value="800">Extra negrita</option>
                  <option value="900">Máximo</option>
                </select>
              </label>
              <label style={lbl}>
                Fuente títulos
                <select
                  value={configVisual.fuenteFamiliaTituloListaSplit || ''}
                  onChange={(e) => guardar({ fuenteFamiliaTituloListaSplit: e.target.value || null })}
                  style={{ ...inp, minWidth: '160px' }}
                >
                  <option value="">Heredar</option>
                  {FUENTES_DISPONIBLES.map((f) => (
                    <option key={f.id} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {(configVisual.notasJuntoAGuarniciones !== false || configVisual.mostrarTablaNotas !== false) && (
            <>
              {configVisual.notasJuntoAGuarniciones === false && (
              <label style={lbl}>
                Prefijo notas
                <input
                  type="text"
                  value={configVisual.tituloTablaNotas ?? 'Notas:'}
                  onChange={(e) => guardar({ tituloTablaNotas: e.target.value })}
                  style={{ ...inp, minWidth: '100px' }}
                />
              </label>
              )}
              <ColorG key="colorTextoNotas" k="colorTextoNotas" label="Color notas" fallback={colorTextoSecundario} {...colorGProps} />
              <label style={lbl}>
                Tamaño notas (px)
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <BtnStep
                    onClick={() => guardar({ tamanioFuenteNotas: Math.max(10, (Number(configVisual.tamanioFuenteNotas) || 14) - 1) })}
                    colorAcento={colorAcento}
                    colorTexto={colorTextoPrincipal}
                  >−</BtnStep>
                  <input
                    type="number"
                    min={10}
                    max={36}
                    value={configVisual.tamanioFuenteNotas ?? 14}
                    onChange={(e) => guardar({ tamanioFuenteNotas: Math.min(36, Math.max(10, Number(e.target.value) || 14)) })}
                    style={{ ...inp, width: '56px', textAlign: 'center' }}
                  />
                  <BtnStep
                    onClick={() => guardar({ tamanioFuenteNotas: Math.min(36, (Number(configVisual.tamanioFuenteNotas) || 14) + 1) })}
                    colorAcento={colorAcento}
                    colorTexto={colorTextoPrincipal}
                  >+</BtnStep>
                </div>
              </label>
              <label style={lbl}>
                Peso notas
                <select
                  value={configVisual.pesoFuenteNotas || '600'}
                  onChange={(e) => guardar({ pesoFuenteNotas: e.target.value })}
                  style={{ ...inp, minWidth: '120px' }}
                >
                  <option value="400">Normal</option>
                  <option value="600">Semi-negrita</option>
                  <option value="700">Negrita</option>
                  <option value="800">Extra negrita</option>
                </select>
              </label>
              <label style={lbl}>
                Fuente notas
                <select
                  value={configVisual.fuenteFamiliaNotas || ''}
                  onChange={(e) => guardar({ fuenteFamiliaNotas: e.target.value || null })}
                  style={{ ...inp, minWidth: '160px' }}
                >
                  <option value="">Heredar</option>
                  {FUENTES_DISPONIBLES.map((f) => (
                    <option key={f.id} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </label>
              {configVisual.notasJuntoAGuarniciones === false && (
              <label style={lbl}>
                Alinear notas
                <select
                  value={configVisual.alinearTablaNotas || 'izquierda'}
                  onChange={(e) => guardar({ alinearTablaNotas: e.target.value })}
                  style={{ ...inp, minWidth: '120px' }}
                >
                  <option value="izquierda">Izquierda</option>
                  <option value="centro">Centro</option>
                  <option value="derecha">Derecha</option>
                </select>
              </label>
              )}
            </>
          )}
          <label style={lbl}>
            Referencia al plato principal
            <select
              value={configVisual.referenciaPadreGuarnicion || 'de'}
              onChange={(e) => guardar({ referenciaPadreGuarnicion: e.target.value })}
              style={{ ...inp, minWidth: '160px' }}
            >
              <option value="de">de Bistec</option>
              <option value="nuda">Bistec (sin «de»)</option>
              <option value="parentesis">(Bistec)</option>
              <option value="ocultar">Ocultar</option>
            </select>
          </label>
          <ColorG
            key="colorTextoPadreGuarnicion"
            k="colorTextoPadreGuarnicion"
            label="Color letra plato referencial"
            fallback={colorTextoSecundario}
            {...colorGProps}
          />
          <label style={lbl}>
            Tamaño letra plato referencial (px)
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <BtnStep
                onClick={() => guardar({
                  tamanioFuentePadreGuarnicion: Math.max(
                    MONITOR_TIPOGRAFIA.DETALLE_MIN,
                    (Number(configVisual.tamanioFuentePadreGuarnicion) || Number(configVisual.tamanioFuenteDetalle) || 20) - 2
                  ),
                })}
                colorAcento={colorAcento}
                colorTexto={colorTextoPrincipal}
              >−</BtnStep>
              <input
                type="number"
                min={MONITOR_TIPOGRAFIA.DETALLE_MIN}
                max={MONITOR_TIPOGRAFIA.DETALLE_MAX}
                value={configVisual.tamanioFuentePadreGuarnicion ?? configVisual.tamanioFuenteDetalle ?? 20}
                onChange={(e) => guardar({
                  tamanioFuentePadreGuarnicion: Math.min(
                    MONITOR_TIPOGRAFIA.DETALLE_MAX,
                    Math.max(MONITOR_TIPOGRAFIA.DETALLE_MIN, Number(e.target.value) || MONITOR_TIPOGRAFIA.DETALLE_MIN)
                  ),
                })}
                style={{ ...inp, width: '64px', textAlign: 'center' }}
              />
              <BtnStep
                onClick={() => guardar({
                  tamanioFuentePadreGuarnicion: Math.min(
                    MONITOR_TIPOGRAFIA.DETALLE_MAX,
                    (Number(configVisual.tamanioFuentePadreGuarnicion) || Number(configVisual.tamanioFuenteDetalle) || 20) + 2
                  ),
                })}
                colorAcento={colorAcento}
                colorTexto={colorTextoPrincipal}
              >+</BtnStep>
              <button
                type="button"
                onClick={() => guardar({ tamanioFuentePadreGuarnicion: null })}
                title="Volver al tamaño de detalle de platos"
                style={{ ...inp, cursor: 'pointer', padding: '6px 8px' }}
              >
                Heredar
              </button>
            </div>
            <span style={{ fontSize: '11px', color: colorTextoSecundario }}>
              Independiente del nombre de la guarnición. Se guarda en el perfil.
            </span>
          </label>
          {configVisual.mostrarPronombreCocineroGuarnicion !== false && (
            <>
              <CheckG
                k="heredarEstiloPronombrePadre"
                label="Pronombre con el mismo estilo que el plato referencial"
                help="Marcado: C1 usa color, tamaño y fuente de (Bistec). Destildar para personalizarlos aparte."
                {...checkGProps}
                defaultOn
              />
              {configVisual.heredarEstiloPronombrePadre === false && (
                <>
                  <ColorG
                    key="colorTextoPronombreGuarnicion"
                    k="colorTextoPronombreGuarnicion"
                    label="Color pronombre (C1)"
                    fallback={configVisual.colorTextoPadreGuarnicion || colorTextoSecundario}
                    {...colorGProps}
                  />
                  <label style={lbl}>
                    Tamaño pronombre (px)
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <BtnStep
                        onClick={() => guardar({
                          tamanioFuentePronombreGuarnicion: Math.max(
                            MONITOR_TIPOGRAFIA.DETALLE_MIN,
                            (Number(configVisual.tamanioFuentePronombreGuarnicion) || Number(configVisual.tamanioFuentePadreGuarnicion) || Number(configVisual.tamanioFuenteDetalle) || 20) - 2
                          ),
                        })}
                        colorAcento={colorAcento}
                        colorTexto={colorTextoPrincipal}
                      >−</BtnStep>
                      <input
                        type="number"
                        min={MONITOR_TIPOGRAFIA.DETALLE_MIN}
                        max={MONITOR_TIPOGRAFIA.DETALLE_MAX}
                        value={configVisual.tamanioFuentePronombreGuarnicion ?? configVisual.tamanioFuentePadreGuarnicion ?? configVisual.tamanioFuenteDetalle ?? 20}
                        onChange={(e) => guardar({
                          tamanioFuentePronombreGuarnicion: Math.min(
                            MONITOR_TIPOGRAFIA.DETALLE_MAX,
                            Math.max(MONITOR_TIPOGRAFIA.DETALLE_MIN, Number(e.target.value) || MONITOR_TIPOGRAFIA.DETALLE_MIN)
                          ),
                        })}
                        style={{ ...inp, width: '64px', textAlign: 'center' }}
                      />
                      <BtnStep
                        onClick={() => guardar({
                          tamanioFuentePronombreGuarnicion: Math.min(
                            MONITOR_TIPOGRAFIA.DETALLE_MAX,
                            (Number(configVisual.tamanioFuentePronombreGuarnicion) || Number(configVisual.tamanioFuentePadreGuarnicion) || Number(configVisual.tamanioFuenteDetalle) || 20) + 2
                          ),
                        })}
                        colorAcento={colorAcento}
                        colorTexto={colorTextoPrincipal}
                      >+</BtnStep>
                    </div>
                  </label>
                  <label style={lbl}>
                    Fuente pronombre
                    <select
                      value={configVisual.fuenteFamiliaPronombreGuarnicion || ''}
                      onChange={(e) => guardar({ fuenteFamiliaPronombreGuarnicion: e.target.value || null })}
                      style={{ ...inp, minWidth: '160px' }}
                    >
                      <option value="">Heredar</option>
                      {FUENTES_DISPONIBLES.map((f) => (
                        <option key={f.id} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </>
          )}
          <div style={{ marginTop: '6px', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${colorAcento}33`, background: `${colorAcento}0d`, width: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: diferenciarDiseno ? '8px' : '0' }}>
              <input
                type="checkbox"
                checked={diferenciarDiseno}
                onChange={(e) => toggleDiferenciar(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: colorAcento, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', color: colorTextoPrincipal, fontWeight: 700 }}>
                🥗 Diferenciar diseño de lista de guarniciones
              </span>
            </label>
            {!diferenciarDiseno && (
              <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '4px 0 0 24px' }}>
                Desactivado: las guarniciones heredan fuente, color y columnas de los platos.
              </p>
            )}
            {diferenciarDiseno && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginLeft: '8px', marginTop: '8px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4].map((cols) => {
                    const activo = columnasGuarnicionesActuales === cols;
                    return (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => setColumnasGuarniciones(cols)}
                        title={`${cols} columna${cols > 1 ? 's' : ''}`}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: `2px solid ${activo ? colorAcento : `${colorAcento}33`}`,
                          background: activo ? `${colorAcento}22` : 'transparent',
                          color: activo ? colorAcento : colorTextoSecundario,
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: activo ? 700 : 500,
                        }}
                      >
                        {cols}
                      </button>
                    );
                  })}
                  <span style={{ fontSize: '11px', color: colorTextoSecundario }}>Columnas (split ON)</span>
                </div>
                <label style={{ ...lbl, minWidth: '160px' }}>
                  Tipo de fuente
                  <select
                    value={fuenteGuarnicionActual}
                    onChange={(e) => {
                      if (!e.target.value) {
                        guardar({ fuenteFamiliaGuarnicion: null });
                        return;
                      }
                      const f = FUENTES_DISPONIBLES.find(x => x.id === e.target.value);
                      if (f) guardar({ fuenteFamiliaGuarnicion: f.value });
                    }}
                    style={{ ...inp, minWidth: '160px' }}
                  >
                    <option value="">Heredar (platos)</option>
                    {FUENTES_DISPONIBLES.map((f) => (
                      <option key={f.id} value={f.id} style={{ fontFamily: f.value }}>{f.label}</option>
                    ))}
                  </select>
                </label>
                <label style={lbl}>
                  Tamaño (px)
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <BtnStep
                      onClick={() => guardar({
                        tamanioFuenteGuarnicion: Math.max(
                          MONITOR_TIPOGRAFIA.PLATO_MIN,
                          (Number(configVisual.tamanioFuenteGuarnicion) || Number(configVisual.tamanioFuentePlato) || 36) - 2
                        ),
                      })}
                      colorAcento={colorAcento}
                      colorTexto={colorTextoPrincipal}
                    >−</BtnStep>
                    <input
                      type="number"
                      min={MONITOR_TIPOGRAFIA.PLATO_MIN}
                      max={MONITOR_TIPOGRAFIA.PLATO_MAX}
                      value={configVisual.tamanioFuenteGuarnicion ?? configVisual.tamanioFuentePlato ?? 36}
                      onChange={(e) => guardar({
                        tamanioFuenteGuarnicion: Math.min(
                          MONITOR_TIPOGRAFIA.PLATO_MAX,
                          Math.max(MONITOR_TIPOGRAFIA.PLATO_MIN, Number(e.target.value) || MONITOR_TIPOGRAFIA.PLATO_MIN)
                        ),
                      })}
                      style={{ ...inp, width: '64px', textAlign: 'center' }}
                    />
                    <BtnStep
                      onClick={() => guardar({
                        tamanioFuenteGuarnicion: Math.min(
                          MONITOR_TIPOGRAFIA.PLATO_MAX,
                          (Number(configVisual.tamanioFuenteGuarnicion) || Number(configVisual.tamanioFuentePlato) || 36) + 2
                        ),
                      })}
                      colorAcento={colorAcento}
                      colorTexto={colorTextoPrincipal}
                    >+</BtnStep>
                    <button
                      type="button"
                      onClick={() => guardar({ tamanioFuenteGuarnicion: null })}
                      style={{ ...inp, cursor: 'pointer', padding: '6px 8px' }}
                    >
                      Heredar
                    </button>
                  </div>
                </label>
                <label style={lbl}>
                  Peso
                  <select
                    value={configVisual.pesoFuenteGuarnicion || ''}
                    onChange={(e) => guardar({ pesoFuenteGuarnicion: e.target.value || null })}
                    style={{ ...inp, minWidth: '120px' }}
                  >
                    <option value="">Heredar</option>
                    <option value="400">Normal</option>
                    <option value="600">Semi-negrita</option>
                    <option value="700">Negrita</option>
                    <option value="800">Extra negrita</option>
                    <option value="900">Máximo</option>
                  </select>
                </label>
                <ColorG key="colorTextoGuarnicion" k="colorTextoGuarnicion" label="Color texto" fallback={colorTextoPrincipal} {...colorGProps} />
                <ColorG key="colorFondoGuarnicion" k="colorFondoGuarnicion" label="Fondo tarjeta" fallback={configVisual.colorFilaPlato || '#1a1a28'} {...colorGProps} />
                <ColorG key="colorAcentoGuarnicion" k="colorAcentoGuarnicion" label="Acento" fallback={colorAcento} {...colorGProps} />
                <label style={lbl}>
                  Espaciado filas
                  <select
                    value={configVisual.espaciadoFilasGuarnicion || ''}
                    onChange={(e) => guardar({ espaciadoFilasGuarnicion: e.target.value || null })}
                    style={{ ...inp, minWidth: '120px' }}
                  >
                    <option value="">Heredar</option>
                    <option value="unido">Unido</option>
                    <option value="compacto">Compacto</option>
                    <option value="normal">Normal</option>
                    <option value="amplio">Amplio</option>
                  </select>
                </label>
              </div>
            )}
          </div>
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
          <DimPx
            label="Ancho del cuadro"
            value={configVisual.numeroSecAncho}
            onChange={(v) => guardar({ numeroSecAncho: v })}
            min={20} max={160}
            inp={inp} lbl={lbl}
            colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
          />
          <DimPx
            label="Alto del cuadro"
            value={configVisual.numeroSecAlto}
            onChange={(v) => guardar({ numeroSecAlto: v })}
            min={20} max={160}
            inp={inp} lbl={lbl}
            colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
          />
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '-4px 0 4px', width: '100%' }}>
            Cuadrado = esquinas rectas. Redondeado / píldora = con esquinas. Ancho y alto se pueden estirar por separado.
          </p>
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

        {/* Cronómetro (chip de temporizador) */}
        <Section title="Cronómetro (chip)" colorAcento={colorAcento}>
          {[
            ['cronometroColor', 'Color texto', configVisual.cronometroColor, '#d4af37'],
            ['cronometroContorno', 'Color contorno', configVisual.cronometroContorno, '#d4af37'],
            ['cronometroFondo', 'Color fondo', configVisual.cronometroFondo, 'transparent'],
            ['cronometroContornoLetra', 'Contorno de letra', configVisual.cronometroContornoLetra, '#000000'],
            ['cronometroFondoTexto', 'Fondo de texto', configVisual.cronometroFondoTexto, '#fbbf24'],
          ].map(([key, text, val, fallback]) => (
            <label key={key} style={lbl}>
              {text}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={(val || fallback) === 'transparent' ? '#000000' : (val || fallback).toString().slice(0, 7)}
                  onChange={e => guardar({ [key]: e.target.value })}
                  style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
                {key === 'cronometroFondo' || key === 'cronometroFondoTexto' ? (
                  <button
                    type="button"
                    onClick={() => guardar({ [key]: 'transparent' })}
                    title="Transparente"
                    style={{
                      ...inp,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: val === 'transparent' ? `${colorAcento}33` : 'transparent',
                    }}
                  >
                    ∅
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => guardar({ [key]: null })}
                  title="Automático / sin fondo"
                  style={{
                    ...inp,
                    cursor: 'pointer',
                    padding: '6px 10px',
                    background: val == null ? `${colorAcento}33` : 'transparent',
                  }}
                >
                  Auto
                </button>
              </div>
            </label>
          ))}
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '4px 0 0', width: '100%' }}>
            "Fondo de texto" pinta un resaltado detrás de las cifras (como subrayado de texto en Word), independiente del fondo del cuadro.
          </p>
          <label style={lbl}>
            Forma del cuadro
            <select
              value={configVisual.cronometroForma || 'redondeado'}
              onChange={e => guardar({ cronometroForma: e.target.value })}
              style={{ ...inp, minWidth: '140px' }}
            >
              <option value="redondeado">Redondeado (con esquinas)</option>
              <option value="cuadrado">Cuadrado (sin esquinas)</option>
              <option value="pildora">Píldora</option>
            </select>
          </label>
          <DimPx
            label="Ancho del cuadro"
            value={configVisual.cronometroAncho}
            onChange={(v) => guardar({ cronometroAncho: v })}
            min={80} max={320}
            inp={inp} lbl={lbl}
            colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
          />
          <DimPx
            label="Alto del cuadro"
            value={configVisual.cronometroAlto}
            onChange={(v) => guardar({ cronometroAlto: v })}
            min={28} max={160}
            inp={inp} lbl={lbl}
            colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
          />
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
            ['colorAcento', 'Acento'],
            ['colorAlertaAmarilla', 'Alerta amarilla'],
            ['colorAlertaRoja', 'Alerta roja'],
          ].map(([key, text]) => (
            <label key={key} style={lbl}>
              {text}
              <input
                type="color"
                value={String(configVisual[key] || '#ffffff').slice(0, 7)}
                onChange={e => guardar({ [key]: e.target.value })}
                style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </label>
          ))}
          <label style={lbl}>
            Nombre del plato
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="color"
                value={String(configVisual.colorTextoPlato || configVisual.colorTextoPrincipal || '#ffffff').slice(0, 7)}
                onChange={e => guardar({ colorTextoPlato: e.target.value })}
                style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
              <button
                type="button"
                onClick={() => guardar({ colorTextoPlato: null })}
                title="Usar texto principal"
                style={{
                  ...inp,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  background: !configVisual.colorTextoPlato ? `${colorAcento}33` : undefined,
                }}
              >
                Auto
              </button>
            </div>
          </label>
          <label style={lbl}>
            Detalle (guarniciones)
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="color"
                value={String(configVisual.colorTextoDetalle || configVisual.colorTextoSecundario || '#9ca3af').slice(0, 7)}
                onChange={e => guardar({ colorTextoDetalle: e.target.value })}
                style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
              <button
                type="button"
                onClick={() => guardar({ colorTextoDetalle: null })}
                title="Usar texto secundario"
                style={{
                  ...inp,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  background: !configVisual.colorTextoDetalle ? `${colorAcento}33` : undefined,
                }}
              >
                Auto
              </button>
            </div>
          </label>
          <label style={lbl}>
            Texto secundario
            <input
              type="color"
              value={String(configVisual.colorTextoSecundario || '#9ca3af').slice(0, 7)}
              onChange={e => guardar({ colorTextoSecundario: e.target.value })}
              style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
          </label>
          <label style={lbl}>
            Fondo tarjeta
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="color"
                value={(configVisual.colorFondoTarjeta || configVisual.colorFilaPlato || '#1a1a28').toString().slice(0, 7)}
                onChange={(e) => guardar({ colorFondoTarjeta: e.target.value })}
                style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
              <button
                type="button"
                onClick={() => guardar({ colorFondoTarjeta: null })}
                title="Usar color de fila"
                style={{
                  ...inp,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  background: !configVisual.colorFondoTarjeta ? `${colorAcento}33` : undefined,
                  borderColor: !configVisual.colorFondoTarjeta ? colorAcento : undefined,
                }}
              >
                Auto
              </button>
            </div>
          </label>
          <label style={lbl}>
            Color degradado tarjeta
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="color"
                value={(configVisual.colorDegradadoTarjeta || '#000000').toString().slice(0, 7)}
                onChange={e => guardar({ colorDegradadoTarjeta: e.target.value })}
                style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
              <button
                type="button"
                onClick={() => guardar({ colorDegradadoTarjeta: null })}
                title="Automático (según alerta)"
                style={{
                  ...inp,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  background: configVisual.colorDegradadoTarjeta == null ? `${colorAcento}33` : 'transparent',
                }}
              >
                Auto
              </button>
            </div>
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.degradadoTarjeta !== false}
              onChange={e => guardar({ degradadoTarjeta: e.target.checked })}
            />
            Degradado de tarjeta (desactivar = color fijo)
          </label>
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

        {/* Tarjetas (nuevas herramientas) */}
        <Section title="Tarjetas" colorAcento={colorAcento}>
          <label style={lbl}>
            Esquinas de la tarjeta
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: colorTextoSecundario, minWidth: '58px' }}>Cuadrada</span>
              <input
                type="range"
                min={0}
                max={28}
                step={1}
                value={configVisual.tarjetaRadio ?? 14}
                onChange={e => guardar({ tarjetaRadio: Number(e.target.value) })}
                style={{ width: '140px', accentColor: colorAcento }}
              />
              <span style={{ fontSize: '11px', color: colorTextoSecundario, minWidth: '58px' }}>Redonda</span>
              <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '36px' }}>
                {configVisual.tarjetaRadio ?? 14}px
              </span>
            </div>
          </label>
          <DimPx
            label="Relleno interno (espacio dentro de la tarjeta)"
            value={configVisual.tarjetaPadding}
            onChange={(v) => guardar({ tarjetaPadding: v })}
            min={0} max={48}
            inp={inp} lbl={lbl}
            colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
          />
          <DimPx
            label="Espacio entre nombre y cronómetro"
            value={configVisual.tarjetaGap}
            onChange={(v) => guardar({ tarjetaGap: v == null ? 16 : v })}
            min={0} max={48}
            inp={inp} lbl={lbl}
            colorAcento={colorAcento} colorFondo={colorFondo} colorTexto={colorTextoPrincipal}
          />
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '-4px 0 8px', width: '100%' }}>
            0 px de esquinas = tarjeta cuadrada. Sube el slider para redondear. Auto en relleno usa el espaciado de lista.
          </p>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.mostrarComplementos !== false}
              onChange={e => guardar({ mostrarComplementos: e.target.checked })}
            />
            Mostrar nombres de guarniciones en el plato principal
          </label>
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '-2px 0 6px', width: '100%' }}>
            En Ver Cocina, la tarjeta del plato (ej. Bistec) lista Arroz, papa frita, ensalada. Desactívalo para dejar solo el nombre del plato. No afecta la lista de guarniciones del panel derecho.
          </p>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.quitarNombreCocineroTarjeta === true}
              onChange={e => guardar({ quitarNombreCocineroTarjeta: e.target.checked })}
            />
            Quitar nombre de cocinera en la tarjeta
          </label>
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '-2px 0 6px', width: '100%' }}>
            Saca el nombre del cuerpo de la tarjeta y lo mueve a una barra superior compacta dentro de la misma tarjeta.
          </p>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.ocultarAtencionUrgente === true}
              onChange={e => guardar({ ocultarAtencionUrgente: e.target.checked })}
            />
            Eliminar Atención y Urgente
          </label>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.animacionesAlerta !== false}
              onChange={e => guardar({ animacionesAlerta: e.target.checked })}
            />
            Animaciones de alerta (color)
          </label>
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '-2px 0 6px', width: '100%' }}>
            Anima el borde/fondo de la tarjeta con colores cuando entra en Atención y Urgente.
          </p>
          {configVisual.animacionesAlerta !== false && (
            <>
              <label style={lbl}>
                Animación Atención
                <select
                  value={configVisual.animacionAtencion || 'resplandorUrgente'}
                  onChange={e => guardar({ animacionAtencion: e.target.value })}
                  style={{ ...inp, minWidth: '220px' }}
                >
                  {ANIMACIONES_ALERTA.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </label>
              <label style={lbl}>
                Animación Urgente
                <select
                  value={configVisual.animacionUrgente || 'urgentePulse'}
                  onChange={e => guardar({ animacionUrgente: e.target.value })}
                  style={{ ...inp, minWidth: '220px' }}
                >
                  {ANIMACIONES_ALERTA.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </label>
              <label style={lbl}>
                Color anim. Atención
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={(configVisual.colorAnimacionAtencion || configVisual.colorAlertaAmarilla || '#fbbf24').toString().slice(0, 7)}
                    onChange={e => guardar({ colorAnimacionAtencion: e.target.value })}
                    style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <button
                    type="button"
                    onClick={() => guardar({ colorAnimacionAtencion: null })}
                    title="Usar color de alerta amarillo"
                    style={{
                      ...inp,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: configVisual.colorAnimacionAtencion == null ? `${colorAcento}33` : 'transparent',
                    }}
                  >
                    Auto
                  </button>
                </div>
              </label>
              <label style={lbl}>
                Color anim. Urgente
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={(configVisual.colorAnimacionUrgente || configVisual.colorAlertaRoja || '#ef4444').toString().slice(0, 7)}
                    onChange={e => guardar({ colorAnimacionUrgente: e.target.value })}
                    style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <button
                    type="button"
                    onClick={() => guardar({ colorAnimacionUrgente: null })}
                    title="Usar color de alerta rojo"
                    style={{
                      ...inp,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: configVisual.colorAnimacionUrgente == null ? `${colorAcento}33` : 'transparent',
                    }}
                  >
                    Auto
                  </button>
                </div>
              </label>
              <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '4px 0 0', width: '100%' }}>
                Emojis personalizados (solo para animaciones con iconos 🔥⚠️💥…)
              </p>
              <label style={lbl}>
                Emojis Atención
                <input
                  type="text"
                  placeholder="Ej: ⚠️🔥 (vacío = auto)"
                  value={configVisual.emojisAnimacionAtencion || ''}
                  onChange={e => guardar({ emojisAnimacionAtencion: e.target.value || null })}
                  style={{ ...inp, minWidth: '180px' }}
                />
              </label>
              <label style={lbl}>
                Tamaño emoji Atención (px)
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => guardar({ tamanioEmojiAtencion: null })}
                    style={{
                      ...inp,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: configVisual.tamanioEmojiAtencion == null ? `${colorAcento}33` : 'transparent',
                    }}
                  >Auto</button>
                  <input
                    type="number" min="10" max="160"
                    value={configVisual.tamanioEmojiAtencion ?? ''}
                    placeholder="auto"
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '') guardar({ tamanioEmojiAtencion: null });
                      else guardar({ tamanioEmojiAtencion: Math.min(160, Math.max(10, Number(v) || 10)) });
                    }}
                    style={{ ...inp, width: '64px', textAlign: 'center' }}
                  />
                </div>
              </label>
              <label style={lbl}>
                Cantidad emojis Atención
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => guardar({ cantidadEmojiAtencion: null })}
                    style={{
                      ...inp,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: configVisual.cantidadEmojiAtencion == null ? `${colorAcento}33` : 'transparent',
                    }}
                  >Auto</button>
                  <input
                    type="number" min="1" max="12"
                    value={configVisual.cantidadEmojiAtencion ?? ''}
                    placeholder="auto"
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '') guardar({ cantidadEmojiAtencion: null });
                      else guardar({ cantidadEmojiAtencion: Math.min(12, Math.max(1, Number(v) || 1)) });
                    }}
                    style={{ ...inp, width: '64px', textAlign: 'center' }}
                  />
                </div>
              </label>
              <label style={lbl}>
                Emojis Urgente
                <input
                  type="text"
                  placeholder="Ej: 💥☢️🔥 (vacío = auto)"
                  value={configVisual.emojisAnimacionUrgente || ''}
                  onChange={e => guardar({ emojisAnimacionUrgente: e.target.value || null })}
                  style={{ ...inp, minWidth: '180px' }}
                />
              </label>
              <label style={lbl}>
                Tamaño emoji Urgente (px)
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => guardar({ tamanioEmojiUrgente: null })}
                    style={{
                      ...inp,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: configVisual.tamanioEmojiUrgente == null ? `${colorAcento}33` : 'transparent',
                    }}
                  >Auto</button>
                  <input
                    type="number" min="10" max="160"
                    value={configVisual.tamanioEmojiUrgente ?? ''}
                    placeholder="auto"
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '') guardar({ tamanioEmojiUrgente: null });
                      else guardar({ tamanioEmojiUrgente: Math.min(160, Math.max(10, Number(v) || 10)) });
                    }}
                    style={{ ...inp, width: '64px', textAlign: 'center' }}
                  />
                </div>
              </label>
              <label style={lbl}>
                Cantidad emojis Urgente
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => guardar({ cantidadEmojiUrgente: null })}
                    style={{
                      ...inp,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: configVisual.cantidadEmojiUrgente == null ? `${colorAcento}33` : 'transparent',
                    }}
                  >Auto</button>
                  <input
                    type="number" min="1" max="12"
                    value={configVisual.cantidadEmojiUrgente ?? ''}
                    placeholder="auto"
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '') guardar({ cantidadEmojiUrgente: null });
                      else guardar({ cantidadEmojiUrgente: Math.min(12, Math.max(1, Number(v) || 1)) });
                    }}
                    style={{ ...inp, width: '64px', textAlign: 'center' }}
                  />
                </div>
              </label>
              <PreviewAnimacion
                nombre={configVisual.animacionAtencion || 'resplandorUrgente'}
                color={configVisual.colorAnimacionAtencion || configVisual.colorAlertaAmarilla || '#fbbf24'}
                colorFondo={colorFondo}
                colorTexto={colorTextoPrincipal}
                colorAcento={colorAcento}
                etiqueta="Atención"
                emojisCustom={configVisual.emojisAnimacionAtencion}
                sizeCustom={configVisual.tamanioEmojiAtencion}
                countCustom={configVisual.cantidadEmojiAtencion}
              />
              <PreviewAnimacion
                nombre={configVisual.animacionUrgente || 'urgentePulse'}
                color={configVisual.colorAnimacionUrgente || configVisual.colorAlertaRoja || '#ef4444'}
                colorFondo={colorFondo}
                colorTexto={colorTextoPrincipal}
                colorAcento={colorAcento}
                etiqueta="Urgente"
                emojisCustom={configVisual.emojisAnimacionUrgente}
                sizeCustom={configVisual.tamanioEmojiUrgente}
                countCustom={configVisual.cantidadEmojiUrgente}
              />
            </>
          )}
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.autoAgrandamiento === true}
              onChange={e => guardar({ autoAgrandamiento: e.target.checked })}
            />
            AutoAgrandamiento
          </label>
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '-2px 0 6px', width: '100%' }}>
            Las tarjetas reducen o aumentan su tamaño según cuántos platos haya en pantalla.
          </p>
          <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <input
              type="checkbox"
              checked={configVisual.autoAcomodamiento === true}
              onChange={e => guardar({ autoAcomodamiento: e.target.checked })}
            />
            AutoAcomodamiento
          </label>
          <p style={{ fontSize: '11px', color: colorTextoSecundario, margin: '-2px 0 0', width: '100%' }}>
            Cada tarjeta escala su tamaño según el largo de su texto (más letras = más grande, menos = más pequeña), respetando el número de columnas y llenando el 100% del espacio.
          </p>
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
            Guardar como / Sobrescribir / Guardar perfil del cocinero copian todas las opciones
            de Personalizar: tipografía, colores, tarjetas, cronómetros, animaciones, notas junto
            a guarniciones, cuadro si hay nota, y pronombre (C1) con estilo propio o heredado.
            Se aplican a los monitores desde Distribuir Cocina.
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
            color: configVisual.colorTextoPlato || configVisual.colorTextoPrincipal,
            wordBreak: 'break-word',
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
        {configVisual.mostrarComplementos !== false && (
          <div style={{
            fontSize: `${Math.min(configVisual.tamanioFuenteDetalle || 18, 18)}px`,
            color: configVisual.colorTextoDetalle || configVisual.colorTextoSecundario,
            fontWeight: 500,
            lineHeight: 1.25,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}>
            Arroz · Papa frita · Ensalada
          </div>
        )}
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
