import {
  INTERVALO_AVISO_RESERVA_MS,
  horaDisponibleReserva,
  reservasParaAvisar,
  textoAvisoReserva,
} from '../avisoReservasKds';

const reserva = (id, hora) => ({
  _id: id,
  mesa: { nummesa: 4 },
  comandaGenerada: { comandaNumber: 18 },
  fechaCocina: hora,
});

describe('aviso de reservas en KDS', () => {
  test('el texto dice la comanda y la hora en que está disponible', () => {
    const texto = textoAvisoReserva(reserva('a', '2026-10-17T19:30:00-05:00'));
    expect(texto).toContain('Comanda #18');
    expect(texto).toContain('Mesa 4');
    expect(texto).toContain('disponible a las');
    expect(horaDisponibleReserva(reserva('a', '2026-10-17T19:30:00-05:00'))).toContain('19:30');
  });

  test('avisa al aparecer y no otra vez antes de 30 minutos', () => {
    const lista = [reserva('a', '2026-10-17T19:30:00-05:00')];
    const vistos = new Map();
    const ahora = 1_000_000;
    expect(reservasParaAvisar(lista, vistos, ahora).map((r) => r._id)).toEqual(['a']);
    vistos.set('a', ahora);
    expect(reservasParaAvisar(lista, vistos, ahora + 10 * 60 * 1000)).toEqual([]);
    expect(reservasParaAvisar(lista, vistos, ahora + INTERVALO_AVISO_RESERVA_MS).map((r) => r._id)).toEqual(['a']);
  });
});