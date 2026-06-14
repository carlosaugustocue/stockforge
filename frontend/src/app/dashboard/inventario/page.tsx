'use client';

import { useEffect, useState } from 'react';
import { Scale, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { inventarioService, type StockMp } from '@/services/inventario.service';
import { formatCantidad } from '@/lib/utils';

export default function StockMpPage() {
  const [stock,   setStock]   = useState<StockMp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');

  const cargar = () => {
    setLoading(true);
    setError('');
    inventarioService.stockMp()
      .then(setStock)
      .catch(e => setError(e.message ?? 'Error al cargar el stock'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Stock de Materias Primas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Stock actual por bodega · {stock.length} MP activas
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Buscador */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar materia prima…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
              style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stock.filter(mp => mp.nombre.toLowerCase().includes(search.toLowerCase())).map(mp => (
            <div key={mp.materia_prima_id}
              className={`rounded-xl p-5 border-2 shadow-sm transition-all hover:shadow-md ${
                mp.bajo_reorden ? 'border-red-200 bg-red-50' : 'border-black/5'
              }`}
              style={mp.bajo_reorden ? {} : { background: 'var(--bg-left)' }}>

              {/* Encabezado */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: mp.bajo_reorden ? '#dc2626' : 'var(--primary)' }}>
                    {mp.bajo_reorden
                      ? <AlertTriangle size={14} color="white" />
                      : <Scale size={14} color="white" />}
                  </div>
                  <div>
                    <p className="font-black text-sm leading-tight" style={{ color: 'var(--text-main)' }}>
                      {mp.nombre}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {mp.unidad_medida}
                    </p>
                  </div>
                </div>
                {mp.bajo_reorden && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white">
                    Bajo reorden
                  </span>
                )}
              </div>

              {/* Stock total */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>
                  {formatCantidad(mp.stock_total, mp.unidad_medida)}
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  totales
                </span>
              </div>

              {/* Punto de reorden */}
              <div className="flex items-center justify-between text-xs mb-3">
                <span style={{ color: 'var(--text-muted)' }}>Punto de reorden:</span>
                <span className="font-black" style={{ color: 'var(--text-main)' }}>
                  {formatCantidad(mp.punto_reorden, mp.unidad_medida)}
                </span>
              </div>

              {/* Por bodega */}
              {mp.por_bodega.length > 0 && (
                <div className="space-y-1.5 border-t border-black/5 pt-3">
                  {mp.por_bodega.map(b => (
                    <div key={b.bodega_id} className="flex items-center justify-between text-xs">
                      <span className="font-bold truncate max-w-[60%]" style={{ color: 'var(--text-muted)' }}>
                        {b.bodega}
                      </span>
                      <div className="text-right">
                        <span className="font-black" style={{ color: 'var(--text-main)' }}>
                          {formatCantidad(b.stock, mp.unidad_medida)}
                        </span>
                        {b.proximo_vencimiento && (
                          <p className="text-[9px] text-orange-500 font-bold">
                            Vence: {b.proximo_vencimiento}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
