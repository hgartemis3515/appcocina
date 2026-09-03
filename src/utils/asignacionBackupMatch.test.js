const {
  elegirSiguienteBackup,
  extraerFuentePerfil,
  encontrarReglaPlato,
  unidadTieneSiguienteBackup
} = require('./asignacionBackupMatch');

describe('asignacionBackupMatch', () => {
  test('elige primer backup si el actual no está en la cadena', () => {
    const regla = {
      cocineroPrimarioId: 'prim',
      backups: [
        { cocineroId: 'b1', orden: 1 },
        { cocineroId: 'b2', orden: 2 }
      ]
    };
    expect(elegirSiguienteBackup(regla, 'prim').cocineroId).toBe('b1');
  });

  test('sin backups configurados no hay siguiente', () => {
    expect(elegirSiguienteBackup({ cocineroPrimarioId: 'prim', backups: [] }, 'prim')).toBeNull();
  });

  test('ya en el último backup no hay siguiente', () => {
    const regla = {
      backups: [{ cocineroId: 'b1', orden: 1 }]
    };
    expect(elegirSiguienteBackup(regla, 'b1')).toBeNull();
  });

  test('extrae el perfil activo del GET', () => {
    const fuente = extraerFuentePerfil({
      data: {
        perfiles: [
          { id: 'p1', nombre: 'almuerzo', reglasPorPlato: [{ platoId: 1 }] }
        ]
      },
      perfilActivoAhora: { perfilId: 'p1' }
    });
    expect(fuente.nombre).toBe('almuerzo');
  });

  test('encuentra regla por platoId de catálogo', () => {
    const fuente = {
      reglasPorPlato: [{
        platoId: 42,
        activo: true,
        cocineroPrimarioId: 'c1',
        backups: [{ cocineroId: 'c2', orden: 1 }]
      }]
    };
    const match = encontrarReglaPlato(fuente, { platoId: 42, plato: { nombre: 'Lomo' } });
    expect(match.tipo).toBe('plato');
    expect(match.regla.platoId).toBe(42);
  });

  test('unidadTieneSiguienteBackup true si la regla tiene backup', () => {
    const snapshot = {
      platos: {
        reglasPorPlato: [{
          platoId: 7,
          activo: true,
          cocineroPrimarioId: 'c1',
          backups: [{ cocineroId: 'c2', orden: 1 }]
        }]
      }
    };
    const unit = {
      plato: { platoId: 7, estado: 'en_espera', procesandoPor: { cocineroId: 'c1' } },
      procesandoPor: { cocineroId: 'c1' }
    };
    expect(unidadTieneSiguienteBackup(unit, snapshot)).toBe(true);
  });

  test('unidadTieneSiguienteBackup false si no hay backups en la regla', () => {
    const snapshot = {
      platos: {
        reglasPorPlato: [{
          platoId: 7,
          activo: true,
          cocineroPrimarioId: 'c1',
          backups: []
        }]
      }
    };
    const unit = {
      plato: { platoId: 7, estado: 'en_espera' },
      procesandoPor: { cocineroId: 'c1' }
    };
    expect(unidadTieneSiguienteBackup(unit, snapshot)).toBe(false);
  });

  test('unidadTieneSiguienteBackup false si ya está en el último backup', () => {
    const snapshot = {
      platos: {
        reglasPorPlato: [{
          platoId: 7,
          activo: true,
          cocineroPrimarioId: 'c1',
          backups: [{ cocineroId: 'c2', orden: 1 }]
        }]
      }
    };
    const unit = {
      plato: { platoId: 7 },
      procesandoPor: { cocineroId: 'c2' }
    };
    expect(unidadTieneSiguienteBackup(unit, snapshot)).toBe(false);
  });
});
