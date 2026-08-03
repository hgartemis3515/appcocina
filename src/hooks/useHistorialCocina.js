/**
 * useHistorialCocina — Hook para el Historial de cocina.
 *
 * - Preferente: GET /historial-cocina (incluye pagadas / IsActive=false).
 * - Fallback: GET /fecha/:fecha + filtro cliente.
 * - Elegibles: ≥1 plato salio|entregado|pagado (o status comanda cerrado).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import moment from "moment-timezone";
import { getApiUrl } from "../config/apiConfig";
import { obtenerNombrePlato, obtenerCodigoPlato } from "../utils/platoHelpers";
import {
  filtrarComandasElegiblesHistorial,
  classifyComandaHistorial,
  classifyPlatoHistorial,
  esPlatoActivo,
  estadoPlato,
} from "../utils/historialComandaRules";

const DEFAULT_FILTROS = {
  progreso: "todas",
  mozo: "todos",
  cocinero: "todos",
  mesa: "",
  q: "",
};

const hoyLima = () => moment().tz("America/Lima").format("YYYY-MM-DD");

const mesaDeComanda = (c) =>
  c?.mesaNumero ?? c?.mesas?.nummesa ?? c?.mesa?.numero ?? c?.mesa ?? c?.numeroMesa ?? "";

const ordenDeComanda = (c) =>
  c?.comandaNumber ?? c?.orden ?? c?.numeroOrden ?? "";

const useHistorialCocina = ({ getToken, socket } = {}) => {
  const [fecha, setFecha] = useState(hoyLima());
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(DEFAULT_FILTROS);

  const esHoy = fecha === hoyLima();

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getToken ? { Authorization: `Bearer ${getToken()}` } : {};
      let data = [];

      // 1) Endpoint dedicado (incluye pagadas / inactivas)
      try {
        const urlHist = `${getApiUrl()}/historial-cocina`;
        const respHist = await axios.get(urlHist, {
          headers,
          params: { fecha },
          timeout: 10000,
        });
        data = Array.isArray(respHist.data) ? respHist.data : [];
      } catch (errHist) {
        // 2) Fallback: /fecha (solo activas) + filtro cliente
        console.warn("[useHistorialCocina] historial-cocina falló, usando /fecha", errHist?.message);
        const urlFecha = `${getApiUrl()}/fecha/${fecha}`;
        const respFecha = await axios.get(urlFecha, { headers, timeout: 10000 });
        const raw = Array.isArray(respFecha.data) ? respFecha.data : [];
        data = filtrarComandasElegiblesHistorial(raw);
      }

      // Normalizar + re-filtrar por seguridad (cliente)
      const normalizadas = (Array.isArray(data) ? data : []).map((c) => ({
        ...c,
        orden: ordenDeComanda(c),
        numeroOrden: ordenDeComanda(c),
        mesaNumero: mesaDeComanda(c),
      }));
      setComandas(filtrarComandasElegiblesHistorial(normalizadas));
    } catch (e) {
      console.error("[useHistorialCocina] error fetch", e);
      setError(e.response?.data?.message || e.message || "Error al cargar historial");
      setComandas([]);
    } finally {
      setLoading(false);
    }
  }, [fecha, getToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!socket || !esHoy) return undefined;
    const refrescar = () => cargar();
    // Nombres reales usados por useSocketCocina / backend
    const events = [
      "comanda_actualizada",
      "comanda-actualizada",
      "plato_actualizado",
      "plato-actualizado",
      "nueva_comanda",
      "nueva-comanda",
    ];
    events.forEach((ev) => socket.on(ev, refrescar));
    return () => {
      events.forEach((ev) => socket.off(ev, refrescar));
    };
  }, [socket, esHoy, cargar]);

  const mozosUnicos = useMemo(() => {
    const set = new Map();
    comandas.forEach((c) => {
      const nombre = c.mozoNombre || c.mozos?.name || "Sin mozo";
      const id = String(c.mozos?._id || c.mozoNombre || nombre);
      if (!set.has(id)) set.set(id, nombre);
    });
    return Array.from(set, ([id, nombre]) => ({ id, nombre }));
  }, [comandas]);

  const cocinerosUnicos = useMemo(() => {
    const set = new Map();
    comandas.forEach((c) => {
      (c.platos || []).forEach((p) => {
        if (!esPlatoActivo(p)) return;
        const proc = p.procesadoPor || p.procesandoPor;
        const id = proc?.cocineroId;
        const nombre = proc?.alias || proc?.nombre;
        if (id && nombre && !set.has(String(id))) {
          set.set(String(id), { id: String(id), nombre });
        }
      });
    });
    return Array.from(set.values());
  }, [comandas]);

  const comandasFiltradas = useMemo(() => {
    let out = comandas;

    if (filtros.mozo !== "todos") {
      out = out.filter(
        (c) => String(c.mozos?._id || c.mozoNombre || "") === String(filtros.mozo)
      );
    }
    if (filtros.cocinero !== "todos") {
      out = out.filter((c) =>
        (c.platos || []).some(
          (p) =>
            esPlatoActivo(p) &&
            String(p.procesadoPor?.cocineroId || p.procesandoPor?.cocineroId || "") ===
              filtros.cocinero
        )
      );
    }
    if (filtros.mesa.trim()) {
      const m = filtros.mesa.trim().toLowerCase();
      out = out.filter((c) => String(mesaDeComanda(c)).toLowerCase().includes(m));
    }
    if (filtros.q.trim()) {
      const q = filtros.q.trim().toLowerCase();
      out = out.filter((c) => {
        const orden = String(ordenDeComanda(c)).toLowerCase();
        const mesa = String(mesaDeComanda(c)).toLowerCase();
        const mozo = String(c.mozoNombre || c.mozos?.name || "").toLowerCase();
        const matchPlato = (c.platos || []).some((p) => {
          const np = obtenerNombrePlato(p).toLowerCase();
          const cp = obtenerCodigoPlato(p).toLowerCase();
          return np.includes(q) || cp.includes(q);
        });
        return orden.includes(q) || mesa.includes(q) || mozo.includes(q) || matchPlato;
      });
    }
    if (filtros.progreso !== "todas") {
      out = out.filter((c) => classifyComandaHistorial(c).tipo === filtros.progreso);
    }

    // Más recientes primero (por última entrega o createdAt)
    return [...out].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [comandas, filtros]);

  const resetFiltros = useCallback(() => setFiltros(DEFAULT_FILTROS), []);
  const setFechaHoy = useCallback(() => setFecha(hoyLima()), []);
  const setFechaAyer = useCallback(() => {
    setFecha(moment().tz("America/Lima").subtract(1, "days").format("YYYY-MM-DD"));
  }, []);

  return {
    fecha,
    setFecha,
    esHoy,
    comandas: comandasFiltradas,
    totalElegibles: comandas.length,
    loading,
    error,
    filtros,
    setFiltros,
    resetFiltros,
    setFechaHoy,
    setFechaAyer,
    recargar: cargar,
    mozosUnicos,
    cocinerosUnicos,
    classifyComandaHistorial,
    classifyPlatoHistorial,
    estadoPlato,
  };
};

export default useHistorialCocina;
