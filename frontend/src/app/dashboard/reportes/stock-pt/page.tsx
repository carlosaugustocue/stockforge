'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ShoppingBag } from 'lucide-react';
import { reportesService } from '@/services/reportes.service';
import { formatNum } from '@/lib/utils';

interface LotePt {
  lote_id: number;
  producto_terminado: string;
  bodega: string;
  cantidad_actual: number;
  unidad_medida: string;
  fecha_produccion: string;
  orden_produccion_id: number;
}

interface StockPtResponse {
  total_lotes: number;
  por_producto: unknown[];
  detalle: LotePt[];
}

export default function StockPtPage() {
  const [lotes,   setLotes]   = useState<LotePt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const cargar = () => {
    setLoading(true);
    setError('');
    reportesService.stockPt()
      .then(d => setLotes((d as StockPtResponse).detalle ?? []))
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const total = lotes.reduce((acc, l) => acc + l.cantidad_actual, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Stock de Producto Terminado
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Lotes disponibles en bodega — {lotes.length} lote{lotes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <>
            {lotes.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl p-5 border-2 border-black/5 flex items-center gap-4" style={{ background: 'var(--bg-left)' }}>
                  <ShoppingBag size={22} style={{ color: 'var(--primary)' }} />
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{lotes.length}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Lotes activos</p>
                  </div>
                </div>
                <div className="rounded-xl p-5 border-2 border-black/5 flex items-center gap-4" style={{ background: 'var(--bg-left)' }}>
                  <ShoppingBag size={22} className="text-green-500" />
                  <div>
                    <p className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{formatNum(total)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Unidades totales</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black/5">
                    {['Lote', 'Producto', 'Bodega', 'Stock', 'Fecha producción', 'OP #'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lotes.map(l => (
                    <tr key={l.lote_id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                      <td className="px-5 py-3 font-black" style={{ color: 'var(--text-muted)' }}>#{l.lote_id}</td>
                      <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>{l.producto_terminado}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{l.bodega}</td>
                      <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>
                        {formatNum(l.cantidad_actual)}
                        <span className="ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.unidad_medida}</span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(l.fecha_produccion + 'T12:00:00').toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>#{l.orden_produccion_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lotes.length === 0 && (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No hay lotes de producto terminado.</div>
              )}
            </div>
          </>
        )}
    </div>
  );
}
