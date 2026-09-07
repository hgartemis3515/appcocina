import { estadoEntregaComandaTicket, estadoEntregaTickets, rangoConsultaDesglose, rangoFechasDePeriodo } from './ticketAprobacionUi';

describe('estadoEntregaComandaTicket', () => {
  test('comanda pagada y mesa libre → ENTREGADO (como comandas.html)', () => {
    const meta = estadoEntregaComandaTicket({
      tipo: 'comanda_completa',
      estado: 'pendiente_aprobacion',
      mesa: { estado: 'libre' },
      comandas: [{ status: 'pagado', platos: [{ estado: 'pagado' }] }],
    });
    expect(meta.entregado).toBe(true);
    expect(meta.label).toBe('ENTREGADO');
  });

  test('no usa el snapshot del ticket si la comanda sigue en espera', () => {
    const meta = estadoEntregaComandaTicket({
      tipo: 'comanda_completa',
      comandas: [{ status: 'en_espera', platos: [{ estado: 'en_espera' }] }],
      platos: [{ estado: 'pagado' }],
      mesa: { estado: 'ocupada' },
    });
    expect(meta.entregado).toBe(false);
    expect(meta.label).toBe('Pendiente');
  });

  test('PPA aprobado no es ENTREGADO hasta que mozos entregue el plato', () => {
    const pendiente = estadoEntregaComandaTicket({
      tipo: 'pago_adelantado',
      estado: 'aprobado',
      esPagoAdelantado: true,
      mesa: { estado: 'libre' },
      comandas: [{ status: 'pagado', platos: [{ estado: 'en_espera' }] }],
      platos: [{ estado: 'pagado' }],
    });
    expect(pendiente.entregado).toBe(false);

    const entregado = estadoEntregaComandaTicket({
      tipo: 'adelantado',
      estado: 'aprobado',
      comandas: [{ status: 'en_espera', platos: [{ estado: 'entregado' }, { estado: 'pagado' }] }],
    });
    expect(entregado.entregado).toBe(true);
    expect(entregado.label).toBe('ENTREGADO');
  });

  test('PPA ignora platos eliminados y exige todos los activos entregados', () => {
    const meta = estadoEntregaComandaTicket({
      tipo: 'pago_adelantado',
      comandas: [{
        status: 'en_espera',
        platos: [
          { estado: 'entregado' },
          { estado: 'en_espera', eliminado: true },
          { estado: 'pedido' },
        ],
      }],
    });
    expect(meta.entregado).toBe(false);
  });

  test('omitir pago: platos entregados y mesa libre aunque el ticket siga pendiente', () => {
    const meta = estadoEntregaComandaTicket({
      tipo: 'comanda_completa',
      estado: 'pendiente_aprobacion',
      mesa: { estado: 'libre' },
      comandas: [{ status: 'en_espera', platos: [{ estado: 'entregado' }] }],
    });
    expect(meta.entregado).toBe(true);
  });

  test('estadoEntregaTickets exige todas las filas entregadas', () => {
    const a = {
      tipo: 'comanda_completa',
      comandas: [{ status: 'pagado' }],
    };
    const b = {
      tipo: 'pago_adelantado',
      comandas: [{ platos: [{ estado: 'pedido' }] }],
    };
    expect(estadoEntregaTickets([a]).entregado).toBe(true);
    expect(estadoEntregaTickets([a, b]).entregado).toBe(false);
  });
});

describe('rangoConsultaDesglose', () => {
  test('DIA usa 00:00 Lima hasta el primer cierre', () => {
    const corte = '2026-09-06T23:00:00.000Z';
    const r = rangoConsultaDesglose('dia', { primerCierreHoyAt: corte });
    expect(new Date(r.fechaFin).toISOString()).toBe(new Date(corte).toISOString());
    expect(new Date(r.fechaInicio).getTime()).toBeLessThan(new Date(r.fechaFin).getTime());
  });

  test('hoy usa YYYY-MM-DD como reportes', () => {
    const r = rangoConsultaDesglose('hoy');
    const esperado = rangoFechasDePeriodo('hoy');
    expect(r).toEqual({ fechaInicio: esperado.desde, fechaFin: esperado.hasta });
  });
});
