const {
  platoOcultaCronometroCocina,
  platoJuntaGuarnicionesEntreVariantes,
  idCatalogoPlatoLinea,
  itemOcultaCronometroCocina,
} = require('./platoFlagsCocina');

describe('platoFlagsCocina', () => {
  test('catálogo true aplica a tickets abiertos', () => {
    expect(platoOcultaCronometroCocina({
      ocultarCronometroCocina: false,
      plato: { ocultarCronometroCocina: true },
    })).toBe(true);
    expect(platoJuntaGuarnicionesEntreVariantes({
      plato: { juntarGuarnicionesEntreVariantes: true },
    })).toBe(true);
  });

  test('itemOcultaCronometroCocina mira platos envueltos del monitor', () => {
    expect(itemOcultaCronometroCocina({
      platos: [{ plato: { ocultarCronometroCocina: true } }],
    })).toBe(true);
    expect(itemOcultaCronometroCocina({ nombre: 'CAFÉ', platos: [{ plato: {} }] })).toBe(false);
  });

  test('idCatalogoPlatoLinea es estable entre variantes del mismo plato', () => {
    const cafe = { platoId: 12, plato: { _id: 'dch1' } };
    const te = { platoId: 12, plato: { _id: 'dch1' } };
    expect(idCatalogoPlatoLinea(cafe)).toBe(idCatalogoPlatoLinea(te));
  });
});
