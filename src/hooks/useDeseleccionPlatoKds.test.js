import { MS_DESELECCION_PLATO_KDS, msDeseleccionPlatoKds, segundosParpadeoSos, quitarSeleccionPlato } from './useDeseleccionPlatoKds';

describe('useDeseleccionPlatoKds', () => {
  test('la deselección es a los 20 s y vale por cada plato, aunque sean de otra comanda', () => {
    expect(MS_DESELECCION_PLATO_KDS).toBe(20000);
    expect(msDeseleccionPlatoKds(20)).toBe(20000);
    expect(msDeseleccionPlatoKds(15)).toBe(15000);
    expect(segundosParpadeoSos(15)).toBe(15);
    expect(segundosParpadeoSos(0)).toBe(1);
    const states = new Map([
      ['comanda-a-0', 'seleccionado'],
      ['comanda-b-2', 'entregando'],
      ['comanda-c-1', 'procesando'],
    ]);
    const sinA = quitarSeleccionPlato(states, 'comanda-a-0');
    const sinAmbos = quitarSeleccionPlato(sinA, 'comanda-b-2');
    expect(sinAmbos.has('comanda-a-0')).toBe(false);
    expect(sinAmbos.has('comanda-b-2')).toBe(false);
    expect(sinAmbos.get('comanda-c-1')).toBe('procesando');
    expect(quitarSeleccionPlato(states, 'comanda-c-1')).toBe(states);
  });
});
