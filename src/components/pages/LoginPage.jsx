import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUtensils, FaSignInAlt, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

/**
 * LoginPage - Pantalla de login para el App de Cocina
 * Autenticación con DNI contra el endpoint /api/admin/cocina/auth
 */
const LoginPage = () => {
  const [dni, setDni] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { login, error: authError, loading, isAuthenticated } = useAuth();

  // Si ya está autenticado, no mostrar el login
  useEffect(() => {
    if (isAuthenticated) {
      // El App.jsx se encargará de redirigir
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validación básica
    const dniLimpio = dni.trim();
    if (!dniLimpio) {
      setLocalError('Por favor ingrese su DNI');
      return;
    }

    if (!/^\d{8}$/.test(dniLimpio)) {
      setLocalError('El DNI debe tener 8 dígitos');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await login(dniLimpio);
      if (!result.success) {
        setLocalError(result.error || 'Error al iniciar sesión');
      }
      // Si es exitoso, el AuthContext actualizará isAuthenticated
      // y App.jsx redirigirá automáticamente al Menú
    } catch (err) {
      setLocalError('Error de conexión. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDniChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 8) {
      setDni(value);
      setLocalError('');
    }
  };

  const errorToShow = localError || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      {/* Fondo con patrón */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo y título */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-4 shadow-lg shadow-orange-500/30">
            <FaUtensils className="text-4xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
            COCINA
          </h1>
          <h2 className="text-xl text-orange-400 font-semibold" style={{ fontFamily: 'Arial, sans-serif' }}>
            LAS GAMBUSINAS
          </h2>
        </motion.div>

        {/* Card de login */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700"
        >
          <div className="text-center mb-6">
            <p className="text-gray-300 text-sm">
              Ingrese su DNI para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input DNI */}
            <div>
              <label htmlFor="dni" className="block text-sm font-medium text-gray-300 mb-2">
                DNI del cocinero
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="dni"
                  value={dni}
                  onChange={handleDniChange}
                  placeholder="12345678"
                  disabled={isSubmitting || loading}
                  className="w-full bg-gray-900 border-2 border-gray-600 rounded-xl px-4 py-4 text-white text-xl text-center tracking-widest font-mono focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="off"
                  inputMode="numeric"
                />
                {dni.length > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {dni.length}/8
                  </span>
                )}
              </div>
            </div>

            {/* Error message */}
            {errorToShow && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm"
              >
                <FaExclamationTriangle className="flex-shrink-0" />
                <span>{errorToShow}</span>
              </motion.div>
            )}

            {/* Botón de login */}
            <button
              type="submit"
              disabled={isSubmitting || loading || dni.length !== 8}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-orange-500/30"
            >
              {isSubmitting || loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <FaSignInAlt />
                  <span>INGRESAR</span>
                </>
              )}
            </button>
          </form>

          {/* Info adicional */}
          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-500 text-xs">
              Solo personal autorizado con rol de cocinero
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-gray-600 text-xs"
        >
          <p>Las Gambusinas &copy; {new Date().getFullYear()}</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
