import {
  slugsTipoDePlato,
  slugsTipoDeGrupo,
  parseReglasTiposMenu,
  anotarReglasTipoEnItems,
  partirItemsHorizontales,
  partirBloquesHorizontales,
} from './tipoPlatoReglasCocina';

describe('slugsTipoDePlato', () => {
  test('lee tipos y tipo en la línea y en el catálogo anidado', () => {
    expect(slugsTipoDePlato({
      tipo: 'platos-cena',
      tipos: ['plato-carta'],
      plato: { tipos: ['platos-desayuno'], tipo: 'platos-desayuno' },
    }).sort()).toEqual(['plato-carta', 'platos-cena', 'platos-desayuno']);
  });
});

describe('slugsTipoDeGrupo', () => {
  test('une slugs del grupo y de platos envueltos { plato, comanda }', () => {
    const slugs = slugsTipoDeGrupo({
      slugsTipo: ['plato-carta'],
      platos: [{ plato: { tipos: ['platos-cena'] } }],
    });
    expect(slugs.sort()).toEqual(['plato-carta', 'platos-cena']);
  });
});

describe('parseReglasTiposMenu / anotar / partir', () => {
  const reglas = parseReglasTiposMenu([
    { slug: 'plato-carta', nombreCorto: 'CARTA', soloContadorEnCocina: true, particionHorizontalCocina: true },
    { slug: 'platos-cena', nombre: 'Cena', soloContadorEnCocina: false },
  ]);

  test('arma sets y nombres de partición', () => {
    expect(reglas.soloContador.has('plato-carta')).toBe(true);
    expect(reglas.particion.has('plato-carta')).toBe(true);
    expect(reglas.particion.has('platos-cena')).toBe(false);
    expect(reglas.particionNombres).toEqual(['CARTA']);
  });

  test('anota flags en items agrupados', () => {
    const [carta, cena] = anotarReglasTipoEnItems([
      { nombre: 'Lomo', slugsTipo: ['plato-carta'] },
      { nombre: 'Sopa', platos: [{ plato: { tipo: 'platos-cena' } }] },
    ], reglas);
    expect(carta.soloContadorEnCocina).toBe(true);
    expect(carta.particionHorizontalCocina).toBe(true);
    expect(cena.soloContadorEnCocina).toBe(false);
    expect(cena.particionHorizontalCocina).toBe(false);
  });

  test('parte items y bloques en mitades', () => {
    const items = anotarReglasTipoEnItems([
      { key: 'n', nombre: 'Normal', slugsTipo: ['platos-cena'], cantidadTotal: 2 },
      { key: 'c', nombre: 'Carta', slugsTipo: ['plato-carta'], cantidadTotal: 8 },
    ], reglas);
    const split = partirItemsHorizontales(items);
    expect(split.hayParticion).toBe(true);
    expect(split.normales.map((i) => i.key)).toEqual(['n']);
    expect(split.especiales.map((i) => i.key)).toEqual(['c']);

    const bloques = partirBloquesHorizontales([{
      cocinero: { id: '1' },
      tarjetas: items,
      totalPlatos: 10,
    }]);
    expect(bloques.normales[0].totalPlatos).toBe(2);
    expect(bloques.especiales[0].totalPlatos).toBe(8);
  });
});
