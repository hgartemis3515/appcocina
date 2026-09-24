const { cambiosGuarnicionVista, tituloFilaVistaG, agruparItemsVistaG } = require('./vistaGGuarnicion');

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
  test('arma G plato x (1) --- numero', () => {
    expect(tituloFilaVistaG('Pollo a la leña', 4)).toBe('G Pollo a la leña x (1) --- 4');
  });
});

describe('agruparItemsVistaG', () => {
  test('cantidad 2 son dos filas con el mismo cambio', () => {
    const platoLinea = plato({ pre: ['Arroz'], pedido: ['Frijol'] });
    const comanda = { _id: 'c1', cantidades: [2] };
    const filas = agruparItemsVistaG(
      [{ comanda, plato: platoLinea, platoIndex: 0, comp: { opcion: 'Frijol', grupo: 'Guarnicion' } }],
      {
        cantidadLinea: () => 2,
        nombrePlato: () => 'Pollo a la leña',
        tiempoDeComp: () => null,
      },
    );
    expect(filas).toHaveLength(2);
    expect(filas[0].claveUnidad).toBe('c1:0:0');
    expect(filas[1].claveUnidad).toBe('c1:0:1');
    expect(filas[0].cambiosG).toEqual([{ salio: 'Arroz', entro: 'Frijol' }]);
    expect(filas[1].cambiosG).toEqual(filas[0].cambiosG);
  });
});
