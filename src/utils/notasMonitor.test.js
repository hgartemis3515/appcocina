const {
  lineaNotaMonitor,
  formatoNotaEnCuadro,
  textoFranjaNotas,
  recolectarNotasMonitor,
  pronombreCocineroDe,
  pronombreReferenciaPrincipal,
  textosNotasDeGrupo,
  anexarNotasCuadroItems,
  tokensEstiloPronombreGuarnicion,
} = require('./notasMonitor');

describe('notasMonitor', () => {
  test('formatoNotaEnCuadro usa prefijo -Nota:', () => {
    expect(formatoNotaEnCuadro('Pepe')).toBe('-Nota: Pepe');
    expect(formatoNotaEnCuadro('-Nota: Pepe')).toBe('-Nota: Pepe');
    expect(formatoNotaEnCuadro('- pepe')).toBe('-Nota: pepe');
    expect(formatoNotaEnCuadro('')).toBe('');
  });

  test('linea junta texto, plato y pronombre', () => {
    expect(lineaNotaMonitor({
      texto: 'Piña para el bistec',
      nombrePlato: 'Bistec',
      pronombreCocinero: 'C1',
    })).toBe('- Piña para el bistec (Bistec) C1');
  });

  test('sin pronombre omite C1', () => {
    expect(lineaNotaMonitor({
      texto: 'Sin cebolla',
      nombrePlato: 'Lomo',
      pronombreCocinero: '',
    })).toBe('- Sin cebolla (Lomo)');
  });

  test('textoFranjaNotas prefija el título', () => {
    expect(textoFranjaNotas(['- Piña (Bistec) C1'], 'Notas:'))
      .toBe('Notas: - Piña (Bistec) C1');
    expect(textoFranjaNotas([])).toBe('');
  });

  test('recolectar: nota de plato + obs de comanda, sin duplicar comanda', () => {
    const grupos = [{
      platos: [
        {
          plato: { _id: 'p1', nombre: 'Bistec', notaEspecial: 'Piña para el bistec' },
          comanda: { _id: 'c1', comandaNumber: 12, observaciones: 'Mesa apurada' },
          cocinero: { id: 'cook1', pronombre: 'C1' },
        },
        {
          plato: { _id: 'p2', nombre: 'Lomo', notaEspecial: '' },
          comanda: { _id: 'c1', comandaNumber: 12, observaciones: 'Mesa apurada' },
          cocinero: { id: 'cook1', pronombre: 'C1' },
        },
      ],
    }];
    const lineas = recolectarNotasMonitor(grupos);
    expect(lineas).toEqual([
      '- Piña para el bistec (Bistec) C1',
      '- Mesa apurada (Comanda 12) C1',
    ]);
  });

  test('pronombreCocineroDe usa mapa si el snapshot está vacío', () => {
    const mapa = new Map([['cook1', 'C2']]);
    expect(pronombreCocineroDe({ id: 'cook1' }, mapa)).toBe('C2');
    expect(pronombreCocineroDe({ id: 'cook1', pronombre: 'C1' }, mapa)).toBe('C1');
  });

  test('tokensEstiloPronombreGuarnicion hereda o personaliza', () => {
    const base = { color: '#aaa', fontSize: 18, fontFamily: 'Inter' };
    expect(tokensEstiloPronombreGuarnicion({}, base)).toEqual(base);
    expect(tokensEstiloPronombreGuarnicion({ heredarEstiloPronombrePadre: false, colorTextoPronombreGuarnicion: '#f00', tamanioFuentePronombreGuarnicion: 22, fuenteFamiliaPronombreGuarnicion: 'Arial' }, base)).toEqual({
      color: '#f00',
      fontSize: 22,
      fontFamily: 'Arial',
    });
  });

  test('pronombreReferenciaPrincipal es el del principal y se oculta al mismo cocinero', () => {
    const principal = { id: 'cook1', pronombre: 'C1' };
    expect(pronombreReferenciaPrincipal(principal)).toBe('C1');
    expect(pronombreReferenciaPrincipal(principal, { ocultarSiIds: ['cook1'] })).toBe('');
    expect(pronombreReferenciaPrincipal(principal, { ocultarSiIds: ['cook2'] })).toBe('C1');
    expect(pronombreReferenciaPrincipal(principal, { mostrar: false })).toBe('');
  });

  test('recolectar usa el cocinero del plato principal, no el de la guarnición', () => {
    const grupos = [{
      platos: [{
        plato: {
          _id: 'p1',
          nombre: 'Bistec',
          notaEspecial: 'Piña para el bistec',
          procesandoPor: { cocineroId: 'cook1', pronombre: 'C1' },
        },
        cocinero: { id: 'cook2', pronombre: 'C2' },
      }],
    }];
    expect(recolectarNotasMonitor(grupos)).toEqual([
      '- Piña para el bistec (Bistec) C1',
    ]);
    expect(recolectarNotasMonitor(grupos, { ocultarSiCocineroId: 'cook1' })).toEqual([
      '- Piña para el bistec (Bistec)',
    ]);
    expect(recolectarNotasMonitor(grupos, { mostrarPronombre: false })).toEqual([
      '- Piña para el bistec (Bistec)',
    ]);
  });

  test('textosNotasDeGrupo junta nota especial y observación', () => {
    expect(textosNotasDeGrupo({
      platos: [{
        plato: { notaEspecial: 'Piña' },
        comanda: { _id: 'c1', observaciones: 'Mesa apurada' },
      }],
    })).toEqual(['Piña', 'Mesa apurada']);
  });

  test('anexarNotasCuadroItems: sin guarnición la nota va al plato', () => {
    const plato = {
      timers: [{ comandaId: 'c1', platoIndex: 0 }],
      platos: [{ plato: { notaEspecial: 'Sin cebolla' }, comanda: { _id: 'c1' } }],
    };
    const out = anexarNotasCuadroItems([plato], new Set(), true);
    expect(out[0].notasCuadro).toBe('Sin cebolla');
    expect(out[0].hayNotaCuadro).toBe(true);
  });

  test('anexarNotasCuadroItems: con guarnición la nota no se duplica en el plato', () => {
    const plato = {
      timers: [{ comandaId: 'c1', platoIndex: 0 }],
      platos: [{ plato: { notaEspecial: 'Sin cebolla' }, comanda: { _id: 'c1' } }],
    };
    const out = anexarNotasCuadroItems([plato], new Set(['c1:0']), true);
    expect(out[0].notasCuadro).toBe('');
    expect(out[0].hayNotaCuadro).toBe(true);
  });
});
