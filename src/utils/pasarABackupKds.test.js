const { recolectarSeleccionPasarABackup, botonPasarABackupHabilitado } = require('./pasarABackupKds');

describe('pasarABackupKds', () => {
  test('habilita con plato en_espera tomado y seleccionado', () => {
    const sel = [{
      plato: { estado: 'en_espera' },
      procesandoPor: { cocineroId: 'c1' },
      estadoVisual: 'seleccionado'
    }];
    expect(botonPasarABackupHabilitado(sel)).toBe(true);
    expect(recolectarSeleccionPasarABackup(sel)).toHaveLength(1);
  });

  test('no habilita sin procesandoPor', () => {
    const sel = [{ plato: { estado: 'en_espera' }, estadoVisual: 'seleccionado' }];
    expect(botonPasarABackupHabilitado(sel)).toBe(false);
  });

  test('no habilita plato solo en amarillo (procesando)', () => {
    const sel = [{
      plato: { estado: 'en_espera' },
      procesandoPor: { cocineroId: 'c1' },
      estadoVisual: 'procesando'
    }];
    expect(botonPasarABackupHabilitado(sel)).toBe(false);
  });

  test('guarnición seleccionada en proceso cuenta', () => {
    const sel = [{
      tipo: 'guarnicion',
      procesandoPor: { cocineroId: 'c2' },
      estadoBackend: 'en_espera',
      estadoVisual: 'seleccionado'
    }];
    expect(botonPasarABackupHabilitado(sel)).toBe(true);
  });

  test('recorre platoStates + comandas (solo verde)', () => {
    const platoStates = new Map([
      ['cmd1-0', 'seleccionado'],
      ['cmd1-1', 'procesando']
    ]);
    const comandas = [{
      _id: 'cmd1',
      platos: [
        { _id: 'p1', estado: 'en_espera', procesandoPor: { cocineroId: 'c1' } },
        { _id: 'p2', estado: 'pedido', procesandoPor: { cocineroId: 'c1' } }
      ]
    }];
    const lote = recolectarSeleccionPasarABackup({ platoStates, comandas });
    expect(lote).toHaveLength(1);
    expect(lote[0].platoId).toBe('p1');
  });
});
