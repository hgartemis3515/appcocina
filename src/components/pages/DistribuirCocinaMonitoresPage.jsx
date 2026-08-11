import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  FaArrowLeft, FaDesktop, FaPlay, FaStop, FaSync,
  FaCheck, FaExclamationTriangle, FaUser, FaFileDownload,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { getServerBaseUrl } from '../../config/apiConfig';
import useCocinerosLista from '../../hooks/useCocinerosLista';
import {
  abrirMonitorCocinero, redirigirVentanaMonitor, cerrarVentanaMonitor,
  obtenerMonitores, soportaMultiMonitor,
} from '../../utils/monitorWindowManager';

// Flujo "Distribuir Cocina en monitores (1 PC x 8 pantallas)".
const MONITOR_PRINCIPAL = 1;
const MONITORES_PASIVOS = [2, 3, 4, 5, 6, 7, 8];
const SIN_ASIGNAR = '__sin_asignar__';

const DistribuirCocinaMonitoresPage = ({ onGoToMenu }) => {
  const { getToken, user } = useAuth();
  const { cocineros, loading: loadingCocineros, recargar: recargarCocineros } = useCocinerosLista({ getToken });

  const [pantallas, setPantallas] = useState([]);
  const [asignacion, setAsignacion] = useState({});
  const [asignacionInicial, setAsignacionInicial] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ventanas, setVentanas] = useState({});
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const calibradoRef = useRef(false); // evita re-calibrar en cada render
  const [wmAutorizado, setWmAutorizado] = useState(false); // Window Management API
  const [monitoresDetectados, setMonitoresDetectados] = useState([]); // lista de monitores físicos
  const [showBatModal, setShowBatModal] = useState(false); // modal de configuración .bat
  const [batGenerando, setBatGenerando] = useState(false);
  // Aplicar perfil de personalización del cocinero a cada monitor (flujo perfil=auto)
  const [aplicarPerfil, setAplicarPerfil] = useState(true);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) return;
      const res = await axios.get(`${getServerBaseUrl()}/api/pantallas-cocina/activas`, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
      });
      const data = res.data?.data || [];
      setPantallas(data);
      const map = {};
      for (const p of data) {
        if (p.numeroPantalla === MONITOR_PRINCIPAL) continue;
        const cid = p.cocineroId?._id || p.cocineroId || null;
        map[p.numeroPantalla] = cid ? String(cid) : null;
      }
      setAsignacion(map);
      setAsignacionInicial(map);
      setMensaje(null);
    } catch (err) {
      console.warn('[DistribuirCocina] Error:', err.message);
      setError('No se pudieron cargar las pantallas');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Al cargar, si la API Window Management está disponible, pedir permiso.
  // Esto permite posicionar ventanas en monitores específicos (no en el primario).
  useEffect(() => {
    if (!soportaMultiMonitor()) return;
    obtenerMonitores().then((monitores) => {
      if (monitores && monitores.length > 0) {
        setWmAutorizado(true);
        setMonitoresDetectados(monitores);
        console.log('[DistribuirCocina] Window Management autorizado, monitores:', monitores.length);
        // Auto-asignar cocineros a monitores pasivos si hay cocineros disponibles
        // y no hay asignación previa. Distribuye 1 cocinero por monitor (2..8).
        setAsignacion((prev) => {
          const nueva = { ...prev };
          const monitoresPasivosDetectados = Math.max(0, monitores.length - 1); // monitor 1 = principal
          const cocinerosDisponibles = cocineros.filter((c) => c.activo !== false);
          let cocineroIdx = 0;
          for (let i = 0; i < monitoresPasivosDetectados && i < 7 && cocineroIdx < cocinerosDisponibles.length; i++) {
            const numMonitor = i + 2; // monitores 2..8
            if (!nueva[numMonitor]) {
              nueva[numMonitor] = String(cocinerosDisponibles[cocineroIdx]._id);
              cocineroIdx++;
            }
          }
          return nueva;
        });
      }
    });
  }, [cocineros]);

  const pantallaPorNumero = useMemo(() => {
    const map = {};
    for (const p of pantallas) map[p.numeroPantalla] = p;
    return map;
  }, [pantallas]);

  const duplicados = useMemo(() => {
    const counts = {};
    for (const num of MONITORES_PASIVOS) {
      const cid = asignacion[num];
      if (!cid) continue;
      counts[cid] = (counts[cid] || 0) + 1;
    }
    return Object.keys(counts).filter((cid) => counts[cid] > 1);
  }, [asignacion]);

  const hayCambios = useMemo(() => {
    for (const num of MONITORES_PASIVOS) {
      const a = asignacion[num] || null;
      const b = asignacionInicial[num] || null;
      if ((a || null) !== (b || null)) return true;
    }
    return false;
  }, [asignacion, asignacionInicial]);

  const cambiarCocinero = (numero, valor) => {
    const cid = valor === SIN_ASIGNAR ? null : valor;
    setAsignacion((prev) => ({ ...prev, [numero]: cid }));
    setMensaje(null);
  };

  const guardarDistribucion = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = getToken();
      if (!token) return;
      const items = MONITORES_PASIVOS.map((num) => {
        const p = pantallaPorNumero[num];
        if (!p) return null;
        return {
          id: p._id,
          cocineroId: asignacion[num] || null,
          modoVista: asignacion[num] ? 'completo' : 'personalizado',
        };
      }).filter(Boolean);
      if (items.length === 0) {
        setError('No hay pantallas 2-8 configuradas. Cree pantallas desde el panel admin.');
        return;
      }
      await axios.put(
        `${getServerBaseUrl()}/api/pantallas-cocina/distribucion`,
        { items },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
      );
      setAsignacionInicial({ ...asignacion });
      setMensaje('Distribución guardada correctamente.');
    } catch (err) {
      console.warn('[DistribuirCocina] Error guardando:', err.message);
      setError('No se pudo guardar: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const abrirOActualizarVentana = async (numero) => {
    const pantalla = pantallaPorNumero[numero];
    if (!pantalla) return;
    const cocineroId = asignacion[numero] || '';
    const existente = ventanas[numero];
    if (!cocineroId) {
      if (existente && !existente.closed) cerrarVentanaMonitor(existente);
      setVentanas((prev) => { const n = { ...prev }; delete n[numero]; return n; });
      return;
    }
    if (existente && !existente.closed) {
      const ok = redirigirVentanaMonitor(existente, pantalla, cocineroId, { aplicarPerfil });
      if (!ok) {
        const win = await abrirMonitorCocinero(pantalla, { cocineroIdOverride: cocineroId, aplicarPerfil });
        if (win) setVentanas((prev) => ({ ...prev, [numero]: win }));
      }
    } else {
      const win = await abrirMonitorCocinero(pantalla, { cocineroIdOverride: cocineroId, aplicarPerfil });
      if (win) setVentanas((prev) => ({ ...prev, [numero]: win }));
    }
  };

  const aplicarYDesplegar = async () => {
    await guardarDistribucion();
    MONITORES_PASIVOS.forEach((num, idx) => {
      setTimeout(() => abrirOActualizarVentana(num), idx * 200);
    });
  };

  const desplegarTodas = () => {
    MONITORES_PASIVOS.forEach((num, idx) => {
      setTimeout(() => abrirOActualizarVentana(num), idx * 200);
    });
  };

  const cerrarTodas = () => {
    Object.values(ventanas).forEach((win) => cerrarVentanaMonitor(win));
    setVentanas({});
  };

  // Generar y descargar un .bat que lanza Chrome en modo kiosk para cada
  // monitor asignado. Usa la IP del backend actual, los cocineros elegidos,
  // y las coords reales de cada monitor (via Window Management API si está autorizado).
  // Convierte un string ASCII a base64 UTF-16LE (lo que espera powershell -EncodedCommand)
  const toUtf16LEBase64 = (str) => {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      bytes.push(code & 0xFF);
      bytes.push((code >> 8) & 0xFF);
    }
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.slice(i, i + chunk));
    }
    return btoa(binary);
  };

  const generarBatKiosk = async () => {
    const baseUrl = getServerBaseUrl();
    let host = '192.168.50.155';
    let puertoApp = '3001';
    try {
      const url = new URL(baseUrl);
      host = url.hostname;
      puertoApp = window.location.port || '3001';
    } catch { /* noop */ }

    // Detectar monitores físicos conectados (Window Management API)
    let monitores = null;
    try {
      monitores = await obtenerMonitores();
    } catch { /* noop */ }

    // Construir lineas SET por monitor (2..8)
    const setLines = MONITORES_PASIVOS.map((num) => {
      const cid = asignacion[num] || '';
      return `set COCINERO_${num}=${cid}`;
    }).join('\n');

    // Conteo de monitores asignados
    const asignados = MONITORES_PASIVOS.filter((num) => asignacion[num]).length;

    // Calcular coords de cada monitor asignado
    const monsData = MONITORES_PASIVOS.map((num) => {
      const cid = asignacion[num];
      if (!cid) return null;
      let posX = 0, posY = 0, ancho = 1920, alto = 1080;
      if (monitores && monitores.length >= num) {
        const mon = monitores[num - 1];
        posX = mon.left;
        posY = mon.top;
        ancho = mon.width;
        alto = mon.height;
      } else {
        const sw = (typeof screen !== 'undefined' && screen.width) ? screen.width : 1920;
        posX = sw * (num - 1);
      }
      return { num, cid, posX, posY, ancho, alto };
    }).filter(Boolean);

    // Generar script PowerShell unico que mueve TODAS las ventanas.
    // Se codifica en base64 UTF-16LE para evitar problemas de escapes en el .bat.
    const psScript = [
      'Add-Type @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public class WinAPI {',
      '  [DllImport("user32.dll")]',
      '  public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);',
      '  [DllImport("user32.dll")]',
      '  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);',
      '}',
      '"@',
      'Start-Sleep -Seconds 3',
      ...monsData.flatMap((m) => [
        `$titulo = "monitor-${m.num}"`,
        `$ventana = $null`,
        `for ($i = 0; $i -lt 15; $i++) {`,
        `  $procs = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*" + $titulo + "*" }`,
        `  if ($procs -and $procs.Count -gt 0) { $ventana = $procs[0]; break }`,
        `  Start-Sleep -Milliseconds 500`,
        `}`,
        `if ($ventana) {`,
        `  [WinAPI]::ShowWindowAsync($ventana.MainWindowHandle, 3) | Out-Null`,
        `  [WinAPI]::MoveWindow($ventana.MainWindowHandle, ${m.posX}, ${m.posY}, ${m.ancho}, ${m.alto}, $true) | Out-Null`,
        `  Write-Host ("Monitor ${m.num} movido a (${m.posX}, ${m.posY}) tam ${m.ancho}x${m.alto}")`,
        `} else {`,
        `  Write-Host ("No se encontro ventana para monitor ${m.num}")`,
        `}`,
      ]),
    ].join('\n');

    const psBase64 = toUtf16LEBase64(psScript);

    // Sufijo de perfil de personalización (flujo Distribuir Cocina en monitores)
    const perfilSuffix = aplicarPerfil ? '&perfil=auto' : '';

    // Bloques start: lanzar Chrome kiosk por cada monitor
    const bloquesStart = monsData.map((m) => (
`if not "%COCINERO_${m.num}%"=="" (
  echo Abriendo Monitor ${m.num} - Cocinero: %COCINERO_${m.num}% - Pos: ${m.posX},${m.posY}
  start "cocina-monitor-${m.num}" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=${m.num}&cocineroId=%COCINERO_${m.num}%&modo=completo-fijo${perfilSuffix}"
)`)).join('\n\n');

    const bat = `@echo off
REM ============================================================
REM  Distribuir Cocina en monitores - Lanzador Chrome Kiosk
REM  Generado automaticamente desde App Cocina
REM  Fecha: ${new Date().toLocaleString()}
REM  Monitores asignados: ${asignados}/7
REM  Monitores detectados: ${monitores ? monitores.length : 'N/A'}
REM
REM  USO: Ejecutar este .bat en la PC de cocina.
REM  Chrome abre cada monitor en modo kiosk (pantalla completa real).
REM  Un script PowerShell (codificado) mueve cada ventana al monitor correcto.
REM  Para cerrar una ventana: Alt+F4
REM ============================================================

set SERVIDOR=${host}
set PUERTO_APP=${puertoApp}
${setLines}

set BASE=http://%SERVIDOR%:%PUERTO_APP%

REM Buscar Chrome o Edge
set CHROME=
if exist "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" set "CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
if exist "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" set "CHROME=C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
if exist "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" set "CHROME=C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"

if "%CHROME%"=="" (
  echo.
  echo [ERROR] No se encontro Chrome o Edge en esta PC.
  echo.
  pause
  exit /b 1
)

echo.
echo Cerrando ventanas kiosk previas...
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq cocina-monitor-*" >nul 2>&1

echo.
echo Abriendo ${asignados} monitor(es) en modo kiosk...
echo.

${bloquesStart}

echo.
echo Esperando que Chrome abra las ventanas y moviendo al monitor correcto...
powershell -ExecutionPolicy Bypass -EncodedCommand ${psBase64}

echo.
echo Listo. ${asignados} monitor(es) abiertos en modo kiosk (pantalla completa).
echo Para cerrar una ventana: Alt+F4
echo.
pause
`;

    // Descargar el .bat
    const blob = new Blob([bat], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'abrir-monitores-kiosk.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const msgMonitores = monitores
      ? `${monitores.length} monitor(es) detectado(s) con coords reales`
      : 'sin Window Management API (coords estimadas)';
    setMensaje(`Script .bat generado con ${asignados} monitor(es). ${msgMonitores}. Ejecutalo en la PC de cocina.`);
  };

  // Calibrar posiciones X/Y de cada monitor asumiendo monitores del mismo ancho
  // en fila horizontal (1=izquierda ... 8=derecha). Usa el ancho del monitor actual
  // (donde corre la consola) como base. Guarda configDespliegue en cada PantallaCocina.
  const calibrarPosiciones = async (silencioso = false) => {
    try {
      if (!silencioso) { setSaving(true); setError(null); }
      const token = getToken();
      if (!token) return;
      const anchoMonitor = (typeof screen !== 'undefined' && screen.width) ? screen.width : 1920;
      const altoMonitor = (typeof screen !== 'undefined' && screen.height) ? screen.height : 1080;

      const updates = MONITORES_PASIVOS.map((num) => {
        const p = pantallaPorNumero[num];
        if (!p) return null;
        return axios.put(
          `${getServerBaseUrl()}/api/pantallas-cocina/${p._id}`,
          {
            configDespliegue: {
              anchoVentana: anchoMonitor,
              altoVentana: altoMonitor,
              posicionX: anchoMonitor * (num - 1),
              posicionY: 0,
              pantallaCompleta: true,
            },
          },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
        ).catch((err) => console.warn(`[calibrar] monitor ${num} falló:`, err.message));
      }).filter(Boolean);

      await Promise.all(updates);
      await cargarDatos();
      if (!silencioso) {
        setMensaje(`Posiciones calibradas (ancho ${anchoMonitor}px). Las ventanas ahora abrirán en el monitor correcto.`);
      }
    } catch (err) {
      console.warn('[calibrarPosiciones] Error:', err.message);
      if (!silencioso) setError('No se pudo calibrar: ' + err.message);
    } finally {
      if (!silencioso) setSaving(false);
    }
  };

  // Auto-calibrar al cargar si hay pantallas sin posicionX configurada.
  // Layout default: fila horizontal 1→8, principal a la izquierda.
  useEffect(() => {
    if (calibradoRef.current) return;
    if (loading || pantallas.length === 0) return;
    const necesitaCalibracion = pantallas.some((p) =>
      p.numeroPantalla > 1 && (
        !p.configDespliegue ||
        p.configDespliegue.posicionX === 0 ||
        p.configDespliegue.posicionX === undefined
      )
    );
    if (necesitaCalibracion) {
      calibradoRef.current = true;
      calibrarPosiciones(true);
    }
  }, [loading, pantallas]);

  const nombreCocinero = (cid) => {
    const c = cocineros.find((x) => String(x._id) === String(cid));
    return c ? (c.alias || c.name) : 'Cocinero';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onGoToMenu} className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300">
            <FaArrowLeft /> Menú
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaDesktop className="text-cyan-400" /> Distribuir Cocina en monitores
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { cargarDatos(); recargarCocineros(); }}
            className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300 text-sm flex items-center gap-2">
            <FaSync /> Refrescar
          </button>
          <button onClick={desplegarTodas} disabled={loading || pantallas.length === 0}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
            <FaPlay /> Desplegar ventanas
          </button>
          <button onClick={cerrarTodas}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2">
            <FaStop /> Cerrar ventanas
          </button>
          <button onClick={() => calibrarPosiciones(false)} disabled={saving || loading || pantallas.length === 0}
            className="px-3 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
            title="Recalcula posicionX/Y de cada monitor (fila horizontal 1→8)">
            📐 Recalibrar posiciones
          </button>
          <button onClick={() => setShowBatModal(true)}
            disabled={loading || pantallas.length === 0}
            className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
            title="Configura y genera un .bat que lanza Chrome en pantalla completa para cada monitor"
          >
            <FaFileDownload /> Generar .bat kiosk
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-300 ml-2 select-none" title="Aplica el perfil de personalización Ver Cocina guardado de cada cocinero a su monitor">
            <input
              type="checkbox"
              checked={aplicarPerfil}
              onChange={(e) => setAplicarPerfil(e.target.checked)}
              className="w-4 h-4 accent-cyan-500"
            />
            Aplicar perfil de personalización
          </label>
        </div>
      </div>

      <div className="mb-4 p-3 bg-cyan-900/20 border border-cyan-700/30 rounded-lg">
        <p className="text-cyan-300 text-sm">
          Desde el <strong>monitor 1</strong> (esta consola) eliges qué cocinero se ve en cada
          monitor pasivo (2-8). Cada ventana abre Ver Cocina Completo filtrado por el cocinero
          asignado. Pulsa <strong>Aplicar / Desplegar</strong> para guardar y abrir las ventanas.
        </p>
      </div>

      {/* Aviso de Window Management API */}
      {soportaMultiMonitor() && !wmAutorizado && (
        <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/40 rounded-lg">
          <p className="text-amber-300 text-sm mb-2">
            ⚠️ Para que las ventanas se abran en el monitor correcto (no en el principal),
            autoriza el acceso a los monitores. Chrome pedirá permiso una sola vez.
          </p>
          <button
            onClick={async () => {
              const monitores = await obtenerMonitores();
              if (monitores && monitores.length > 0) {
                setWmAutorizado(true);
                setMensaje(`Acceso a ${monitores.length} monitor(es) autorizado.`);
              } else {
                setError('No se pudo obtener acceso a los monitores.');
              }
            }}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 rounded-lg text-sm font-semibold"
          >
            🔐 Autorizar acceso a monitores
          </button>
        </div>
      )}
      {!soportaMultiMonitor() && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <p className="text-blue-300 text-xs mb-2">
            ℹ️ La API Window Management (para abrir ventanas en el monitor correcto) requiere
            <strong> HTTPS o localhost</strong>. Tu App Cocina se sirve por HTTP plano
            ({window.location.origin}), por eso Chrome la deshabilita.
          </p>
          <p className="text-blue-300 text-xs mb-2">
            <strong>Solución rápida:</strong> abrí <code className="text-gold">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>,
            añadí <code className="text-gold">{window.location.origin}</code>, habilitá y reiniciá Chrome.
          </p>
          <p className="text-blue-300 text-xs">
            Mientras tanto, las ventanas se abrirán en el monitor principal y se moverán al
            correcto automáticamente (puede haber un parpadeo breve).
          </p>
        </div>
      )}

      <div className="mb-5 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🖥️</span>
          <div>
            <h3 className="font-bold">Monitor 1 — Principal (esta PC)</h3>
            <p className="text-xs text-gray-400">Monitor de control. No se despliega como ventana pasiva.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin text-4xl mb-3">⏳</div>
          Cargando pantallas y cocineros...
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700/40 rounded-lg text-red-300">{error}</div>
      )}

      {mensaje && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-700/40 rounded-lg text-green-300 text-sm flex items-center gap-2">
          <FaCheck /> {mensaje}
        </div>
      )}

      {!loading && pantallas.length === 0 && (
        <div className="text-center py-12">
          <FaDesktop className="text-5xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-xl mb-2">No hay pantallas configuradas</p>
          <p className="text-gray-500">Cree las pantallas 1-8 desde el panel admin (Cocineros → Personalizar vista).</p>
        </div>
      )}

      {!loading && pantallas.length > 0 && (
        <>
          {duplicados.length > 0 && (
            <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/40 rounded-lg text-amber-300 text-sm flex items-center gap-2">
              <FaExclamationTriangle />
              Cocineros repetidos en varios monitores: {duplicados.map((cid) => nombreCocinero(cid)).join(', ')}.
              Revisa si es intencional.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {MONITORES_PASIVOS.map((num) => {
              const pantalla = pantallaPorNumero[num];
              if (!pantalla) {
                return (
                  <div key={num} className="p-4 bg-gray-900/50 border border-dashed border-gray-700 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📺</span>
                      <div>
                        <h3 className="font-bold">Monitor {num}</h3>
                        <p className="text-xs text-gray-500">No configurado en admin</p>
                      </div>
                    </div>
                  </div>
                );
              }
              const cid = asignacion[num] || null;
              const abierta = ventanas[num] && !ventanas[num].closed;
              return (
                <motion.div key={num} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📺</span>
                      <div>
                        <h3 className="font-bold">Monitor {num}</h3>
                        <p className="text-xs text-gray-400">{pantalla.nombre}</p>
                      </div>
                    </div>
                    {abierta ? (
                      <span className="text-xs px-2 py-1 bg-green-600/30 text-green-400 rounded">Abierta</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-700 text-gray-400 rounded">Cerrada</span>
                    )}
                  </div>

                  <label className="block text-xs text-gray-400 mb-1">Cocinero a mostrar</label>
                  <select
                    value={cid || SIN_ASIGNAR}
                    onChange={(e) => cambiarCocinero(num, e.target.value)}
                    disabled={loadingCocineros}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value={SIN_ASIGNAR}>Sin asignar</option>
                    {cocineros.map((c) => (
                      <option key={c._id} value={c._id}>{c.alias || c.name}</option>
                    ))}
                  </select>

                  <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                    <FaUser className="text-gray-500" />
                    {cid ? (
                      <span>Mostrando: <span className="text-cyan-300">{nombreCocinero(cid)}</span></span>
                    ) : (
                      <span>No se abrirá ventana</span>
                    )}
                  </div>

                  <button
                    onClick={() => abrirOActualizarVentana(num)}
                    disabled={!cid}
                    className="mt-3 w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                  >
                    <FaPlay /> {abierta ? 'Actualizar' : 'Abrir'}
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={aplicarYDesplegar}
              disabled={saving || !hayCambios}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Guardando...
                </>
              ) : (
                <><FaCheck /> Aplicar / Desplegar</>
              )}
            </button>
            <span className="text-xs text-gray-500">
              {hayCambios ? 'Hay cambios sin guardar.' : 'Sin cambios pendientes.'}
            </span>
          </div>
        </>
      )}

      <div className="mt-6 text-xs text-gray-500">
        Usuario: {user?.name} ({user?.rol}) · PC multi-monitor
      </div>

      {/* Modal de configuración antes de generar .bat */}
      {showBatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowBatModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaFileDownload className="text-green-400" /> Generar .bat kiosk
              </h2>
              <button onClick={() => setShowBatModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {/* Resumen de monitores detectados */}
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">
                <strong>Monitores detectados:</strong> {monitoresDetectados.length || 'N/A'}
                {monitoresDetectados.length > 0
                  ? ` (Monitor 1 = principal, ${Math.max(0, monitoresDetectados.length - 1)} pasivo(s))`
                  : ' (Window Management API no autorizado - se usarán coords estimadas)'}
              </p>
              {monitoresDetectados.length > 0 && (
                <div className="text-xs text-gray-400 space-y-1">
                  {monitoresDetectados.map((m, i) => (
                    <div key={i}>
                      Monitor {i + 1}: {m.width}×{m.height} @ ({m.left},{m.top}){m.isPrimary ? ' ★ Principal' : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Asignación de cocineros por monitor */}
            <p className="text-sm text-gray-300 mb-2"><strong>Asignación de cocineros:</strong></p>
            <div className="space-y-2 mb-4">
              {MONITORES_PASIVOS.map((num) => {
                const monitor = monitoresDetectados[num - 1];
                const cid = asignacion[num] || null;
                const nombre = cid ? nombreCocinero(cid) : '(Sin asignar)';
                return (
                  <div key={num} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                    <span className="text-sm font-semibold w-20">Monitor {num}</span>
                    {monitor && (
                      <span className="text-xs text-gray-400 w-32">
                        {monitor.width}×{monitor.height}
                      </span>
                    )}
                    <select
                      value={cid || SIN_ASIGNAR}
                      onChange={(e) => cambiarCocinero(num, e.target.value)}
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                    >
                      <option value={SIN_ASIGNAR}>Sin asignar</option>
                      {cocineros.map((c) => (
                        <option key={c._id} value={c._id}>{c.alias || c.name}</option>
                      ))}
                    </select>
                    <span className="text-xs text-cyan-300 w-32 truncate">{nombre}</span>
                  </div>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300 mb-4 select-none" title="Incluye &perfil=auto en las URLs del .bat para que cada ventana aplique el perfil de personalización Ver Cocina guardado del cocinero">
              <input
                type="checkbox"
                checked={aplicarPerfil}
                onChange={(e) => setAplicarPerfil(e.target.checked)}
                className="w-4 h-4 accent-cyan-500"
              />
              Aplicar perfil de personalización del cocinero a cada monitor
            </label>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setBatGenerando(true);
                  await generarBatKiosk();
                  setBatGenerando(false);
                  setShowBatModal(false);
                }}
                disabled={batGenerando}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {batGenerando ? (
                  <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Generando...</>
                ) : (
                  <><FaFileDownload /> Generar y descargar .bat</>
                )}
              </button>
              <button onClick={() => setShowBatModal(false)} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                Cancelar
              </button>
            </div>

            <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300">
              ℹ️ El .bat usa <code>--start-fullscreen</code> (pantalla completa automática) y
              <code>--window-position</code> para abrir cada ventana en el monitor correcto.
              Ejecutalo en la PC de cocina. Para cerrar: Alt+F4.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistribuirCocinaMonitoresPage;
