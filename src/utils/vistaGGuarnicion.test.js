const { cambiosGuarnicionVista, tituloFilaVistaG, agruparItemsVistaG, chipsOrdenDesdeMapa } = require('./vistaGGuarnicion');

function plato({ pre = [], pedido = [] } = {}) {
  return {
    nombre: 'Pollo a la leña',
    nombreCocina: 'Pollo leña',
    complementos: [{
      grupo: 'Guarnicion',
      opciones: pre.map((nombre) => ({ nombre, preseleccionada: true })),
    }],
    complementosSeleccionados: pedido.map((nombre) => ({ grupo: 'Guarnicion', opcion: nombre })),
  };
}

describe('cambiosGuarnicionVista', () => {
  test('sin marcas de catálogo no lista nada', () => {
    const p = plato({ pedido: ['Arroz'] });
    p.complementos = [];
    expect(cambiosGuarnicionVista(p)).toEqual([]);
  });

  test('lo que coincide no se muestra', () => {
    expect(cambiosGuarnicionVista(plato({
      pre: ['Arroz', 'Ensalada'],
      pedido: ['Arroz', 'Ensalada'],
    }))).toEqual([]);
  });

  test('Arroz tachado y flecha a Frijol', () => {
    expect(cambiosGuarnicionVista(plato({
      pre: ['Arroz'],
      pedido: ['Frijol'],
    }))).toEqual([{ salio: 'Arroz', entro: 'Frijol' }]);
  });

  test('ignora mayúsculas y empareja el primero que sale con el primero que entra', () => {
    expect(cambiosGuarnicionVista(plato({
      pre: ['Arroz', 'Papa'],
      pedido: ['frijol', 'Yuca'],
    }))).toEqual([
      { salio: 'Arroz', entro: 'frijol' },
      { salio: 'Papa', entro: 'Yuca' },
    ]);
  });

  test('no lista la variante MIX', () => {
    const p = plato({ pre: ['Arroz'], pedido: ['Arroz'] });
    p.complementos.push({
      grupo: 'Sabores',
      esVariantePlato: true,
      opciones: [{ nombre: 'Res', preseleccionada: true }],
    });
    p.complementosSeleccionados.push({ grupo: 'Sabores', opcion: 'Pollo' });
    expect(cambiosGuarnicionVista(p)).toEqual([]);
  });
});

describe('tituloFilaVistaG', () => {
  test('arma G plato (qty)', () => {
    expect(tituloFilaVistaG('Pollo a la leña', 1)).toBe('G Pollo a la leña (1)');
    expect(tituloFilaVistaG('Pollo a la leña', 2)).toBe('G Pollo a la leña (2)');
  });
});

describe('chipsOrdenDesdeMapa', () => {
  test('ordena #1(2), #3(4)', () => {
    expect(chipsOrdenDesdeMapa(new Map([[3, 4], [1, 2]]))).toEqual([
      { orden: 1, cantidad: 2 },
      { orden: 3, cantidad: 4 },
    ]);
  });
});

describe('agruparItemsVistaG', () => {
  test('misma guarnición de varias comandas se junta con #orden(cant)', () => {
    const platoLinea = plato({ pre: ['Arroz'], pedido: ['Frijol'] });
    const c1 = { _id: 'c1', cantidades: [2] };
    const c3 = { _id: 'c3', cantidades: [4] };
    const filas = agruparItemsVistaG(
      [
        { comanda: c1, plato: platoLinea, platoIndex: 0, comp: { opcion: 'Frijol', grupo: 'Guarnicion', cantidad: 1 } },
        { comanda: c3, plato: platoLinea, platoIndex: 0, comp: { opcion: 'Frijol', grupo: 'Guarnicion', cantidad: 1 } },
      ],
      {
        cantidadLinea: (cmd) => (cmd._id === 'c1' ? 2 : 4),
        nombrePlato: () => 'Pollo a la leña',
        tiempoDeComp: () => null,
        indiceTabla: new Map([['c1', 1], ['c3', 3]]),
      },
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].nombrePlato).toBe('Pollo a la leña');
    expect(filas[0].qtyGuarnicion).toBe(1);
    expect(filas[0].chipsOrden).toEqual([
      { orden: 1, cantidad: 2 },
      { orden: 3, cantidad: 4 },
    ]);
    expect(filas[0].cambiosG).toEqual([{ salio: 'Arroz', entro: 'Frijol' }]);
  });
});
