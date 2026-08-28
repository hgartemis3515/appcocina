const {
  PERMISO_ENTREGAR_PLATO_ENTERO_KDS,
  botonEntregarPlatoEnteroHabilitado,
  recolectarSeleccionEntregarEntero,
  ejecutarEntregarPlatoEntero
} = require('./entregarPlatoEnteroKds');

describe('entregarPlatoEnteroKds', () => {
  test('permiso y habilitación del botón', () => {
    expect(PERMISO_ENTREGAR_PLATO_ENTERO_KDS).toBe('entregar-plato-entero-kds');
    expect(botonEntregarPlatoEnteroHabilitado('FINALIZAR_PLATO')).toBe(true);
    expect(botonEntregarPlatoEnteroHabilitado('ENTREGAR_PLATO')).toBe(true);
    expect(botonEntregarPlatoEnteroHabilitado('TOMAR_PLATO')).toBe(false);
    expect(botonEntregarPlatoEnteroHabilitado('DEJAR_PLATO')).toBe(false);
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
    expect(entregarPlato).toHaveBeenCalledWith('c1', 'p1', 'u1');
    expect(out.exitosos).toBe(1);
  });

  test('absoluto no recorta por cola FIFO', async () => {
    const batchFinalizarPlatos = jest.fn().mockResolvedValue({
      resultados: [{ status: 'fulfilled', value: { exito: true, comandaId: 'c1', platoId: 'p2', platoIndex: 1 } }]
    });
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
    expect(batchFinalizarPlatos).toHaveBeenCalledWith(
      [expect.objectContaining({ platoId: 'p2' })],
      { entregarEnteroAbsoluto: true }
    );
    expect(out.omitidos).toHaveLength(0);
    expect(out.exitosos).toBe(1);
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
});
