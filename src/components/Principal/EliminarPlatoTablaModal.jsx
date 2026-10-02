import React, { useMemo, useState } from 'react';
import { FaDesktop, FaTruck, FaUserClock, FaUserSlash } from 'react-icons/fa';
import { numeroComandaVisible } from '../../utils/numeroComandaVisible';
import { MOTIVOS_RAPIDOS_COCINA } from '../../utils/motivosRapidosCocina';
import { etiquetaMozosComandas } from '../../utils/numeroComandaMozo';
import { nombreMesaKds, obtenerNombreDisplayCocina } from '../../utils/platoHelpers';
import { platoVisibleEnTablaKds } from '../../utils/sosTablaKds';
import {
  esEliminarComandaCompletaKds,
  indicesPlatosActivosComanda,
  resolverEliminarSeleccionKds,
} from '../../utils/kdsAnularPlatos';

function platosEnTabla(comanda) {
  return (comanda?.platos || [])
    .map((plato, index) => ({ plato, index }))
    .filter(({ plato }) => platoVisibleEnTablaKds(plato));
}

function coincide(valor, filtro) {
  const q = String(filtro || '').trim().toLowerCase();
  if (!q) return true;
  return String(valor || '').toLowerCase().includes(q);
}

/** Nombre del mozo, sin el número de su pedido (`Admin 1` → `Admin`). */
function nombresMozoFiltro(comanda) {
  const et = etiquetaMozosComandas([comanda])
    || comanda?.mozoNombre
    || comanda?.mozos?.name
    || '';
  const vistos = [];
  for (const parte of String(et).split(' · ')) {
    const nombre = parte.replace(/\s+\d+(?:\+\d+)*$/, '').trim();
    if (!nombre || nombre === 'Sin mozo' || nombre === 'Sin asignar') continue;
    if (!vistos.some((n) => n.toLowerCase() === nombre.toLowerCase())) vistos.push(nombre);
  }
  return vistos;
}

const ICONOS_MOTIVO = {
  cliente_no_desea: FaUserSlash,
  equivocacion_mozo: FaUserClock,
  error_sistema: FaDesktop,
  error_entrega: FaTruck,
};

function textoMesaCuadro(mesa) {
  const s = String(mesa ?? '').trim();
  const m = s.match(/^M(\d.*)$/i);
  return m ? `Mesa ${m[1]}` : s;
}

/**
 * Lista las comandas que están en la tabla KDS para eliminar platos o la comanda.
 */
export default function EliminarPlatoTablaModal({
  open,
  nightMode = true,
  comandas = [],
  puedePlatos = false,
  puedeComanda = false,
  usarNombreCocina = true,
  loading = false,
  onClose,
  onConfirmar,
}) {
  const [filtroNumero, setFiltroNumero] = useState('');
  const [filtroMesa, setFiltroMesa] = useState('');
  const [filtroMozo, setFiltroMozo] = useState('');
  const [comandaId, setComandaId] = useState('');
  const [indices, setIndices] = useState([]);

  const mozosTabla = useMemo(() => {
    const map = new Map();
    for (const comanda of comandas || []) {
      for (const nombre of nombresMozoFiltro(comanda)) {
        const key = nombre.toLowerCase();
        if (!map.has(key)) map.set(key, nombre);
      }
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [comandas]);

  const filas = useMemo(() => (comandas || []).map((comanda) => {
    const numero = numeroComandaVisible(comanda);
    const mesa = textoMesaCuadro(nombreMesaKds(comanda));
    const mozo = etiquetaMozosComandas([comanda]) || comanda?.mozoNombre || comanda?.mozos?.name || '';
    const nombresMozo = nombresMozoFiltro(comanda);
    return { comanda, numero, mesa, mozo, nombresMozo, platos: platosEnTabla(comanda) };
  }).filter((f) => (
    coincide(f.numero, filtroNumero)
    && coincide(f.mesa, filtroMesa)
    && (!filtroMozo || f.nombresMozo.some((n) => n.toLowerCase() === filtroMozo.toLowerCase()))
  )), [comandas, filtroNumero, filtroMesa, filtroMozo]);

  if (!open) return null;

  const bg = nightMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const borde = nightMode ? 'border-gray-700' : 'border-gray-300';
  const input = nightMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300';
  const comandaSel = filas.find((f) => String(f.comanda._id) === String(comandaId))?.comanda;
  const accion = comandaSel
    ? resolverEliminarSeleccionKds(comandaSel, indices, {
      eliminarPlatos: puedePlatos,
      eliminarComanda: puedeComanda,
    })
    : null;

  const elegir = (id, lista) => {
    setComandaId(String(id));
    setIndices(lista);
  };

  const togglePlato = (id, index) => {
    if (!puedePlatos) return;
    const mismo = String(id) === String(comandaId);
    const base = mismo ? indices : [];
    const set = new Set(base);
    if (set.has(index)) set.delete(index);
    else set.add(index);
    elegir(id, [...set]);
  };

  const confirmar = (motivo) => {
    if (!accion?.ok || !onConfirmar) return;
    onConfirmar({ comandaId: accion.comandaId, indices: accion.indices, motivo });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/60 p-3">
      <div className={`w-full max-w-5xl max-h-full flex flex-col rounded-xl border ${borde} ${bg} shadow-2xl`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${borde}`}>
          <h2 className="text-lg font-bold">Eliminar</h2>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px]" aria-label="Cerrar">✕</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
          <input className={`p-2 rounded border ${input}`} placeholder="Nº comanda" value={filtroNumero} onChange={(e) => setFiltroNumero(e.target.value)} />
          <input className={`p-2 rounded border ${input}`} placeholder="Mesa" value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} />
          <select className={`p-2 rounded border ${input}`} value={filtroMozo} onChange={(e) => setFiltroMozo(e.target.value)} aria-label="Filtrar por mozo">
            <option value="">Todos los mozos</option>
            {mozosTabla.map((m) => <option key={m.toLowerCase()} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 space-y-2">
          {filas.length === 0 ? (
            <p className="text-sm opacity-70">No hay comandas de la tabla con ese filtro.</p>
          ) : filas.map((f) => {
            const id = String(f.comanda._id);
            const activos = indicesPlatosActivosComanda(f.comanda);
            const marcada = id === String(comandaId);
            const toda = marcada && esEliminarComandaCompletaKds(f.comanda, indices);
            return (
              <div key={id} className={`rounded-lg border overflow-hidden ${toda ? 'border-green-500' : borde}`}>
                <div className={`flex flex-wrap items-center gap-2 justify-between px-3 py-2 ${nightMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 min-w-0 font-bold">
                    <span className="text-lg leading-none">#{f.numero}</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-sky-600/40 text-white border border-sky-300/50 text-sm whitespace-nowrap">
                      {f.mesa}
                    </span>
                    <span className="truncate">{f.mozo || 'Sin mozo'}</span>
                  </div>
                  {puedeComanda ? (
                    <button
                      type="button"
                      className="text-sm px-3 py-1.5 rounded bg-red-700 text-white"
                      onClick={() => elegir(id, activos)}
                    >
                      {toda ? 'Comanda marcada' : 'Eliminar comanda'}
                    </button>
                  ) : null}
                </div>
                <div>
                  {f.platos.map(({ plato, index }) => {
                    const on = marcada && indices.includes(index);
                    const nombre = obtenerNombreDisplayCocina(plato, { habilitadoEnKds: usarNombreCocina }) || 'Plato';
                    const cantidad = Number(plato?.cantidad) > 0 ? Number(plato.cantidad) : 1;
                    const selCls = on
                      ? (nightMode ? 'bg-green-500/30 text-green-300' : 'bg-green-500/20 text-green-800')
                      : (nightMode ? 'text-white hover:bg-gray-700/50' : 'text-gray-900 hover:bg-gray-100');
                    return (
                      <button
                        key={index}
                        type="button"
                        disabled={!puedePlatos}
                        onClick={() => togglePlato(id, index)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b last:border-b-0 ${nightMode ? 'border-gray-700' : 'border-gray-200'} ${selCls} ${puedePlatos ? 'cursor-pointer' : 'opacity-80 cursor-default'}`}
                        style={{ fontFamily: 'Arial, sans-serif', fontSize: '18px', fontWeight: 600 }}
                      >
                        <span
                          className="w-8 h-8 border-2 rounded flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: on ? '#22c55e' : (nightMode ? '#6b7280' : '#9ca3af'),
                            backgroundColor: on ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                          }}
                          aria-hidden
                        >
                          {on ? (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className={`w-4 h-4 rounded border-2 ${nightMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-300 border-gray-400'}`} />
                          )}
                        </span>
                        <span className="font-black tabular-nums">{cantidad}</span>
                        <span className="min-w-0">{nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className={`px-4 py-3 border-t ${borde} space-y-2`}>
          {accion && !accion.ok ? <p className="text-sm text-amber-400">{accion.error}</p> : null}
          <p className="text-xs opacity-70">
            {loading ? 'Eliminando…' : 'Elige el motivo. Se elimina al tocarlo.'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOTIVOS_RAPIDOS_COCINA.map((m) => {
              const Icon = ICONOS_MOTIVO[m.id] || FaUserSlash;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!accion?.ok || loading}
                  onClick={() => confirmar(m.label)}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-red-500/40 text-xs font-semibold min-h-[72px] disabled:opacity-40"
                >
                  <Icon className="text-lg text-red-500" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
