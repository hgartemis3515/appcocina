/**
 * Tests del helper guarnicionesKds (PLAN GUARNICIONES_SEPARADAS v1.1 §8).
 * Escenarios de servicio real: muchas papas, VIP/refire, estación saturada, batch.
 */
const {
  normalizarGuarnicionKey,
  esGuarnicionSeparable,
  platoUneComplementos,
  nombrePlatoPadre,
  nombreGuarnicionConPadre,
  expandirUnidadesTrabajo,
  claveAgrupacionUnidad,
  estadoAlertaGuarnicion,
  prioridadUnidad
} = require('./guarnicionesKds');

describe('normalizarGuarnicionKey', () => {
  test('trim + lowercase canónico', () => {
    expect(normalizarGuarnicionKey('Proteína ', ' Pollo')).toBe('proteína::pollo');
    expect(normalizarGuarnicionKey('Acompañamiento', 'Papas Fritas')).toBe('acompañamiento::papas fritas');
  });
  test('vacío produce "::"', () => {
    expect(normalizarGuarnicionKey('', '')).toBe('::');
  });
});

describe('esGuarnicionSeparable', () => {
  test('flag OFF nunca separable', () => {
    const plato = { complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas' }] };
    expect(esGuarnicionSeparable(plato, false)).toBe(false);
  });
  test('flag ON + con complementos', () => {
    const plato = { complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas' }] };
    expect(esGuarnicionSeparable(plato, true)).toBe(true);
  });
  test('flag ON sin complementos', () => {
    expect(esGuarnicionSeparable({ complementosSeleccionados: [] }, true)).toBe(false);
    expect(esGuarnicionSeparable({}, true)).toBe(false);
  });
  test('unidos al plato: no separable aunque flag ON y haya extras', () => {
    const plato = {
      complementosUnidosAlPlato: true,
      complementosSeleccionados: [{ grupo: 'Sabor', opcion: 'Pollo' }]
    };
    expect(platoUneComplementos(plato)).toBe(true);
    expect(esGuarnicionSeparable(plato, true)).toBe(false);
  });
  test('fallback catálogo populado si no hay snapshot', () => {
    const plato = {
      complementosSeleccionados: [{ grupo: 'Sabor', opcion: 'Cordero' }],
      plato: { complementosUnidosAlPlato: true, nombre: 'Pachamanca' }
    };
    expect(esGuarnicionSeparable(plato, true)).toBe(false);
  });
  test('catálogo true une aunque snapshot de línea sea false', () => {
    const plato = {
      complementosUnidosAlPlato: false,
      complementosSeleccionados: [{ grupo: 'Sabor', opcion: 'Pollo' }],
      plato: { complementosUnidosAlPlato: true, nombre: 'Pachamanca 1 sabor' }
    };
    expect(platoUneComplementos(plato)).toBe(true);
    expect(esGuarnicionSeparable(plato, true)).toBe(false);
  });
});

describe('nombreGuarnicionConPadre', () => {
  test('formato "Papas fritas (Lomo Saltado)"', () => {
    const comp = { opcion: 'Papas fritas', cantidad: 1 };
    expect(nombreGuarnicionConPadre(comp, 'Lomo Saltado')).toBe('Papas fritas (Lomo Saltado)');
  });
  test('cantidad > 1 añade xN', () => {
    const comp = { opcion: 'Papas fritas', cantidad: 3 };
    expect(nombreGuarnicionConPadre(comp, 'Lomo Saltado')).toBe('Papas fritas x3 (Lomo Saltado)');
  });
  test('1 por unidad × 3 platos añade x3', () => {
    const comp = { opcion: 'Zarza criolla', cantidad: 1 };
    expect(nombreGuarnicionConPadre(comp, 'Lomo Saltado', { cantidad: 3 }))
      .toBe('Zarza criolla x3 (Lomo Saltado)');
  });
  test('sin padre devuelve solo la guarnición', () => {
    expect(nombreGuarnicionConPadre({ opcion: 'Ensalada', cantidad: 1 }, '')).toBe('Ensalada');
  });
  test('opcion array se une con coma', () => {
    const comp = { opcion: ['Arroz', 'Frijoles'], cantidad: 1 };
    expect(nombreGuarnicionConPadre(comp, 'Pollo')).toBe('Arroz, Frijoles (Pollo)');
  });
});

const { nombreGuarnicionSolo } = require('./guarnicionesKds');

describe('nombreGuarnicionSolo', () => {
  test('devuelve solo la opción sin padre', () => {
    expect(nombreGuarnicionSolo({ opcion: 'Arroz', cantidad: 1 })).toBe('Arroz');
  });
  test('opcion array se une con coma', () => {
    expect(nombreGuarnicionSolo({ opcion: ['Arroz', 'Frijoles'], cantidad: 2 })).toBe('Arroz, Frijoles');
  });
  test('sin opción devuelve string vacío', () => {
    expect(nombreGuarnicionSolo({})).toBe('');
  });
});

const { textoGuarnicionEnPrincipal } = require('./guarnicionesKds');

describe('textoGuarnicionEnPrincipal', () => {
  test('solo la opción, nunca el grupo', () => {
    expect(textoGuarnicionEnPrincipal({ grupo: 'Sabores', opcion: 'Res' })).toBe('Res');
    expect(textoGuarnicionEnPrincipal({ grupo: 'Guarnición', opcion: 'Arroz' })).toBe('Arroz');
  });
  test('cantidad > 1 añade ×N', () => {
    expect(textoGuarnicionEnPrincipal({ grupo: 'Sabores', opcion: 'Pollo', cantidad: 2 })).toBe('Pollo ×2');
  });
  test('3 platos × 1 zarza por unidad = Zarza ×3', () => {
    expect(textoGuarnicionEnPrincipal(
      { grupo: 'Guarnición', opcion: 'Zarza criolla', cantidad: 1 },
      { cantidad: 3 }
    )).toBe('Zarza criolla ×3');
  });
  test('eliminado no se muestra', () => {
    expect(textoGuarnicionEnPrincipal({ grupo: 'Sabores', opcion: 'Res', eliminado: true })).toBe('');
  });
});

const { cantidadGuarnicionEfectiva, textosGuarnicionesDeGrupo, tituloGrupoGuarniciones, platoConCantidadDeLinea } = require('./guarnicionesKds');

describe('cantidadGuarnicionEfectiva (por unidad × platos)', () => {
  const zarza = { grupo: 'Guarnición', opcion: 'Zarza criolla', cantidad: 1 };
  const pan = { grupo: 'Guarnición', opcion: 'Pan más', cantidad: 1 };

  test('1 zarza + 1 pan × 3 platos = 3 y 3', () => {
    const plato = { cantidad: 3 };
    expect(cantidadGuarnicionEfectiva(zarza, plato)).toBe(3);
    expect(cantidadGuarnicionEfectiva(pan, plato)).toBe(3);
  });

  test('sin cantidad de plato queda 1×1', () => {
    expect(cantidadGuarnicionEfectiva(zarza, {})).toBe(1);
    expect(cantidadGuarnicionEfectiva(zarza)).toBe(1);
  });

  test('2 extras por unidad × 3 platos = 6', () => {
    expect(cantidadGuarnicionEfectiva({ opcion: 'Zarza criolla', cantidad: 2 }, { cantidad: 3 })).toBe(6);
  });

  test('3 pan con huevo: cantidades[i]=3 y 2 pan / 2 jose por unidad = 6 y 6', () => {
    const comanda = { cantidades: [3], platos: [{ cantidad: 1 }] };
    const plato = comanda.platos[0];
    expect(cantidadGuarnicionEfectiva({ opcion: 'Pan', cantidad: 2 }, plato, comanda, 0)).toBe(6);
    expect(cantidadGuarnicionEfectiva({ opcion: 'Jose', cantidad: 2 }, plato, comanda, 0)).toBe(6);
  });

  test('expandirUnidadesTrabajo pone cantidadEfectiva 3 en cada guarnición', () => {
    const plato = {
      nombre: 'Lomo',
      cantidad: 3,
      complementosSeleccionados: [
        { grupo: 'Guarnición', opcion: 'Zarza criolla', cantidad: 1, _id: 'z1' },
        { grupo: 'Guarnición', opcion: 'Pan más', cantidad: 1, _id: 'p1' },
      ],
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true, agrupacionOn: false });
    const guarniciones = unidades.filter((u) => u.tipo === 'guarnicion');
    expect(guarniciones).toHaveLength(2);
    expect(guarniciones.map((g) => g.cantidadEfectiva)).toEqual([3, 3]);
  });

  test('grupo de guarniciones: título ×3 y cantidadEfectiva 6', () => {
    const plato = {
      _id: 'p1',
      nombre: 'Lomo',
      cantidad: 3,
      complementosSeleccionados: [
        { grupo: 'Guarnición', opcion: 'Zarza criolla', cantidad: 1, _id: 'z1' },
        { grupo: 'Guarnición', opcion: 'Pan más', cantidad: 1, _id: 'p1' },
      ],
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true, agrupacionOn: true });
    const grupo = unidades.find((u) => u.tipo === 'grupo_guarniciones');
    expect(grupo.cantidadEfectiva).toBe(6);
    expect(grupo.nombreGuarnicion).toBe('Zarza criolla x3 + Pan más x3');
  });

  test('tituloGrupoGuarniciones multiplica por platos', () => {
    expect(tituloGrupoGuarniciones([zarza, pan], { cantidad: 3 }))
      .toBe('Zarza criolla x3 + Pan más x3');
  });

  test('textosGuarnicionesDeGrupo suma 3 líneas de qty 1', () => {
    const items = [1, 2, 3].map((n) => ({
      plato: {
        cantidad: 1,
        complementosSeleccionados: [
          { opcion: 'Zarza criolla', cantidad: 1 },
          { opcion: 'Pan más', cantidad: 1 },
        ],
      },
    }));
    expect(textosGuarnicionesDeGrupo(items)).toEqual([
      'Zarza criolla ×3',
      'Pan más ×3',
    ]);
  });

  test('textosGuarnicionesDeGrupo una línea qty 3', () => {
    const items = [{
      plato: {
        cantidad: 3,
        complementosSeleccionados: [
          { opcion: 'Zarza criolla', cantidad: 1 },
          { opcion: 'Pan más', cantidad: 1 },
        ],
      },
    }];
    expect(textosGuarnicionesDeGrupo(items)).toEqual([
      'Zarza criolla ×3',
      'Pan más ×3',
    ]);
  });

  test('textosGuarnicionesDeGrupo usa comanda.cantidades (2 pan × 3 platos = 6)', () => {
    const plato = {
      cantidad: 1,
      complementosSeleccionados: [
        { opcion: 'Pan', cantidad: 2 },
        { opcion: 'Jose', cantidad: 2 },
      ],
    };
    const items = [{
      plato,
      comanda: { cantidades: [3], platos: [plato] },
      platoIndex: 0,
    }];
    expect(textosGuarnicionesDeGrupo(items)).toEqual(['Pan ×6', 'Jose ×6']);
  });

  test('textosGuarnicionesDeGrupo sin platoIndex usa comanda.platos', () => {
    const plato = {
      _id: 'linea1',
      cantidad: 1,
      complementosSeleccionados: [
        { opcion: 'Pan', cantidad: 2 },
        { opcion: 'Jose', cantidad: 2 },
      ],
    };
    const items = [{
      plato,
      comanda: { cantidades: [3], platos: [plato] },
    }];
    expect(textosGuarnicionesDeGrupo(items)).toEqual(['Pan ×6', 'Jose ×6']);
  });

  test('platoConCantidadDeLinea toma cantidades[i] aunque falte platoIndex', () => {
    const plato = { _id: 'a', cantidad: 1 };
    const patched = platoConCantidadDeLinea({
      plato,
      comanda: { cantidades: [3], platos: [plato] },
    });
    expect(patched.cantidad).toBe(3);
  });
});

describe('expandirUnidadesTrabajo', () => {
  test('flag OFF: solo principal, sin partir', () => {
    const plato = {
      nombre: 'Lomo Saltado',
      complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas', _id: 'c1' }]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: false });
    expect(unidades).toHaveLength(1);
    expect(unidades[0].tipo).toBe('principal');
    expect(unidades[0].ocultarComplementos).toBeUndefined();
  });

  test('flag ON: principal + 1 guarnición por cada complemento', () => {
    const plato = {
      nombre: 'Lomo Saltado',
      complementosSeleccionados: [
        { grupo: 'Acomp', opcion: 'Papas', _id: 'c1' },
        { grupo: 'Salsa', opcion: 'Criolla', _id: 'c2' }
      ]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
    expect(unidades).toHaveLength(3);
    expect(unidades[0].tipo).toBe('principal');
    expect(unidades[0].ocultarComplementos).toBe(true); // no pintar extras anidados
    expect(unidades[1].tipo).toBe('guarnicion');
    expect(unidades[1].compId).toBe('c1');
    // §9.3: la tarjeta muestra solo el nombre de la guarnición (sin padre).
    expect(unidades[1].nombreGuarnicion).toBe('Papas');
    expect(unidades[2].compId).toBe('c2');
    expect(unidades[2].nombreGuarnicion).toBe('Criolla');
  });

  test('flag ON + sin complementos: solo principal, sin ocultarComplementos', () => {
    const plato = { nombre: 'Ceviche', complementosSeleccionados: [] };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
    expect(unidades).toHaveLength(1);
    expect(unidades[0].tipo).toBe('principal');
    expect(unidades[0].ocultarComplementos).toBeUndefined();
  });

  test('unidos al plato: una sola unidad principal y se pintan los extras', () => {
    const plato = {
      nombre: 'Pachamanca',
      complementosUnidosAlPlato: true,
      complementosSeleccionados: [
        { grupo: 'Sabor', opcion: 'Pollo', _id: 'c1' },
        { grupo: 'Sabor', opcion: 'Cerdo', _id: 'c2' }
      ]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
    expect(unidades).toHaveLength(1);
    expect(unidades[0].tipo).toBe('principal');
    expect(unidades[0].ocultarComplementos).toBeUndefined();
  });

  test('unidos vía catálogo (snapshot false): una tarjeta, extras visibles, agrupación no parte', () => {
    const plato = {
      nombre: 'Pachamanca 1 sabor',
      estado: 'pedido',
      complementosUnidosAlPlato: false,
      complementosSeleccionados: [{ grupo: 'Sabor', opcion: 'Pollo', _id: 'c1' }],
      plato: { complementosUnidosAlPlato: true, nombre: 'Pachamanca 1 sabor' }
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true, agrupacionOn: true });
    expect(unidades).toHaveLength(1);
    expect(unidades[0].tipo).toBe('principal');
    expect(unidades[0].ocultarComplementos).toBeUndefined();
  });

  test('complementos eliminados se saltan', () => {
    const plato = {
      nombre: 'Pollo',
      complementosSeleccionados: [
        { grupo: 'Acomp', opcion: 'Papas', _id: 'c1' },
        { grupo: 'Acomp', opcion: 'Ensalada', _id: 'c2', eliminado: true }
      ]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
    expect(unidades).toHaveLength(2); // principal + 1 guarnición (la eliminada se salta)
    expect(unidades.filter(u => u.tipo === 'guarnicion')).toHaveLength(1);
  });

  test('usa alias de cocina si existe', () => {
    const plato = {
      nombre: 'Lomo Saltado Completo',
      nombreCocina: 'Lomo',
      complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas', _id: 'c1' }]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true, usarAlias: true });
    expect(unidades[1].nombrePadre).toBe('Lomo');
    expect(unidades[1].nombreGuarnicion).toBe('Papas');
  });

  test('usa alias de cocina del catálogo anidado (plato.plato.nombreCocina)', () => {
    const plato = {
      nombre: 'Lomo Saltado Completo',
      tipoServicio: 'para_llevar',
      plato: { nombre: 'Lomo Saltado Completo', nombreCocina: 'Lomo S/' },
      complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas', _id: 'c1' }]
    };
    expect(nombrePlatoPadre(plato, true)).toBe('Lomo S/');
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true, usarAlias: true });
    expect(unidades[1].nombrePadre).toBe('Lomo S/');
  });

  test('§9.3.3 FUSIÓN: plato en recoger → una sola tarjeta fusionada', () => {
    const plato = {
      nombre: 'Lomo Saltado',
      estado: 'recoger',
      complementosSeleccionados: [
        { grupo: 'Acomp', opcion: 'Papas', _id: 'c1', estadoCocina: 'recoger' },
        { grupo: 'Salsa', opcion: 'Criolla', _id: 'c2', estadoCocina: 'recoger' }
      ]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
    expect(unidades).toHaveLength(1);
    expect(unidades[0].tipo).toBe('principal');
    expect(unidades[0].fusionado).toBe(true);
    expect(unidades[0].ocultarComplementos).toBeUndefined();
  });

  test('§9.3.3 FUSIÓN: plato en salio/entregado/pagado también fusiona', () => {
    for (const estado of ['salio', 'entregado', 'pagado']) {
      const plato = {
        nombre: 'Pollo', estado,
        complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas', _id: 'c1', estadoCocina: 'recoger' }]
      };
      const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
      expect(unidades).toHaveLength(1);
      expect(unidades[0].fusionado).toBe(true);
    }
  });

  test('§9.3.3 NO fusiona mientras plato en pedido/en_espera', () => {
    for (const estado of ['pedido', 'en_espera']) {
      const plato = {
        nombre: 'Pollo', estado,
        complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas', _id: 'c1' }]
      };
      const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
      expect(unidades).toHaveLength(2); // principal + guarnición (partido)
      expect(unidades[0].ocultarComplementos).toBe(true);
    }
  });

  test('guarnición recoger desaparece; el principal se mantiene', () => {
    const plato = {
      nombre: 'Lomo Saltado',
      estado: 'en_espera',
      complementosSeleccionados: [
        { grupo: 'Acomp', opcion: 'Papas', _id: 'c1', estadoCocina: 'recoger' },
        { grupo: 'Salsa', opcion: 'Criolla', _id: 'c2', estadoCocina: 'en_espera' }
      ]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
    expect(unidades).toHaveLength(2); // principal + criolla (papas ya lista)
    expect(unidades.filter(u => u.tipo === 'guarnicion').map(u => u.nombreGuarnicion))
      .toEqual(['Criolla']);
  });

  test('sin _id usa fallback idx:N para no colisionar con el principal', () => {
    const plato = {
      nombre: 'Lomo',
      estado: 'pedido',
      complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas' }]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
    expect(unidades[1].compId).toBe('idx:0');
  });
});

describe('claveAgrupacionUnidad', () => {
  test('principales distintos no colisionan', () => {
    const p1 = { nombre: 'Lomo' };
    const p2 = { nombre: 'Pollo' };
    expect(claveAgrupacionUnidad({ tipo: 'principal', plato: p1 }, true))
      .not.toBe(claveAgrupacionUnidad({ tipo: 'principal', plato: p2 }, true));
  });
  test('guarniciones de mismo key pero distinto padre no colisionan', () => {
    const u1 = { tipo: 'guarnicion', comp: { grupo: 'Acomp', opcion: 'Papas' }, nombrePadre: 'Lomo' };
    const u2 = { tipo: 'guarnicion', comp: { grupo: 'Acomp', opcion: 'Papas' }, nombrePadre: 'Pollo' };
    expect(claveAgrupacionUnidad(u1, true)).not.toBe(claveAgrupacionUnidad(u2, true));
  });
  test('guarniciones del mismo key y padre colisionan (mismo batch)', () => {
    const u1 = { tipo: 'guarnicion', comp: { grupo: 'Acomp', opcion: 'Papas' }, nombrePadre: 'Lomo' };
    const u2 = { tipo: 'guarnicion', comp: { grupo: 'Acomp', opcion: 'Papas' }, nombrePadre: 'Lomo' };
    expect(claveAgrupacionUnidad(u1, true)).toBe(claveAgrupacionUnidad(u2, true));
  });
  test('principales unidos no colisionan si el sabor es distinto', () => {
    const p1 = {
      nombre: 'Pachamanca',
      complementosUnidosAlPlato: true,
      complementosSeleccionados: [{ grupo: 'Sabor', opcion: 'Pollo' }]
    };
    const p2 = {
      nombre: 'Pachamanca',
      complementosUnidosAlPlato: true,
      complementosSeleccionados: [{ grupo: 'Sabor', opcion: 'Cordero' }]
    };
    expect(claveAgrupacionUnidad({ tipo: 'principal', plato: p1 }, true))
      .not.toBe(claveAgrupacionUnidad({ tipo: 'principal', plato: p2 }, true));
  });
});

describe('estadoAlertaGuarnicion', () => {
  const cfg = { umbralAlertaMultiplo: 1.5, umbralCriticaMultiplo: 2 };
  test('sin procesandoPor → null', () => {
    expect(estadoAlertaGuarnicion({}, cfg)).toBeNull();
  });
  test('sin tiempoMedio → null', () => {
    const comp = { procesandoPor: { timestamp: new Date() }, tiempoMedioPreparacion: 0 };
    expect(estadoAlertaGuarnicion(comp, cfg)).toBeNull();
  });
  test('recién tomada → null', () => {
    const comp = {
      procesandoPor: { timestamp: new Date() },
      tiempoMedioPreparacion: 300
    };
    expect(estadoAlertaGuarnicion(comp, cfg)).toBeNull();
  });
  test('≥ 1.5× medio → alerta', () => {
    const comp = {
      procesandoPor: { timestamp: new Date(Date.now() - 460 * 1000) }, // 460s
      tiempoMedioPreparacion: 300
    };
    expect(estadoAlertaGuarnicion(comp, cfg)).toBe('alerta');
  });
  test('≥ 2× medio → critica', () => {
    const comp = {
      procesandoPor: { timestamp: new Date(Date.now() - 610 * 1000) }, // 610s
      tiempoMedioPreparacion: 300
    };
    expect(estadoAlertaGuarnicion(comp, cfg)).toBe('critica');
  });
});

describe('prioridadUnidad', () => {
  test('sin etiquetas → 0', () => {
    expect(prioridadUnidad({})).toBe(0);
    expect(prioridadUnidad({ etiquetasPrioridad: {} })).toBe(0);
  });
  test('refire > vip > tiempoLimitado', () => {
    expect(prioridadUnidad({ etiquetasPrioridad: { refire: true } })).toBe(3);
    expect(prioridadUnidad({ etiquetasPrioridad: { vip: true } })).toBe(2);
    expect(prioridadUnidad({ etiquetasPrioridad: { tiempoLimitado: true } })).toBe(1);
  });
  test('refire gana sobre vip', () => {
    expect(prioridadUnidad({ etiquetasPrioridad: { refire: true, vip: true } })).toBe(3);
  });
});

const { todasGuarnicionesListas, guarnicionesPendientes } = require('./guarnicionesKds');

describe('todasGuarnicionesListas', () => {
  test('sin complementos → true', () => {
    expect(todasGuarnicionesListas({})).toBe(true);
    expect(todasGuarnicionesListas({ complementosSeleccionados: [] })).toBe(true);
  });
  test('todas en recoger → true', () => {
    const plato = { complementosSeleccionados: [
      { estadoCocina: 'recoger' }, { estadoCocina: 'recoger' }
    ]};
    expect(todasGuarnicionesListas(plato)).toBe(true);
  });
  test('una pendiente → false', () => {
    const plato = { complementosSeleccionados: [
      { estadoCocina: 'recoger' }, { estadoCocina: 'en_espera' }
    ]};
    expect(todasGuarnicionesListas(plato)).toBe(false);
  });
  test('eliminadas no cuentan', () => {
    const plato = { complementosSeleccionados: [
      { estadoCocina: 'recoger' }, { eliminado: true, estadoCocina: 'pedido' }
    ]};
    expect(todasGuarnicionesListas(plato)).toBe(true);
  });
});

describe('guarnicionesPendientes', () => {
  test('devuelve solo las no recoger y no eliminadas', () => {
    const plato = { complementosSeleccionados: [
      { _id: 'c1', grupo: 'Acomp', opcion: 'Papas', estadoCocina: 'recoger' },
      { _id: 'c2', grupo: 'Acomp', opcion: 'Arroz', estadoCocina: 'en_espera' },
      { _id: 'c3', grupo: 'Salsa', opcion: 'Criolla', eliminado: true, estadoCocina: 'pedido' }
    ]};
    const pend = guarnicionesPendientes(plato);
    expect(pend).toHaveLength(1);
    expect(pend[0].compId).toBe('c2');
    expect(pend[0].opcion).toBe('Arroz');
  });
  test('unidos al plato no salen como pendientes de lista', () => {
    const plato = {
      complementosUnidosAlPlato: true,
      complementosSeleccionados: [
        { _id: 'c2', grupo: 'Sabor', opcion: 'Pollo', estadoCocina: 'en_espera' }
      ]
    };
    expect(guarnicionesPendientes(plato)).toEqual([]);
  });
});

// ---------------- Escenarios de servicio real ----------------

describe('Escenarios de servicio real', () => {
  test('Muchas papas fritas de distintas mesas → 1 tarjeta por guarnición, agrupadas por padre', () => {
    const platoMesa5 = {
      nombre: 'Lomo Saltado',
      complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas fritas', _id: 'g1', cantidad: 1 }]
    };
    const platoMesa8 = {
      nombre: 'Pollo a la brasa',
      complementosSeleccionados: [{ grupo: 'Acomp', opcion: 'Papas fritas', _id: 'g2', cantidad: 1 }]
    };
    const u1 = expandirUnidadesTrabajo(platoMesa5, { flagOn: true });
    const u2 = expandirUnidadesTrabajo(platoMesa8, { flagOn: true });
    // Cada plato genera principal + 1 guarnición
    expect(u1).toHaveLength(2);
    expect(u2).toHaveLength(2);
    // Las guarniciones tienen mismo key pero distinto padre → no colisionan
    const g1 = u1.find(u => u.tipo === 'guarnicion');
    const g2 = u2.find(u => u.tipo === 'guarnicion');
    expect(normalizarGuarnicionKey(g1.comp.grupo, g1.comp.opcion))
      .toBe(normalizarGuarnicionKey(g2.comp.grupo, g2.comp.opcion));
    expect(claveAgrupacionUnidad(g1, true)).not.toBe(claveAgrupacionUnidad(g2, true));
    // §9.3: la tarjeta muestra solo el nombre de la guarnición (sin padre).
    // La relación visual la da la posición debajo del principal + el badge.
    expect(g1.nombreGuarnicion).toBe('Papas fritas');
    expect(g2.nombreGuarnicion).toBe('Papas fritas');
  });

  test('VIP: guarniciones heredan prioridad alta de la comanda', () => {
    const comanda = { etiquetasPrioridad: { vip: true } };
    expect(prioridadUnidad(comanda)).toBe(2);
    // En el motor, esta prioridad se suma al score de los candidatos (ver service).
  });

  test('Re-fire: prioridad máxima (al frente de la cola)', () => {
    const comanda = { etiquetasPrioridad: { refire: true } };
    expect(prioridadUnidad(comanda)).toBe(3);
    // Refire gana sobre vip
    expect(prioridadUnidad(comanda)).toBeGreaterThan(prioridadUnidad({ etiquetasPrioridad: { vip: true } }));
  });

  test('Estación saturada: una guarnición atrasada se marca crítica', () => {
    // Papas fritas con tiempo medio 300s, ya pasaron 610s → crítica
    const comp = {
      procesandoPor: { timestamp: new Date(Date.now() - 610 * 1000) },
      tiempoMedioPreparacion: 300,
      grupo: 'Acomp',
      opcion: 'Papas fritas'
    };
    expect(estadoAlertaGuarnicion(comp, { umbralAlertaMultiplo: 1.5, umbralCriticaMultiplo: 2 }))
      .toBe('critica');
  });

  test('Batch: 3 papas en la misma comanda → 3 guarniciones, mismo key, mismo padre', () => {
    // Simula un plato con 3 complementos "Papas fritas" (cantidades distintas).
    const plato = {
      nombre: 'Pollo broaster',
      complementosSeleccionados: [
        { grupo: 'Acomp', opcion: 'Papas fritas', _id: 'b1', cantidad: 1 },
        { grupo: 'Acomp', opcion: 'Papas fritas', _id: 'b2', cantidad: 1 },
        { grupo: 'Acomp', opcion: 'Papas fritas', _id: 'b3', cantidad: 2 }
      ]
    };
    const unidades = expandirUnidadesTrabajo(plato, { flagOn: true });
    const guarniciones = unidades.filter(u => u.tipo === 'guarnicion');
    expect(guarniciones).toHaveLength(3);
    // Todas mismo key → el motor las agrupa en un batch (ver detectarBatchsEnComanda en service)
    const keys = guarniciones.map(g => normalizarGuarnicionKey(g.comp.grupo, g.comp.opcion));
    expect(new Set(keys).size).toBe(1);
    // La de cantidad 2 se muestra como "Papas fritas" (la cantidad la pone la tarjeta
    // vía props.cantidad = 2 → "2 Papas fritas").
    const conCantidad2 = guarniciones.find(g => Number(g.comp.cantidad) === 2);
    expect(conCantidad2.nombreGuarnicion).toBe('Papas fritas');
  });
});

const { esEventoGuarnicion, aplicarEventoGuarnicion } = require('./guarnicionesKds');

describe('aplicarEventoGuarnicion (Ver Cocina live patch)', () => {
  const base = [{
    _id: 'com1',
    platos: [{
      _id: 'p1',
      estado: 'pedido',
      procesandoPor: { cocineroId: 'cook1', alias: 'Ana' },
      complementosSeleccionados: [
        { _id: 'g1', opcion: 'Arroz', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'cook2' } },
        { _id: 'g2', opcion: 'Ensalada', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'cook2' } }
      ]
    }]
  }];

  test('esEventoGuarnicion detecta complementoId y tipos', () => {
    expect(esEventoGuarnicion({ complementoId: 'g1' })).toBe(true);
    expect(esEventoGuarnicion({ tipo: 'guarnicion' })).toBe(true);
    expect(esEventoGuarnicion({ tipo: 'PLATO_TOMADO' })).toBe(false);
    expect(esEventoGuarnicion(null)).toBe(false);
  });

  test('finalizar guarnición: solo el subdoc pasa a recoger; el padre sigue pedido', () => {
    const next = aplicarEventoGuarnicion(base, {
      comandaId: 'com1',
      platoId: 'p1',
      complementoId: 'g1',
      tipo: 'GUARNICION_ACTUALIZADA',
      estadoCocina: 'recoger',
      procesandoPor: { cocineroId: 'cook2', alias: 'Luis' }
    });
    const padre = next[0].platos[0];
    expect(padre.estado).toBe('pedido');
    expect(padre.procesandoPor.cocineroId).toBe('cook1');
    expect(padre.complementosSeleccionados[0].estadoCocina).toBe('recoger');
    expect(padre.complementosSeleccionados[0].procesandoPor.cocineroId).toBeNull();
    expect(padre.complementosSeleccionados[1].estadoCocina).toBe('en_espera');
  });

  test('recolectar: guarnición asignada aparece aunque el padre no esté tomado', () => {
    const { recolectarGuarnicionesMonitor } = require('./guarnicionesKds');
    const comandas = [{
      _id: 'com1',
      platos: [{
        _id: 'p1',
        estado: 'pedido',
        procesandoPor: null,
        complementosSeleccionados: [
          { _id: 'g1', opcion: 'Arroz', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'cook2', alias: 'Luis' } }
        ]
      }]
    }];
    const items = recolectarGuarnicionesMonitor(comandas, {});
    expect(items).toHaveLength(1);
    expect(items[0].comp._id).toBe('g1');
  });

  test('recolectar: filtro por cocinero solo esa guarnición', () => {
    const { recolectarGuarnicionesMonitor } = require('./guarnicionesKds');
    const comandas = [{
      _id: 'com1',
      platos: [{
        _id: 'p1',
        estado: 'pedido',
        complementosSeleccionados: [
          { _id: 'g1', opcion: 'Arroz', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'cook2' } },
          { _id: 'g2', opcion: 'Papa', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'cook3' } }
        ]
      }]
    }];
    const items = recolectarGuarnicionesMonitor(comandas, { cocineroIdFiltrado: 'cook2' });
    expect(items).toHaveLength(1);
    expect(items[0].comp._id).toBe('g1');
  });

  test('recolectar: extra no tomada no aparece aunque el padre esté tomado', () => {
    const { recolectarGuarnicionesMonitor } = require('./guarnicionesKds');
    const comandas = [{
      _id: 'com1',
      platos: [{
        _id: 'p1',
        estado: 'pedido',
        procesandoPor: { cocineroId: 'cook1' },
        complementosSeleccionados: [
          { _id: 'g1', opcion: 'Arroz', estadoCocina: 'pedido', procesandoPor: null }
        ]
      }]
    }];
    const items = recolectarGuarnicionesMonitor(comandas, {
      cocineroIdFiltrado: 'cook1',
      padresVisibles: new Set(['com1:0'])
    });
    expect(items).toHaveLength(0);
  });

  test('recolectar: plato unidos no entra a lista de guarniciones', () => {
    const { recolectarGuarnicionesMonitor } = require('./guarnicionesKds');
    const comandas = [{
      _id: 'com1',
      platos: [{
        _id: 'p1',
        estado: 'pedido',
        complementosUnidosAlPlato: true,
        complementosSeleccionados: [
          { _id: 'g1', opcion: 'Pollo', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'cook2' } }
        ]
      }]
    }];
    expect(recolectarGuarnicionesMonitor(comandas, {})).toHaveLength(0);
  });

  test('liberar con complementoIds limpia todas las extras del grupo', () => {
    const next = aplicarEventoGuarnicion(base, {
      comandaId: 'com1',
      platoId: 'p1',
      complementoIds: ['g1', 'g2'],
      tipo: 'GUARNICION_LIBERADA'
    });
    const comps = next[0].platos[0].complementosSeleccionados;
    expect(comps[0].procesandoPor.cocineroId).toBeNull();
    expect(comps[1].procesandoPor.cocineroId).toBeNull();
    expect(comps[0].estadoCocina).toBe('pedido');
    expect(comps[1].estadoCocina).toBe('pedido');
    expect(next[0].platos[0].procesandoPor.cocineroId).toBe('cook1');
  });

  test('liberar acepta compId (alias del panel KDS)', () => {
    const next = aplicarEventoGuarnicion(base, {
      comandaId: 'com1',
      platoId: 'p1',
      compId: 'g1',
      tipo: 'GUARNICION_LIBERADA'
    });
    expect(next[0].platos[0].complementosSeleccionados[0].procesandoPor.cocineroId).toBeNull();
    expect(next[0].platos[0].complementosSeleccionados[1].procesandoPor.cocineroId).toBe('cook2');
  });

  test('liberar un extra con regla grupo limpia todo el grupo en vivo', () => {
    const grupal = [{
      _id: 'com1',
      platos: [{
        _id: 'linea99',
        platoId: 'p1',
        estado: 'pedido',
        procesandoPor: { cocineroId: 'cook1' },
        complementosSeleccionados: [
          { _id: 'g1', opcion: 'Arroz', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'cook2' }, asignacionMeta: { regla: 'grupo', grupoId: 'linea99' } },
          { _id: 'g2', opcion: 'Ensalada', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'cook2' }, asignacionMeta: { regla: 'grupo', grupoId: 'linea99' } }
        ]
      }]
    }];
    const next = aplicarEventoGuarnicion(grupal, {
      comandaId: 'com1',
      platoId: 'p1',
      complementoId: 'g1',
      tipo: 'GUARNICION_LIBERADA'
    });
    const comps = next[0].platos[0].complementosSeleccionados;
    expect(comps[0].procesandoPor.cocineroId).toBeNull();
    expect(comps[1].procesandoPor.cocineroId).toBeNull();
    expect(next[0].platos[0].procesandoPor.cocineroId).toBe('cook1');
  });

  test('tomar guarnición: cronómetro usa timestamp del evento si procesandoPor no lo trae', () => {
    const prev = [{
      _id: 'com1',
      platos: [{
        _id: 'p1',
        estado: 'pedido',
        complementosSeleccionados: [
          { _id: 'g1', opcion: 'Arroz', estadoCocina: 'pedido', procesandoPor: null }
        ]
      }]
    }];
    const ts = '2026-08-18T22:00:00.000Z';
    const { tiempoInicioGuarnicion } = require('./guarnicionesKds');
    const next = aplicarEventoGuarnicion(prev, {
      comandaId: 'com1',
      platoId: 'p1',
      complementoId: 'g1',
      tipo: 'GUARNICION_ACTUALIZADA',
      procesandoPor: { cocineroId: 'cook2', alias: 'Luis' },
      timestamp: ts
    });
    const comp = next[0].platos[0].complementosSeleccionados[0];
    expect(comp.procesandoPor.cocineroId).toBe('cook2');
    expect(comp.procesandoPor.timestamp).toBe(ts);
    expect(tiempoInicioGuarnicion(comp)).toBe(ts);
  });

  test('tomar guarnición sin timestamp: usa ahora para que el cronómetro no quede 00:00', () => {
    const prev = [{
      _id: 'com1',
      platos: [{
        _id: 'p1',
        estado: 'pedido',
        complementosSeleccionados: [
          { _id: 'g1', opcion: 'Arroz', estadoCocina: 'pedido', procesandoPor: null }
        ]
      }]
    }];
    const before = Date.now();
    const { tiempoInicioGuarnicion } = require('./guarnicionesKds');
    const next = aplicarEventoGuarnicion(prev, {
      comandaId: 'com1',
      platoId: 'p1',
      complementoId: 'g1',
      tipo: 'GUARNICION_ACTUALIZADA',
      procesandoPor: { cocineroId: 'cook2', alias: 'Luis' }
    });
    const inicio = tiempoInicioGuarnicion(next[0].platos[0].complementosSeleccionados[0]);
    expect(inicio).toBeTruthy();
    const t = new Date(inicio).getTime();
    expect(t).toBeGreaterThanOrEqual(before - 1000);
    expect(t).toBeLessThanOrEqual(Date.now() + 1000);
  });

  test('sin complementoId no muta (evita vaciar Ver Cocina)', () => {
    const next = aplicarEventoGuarnicion(base, {
      comandaId: 'com1',
      platoId: 'p1',
      tipo: 'GUARNICION_ACTUALIZADA',
      estadoCocina: 'recoger'
    });
    expect(next).toBe(base);
  });

  test('complementoIds aplica el parche a todo el grupo', () => {
    const next = aplicarEventoGuarnicion(base, {
      comandaId: 'com1',
      platoId: 'p1',
      complementoIds: ['g1', 'g2'],
      tipo: 'grupo_guarniciones',
      estadoCocina: 'recoger',
      procesandoPor: { cocineroId: 'cook2', alias: 'Luis' }
    });
    const comps = next[0].platos[0].complementosSeleccionados;
    expect(comps[0].estadoCocina).toBe('recoger');
    expect(comps[1].estadoCocina).toBe('recoger');
  });
});

describe('agrupacion y pronombre', () => {
  const {
    agrupacionGuarnicionesOn,
    tituloGrupoGuarniciones,
    formatearReferenciaPadre,
    lineaListaGuarniciones,
    tokenGuarnicion,
    claveAgrupacionUnidad,
    expandirUnidadesTrabajo,
    esEventoGuarnicion,
  } = require('./guarnicionesKds');

  test('agrupacionGuarnicionesOn default ON si separados ON', () => {
    expect(agrupacionGuarnicionesOn({})).toBe(true);
    expect(agrupacionGuarnicionesOn({ deshabilitarAgrupacionGuarniciones: true })).toBe(false);
    expect(agrupacionGuarnicionesOn({ permitirGuarnicionesSeparadas: false })).toBe(false);
  });

  test('tituloGrupoGuarniciones mezcla pronombre y nombre', () => {
    const titulo = tituloGrupoGuarniciones([
      { opcion: 'Papa frita', pronombre: 'P FRITA' },
      { opcion: 'Ensalada', pronombre: 'ENSAL' },
      { opcion: 'arroz', pronombre: '' },
      { opcion: 'Papas', cantidad: 2, pronombre: 'PFrita' },
    ]);
    expect(titulo).toBe('P FRITA + ENSAL + arroz + PFrita x2');
  });

  test('formatearReferenciaPadre modos', () => {
    expect(formatearReferenciaPadre('Bistec', 'de')).toBe('de Bistec');
    expect(formatearReferenciaPadre('Bistec', 'nuda')).toBe('Bistec');
    expect(formatearReferenciaPadre('Bistec', 'parentesis')).toBe('(Bistec)');
    expect(formatearReferenciaPadre('Bistec', 'ocultar')).toBe('');
    expect(formatearReferenciaPadre('', 'de')).toBe('');
  });

  test('lineaListaGuarniciones usa comas y referencia', () => {
    const comps = [
      { opcion: 'Arroz', pronombre: '' },
      { opcion: 'Papa frita', pronombre: 'PFrita' },
      { opcion: 'Ensalada', pronombre: 'Ensal' },
    ];
    expect(lineaListaGuarniciones(comps, 'Bistec', 'parentesis'))
      .toBe('- Arroz, PFrita, Ensal (Bistec)');
    expect(lineaListaGuarniciones(comps, 'Bistec', 'de'))
      .toBe('- Arroz, PFrita, Ensal de Bistec');
    expect(lineaListaGuarniciones(comps, 'Bistec', 'ocultar'))
      .toBe('- Arroz, PFrita, Ensal');
  });

  test('lista junta pronombres del catálogo aunque el snapshot esté vacío', () => {
    const plato = {
      nombre: 'Bistec',
      plato: {
        nombre: 'Bistec',
        complementos: [{
          grupo: 'Guarnición',
          opciones: [
            { nombre: 'Arroz', pronombre: 'Arroz' },
            { nombre: 'papa frit', pronombre: 'P Frita' },
            { nombre: 'ensalada', pronombre: 'ensal' },
          ]
        }]
      },
      complementosSeleccionados: [
        { _id: 'g1', grupo: 'Guarnición', opcion: 'Arroz', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'c1' } },
        { _id: 'g2', grupo: 'Guarnición', opcion: 'papa frit', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'c1' } },
        { _id: 'g3', grupo: 'Guarnición', opcion: 'ensalada', estadoCocina: 'en_espera', procesandoPor: { cocineroId: 'c1' } },
      ]
    };
    const { recolectarGuarnicionesMonitor, lineaListaGuarniciones } = require('./guarnicionesKds');
    const items = recolectarGuarnicionesMonitor([{
      _id: 'com1',
      platos: [{ _id: 'p1', estado: 'pedido', ...plato }]
    }], {});
    const comps = items.map((i) => i.comp);
    expect(lineaListaGuarniciones(comps, 'Bistec', 'parentesis'))
      .toBe('- Arroz, P Frita, ensal (Bistec)');
  });

  test('tokenGuarnicion hereda si diferenciar OFF o null', () => {
    expect(tokenGuarnicion({ diferenciarDisenoGuarniciones: false, colorTextoGuarnicion: '#f00' }, 'colorTextoGuarnicion', '#fff')).toBe('#fff');
    expect(tokenGuarnicion({ diferenciarDisenoGuarniciones: true, colorTextoGuarnicion: null }, 'colorTextoGuarnicion', '#fff')).toBe('#fff');
    expect(tokenGuarnicion({ diferenciarDisenoGuarniciones: true, colorTextoGuarnicion: '#f00' }, 'colorTextoGuarnicion', '#fff')).toBe('#f00');
  });

  test('expandirUnidadesTrabajo agrupacion ON: una unidad grupo', () => {
    const plato = {
      _id: 'p1',
      nombre: 'Bistec',
      estado: 'pedido',
      complementosSeleccionados: [
        { _id: 'c1', opcion: 'arroz' },
        { _id: 'c2', opcion: 'Papa frita', pronombre: 'P FRITA' },
        { _id: 'c3', opcion: 'Ensalada', pronombre: 'ENSAL' },
      ]
    };
    const u = expandirUnidadesTrabajo(plato, { flagOn: true, agrupacionOn: true });
    expect(u).toHaveLength(2);
    expect(u[1].tipo).toBe('grupo_guarniciones');
    expect(u[1].nombreGuarnicion).toBe('arroz + P FRITA + ENSAL');
    expect(u[1].compIds).toEqual(['c1', 'c2', 'c3']);
    expect(claveAgrupacionUnidad(u[1], true)).toBe('grupo_guarniciones::p1');
  });

  test('esEventoGuarnicion acepta complementoIds y tipo grupo', () => {
    expect(esEventoGuarnicion({ complementoIds: ['g1', 'g2'] })).toBe(true);
    expect(esEventoGuarnicion({ tipo: 'grupo_guarniciones' })).toBe(true);
  });
});

describe('unidadesParaVistaKds (solo visual)', () => {
  const { expandirUnidadesTrabajo, unidadesParaVistaKds, unidadGuarnicionAsignadaA } = require('./guarnicionesKds');
  const plato = {
    _id: 'p1',
    nombre: 'Bistec',
    estado: 'pedido',
    complementosSeleccionados: [
      { _id: 'c1', opcion: 'arroz', procesandoPor: { cocineroId: 'cook-b' } },
      { _id: 'c2', opcion: 'Papa frita' },
    ]
  };

  test('default junta: oculta guarniciones y muestra extras en el principal', () => {
    const raw = expandirUnidadesTrabajo(plato, { flagOn: true, agrupacionOn: false });
    expect(raw.length).toBe(3);
    const vista = unidadesParaVistaKds(raw, { isSupervisorView: true });
    expect(vista).toHaveLength(1);
    expect(vista[0].tipo).toBe('principal');
    expect(vista[0].ocultarComplementos).toBe(false);
  });

  test('juntarVisual false deja las filas de guarnición (asignación intacta)', () => {
    const raw = expandirUnidadesTrabajo(plato, { flagOn: true, agrupacionOn: false });
    const vista = unidadesParaVistaKds(raw, { juntarVisual: false, isSupervisorView: true });
    expect(vista).toHaveLength(3);
  });

  test('cocinera con guarnición asignada sigue viendo su fila', () => {
    const raw = expandirUnidadesTrabajo(plato, { flagOn: true, agrupacionOn: false });
    const vista = unidadesParaVistaKds(raw, { cocineroId: 'cook-b', isSupervisorView: false });
    expect(vista.some((u) => u.tipo === 'guarnicion' && u.compId === 'c1')).toBe(true);
    expect(vista.some((u) => u.tipo === 'guarnicion' && u.compId === 'c2')).toBe(false);
    expect(unidadGuarnicionAsignadaA(raw[1], 'cook-b')).toBe(true);
  });
});
