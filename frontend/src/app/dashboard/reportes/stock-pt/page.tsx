'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw, ShoppingBag, Package, Warehouse,
  Clock, TrendingDown, ChevronDown, ChevronRight, Search,
} from 'lucide-react';
import { reportesService } from '@/services/reportes.service';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface LotePt {
  lote_id:             number;
  producto_terminado:  string;
  bodega:              string;
  cantidad_inicial:    number;
  cantidad_actual:     number;
  unidad_medida:       string;
  fecha_produccion:    string;
  orden_produccion_id: number;
}

interface PorProducto {
  producto_terminado: string;
  stock_total:        number;
  lotes_activos:      number;
}

interface StockPtResponse {
  total_lotes:  number;
  por_producto: PorProducto[];
  detalle:      LotePt[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function diasDesde(fecha: string): number {
  const d = new Date(fecha + 'T12:00:00');
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function edadConfig(dias: number): { label: string; badge: string; row: string; dot: string } {
  if (dias <= 7)  return { label: 'Fresco',    badge: 'bg-green-100 text-green-700',  row: 'border-l-green-400',  dot: 'bg-green-400' };
  if (dias <= 30) return { label: 'Normal',    badge: 'bg-amber-100 text-amber-700',  row: 'border-l-amber-400',  dot: 'bg-amber-400' };
  return              { label: 'Antiguo',   badge: 'bg-red-100   text-red-700',    row: 'border-l-red-400',    dot: 'bg-red-500'   };
}

function fmtNum(n: number): string {
  return n % 1 === 0 ? String(n) : n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

function fmtFecha(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function StockPtPage() {
  const [data,     setData]     = useState<StockPtResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [expand,   setExpand]   = useState<Set<string>>(new Set());

  const cargar = () => {
    setLoading(true); setError('');
    reportesService.stockPt()
      .then(d => setData(d as StockPtResponse))
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const lotes      = data?.detalle      ?? [];
  const porProducto = data?.por_producto ?? [];

  // Agrupar lotes por producto
  const grupos = useMemo(() => {
    const filtrados = busqueda
      ? lotes.filter(l => l.producto_terminado.toLowerCase().includes(busqueda.toLowerCase()))
      : lotes;

    const map = new Map<string, LotePt[]>();
    filtrados.forEach(l => {
      const key = l.producto_terminado;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return map;
  }, [lotes, busqueda]);

  // KPIs
  const totalUnidades   = lotes.reduce((s, l) => s + l.cantidad_actual, 0);
  const productosUnicos = new Set(lotes.map(l => l.producto_terminado)).size;
  const diasProm        = lotes.length
    ? Math.round(lotes.reduce((s, l) => s + diasDesde(l.fecha_produccion), 0) / lotes.length)
    : 0;
  const lotesAntonticos = lotes.filter(l => diasDesde(l.fecha_produccion) > 30).length;

  const toggleExpand = (prod: string) =>
    setExpand(prev => {
      const next = new Set(prev);
      next.has(prod) ? next.delete(prod) : next.add(prod);
      return next;
    });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Stock de Producto Terminado
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Bodega Ventas — disponible para despacho · {lotes.length} lote{lotes.length !== 1 ? 's' : ''} · {productosUnicos} producto{productosUnicos !== 1 ? 's' : ''}
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Package size={20} className="text-blue-500" />,   bg: 'bg-blue-50 border-blue-200',   val: lotes.length,                label: 'Lotes activos'       },
              { icon: <ShoppingBag size={20} className="text-green-500" />, bg: 'bg-green-50 border-green-200', val: fmtNum(totalUnidades),        label: 'Unidades totales'    },
              { icon: <Warehouse size={20} style={{ color: 'var(--primary)' }} />, bg: 'bg-slate-50 border-slate-200',   val: productosUnicos,              label: 'Productos distintos' },
              {
                icon: <Clock size={20} className={lotesAntonticos > 0 ? 'text-red-500' : 'text-amber-500'} />,
                bg: lotesAntonticos > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200',
                val: `${diasProm}d`,
                label: lotesAntonticos > 0 ? `${lotesAntonticos} lote(s) >30d` : 'Antigüedad prom.',
              },
            ].map(({ icon, bg, val, label }) => (
              <div key={label} className={`rounded-xl p-5 border-2 flex items-center gap-4 ${bg}`}>
                <div className="flex-shrink-0">{icon}</div>
                <div>
                  <p className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{val}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Fresco (0–7 días)',   color: 'bg-green-400' },
              { label: 'Normal (8–30 días)',   color: 'bg-amber-400' },
              { label: 'Antiguo (>30 días)',   color: 'bg-red-400'   },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
                {label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <TrendingDown size={12} className="text-slate-400" />
              Barra = % consumido del lote
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }}
            />
          </div>

          {/* Resumen por producto (colapsable) */}
          {grupos.size === 0 ? (
            <div className="text-center py-12 text-sm rounded-xl border-2 border-dashed border-black/10" style={{ color: 'var(--text-muted)' }}>
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay lotes de producto terminado en Bodega Ventas.'}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(grupos.entries()).map(([producto, lotesGrupo]) => {
                const totalGrupo    = lotesGrupo.reduce((s, l) => s + l.cantidad_actual, 0);
                const resumen       = porProducto.find(p => p.producto_terminado === producto);
                const unidad        = lotesGrupo[0].unidad_medida;
                const diasMin       = Math.min(...lotesGrupo.map(l => diasDesde(l.fecha_produccion)));
                const edadGrupo     = edadConfig(diasMin);
                const isOpen        = expand.has(producto);
                const hayAntiguos   = lotesGrupo.some(l => diasDesde(l.fecha_produccion) > 30);

                return (
                  <div key={producto} className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>

                    {/* Cabecera del grupo — clic para expandir */}
                    <button
                      onClick={() => toggleExpand(producto)}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-black/3 transition-colors text-left"
                    >
                      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${edadGrupo.dot}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-base" style={{ color: 'var(--text-main)' }}>{producto}</p>
                          {hayAntiguos && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                              Revisar
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {lotesGrupo.length} lote{lotesGrupo.length !== 1 ? 's' : ''} · {fmtNum(totalGrupo)} {unidad} disponibles
                        </p>
                      </div>

                      {/* Barra de stock por producto */}
                      {resumen && resumen.stock_total > 0 && (
                        <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
                          <p className="text-xs font-black" style={{ color: 'var(--text-main)' }}>
                            {fmtNum(totalGrupo)} <span className="font-normal text-[10px]">{unidad}</span>
                          </p>
                          <div className="w-24 h-1.5 rounded-full bg-black/10">
                            <div
                              className="h-1.5 rounded-full bg-blue-500 transition-all"
                              style={{ width: `${Math.min((totalGrupo / resumen.stock_total) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </button>

                    {/* Detalle de lotes */}
                    {isOpen && (
                      <div className="border-t border-black/5">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-black/5">
                              {['Lote', 'Bodega', 'Stock actual', 'Consumido', 'Producido', 'Antigüedad', 'OP'].map(h => (
                                <th key={h} className="text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {lotesGrupo
                              .sort((a, b) => diasDesde(b.fecha_produccion) - diasDesde(a.fecha_produccion))
                              .map(l => {
                                const dias   = diasDesde(l.fecha_produccion);
                                const edad   = edadConfig(dias);
                                const pctCon = l.cantidad_inicial > 0
                                  ? Math.round(((l.cantidad_inicial - l.cantidad_actual) / l.cantidad_inicial) * 100)
                                  : 0;

                                return (
                                  <tr key={l.lote_id} className={`border-b border-black/5 border-l-4 ${edad.row} hover:bg-black/2 transition-colors`}>
                                    <td className="px-5 py-3 font-black text-xs" style={{ color: 'var(--text-muted)' }}>#{l.lote_id}</td>
                                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{l.bodega}</td>
                                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>
                                      {fmtNum(l.cantidad_actual)}
                                      <span className="ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.unidad_medida}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 rounded-full bg-black/10">
                                          <div className="h-1.5 rounded-full bg-slate-400 transition-all" style={{ width: `${pctCon}%` }} />
                                        </div>
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pctCon}%</span>
                                      </div>
                                    </td>
                                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{fmtFecha(l.fecha_produccion)}</td>
                                    <td className="px-5 py-3">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${edad.badge}`}>
                                        {dias}d — {edad.label}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>#{l.orden_produccion_id}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
