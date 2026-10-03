import { apiPost } from '../config/apiClient';
import { getServerBaseUrl } from '../config/apiConfig';
import { generarHtmlTicketCocina, formatLetreroTicket } from './comandaPrint/ticketCocinaHtml';
import { etiquetaMozosComandas } from './numeroComandaMozo';
import { obtenerNombreDisplayCocina } from './platoHelpers';

export const IP_IMPRESORA_COCINA = '192.168.50.228';
export const IP_IMPRESORA_CAJA = '192.168.50.150';

const ANCHO_CSS = 226;
const ANCHO_PUNTOS = 576;
const ESCALA = ANCHO_PUNTOS / ANCHO_CSS;
const EPOS_NS = 'http://www.epson-pos.com/schemas/2011/03/epos-print';

const SCRIPT_RASTER = `
function enviar(msg) {
  try { parent.postMessage(msg, '*'); } catch (e) {}
}
function rasterizar() {
  try {
    var S = ${ESCALA};
    var sheet = document.getElementById('sheet');
    var root = sheet.getBoundingClientRect();
    var rawW = sheet.offsetWidth || ${ANCHO_CSS};
    var posScale = root.width / rawW;
    if (!isFinite(posScale) || posScale < 0.5) posScale = 1;
    var extra = S / posScale;
    var W = ${ANCHO_PUNTOS};
    var H = Math.max(8, Math.ceil((root.height * extra) / 8) * 8);
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    ctx.textBaseline = 'top';
    function fontEscalada(fontCss) {
      return String(fontCss || '11px Arial').replace(/([\\d.]+)px/g, function (_, n) {
        return (parseFloat(n) * S) + 'px';
      });
    }
    function paintText(node) {
      var full = node.nodeValue;
      if (!full || !/\\S/.test(full)) return;
      var parent = node.parentElement;
      if (!parent) return;
      var cs = getComputedStyle(parent);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      ctx.font = fontEscalada(cs.font);
      var start = 0;
      var guard = 0;
      while (start < full.length && guard++ < 400) {
        while (start < full.length && (full.charAt(start) === '\\n' || full.charAt(start) === '\\r')) start++;
        if (start >= full.length) break;
        var end = start + 1;
        var range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        var rect = range.getBoundingClientRect();
        var top = rect.top;
        while (end < full.length) {
          range.setEnd(node, end + 1);
          var r2 = range.getBoundingClientRect();
          if (end > start && (Math.abs(r2.top - top) > 1.5 || r2.height > rect.height + 1)) break;
          end++;
          rect = range.getBoundingClientRect();
        }
        var slice = full.slice(start, end).replace(/\\s+/g, ' ');
        if (slice.trim()) {
          ctx.fillText(slice, (rect.left - root.left) * extra, (rect.top - root.top) * extra);
        }
        start = end;
      }
    }
    function edge(cs, which, x1, y1, x2, y2) {
      var bw = parseFloat(cs['border' + which + 'Width']);
      var st = cs['border' + which + 'Style'];
      if (!(bw > 0) || st === 'none' || st === 'hidden') return;
      ctx.lineWidth = Math.max(1, bw * S);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    function paintEl(el) {
      if (!el || el.nodeType !== 1) return;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      var r = el.getBoundingClientRect();
      var x = (r.left - root.left) * extra;
      var y = (r.top - root.top) * extra;
      var w = r.width * extra;
      var h = r.height * extra;
      edge(cs, 'Top', x, y, x + w, y);
      edge(cs, 'Bottom', x, y + h, x + w, y + h);
      edge(cs, 'Left', x, y, x, y + h);
      edge(cs, 'Right', x + w, y, x + w, y + h);
      var kids = el.childNodes;
      for (var i = 0; i < kids.length; i++) {
        var c = kids[i];
        if (c.nodeType === 3) paintText(c);
        else if (c.nodeType === 1) paintEl(c);
      }
    }
    paintEl(sheet);
    var img = ctx.getImageData(0, 0, W, H);
    var rowBytes = W / 8;
    var bytes = new Uint8Array(rowBytes * H);
    var di = 0;
    for (var yy = 0; yy < H; yy++) {
      for (var xx = 0; xx < W; xx += 8) {
        var b = 0;
        for (var bit = 0; bit < 8; bit++) {
          var i = ((yy * W) + xx + bit) * 4;
          var lum = img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11;
          if (lum < 160) b |= (0x80 >> bit);
        }
        bytes[di++] = b;
      }
    }
    var bin = '';
    var CHUNK = 8192;
    for (var j = 0; j < bytes.length; j += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(j, j + CHUNK));
    }
    enviar(JSON.stringify({ ok: true, width: W, height: H, b64: btoa(bin) }));
  } catch (err) {
    enviar(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
}
function arrancar() {
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(rasterizar, 30); });
  else setTimeout(rasterizar, 60);
}
arrancar();
`;

function htmlDocumento(htmlInner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:#fff;color:#000;}
    #sheet{width:${ANCHO_CSS}px;padding:4px;box-sizing:border-box;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;transform:scale(${ESCALA});transform-origin:top left;}
    table{width:100%;}
  </style></head><body><div id="sheet">${htmlInner}</div><script>${SCRIPT_RASTER}</script></body></html>`;
}

function xmlImagenEpos({ width, height, b64 }) {
  return `<epos-print xmlns="${EPOS_NS}"><image width="${width}" height="${height}" color="color_1" mode="mono" align="center">${b64}</image><feed line="2"/><cut type="feed"/></epos-print>`;
}

function rasterizarHtmlTicket(htmlInner) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;left:-8000px;top:0;width:680px;height:1800px;border:0;';
    let done = false;
    const finish = (err, data) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      iframe.remove();
      if (err) reject(err);
      else resolve(data);
    };
    const onMsg = (ev) => {
      if (ev.source !== iframe.contentWindow) return;
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }
      if (!data || (data.ok !== true && data.ok !== false)) return;
      if (!data.ok || !data.b64) finish(new Error(data.error || 'No se pudo armar el ticket.'));
      else finish(null, data);
    };
    const timer = setTimeout(() => finish(new Error('La impresión tardó demasiado.')), 12000);
    window.addEventListener('message', onMsg);
    iframe.srcdoc = htmlDocumento(htmlInner);
    document.body.appendChild(iframe);
  });
}

function idPedido(c) {
  const p = c?.pedido;
  if (p == null || p === '') return '';
  if (typeof p === 'object') return String(p._id || '');
  return String(p);
}

function fusionarLineas(anterior, nueva) {
  if (!nueva) return anterior;
  const viejos = anterior?.platos || [];
  const platos = (nueva.platos || viejos).map((p, i) => {
    const viejo = viejos.find((v) => p?._id && String(v._id) === String(p._id)) || viejos[i];
    const platoNuevo = p?.plato && typeof p.plato === 'object' && (p.plato.nombre || p.plato.nombreCocina);
    return { ...(viejo || {}), ...p, plato: platoNuevo ? p.plato : (viejo?.plato || p?.plato) };
  });
  return { ...(anterior || {}), ...nueva, platos };
}

function mesaLabel(c) {
  if (c?.sinMesa) return 'Sin mesa';
  const m = c?.mesas;
  if (m?.nombreMesa) return String(m.nombreMesa);
  if (m?.nombreCombinado) return String(m.nombreCombinado);
  if (m?.nummesa != null && m.nummesa !== '') return String(m.nummesa);
  if (c?.mesaNumero != null && c.mesaNumero !== '') return String(c.mesaNumero);
  return '—';
}

function nombreClienteTicket(c) {
  return String(
    c?.clienteNombre
    || c?.clienteNombreParaLlevar
    || (c?.cliente && typeof c.cliente === 'object' ? c.cliente.nombre : '')
    || ''
  ).trim();
}

function productosDe(grupo, incluirEliminados = false) {
  const out = [];
  for (const c of grupo) {
    (c.platos || []).forEach((linea, index) => {
      if (!linea) return;
      if (!incluirEliminados && (linea.eliminado === true || linea.anulado === true)) return;
      const nombre = obtenerNombreDisplayCocina(linea) || linea?.plato?.nombre || 'Plato';
      const cant = Number(c.cantidades?.[index] || linea.cantidad) || 1;
      const unit = linea.precioUnitario != null
        ? Number(linea.precioUnitario)
        : (Number(linea?.plato?.precio) || 0);
      out.push({
        nombre,
        cantidad: cant,
        precio: unit,
        tipoServicio: linea.tipoServicio || 'mesa',
        guarnicionesCambio: linea.guarnicionesCambio || null,
      });
    });
  }
  return out;
}

function datosTicketDeGrupo(lista, extra = {}) {
  const productos = productosDe(lista, extra.incluirEliminados === true);
  const base = lista[0] || {};
  const desc = lista.reduce((s, c) => s + (Number(c.montoDescuento) || 0), 0);
  const motivo = lista.map((c) => c.motivoDescuento).find(Boolean) || '';
  const reserva = lista.some((c) => c?.origenCreacion === 'reserva' || c?.programadaPorReserva === true || c?.origenReserva);
  const fechaAtencion = lista.map((c) => c?.fechaAtencion || c?.origenReserva?.fechaReserva).find(Boolean);
  return {
    comandaNumeroDisplay: extra.letrero || formatLetreroTicket(lista),
    productos,
    mozo: etiquetaMozosComandas(lista) || base.mozos?.name || base.mozoNombre || '',
    clienteNombre: lista.map(nombreClienteTicket).find(Boolean) || '',
    mesa: mesaLabel(base),
    sinMesa: lista.some((c) => c?.sinMesa === true),
    reserva,
    fechaAtencion: fechaAtencion
      ? new Date(fechaAtencion).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '',
    area: base.areaNombre || base.mesas?.area?.nombre || '',
    fechaPedido: base.createdAt,
    montoDescuento: desc,
    descuentos: motivo ? [{ motivo }] : [],
    total: 0,
    anulacion: extra.anulacion || null,
  };
}

async function enviarEpos(ip, xml, nombre) {
  try {
    await apiPost('/api/impresion/epos', { ip, xml });
  } catch (e) {
    throw new Error(e?.response?.data?.message || e?.userMessage || `No se pudo imprimir el ticket de ${nombre}.`);
  }
}

async function paradasImpresionAutomatica() {
  try {
    const base = getServerBaseUrl();
    const url = base
      ? `${base}/api/configuracion/impresion-automatica`
      : '/api/configuracion/impresion-automatica';
    const res = await fetch(url);
    if (!res.ok) return { cocina: false, caja: false };
    const data = await res.json();
    return {
      cocina: data?.detenerImpresionCocina === true,
      caja: data?.detenerImpresionCaja === true,
    };
  } catch {
    return { cocina: false, caja: false };
  }
}

export async function imprimirTicketCocinaKds(grupo) {
  const lista = (grupo || []).filter(Boolean);
  const datos = datosTicketDeGrupo(lista);
  if (!(datos.productos || []).length && !datos.anulacion) return;
  const parada = await paradasImpresionAutomatica();
  if (parada.cocina && parada.caja) return;
  const trabajos = [];
  if (!parada.cocina) {
    const cocinaGen = generarHtmlTicketCocina({ datos, cocina: true });
    trabajos.push(rasterizarHtmlTicket(cocinaGen.htmlInner).then((img) => (
      enviarEpos(IP_IMPRESORA_COCINA, xmlImagenEpos(img), 'cocina')
    )));
  }
  if (!parada.caja) {
    const cajaGen = generarHtmlTicketCocina({ datos, cocina: false });
    trabajos.push(rasterizarHtmlTicket(cajaGen.htmlInner).then((img) => (
      enviarEpos(IP_IMPRESORA_CAJA, xmlImagenEpos(img), 'caja')
    )));
  }
  const fallos = [];
  const jobs = await Promise.allSettled(trabajos);
  jobs.forEach((j) => {
    if (j.status === 'rejected') fallos.push(j.reason?.message || 'Error de impresión');
  });
  if (fallos.length) throw new Error(fallos.join('\n'));
}

/** Grupo del mismo pedido. La letra queda solo en la comanda editada. */
export async function imprimirTicketCocinaTrasEliminar(actualizada, todas) {
  if (!actualizada) return;
  const pid = idPedido(actualizada);
  const hermanas = pid
    ? (todas || []).filter((c) => idPedido(c) === pid)
    : [];
  const src = hermanas.length ? hermanas : [actualizada];
  const grupo = src.map((c) => (
    String(c._id) === String(actualizada._id) ? fusionarLineas(c, actualizada) : c
  ));
  if (!grupo.some((c) => String(c._id) === String(actualizada._id))) {
    grupo.push(fusionarLineas(null, actualizada));
  }
  await imprimirTicketCocinaKds(grupo);
}

/** Hoja de anulación: incluye los platos ya marcados eliminados y el pie ANULADO X. */
export async function imprimirTicketAnulacionKds(comanda, ticketAnulacion) {
  if (!comanda || !ticketAnulacion) return;
  const datos = datosTicketDeGrupo([comanda], {
    incluirEliminados: true,
    anulacion: ticketAnulacion,
    letrero: ticketAnulacion.letrero,
  });
  if (!(datos.productos || []).length && !datos.anulacion) return;
  const parada = await paradasImpresionAutomatica();
  if (parada.cocina && parada.caja) return;
  const trabajos = [];
  if (!parada.cocina) {
    const cocinaGen = generarHtmlTicketCocina({ datos, cocina: true });
    trabajos.push(rasterizarHtmlTicket(cocinaGen.htmlInner).then((img) => (
      enviarEpos(IP_IMPRESORA_COCINA, xmlImagenEpos(img), 'cocina')
    )));
  }
  if (!parada.caja) {
    const cajaGen = generarHtmlTicketCocina({ datos, cocina: false });
    trabajos.push(rasterizarHtmlTicket(cajaGen.htmlInner).then((img) => (
      enviarEpos(IP_IMPRESORA_CAJA, xmlImagenEpos(img), 'caja')
    )));
  }
  const fallos = [];
  const jobs = await Promise.allSettled(trabajos);
  jobs.forEach((j) => {
    if (j.status === 'rejected') fallos.push(j.reason?.message || 'Error de impresión');
  });
  if (fallos.length) throw new Error(fallos.join('\n'));
}
