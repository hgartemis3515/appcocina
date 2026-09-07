/**
 * TomarCocineroModal - Modal para seleccionar cocinero al "Tomar" plato/comanda
 *
 * Modo cambiar: click en un cocinero sigue asignando TODOS los seleccionados.
 * Extensión: cantidades por cocinero (una línea de 10 puede ir 5 y 5).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUserCheck, FaSpinner, FaUser } from 'react-icons/fa';
import { nombreMesaKds } from '../../utils/platoHelpers';

const idOf = (v) => (v == null ? '' : String(v._id || v.id || v));

function cantidadUnidadesSeleccion(p) {
  const n = Number(p?.cantidad);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

const TomarCocineroModal = ({
  isOpen,
  onClose,
  cocineros,
  loading,
  procesando,
  onConfirmar,
  platosSeleccionados = [],
  comandaSeleccionada = null,
  usuarioActual = null,
  modo = 'tomar'
}) => {
  const inputRef = useRef(null);
  const yoId = idOf(usuarioActual);
  const otros = (cocineros || []).filter((c) => idOf(c) !== yoId);
  const yoNombre = usuarioActual?.alias || usuarioActual?.nombre || 'Yo';
  const nLineas = platosSeleccionados?.length || 0;
  const total = (platosSeleccionados || []).reduce((acc, p) => acc + cantidadUnidadesSeleccion(p), 0);
  const puedeRepartir = modo === 'cambiar' && total > 1;
  const [cantidades, setCantidades] = useState({});

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setCantidades({});
  }, [isOpen, total]);

  const listaCocineros = useMemo(() => {
    const list = [];
    if (yoId && usuarioActual) list.push({ ...usuarioActual, _id: yoId, alias: yoNombre, _esYo: true });
    otros.forEach((c) => list.push(c));
    return list;
  }, [yoId, usuarioActual, yoNombre, otros]);

  const suma = useMemo(
    () => listaCocineros.reduce((acc, c) => acc + (Number(cantidades[idOf(c)]) || 0), 0),
    [listaCocineros, cantidades]
  );
  const restan = total - suma;

  const setQty = (id, raw) => {
    const n = Math.max(0, Math.min(total, Number(raw) || 0));
    setCantidades((prev) => ({ ...prev, [id]: n }));
  };

  const buildAllocations = () => {
    const allocations = listaCocineros
      .map((c) => ({ cocineroId: idOf(c), cantidad: Number(cantidades[idOf(c)]) || 0 }))
      .filter((a) => a.cocineroId && a.cantidad > 0);
    const sumaAlloc = allocations.reduce((acc, a) => acc + a.cantidad, 0);
    if (sumaAlloc !== total || allocations.length === 0) return null;
    return allocations;
  };

  const getTitulo = () => {
    if (modo === 'cambiar') {
      if (nLineas === 1) {
        const nom = platosSeleccionados[0].platoNombre || platosSeleccionados[0].nombre || 'Plato';
        return total > 1 ? `Cambiar ${total}× "${nom}"` : `Cambiar "${nom}"`;
      }
      return `Cambiar ${total} plato${total === 1 ? '' : 's'}`;
    }
    if (comandaSeleccionada) {
      return `Tomar Comanda #${comandaSeleccionada.comandaNumber || comandaSeleccionada.numeroComanda || ''}`;
    }
    if (platosSeleccionados?.length === 1) {
      return `Tomar "${platosSeleccionados[0].platoNombre || platosSeleccionados[0].nombre || 'Plato'}"`;
    }
    return `Tomar ${platosSeleccionados?.length || 0} plato${platosSeleccionados?.length === 1 ? '' : 's'}`;
  };

  const getDescripcion = () => {
    if (modo === 'cambiar') {
      if (puedeRepartir) {
        return 'Click en un cocinero = todos. O indica cuántos van a cada uno (p. ej. 5 y 5) y pulsa Repartir. Se actualiza en KDS y Ver Cocina completo.';
      }
      return 'Elige el cocinero que continuará este plato. Se actualiza en Ver Cocina completo.';
    }
    if (comandaSeleccionada) {
      return 'Selecciona quién preparará toda la comanda';
    }
    if (platosSeleccionados?.length === 1) {
      return 'Selecciona quién preparará este plato';
    }
    return 'Selecciona quién preparará estos platos';
  };

  const etiquetaYo = modo === 'cambiar'
    ? (platosSeleccionados?.length > 1 ? 'Quedármelos yo' : 'Quedármelo yo')
    : (comandaSeleccionada
      ? 'Asignarme la comanda'
      : (platosSeleccionados?.length > 1 ? 'Asignarme los platos' : 'Asignarme el plato'));

  const vacio = !yoId && otros.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <FaUserCheck className="text-green-400 text-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{getTitulo()}</h3>
                  {comandaSeleccionada && (
                    <p className="text-gray-400 text-xs">
                      {nombreMesaKds(comandaSeleccionada)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={procesando}
                className="text-gray-400 hover:text-white transition-colors p-2 disabled:opacity-50"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              {getDescripcion()}
            </p>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-3xl text-green-500 mb-3" />
                  <p className="text-gray-400">Cargando cocineros...</p>
                </div>
              ) : vacio ? (
                <div className="text-center py-8">
                  <FaUser className="text-4xl text-gray-600 mb-3 mx-auto" />
                  <p className="text-gray-400">No hay cocineros disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {yoId && (
                    <button
                      ref={inputRef}
                      onClick={() => onConfirmar(yoId)}
                      disabled={procesando}
                      className="w-full p-3 rounded-xl bg-amber-900/25 border border-amber-500/50 hover:bg-amber-800/40 hover:border-amber-400 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center font-bold text-sm text-gray-900">
                        {yoNombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-amber-200 font-semibold">{etiquetaYo}</p>
                        <p className="text-amber-200/70 text-xs">Tú · {yoNombre}</p>
                      </div>
                      {procesando && (
                        <FaSpinner className="animate-spin text-amber-300" />
                      )}
                    </button>
                  )}
                  {otros.length > 0 && (
                    <p className="text-xs text-gray-500 uppercase tracking-wider pt-2 px-1">
                      Asignar a un cocinero
                    </p>
                  )}
                  {otros.map((cocinero) => (
                    <button
                      key={cocinero._id}
                      onClick={() => onConfirmar(cocinero._id)}
                      disabled={procesando}
                      className="w-full p-3 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-green-900/30 hover:border-green-600 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm text-white">
                        {cocinero.alias?.charAt(0)?.toUpperCase() ||
                         cocinero.nombre?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-white font-medium">
                          {cocinero.alias || cocinero.nombre || 'Cocinero'}
                        </p>
                        {cocinero.alias && cocinero.nombre && cocinero.alias !== cocinero.nombre && (
                          <p className="text-gray-500 text-xs">{cocinero.nombre}</p>
                        )}
                      </div>
                      {procesando && (
                        <FaSpinner className="animate-spin text-green-400" />
                      )}
                    </button>
                  ))}

                  {puedeRepartir && (
                    <div className="mt-4 pt-3 border-t border-gray-700 space-y-2">
                      <p className="text-xs text-amber-200/90 font-semibold uppercase">Repartir cantidades</p>
                      <p className="text-[11px] text-gray-400">
                        {total} unidad{total === 1 ? '' : 'es'}
                        {nLineas !== total ? ` · ${nLineas} línea${nLineas === 1 ? '' : 's'}` : ''}
                        {' '}· asignados {suma} · restan {restan}
                      </p>
                      {listaCocineros.map((c) => {
                        const id = idOf(c);
                        const label = c._esYo ? `${yoNombre} (tú)` : (c.alias || c.nombre || 'Cocinero');
                        return (
                          <div key={`qty-${id}`} className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-gray-200 truncate">{label}</span>
                            <input
                              type="number"
                              min={0}
                              max={total}
                              value={cantidades[id] ?? ''}
                              onChange={(e) => setQty(id, e.target.value)}
                              disabled={procesando}
                              className="w-16 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white text-center"
                            />
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        disabled={procesando || restan !== 0 || suma === 0}
                        onClick={() => {
                          const allocations = buildAllocations();
                          if (allocations) onConfirmar({ allocations });
                        }}
                        className="w-full py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-semibold disabled:opacity-40"
                      >
                        Repartir {suma}/{total}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={onClose}
                disabled={procesando}
                className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TomarCocineroModal;
