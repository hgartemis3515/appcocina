const { claveGrupoPlato, claveGrupoPlatoConCocinero } = require('./useCocinaMonitorFilter');

describe('Ver Cocina: agrupar el mismo plato (normal + reserva)', () => {
  const base = {
    platoId: 42,
    nombre: 'Lomo Saltado',
    tipoServicio: 'mesa',
    complementosSeleccionados: [],
    procesandoPor: { cocineroId: 'cook1', alias: 'Ana' },
  };

  test('comanda normal y reserva del mismo plato comparten clave aunque falte tipoPedido', () => {
    const normal = { ...base, tipoPedido: 'platos-cena' };
    const reserva = { ...base };
    const nombre = 'Lomo Saltado';
    expect(claveGrupoPlato(normal, nombre)).toBe(claveGrupoPlato(reserva, nombre));
    expect(claveGrupoPlatoConCocinero(normal, nombre, true))
      .toBe(claveGrupoPlatoConCocinero(reserva, nombre, true));
  });

  test('para llevar no se junta con el mismo plato de mesa', () => {
    const mesa = { ...base, tipoServicio: 'mesa' };
    const llevar = { ...base, tipoServicio: 'para_llevar' };
    expect(claveGrupoPlato(mesa, 'Lomo Saltado')).not.toBe(claveGrupoPlato(llevar, 'Lomo Saltado'));
  });

  test('extra llevar no se junta con mesa ni con para llevar', () => {
    const mesa = { ...base, tipoServicio: 'mesa' };
    const llevar = { ...base, tipoServicio: 'para_llevar' };
    const extra = { ...base, tipoServicio: 'extra_llevar' };
    expect(claveGrupoPlato(extra, 'Lomo Saltado')).not.toBe(claveGrupoPlato(mesa, 'Lomo Saltado'));
    expect(claveGrupoPlato(extra, 'Lomo Saltado')).not.toBe(claveGrupoPlato(llevar, 'Lomo Saltado'));
  });

  test('otro cocinero no comparte cuadro cuando se agrupa por cocinero', () => {
    const a = { ...base, procesandoPor: { cocineroId: 'cook1' } };
    const b = { ...base, procesandoPor: { cocineroId: 'cook2' } };
    expect(claveGrupoPlatoConCocinero(a, 'Lomo Saltado', true))
      .not.toBe(claveGrupoPlatoConCocinero(b, 'Lomo Saltado', true));
  });
});
