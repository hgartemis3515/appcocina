/**
 * Payload de solicitud de orden (aprobar/rechazar) desde sockets KDS.
 * Acepta `solicitud-gestion-actualizada` o `nueva-notificacion`.
 */

export function extraerResolucionSolicitudOrden(data) {
  if (!data || typeof data !== 'object') return null;
  const s = data.solicitud && typeof data.solicitud === 'object' ? data.solicitud : data;
  const meta = data.metadata || s.metadata || data.accion?.datos || {};
  const estado = s.estado || data.estado || meta.estado || null;
  const tipoMeta = meta.tipo || data.tipo || null;

  const esAprobada = estado === 'aprobada' || tipoMeta === 'solicitud_orden_aprobada' || data.overrideOrdenCola === true;
  const esRechazada = estado === 'rechazada' || tipoMeta === 'solicitud_orden_rechazada';
  if (!esAprobada && !esRechazada) return null;

  const notaRaw =
    s.notaResolucion ??
    data.notaResolucion ??
    meta.notaResolucion ??
    s.nota ??
    data.nota ??
    data.accion?.datos?.notaResolucion ??
    null;
  const nota = notaRaw != null && String(notaRaw).trim() ? String(notaRaw).trim() : null;

  let plato = s.platoNombre || data.platoNombre || meta.platoNombre || null;
  if (!plato && typeof data.mensaje === 'string') {
    const m = data.mensaje.match(/finalizar "([^"]+)"/);
    if (m) plato = m[1];
  }

  // Misma clave para solicitud-gestion-actualizada y nueva-notificacion (no usar _id de Notificacion)
  const id = String(
    (data.solicitud && data.solicitud._id) ||
      meta.solicitudGestionId ||
      data.entidadId ||
      (s !== data ? s._id : '') ||
      ''
  );

  return {
    aprobada: !!esAprobada,
    rechazada: !!esRechazada,
    plato: plato || 'plato',
    nota,
    id,
    comandaId: data.comandaId || s.comandaId || meta.comandaId || null,
    platoId: data.platoId || s.platoId || meta.platoId || null,
    platoIndex: data.platoIndex ?? s.platoIndex ?? null,
    overrideOrdenCola: data.overrideOrdenCola === true || estado === 'aprobada',
  };
}
