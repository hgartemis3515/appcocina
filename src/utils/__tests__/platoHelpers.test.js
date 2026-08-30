/**
 * Tests unitarios para obtenerNombreDisplayCocina
 *
 * PLAN NOMBRE_PLATO_COCINA: el alias corto (nombreCocina) se muestra en
 * pantallas de cocina. Ver Cocina siempre (forzar); tabla KDS según flag.
 * Sin alias, debe caer al nombre comercial (obtenerNombrePlato).
 */

import {
  obtenerNombrePlato,
  obtenerNombreDisplayCocina,
  platoCoincideId,
  normalizarId,
  tipoServicioDePlato,
  esPlatoParaLlevar,
  grupoTieneParaLlevar,
} from '../platoHelpers';

describe('obtenerNombreDisplayCocina', () => {
  test('devuelve nombre comercial si no hay alias (subdoc poblado)', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', precio: 30 } };
    expect(obtenerNombreDisplayCocina(plato, { forzar: true })).toBe('Ceviche Clásico');
  });

  test('devuelve alias si existe y forzar=true (Ver Cocina)', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', nombreCocina: 'CEV' } };
    expect(obtenerNombreDisplayCocina(plato, { forzar: true })).toBe('CEV');
  });

  test('devuelve alias si habilitadoEnKds=true (tabla KDS con flag on)', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', nombreCocina: 'CEV' } };
    expect(obtenerNombreDisplayCocina(plato, { habilitadoEnKds: true })).toBe('CEV');
  });

  test('ignora alias si habilitadoEnKds=false y forzar no está (flag off)', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', nombreCocina: 'CEV' } };
    expect(obtenerNombreDisplayCocina(plato, { habilitadoEnKds: false })).toBe('Ceviche Clásico');
  });

  test('forzar tiene prioridad sobre habilitadoEnKds=false', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', nombreCocina: 'CEV' } };
    expect(obtenerNombreDisplayCocina(plato, { forzar: true, habilitadoEnKds: false })).toBe('CEV');
  });

  test('sin opts, cae al nombre comercial (no aplica alias por defecto)', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', nombreCocina: 'CEV' } };
    expect(obtenerNombreDisplayCocina(plato)).toBe('Ceviche Clásico');
  });

  test('soporta campo desnormalizado (sin subdoc plato)', () => {
    const plato = { nombre: 'Lomo Saltado', nombreCocina: 'Lomo S/' };
    expect(obtenerNombreDisplayCocina(plato, { forzar: true })).toBe('Lomo S/');
  });

  test('alias vacío cae al nombre comercial', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', nombreCocina: '' } };
    expect(obtenerNombreDisplayCocina(plato, { forzar: true })).toBe('Ceviche Clásico');
  });

  test('alias con solo espacios se trata como vacío', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', nombreCocina: '   ' } };
    expect(obtenerNombreDisplayCocina(plato, { forzar: true })).toBe('Ceviche Clásico');
  });

  test('plato null/undefined no rompe', () => {
    expect(obtenerNombreDisplayCocina(null, { forzar: true })).toBe('');
    expect(obtenerNombreDisplayCocina(undefined, { forzar: true })).toBe('');
  });

  test('no modifica el comportamiento de obtenerNombrePlato', () => {
    const plato = { plato: { nombre: 'Ceviche Clásico', nombreCocina: 'CEV' } };
    expect(obtenerNombrePlato(plato)).toBe('Ceviche Clásico');
  });

  test('para_llevar en Ver Cocina usa alias de cocina del catálogo (platos.html)', () => {
    const linea = {
      tipoServicio: 'para_llevar',
      nombre: 'Ceviche Clásico',
      plato: { nombre: 'Ceviche Clásico', nombreCocina: 'CEV' },
    };
    expect(obtenerNombreDisplayCocina(linea, { forzar: true })).toBe('CEV');
  });

  test('item de monitor { plato, comanda } también resuelve el alias', () => {
    const item = {
      plato: {
        tipoServicio: 'para_llevar',
        plato: { nombre: 'Lomo Saltado', nombreCocina: 'Lomo S/' },
      },
      comanda: { comandaNumber: 12 },
    };
    expect(obtenerNombreDisplayCocina(item, { forzar: true })).toBe('Lomo S/');
  });
});

describe('platoCoincideId', () => {
  test('matchea subdoc _id string con $oid del socket', () => {
    const plato = { _id: '64a1b2c3d4e5f67890123456', estado: 'pedido' };
    expect(platoCoincideId(plato, { $oid: '64a1b2c3d4e5f67890123456' })).toBe(true);
  });

  test('no trata String(object) como id', () => {
    const plato = { _id: '64a1b2c3d4e5f67890123456' };
    expect(platoCoincideId(plato, { foo: 1 })).toBe(false);
  });

  test('normalizarId extrae hex de buffer-like', () => {
    const hex = '64a1b2c3d4e5f67890123456';
    const data = [];
    for (let i = 0; i < hex.length; i += 2) data.push(parseInt(hex.slice(i, i + 2), 16));
    expect(normalizarId({ buffer: { data } })).toBe(hex);
  });
});

describe('tipoServicio / PARA LLEVAR', () => {
  test('lee tipoServicio de la línea, no de la comanda', () => {
    const item = {
      plato: { tipoServicio: 'para_llevar', plato: { nombre: 'Lomo' } },
      comanda: { tipoServicio: undefined },
    };
    expect(tipoServicioDePlato(item)).toBe('para_llevar');
    expect(esPlatoParaLlevar(item)).toBe(true);
  });

  test('mesa por defecto', () => {
    expect(tipoServicioDePlato({ plato: { nombre: 'Lomo' }, comanda: {} })).toBe('mesa');
    expect(esPlatoParaLlevar({ tipoServicio: 'mesa' })).toBe(false);
  });

  test('grupoTieneParaLlevar en item de monitor', () => {
    const platos = [
      { plato: { tipoServicio: 'mesa' }, comanda: {} },
      { plato: { tipoServicio: 'para_llevar' }, comanda: {} },
    ];
    expect(grupoTieneParaLlevar(platos)).toBe(true);
    expect(grupoTieneParaLlevar([{ plato: { tipoServicio: 'mesa' }, comanda: {} }])).toBe(false);
  });
});
