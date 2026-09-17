/** Motivos rápidos de anulación / reversión / eliminación (KDS y dashboard). */
export const MOTIVOS_RAPIDOS_COCINA = [
  { id: 'cliente_no_desea', label: 'Cliente no desea' },
  { id: 'equivocacion_mozo', label: 'Equivocación de mozo' },
  { id: 'error_sistema', label: 'Error sistema' },
  { id: 'error_entrega', label: 'Error de entrega' },
];

/** Chip rápido + texto opcional. Si solo hay texto, se usa ese. */
export function combinarMotivoRapido(label, extra) {
  const l = String(label || '').trim();
  const e = String(extra || '').trim();
  if (l && e) return `${l}: ${e}`;
  return l || e;
}
