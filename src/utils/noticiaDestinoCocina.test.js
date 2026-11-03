const { noticiaAplicaEnPantalla, noticiaSuenaEnTablaKds } = require('./noticiaDestinoCocina');

const kds = { tipo: 'kds' };
const monitor2 = { tipo: 'monitor', numeroPantalla: 2, cocineroId: 'cook-a' };
const monitor4 = { tipo: 'monitor', numeroPantalla: 4, cocineroId: 'cook-b' };

describe('noticiaAplicaEnPantalla', () => {
  test('Todas llega a la tabla KDS y a Ver cocina completa del hub', () => {
    const aviso = { destinos: ['cocina'], canal: 'todas', cocinaAlcance: 'todas' };
    expect(noticiaAplicaEnPantalla(aviso, kds)).toBe(true);
    expect(noticiaAplicaEnPantalla(aviso, monitor2)).toBe(true);
    expect(noticiaAplicaEnPantalla(aviso, monitor4)).toBe(true);
  });

  test('Tabla KDS no entra en las ventanas del monitor hub', () => {
    const aviso = { destinos: ['cocina'], canal: 'kds', cocinaAlcance: 'kds' };
    expect(noticiaAplicaEnPantalla(aviso, kds)).toBe(true);
    expect(noticiaAplicaEnPantalla(aviso, monitor2)).toBe(false);
  });

  test('Pantallas del hub solo en el monitor elegido', () => {
    const aviso = {
      destinos: ['cocina'],
      canal: 'pantallas',
      cocinaAlcance: 'pantallas',
      pantallas: [2],
      cocinaCocineroIds: ['cook-a'],
    };
    expect(noticiaAplicaEnPantalla(aviso, kds)).toBe(false);
    expect(noticiaAplicaEnPantalla(aviso, monitor2)).toBe(true);
    expect(noticiaAplicaEnPantalla(aviso, monitor4)).toBe(false);
  });

  test('archivo del día sin canal usa cocinaAlcance', () => {
    const todas = { destinos: ['cocina'], cocinaAlcance: 'todas', pantallas: [2] };
    expect(noticiaAplicaEnPantalla(todas, monitor4)).toBe(true);
    const soloHub = { destinos: ['cocina'], cocinaAlcance: 'pantallas', pantallas: [2] };
    expect(noticiaAplicaEnPantalla(soloHub, monitor2)).toBe(true);
    expect(noticiaAplicaEnPantalla(soloHub, monitor4)).toBe(false);
  });
});

describe('noticiaSuenaEnTablaKds', () => {
  test('toda la cocina, la tabla, un monitor y la caja hacen sonar la tabla', () => {
    expect(noticiaSuenaEnTablaKds({ destinos: ['cocina'], canal: 'todas' })).toBe(true);
    expect(noticiaSuenaEnTablaKds({ destinos: ['cocina'], canal: 'kds' })).toBe(true);
    expect(noticiaSuenaEnTablaKds({ destinos: ['cocina'], canal: 'pantallas', pantallas: [2] })).toBe(true);
    expect(noticiaSuenaEnTablaKds({ destinos: ['caja'], canal: 'caja' })).toBe(true);
  });

  test('solo mozos no suena en la tabla', () => {
    expect(noticiaSuenaEnTablaKds({ destinos: ['mozos'], cocinaAlcance: 'ninguna' })).toBe(false);
  });
});
