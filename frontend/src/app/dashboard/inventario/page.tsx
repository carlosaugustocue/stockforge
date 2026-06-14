'use client';

import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, Search, AlertTriangle, Package, Warehouse, TrendingDown, CheckCircle2, Clock, ShoppingCart, Plus, X } from 'lucide-react';
import { inventarioService, type StockMp } from '@/services/inventario.service';
import { proveedoresService, type Proveedor } from '@/services/proveedores.service';
import { recepcionesService } from '@/services/recepciones.service';
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

interface PedidoItem {
  materia_prima_id: number;
  nombre: string;
  unidad: string;
  stock_actual: number;
  punto_reorden: number;
  cantidad: string;
}

function cantidadSugerida(mp: StockMp): number {
  if (mp.punto_reorden > 0) return Math.max(Math.ceil(mp.punto_reorden * 2 - mp.stock_total), mp.punto_reorden);
  return mp.stock_total === 0 ? 10 : 5;
}

function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

function MpCard({ mp, onPedir }: { mp: StockMp; onPedir: (mp: StockMp) => void }) {
  const estado  = estadoOf(mp);
  const cfg     = ESTADO_CONFIG[estado];

  // ¿Algún lote vence pronto? (dentro de 60 días)
  const hoy         = new Date();
  const prontoVencer = mp.por_bodega.some(b => {
    if (!b.proximo_vencimiento) return false;
    const diff = (new Date(b.proximo_vencimiento + 'T12:00:00').getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
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

      {/* Botón pedir */}
      <div className="px-5 pb-3 pt-1">
        <button
          onClick={() => onPedir(mp)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <ShoppingCart size={12} />
          Hacer pedido
        </button>
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
              ? (new Date(b.proximo_vencimiento + 'T12:00:00').getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24) <= 60
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
  const [stock,      setStock]      = useState<StockMp[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [filtro,     setFiltro]     = useState<Filtro>('todos');

  /* ── estado modal pedido ── */
  const [modalPedir,     setModalPedir]     = useState(false);
  const [pedidoItems,    setPedidoItems]    = useState<PedidoItem[]>([]);
  const [pedidoProvId,   setPedidoProvId]   = useState<number | ''>('');
  const [pedidoFecha,    setPedidoFecha]    = useState('');
  const [pedidoObs,      setPedidoObs]      = useState('');
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [msgPedido,      setMsgPedido]      = useState('');
  const [addMpId,        setAddMpId]        = useState('');

  const cargar = () => {
    setLoading(true);
    setError('');
    Promise.all([inventarioService.stockMp(), proveedoresService.listar()])
      .then(([s, p]) => { setStock(s); setProveedores(p); })
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
        const diff = (new Date(b.proximo_vencimiento + 'T12:00:00').getTime() - Date.now()) / 86400000;
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

  /* ── handlers pedido ── */
  const abrirPedir = (mp: StockMp) => {
    const prov = proveedores.find(p => p.materias_primas.some(m => m.id === mp.materia_prima_id));
    setPedidoItems([{
      materia_prima_id: mp.materia_prima_id,
      nombre:           mp.nombre,
      unidad:           mp.unidad_medida,
      stock_actual:     mp.stock_total,
      punto_reorden:    mp.punto_reorden,
      cantidad:         String(cantidadSugerida(mp)),
    }]);
    setPedidoProvId(prov?.id ?? '');
    setPedidoFecha(localDateStr(5));
    setPedidoObs('');
    setMsgPedido('');
    setAddMpId('');
    setModalPedir(true);
  };

  const abrirPedirNuevo = () => {
    setPedidoItems([]);
    setPedidoProvId('');
    setPedidoFecha(localDateStr(5));
    setPedidoObs('');
    setMsgPedido('');
    setAddMpId('');
    setModalPedir(true);
  };

  const agregarMpAlPedido = () => {
    if (!addMpId) return;
    const mp = stock.find(s => s.materia_prima_id === parseInt(addMpId));
    if (!mp || pedidoItems.some(i => i.materia_prima_id === mp.materia_prima_id)) return;
    setPedidoItems(prev => [...prev, {
      materia_prima_id: mp.materia_prima_id,
      nombre:           mp.nombre,
      unidad:           mp.unidad_medida,
      stock_actual:     mp.stock_total,
      punto_reorden:    mp.punto_reorden,
      cantidad:         String(cantidadSugerida(mp)),
    }]);
    setAddMpId('');
  };

  const handleEnviarPedido = async () => {
    if (!pedidoProvId || pedidoItems.length === 0) return;
    setEnviandoPedido(true);
    setMsgPedido('');
    try {
      await recepcionesService.crearOrden({
        proveedor_id:   pedidoProvId as number,
        fecha_esperada: pedidoFecha || undefined,
        observaciones:  pedidoObs   || undefined,
        items: pedidoItems
          .map(i => ({ materia_prima_id: i.materia_prima_id, cantidad_solicitada: parseFloat(i.cantidad) || 0 }))
          .filter(i => i.cantidad_solicitada > 0),
      });
      setMsgPedido('ok');
      setTimeout(() => setModalPedir(false), 1800);
    } catch (e: unknown) {
      setMsgPedido((e as Error).message ?? 'Error al crear la orden');
    } finally {
      setEnviandoPedido(false);
    }
  };

  /* MPs disponibles para agregar (no están ya en el pedido) */
  const mpDisponiblesParaAgregar = stock.filter(
    s => !pedidoItems.some(i => i.materia_prima_id === s.materia_prima_id)
  );

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
        <div className="flex items-center gap-2">
          <button
            onClick={abrirPedirNuevo}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ background: 'var(--primary)' }}
          >
            <ShoppingCart size={13} />
            Nueva orden de compra
          </button>
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
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
                <MpCard key={mp.materia_prima_id} mp={mp} onPedir={abrirPedir} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modal orden de compra ── */}
      {modalPedir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* Cabecera */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                  <ShoppingCart size={15} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800">Nueva orden de compra</h2>
                  <p className="text-xs text-slate-400">Se enviará a Recepciones para seguimiento</p>
                </div>
              </div>
              <button onClick={() => setModalPedir(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

              {/* Proveedor */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Proveedor <span className="text-red-500">*</span>
                </label>
                <select
                  value={pedidoProvId}
                  onChange={e => setPedidoProvId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)] bg-white"
                >
                  <option value="">— Seleccionar proveedor —</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Fecha esperada */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Fecha esperada de entrega
                </label>
                <input
                  type="date"
                  value={pedidoFecha}
                  onChange={e => setPedidoFecha(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Items */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                  Materias primas a pedir <span className="text-red-500">*</span>
                </label>

                {pedidoItems.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    Agrega al menos una materia prima
                  </p>
                )}

                <div className="space-y-2">
                  {pedidoItems.map((item, idx) => (
                    <div key={item.materia_prima_id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.nombre}</p>
                        <p className="text-[11px] text-slate-400">
                          Stock: {formatCantidad(item.stock_actual, item.unidad)}
                          {item.punto_reorden > 0 && <> · Mínimo: {formatCantidad(item.punto_reorden, item.unidad)}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.cantidad}
                          onChange={e => {
                            const next = [...pedidoItems];
                            next[idx] = { ...next[idx], cantidad: e.target.value };
                            setPedidoItems(next);
                          }}
                          className="w-20 px-2 py-1.5 text-sm text-right border-2 border-black/10 rounded-lg focus:outline-none focus:border-[var(--primary)]"
                        />
                        <span className="text-xs text-slate-400 w-8">{item.unidad}</span>
                        <button
                          onClick={() => setPedidoItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agregar MP */}
                {mpDisponiblesParaAgregar.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    <select
                      value={addMpId}
                      onChange={e => setAddMpId(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border-2 border-dashed border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)] bg-white text-slate-500"
                    >
                      <option value="">+ Agregar otra materia prima…</option>
                      {mpDisponiblesParaAgregar.map(mp => (
                        <option key={mp.materia_prima_id} value={mp.materia_prima_id}>
                          {mp.nombre} (stock: {formatCantidad(mp.stock_total, mp.unidad_medida)})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={agregarMpAlPedido}
                      disabled={!addMpId}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-colors"
                      style={{ background: 'var(--primary)' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={pedidoObs}
                  onChange={e => setPedidoObs(e.target.value)}
                  placeholder="Notas adicionales para el proveedor…"
                  className="w-full px-3 py-2 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              {/* Feedback */}
              {msgPedido && msgPedido !== 'ok' && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {msgPedido}
                </div>
              )}
              {msgPedido === 'ok' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">
                  ✓ Orden creada correctamente. Ve a Recepciones para seguirla.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => setModalPedir(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarPedido}
                disabled={enviandoPedido || !pedidoProvId || pedidoItems.length === 0 || msgPedido === 'ok'}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-colors"
                style={{ background: 'var(--primary)' }}
              >
                {enviandoPedido ? <RefreshCw size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                Crear orden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
