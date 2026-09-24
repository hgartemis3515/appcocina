const {
  PERMISO_ENTREGAR_PLATO_ENTERO_KDS,
  botonEntregarPlatoEnteroHabilitado,
  recolectarSeleccionEntregarEntero,
  ejecutarEntregarPlatoEntero,
  puedeEntregarPlatoEnteroPorOrden,
  partirEntregaEnteraPorOrden
} = require('./entregarPlatoEnteroKds');

describe('entregarPlatoEnteroKds', () => {
  test('permiso y habilitación del botón', () => {
    expect(PERMISO_ENTREGAR_PLATO_ENTERO_KDS).toBe('entregar-plato-entero-kds');
    expect(botonEntregarPlatoEnteroHabilitado('FINALIZAR_PLATO')).toBe(true);
    expect(botonEntregarPlatoEnteroHabilitado('ENTREGAR_PLATO')).toBe(true);
    expect(botonEntregarPlatoEnteroHabilitado('TOMAR_PLATO')).toBe(false);
    expect(botonEntregarPlatoEnteroHabilitado('DEJAR_PLATO')).toBe(false);
    expect(botonEntregarPlatoEnteroHabilitado('CAMBIAR_PLATO')).toBe(false);
    expect(botonEntregarPlatoEnteroHabilitado('SOLICITAR_ORDEN')).toBe(false);
    expect(botonEntregarPlatoEnteroHabilitado('SIN_ACCION', { absoluto: true, haySeleccion: true })).toBe(true);
    expect(botonEntregarPlatoEnteroHabilitado('SOLICITAR_ORDEN', { absoluto: true, haySeleccion: true })).toBe(true);
    expect(botonEntregarPlatoEnteroHabilitado('SIN_ACCION', { absoluto: true, haySeleccion: false })).toBe(false);
  });

  test('recolecta verde para finalizar y recoger para entregar', () => {
    const yo = 'u1';
    const comandas = [{
      _id: 'c1',
      platos: [
        { _id: 'p1', estado: 'pedido', procesandoPor: { cocineroId: yo } },
        { _id: 'p2', estado: 'recoger', procesandoPor: { cocineroId: yo } }
      ]
    }];
    const platoStates = new Map([
      ['c1-0', 'seleccionado'],
      ['c1-1', 'entregando']
    ]);
    const r = recolectarSeleccionEntregarEntero({ platoStates, comandas, userId: yo });
    expect(r.aFinalizar.map((x) => x.platoId)).toEqual(['p1']);
    expect(r.aEntregar.map((x) => x.platoId)).toEqual(['p2']);
  });

  test('ignora plato de otro cocinero salvo supervisor', () => {
    const comandas = [{
      _id: 'c1',
      platos: [{ _id: 'p1', estado: 'pedido', procesandoPor: { cocineroId: 'otro' } }]
    }];
    const platoStates = new Map([['c1-0', 'seleccionado']]);
    const normal = recolectarSeleccionEntregarEntero({
      platoStates, comandas, userId: 'yo', isSupervisorView: false
    });
    expect(normal.aFinalizar).toHaveLength(0);
    const supervi = recolectarSeleccionEntregarEntero({
      platoStates, comandas, userId: 'yo', isSupervisorView: true
    });
    expect(supervi.aFinalizar).toHaveLength(1);
  });

  test('absoluto recolecta plato de otro cocinero', () => {
    const comandas = [{
      _id: 'c1',
      platos: [{ _id: 'p1', estado: 'pedido', procesandoPor: { cocineroId: 'otro' } }]
    }];
    const platoStates = new Map([['c1-0', 'seleccionado']]);
    const r = recolectarSeleccionEntregarEntero({
      platoStates, comandas, userId: 'yo', permitirOtroCocinero: true
    });
    expect(r.aFinalizar).toHaveLength(1);
  });

  test('ejecutar absoluto: un lote con flag y no llama entregarPlato', async () => {
    const batchFinalizarPlatos = jest.fn().mockResolvedValue({
      resultados: [{ status: 'fulfilled', value: { exito: true, comandaId: 'c1', platoId: 'p1', platoIndex: 0 } }]
    });
    const entregarPlato = jest.fn();
    const out = await ejecutarEntregarPlatoEntero({
      aFinalizar: [{ comandaId: 'c1', platoId: 'p1', platoIndex: 0 }],
      aEntregar: [{ comandaId: 'c1', platoId: 'p2', platoIndex: 1 }],
      guarniciones: [],
      userId: 'u1',
      batchFinalizarPlatos,
      entregarPlato,
      absoluto: true
    });
    expect(batchFinalizarPlatos).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ platoId: 'p1' }),
        expect.objectContaining({ platoId: 'p2' })
      ]),
      { entregarEnteroAbsoluto: true }
    );
    expect(entregarPlato).not.toHaveBeenCalled();
    expect(out.exitosos).toBe(1);
  });

  test('ejecutar: finalizar y luego salio', async () => {
    const finalizarGuarnicion = jest.fn().mockResolvedValue({ success: true });
    const batchFinalizarPlatos = jest.fn().mockResolvedValue({
      resultados: [{ status: 'fulfilled', value: { exito: true, comandaId: 'c1', platoId: 'p1', platoIndex: 0 } }]
    });
    const entregarPlato = jest.fn().mockResolvedValue({ success: true });
    const out = await ejecutarEntregarPlatoEntero({
      aFinalizar: [{ comandaId: 'c1', platoId: 'p1', platoIndex: 0 }],
      aEntregar: [],
      guarniciones: [{ comandaId: 'c1', platoId: 'p1', platoIndex: 0, compId: 'g1' }],
      userId: 'u1',
      finalizarGuarnicion,
      batchFinalizarPlatos,
      entregarPlato
    });
    expect(finalizarGuarnicion).toHaveBeenCalledTimes(1);
    expect(batchFinalizarPlatos).toHaveBeenCalledTimes(1);
    expect(entregarPlato).toHaveBeenCalledWith('c1', 'p1', 'u1', undefined);
    expect(out.exitosos).toBe(1);
  });

  test('absoluto también respeta el filtro de orden', async () => {
    const batchFinalizarPlatos = jest.fn();
    const out = await ejecutarEntregarPlatoEntero({
      aFinalizar: [{ comandaId: 'c1', platoId: 'p2', platoIndex: 1 }],
      aEntregar: [],
      guarniciones: [],
      userId: 'u1',
      filtrarLote: () => ({ finalizables: [], bloqueados: [{ platoId: 'p2' }] }),
      batchFinalizarPlatos,
      entregarPlato: jest.fn(),
      absoluto: true
    });
    expect(batchFinalizarPlatos).not.toHaveBeenCalled();
    expect(out.omitidos).toHaveLength(1);
    expect(out.exitosos).toBe(0);
  });

  test('si finalizar se omite por cola, no entrega ese plato', async () => {
    const entregarPlato = jest.fn().mockResolvedValue({ success: true });
    const out = await ejecutarEntregarPlatoEntero({
      aFinalizar: [{ comandaId: 'c1', platoId: 'p2', platoIndex: 1 }],
      aEntregar: [],
      guarniciones: [],
      userId: 'u1',
      filtrarLote: () => ({ finalizables: [], bloqueados: [{ platoId: 'p2' }] }),
      batchFinalizarPlatos: jest.fn(),
      entregarPlato
    });
    expect(entregarPlato).not.toHaveBeenCalled();
    expect(out.omitidos).toHaveLength(1);
    expect(out.exitosos).toBe(0);
  });

  test('puestos 1 y 2 de la tabla entregan cualquier plato; desde la 3 solo el prefijo', () => {
    const cocinero = 'c1';
    const plato = (id, ts) => ({
      _id: id,
      estado: 'pedido',
      procesandoPor: { cocineroId: cocinero, timestamp: ts }
    });
    const comandas = [
      { _id: 'a', numeroComandaMozo: 50, createdAt: '2026-01-01T10:00:00.000Z', platos: [plato('p1', 1)] },
      { _id: 'b', numeroComandaMozo: 40, createdAt: '2026-01-01T10:01:00.000Z', platos: [plato('p2', 2)] },
      { _id: 'c', numeroComandaMozo: 1, createdAt: '2026-01-01T10:02:00.000Z', platos: [plato('p3', 3)] }
    ];
    expect(puedeEntregarPlatoEnteroPorOrden({ comandaId: 'a', platoIndex: 0, plato: comandas[0].platos[0], comanda: comandas[0] }, comandas)).toBe(true);
    expect(puedeEntregarPlatoEnteroPorOrden({ comandaId: 'b', platoIndex: 0, plato: comandas[1].platos[0], comanda: comandas[1] }, comandas)).toBe(true);
    expect(puedeEntregarPlatoEnteroPorOrden({ comandaId: 'c', platoIndex: 0, plato: comandas[2].platos[0], comanda: comandas[2] }, comandas)).toBe(false);
  });

  test('prefijo 1+2 o 1..N se entrega sin autorización', () => {
    const cocinero = 'c1';
    const plato = (id, ts) => ({
      _id: id,
      estado: 'pedido',
      procesandoPor: { cocineroId: cocinero, timestamp: ts }
    });
    const comandas = [
      { _id: 'a', createdAt: '2026-01-01T10:00:00.000Z', platos: [plato('p1', 1)] },
      { _id: 'b', createdAt: '2026-01-01T10:01:00.000Z', platos: [plato('p2', 2)] },
      { _id: 'd', createdAt: '2026-01-01T10:02:00.000Z', platos: [plato('p3', 3)] }
    ];
    const items = [
      { comandaId: 'a', platoIndex: 0, plato: comandas[0].platos[0] },
      { comandaId: 'b', platoIndex: 0, plato: comandas[1].platos[0] },
      { comandaId: 'd', platoIndex: 0, plato: comandas[2].platos[0] }
    ];
    const dos = partirEntregaEnteraPorOrden(items.slice(0, 2), comandas);
    expect(dos.bloqueados).toHaveLength(0);
    expect(dos.permitidos).toHaveLength(2);
    const tres = partirEntregaEnteraPorOrden(items, comandas);
    expect(tres.bloqueados).toHaveLength(0);
    expect(tres.permitidos).toHaveLength(3);
    const soloTercera = partirEntregaEnteraPorOrden([items[2]], comandas);
    expect(soloTercera.bloqueados).toHaveLength(1);
  });
});
