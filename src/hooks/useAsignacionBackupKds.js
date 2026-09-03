/**
 * Config de asignación (platos + guarniciones) para saber si un plato KDS tiene backup.
 */
import { useState, useEffect } from 'react';
import { apiGet } from '../config/apiClient';
import { extraerFuentePerfil } from '../utils/asignacionBackupMatch';

const TTL_MS = 60 * 1000;
let cache = null;
let cacheAt = 0;
let inflight = null;

export async function fetchAsignacionBackupSnapshot() {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const [platos, guarn] = await Promise.all([
        apiGet('/api/asignacion-automatica'),
        apiGet('/api/asignacion-automatica-guarniciones').catch(() => null)
      ]);
      cache = {
        platos: extraerFuentePerfil(platos),
        guarniciones: extraerFuentePerfil(guarn)
      };
      cacheAt = Date.now();
      return cache;
    } catch (e) {
      console.warn('[useAsignacionBackupKds]', e.message);
      cache = { platos: null, guarniciones: null };
      cacheAt = Date.now();
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function useAsignacionBackupKds() {
  const [snapshot, setSnapshot] = useState(cache);

  useEffect(() => {
    let alive = true;
    fetchAsignacionBackupSnapshot().then((s) => {
      if (alive) setSnapshot(s);
    });
    return () => { alive = false; };
  }, []);

  return snapshot;
}

export default useAsignacionBackupKds;
