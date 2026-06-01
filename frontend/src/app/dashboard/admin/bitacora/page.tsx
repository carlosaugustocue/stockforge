'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { adminService } from '@/services/admin.service';

interface BitacoraEntry {
  id: number;
  accion: string;
  ip_address: string;
  user_agent: string | null;
  created_at: string;
  usuario: string | null;
}

const ACCION_BADGE: Record<string, string> = {
  login_exitoso:    'bg-green-100 text-green-700',
  login_fallido:    'bg-yellow-100 text-yellow-700',
  logout:           'bg-blue-100 text-blue-700',
  cuenta_bloqueada: 'bg-red-100 text-red-700',
};

export default function BitacoraPage() {
  const [entradas, setEntradas] = useState<BitacoraEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [accion,   setAccion]   = useState('');

  const cargar = () => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = {};
    if (accion) params.accion = accion;
    adminService.bitacora(params)
      .then(d => setEntradas(d as BitacoraEntry[]))
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Bitácora de Accesos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Registro inmutable de eventos de autenticación — {entradas.length} entradas
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <select value={accion} onChange={e => setAccion(e.target.value)}
          className="px-3 py-2 rounded-lg border-2 border-black/10 text-xs font-bold focus:outline-none focus:border-[var(--primary)] transition-colors"
          style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }}>
          <option value="">Todas las acciones</option>
          {Object.keys(ACCION_BADGE).map(a => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button onClick={cargar} disabled={loading}
          className="px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: 'var(--secondary)' }}>
          Filtrar
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/5">
                  {['#', 'Acción', 'Usuario', 'IP', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entradas.map(e => (
                  <tr key={e.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                    <td className="px-5 py-3 font-black" style={{ color: 'var(--text-muted)' }}>{e.id}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ACCION_BADGE[e.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                        {e.accion.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium" style={{ color: 'var(--text-main)' }}>
                      {e.usuario ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{e.ip_address}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(e.created_at).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entradas.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No hay registros en la bitácora.</div>
            )}
          </div>
        )}
    </div>
  );
}
