'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw, ShoppingBag, Package, Search, ChevronDown,
} from 'lucide-react';
import { reportesService } from '@/services/reportes.service';
import { formatCantidad } from '@/lib/utils';

/* ─── tipos ──────────────────────────────────────────────────────────── */

interface LotePt {
  lote_id: number;
  producto_terminado: string;
  unidad_medida: string;
  bodega: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  fecha_produccion: string;
  orden_produccion_id: number;
}

interface ResumenPt {
  producto_terminado: string;
  stock_total: number;
  lotes_activos: number;
}

interface StockPtResponse {
  total_lotes: number;
  por_producto: ResumenPt[];
  detalle: LotePt[];
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

function diasDesde(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  // Append T12:00:00 to treat date-only strings as local noon, avoiding UTC timezone shift
  const f   = new Date(fecha.length === 10 ? fecha + 'T12:00:00' : fecha);
  f.setHours(0, 0, 0, 0);
  return Math.floor((hoy.getTime() - f.getTime()) / 86_400_000);
}

/* ─── página ──────────────────────────────────────────────────────────── */

export default function StockPtPage() {
  const [lotes,      setLotes]      = useState<LotePt[]>([]);
  const [resumen,    setResumen]    = useState<ResumenPt[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [busqueda,   setBusqueda]   = useState('');
  const [filtroProducto, setFiltroProducto] = useState('todos');

  const cargar = () => {
    setLoading(true);
    setError('');
    reportesService.stockPt()
      .then(d => {
        const r = d as StockPtResponse;
        setLotes(r.detalle ?? []);
        setResumen(r.por_producto ?? []);
      })
      .catch(e => setError(e.message ?? 'Error al cargar stock'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const productos = useMemo(() =>
    Array.from(new Set(lotes.map(l => l.producto_terminado))).sort(),
    [lotes]);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return lotes.filter(l => {
      if (filtroProducto !== 'todos' && l.producto_terminado !== filtroProducto) return false;
      if (q && !l.producto_terminado.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lotes, busqueda, filtroProducto]);

  const stockTotal = resumen.reduce((s, r) => s + r.stock_total, 0);

  /* ─── render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Stock de Producto Terminado
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Lotes disponibles en Bodega de Ventas — listos para despacho
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 flex-shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <ShoppingBag size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-main)' }}>{lotes.length}</p>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Lotes activos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-3">
            <Package size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-main)' }}>{resumen.length}</p>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Productos distintos</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <ShoppingBag size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black leading-none tabular-nums" style={{ color: 'var(--text-main)' }}>
            {stockTotal.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
          </p>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Unidades totales</p>
        </div>
      </div>

      {/* Tarjetas de resumen por producto */}
      {resumen.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resumen.map(r => (
            <button
              key={r.producto_terminado}
              onClick={() => setFiltroProducto(filtroProducto === r.producto_terminado ? 'todos' : r.producto_terminado)}
              className={`text-left p-4 rounded-2xl border transition-all ${
                filtroProducto === r.producto_terminado
                  ? 'border-[var(--primary)] bg-[var(--bg-left)] shadow-md'
                  : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--primary)' }}>
                  <ShoppingBag size={14} className="text-white" />
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">
                  {r.lotes_activos} lote{r.lotes_activos !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="mt-2.5 text-sm font-black leading-tight" style={{ color: 'var(--text-main)' }}>
                {r.producto_terminado}
              </p>
              <p className="text-xs font-bold mt-1" style={{ color: 'var(--primary)' }}>
                {r.stock_total.toLocaleString('es-CO', { maximumFractionDigits: 1 })} unidades disponibles
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Filtros de tabla */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
          />
        </div>
        <div className="relative self-start">
          <select
            value={filtroProducto}
            onChange={e => setFiltroProducto(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[var(--primary)] font-medium text-slate-600"
          >
            <option value="todos">Todos los productos</option>
            {productos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Tabla de lotes */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="p-16 text-center">
              <ShoppingBag size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-semibold text-slate-400">No hay lotes de producto terminado disponibles.</p>
              <p className="text-xs text-slate-300 mt-1">Los lotes aparecen aquí tras el traslado desde producción a ventas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-5 py-3">Lote</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Producto Terminado</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Bodega</th>
                    <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Disponible</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Fecha producción</th>
                    <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Antigüedad</th>
                    <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">OP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtrados.map(l => {
                    const dias      = diasDesde(l.fecha_produccion);
                    const fechaFmt  = new Date(l.fecha_produccion + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: '2-digit' });
                    const antigColor = dias > 30 ? 'text-amber-600 bg-amber-50' : dias > 7 ? 'text-slate-600 bg-slate-50' : 'text-green-600 bg-green-50';

                    return (
                      <tr key={l.lote_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-bold text-slate-400">#{l.lote_id}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--bg-left)' }}>
                              <ShoppingBag size={12} style={{ color: 'var(--primary)' }} />
                            </div>
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                              {l.producto_terminado}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium text-slate-500">{l.bodega}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                            {formatCantidad(l.cantidad_actual, l.unidad_medida)}
                          </span>
                          {l.cantidad_actual < l.cantidad_inicial && (
                            <span className="block text-[10px] text-slate-400">
                              de {formatCantidad(l.cantidad_inicial, l.unidad_medida)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-600">{fechaFmt}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${antigColor}`}>
                            {dias === 0 ? 'Hoy' : `${dias}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-xs font-bold text-slate-400">#{l.orden_produccion_id}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtrados.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-50 bg-slate-50/50">
              <span className="text-xs text-slate-400">{filtrados.length} lote{filtrados.length !== 1 ? 's' : ''} mostrado{filtrados.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
