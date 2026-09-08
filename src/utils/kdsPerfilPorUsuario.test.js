const {
  claveConfigKdsUsuario,
  idUsuarioCocina,
  sanitizarIdPerfilTablasKds,
  leerUserIdSesionCocina,
  leerPerfilActivoUsuario,
  guardarPerfilActivoUsuario,
  leerConfigKdsUsuario,
  guardarConfigKdsUsuario,
  migrarConfigGlobalAlUsuario,
  leerConfigKdsInicial,
  construirConfigDesdePerfilTablasKds,
  AUTH_COCINA_STORAGE_KEY,
} = require('./kdsPerfilPorUsuario');

describe('kdsPerfilPorUsuario', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('idUsuarioCocina lee id o _id', () => {
    expect(idUsuarioCocina({ id: 'abc' })).toBe('abc');
    expect(idUsuarioCocina({ _id: 'xyz' })).toBe('xyz');
    expect(idUsuarioCocina(null)).toBe('');
  });

  test('sanitizarIdPerfilTablasKds acepta ids locales y mongo', () => {
    expect(sanitizarIdPerfilTablasKds('local-m4x8-ab12cd')).toBe('local-m4x8-ab12cd');
    expect(sanitizarIdPerfilTablasKds('67c1ab2def34567890123456')).toBe('67c1ab2def34567890123456');
    expect(sanitizarIdPerfilTablasKds('monitor_cocina')).toBe('monitor_cocina');
    expect(sanitizarIdPerfilTablasKds('bad id')).toBe(null);
    expect(sanitizarIdPerfilTablasKds('')).toBe(null);
  });

  test('guarda y lee perfil activo por usuario sin mezclar cuentas', () => {
    guardarPerfilActivoUsuario('u1', 'perfil-uno');
    guardarPerfilActivoUsuario('u2', 'perfil-dos');
    expect(leerPerfilActivoUsuario('u1')).toBe('perfil-uno');
    expect(leerPerfilActivoUsuario('u2')).toBe('perfil-dos');
  });

  test('guarda snapshot kds por usuario', () => {
    guardarConfigKdsUsuario('u1', { perfilActivo: 'p1', tamanoFuente: 22 });
    guardarConfigKdsUsuario('u2', { perfilActivo: 'p2', tamanoFuente: 11 });
    expect(leerConfigKdsUsuario('u1').tamanoFuente).toBe(22);
    expect(leerConfigKdsUsuario('u2').perfilActivo).toBe('p2');
    expect(claveConfigKdsUsuario('u1')).toBe('kdsConfig:u1');
  });

  test('migrarConfigGlobalAlUsuario solo si ese usuario no tiene snapshot', () => {
    localStorage.setItem('kdsConfig', JSON.stringify({ perfilActivo: 'pA' }));
    expect(migrarConfigGlobalAlUsuario('u1', { perfilActivo: 'pA' })).toBe(true);
    expect(leerConfigKdsUsuario('u1').perfilActivo).toBe('pA');
    expect(migrarConfigGlobalAlUsuario('u1', { perfilActivo: 'pB' })).toBe(false);
    expect(leerConfigKdsUsuario('u1').perfilActivo).toBe('pA');
  });

  test('leerConfigKdsInicial usa el usuario de cocinaAuth', () => {
    localStorage.setItem(
      AUTH_COCINA_STORAGE_KEY,
      JSON.stringify({ token: 't', usuario: { id: 'cookB' } })
    );
    guardarConfigKdsUsuario('cookB', { perfilActivo: 'perfil2' });
    localStorage.setItem('kdsConfig', JSON.stringify({ perfilActivo: 'perfil1' }));
    expect(leerConfigKdsInicial().perfilActivo).toBe('perfil2');
  });

  test('construirConfigDesdePerfilTablasKds aplica snapshot del perfil', () => {
    const cfg = construirConfigDesdePerfilTablasKds('abc123', [
      { id: 'abc123', config: { tamanoFuente: 19, alertYellowMinutes: 7 } },
    ]);
    expect(cfg.perfilActivo).toBe('abc123');
    expect(cfg.tamanoFuente).toBe(19);
    expect(cfg.alertYellowMinutes).toBe(7);
  });

  test('leerUserIdSesionCocina', () => {
    expect(leerUserIdSesionCocina()).toBe('');
    localStorage.setItem(
      AUTH_COCINA_STORAGE_KEY,
      JSON.stringify({ usuario: { _id: 'mozo9' } })
    );
    expect(leerUserIdSesionCocina()).toBe('mozo9');
  });
});
