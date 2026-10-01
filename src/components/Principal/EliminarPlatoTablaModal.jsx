import React, { useMemo, useState } from 'react';
import { numeroComandaVisible } from '../../utils/numeroComandaVisible';
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
  const [motivo, setMotivo] = useState('');

  const filas = useMemo(() => (comandas || []).map((comanda) => {
    const numero = numeroComandaVisible(comanda);
    const mesa = nombreMesaKds(comanda);
    const mozo = etiquetaMozosComandas([comanda]) || comanda?.mozoNombre || comanda?.mozos?.name || '';
    return { comanda, numero, mesa, mozo, platos: platosEnTabla(comanda) };
  }).filter((f) => (
    coincide(f.numero, filtroNumero)
    && coincide(f.mesa, filtroMesa)
    && coincide(f.mozo, filtroMozo)
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

  const confirmar = () => {
    if (!accion?.ok || !onConfirmar) return;
    onConfirmar({ comandaId: accion.comandaId, indices: accion.indices, motivo });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/60 p-3">
      <div className={`w-full max-w-5xl max-h-full flex flex-col rounded-xl border ${borde} ${bg} shadow-2xl`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${borde}`}>
          <h2 className="text-lg font-bold">Eliminar plato</h2>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px]" aria-label="Cerrar">✕</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
          <input className={`p-2 rounded border ${input}`} placeholder="Nº comanda" value={filtroNumero} onChange={(e) => setFiltroNumero(e.target.value)} />
          <input className={`p-2 rounded border ${input}`} placeholder="Mesa" value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} />
          <input className={`p-2 rounded border ${input}`} placeholder="Mozo" value={filtroMozo} onChange={(e) => setFiltroMozo(e.target.value)} />
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
              <div key={id} className={`rounded-lg border ${borde} p-3`}>
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="font-bold">#{f.numero} · {f.mesa} · {f.mozo || 'Sin mozo'}</div>
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
                <ul className="mt-2 space-y-1">
                  {f.platos.map(({ plato, index }) => {
                    const on = marcada && indices.includes(index);
                    const nombre = obtenerNombreDisplayCocina(plato, { habilitadoEnKds: usarNombreCocina }) || 'Plato';
                    return (
                      <li key={index}>
                        <label className={`flex items-center gap-2 min-h-[40px] ${puedePlatos ? 'cursor-pointer' : 'opacity-80'}`}>
                          {puedePlatos ? (
                            <input type="checkbox" checked={on} onChange={() => togglePlato(id, index)} />
                          ) : null}
                          <span>{nombre}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <div className={`px-4 py-3 border-t ${borde} space-y-2`}>
          {accion && !accion.ok ? <p className="text-sm text-amber-400">{accion.error}</p> : null}
          <input
            className={`w-full p-2 rounded border ${input}`}
            placeholder="Motivo (obligatorio)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <button
            type="button"
            disabled={!accion?.ok || loading || motivo.trim().length < 2}
            onClick={confirmar}
            className="w-full min-h-[44px] rounded-lg bg-red-600 text-white font-semibold disabled:opacity-40"
          >
            {loading ? 'Eliminando…' : (accion?.label || 'Eliminar plato')}
          </button>
        </div>
      </div>
    </div>
  );
}
