import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUtensils, FaSignInAlt, FaExclamationTriangle, FaSpinner, FaUser, FaLock, FaCheckSquare, FaSquare, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

/**
 * LoginPage - Pantalla de login para el App de Cocina
 * 
 * Características:
 * - Autenticación con Usuario + Contraseña (DNI) contra el endpoint /api/admin/cocina/auth
 * - Función "Recordarme" para guardar usuario para futuros logins
 * - Muestra quién está logueado después del login exitoso
 */
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [rememberedName, setRememberedName] = useState('');
  
  const { login, error: authError, loading, isAuthenticated, user, getRememberedUser } = useAuth();

  // Cargar usuario recordado al iniciar
  useEffect(() => {
    const remembered = getRememberedUser();
    if (remembered) {
      setUsername(remembered.username || '');
      setRememberedName(remembered.name || '');
      setRecordar(true);
    }
  }, [getRememberedUser]);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      // El App.jsx se encargará de redirigir
      console.log('[LoginPage] Usuario autenticado:', user.name);
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validación básica
    const usernameLimpio = username.trim();
    const passwordLimpio = password.trim();

    if (!usernameLimpio) {
      setLocalError('Por favor ingrese su usuario');
      return;
    }

    if (!passwordLimpio) {
      setLocalError('Por favor ingrese su contraseña');
      return;
    }

    if (!/^\d{8}$/.test(passwordLimpio)) {
      setLocalError('La contraseña debe tener 8 digitos');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await login(usernameLimpio, passwordLimpio, recordar);
      if (!result.success) {
        setLocalError(result.error || 'Error al iniciar sesion');
      }
      // Si es exitoso, el AuthContext actualiza isAuthenticated
      // y App.jsx redirige automáticamente al Menú
    } catch (err) {
      setLocalError('Error de conexion. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 8) {
      setPassword(value);
      setLocalError('');
    }
  };

  const errorToShow = localError || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      {/* Fondo con patron */}
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
        {/* Logo y titulo */}
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
          <h2 className="text-xl text-orange-400 font-semibold">
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
              Ingrese sus credenciales para acceder al sistema
            </p>
          </div>

          {/* Mostrar usuario recordado si existe */}
          {rememberedName && username && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-700/50 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                  <FaUser className="text-xl text-white" />
                </div>
                <div>
                  <p className="text-orange-300 text-xs uppercase tracking-wide">Bienvenido de nuevo</p>
                  <p className="text-white text-lg font-semibold">{rememberedName}</p>
                </div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className="text-gray-500" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setLocalError(''); }}
                  placeholder="Ingrese su usuario"
                  disabled={isSubmitting || loading}
                  className="w-full bg-gray-900 border-2 border-gray-600 rounded-xl pl-12 pr-4 py-3 text-white text-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Input Contraseña (DNI) */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Contrasena (DNI)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="12345678"
                  disabled={isSubmitting || loading}
                  className="w-full bg-gray-900 border-2 border-gray-600 rounded-xl pl-12 pr-12 py-3 text-white text-lg tracking-widest font-mono focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="current-password"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-gray-500 text-xs mt-1">
                  {password.length}/8 digitos
                </p>
              )}
            </div>

            {/* Checkbox Recordarme */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <button
                type="button"
                onClick={() => setRecordar(!recordar)}
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors cursor-pointer select-none"
              >
                <span className="text-xl">
                  {recordar ? (
                    <FaCheckSquare className="text-orange-500" />
                  ) : (
                    <FaSquare className="text-gray-500" />
                  )}
                </span>
                <span className="text-sm">
                  Recordarme en este dispositivo
                </span>
              </button>
            </motion.div>

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

            {/* Boton de login */}
            <button
              type="submit"
              disabled={isSubmitting || loading || !username.trim() || password.length !== 8}
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
            <p className="text-gray-600 text-xs mt-1">
              La sesion expira por inactividad despues de 30 minutos
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
