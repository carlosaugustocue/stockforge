'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw, Warehouse, Package, AlertTriangle,
  Clock, Search, ChevronDown, ChevronUp,
} from 'lucide-react';
import { catalogoService, type Bodega } from '@/services/catalogo.service';
import { inventarioService, type StockMp } from '@/services/inventario.service';
import { formatCantidad } from '@/lib/utils';

/* ─── tipos ──────────────────────────────────────────────────────────── */

interface ItemBodega {
  materia_prima_id: number;
  nombre: string;
  unidad_medida: string;
  stock: number;
  lotes_activos: number;
  proximo_vencimiento: string | null;
  bajo_reorden: boolean;
}

interface BodegaConStock extends Bodega {
  items: ItemBodega[];
}

/* ─── constantes visuales ─────────────────────────────────────────────── */

const TIPO_STYLE: Record<string, { border: string; badge: string; icon: string }> = {
  principal:  { border: 'border-blue-500',  badge: 'bg-blue-100 text-blue-700',   icon: 'bg-blue-500'  },
  produccion: { border: 'border-amber-500', badge: 'bg-amber-100 text-amber-700', icon: 'bg-amber-500' },
  ventas:     { border: 'border-green-500', badge: 'bg-green-100 text-green-700', icon: 'bg-green-500' },
};

const TIPO_LABEL: Record<string, string> = {
  principal:  'Principal',
  produccion: 'Producción',
  ventas:     'Ventas',
};

const TIPO_TABS = [
  { key: 'todas',      label: 'Todas'      },
  { key: 'principal',  label: 'Principal'  },
  { key: 'produccion', label: 'Producción' },
  { key: 'ventas',     label: 'Ventas'     },
];

/* ─── helpers ─────────────────────────────────────────────────────────── */

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const f   = new Date(fecha); f.setHours(0, 0, 0, 0);
  return Math.ceil((f.getTime() - hoy.getTime()) / 86_400_000);
}

function VencimientoBadge({ fecha }: { fecha: string | null }) {
  const dias = diasHasta(fecha);
  if (dias === null) return <span className="text-slate-300 text-sm">—</span>;

  const fmt = new Date(fecha!).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  if (dias < 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Vencido</span>;
  if (dias <= 7)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{fmt} · {dias}d</span>;
  if (dias <= 30)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{fmt} · {dias}d</span>;
  return <span className="text-sm text-slate-500">{fmt}</span>;
}

/* ─── página ──────────────────────────────────────────────────────────── */

export default function BodegasStockPage() {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [stock,   setStock]   = useState<StockMp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todas');
  const [busqueda,   setBusqueda]   = useState('');
  const [collapsed,  setCollapsed]  = useState<Set<number>>(new Set());

  const cargar = () => {
    setLoading(true);
    setError('');
    Promise.all([catalogoService.bodegas(), inventarioService.stockMp()])
      .then(([b, s]) => { setBodegas(b); setStock(s); })
      .catch(e => setError(e.message ?? 'Error al cargar datos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  /* cruzar bodegas x stock */
  const bodegasConStock = useMemo<BodegaConStock[]>(() => {
    return bodegas.map(b => {
      const items: ItemBodega[] = [];
      for (const mp of stock) {
        const entrada = mp.por_bodega.find(pb => pb.bodega_id === b.id);
        if (entrada && entrada.stock > 0) {
          items.push({
            materia_prima_id:    mp.materia_prima_id,
            nombre:              mp.nombre,
            unidad_medida:       mp.unidad_medida,
            stock:               entrada.stock,
            lotes_activos:       entrada.lotes_activos,
            proximo_vencimiento: entrada.proximo_vencimiento,
            bajo_reorden:        mp.bajo_reorden,
          });
        }
      }
      items.sort((a, b) => {
        if (a.bajo_reorden !== b.bajo_reorden) return a.bajo_reorden ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
      });
      return { ...b, items };
    });
  }, [bodegas, stock]);

  /* filtros */
  const filtradas = useMemo<BodegaConStock[]>(() => {
    let result = bodegasConStock;
    if (filtroTipo !== 'todas') result = result.filter(b => b.tipo === filtroTipo);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      result = result
        .map(b => ({ ...b, items: b.items.filter(i => i.nombre.toLowerCase().includes(q)) }))
        .filter(b => b.nombre.toLowerCase().includes(q) || b.items.length > 0);
    }
    return result;
  }, [bodegasConStock, filtroTipo, busqueda]);

  /* KPIs */
  const totalItems   = bodegasConStock.reduce((s, b) => s + b.items.length, 0);
  const totalAlertas = bodegasConStock.reduce((s, b) => s + b.items.filter(i => i.bajo_reorden).length, 0);
  const totalVencen  = bodegasConStock.reduce((s, b) =>
    s + b.items.filter(i => { const d = diasHasta(i.proximo_vencimiento); return d !== null && d >= 0 && d <= 30; }).length, 0);

  const toggleCollapse = (id: number) =>
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ─── render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Vista de Bodegas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Contenido actual de cada bodega — stock en tiempo real
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
        {([
          { label: 'Bodegas',        value: bodegas.length, Icon: Warehouse,     color: 'text-blue-600',  bg: 'bg-blue-50'   },
          { label: 'Items en stock', value: totalItems,     Icon: Package,       color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Bajo reorden',   value: totalAlertas,   Icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50'    },
          { label: 'Vencen ≤ 30 d', value: totalVencen,    Icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50'  },
        ] as const).map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
              <kpi.Icon size={18} className={kpi.color} />
            </div>
            <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-main)' }}>{kpi.value}</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar materia prima..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
          />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 self-start">
          {TIPO_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setFiltroTipo(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                filtroTipo === t.key ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={filtroTipo === t.key ? { background: 'var(--primary)' } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Bodegas */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtradas.map(bodega => {
            const ts          = TIPO_STYLE[bodega.tipo] ?? TIPO_STYLE.principal;
            const isCollapsed = collapsed.has(bodega.id);
            const alertas     = bodega.items.filter(i => i.bajo_reorden).length;

            return (
              <div key={bodega.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                {/* Cabecera de bodega */}
                <button
                  onClick={() => toggleCollapse(bodega.id)}
                  className={`w-full flex items-center justify-between px-6 py-4 border-l-4 ${ts.border} hover:bg-slate-50/60 transition-colors text-left`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${ts.icon} flex items-center justify-center flex-shrink-0`}>
                      <Warehouse size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black" style={{ color: 'var(--text-main)' }}>
                          {bodega.nombre}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${ts.badge}`}>
                          {TIPO_LABEL[bodega.tipo] ?? bodega.tipo}
                        </span>
                        {alertas > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700">
                            <AlertTriangle size={10} />
                            {alertas} alerta{alertas > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {bodega.descripcion && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {bodega.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {bodega.items.length} item{bodega.items.length !== 1 ? 's' : ''}
                    </span>
                    {isCollapsed
                      ? <ChevronDown size={16} className="text-slate-400" />
                      : <ChevronUp   size={16} className="text-slate-400" />}
                  </div>
                </button>

                {/* Tabla de ítems */}
                {!isCollapsed && (
                  bodega.items.length === 0 ? (
                    <div className="px-6 py-10 text-center border-t border-slate-50">
                      <Package size={32} className="mx-auto mb-2 text-slate-200" />
                      <p className="text-sm font-semibold text-slate-400">Sin stock en esta bodega</p>
                      <p className="text-xs text-slate-300 mt-0.5">No hay materias primas almacenadas aquí actualmente.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-3">
                              Materia Prima
                            </th>
                            <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">
                              Stock actual
                            </th>
                            <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">
                              Lotes
                            </th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">
                              Próx. vencimiento
                            </th>
                            <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {bodega.items.map(item => (
                            <tr
                              key={item.materia_prima_id}
                              className={`transition-colors hover:bg-slate-50/70 ${item.bajo_reorden ? 'bg-red-50/40' : ''}`}
                            >
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.bajo_reorden ? 'bg-red-500' : 'bg-green-400'}`} />
                                  <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                                    {item.nombre}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                                  {formatCantidad(item.stock, item.unidad_medida)}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-xs font-black text-slate-600">
                                  {item.lotes_activos}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <VencimientoBadge fecha={item.proximo_vencimiento} />
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {item.bajo_reorden ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                    <AlertTriangle size={10} />
                                    Bajo reorden
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                    ✓ OK
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            );
          })}

          {filtradas.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <Warehouse size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-semibold text-slate-400">No hay bodegas que coincidan con los filtros.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
