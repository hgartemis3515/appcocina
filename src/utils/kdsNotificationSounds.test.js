const {
  resolverTimbreClave,
  KDS_TIMBRES,
  TIMBRE_DEFAULT,
  debeReproducirSonidoEvento,
  claveTimbreEvento,
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

  test('por defecto solo suena nueva comanda', () => {
    const cfg = { soundEnabled: true };
    expect(debeReproducirSonidoEvento(cfg, 'nuevaComanda')).toBe(true);
    expect(debeReproducirSonidoEvento(cfg, 'finalizar')).toBe(false);
    expect(debeReproducirSonidoEvento(cfg, 'entregar')).toBe(false);
  });

  test('interruptor general silencia todo', () => {
    const cfg = { soundEnabled: false, sonidoNuevaComanda: true, sonidoFinalizar: true };
    expect(debeReproducirSonidoEvento(cfg, 'nuevaComanda')).toBe(false);
    expect(debeReproducirSonidoEvento(cfg, 'finalizar')).toBe(false);
  });

  test('se puede activar finalizar y entregar con timbre propio', () => {
    const cfg = {
      soundEnabled: true,
      sonidoFinalizar: true,
      sonidoEntregar: true,
      timbreClave: 'beep_clasico',
      timbreFinalizarClave: 'campana',
      timbreEntregarClave: 'gong',
    };
    expect(debeReproducirSonidoEvento(cfg, 'finalizar')).toBe(true);
    expect(debeReproducirSonidoEvento(cfg, 'entregar')).toBe(true);
    expect(claveTimbreEvento(cfg, 'finalizar')).toBe('campana');
    expect(claveTimbreEvento(cfg, 'entregar')).toBe('gong');
  });
});
