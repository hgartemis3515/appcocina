const { generarHtmlComanda, stripGuarnicionesProductos } = require('../comandaPrint/comandaHtml');

const productoConGuarnicion = {
  nombre: 'Ceviche',
  cantidad: 1,
  precio: 30,
  subtotal: 30,
  complementos: [{ grupo: 'Guarnición', opcion: 'Camote', precio: 0 }],
};

describe('omitir guarniciones en impresión', () => {
  test('stripGuarnicionesProductos vacía complementos', () => {
    const out = stripGuarnicionesProductos([productoConGuarnicion]);
    expect(out[0].nombre).toBe('Ceviche');
    expect(out[0].complementos).toEqual([]);
    expect(out[0].mostrarResumenComplementos).toBe(false);
  });

  test('generarHtmlComanda no lista guarniciones si omitirGuarniciones', () => {
    const { html } = generarHtmlComanda({
      datos: {
        mesa: '5',
        productos: [productoConGuarnicion],
      },
      plantilla: { imprimirSoloNombreComercial: false },
      omitirGuarniciones: true,
    });
    expect(html).toContain('Ceviche');
    expect(html).not.toContain('Camote');
    expect(html).not.toContain('Guarnición');
  });

  test('sin omitir y plantilla con complementos, sí imprime guarnición', () => {
    const { html } = generarHtmlComanda({
      datos: {
        mesa: '5',
        productos: [productoConGuarnicion],
      },
      plantilla: { imprimirSoloNombreComercial: false },
      omitirGuarniciones: false,
    });
    expect(html).toContain('Camote');
  });
});
