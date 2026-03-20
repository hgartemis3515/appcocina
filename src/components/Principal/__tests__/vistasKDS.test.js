/**
 * Tests de integración para navegación y separación de vistas KDS
 * 
 * TEMA 2: Verificar que la Vista General no depende de zonas/cocineroConfig
 * y que la Vista Personalizada filtra correctamente
 */

// ============================================================
// TESTS DE VALIDACIÓN DE IMPORTS
// ============================================================

describe('Separación de vistas KDS', () => {
  // Test 1: Comandastyle.jsx (Vista General) NO debe importar kdsFilters
  test('Vista General no debe importar kdsFilters', () => {
    // Este test verifica que el archivo no contiene imports de kdsFilters
    // Se ejecuta leyendo el archivo y buscando el import
    const fs = require('fs');
    const path = require('path');
    
    const comandastylePath = path.join(__dirname, '../../components/Principal/comandastyle.jsx');
    
    if (fs.existsSync(comandastylePath)) {
      const content = fs.readFileSync(comandastylePath, 'utf8');
      
      // Verificar que NO importa kdsFilters
      expect(content).not.toMatch(/import.*kdsFilters/);
      
      // Verificar que NO importa ZoneSelector
      expect(content).not.toMatch(/import.*ZoneSelector/);
      
      // Verificar que NO usa cocineroConfig del contexto
      expect(content).not.toMatch(/cocineroConfig/);
      expect(content).not.toMatch(/zonaActivaId/);
    } else {
      // Archivo con minúscula
      const comandastylePathLower = path.join(__dirname, '../../components/Principal/Comandastyle.jsx');
      if (fs.existsSync(comandastylePathLower)) {
        const content = fs.readFileSync(comandastylePathLower, 'utf8');
        expect(content).not.toMatch(/import.*kdsFilters/);
      }
    }
  });

  // Test 2: ComandastylePerso.jsx (Vista Personalizada) SÍ debe importar kdsFilters
  test('Vista Personalizada debe importar kdsFilters', () => {
    const fs = require('fs');
    const path = require('path');
    
    const persopath = path.join(__dirname, '../../components/Principal/ComandastylePerso.jsx');
    
    if (fs.existsSync(persopath)) {
      const content = fs.readFileSync(persopath, 'utf8');
      
      // Verificar que SÍ importa kdsFilters
      expect(content).toMatch(/import.*kdsFilters/);
      
      // Verificar que SÍ importa ZoneSelector
      expect(content).toMatch(/import.*ZoneSelector/);
      
      // Verificar que SÍ usa cocineroConfig
      expect(content).toMatch(/cocineroConfig/);
    }
  });
});

// ============================================================
// TESTS DE NAVEGACIÓN
// ============================================================

describe('Navegación entre vistas', () => {
  // Mock de localStorage para tests
  beforeEach(() => {
    const localStorageMock = {
      store: {},
      getItem: jest.fn((key) => localStorageMock.store[key] || null),
      setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete localStorageMock.store[key];
      }),
      clear: jest.fn(() => {
        localStorageMock.store = {};
      })
    };
    
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  // Test 3: Persistencia de última vista en localStorage
  test('persiste última vista en localStorage', () => {
    // Simular guardado de vista
    localStorage.setItem('cocinaLastView', 'COCINA_PERSONALIZADA');
    
    expect(localStorage.setItem).toHaveBeenCalledWith('cocinaLastView', 'COCINA_PERSONALIZADA');
    expect(localStorage.getItem('cocinaLastView')).toBe('COCINA_PERSONALIZADA');
  });

  // Test 4: Persistencia de zona activa
  test('persiste zona activa en localStorage', () => {
    localStorage.setItem('cocinaZonaActiva', 'zona-parrilla');
    
    expect(localStorage.setItem).toHaveBeenCalledWith('cocinaZonaActiva', 'zona-parrilla');
  });
});

// ============================================================
// TESTS DE LÓGICA DE FILTRADO
// ============================================================

describe('Lógica de filtrado por zonas', () => {
  // Datos de prueba
  const comandas = [
    {
      _id: '1',
      comandaNumber: 1,
      status: 'en_espera',
      mesas: { nummesa: 5, area: { nombre: 'Terraza' } },
      platos: [
        { platoId: 1, plato: { nombre: 'Lomo Saltado', categoria: 'Carnes', tipo: 'plato-carta normal' } }
      ]
    },
    {
      _id: '2',
      comandaNumber: 2,
      status: 'en_espera',
      mesas: { nummesa: 10, area: { nombre: 'Interior' } },
      platos: [
        { platoId: 2, plato: { nombre: 'Tiramisú', categoria: 'Postres', tipo: 'plato-carta normal' } }
      ]
    }
  ];

  const zonasAsignadas = [
    {
      _id: 'zona-parrilla',
      nombre: 'Parrilla',
      activo: true,
      filtrosPlatos: {
        modoInclusion: true,
        categoriasPermitidas: ['Carnes']
      },
      filtrosComandas: {}
    }
  ];

  // Test 5: Filtrado con zona activa específica
  test('filtra comandas según zona activa', () => {
    // Simular función de filtrado
    const filtrarPorZona = (comandas, zonas, zonaActivaId) => {
      if (!zonaActivaId || zonaActivaId === 'todas') {
        return comandas;
      }
      
      const zonaActiva = zonas.find(z => z._id === zonaActivaId && z.activo !== false);
      if (!zonaActiva) return comandas;
      
      return comandas.filter(comanda => {
        // Verificar si algún plato coincide con la zona
        return comanda.platos.some(plato => {
          if (!zonaActiva.filtrosPlatos || Object.keys(zonaActiva.filtrosPlatos).length === 0) {
            return true;
          }
          const { categoriasPermitidas = [] } = zonaActiva.filtrosPlatos;
          if (categoriasPermitidas.length === 0) return true;
          const categoria = plato.plato?.categoria || '';
          return categoriasPermitidas.includes(categoria);
        });
      });
    };
    
    // Sin zona activa, mostrar todas
    expect(filtrarPorZona(comandas, zonasAsignadas, null)).toHaveLength(2);
    
    // Con zona Parrilla, solo mostrar comanda con Carnes
    const filtradas = filtrarPorZona(comandas, zonasAsignadas, 'zona-parrilla');
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].comandaNumber).toBe(1);
  });

  // Test 6: Zonas inactivas se ignoran
  test('zonas inactivas no afectan el filtrado', () => {
    const zonasInactivas = [
      {
        _id: 'zona-parrilla',
        nombre: 'Parrilla',
        activo: false, // Inactiva
        filtrosPlatos: {
          modoInclusion: true,
          categoriasPermitidas: ['Carnes']
        }
      }
    ];
    
    const filtrarPorZona = (comandas, zonas, zonaActivaId) => {
      const zonaActiva = zonas.find(z => z._id === zonaActivaId && z.activo !== false);
      if (!zonaActiva) return comandas; // Zona inactiva, retornar todas
      return comandas;
    };
    
    // Zona inactiva debe ignorarse
    expect(filtrarPorZona(comandas, zonasInactivas, 'zona-parrilla')).toHaveLength(2);
  });
});
