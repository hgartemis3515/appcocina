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

  test('prioriza tipoPedido (tipo elegido en Mozos) sobre el catálogo', () => {
    expect(slugsTipoDePlato({
      tipoPedido: 'platos-cena',
      tipos: ['plato-carta'],
      plato: { tipos: ['plato-carta', 'platos-desayuno'] },
    })).toEqual(['platos-cena']);
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

  test('si hay tipoPedido no mezcla el catálogo', () => {
    expect(slugsTipoDeGrupo({
      platos: [{ plato: { tipoPedido: 'platos-cena', tipos: ['plato-carta'] } }],
    })).toEqual(['platos-cena']);
  });
});

describe('parseReglasTiposMenu / anotar / partir', () => {
  const reglas = parseReglasTiposMenu([
    {
      slug: 'plato-carta',
      nombreCorto: 'CARTA',
      soloContadorEnCocina: true,
      particionHorizontalCocina: true,
      particionHorizontalGuarnicionesCocina: true,
    },
    { slug: 'platos-cena', nombre: 'Cena', soloContadorEnCocina: false },
  ]);

  test('arma sets y nombres de partición', () => {
    expect(reglas.soloContador.has('plato-carta')).toBe(true);
    expect(reglas.particion.has('plato-carta')).toBe(true);
    expect(reglas.particion.has('platos-cena')).toBe(false);
    expect(reglas.particionGuarnicion.has('plato-carta')).toBe(true);
    expect(reglas.particionGuarnicion.has('platos-cena')).toBe(false);
    expect(reglas.particionNombres).toEqual(['CARTA']);
    expect(reglas.particionGuarnicionNombres).toEqual(['CARTA']);
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

  test('el mismo plato en cena no entra a la partición de carta', () => {
    const [desdeCarta, desdeCena] = anotarReglasTipoEnItems([
      { nombre: 'Lomo', tipoPedido: 'plato-carta' },
      { nombre: 'Lomo', tipoPedido: 'platos-cena' },
    ], reglas);
    expect(desdeCarta.particionHorizontalCocina).toBe(true);
    expect(desdeCena.particionHorizontalCocina).toBe(false);
  });

  test('guarniciones usan la marca específica, no la de principales', () => {
    const reglasSoloGuarn = parseReglasTiposMenu([
      { slug: 'plato-carta', particionHorizontalCocina: true },
      { slug: 'platos-cena', particionHorizontalGuarnicionesCocina: true, nombreCorto: 'CENA' },
    ]);
    const [gCarta] = anotarReglasTipoEnItems(
      [{ nombre: 'Arroz', tipoPedido: 'plato-carta', esGuarnicion: true }],
      reglasSoloGuarn,
      { paraGuarniciones: true },
    );
    const [gCena] = anotarReglasTipoEnItems(
      [{ nombre: 'Arroz', tipoPedido: 'platos-cena', esGuarnicion: true }],
      reglasSoloGuarn,
      { paraGuarniciones: true },
    );
    expect(gCarta.particionHorizontalCocina).toBe(false);
    expect(gCena.particionHorizontalCocina).toBe(true);
  });

  test('contador de guarniciones no hereda el solo-contador de principales', () => {
    const reglasCont = parseReglasTiposMenu([
      { slug: 'plato-carta', soloContadorEnCocina: true },
      { slug: 'platos-cena', contadorGuarnicionesCocina: true },
    ]);
    expect(reglasCont.soloContador.has('plato-carta')).toBe(true);
    expect(reglasCont.contadorGuarnicion.has('plato-carta')).toBe(false);
    expect(reglasCont.contadorGuarnicion.has('platos-cena')).toBe(true);

    const [gCarta] = anotarReglasTipoEnItems(
      [{ nombre: 'Papas', tipoPedido: 'plato-carta' }],
      reglasCont,
      { paraGuarniciones: true },
    );
    const [gCena] = anotarReglasTipoEnItems(
      [{ nombre: 'Papas', tipoPedido: 'platos-cena' }],
      reglasCont,
      { paraGuarniciones: true },
    );
    const [pCarta] = anotarReglasTipoEnItems(
      [{ nombre: 'Lomo', tipoPedido: 'plato-carta' }],
      reglasCont,
    );
    expect(gCarta.soloContadorEnCocina).toBe(false);
    expect(gCena.soloContadorEnCocina).toBe(true);
    expect(pCarta.soloContadorEnCocina).toBe(true);
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
