const {
  resolverTimbreClave,
  KDS_TIMBRES,
  TIMBRE_DEFAULT,
} = require('./kdsNotificationSounds');

describe('kdsNotificationSounds', () => {
  test('catálogo tiene muchos timbres y el beep clásico', () => {
    expect(KDS_TIMBRES.length).toBeGreaterThanOrEqual(16);
    expect(KDS_TIMBRES.some((t) => t.clave === TIMBRE_DEFAULT)).toBe(true);
  });

  test('clave inválida cae al beep clásico', () => {
    expect(resolverTimbreClave('no-existe')).toBe(TIMBRE_DEFAULT);
    expect(resolverTimbreClave('ding_dong')).toBe('ding_dong');
  });
});
