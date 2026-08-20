const {
  extraerNombreOpcion,
  claveNombreComplemento,
  sugerirNombreCanonico,
  contarGuarnicionesPorNombre,
  textoContadorGuarniciones,
} = require('./nombreComplementoCanonico');

describe('claveNombreComplemento', () => {
  test('Papa frita y Papas fritas son la misma clave', () => {
    expect(claveNombreComplemento('Papa frita')).toBe('papa frita');
    expect(claveNombreComplemento('Papas fritas')).toBe('papa frita');
    expect(claveNombreComplemento('papas  fritas')).toBe('papa frita');
  });
  test('ensalada / ensaladas / Arroz', () => {
    expect(claveNombreComplemento('Ensalada')).toBe(claveNombreComplemento('Ensaladas'));
    expect(claveNombreComplemento('Arroz')).toBe('arroz');
  });
  test('ignora acentos y mayúsculas', () => {
    expect(claveNombreComplemento('Papá Frita')).toBe('papa frita');
  });
});

describe('contarGuarnicionesPorNombre', () => {
  test('agrupa variantes y formatea Arroz x1, Papa frita x3', () => {
    const filas = contarGuarnicionesPorNombre([
      { nombre: 'Arroz', cantidad: 1 },
      { nombre: 'Papa frita', cantidad: 1 },
      { nombre: 'Papas fritas', cantidad: 2 },
      { nombre: 'Ensalada', cantidad: 2, pronombre: 'Ensal' },
    ]);
    expect(textoContadorGuarniciones(filas)).toBe('Papas fritas x3, Ensalada x2, Arroz x1');
  });
  test('con pronombre usa el apodo si existe', () => {
    const filas = contarGuarnicionesPorNombre(
      [{ nombre: 'Papa frita', cantidad: 3, pronombre: 'PFrita' }],
      { conPronombre: true }
    );
    expect(textoContadorGuarniciones(filas)).toBe('PFrita x3');
  });
  test('filtra por claves y rellena x0', () => {
    const filas = contarGuarnicionesPorNombre(
      [{ nombre: 'Papa frita', cantidad: 2 }],
      { claves: ['arroz', 'papa frita', 'ensalada'] }
    );
    expect(textoContadorGuarniciones(filas)).toBe('Arroz x0, Papa frita x2, Ensalada x0');
  });
});

describe('sugerirNombreCanonico', () => {
  test('elige el más usado y, en empate, el más corto', () => {
    expect(sugerirNombreCanonico([
      { nombre: 'Papas fritas', total: 2 },
      { nombre: 'Papa frita', total: 5 },
    ])).toBe('Papa frita');
    expect(sugerirNombreCanonico([
      { nombre: 'Papa frita', total: 1 },
      { nombre: 'Papas fritas', total: 1 },
    ])).toBe('Papa frita');
  });
});

describe('extraerNombreOpcion', () => {
  test('string u objeto', () => {
    expect(extraerNombreOpcion('Arroz')).toBe('Arroz');
    expect(extraerNombreOpcion({ nombre: 'Ensalada' })).toBe('Ensalada');
  });
});
