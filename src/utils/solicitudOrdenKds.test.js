const { extraerResolucionSolicitudOrden } = require('./solicitudOrdenKds');

describe('extraerResolucionSolicitudOrden', () => {
  test('rechazo con nota en solicitud-gestion-actualizada', () => {
    const r = extraerResolucionSolicitudOrden({
      estado: 'rechazada',
      platoNombre: 'Lomo',
      notaResolucion: 'Espera el #1',
      solicitud: { _id: 'abc', estado: 'rechazada', platoNombre: 'Lomo', notaResolucion: 'Espera el #1' }
    });
    expect(r.rechazada).toBe(true);
    expect(r.aprobada).toBe(false);
    expect(r.plato).toBe('Lomo');
    expect(r.nota).toBe('Espera el #1');
  });

  test('rechazo vía nueva-notificacion', () => {
    const r = extraerResolucionSolicitudOrden({
      titulo: 'Orden rechazada',
      mensaje: 'El admin rechazó finalizar "Lomo". Nota: Espera el #1',
      entidadId: 'abc',
      metadata: { tipo: 'solicitud_orden_rechazada', notaResolucion: 'Espera el #1', platoNombre: 'Lomo' }
    });
    expect(r.rechazada).toBe(true);
    expect(r.nota).toBe('Espera el #1');
  });

  test('mismo id entre socket de solicitud y nueva-notificacion', () => {
    const a = extraerResolucionSolicitudOrden({
      estado: 'rechazada',
      solicitud: { _id: 'abc', estado: 'rechazada', platoNombre: 'Lomo' }
    });
    const b = extraerResolucionSolicitudOrden({
      _id: 'notif-999',
      entidadId: 'abc',
      titulo: 'Orden rechazada',
      mensaje: 'El admin rechazó finalizar "Lomo".',
      metadata: { tipo: 'solicitud_orden_rechazada', solicitudGestionId: 'abc' }
    });
    expect(a.id).toBe('abc');
    expect(b.id).toBe('abc');
    expect(b.plato).toBe('Lomo');
  });

  test('ignora payloads que no son resolución de orden', () => {
    expect(extraerResolucionSolicitudOrden({ tipo: 'sistema', mensaje: 'hola' })).toBeNull();
  });
});
