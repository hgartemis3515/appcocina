const {
  snapshotPerfilVista,
  aplicarSnapshotVista,
  sanitizarNombrePerfil,
  nombrePerfilDisponible,
  perfilVistaDifiere,
  mapPerfilVistaDesdeApi,
} = require('./kdsPerfilesVista');

describe('kdsPerfilesVista', () => {
  test('snapshot solo toma claves de vista/alertas', () => {
    const snap = snapshotPerfilVista({
      tamanoFuente: 18,
      columnasGrid: 4,
      mostrarBadgeGuarnicion: false,
      usarNombreCocinaEnTablaKds: false,
      ordenColaMostrarHash: false,
      ordenColaColor: '#ffcc00',
      ordenColaCuadroColor: '#dc2626',
      ordenColaCuadroTamano: 28,
      cantidadPlatoColor: '#111111',
      cantidadPlatoFondo: '#facc15',
      cantidadPlatoTamano: 18,
      alertYellowMinutes: 10,
      timbreClave: 'ding_dong',
      timbreVolumen: 40,
      nightMode: true,
      soundEnabled: false,
    });
    expect(snap.tamanoFuente).toBe(18);
    expect(snap.mostrarBadgeGuarnicion).toBe(false);
    expect(snap.usarNombreCocinaEnTablaKds).toBe(false);
    expect(snap.ordenColaMostrarHash).toBe(false);
    expect(snap.ordenColaColor).toBe('#ffcc00');
    expect(snap.ordenColaCuadroColor).toBe('#dc2626');
    expect(snap.ordenColaCuadroTamano).toBe(28);
    expect(snap.cantidadPlatoColor).toBe('#111111');
    expect(snap.cantidadPlatoFondo).toBe('#facc15');
    expect(snap.cantidadPlatoTamano).toBe(18);
    expect(snap.timbreClave).toBe('ding_dong');
    expect(snap.timbreVolumen).toBe(40);
    expect(snap.nightMode).toBeUndefined();
    expect(snap.soundEnabled).toBeUndefined();
  });

  test('aplicarSnapshotVista no pisa nightMode', () => {
    const next = aplicarSnapshotVista(
      { nightMode: true, tamanoFuente: 15, mostrarBadgeGuarnicion: true },
      { tamanoFuente: 20, mostrarBadgeGuarnicion: false }
    );
    expect(next.nightMode).toBe(true);
    expect(next.tamanoFuente).toBe(20);
    expect(next.mostrarBadgeGuarnicion).toBe(false);
  });

  test('nombre único y sanitizado', () => {
    expect(sanitizarNombrePerfil('  Mesa  1  ')).toBe('Mesa 1');
    const lista = [{ id: 'a', nombre: 'Cocina 1' }];
    expect(nombrePerfilDisponible(lista, 'Cocina 1')).toBe(false);
    expect(nombrePerfilDisponible(lista, 'Cocina 1', 'a')).toBe(true);
    expect(nombrePerfilDisponible(lista, 'Cocina 2')).toBe(true);
  });

  test('mapPerfilVistaDesdeApi usa _id del servidor', () => {
    const mapped = mapPerfilVistaDesdeApi({
      _id: 'abc123',
      nombre: 'Cocina 1',
      tipo: 'tablas_kds',
      config: { tamanoFuente: 20, colorFondo: '#000' },
    });
    expect(mapped.id).toBe('abc123');
    expect(mapped.nombre).toBe('Cocina 1');
    expect(mapped.config.tamanoFuente).toBe(20);
    expect(mapped.config.colorFondo).toBeUndefined();
  });

  test('mapPerfilVistaDesdeApi ignora perfiles de Ver Cocina', () => {
    expect(mapPerfilVistaDesdeApi({
      _id: 'vc1',
      nombre: 'TV cocina',
      tipo: 'ver_cocina',
      config: { tamanoFuente: 20 },
    })).toBeNull();
  });
});
