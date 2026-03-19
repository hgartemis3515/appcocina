import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaUtensils, FaSignInAlt, FaExclamationTriangle, FaSpinner, FaUser, FaLock, FaCheckSquare, FaSquare, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

// ─────────────────────────────────────────────
// Shifting Veils — WebGL Background Animation
// Adapted with orange/red colors for the kitchen theme
// ─────────────────────────────────────────────

const VERTEX_SHADER = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform float u_layerSpeed;
uniform float u_layerCount;
uniform vec2 u_mouse;

#define PI 3.14159265359

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float val = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    val += amp * vnoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return val;
}

float warpedNoise(vec2 p, float t, float seed) {
  vec2 q = vec2(
    fbm(p + vec2(seed * 1.7, seed * 2.3) + t * 0.15),
    fbm(p + vec2(seed * 3.1 + 5.2, seed * 1.3 + 1.3) + t * 0.12)
  );
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.08),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.1)
  );
  return fbm(p + 3.5 * r);
}

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 aspect = vec2(u_res.x / u_res.y, 1.0);
  vec2 p = uv * aspect;
  float t = u_time * u_layerSpeed;

  vec2 mouseShift = vec2(0.0);
  if (u_mouse.x > 0.0) {
    vec2 mUV = u_mouse / u_res;
    mouseShift = (mUV - 0.5) * aspect * 0.3;
  }

  // Dark gray base with warm tint
  vec3 col = vec3(0.035, 0.04, 0.05);

  for (int i = 0; i < 7; i++) {
    if (float(i) >= u_layerCount) break;

    float fi = float(i);
    float layerFrac = fi / max(u_layerCount - 1.0, 1.0);

    float speed = 0.3 + fi * 0.12;
    float scale = 1.8 + fi * 0.7;
    float angle = fi * 0.7 + 0.3;
    float parallax = 0.3 + layerFrac * 0.7;

    vec2 drift = vec2(
      cos(angle) * speed * t * parallax,
      sin(angle) * speed * t * parallax * 0.7
    );

    vec2 lp = (p - 0.5 * aspect + mouseShift * (0.5 + layerFrac * 0.5)) 
              * rot2(fi * 0.4 + t * 0.02 * (fi - 2.5)) 
              + 0.5 * aspect;
    lp = lp * scale + drift;

    float n = warpedNoise(lp, t * (0.8 + fi * 0.15), fi * 3.7 + 1.0);

    float veil = smoothstep(0.25, 0.55, n);
    veil *= smoothstep(0.85, 0.6, n);
    veil = max(veil, smoothstep(0.2, 0.7, n) * 0.5);

    float fadeCycle = sin(t * 0.15 + fi * 1.3) * 0.5 + 0.5;
    float opacity = mix(0.08, 0.55, smoothstep(0.0, 0.3, fadeCycle));
    opacity *= (0.6 + 0.4 * (1.0 - layerFrac));

    // Orange/red color palette for kitchen theme
    vec3 layerColor;
    if (i == 0) layerColor = vec3(0.06, 0.05, 0.04);
    else if (i == 1) layerColor = vec3(0.12, 0.04, 0.03);
    else if (i == 2) layerColor = vec3(0.30, 0.10, 0.05);
    else if (i == 3) layerColor = vec3(0.50, 0.20, 0.07);
    else if (i == 4) layerColor = vec3(0.70, 0.32, 0.09);
    else if (i == 5) layerColor = vec3(0.82, 0.26, 0.12);
    else layerColor = vec3(0.92, 0.42, 0.10);

    layerColor += sin(n * 6.0 + t * 0.3 + fi * 2.0) * 0.05;

    float edgeGlow = smoothstep(0.0, 0.15, veil) * smoothstep(0.5, 0.25, veil);
    layerColor = mix(layerColor, layerColor * 1.4 + vec3(0.10, 0.03, 0.01), edgeGlow * 0.5);

    col = mix(col, layerColor, veil * opacity);
  }

  // Warm atmospheric glow
  vec2 center = (uv - 0.5) * aspect;
  col += vec3(0.50, 0.22, 0.06) * exp(-dot(center, center) * 2.0) * 0.05;

  // Subtle breathing
  col *= sin(u_time * 0.2) * 0.02 + 1.0;

  // Tone mapping
  col = col / (col + 0.5) * 1.1;
  col = pow(col, vec3(0.95, 0.98, 1.05));

  // Vignette
  float vig = 1.0 - dot(center / aspect, center / aspect) * 0.6;
  col *= smoothstep(0.0, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program error:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

/**
 * ShiftingVeilsBackground - WebGL animated background
 */
const ShiftingVeilsBackground = () => {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const uniformsRef = useRef({});
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { 
      alpha: false, 
      antialias: false, 
      preserveDrawingBuffer: false 
    });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) return;
    programRef.current = program;
    gl.useProgram(program);

    // Fullscreen quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Store uniform locations
    uniformsRef.current = {
      uTime: gl.getUniformLocation(program, 'u_time'),
      uRes: gl.getUniformLocation(program, 'u_res'),
      uLayerSpeed: gl.getUniformLocation(program, 'u_layerSpeed'),
      uLayerCount: gl.getUniformLocation(program, 'u_layerCount'),
      uMouse: gl.getUniformLocation(program, 'u_mouse'),
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uniformsRef.current.uRes, w, h);
      }
    }

    function render(time) {
      resize();

      const uniforms = uniformsRef.current;
      gl.uniform1f(uniforms.uTime, prefersReduced ? 0 : time * 0.001);
      gl.uniform1f(uniforms.uLayerSpeed, 0.5);
      gl.uniform1f(uniforms.uLayerCount, 5.0);
      gl.uniform2f(uniforms.uMouse, -1, -1);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animationRef.current = requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize);
    
    // Start rendering
    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ 
        display: 'block',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

/**
 * LoginPage - Pantalla de login para el App de Cocina
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

  useEffect(() => {
    const remembered = getRememberedUser();
    if (remembered) {
      setUsername(remembered.username || '');
      setRememberedName(remembered.name || '');
      setRecordar(true);
    }
  }, [getRememberedUser]);

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('[LoginPage] Usuario autenticado:', user.name);
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

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
    } catch (err) {
      setLocalError('Error de conexion. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
      setPassword(value);
      setLocalError('');
    }
  };

  const errorToShow = localError || authError;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
      {/* Animated WebGL Background */}
      <ShiftingVeilsBackground />

      {/* Login Card - positioned above the background */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo and title */}
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

        {/* Login Card */}
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

          {/* Remembered user */}
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
            {/* Username Input */}
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

            {/* Password Input */}
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

            {/* Remember Me */}
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

            {/* Login Button */}
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

          {/* Additional info */}
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
          className="text-center mt-6 text-orange-400 text-xs"
        >
          <p>Las Gambusinas &copy; {new Date().getFullYear()}</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
