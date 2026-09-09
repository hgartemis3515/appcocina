/**
 * Tests unitarios para kdsFilters.js
 * 
 * TEMA 2: Pruebas para garantizar el correcto funcionamiento de los filtros KDS
 */

import {
  debeMostrarPlato,
  debeMostrarComanda,
  aplicarFiltrosAComandas,
  filtrarPlatosDeComanda,
  calcularEstadisticasFiltrado,
  getConfiguracionEfectiva,
  esComandaReserva,
  esComandaSoloParaLlevar,
  clasesHeaderReservaKds,
  platoRetenidoFueraDeCocina,
  tiempoInicioPlatoCocina,
  instanteInicioCocinaComanda,
  textoHorarioReservaKds,
  msRetrasoReserva,
  formatCronometroMs
} from '../kdsFilters';

// ============================================================
// TESTS PARA debeMostrarPlato
// ============================================================

describe('debeMostrarPlato', () => {
  // Test 1: Sin configuración ni zonas, mostrar todo
  test('retorna true cuando no hay configuración ni zonas', () => {
    const plato = {
      platoId: 1,
      plato: { nombre: 'Lomo Saltado', categoria: 'Platos', tipo: 'plato-carta normal' }
    };
    
    expect(debeMostrarPlato(plato, null, [])).toBe(true);
    expect(debeMostrarPlato(plato, undefined, undefined)).toBe(true);
  });

  // Test 2: Plato null/undefined retorna false
  test('retorna false para plato null o undefined', () => {
    expect(debeMostrarPlato(null, {}, [])).toBe(false);
    expect(debeMostrarPlato(undefined, {}, [])).toBe(false);
  });

  // Test 3: Modo inclusión por categoría
  test('filtra correctamente en modo inclusión por categoría', () => {
    const platoCarnes = {
      platoId: 1,
      plato: { nombre: 'Filete', categoria: 'Carnes', tipo: 'plato-carta normal' }
    };
    const platoPostres = {
      platoId: 2,
      plato: { nombre: 'Tiramisú', categoria: 'Postres', tipo: 'plato-carta normal' }
    };
    
    const config = {
      filtrosPlatos: {
        modoInclusion: true,
        categoriasPermitidas: ['Carnes', 'Parrillas']
      }
    };
    
    expect(debeMostrarPlato(platoCarnes, config, [])).toBe(true);
    expect(debeMostrarPlato(platoPostres, config, [])).toBe(false);
  });

  // Test 4: Zona activa específica
  test('usa solo filtros de zona activa cuando se especifica', () => {
    const plato = {
      platoId: 1,
      plato: { nombre: 'Filete', categoria: 'Carnes', tipo: 'plato-carta normal' }
    };
    
    const zonas = [
      {
        _id: 'zona-parrilla',
        nombre: 'Parrilla',
        activo: true,
        filtrosPlatos: {
          modoInclusion: true,
          categoriasPermitidas: ['Carnes']
        }
      },
      {
        _id: 'zona-postres',
        nombre: 'Postres',
        activo: true,
        filtrosPlatos: {
          modoInclusion: true,
          categoriasPermitidas: ['Postres']
        }
      }
    ];
    
    // Sin zona activa, pasa ambas zonas (UNIÓN)
    expect(debeMostrarPlato(plato, {}, zonas, null)).toBe(true);
    
    // Con zona activa Parrilla, pasa
    expect(debeMostrarPlato(plato, {}, zonas, 'zona-parrilla')).toBe(true);
    
    // Con zona activa Postres, no pasa
    expect(debeMostrarPlato(plato, {}, zonas, 'zona-postres')).toBe(false);
  });

  // Test 5: Zonas inactivas se ignoran
  test('ignora zonas inactivas (activo: false)', () => {
    const plato = {
      platoId: 1,
      plato: { nombre: 'Filete', categoria: 'Carnes', tipo: 'plato-carta normal' }
    };
    
    const zonas = [
      {
        _id: 'zona-parrilla',
        nombre: 'Parrilla',
        activo: false, // Inactiva
        filtrosPlatos: {
          modoInclusion: true,
          categoriasPermitidas: ['Carnes']
        }
      }
    ];
    
    // Zona inactiva se ignora, el plato pasa porque no hay filtros activos
    expect(debeMostrarPlato(plato, {}, zonas, 'zona-parrilla')).toBe(true);
  });

  // Test 6: Plato eliminado siempre se muestra (con estilo diferente)
  test('muestra platos eliminados independientemente de filtros', () => {
    const platoEliminado = {
      platoId: 1,
      plato: { nombre: 'Filete', categoria: 'Postres' }, // No coincide con filtros
      eliminado: true
    };
    
    const config = {
      filtrosPlatos: {
        modoInclusion: true,
        categoriasPermitidas: ['Carnes']
      }
    };
    
    expect(debeMostrarPlato(platoEliminado, config, [])).toBe(true);
  });
});

// ============================================================
// TESTS PARA debeMostrarComanda
// ============================================================

describe('debeMostrarComanda', () => {
  // Test 1: Sin configuración, mostrar todo
  test('retorna true cuando no hay configuración', () => {
    const comanda = {
      comandaNumber: 1,
      mesas: { nummesa: 5, area: { nombre: 'Terraza' } }
    };
    
    expect(debeMostrarComanda(comanda, null, [])).toBe(true);
  });

  // Test 2: Filtrado por área
  test('filtra correctamente por área', () => {
    const comandaTerraza = {
      comandaNumber: 1,
      mesas: { nummesa: 5, area: { nombre: 'Terraza' } }
    };
    const comandaInterior = {
      comandaNumber: 2,
      mesas: { nummesa: 10, area: { nombre: 'Interior' } }
    };
    
    const config = {
      filtrosComandas: {
        areasPermitidas: ['Terraza']
      }
    };
    
    expect(debeMostrarComanda(comandaTerraza, config, [])).toBe(true);
    expect(debeMostrarComanda(comandaInterior, config, [])).toBe(false);
  });

  // Test 3: Filtrado por mesa específica
  test('filtra correctamente por mesas específicas', () => {
    const comanda = {
      comandaNumber: 1,
      mesas: { nummesa: 5 }
    };
    
    const configPermitida = {
      filtrosComandas: {
        mesasEspecificas: [1, 2, 3, 4, 5]
      }
    };
    
    const configNoPermitida = {
      filtrosComandas: {
        mesasEspecificas: [10, 11, 12]
      }
    };
    
    expect(debeMostrarComanda(comanda, configPermitida, [])).toBe(true);
    expect(debeMostrarComanda(comanda, configNoPermitida, [])).toBe(false);
  });

  // Test 4: Filtrado por prioridad
  test('filtra correctamente por prioridad', () => {
    const comandaNormal = { comandaNumber: 1, prioridadOrden: 0 };
    const comandaPrioritaria = { comandaNumber: 2, prioridadOrden: 1 };
    
    const config = {
      filtrosComandas: {
        soloPrioritarias: true
      }
    };
    
    expect(debeMostrarComanda(comandaNormal, config, [])).toBe(false);
    expect(debeMostrarComanda(comandaPrioritaria, config, [])).toBe(true);
  });
});

// ============================================================
// TESTS PARA aplicarFiltrosAComandas
// ============================================================

describe('aplicarFiltrosAComandas', () => {
  // Test 1: Sin configuración, retorna todas
  test('retorna todas las comandas si no hay configuración', () => {
    const comandas = [
      { _id: '1', comandaNumber: 1, platos: [{ platoId: 1 }] },
      { _id: '2', comandaNumber: 2, platos: [{ platoId: 2 }] }
    ];
    
    const resultado = aplicarFiltrosAComandas(comandas, null);
    
    expect(resultado).toHaveLength(2);
  });

  // Test 2: Filtra comandas y platos
  test('filtra tanto comandas como platos internos', () => {
    const comandas = [
      {
        _id: '1',
        comandaNumber: 1,
        mesas: { nummesa: 5, area: { nombre: 'Terraza' } },
        platos: [
          { platoId: 1, plato: { nombre: 'Lomo', categoria: 'Carnes' } },
          { platoId: 2, plato: { nombre: 'Ensalada', categoria: 'Ensaladas' } }
        ]
      },
      {
        _id: '2',
        comandaNumber: 2,
        mesas: { nummesa: 10, area: { nombre: 'Interior' } },
        platos: [
          { platoId: 3, plato: { nombre: 'Filete', categoria: 'Carnes' } }
        ]
      }
    ];
    
    const config = {
      filtrosComandas: {
        areasPermitidas: ['Terraza']
      },
      filtrosPlatos: {
        modoInclusion: true,
        categoriasPermitidas: ['Carnes']
      }
    };
    
    const resultado = aplicarFiltrosAComandas(comandas, config);
    
    // Solo la comanda de Terraza debe pasar
    expect(resultado).toHaveLength(1);
    expect(resultado[0].comandaNumber).toBe(1);
    // Solo el plato de Carnes debe pasar dentro de esa comanda
    expect(resultado[0].platos).toHaveLength(1);
    expect(resultado[0].platos[0].plato.nombre).toBe('Lomo');
  });

  // Test 3: Input inválido retorna array vacío
  test('retorna array vacío para input inválido', () => {
    expect(aplicarFiltrosAComandas(null, {})).toEqual([]);
    expect(aplicarFiltrosAComandas(undefined, {})).toEqual([]);
    expect(aplicarFiltrosAComandas('invalid', {})).toEqual([]);
  });

  // Test 4: No elimina comandas vacías si están en estado recoger/entregado
  test('mantiene comandas en estado recoger aunque no tengan platos visibles', () => {
    const comandas = [
      {
        _id: '1',
        comandaNumber: 1,
        status: 'recoger',
        platos: [
          { platoId: 1, plato: { nombre: 'Lomo', categoria: 'Postres' } } // No coincide con filtros
        ]
      }
    ];
    
    const config = {
      filtrosPlatos: {
        modoInclusion: true,
        categoriasPermitidas: ['Carnes']
      }
    };
    
    const resultado = aplicarFiltrosAComandas(comandas, config);
    
    // La comanda en recoger se mantiene aunque no tenga platos visibles
    expect(resultado).toHaveLength(1);
  });
});

// ============================================================
// TESTS PARA calcularEstadisticasFiltrado
// ============================================================

describe('calcularEstadisticasFiltrado', () => {
  test('calcula correctamente las estadísticas de filtrado', () => {
    const originales = [
      { _id: '1', platos: [{ id: 1 }, { id: 2 }] },
      { _id: '2', platos: [{ id: 3 }] },
      { _id: '3', platos: [{ id: 4 }, { id: 5 }] }
    ];
    
    const filtradas = [
      { _id: '1', platos: [{ id: 1 }] }
    ];
    
    const stats = calcularEstadisticasFiltrado(originales, filtradas);
    
    expect(stats.comandasOriginales).toBe(3);
    expect(stats.comandasVisibles).toBe(1);
    expect(stats.comandasOcultas).toBe(2);
    expect(stats.platosOriginales).toBe(5);
    expect(stats.platosVisibles).toBe(1);
    expect(stats.porcentajeVisible).toBe(33);
  });

  test('maneja arrays vacíos correctamente', () => {
    const stats = calcularEstadisticasFiltrado([], []);
    
    expect(stats.comandasOriginales).toBe(0);
    expect(stats.comandasVisibles).toBe(0);
    expect(stats.porcentajeVisible).toBe(100);
  });
});

// ============================================================
// TESTS PARA getConfiguracionEfectiva
// ============================================================

describe('getConfiguracionEfectiva', () => {
  test('combina configuración del servidor con preferencias locales', () => {
    const serverConfig = {
      filtrosPlatos: { modoInclusion: true },
      configTableroKDS: {
        tiempoAmarillo: 12,
        tiempoRojo: 18
      },
      zonasAsignadas: [{ _id: '1', nombre: 'Parrilla' }]
    };
    
    const localConfig = {
      alertYellowMinutes: 15, // Override local
      soundEnabled: false
    };
    
    const result = getConfiguracionEfectiva(serverConfig, localConfig);
    
    // Local override para amarillo
    expect(result.alertYellowMinutes).toBe(15);
    // Servidor para rojo (no hay override local)
    expect(result.alertRedMinutes).toBe(18);
    // Zonas del servidor
    expect(result.zonasAsignadas).toHaveLength(1);
    // Local config
    expect(result.soundEnabled).toBe(false);
  });

  test('usa valores por defecto cuando no hay configuración', () => {
    const result = getConfiguracionEfectiva(null, {});
    
    expect(result.alertYellowMinutes).toBe(15);
    expect(result.alertRedMinutes).toBe(20);
    expect(result.soundEnabled).toBe(true);
    expect(result.nightMode).toBe(true);
  });
});

describe('esComandaReserva', () => {
  test('detecta reserva por origenCreacion u origenReserva', () => {
    expect(esComandaReserva({ origenCreacion: 'reserva' })).toBe(true);
    expect(esComandaReserva({ origenReserva: 'abc' })).toBe(true);
    expect(esComandaReserva({ origenCreacion: 'mozos' })).toBe(false);
    expect(esComandaReserva(null)).toBe(false);
  });
});

describe('esComandaSoloParaLlevar / clasesHeaderReservaKds', () => {
  const reservaMesa = {
    origenCreacion: 'reserva',
    platos: [{ tipoServicio: 'mesa' }, { tipoServicio: 'mesa', eliminado: true }],
  };
  const reservaLlevar = {
    origenCreacion: 'reserva',
    platos: [{ tipoServicio: 'para_llevar' }, { tipoServicio: 'para_llevar' }],
  };
  const reservaMixta = {
    origenCreacion: 'reserva',
    platos: [{ tipoServicio: 'mesa' }, { tipoServicio: 'para_llevar' }],
  };

  test('solo llevar ignora platos eliminados y exige todos para_llevar', () => {
    expect(esComandaSoloParaLlevar(reservaLlevar)).toBe(true);
    expect(esComandaSoloParaLlevar(reservaMesa)).toBe(false);
    expect(esComandaSoloParaLlevar(reservaMixta)).toBe(false);
    expect(esComandaSoloParaLlevar({ platos: [] })).toBe(false);
  });

  test('header usa celeste por defecto y el color de Vista y alertas', () => {
    expect(clasesHeaderReservaKds(reservaMesa)).toEqual({
      hex: '#7DD3FC',
      bg: '',
      border: '',
    });
    expect(clasesHeaderReservaKds(reservaLlevar)).toEqual({
      hex: '#7DD3FC',
      bg: '',
      border: '',
    });
    expect(clasesHeaderReservaKds(reservaMesa, { colorReservaKds: '#f97316' }).hex).toBe('#f97316');
    expect(clasesHeaderReservaKds({ origenCreacion: 'mozos' })).toBeNull();
  });
});

describe('platoRetenidoFueraDeCocina', () => {
  test('para llevar sin ticket aprobado no entra a cocina', () => {
    expect(platoRetenidoFueraDeCocina({
      estado: 'pedido',
      tipoServicio: 'para_llevar',
    })).toBe(true);
    expect(platoRetenidoFueraDeCocina({
      estado: 'pedido',
      tipoServicio: 'para_llevar',
      pagoAdelantado: { estadoTicket: 'pendiente_aprobacion', requerido: true },
    })).toBe(true);
  });

  test('para llevar con PPA aprobado sí entra', () => {
    expect(platoRetenidoFueraDeCocina({
      estado: 'pedido',
      tipoServicio: 'para_llevar',
      pagoAdelantado: { estadoTicket: 'aprobado' },
    })).toBe(false);
  });

  test('mesa entra aunque el PPA esté pendiente', () => {
    expect(platoRetenidoFueraDeCocina({ estado: 'pedido', tipoServicio: 'mesa' })).toBe(false);
    expect(platoRetenidoFueraDeCocina({
      estado: 'pedido',
      tipoServicio: 'mesa',
      pagoAdelantado: { requerido: true, estadoTicket: 'pendiente_aprobacion' },
    })).toBe(false);
  });

  test('extra llevar entra a KDS sin PPA', () => {
    expect(platoRetenidoFueraDeCocina({
      estado: 'pedido',
      tipoServicio: 'extra_llevar',
    })).toBe(false);
  });

  test('estado pendiente no entra', () => {
    expect(platoRetenidoFueraDeCocina({ estado: 'pendiente', tipoServicio: 'mesa' })).toBe(true);
  });
});

describe('tiempoInicioPlatoCocina', () => {
  test('usa procesandoPor.timestamp si hay toma', () => {
    expect(tiempoInicioPlatoCocina({
      procesandoPor: { timestamp: '2026-09-07T22:00:00.000Z' },
      tiempos: { pedido: '2026-09-07T20:00:00.000Z' },
      createdAt: '2026-09-07T18:00:00.000Z',
    })).toBe('2026-09-07T22:00:00.000Z');
  });

  test('reserva no usa createdAt del armado; usa prioridadOrden de lanzamiento', () => {
    expect(tiempoInicioPlatoCocina(
      { tiempos: { pedido: '2026-09-07T18:00:00.000Z' }, createdAt: '2026-09-07T18:00:00.000Z' },
      { origenCreacion: 'reserva', prioridadOrden: 1757280000000 }
    )).toBe(1757280000000);
  });
});

describe('instanteInicioCocinaComanda', () => {
  test('reserva usa prioridadOrden (lanzamiento), no createdAt', () => {
    expect(instanteInicioCocinaComanda({
      origenCreacion: 'reserva',
      createdAt: '2026-09-07T18:00:00.000Z',
      prioridadOrden: 1757280000000,
    })).toBe(1757280000000);
  });

  test('comanda normal usa createdAt', () => {
    expect(instanteInicioCocinaComanda({
      createdAt: '2026-09-07T18:00:00.000Z',
    })).toBe('2026-09-07T18:00:00.000Z');
  });
});

describe('textoHorarioReservaKds / retraso', () => {
  test('usa createdAt del pedido y hora de atención: 6:00pm a 7:00pm', () => {
    expect(textoHorarioReservaKds({
      origenCreacion: 'reserva',
      createdAt: '2026-09-07T18:00:00.000-05:00',
      fechaCocinaProgramada: '2026-09-07T15:30:00.000-05:00',
      fechaAtencionReserva: '2026-09-07T19:00:00.000-05:00',
    })).toBe('6:00pm a 7:00pm');
  });

  test('sin horas no inventa texto', () => {
    expect(textoHorarioReservaKds({ origenCreacion: 'reserva' })).toBe('');
  });

  test('retraso es 0 antes de la hora de atención', () => {
    expect(msRetrasoReserva({
      fechaAtencionReserva: '2026-09-07T18:05:00.000-05:00',
    }, new Date('2026-09-07T18:00:00.000-05:00').getTime())).toBe(0);
  });

  test('retraso cuenta desde la hora de atención', () => {
    expect(msRetrasoReserva({
      fechaAtencionReserva: '2026-09-07T18:05:00.000-05:00',
    }, new Date('2026-09-07T18:07:00.000-05:00').getTime())).toBe(120000);
  });

  test('formatCronometroMs mm:ss', () => {
    expect(formatCronometroMs(125000)).toBe('02:05');
  });
});
