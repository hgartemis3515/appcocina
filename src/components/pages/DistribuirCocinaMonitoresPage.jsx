import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  FaArrowLeft, FaDesktop, FaPlay, FaStop, FaSync,
  FaCheck, FaExclamationTriangle, FaUser, FaFileDownload,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { getServerBaseUrl } from '../../config/apiConfig';
import { getHubAuthBundle, getHubAuthHash } from '../../utils/hubAuth';
import useCocinerosLista from '../../hooks/useCocinerosLista';
import {
  abrirMonitorCocinero, redirigirVentanaMonitor, cerrarVentanaMonitor,
  obtenerMonitores, soportaMultiMonitor,
} from '../../utils/monitorWindowManager';

// Flujo "Distribuir Cocina en monitores (1 PC x 8 pantallas)".
const MONITOR_PRINCIPAL = 1;
const MONITORES_PASIVOS = [2, 3, 4, 5, 6, 7, 8];

function idsDeMonitor(valor) {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor.filter(Boolean).map(String);
  return String(valor).split(',').map((s) => s.trim()).filter(Boolean);
}

function serializeIdsMonitor(valor) {
  return idsDeMonitor(valor).join(',');
}

const DistribuirCocinaMonitoresPage = ({ onGoToMenu }) => {
  const { getToken, user } = useAuth();
  const { cocineros, loading: loadingCocineros, recargar: recargarCocineros } = useCocinerosLista({ getToken });

  const [pantallas, setPantallas] = useState([]);
  const [asignacion, setAsignacion] = useState({});
  const [asignacionInicial, setAsignacionInicial] = useState({});
  // Perfil de personalización por monitor (flujo "Distribuir Cocina en monitores").
  // Valores por monitor: 'none' | 'auto' | '<PerfilVerCocinaId>'.
  const [asignacionPerfil, setAsignacionPerfil] = useState({});
  const [asignacionPerfilInicial, setAsignacionPerfilInicial] = useState({});
  // PLAN GUARNICIONES_SEPARADAS v1.1 §11: lista de guarniciones por monitor.
  const [asignacionListaGuarniciones, setAsignacionListaGuarniciones] = useState({});
  const [asignacionListaGuarnicionesInicial, setAsignacionListaGuarnicionesInicial] = useState({});
  // Flag global (para deshabilitar el checkbox si está OFF en Configuración → Cocina).
  const [flagGuarnicionesGlobal, setFlagGuarnicionesGlobal] = useState(true);
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
  const [perfiles, setPerfiles] = useState([]);
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);

  // Opciones de perfil para pasar a monitorWindowManager según el monitor.
  const getPerfilOptsForMonitor = useCallback((numero) => {
    const perfil = asignacionPerfil[numero] || 'none';
    if (perfil === 'none') return {};
    if (perfil === 'auto') return { aplicarPerfil: true };
    return { perfilId: perfil };
  }, [asignacionPerfil]);

  // Sufijo de URL para .bat y Monitor Hub según el monitor.
  const getPerfilSuffixForMonitor = useCallback((numero) => {
    const perfil = asignacionPerfil[numero] || 'none';
    if (perfil === 'none') return '';
    if (perfil === 'auto') return '&perfil=auto';
    return `&perfilId=${encodeURIComponent(perfil)}`;
  }, [asignacionPerfil]);

  // PLAN GUARNICIONES_SEPARADAS v1.1 §11.4: helpers para el flag por monitor.
  const getListaGuarnicionesOptsForMonitor = useCallback((numero) => {
    return asignacionListaGuarniciones[numero] ? { listaGuarniciones: true } : {};
  }, [asignacionListaGuarniciones]);
  const getListaGuarnicionesSuffixForMonitor = useCallback((numero) => {
    return asignacionListaGuarniciones[numero] ? '&listaGuarniciones=1' : '';
  }, [asignacionListaGuarniciones]);

  const cargarPerfiles = useCallback(async () => {
    if (!getToken) return;
    try {
      setCargandoPerfiles(true);
      const token = getToken();
      const res = await axios.get(`${getServerBaseUrl()}/api/perfiles-ver-cocina`, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
      });
      setPerfiles(res.data?.data || []);
    } catch (err) {
      console.warn('[DistribuirCocina] Error cargando perfiles:', err.message);
    } finally {
      setCargandoPerfiles(false);
    }
  }, [getToken]);

  useEffect(() => { cargarPerfiles(); }, [cargarPerfiles]);

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
      const mapPerfil = {};
      const mapLista = {};
      for (const p of data) {
        if (p.numeroPantalla === MONITOR_PRINCIPAL) continue;
        const cid = p.cocineroId?._id || p.cocineroId || null;
        const fromArr = Array.isArray(p.cocineroIds) ? p.cocineroIds : [];
        const ids = (fromArr.length ? fromArr : (cid ? [cid] : []))
          .map((x) => String(x?._id || x))
          .filter(Boolean);
        map[p.numeroPantalla] = ids;
        // Perfil por monitor: 'auto' > 'id' > 'none'
        if (p.perfilAuto) {
          mapPerfil[p.numeroPantalla] = 'auto';
        } else if (p.perfilVerCocinaId) {
          mapPerfil[p.numeroPantalla] = String(p.perfilVerCocinaId._id || p.perfilVerCocinaId);
        } else {
          mapPerfil[p.numeroPantalla] = 'none';
        }
        // PLAN GUARNICIONES_SEPARADAS v1.1 §11.3: hidratar flag por monitor.
        mapLista[p.numeroPantalla] = p.listaGuarniciones === true;
      }
      setAsignacion(map);
      setAsignacionInicial(map);
      setAsignacionPerfil(mapPerfil);
      setAsignacionPerfilInicial(mapPerfil);
      setAsignacionListaGuarniciones(mapLista);
      setAsignacionListaGuarnicionesInicial(mapLista);
      setMensaje(null);

      // Flag global (para deshabilitar el checkbox si está OFF).
      try {
        const cfgRes = await axios.get(`${getServerBaseUrl()}/api/configuracion`, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
        });
        const cocina = cfgRes.data?.configuracion?.cocina || {};
        setFlagGuarnicionesGlobal(cocina.permitirGuarnicionesSeparadas !== false);
      } catch { /* defaults */ }
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
            if (idsDeMonitor(nueva[numMonitor]).length === 0) {
              nueva[numMonitor] = [String(cocinerosDisponibles[cocineroIdx]._id)];
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
      for (const cid of idsDeMonitor(asignacion[num])) {
        counts[cid] = (counts[cid] || 0) + 1;
      }
    }
    return Object.keys(counts).filter((cid) => counts[cid] > 1);
  }, [asignacion]);

  const hayCambios = useMemo(() => {
    for (const num of MONITORES_PASIVOS) {
      const a = serializeIdsMonitor(asignacion[num]);
      const b = serializeIdsMonitor(asignacionInicial[num]);
      if (a !== b) return true;
      const pa = asignacionPerfil[num] || 'none';
      const pb = asignacionPerfilInicial[num] || 'none';
      if (pa !== pb) return true;
      // PLAN GUARNICIONES_SEPARADAS v1.1 §11.3
      const la = asignacionListaGuarniciones[num] === true;
      const lb = asignacionListaGuarnicionesInicial[num] === true;
      if (la !== lb) return true;
    }
    return false;
  }, [asignacion, asignacionInicial, asignacionPerfil, asignacionPerfilInicial, asignacionListaGuarniciones, asignacionListaGuarnicionesInicial]);

  const agregarCocineroMonitor = (numero, valor) => {
    if (!valor) return;
    const id = String(valor);
    setAsignacion((prev) => {
      const actual = idsDeMonitor(prev[numero]);
      if (actual.includes(id)) return prev;
      return { ...prev, [numero]: [...actual, id] };
    });
    setMensaje(null);
  };

  const quitarCocineroMonitor = (numero, idQuitar) => {
    setAsignacion((prev) => ({
      ...prev,
      [numero]: idsDeMonitor(prev[numero]).filter((id) => id !== String(idQuitar)),
    }));
    setMensaje(null);
  };

  const cambiarPerfilMonitor = (numero, valor) => {
    setAsignacionPerfil((prev) => ({ ...prev, [numero]: valor || 'none' }));
    setMensaje(null);
  };

  // PLAN GUARNICIONES_SEPARADAS v1.1 §11.3
  const cambiarListaGuarnicionesMonitor = (numero, valor) => {
    setAsignacionListaGuarniciones((prev) => ({ ...prev, [numero]: !!valor }));
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
        const ids = idsDeMonitor(asignacion[num]);
        return {
          id: p._id,
          cocineroId: ids[0] || null,
          cocineroIds: ids,
          modoVista: ids.length ? 'completo' : 'personalizado',
          perfilAplicar: asignacionPerfil[num] || 'none',
          listaGuarniciones: asignacionListaGuarniciones[num] === true,
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
      setAsignacionPerfilInicial({ ...asignacionPerfil });
      setAsignacionListaGuarnicionesInicial({ ...asignacionListaGuarniciones });
      const enviado = await enviarAMonitorHub({ fromSave: true });
      if (enviado?.ok) {
        setMensaje({
          tipo: 'ok',
          texto: `Distribución guardada y enviada al Monitor Hub (${enviado.slots} monitores). En el Hub pulsa Desplegar ventanas.`,
        });
      } else if (enviado?.error) {
        setMensaje({
          tipo: 'ok',
          texto: `Distribución guardada. No se pudo enviar al Hub: ${enviado.error}`,
        });
      } else {
        setMensaje('Distribución guardada correctamente.');
      }
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
    const ids = idsDeMonitor(asignacion[numero]);
    const cocineroId = serializeIdsMonitor(ids);
    const existente = ventanas[numero];
    if (!ids.length) {
      if (existente && !existente.closed) cerrarVentanaMonitor(existente);
      setVentanas((prev) => { const n = { ...prev }; delete n[numero]; return n; });
      return;
    }
    if (existente && !existente.closed) {
      const ok = redirigirVentanaMonitor(existente, pantalla, cocineroId, {
        ...getPerfilOptsForMonitor(numero),
        ...getListaGuarnicionesOptsForMonitor(numero),
      });
      if (!ok) {
        const win = await abrirMonitorCocinero(pantalla, {
          cocineroIdOverride: cocineroId,
          ...getPerfilOptsForMonitor(numero),
          ...getListaGuarnicionesOptsForMonitor(numero),
        });
        if (win) setVentanas((prev) => ({ ...prev, [numero]: win }));
      }
    } else {
      const win = await abrirMonitorCocinero(pantalla, {
        cocineroIdOverride: cocineroId,
        ...getPerfilOptsForMonitor(numero),
        ...getListaGuarnicionesOptsForMonitor(numero),
      });
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

  // Envia la asignacion actual al Gambusinas Monitor Hub (localhost) para que
  // abra/posicione las ventanas en los monitores fisicos. Requiere que el
  // Hub este corriendo en la misma PC (servidor http://127.0.0.1:7331/import).
  const [enviandoHub, setEnviandoHub] = useState(false);
  const enviarAMonitorHub = async (opts = {}) => {
    const fromSave = opts.fromSave === true;
    const baseUrl = getServerBaseUrl();
    let host = '192.168.50.155';
    let puertoApp = '3001';
    try {
      const url = new URL(baseUrl);
      host = url.hostname;
      puertoApp = window.location.port || '3001';
    } catch { /* noop */ }
    const base = `http://${host}:${puertoApp}`;
    const nombrePerfil = (num) => {
      const perfil = asignacionPerfil[num] || 'none';
      if (perfil === 'none') return 'Sin perfil';
      if (perfil === 'auto') return 'Perfil del cocinero (auto)';
      const p = perfiles.find((x) => String(x._id) === String(perfil));
      return p?.nombre || perfil;
    };
    const authHash = getHubAuthHash();
    const slots = MONITORES_PASIVOS
      .filter((num) => idsDeMonitor(asignacion[num]).length > 0)
      .map((num) => {
        const ids = idsDeMonitor(asignacion[num]);
        const cid = serializeIdsMonitor(ids);
        const perfil = asignacionPerfil[num] || 'none';
        const nombre = ids.map((id) => nombreCocinero(id)).join(' + ');
        return {
          monitorIndex: num,
          url: `${base}/?monitor=${num}&cocineroId=${encodeURIComponent(cid)}&modo=completo-fijo${getPerfilSuffixForMonitor(num)}${getListaGuarnicionesSuffixForMonitor(num)}${authHash}`,
          mode: 'fullscreen',
          label: nombre,
          cocineroId: cid,
          cocineroNombre: nombre,
          perfil,
          perfilNombre: nombrePerfil(num),
          listaGuarniciones: asignacionListaGuarniciones[num] === true,
        };
      });
    if (slots.length === 0) {
      if (!fromSave) {
        setMensaje({ tipo: 'error', texto: 'Asigna al menos un cocinero antes de enviar al Hub.' });
      }
      return { ok: false, slots: 0 };
    }
    if (!fromSave) setEnviandoHub(true);
    const hubUrl = `${getServerBaseUrl()}/api/hub/import`;
    const token = getToken();
    try {
      await axios.post(hubUrl, {
        source: 'appcocina',
        profileName: `Cocina ${new Date().toLocaleString()}`,
        slots,
        authBundle: getHubAuthBundle(),
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 8000,
      });
      if (!fromSave) {
        setMensaje({
          tipo: 'ok',
          texto: `Enviado al Monitor Hub (${slots.length} monitores). En el Hub pulsa Desplegar ventanas.`,
        });
      }
      return { ok: true, slots: slots.length };
    } catch (e) {
      const detalle = e?.response?.data?.error || e.message;
      if (!fromSave) {
        setMensaje({
          tipo: 'error',
          texto: `No se pudo enviar al Monitor Hub. ${detalle}`,
        });
      }
      return { ok: false, slots: slots.length, error: detalle };
    } finally {
      if (!fromSave) setEnviandoHub(false);
    }
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
      const cid = serializeIdsMonitor(asignacion[num]);
      return `set COCINERO_${num}=${cid}`;
    }).join('\n');

    const asignados = MONITORES_PASIVOS.filter((num) => idsDeMonitor(asignacion[num]).length > 0).length;

    const monsData = MONITORES_PASIVOS.map((num) => {
      const cid = serializeIdsMonitor(asignacion[num]);
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

    // Bloques start: lanzar Chrome kiosk por cada monitor (con su perfil propio)
    const bloquesStart = monsData.map((m) => (
`if not "%COCINERO_${m.num}%"=="" (
  echo Abriendo Monitor ${m.num} - Cocinero: %COCINERO_${m.num}% - Pos: ${m.posX},${m.posY}
    start "cocina-monitor-${m.num}" "%CHROME%" --kiosk --new-window "%BASE%/?monitor=${m.num}&cocineroId=%COCINERO_${m.num}%&modo=completo-fijo${getPerfilSuffixForMonitor(m.num)}${getListaGuarnicionesSuffixForMonitor(m.num)}"
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
          <button onClick={enviarAMonitorHub} disabled={enviandoHub || loading || pantallas.length === 0}
            className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
            title="Envia la asignacion al Gambusinas Monitor Hub (debe correr en la PC de los monitores)"
          >
            <FaDesktop /> Enviar al Monitor Hub
          </button>
          <span className="text-xs text-gray-400 ml-2" title="Esta URL debes configurar en el Monitor Hub (boton Configurar servidor)">
            En el Hub pon: <b>{getServerBaseUrl()}</b>
          </span>
          <button
            type="button"
            onClick={cargarPerfiles}
            disabled={cargandoPerfiles}
            title="Recargar lista de perfiles de personalización"
            className="ml-2 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            ↻ Perfiles
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-cyan-900/20 border border-cyan-700/30 rounded-lg">
        <p className="text-cyan-300 text-sm">
          Desde el <strong>monitor 1</strong> (esta consola) eliges qué cocineros se ven en cada
          monitor pasivo (2-8) y qué <strong>perfil de personalización</strong> aplica a cada uno.
          Puedes poner <strong>varios cocineros en el mismo monitor</strong> y repetir un cocinero
          en varios monitores. Cada ventana abre Ver Cocina Completo filtrado por esos cocineros. Pulsa{' '}
          <strong>Aplicar / Desplegar</strong> para guardar y enviar al Hub.
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
        <div
          className={
            'mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ' +
            (typeof mensaje === 'object' && mensaje.tipo === 'error'
              ? 'bg-red-900/30 border border-red-700/40 text-red-300'
              : 'bg-green-900/30 border border-green-700/40 text-green-300')
          }
        >
          {typeof mensaje === 'object' && mensaje.tipo === 'error' ? (
            <FaExclamationTriangle />
          ) : (
            <FaCheck />
          )}{' '}
          {typeof mensaje === 'object' ? mensaje.texto : mensaje}
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
            <div className="mb-4 p-3 bg-cyan-900/30 border border-cyan-700/40 rounded-lg text-cyan-200 text-sm flex items-center gap-2">
              <FaUser />
              Mismo cocinero en varios monitores: {duplicados.map((cid) => nombreCocinero(cid)).join(', ')}.
              Está permitido.
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
              const ids = idsDeMonitor(asignacion[num]);
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

                  <label className="block text-xs text-gray-400 mb-1">Cocineros a mostrar</label>
                  <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
                    {ids.map((id) => (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-200 text-xs border border-cyan-700/40">
                        {nombreCocinero(id)}
                        <button type="button" onClick={() => quitarCocineroMonitor(num, id)} className="hover:text-white" title="Quitar">×</button>
                      </span>
                    ))}
                    {ids.length === 0 && (
                      <span className="text-xs text-gray-600">Ninguno</span>
                    )}
                  </div>
                  <select
                    value=""
                    onChange={(e) => { agregarCocineroMonitor(num, e.target.value); e.target.value = ''; }}
                    disabled={loadingCocineros}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">+ Añadir cocinero…</option>
                    {cocineros.filter((c) => !ids.includes(String(c._id))).map((c) => (
                      <option key={c._id} value={c._id}>{c.alias || c.name}</option>
                    ))}
                  </select>

                  <label className="block text-xs text-gray-400 mt-3 mb-1" title="Perfil de personalización Ver Cocina aplicado a este monitor">
                    Perfil de personalización
                  </label>
                  <select
                    value={asignacionPerfil[num] || 'none'}
                    onChange={(e) => cambiarPerfilMonitor(num, e.target.value)}
                    disabled={cargandoPerfiles || ids.length === 0}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  >
                    <option value="none">Sin perfil (default)</option>
                    <option value="auto">Perfil del cocinero (auto)</option>
                    {perfiles.map((p) => (
                      <option key={p._id} value={p._id}>{p.nombre}</option>
                    ))}
                  </select>

                  {/* PLAN GUARNICIONES_SEPARADAS v1.1 §11.2: checkbox por monitor */}
                  <label
                    className="mt-3 flex items-center gap-2 text-xs text-gray-400 cursor-pointer"
                    title="Si está marcado, esta ventana abre Ver Cocina ya partida 50/50 (principales | guarniciones)"
                  >
                    <input
                      type="checkbox"
                      checked={asignacionListaGuarniciones[num] === true}
                      onChange={(e) => cambiarListaGuarnicionesMonitor(num, e.target.checked)}
                      disabled={ids.length === 0 || !flagGuarnicionesGlobal}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-lime-500 focus:ring-lime-500 disabled:opacity-40"
                    />
                    <span className={(ids.length === 0 || !flagGuarnicionesGlobal) ? 'opacity-50' : ''}>
                      Lista de guarniciones (split 50/50)
                    </span>
                  </label>
                  {!flagGuarnicionesGlobal && (
                    <p className="text-[10px] text-amber-400 mt-1">
                      Guarniciones separadas desactivadas en Configuración → Cocina
                    </p>
                  )}

                  <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                    <FaUser className="text-gray-500" />
                    {ids.length ? (
                      <span>Mostrando: <span className="text-cyan-300">{ids.map((id) => nombreCocinero(id)).join(' + ')}</span></span>
                    ) : (
                      <span>No se abrirá ventana</span>
                    )}
                  </div>

                  <button
                    onClick={() => abrirOActualizarVentana(num)}
                    disabled={ids.length === 0}
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

            {/* Asignación de cocineros y perfil por monitor */}
            <p className="text-sm text-gray-300 mb-2"><strong>Asignación por monitor:</strong></p>
            <div className="space-y-2 mb-4">
              {MONITORES_PASIVOS.map((num) => {
                const monitor = monitoresDetectados[num - 1];
                const ids = idsDeMonitor(asignacion[num]);
                const nombre = ids.length ? ids.map((id) => nombreCocinero(id)).join(' + ') : '(Sin asignar)';
                return (
                  <div key={num} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                    <span className="text-sm font-semibold w-20 shrink-0">Monitor {num}</span>
                    {monitor && (
                      <span className="text-xs text-gray-400 w-28 shrink-0 hidden md:inline">
                        {monitor.width}×{monitor.height}
                      </span>
                    )}
                    <span className="flex-1 min-w-0 text-sm text-cyan-200 truncate" title={nombre}>{nombre}</span>
                    <select
                      value={asignacionPerfil[num] || 'none'}
                      onChange={(e) => cambiarPerfilMonitor(num, e.target.value)}
                      disabled={ids.length === 0}
                      title="Perfil de personalización Ver Cocina para este monitor"
                      className="flex-1 min-w-0 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm disabled:opacity-50"
                    >
                      <option value="none">Sin perfil</option>
                      <option value="auto">Perfil auto</option>
                      {perfiles.map((p) => (
                        <option key={p._id} value={p._id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

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
