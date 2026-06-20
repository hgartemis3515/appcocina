/**
 * useTablaAprobacion - Hook unificado para bandeja de aprobación en App Cocina.
 *
 * Combina tickets de comanda completa (TicketAprobacion) y pagos adelantados (TicketPagoAdelantado)
 * en una sola bandeja. Provee acciones de Aprobar, Reportar e Imprimir comanda.
 *
 * Endpoints:
 *   GET  /api/aprobacion/pendientes       → lista unificada
 *   PUT  /api/aprobacion/:id/aprobar      → aprueba comanda o PPA
 *   PUT  /api/aprobacion/:id/reportar      → reporta comanda con motivo obligatorio
 *   GET  /api/pago-adelantado/pendientes   → PPA pendientes (fallback)
 *
 * Socket events:
 *   ticket-aprobacion-nuevo  → refrescar lista
 *   comanda-aprobada         → quitar de lista
 *   mesa-reportada           → actualizar estado
 *   ticket-reportado         → actualizar lista
 *   ticket-ppa-nuevo         → refrescar PPA
 *   ticket-ppa-actualizado   → actualizar PPA
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getServerBaseUrl } from '../config/apiConfig';
import { apiGet, apiPut } from '../config/apiClient';
import { io } from 'socket.io-client';

const TICKETS_REFRESH_INTERVAL = 30000;

// ── Helper: Etiquetas default para plantilla de comanda ──
const ETIQUETAS_DEFAULT = {
  comandaNumero: 'Comanda',
  fechaPedido: 'Fecha',
  mesa: 'Mesa',
  mozo: 'Mozo',
  area: 'Área',
  moneda: 'Moneda',
  tipoPago: 'Pago',
  total: 'TOTAL',
  cliente: 'Cliente',
  dni: 'DNI',
  observaciones: 'Obs',
};

// ── Helper: Escape HTML ──
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Helper: Genera HTML 80mm para una comanda usando la plantilla ──
function generarHtmlComanda80mm(datos, plantilla) {
  const p = plantilla || {};
  const v = p.visibilidad || {};
  const b = p.bloques || {};
  const e = p.espaciado || { lineHeight: 16, tamanoFuente: 11, espacioDivider: 8 };
  const et = { ...ETIQUETAS_DEFAULT, ...(p.etiquetas || {}) };
  const mostrarPrecios = b.mostrarPrecios !== false;

  let body = '';

  // Encabezado
  if (b.mostrarEncabezado !== false) {
    if (p.logo) body += `<div style="text-align:center;margin-bottom:6px;"><img src="${escapeHtml(p.logo)}" style="max-width:100%;max-height:60px;object-fit:contain;" alt="Logo"></div>`;
    if (v.nombre !== false) body += `<div style="text-align:center;font-weight:bold;font-size:${e.tamanoFuente + 4}px;">${escapeHtml(p.restaurante?.nombre || 'LAS GAMBUSINAS')}</div>`;
    if (v.eslogan && p.restaurante?.eslogan) body += `<div style="text-align:center;font-size:${e.tamanoFuente - 1}px;color:#666;">${escapeHtml(p.restaurante.eslogan)}</div>`;
    body += `<div style="text-align:center;font-weight:bold;font-size:${e.tamanoFuente + 2}px;margin:4px 0;letter-spacing:2px;">${escapeHtml(p.encabezado?.titulo || 'COMANDA')}</div>`;
    body += `<div style="border-top:1px dashed #999;margin:${e.espacioDivider}px 0;"></div>`;
  }

  // Datos de comanda
  if (b.mostrarDatosComanda !== false) {
    body += '<div style="margin-bottom:4px;">';
    if (v.comandaNumero !== false && datos.comandaNumero) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.comandaNumero}:</span><span>${escapeHtml(String(datos.comandaNumero))}</span></div>`;
    if (v.fechaPedido !== false && datos.fechaPedido) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.fechaPedido}:</span><span>${escapeHtml(String(datos.fechaPedido))}</span></div>`;
    if (v.mesa !== false && datos.mesa) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.mesa}:</span><span>${escapeHtml(String(datos.mesa))}</span></div>`;
    if (v.mozo !== false && datos.mozo) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.mozo}:</span><span>${escapeHtml(String(datos.mozo))}</span></div>`;
    if (v.area && datos.area) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.area}:</span><span>${escapeHtml(String(datos.area))}</span></div>`;
    if (v.moneda !== false && datos.moneda) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.moneda}:</span><span>${escapeHtml(String(datos.moneda))}</span></div>`;
    if (v.tipoPago !== false && datos.tipoPago) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.tipoPago}:</span><span>${escapeHtml(String(datos.tipoPago))}</span></div>`;
    body += '</div>';
    body += `<div style="border-top:1px dashed #999;margin:${e.espacioDivider}px 0;"></div>`;
  }

  // Detalle de productos
  if (b.mostrarDetalleProductos !== false && datos.productos?.length) {
    body += '<table style="width:100%;border-collapse:collapse;font-size:' + e.tamanoFuente + 'px;">';
    body += '<thead><tr style="border-bottom:1px solid #000;font-weight:bold;">';
    body += '<th style="text-align:left;padding:2px 0;">Producto</th><th style="text-align:center;padding:2px 4px;width:30px;">Cant.</th>';
    if (mostrarPrecios) body += '<th style="text-align:right;padding:2px 4px;width:50px;">Total</th>';
    body += '</tr></thead><tbody>';
    for (const prod of datos.productos) {
      body += '<tr>';
      body += `<td style="padding:2px 0;vertical-align:top;">${escapeHtml(prod.nombre || 'Plato')}${prod.paraLlevar ? ' (P.L.)' : ''}</td>`;
      body += `<td style="text-align:center;vertical-align:top;">${prod.cantidad || 1}</td>`;
      if (mostrarPrecios) body += `<td style="text-align:right;vertical-align:top;">${(prod.subtotal || 0).toFixed(2)}</td>`;
      body += '</tr>';
      if (prod.complementos?.length) {
        for (const c of prod.complementos) {
          body += `<tr style="color:#666;font-size:${e.tamanoFuente - 1}px;"><td style="padding:0 0 0 10px;">└ ${escapeHtml(c.grupo || '')}: ${escapeHtml(c.opcion || '')}</td><td></td>${mostrarPrecios ? '<td></td>' : ''}</tr>`;
        }
      }
      if (prod.notaEspecial) body += `<tr style="color:#999;font-size:${e.tamanoFuente - 2}px;font-style:italic;"><td colspan="${mostrarPrecios ? 3 : 2}" style="padding:0 0 0 10px;">Nota: ${escapeHtml(prod.notaEspecial)}</td></tr>`;
    }
    body += '</tbody></table>';
    body += `<div style="border-top:1px dashed #999;margin:${e.espacioDivider}px 0;"></div>`;
  }

  // Total
  if (b.mostrarTotal !== false) {
    const simbolo = datos.moneda === 'USD' ? '$' : 'S/.';
    body += `<div style="font-weight:bold;font-size:${e.tamanoFuente + 2}px;text-align:right;margin:4px 0;">${et.total}: ${simbolo}${(datos.total || 0).toFixed(2)}</div>`;
    body += `<div style="border-top:1px dashed #999;margin:${e.espacioDivider}px 0;"></div>`;
  }

  // Datos del cliente
  if (b.mostrarDatosCliente !== false) {
    const cn = datos.cliente?.nombre || '';
    const cd = datos.cliente?.dni || '';
    if (cn || cd) {
      body += '<div style="margin-bottom:4px;">';
      if (v.cliente !== false && cn) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.cliente}:</span><span>${escapeHtml(cn)}</span></div>`;
      if (v.dniCliente !== false && cd) body += `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="font-weight:600;">${et.dni}:</span><span>${escapeHtml(cd)}</span></div>`;
      body += '</div>';
    }
  }

  // Observaciones
  if (b.mostrarObservaciones !== false && datos.observaciones) {
    body += `<div style="margin-bottom:4px;font-size:${e.tamanoFuente - 1}px;color:#555;"><strong>${et.observaciones}:</strong> ${escapeHtml(datos.observaciones)}</div>`;
  }

  // Pie
  if (p.mensajes?.pie) {
    body += `<div style="text-align:center;font-size:${e.tamanoFuente - 2}px;color:#999;margin-top:6px;">${escapeHtml(p.mensajes.pie)}</div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comanda #${datos.comandaNumero || '?'}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter','Helvetica Neue',Arial,sans-serif;font-size:${e.tamanoFuente}px;padding:10px;max-width:320px;margin:0 auto;}
.divider{border-top:1px dashed #333;margin:${e.espacioDivider}px 0;}
.text-center{text-align:center;}
.label{font-weight:600;color:#222;}
.value{font-weight:400;color:#000;}
.restaurant-name{font-size:16px;font-weight:800;letter-spacing:0.5px;}
.total-row{font-size:13px;font-weight:700;border-top:2px solid #000;padding-top:4px;margin-top:4px;}
.logo-img{max-width:200px;max-height:60px;margin:0 auto 4px;display:block;}
@media print{body{margin:0;padding:5px;}}
</style></head><body><div style="font-family:'Inter','Helvetica Neue',Arial,sans-serif;font-size:${e.tamanoFuente}px;line-height:${e.lineHeight}px;">${body}</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`;

  return html;
}

export default function useTablaAprobacion() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch aprobación tickets (comandas + adelantados unificados)
      const fechaHoy = new Date().toISOString().split('T')[0];
      const data = await apiGet(`/api/aprobacion/pendientes?fecha=${fechaHoy}`);

      if (data?.success && Array.isArray(data.tickets)) {
        setItems(data.tickets);
        setError(null);
      } else if (Array.isArray(data)) {
        setItems(data);
        setError(null);
      }

      // Also fetch PPA tickets for backwards compatibility
      try {
        const ppaData = await apiGet(`/api/pago-adelantado/pendientes?fecha=${fechaHoy}`);
        if (ppaData?.success && Array.isArray(ppaData.tickets)) {
          setItems(prev => {
            const existingIds = new Set(prev.map(t => t._id));
            const newPpaTickets = ppaData.tickets.filter(t => !existingIds.has(t._id));
            return [...prev, ...newPpaTickets];
          });
        }
      } catch (ppaErr) {
        // PPA endpoint may not be available; non-critical
        console.warn('[TablaAprobacion] PPA fallback fetch failed:', ppaErr.message);
      }
    } catch (err) {
      console.error('Error fetching aprobación items:', err.message);
      setError(err.userMessage || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, TICKETS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchItems]);

  // Socket.io connection for real-time updates
  useEffect(() => {
    const getStoredToken = () => {
      try {
        const storedAuth = localStorage.getItem('cocinaAuth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          return authData.token || null;
        }
      } catch (e) {
        console.warn('[TablaAprobacion] Error parsing auth token:', e);
      }
      return null;
    };

    const authToken = getStoredToken();
    if (!authToken) return;

    const serverUrl = getServerBaseUrl();
    const newSocket = io(`${serverUrl}/cocina`, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      console.log('[TablaAprobacion] Socket conectado');
      setSocketConnected(true);
      const fechaHoy = new Date().toISOString().split('T')[0];
      newSocket.emit('join-fecha', fechaHoy);
    });

    newSocket.on('disconnect', () => {
      console.log('[TablaAprobacion] Socket desconectado');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[TablaAprobacion] Socket error:', err?.message);
      setSocketConnected(false);
    });

    // Aprobación events
    newSocket.on('ticket-aprobacion-nuevo', () => {
      console.log('[TablaAprobacion] Nuevo ticket de aprobación');
      fetchItems();
    });

    newSocket.on('comanda-aprobada', (data) => {
      console.log('[TablaAprobacion] Comanda aprobada:', data?.ticketNumber);
      setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchItems();
    });

    newSocket.on('mesa-reportada', () => {
      console.log('[TablaAprobacion] Mesa reportada');
      fetchItems();
    });

    newSocket.on('ticket-reportado', (data) => {
      console.log('[TablaAprobacion] Ticket reportado:', data?.ticketId);
      setItems(prev => prev.map(t =>
        t._id === data?.ticketId ? { ...t, estado: 'reportado', motivoReporte: data?.motivo } : t
      ));
      fetchItems();
    });

    // PPA events (backwards compatibility)
    newSocket.on('ticket-ppa-nuevo', () => {
      console.log('[TablaAprobacion] Nuevo ticket PPA');
      fetchItems();
    });

    newSocket.on('ticket-ppa-actualizado', (data) => {
      console.log('[TablaAprobacion] Ticket PPA actualizado:', data?.ticketId, data?.estado);
      if (data?.estado === 'aprobado' || data?.estado === 'rechazado') {
        setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      }
      fetchItems();
    });

    newSocket.on('ticket-ppa-aprobado', (data) => {
      console.log('[TablaAprobacion] Ticket PPA aprobado:', data?.ticketNumber);
      setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchItems();
    });

    newSocket.on('ticket-ppa-rechazado', (data) => {
      console.log('[TablaAprobacion] Ticket PPA rechazado:', data?.ticketNumber);
      setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchItems();
    });

    socketRef.current = newSocket;

    return () => {
      console.log('[TablaAprobacion] Desconectando socket');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [fetchItems]);

  // Aprobar item (comanda o PPA)
  const aprobarItem = useCallback(async (ticketId, tipo, usuarioId, usuarioNombre) => {
    try {
      const data = await apiPut(`/api/aprobacion/${ticketId}/aprobar`, {
        tipo: tipo || 'COMANDA',
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        setItems(prev => prev.filter(t => t._id !== ticketId));
        return data;
      }
      throw new Error(data?.error || data?.message || 'Error al aprobar');
    } catch (err) {
      console.error('Error al aprobar item:', err.message);
      throw err;
    }
  }, []);

  // Reportar item (comanda con motivo obligatorio)
  const reportarItem = useCallback(async (ticketId, motivo, usuarioId, usuarioNombre) => {
    if (!motivo || motivo.trim().length < 3) {
      throw new Error('El motivo es obligatorio y debe tener al menos 3 caracteres.');
    }
    try {
      const data = await apiPut(`/api/aprobacion/${ticketId}/reportar`, {
        motivo: motivo.trim(),
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        setItems(prev => prev.filter(t => t._id !== ticketId));
        return data;
      }
      throw new Error(data?.error || 'Error al reportar');
    } catch (err) {
      console.error('Error al reportar item:', err.message);
      throw err;
    }
  }, []);

  // Rechazar item (PPA - backwards compatibility)
  const rechazarItem = useCallback(async (ticketId, motivo, usuarioId, usuarioNombre) => {
    if (!motivo || motivo.trim().length < 3) {
      throw new Error('El motivo es obligatorio y debe tener al menos 3 caracteres.');
    }
    try {
      const data = await apiPut(`/api/pago-adelantado/${ticketId}/rechazar`, {
        motivo: motivo.trim(),
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        setItems(prev => prev.filter(t => t._id !== ticketId));
        return data;
      }
      throw new Error(data?.error || 'Error al rechazar');
    } catch (err) {
      console.error('Error al rechazar item:', err.message);
      throw err;
    }
  }, []);

  // Imprimir comanda: genera un ticket térmico 80mm formateado con la plantilla
  const imprimirComanda = useCallback(async (ticket) => {
    try {
      // 1. Obtener datos enriquecidos (incluye boucher: moneda, tipoPago, cliente)
      let datos = null;
      const comandaId = ticket.comandasIds?.[0] || ticket.comandaId;
      if (comandaId) {
        try {
          const res = await apiGet(`/api/comanda/${comandaId}/ticket-imprimible`);
          if (res?.success && res.datos) {
            const d = res.datos;
            datos = {
              comandaNumero: d.comandaNumero || '?',
              fechaPedido: d.fechaPedido ? new Date(d.fechaPedido).toLocaleString('es-PE') : '',
              mesa: d.mesa || '?',
              mozo: d.mozo || '—',
              area: d.area || '',
              moneda: d.moneda === 'USD' ? 'USD' : 'Soles',
              tipoPago: d.tipoPago || 'Pendiente',
              observaciones: d.observaciones || '',
              productos: (d.productos || []).map(p => ({
                nombre: p.nombre || 'Plato',
                cantidad: p.cantidad || 1,
                precio: p.precio || 0,
                subtotal: p.subtotal || (p.precio || 0) * (p.cantidad || 1),
                tipoServicio: p.tipoServicio || 'mesa',
                complementos: (p.complementos || []).map(c => ({ grupo: c.grupo, opcion: c.opcion })),
                notaEspecial: p.notaEspecial || '',
                paraLlevar: p.tipoServicio === 'para_llevar',
              })),
              subtotal: d.subtotal || 0,
              total: d.total || 0,
              cliente: {
                nombre: d.cliente?.nombre || 'Invitado',
                dni: d.cliente?.dni || '',
              },
            };
          }
        } catch (err) {
          console.warn('[TablaAprobacion] ticket-imprimible no disponible, usando datos del ticket:', err.message);
        }
      }

      // Fallback: construir datos a partir del ticket directamente
      if (!datos) {
        datos = {
          comandaNumero: ticket.ticketNumber || ticket.comandasNumbers?.[0] || '?',
          fechaPedido: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('es-PE') : '',
          mesa: ticket.numMesa || ticket.mesaNumero || '?',
          mozo: ticket.nombreMozo || ticket.mozoNombre || '—',
          area: ticket.area || '',
          moneda: ticket.moneda === 'USD' ? 'USD' : 'Soles',
          tipoPago: ticket.metodoPagoLabel || ticket.metodoPago || 'Pendiente',
          observaciones: ticket.observaciones || '',
          productos: (ticket.platos || []).map(p => ({
            nombre: p.nombre || 'Plato',
            cantidad: p.cantidad || 1,
            precio: p.precio || 0,
            subtotal: p.subtotal || (p.precio || 0) * (p.cantidad || 1),
            tipoServicio: p.tipoServicio || 'mesa',
            complementos: (p.complementosSeleccionados || []).map(c => ({ grupo: c.grupo, opcion: c.opcion })),
            notaEspecial: p.notaEspecial || '',
            paraLlevar: p.tipoServicio === 'para_llevar',
          })),
          subtotal: ticket.subtotal || 0,
          total: ticket.total || 0,
          cliente: {
            nombre: ticket.cliente?.nombre || ticket.nombreCliente || 'Invitado',
            dni: ticket.cliente?.dni || ticket.dniCliente || '',
          },
        };
      }

      // 2. Obtener plantilla de comanda
      let plantilla = null;
      try {
        const plantillaRes = await apiGet('/api/configuracion/comanda-plantilla');
        if (plantillaRes?.success && plantillaRes.plantilla) {
          plantilla = plantillaRes.plantilla;
        }
      } catch (err) {
        console.warn('[TablaAprobacion] Plantilla no disponible, usando defaults:', err.message);
      }

      // 3. Generar HTML del ticket térmico 80mm
      const html = generarHtmlComanda80mm(datos, plantilla);
      const printWindow = window.open('', '_blank', 'width=340,height=700');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
      }
    } catch (err) {
      console.error('Error al imprimir comanda:', err.message);
      throw err;
    }
  }, []);

  const cantidadPendientes = items.filter(t => t.estado === 'pendiente_aprobacion').length;
  const cantidadComandas = items.filter(t => t.tipo === 'comanda_completa').length;
  const cantidadPPA = items.filter(t => t.tipo === 'pago_adelantado').length;

  return {
    items,
    loading,
    error,
    socketConnected,
    fetchItems,
    aprobarItem,
    reportarItem,
    rechazarItem,
    imprimirComanda,
    cantidadPendientes,
    cantidadComandas,
    cantidadPPA,
  };
}