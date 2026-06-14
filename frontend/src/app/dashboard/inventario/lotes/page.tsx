'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw, Package, AlertTriangle, Clock,
  Search, CheckCircle, XCircle, ChevronDown,
} from 'lucide-react';
import { inventarioService, type LoteMp } from '@/services/inventario.service';
import { formatCantidad } from '@/lib/utils';

/* ─── helpers ─────────────────────────────────────────────────────────── */

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const f   = new Date(fecha); f.setHours(0, 0, 0, 0);
  return Math.ceil((f.getTime() - hoy.getTime()) / 86_400_000);
}

type EstadoLote = 'vencido' | 'critico' | 'proximo' | 'ok';

function estadoLote(fecha: string | null): EstadoLote {
  const d = diasHasta(fecha);
  if (d === null) return 'ok';
  if (d < 0)   return 'vencido';
  if (d <= 7)  return 'critico';
  if (d <= 30) return 'proximo';
  return 'ok';
}

const ESTADO_STYLE: Record<EstadoLote, { badge: string; row: string; label: string }> = {
  vencido: { badge: 'bg-red-100 text-red-700 border border-red-200',     row: 'bg-red-50/50',    label: 'Vencido'   },
  critico: { badge: 'bg-red-100 text-red-700 border border-red-200',     row: 'bg-red-50/30',    label: '≤ 7 días'  },
  proximo: { badge: 'bg-amber-100 text-amber-700 border border-amber-200', row: 'bg-amber-50/20', label: '≤ 30 días' },
  ok:      { badge: 'bg-green-100 text-green-700 border border-green-200', row: '',               label: 'OK'        },
};

function BarraConsumo({ inicial, actual }: { inicial: number; actual: number }) {
  const pct = inicial > 0 ? Math.min(100, (actual / inicial) * 100) : 0;
  const color = pct > 50 ? 'bg-green-400' : pct > 20 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-slate-400 w-8 text-right">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

/* ─── filtros ─────────────────────────────────────────────────────────── */

const FILTROS_ESTADO = [
  { key: 'todos',   label: 'Todos'      },
  { key: 'vencido', label: 'Vencidos'   },
  { key: 'critico', label: '≤ 7 días'  },
  { key: 'proximo', label: '≤ 30 días' },
  { key: 'ok',      label: 'OK'         },
] as const;

/* ─── página ──────────────────────────────────────────────────────────── */

export default function LotesMpPage() {
  const [lotes,   setLotes]   = useState<LoteMp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [busqueda,      setBusqueda]      = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState<string>('todos');
  const [filtroBodega,  setFiltroBodega]  = useState<string>('todas');

  const cargar = () => {
    setLoading(true);
    setError('');
    inventarioService.lotesMp()
      .then(setLotes)
      .catch(e => setError(e.message ?? 'Error al cargar lotes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  /* opciones de bodega únicas */
  const bodegas = useMemo(() =>
    Array.from(new Set(lotes.map(l => l.bodega))).sort(),
    [lotes]);

  /* lotes filtrados */
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return lotes.filter(l => {
      if (q && !l.materia_prima.toLowerCase().includes(q) && !l.bodega.toLowerCase().includes(q)) return false;
      if (filtroBodega !== 'todas' && l.bodega !== filtroBodega) return false;
      if (filtroEstado !== 'todos' && estadoLote(l.fecha_vencimiento) !== filtroEstado) return false;
      return true;
    });
  }, [lotes, busqueda, filtroEstado, filtroBodega]);

  /* KPIs */
  const vencidos  = lotes.filter(l => estadoLote(l.fecha_vencimiento) === 'vencido').length;
  const criticos  = lotes.filter(l => estadoLote(l.fecha_vencimiento) === 'critico').length;
  const proximos  = lotes.filter(l => estadoLote(l.fecha_vencimiento) === 'proximo').length;

  /* ─── render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Lotes de Materia Prima
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {lotes.length} lote{lotes.length !== 1 ? 's' : ''} activo{lotes.length !== 1 ? 's' : ''} — ordenados por vencimiento (FEFO)
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

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total lotes',    value: lotes.length, Icon: Package,       color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Vencidos',       value: vencidos,     Icon: XCircle,       color: 'text-red-600',   bg: 'bg-red-50'    },
          { label: 'Críticos ≤7d',   value: criticos,     Icon: AlertTriangle, color: 'text-red-500',   bg: 'bg-red-50'    },
          { label: 'Próximos ≤30d',  value: proximos,     Icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50'  },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
              <kpi.Icon size={18} className={kpi.color} />
            </div>
            <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-main)' }}>{kpi.value}</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Leyenda FEFO */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
        <CheckCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 font-medium">
          <strong>Orden FEFO:</strong> los lotes están ordenados por fecha de vencimiento (el que vence primero aparece primero). Use siempre el primero de la lista para evitar pérdidas.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar MP o bodega..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
          />
        </div>

        {/* Filtro estado */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 self-start">
          {FILTROS_ESTADO.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                filtroEstado === f.key ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={filtroEstado === f.key ? { background: 'var(--primary)' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Filtro bodega */}
        <div className="relative self-start">
          <select
            value={filtroBodega}
            onChange={e => setFiltroBodega(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[var(--primary)] font-medium text-slate-600"
          >
            <option value="todas">Todas las bodegas</option>
            {bodegas.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="p-16 text-center">
              <Package size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-semibold text-slate-400">Sin lotes que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-5 py-3">Lote</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Materia Prima</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Bodega</th>
                    <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Stock actual</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3 min-w-[140px]">Consumo</th>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Vencimiento</th>
                    <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtrados.map((lote, idx) => {
                    const estado   = estadoLote(lote.fecha_vencimiento);
                    const estilos  = ESTADO_STYLE[estado];
                    const dias     = diasHasta(lote.fecha_vencimiento);
                    const fechaFmt = lote.fecha_vencimiento
                      ? new Date(lote.fecha_vencimiento).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: '2-digit' })
                      : null;

                    return (
                      <tr key={lote.lote_id} className={`transition-colors hover:bg-slate-50/70 ${estilos.row}`}>
                        {/* Posición FEFO + ID */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-400">#{lote.lote_id}</span>
                          </div>
                        </td>

                        {/* MP */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                            {lote.materia_prima}
                          </span>
                        </td>

                        {/* Bodega */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium text-slate-500">{lote.bodega}</span>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                            {formatCantidad(lote.cantidad_actual, lote.unidad_medida)}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            de {formatCantidad(lote.cantidad_inicial, lote.unidad_medida)}
                          </span>
                        </td>

                        {/* Barra de consumo */}
                        <td className="px-4 py-3.5">
                          <BarraConsumo inicial={lote.cantidad_inicial} actual={lote.cantidad_actual} />
                        </td>

                        {/* Vencimiento */}
                        <td className="px-4 py-3.5">
                          {fechaFmt ? (
                            <div>
                              <span className="text-sm font-semibold text-slate-600">{fechaFmt}</span>
                              {dias !== null && (
                                <span className="block text-[10px] text-slate-400">
                                  {dias < 0 ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoy' : `${dias} días`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-sm">Sin fecha</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${estilos.badge}`}>
                            {estado === 'ok' ? '✓ ' : ''}{estilos.label}
                          </span>
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
