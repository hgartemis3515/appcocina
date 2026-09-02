const {
  snapshotPerfilVista,
  aplicarSnapshotVista,
  sanitizarNombrePerfil,
  nombrePerfilDisponible,
  perfilVistaDifiere,
  mapPerfilVistaDesdeApi,
  mergePerfilesVista,
  esIdPerfilLocal,
} = require('./kdsPerfilesVista');

describe('kdsPerfilesVista', () => {
  test('snapshot solo toma claves de vista/alertas', () => {
    const snap = snapshotPerfilVista({
      tamanoFuente: 18,
      columnasGrid: 4,
      mostrarBadgeGuarnicion: false,
      juntarGuarnicionesVisualKds: false,
      usarNombreCocinaEnTablaKds: false,
      ordenColaMostrarHash: false,
      ordenColaColor: '#ffcc00',
      ordenColaCuadroColor: '#dc2626',
      ordenColaCuadroTamano: 28,
      cantidadPlatoColor: '#111111',
      cantidadPlatoFondo: '#facc15',
      cantidadPlatoTamano: 18,
      mozoNombreFuente: 'georgia',
      mozoNombreTamano: 16,
      mozoNombreColor: '#fbbf24',
      mozoNombreFondo: '#1d4ed8',
      nombrePlatoFuente: 'georgia',
      tamanoFuentePlatos: 22,
      nombrePlatoColor: '#fde68a',
      nombrePlatoFondo: '#0f172a',
      nombreComplementoFuente: 'georgia',
      nombreComplementoTamano: 14,
      nombreComplementoColor: '#fde68a',
      nombreComplementoFondo: '#1f2937',
      alertYellowMinutes: 10,
      timbreClave: 'ding_dong',
      timbreVolumen: 40,
      sonidoNuevaComanda: true,
      sonidoFinalizar: false,
      sonidoEntregar: false,
      timbreFinalizarClave: 'campana',
      nightMode: true,
      soundEnabled: false,
    });
    expect(snap.tamanoFuente).toBe(18);
    expect(snap.mostrarBadgeGuarnicion).toBe(false);
    expect(snap.juntarGuarnicionesVisualKds).toBe(false);
    expect(snap.usarNombreCocinaEnTablaKds).toBe(false);
    expect(snap.ordenColaMostrarHash).toBe(false);
    expect(snap.ordenColaColor).toBe('#ffcc00');
    expect(snap.ordenColaCuadroColor).toBe('#dc2626');
    expect(snap.ordenColaCuadroTamano).toBe(28);
    expect(snap.cantidadPlatoColor).toBe('#111111');
    expect(snap.cantidadPlatoFondo).toBe('#facc15');
    expect(snap.cantidadPlatoTamano).toBe(18);
    expect(snap.mozoNombreFuente).toBe('georgia');
    expect(snap.mozoNombreTamano).toBe(16);
    expect(snap.mozoNombreColor).toBe('#fbbf24');
    expect(snap.mozoNombreFondo).toBe('#1d4ed8');
    expect(snap.nombrePlatoFuente).toBe('georgia');
    expect(snap.tamanoFuentePlatos).toBe(22);
    expect(snap.nombrePlatoColor).toBe('#fde68a');
    expect(snap.nombrePlatoFondo).toBe('#0f172a');
    expect(snap.nombreComplementoFuente).toBe('georgia');
    expect(snap.nombreComplementoTamano).toBe(14);
    expect(snap.nombreComplementoColor).toBe('#fde68a');
    expect(snap.nombreComplementoFondo).toBe('#1f2937');
    expect(snap.timbreClave).toBe('ding_dong');
    expect(snap.timbreVolumen).toBe(40);
    expect(snap.sonidoNuevaComanda).toBe(true);
    expect(snap.sonidoFinalizar).toBe(false);
    expect(snap.sonidoEntregar).toBe(false);
    expect(snap.timbreFinalizarClave).toBe('campana');
    expect(snap.nightMode).toBeUndefined();
    expect(snap.soundEnabled).toBeUndefined();
  });

  test('snapshot rellena todas las claves de vista aunque falten en el input', () => {
    const { KDS_PERFIL_VISTA_KEYS } = require('./kdsPerfilesVista');
    const snap = snapshotPerfilVista({ tamanoFuente: 18 });
    KDS_PERFIL_VISTA_KEYS.forEach((k) => {
      expect(snap[k]).not.toBeUndefined();
    });
    expect(snap.tamanoFuente).toBe(18);
    expect(snap.juntarGuarnicionesVisualKds).toBe(true);
    expect(snap.nightMode).toBeUndefined();
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

  test('mergePerfilesVista: servidor gana mismo id; se conservan perfiles solo locales', () => {
    const locales = [
      { id: 'local-abc', nombre: 'Offline', config: { tamanoFuente: 18 } },
      { id: 'srv1', nombre: 'Viejo', config: { tamanoFuente: 12 } },
    ];
    const servidor = [
      { id: 'srv1', nombre: 'Nuevo', config: { tamanoFuente: 20 } },
    ];
    const merged = mergePerfilesVista(locales, servidor);
    expect(merged.some((p) => p.id === 'local-abc')).toBe(true);
    expect(merged.find((p) => p.id === 'srv1').nombre).toBe('Nuevo');
    expect(esIdPerfilLocal('local-abc')).toBe(true);
    expect(esIdPerfilLocal('srv1')).toBe(false);
  });
});
