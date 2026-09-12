import {
  estiloCuerpoParaLlevarTickets,
  estilosTextoTicketsTabla,
  TICKETS_TABLA_VISUAL_DEFAULT,
} from './estiloTicketsTabla';

describe('estiloTicketsTabla', () => {
  test('cuerpo para llevar usa fondo y contorno', () => {
    const st = estiloCuerpoParaLlevarTickets({
      paraLlevarFondo: '#7c3aed',
      paraLlevarContorno: '#6d28d9',
    });
    expect(st.backgroundColor).toBe('#7c3aed');
    expect(st.boxShadow).toContain('#6d28d9');
  });

  test('letras aplican color, tamaño y fondo opcional', () => {
    const st = estilosTextoTicketsTabla({
      textoPlatosColor: '#fde68a',
      textoTotalColor: '#ffffff',
      textoRestoColor: '#e9d5ff',
      textoTamano: 16,
      textoFondo: '#1e1b4b',
    });
    expect(st.platos.color).toBe('#fde68a');
    expect(st.platos.fontSize).toBe('16px');
    expect(st.platos.backgroundColor).toBe('#1e1b4b');
    expect(st.total.fontWeight).toBe(700);
    expect(st.resto.color).toBe('#e9d5ff');
  });

  test('sin fondo de letras no pinta background', () => {
    const st = estilosTextoTicketsTabla(TICKETS_TABLA_VISUAL_DEFAULT);
    expect(st.platos.backgroundColor).toBeUndefined();
  });
});
