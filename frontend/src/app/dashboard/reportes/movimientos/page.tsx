'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { reportesService } from '@/services/reportes.service';

interface Movimiento {
  id: number;
  tipo: string;
  direccion: 'entrada' | 'salida';
  entidad_tipo: string;
  entidad_id: number;
  bodega: string;
  cantidad: number;
  usuario: string;
  fecha: string;
  compensatorio: boolean;
}

const TIPO_BADGE: Record<string, string> = {
  RECEPCION_ENTRADA:  'bg-green-100 text-green-700',
  CONSUMO_MP:         'bg-orange-100 text-orange-700',
  PRODUCCION_ENTRADA: 'bg-blue-100 text-blue-700',
  TRASLADO_SALIDA:    'bg-yellow-100 text-yellow-700',
  TRASLADO_ENTRADA:   'bg-yellow-100 text-yellow-700',
  DESPACHO_SALIDA:    'bg-red-100 text-red-700',
  AJUSTE_ENTRADA:     'bg-purple-100 text-purple-700',
  AJUSTE_SALIDA:      'bg-purple-100 text-purple-700',
};

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [tipo,        setTipo]        = useState('');

  const cargar = () => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = {};
    if (tipo) params.tipo = tipo;
    reportesService.movimientos(params)
      .then(d => {
        const res = d as { detalle?: Movimiento[] };
        setMovimientos(res.detalle ?? []);
      })
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Movimientos de Inventario
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Historial inmutable — {movimientos.length} registros
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filtro por tipo */}
      <div className="flex items-center gap-3">
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="px-3 py-2 rounded-lg border-2 border-black/10 text-xs font-bold focus:outline-none focus:border-[var(--primary)] transition-colors"
          style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }}>
          <option value="">Todos los tipos</option>
          {Object.keys(TIPO_BADGE).map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
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
                  {['#', 'Tipo', 'Dirección', 'Entidad', 'Bodega', 'Cantidad', 'Usuario', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => (
                  <tr key={m.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                    <td className="px-5 py-3 font-black" style={{ color: 'var(--text-muted)' }}>#{m.id}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${TIPO_BADGE[m.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.tipo.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${m.direccion === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.direccion}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {m.entidad_tipo} #{m.entidad_id}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{m.bodega}</td>
                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>
                      {m.cantidad.toLocaleString('es-CO')}
                      {m.compensatorio && <span className="ml-1 text-[9px] text-purple-600 font-black">(COMP)</span>}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{m.usuario}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(m.fecha).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movimientos.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No hay movimientos registrados.</div>
            )}
          </div>
        )}
    </div>
  );
}
