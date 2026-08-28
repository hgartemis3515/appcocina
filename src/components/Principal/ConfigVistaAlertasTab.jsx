import React, { useState, useEffect } from 'react';
import { FaPalette, FaClock, FaSave, FaFolderOpen, FaTrash, FaPlus, FaBell, FaPlay, FaVolumeUp, FaVolumeDown } from 'react-icons/fa';
import { useConfig } from '../../contexts/ConfigContext';
import {
  TIEMPOS_ALERTA,
  DISENO_GRID,
  TAMANO_TARJETA,
  ORDENAMIENTO,
  PERFILES_PREDEFINIDOS,
} from '../../config/kdsConfigConstants';
import {
  ORDEN_COLA_FUENTES,
  ORDEN_COLA_TAMANO_MIN,
  ORDEN_COLA_TAMANO_MAX,
  ORDEN_COLA_DEFAULT,
  estiloNumeroOrdenKds,
  textoNumeroOrdenKds,
} from '../../utils/estiloNumeroOrdenKds';
import {
  KDS_TIMBRES,
  TIMBRE_DEFAULT,
  TIMBRE_VOLUMEN_DEFAULT,
  resolverTimbreClave,
  playKdsNotificationSound,
} from '../../utils/kdsNotificationSounds';

/**
 * Pestaña unificada Vista + Alertas de las tablas KDS,
 * con perfiles (crear / guardar / cargar / borrar).
 */
const ConfigVistaAlertasTab = ({ nightMode = true }) => {
  const {
    config,
    updateConfig,
    perfilActivo,
    perfilesVista,
    cargarPerfilVista,
    recargarPerfilesVista,
    crearPerfilVista,
    sobrescribirPerfilVista,
    eliminarPerfilVista,
    cargandoPerfilesVista,
    guardandoPerfilVista,
  } = useConfig();

  const [perfilSel, setPerfilSel] = useState(perfilActivo || '');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    recargarPerfilesVista();
  }, [recargarPerfilesVista]);

  useEffect(() => {
    if (perfilActivo) setPerfilSel(perfilActivo);
  }, [perfilActivo]);

  const textModal = nightMode ? 'text-white' : 'text-gray-900';
  const textSecondary = nightMode ? 'text-gray-400' : 'text-gray-600';
  const borderModal = nightMode ? 'border-gray-600' : 'border-gray-300';
  const inputBg = nightMode ? 'bg-gray-700' : 'bg-gray-100';
  const inputText = nightMode ? 'text-white' : 'text-gray-900';
  const cardBg = nightMode ? 'bg-gray-900/60' : 'bg-gray-50';

  const esCustom = perfilesVista.some((p) => p.id === perfilSel);

  const flash = (tipo, texto) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 2800);
  };

  const handleCrear = async () => {
    const nombre = window.prompt('Nombre del nuevo perfil de vista:');
    if (nombre === null) return;
    const r = await crearPerfilVista(nombre);
    if (!r.ok) {
      flash('err', r.error);
      return;
    }
    if (r.perfil?.id) setPerfilSel(r.perfil.id);
    flash('ok', `Perfil "${r.perfil?.nombre || nombre}" creado`);
  };

  const handleGuardar = async () => {
    if (!esCustom) {
      flash('err', 'Elige un perfil de tablas KDS para sobrescribir, o usa Crear perfil');
      return;
    }
    const p = perfilesVista.find((x) => x.id === perfilSel);
    if (!window.confirm(`¿Guardar la vista actual en "${p?.nombre}"?`)) return;
    const r = await sobrescribirPerfilVista(perfilSel);
    if (!r.ok) {
      flash('err', r.error);
      return;
    }
    flash('ok', 'Perfil guardado');
  };

  const handleCargar = () => {
    if (!perfilSel) {
      flash('err', 'Elige un perfil o una plantilla');
      return;
    }
    const ok = cargarPerfilVista(perfilSel);
    flash(ok ? 'ok' : 'err', ok ? 'Perfil cargado' : 'No se pudo cargar el perfil');
  };

  const handleBorrar = async () => {
    if (!esCustom) {
      flash('err', 'Solo se pueden borrar perfiles de tablas KDS');
      return;
    }
    const p = perfilesVista.find((x) => x.id === perfilSel);
    if (!window.confirm(`¿Eliminar el perfil "${p?.nombre}"?`)) return;
    const r = await eliminarPerfilVista(perfilSel);
    if (!r.ok) {
      flash('err', r.error);
      return;
    }
    setPerfilSel('');
    flash('ok', 'Perfil eliminado');
  };

  const btn = (extra) =>
    `px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${extra}`;

  return (
    <div className="space-y-5">
      <section className={`rounded-xl border ${borderModal} ${cardBg} p-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <h3 className={`text-lg font-bold ${textModal} flex items-center gap-2`}>
              <FaFolderOpen className="text-blue-400" />
              Perfiles de vista
            </h3>
            <p className={`${textSecondary} text-xs mt-0.5`}>
              Guarda en el servidor la tipografía, paginación, nombre de plato, número de orden, aviso de guarnición y alertas.
              En otro dispositivo aparecen aquí al abrir esta pantalla (solo perfiles de tablas KDS).
            </p>
          </div>
          {perfilActivo && (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Activo
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={perfilSel}
            onChange={(e) => setPerfilSel(e.target.value)}
            className={`flex-1 min-w-0 ${inputBg} ${inputText} p-2.5 rounded-lg border ${borderModal} text-sm`}
          >
            <option value="">Elegir perfil…</option>
            {perfilesVista.length > 0 && (
              <optgroup label="Tablas KDS">
                {perfilesVista.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Plantillas">
              {Object.values(PERFILES_PREDEFINIDOS).map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={handleCrear} disabled={guardandoPerfilVista} className={btn('bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2')}>
            <FaPlus /> Crear perfil
          </button>
          <button type="button" onClick={handleGuardar} disabled={!esCustom || guardandoPerfilVista} className={btn('bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2')}>
            <FaSave /> Guardar
          </button>
          <button type="button" onClick={handleCargar} disabled={!perfilSel || guardandoPerfilVista} className={btn(`${nightMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'} ${textModal} flex items-center gap-2`)}>
            <FaFolderOpen /> Cargar
          </button>
          <button type="button" onClick={handleBorrar} disabled={!esCustom || guardandoPerfilVista} className={btn('bg-red-600/80 hover:bg-red-600 text-white flex items-center gap-2')}>
            <FaTrash /> Borrar
          </button>
        </div>

        {cargandoPerfilesVista && (
          <p className={`${textSecondary} text-xs mt-2`}>Cargando perfiles del servidor…</p>
        )}
        {msg && (
          <p className={`text-sm mt-3 ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg.texto}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className={`rounded-xl border ${borderModal} ${cardBg} p-4`}>
          <h3 className={`text-lg font-bold ${textModal} mb-3 flex items-center gap-2`}>
            <FaPalette className="text-purple-400" />
            Tablero
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block col-span-2 sm:col-span-1">
              <span className={`block ${textModal} text-sm font-semibold mb-1`}>Tamaño de fuente</span>
              <select
                value={config.tamanoFuente}
                onChange={(e) => updateConfig({ tamanoFuente: parseInt(e.target.value, 10) })}
                className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
              >
                {Array.from(
                  { length: DISENO_GRID.FUENTE_MAX - DISENO_GRID.FUENTE_MIN + 1 },
                  (_, i) => DISENO_GRID.FUENTE_MIN + i
                ).map((size) => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
            </label>
            <label className="block col-span-2 sm:col-span-1">
              <span className={`block ${textModal} text-sm font-semibold mb-1`}>Densidad</span>
              <select
                value={config.tamanoTarjeta}
                onChange={(e) => updateConfig({ tamanoTarjeta: e.target.value })}
                className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
              >
                <option value={TAMANO_TARJETA.COMPACTO}>Compacto</option>
                <option value={TAMANO_TARJETA.MEDIANO}>Mediano</option>
                <option value={TAMANO_TARJETA.EXPANDIDO}>Expandido</option>
              </select>
            </label>
            <label className="block">
              <span className={`block ${textModal} text-sm font-semibold mb-1`}>Columnas</span>
              <input
                type="number"
                min={DISENO_GRID.COLUMNAS_MIN}
                max={DISENO_GRID.COLUMNAS_MAX}
                value={config.columnasGrid}
                onChange={(e) => updateConfig({
                  columnasGrid: Math.max(
                    DISENO_GRID.COLUMNAS_MIN,
                    Math.min(DISENO_GRID.COLUMNAS_MAX, parseInt(e.target.value, 10) || DISENO_GRID.COLUMNAS_DEFAULT)
                  ),
                })}
                className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
              />
            </label>
            <label className="block">
              <span className={`block ${textModal} text-sm font-semibold mb-1`}>Filas</span>
              <input
                type="number"
                min={DISENO_GRID.FILAS_MIN}
                max={DISENO_GRID.FILAS_MAX}
                value={config.filasGrid}
                onChange={(e) => updateConfig({
                  filasGrid: Math.max(
                    DISENO_GRID.FILAS_MIN,
                    Math.min(DISENO_GRID.FILAS_MAX, parseInt(e.target.value, 10) || DISENO_GRID.FILAS_DEFAULT)
                  ),
                })}
                className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
              />
            </label>
            <label className="block col-span-2">
              <span className={`block ${textModal} text-sm font-semibold mb-1`}>Orden de comandas</span>
              <select
                value={config.ordenamientoDefault}
                onChange={(e) => updateConfig({ ordenamientoDefault: e.target.value })}
                className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
              >
                <option value={ORDENAMIENTO.TIEMPO}>Por tiempo (más antiguo)</option>
                <option value={ORDENAMIENTO.PRIORIDAD}>Por prioridad</option>
                <option value={ORDENAMIENTO.MESA}>Por mesa</option>
                <option value={ORDENAMIENTO.CREACION}>Por creación</option>
              </select>
            </label>
          </div>
          <p className={`${textSecondary} text-xs mt-3`}>
            {config.columnasGrid}×{config.filasGrid} = {config.columnasGrid * config.filasGrid} comandas por página.
            El zoom del navegador decide cuántas caben en pantalla.
          </p>
        </section>

        <section className={`rounded-xl border ${borderModal} ${cardBg} p-4 flex flex-col gap-4`}>
          <h3 className={`text-lg font-bold ${textModal}`}>Tarjeta</h3>
          <fieldset className="space-y-2">
            <legend className={`${textModal} font-semibold`}>Nombre en las tarjetas</legend>
            <p className={`${textSecondary} text-xs`}>
              Elige si se pinta el nombre comercial del plato o el nombre de cocina (alias corto).
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="nombrePlatoKds"
                checked={config.usarNombreCocinaEnTablaKds === false}
                onChange={() => updateConfig({ usarNombreCocinaEnTablaKds: false })}
                className="w-4 h-4 mt-1 accent-blue-500"
              />
              <span>
                <span className={`${textModal} font-semibold block`}>Nombre del plato</span>
                <span className={`${textSecondary} text-xs`}>El nombre comercial del menú.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="nombrePlatoKds"
                checked={config.usarNombreCocinaEnTablaKds !== false}
                onChange={() => updateConfig({ usarNombreCocinaEnTablaKds: true })}
                className="w-4 h-4 mt-1 accent-blue-500"
              />
              <span>
                <span className={`${textModal} font-semibold block`}>Nombre de cocina</span>
                <span className={`${textSecondary} text-xs`}>El alias corto del plato. Si no hay alias, se usa el nombre comercial.</span>
              </span>
            </label>
          </fieldset>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.mostrarBadgeGuarnicion !== false}
              onChange={(e) => updateConfig({ mostrarBadgeGuarnicion: e.target.checked })}
              className="w-5 h-5 mt-0.5 rounded accent-lime-500"
            />
            <span>
              <span className={`${textModal} font-semibold block`}>Mostrar aviso verde “Guarnición”</span>
              <span className={`${textSecondary} text-xs block mt-0.5`}>
                Si lo desmarcas, se oculta el badge lime de las tablas KDS y se gana espacio.
                El cronómetro y el aviso de atraso se quedan.
              </span>
              {config.mostrarBadgeGuarnicion !== false && (
                <span className="inline-flex mt-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-lime-500/20 text-lime-300 border border-lime-400/40">
                  🥗 Guarnición
                </span>
              )}
            </span>
          </label>

          <fieldset className="space-y-3 pt-2 border-t border-gray-600/40">
            <legend className={`${textModal} font-semibold`}>Número de orden del plato</legend>
            <p className={`${textSecondary} text-xs`}>
              El #1, #2, #3 de cola en cada plato asignado (tarjeta de comanda). No es el número de la orden.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={`block ${textModal} text-sm font-semibold mb-1`}>Letra</span>
                <select
                  value={config.ordenColaFuente || ORDEN_COLA_DEFAULT.ordenColaFuente}
                  onChange={(e) => updateConfig({ ordenColaFuente: e.target.value })}
                  className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
                >
                  {ORDEN_COLA_FUENTES.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={`block ${textModal} text-sm font-semibold mb-1`}>Tamaño</span>
                <select
                  value={config.ordenColaTamano || ORDEN_COLA_DEFAULT.ordenColaTamano}
                  onChange={(e) => updateConfig({ ordenColaTamano: parseInt(e.target.value, 10) })}
                  className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
                >
                  {Array.from(
                    { length: ORDEN_COLA_TAMANO_MAX - ORDEN_COLA_TAMANO_MIN + 1 },
                    (_, i) => ORDEN_COLA_TAMANO_MIN + i
                  ).map((size) => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </label>
              <label className="block col-span-2 sm:col-span-1">
                <span className={`block ${textModal} text-sm font-semibold mb-1`}>Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#([0-9a-fA-F]{6})$/.test(config.ordenColaColor || '') ? config.ordenColaColor : ORDEN_COLA_DEFAULT.ordenColaColor}
                    onChange={(e) => updateConfig({ ordenColaColor: e.target.value })}
                    className="h-10 w-12 rounded border border-gray-500 bg-transparent cursor-pointer"
                    aria-label="Color del número de orden"
                  />
                  <input
                    type="text"
                    value={config.ordenColaColor || ORDEN_COLA_DEFAULT.ordenColaColor}
                    onChange={(e) => updateConfig({ ordenColaColor: e.target.value })}
                    className={`flex-1 ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal} font-mono text-sm`}
                    maxLength={7}
                    spellCheck={false}
                  />
                </div>
              </label>
              <label className="flex items-center gap-2 col-span-2 sm:col-span-1 self-end pb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.ordenColaMostrarHash !== false}
                  onChange={(e) => updateConfig({ ordenColaMostrarHash: e.target.checked })}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span className={`${textModal} text-sm font-semibold`}>Mostrar “#”</span>
              </label>
            </div>
            <span
              className="inline-flex px-1.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40"
              style={estiloNumeroOrdenKds(config)}
            >
              {textoNumeroOrdenKds(1, config)}
            </span>
          </fieldset>

          <div className={`${nightMode ? 'bg-gray-950' : 'bg-white'} rounded-lg border ${borderModal} p-3 mt-auto`}>
            <p className={`${textSecondary} text-[10px] uppercase tracking-wide mb-2`}>Preview</p>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 w-[132px]">
              <div className="bg-red-600 text-white text-center text-[10px] font-bold py-0.5 mb-1">ESPERA</div>
              <div className="text-red-400 font-bold" style={{ fontSize: `${Math.max(10, (config.tamanoFuente || 15) - 4)}px` }}>ORDEN #1</div>
              <div className="text-white text-xs">MESA #2</div>
              <div className="text-lime-200 text-[10px] mt-1 leading-tight flex items-center gap-1 flex-wrap">
                {config.usarNombreCocinaEnTablaKds !== false ? 'Bistec' : 'Bistec a lo pobre'}
                <span
                  className="inline-flex px-1 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40"
                  style={estiloNumeroOrdenKds(config)}
                >
                  {textoNumeroOrdenKds(1, config)}
                </span>
              </div>
              {config.mostrarBadgeGuarnicion !== false && (
                <span className="inline-flex mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-lime-500/20 text-lime-300 border border-lime-400/40">
                  🥗 Guarnición
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className={`rounded-xl border ${borderModal} ${cardBg} p-4`}>
        <h3 className={`text-lg font-bold ${textModal} mb-3 flex items-center gap-2`}>
          <FaClock className="text-yellow-400" />
          Alertas de tiempo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
            <label className={`block ${textModal} text-sm font-semibold mb-1`}>Amarilla</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={TIEMPOS_ALERTA.AMARILLA_MIN}
                max={TIEMPOS_ALERTA.AMARILLA_MAX}
                value={config.alertYellowMinutes}
                onChange={(e) => updateConfig({
                  alertYellowMinutes: Math.max(
                    TIEMPOS_ALERTA.AMARILLA_MIN,
                    Math.min(TIEMPOS_ALERTA.AMARILLA_MAX, parseInt(e.target.value, 10) || TIEMPOS_ALERTA.AMARILLA_DEFAULT)
                  ),
                })}
                className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
              />
              <span className={`${textSecondary} text-sm shrink-0`}>min</span>
            </div>
            <p className={`${textSecondary} text-xs mt-1`}>Precaución</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50">
            <label className={`block ${textModal} text-sm font-semibold mb-1`}>Roja</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={TIEMPOS_ALERTA.ROJA_MIN}
                max={TIEMPOS_ALERTA.ROJA_MAX}
                value={config.alertRedMinutes}
                onChange={(e) => updateConfig({
                  alertRedMinutes: Math.max(
                    TIEMPOS_ALERTA.ROJA_MIN,
                    Math.min(TIEMPOS_ALERTA.ROJA_MAX, parseInt(e.target.value, 10) || TIEMPOS_ALERTA.ROJA_DEFAULT)
                  ),
                })}
                className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
              />
              <span className={`${textSecondary} text-sm shrink-0`}>min</span>
            </div>
            <p className={`${textSecondary} text-xs mt-1`}>Urgente</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/50">
            <label className={`block ${textModal} text-sm font-semibold mb-1`}>Crítica</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={TIEMPOS_ALERTA.CRITICA_MIN}
                max={TIEMPOS_ALERTA.CRITICA_MAX}
                value={config.alertCriticalMinutes}
                onChange={(e) => updateConfig({
                  alertCriticalMinutes: Math.max(
                    TIEMPOS_ALERTA.CRITICA_MIN,
                    Math.min(TIEMPOS_ALERTA.CRITICA_MAX, parseInt(e.target.value, 10) || TIEMPOS_ALERTA.CRITICA_DEFAULT)
                  ),
                })}
                className={`w-full ${inputBg} ${inputText} p-2 rounded-lg border ${borderModal}`}
              />
              <span className={`${textSecondary} text-sm shrink-0`}>min</span>
            </div>
            <p className={`${textSecondary} text-xs mt-1`}>Sonido extra</p>
          </div>
        </div>
        {config.alertRedMinutes <= config.alertYellowMinutes && (
          <p className="text-red-400 text-sm mt-3">La alerta roja debe ser mayor que la amarilla.</p>
        )}
      </section>

      <section className={`rounded-xl border ${borderModal} ${cardBg} p-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <h3 className={`text-lg font-bold ${textModal} flex items-center gap-2`}>
              <FaBell className="text-amber-400" />
              Timbre de nueva comanda
            </h3>
            <p className={`${textSecondary} text-xs mt-0.5`}>
              Reemplaza el beep al entrar una comanda. Elige un timbre y el volumen.
              Si el sonido está apagado en General, no suena en el tablero.
            </p>
          </div>
          <button
            type="button"
            onClick={() => playKdsNotificationSound({
              clave: resolverTimbreClave(config.timbreClave),
              volumen: Number.isFinite(config.timbreVolumen) ? config.timbreVolumen : TIMBRE_VOLUMEN_DEFAULT,
              force: true,
            })}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2"
          >
            <FaPlay className="text-xs" /> Probar
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            aria-label="Bajar volumen"
            onClick={() => updateConfig({
              timbreVolumen: Math.max(0, (Number.isFinite(config.timbreVolumen) ? config.timbreVolumen : TIMBRE_VOLUMEN_DEFAULT) - 10),
            })}
            className={`p-2 rounded-lg ${nightMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <FaVolumeDown className={textModal} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Number.isFinite(config.timbreVolumen) ? config.timbreVolumen : TIMBRE_VOLUMEN_DEFAULT}
            onChange={(e) => updateConfig({ timbreVolumen: parseInt(e.target.value, 10) || 0 })}
            className="flex-1 accent-amber-500"
            aria-label="Volumen del timbre"
          />
          <button
            type="button"
            aria-label="Subir volumen"
            onClick={() => updateConfig({
              timbreVolumen: Math.min(100, (Number.isFinite(config.timbreVolumen) ? config.timbreVolumen : TIMBRE_VOLUMEN_DEFAULT) + 10),
            })}
            className={`p-2 rounded-lg ${nightMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <FaVolumeUp className={textModal} />
          </button>
          <span className={`${textModal} text-sm font-bold w-12 text-right tabular-nums`}>
            {Number.isFinite(config.timbreVolumen) ? config.timbreVolumen : TIMBRE_VOLUMEN_DEFAULT}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {KDS_TIMBRES.map((t) => {
            const activo = resolverTimbreClave(config.timbreClave) === t.clave;
            return (
              <button
                key={t.clave}
                type="button"
                onClick={() => {
                  updateConfig({ timbreClave: t.clave });
                  playKdsNotificationSound({
                    clave: t.clave,
                    volumen: Number.isFinite(config.timbreVolumen) ? config.timbreVolumen : TIMBRE_VOLUMEN_DEFAULT,
                    force: true,
                  });
                }}
                className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                  activo
                    ? 'border-amber-400 bg-amber-500/20'
                    : `${borderModal} ${nightMode ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`
                }`}
              >
                <span className={`block text-sm font-semibold ${activo ? 'text-amber-300' : textModal}`}>
                  {t.nombre}
                </span>
                <span className={`block text-[11px] ${textSecondary}`}>{t.desc}</span>
              </button>
            );
          })}
        </div>
        {resolverTimbreClave(config.timbreClave) === TIMBRE_DEFAULT && (
          <p className={`${textSecondary} text-xs mt-3`}>Beep clásico es el tono que ya usaba el tablero.</p>
        )}
      </section>
    </div>
  );
};

export default ConfigVistaAlertasTab;
