'use client';

import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, Search, AlertTriangle, Package, Warehouse, TrendingDown, CheckCircle2, Clock } from 'lucide-react';
import { inventarioService, type StockMp } from '@/services/inventario.service';
import { formatCantidad } from '@/lib/utils';

/* ─────────────── Tipos de estado ─────────────── */

type Estado  = 'agotado' | 'critico' | 'bajo' | 'ok';
type Filtro  = 'todos' | 'atencion' | 'ok';

const ESTADO_CONFIG: Record<Estado, {
  label: string;
  badgeCls: string;
  dotCls: string;
  barCls: string;
  accentCls: string;  // borde izquierdo de la card
  iconCls: string;
}> = {
  agotado: {
    label:     'Sin stock',
    badgeCls:  'bg-slate-100 text-slate-500 border-slate-200',
    dotCls:    'bg-slate-400',
    barCls:    'bg-slate-300',
    accentCls: 'border-l-slate-300',
    iconCls:   'bg-slate-100 text-slate-400',
  },
  critico: {
    label:     'Crítico',
    badgeCls:  'bg-red-50 text-red-600 border-red-200',
    dotCls:    'bg-red-500',
    barCls:    'bg-red-400',
    accentCls: 'border-l-red-400',
    iconCls:   'bg-red-50 text-red-500',
  },
  bajo: {
    label:     'Stock bajo',
    badgeCls:  'bg-amber-50 text-amber-700 border-amber-200',
    dotCls:    'bg-amber-400',
    barCls:    'bg-amber-400',
    accentCls: 'border-l-amber-400',
    iconCls:   'bg-amber-50 text-amber-500',
  },
  ok: {
    label:     'Saludable',
    badgeCls:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotCls:    'bg-emerald-500',
    barCls:    'bg-emerald-400',
    accentCls: 'border-l-emerald-400',
    iconCls:   'bg-emerald-50 text-emerald-600',
  },
};

function estadoOf(mp: StockMp): Estado {
  if (mp.stock_total === 0)                                           return 'agotado';
  if (mp.bajo_reorden)                                                return 'critico';
  if (mp.punto_reorden > 0 && mp.stock_total < mp.punto_reorden * 1.5) return 'bajo';
  return 'ok';
}

/** Orden de urgencia para mostrar los más críticos primero */
const URGENCIA: Record<Estado, number> = { agotado: 0, critico: 1, bajo: 2, ok: 3 };

/* ─────────────── Barra de stock ─────────────── */

function StockBar({ stock, reorden, barCls }: { stock: number; reorden: number; barCls: string }) {
  if (reorden === 0 && stock === 0) return null;
  const max        = Math.max(stock, reorden * 2.2, 1);
  const stockPct   = Math.min((stock   / max) * 100, 100);
  const reordenPct = Math.min((reorden / max) * 100, 100);

  return (
    <div className="mt-3">
      <div className="relative h-2 bg-slate-100 rounded-full overflow-visible">
        {/* Barra de stock actual */}
        <div
          className={`h-full rounded-full transition-all ${barCls}`}
          style={{ width: `${stockPct}%` }}
        />
        {/* Marcador de punto de reorden */}
        {reorden > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-[2px] h-4 bg-slate-400 rounded-full"
            style={{ left: `${reordenPct}%` }}
            title={`Punto de reorden`}
          />
        )}
      </div>
      {reorden > 0 && (
        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-slate-400">
            mínimo: <span className="font-semibold text-slate-500">{reordenPct.toFixed(0)}%</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Card de MP ─────────────── */

function MpCard({ mp }: { mp: StockMp }) {
  const estado  = estadoOf(mp);
  const cfg     = ESTADO_CONFIG[estado];

  // ¿Algún lote vence pronto? (dentro de 60 días)
  const hoy         = new Date();
  const prontoVencer = mp.por_bodega.some(b => {
    if (!b.proximo_vencimiento) return false;
    const diff = (new Date(b.proximo_vencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 60;
  });

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${cfg.accentCls} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>

      {/* Cabecera de la card */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.iconCls}`}>
              {estado === 'agotado' || estado === 'critico'
                ? <AlertTriangle size={14} />
                : <Package size={14} />}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm leading-tight truncate">{mp.nombre}</p>
              <span className="inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-semibold bg-slate-100 text-slate-500 uppercase tracking-wide">
                {mp.unidad_medida}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.badgeCls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
              {cfg.label}
            </span>
            {prontoVencer && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-semibold text-orange-600">
                <Clock size={9} />
                Vence pronto
              </span>
            )}
          </div>
        </div>

        {/* Stock actual */}
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Stock actual</p>
          <p className="text-2xl font-black tabular-nums text-slate-800 leading-none">
            {formatCantidad(mp.stock_total, mp.unidad_medida)}
          </p>
        </div>

        {/* Barra visual */}
        <StockBar stock={mp.stock_total} reorden={mp.punto_reorden} barCls={cfg.barCls} />

        {/* Punto de reorden */}
        {mp.punto_reorden > 0 && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <TrendingDown size={11} />
              Reorden si baja de
            </span>
            <span className="text-[11px] font-semibold text-slate-600">
              {formatCantidad(mp.punto_reorden, mp.unidad_medida)}
            </span>
          </div>
        )}
      </div>

      {/* Desglose por bodega */}
      {mp.por_bodega.length > 0 && (
        <div className="border-t border-slate-50 px-5 py-3 space-y-2 bg-slate-50/40">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
            <Warehouse size={10} />
            Por bodega
          </p>
          {mp.por_bodega.map(b => {
            const venceProxmo = b.proximo_vencimiento
              ? (new Date(b.proximo_vencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24) <= 60
              : false;
            return (
              <div key={b.bodega_id} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                  <span className="text-xs text-slate-500 truncate max-w-[140px]">{b.bodega}</span>
                  <span className="text-[10px] text-slate-400">· {b.lotes_activos} lote{b.lotes_activos !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-700 tabular-nums">
                    {formatCantidad(b.stock, mp.unidad_medida)}
                  </p>
                  {b.proximo_vencimiento && (
                    <p className={`text-[10px] font-medium ${venceProxmo ? 'text-orange-500' : 'text-slate-400'}`}>
                      {venceProxmo ? '⚠ ' : ''}Vence {b.proximo_vencimiento}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Página principal ─────────────── */

export default function StockMpPage() {
  const [stock,   setStock]   = useState<StockMp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [filtro,  setFiltro]  = useState<Filtro>('todos');

  const cargar = () => {
    setLoading(true);
    setError('');
    inventarioService.stockMp()
      .then(setStock)
      .catch(e => setError(e.message ?? 'Error al cargar el stock'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  // Clasificar cada MP
  const clasificado = useMemo(() =>
    stock.map(mp => ({ mp, estado: estadoOf(mp) })),
    [stock]
  );

  // KPIs
  const kpis = useMemo(() => ({
    total:    stock.length,
    agotados: clasificado.filter(x => x.estado === 'agotado').length,
    criticos: clasificado.filter(x => x.estado === 'critico').length,
    bajos:    clasificado.filter(x => x.estado === 'bajo').length,
    ok:       clasificado.filter(x => x.estado === 'ok').length,
    prontoVencer: stock.filter(mp =>
      mp.por_bodega.some(b => {
        if (!b.proximo_vencimiento) return false;
        const diff = (new Date(b.proximo_vencimiento).getTime() - Date.now()) / 86400000;
        return diff <= 60;
      })
    ).length,
  }), [clasificado, stock]);

  // Items filtrados y ordenados por urgencia
  const visibles = useMemo(() => {
    const porBusqueda = clasificado.filter(({ mp }) =>
      mp.nombre.toLowerCase().includes(search.toLowerCase())
    );
    const porFiltro = porBusqueda.filter(({ estado }) => {
      if (filtro === 'atencion') return estado === 'agotado' || estado === 'critico' || estado === 'bajo';
      if (filtro === 'ok')       return estado === 'ok';
      return true;
    });
    return [...porFiltro].sort((a, b) => URGENCIA[a.estado] - URGENCIA[b.estado]);
  }, [clasificado, search, filtro]);

  const hayAtencion = kpis.agotados + kpis.criticos + kpis.bajos;

  return (
    <div className="space-y-6">

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Inventario de Materias Primas
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Stock en tiempo real · {stock.length} MP activas
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── KPIs ── */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-slate-400" />
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total</p>
            </div>
            <p className="text-2xl font-black text-slate-700 tabular-nums">{kpis.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{kpis.ok} saludables</p>
          </div>

          <div className={`rounded-2xl border px-4 py-3.5 shadow-sm ${hayAtencion > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className={hayAtencion > 0 ? 'text-red-500' : 'text-slate-400'} />
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${hayAtencion > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                Requieren atención
              </p>
            </div>
            <p className={`text-2xl font-black tabular-nums ${hayAtencion > 0 ? 'text-red-600' : 'text-slate-700'}`}>
              {hayAtencion}
            </p>
            <p className={`text-[11px] mt-0.5 ${hayAtencion > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {kpis.agotados} agotados · {kpis.criticos} críticos
            </p>
          </div>

          <div className={`rounded-2xl border px-4 py-3.5 shadow-sm ${kpis.bajos > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className={kpis.bajos > 0 ? 'text-amber-500' : 'text-slate-400'} />
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${kpis.bajos > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                Stock bajo
              </p>
            </div>
            <p className={`text-2xl font-black tabular-nums ${kpis.bajos > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
              {kpis.bajos}
            </p>
            <p className={`text-[11px] mt-0.5 ${kpis.bajos > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
              entre 1× y 1,5× el mínimo
            </p>
          </div>

          <div className={`rounded-2xl border px-4 py-3.5 shadow-sm ${kpis.prontoVencer > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className={kpis.prontoVencer > 0 ? 'text-orange-500' : 'text-slate-400'} />
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${kpis.prontoVencer > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                Vencen pronto
              </p>
            </div>
            <p className={`text-2xl font-black tabular-nums ${kpis.prontoVencer > 0 ? 'text-orange-700' : 'text-slate-700'}`}>
              {kpis.prontoVencer}
            </p>
            <p className={`text-[11px] mt-0.5 ${kpis.prontoVencer > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
              lotes en los próximos 60 días
            </p>
          </div>

        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Cargando ── */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* ── Filtros + búsqueda ── */}
      {!loading && !error && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Tabs de filtro */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {([
              { key: 'todos',    label: `Todos (${kpis.total})`,           urgent: false },
              { key: 'atencion', label: `Con alerta (${hayAtencion})`,     urgent: hayAtencion > 0 },
              { key: 'ok',       label: `Saludables (${kpis.ok})`,         urgent: false },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFiltro(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtro === tab.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : tab.urgent
                      ? 'text-red-500 hover:bg-red-50'
                      : 'text-slate-500 hover:bg-white/60'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar materia prima…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-slate-300 transition-colors"
            />
          </div>

          <p className="text-xs text-slate-400 sm:ml-auto">
            Mostrando {visibles.length} de {stock.length}
          </p>
        </div>
      )}

      {/* ── Grid de cards ── */}
      {!loading && !error && (
        <>
          {visibles.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <Package size={20} className="text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">
                {search ? 'Sin resultados para esa búsqueda.' : 'No hay datos de inventario.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibles.map(({ mp }) => (
                <MpCard key={mp.materia_prima_id} mp={mp} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
