'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  RefreshCw, ChefHat, ChevronDown, ChevronRight,
  Search, Calendar, CheckCircle, Clock, Flame,
} from 'lucide-react';
import { reportesService } from '@/services/reportes.service';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Ingrediente {
  materia_prima:      string;
  unidad_medida:      string;
  cantidad_requerida: number;
}

interface LotePt {
  lote_id:          number;
  bodega:           string;
  cantidad_actual:  number;
  fecha_produccion: string;
}

interface ProduccionAudit {
  id:                   number;
  estado:               string;
  producto_terminado:   string;
  unidad_medida:        string;
  cantidad_planificada: number;
  cantidad_producida:   number | null;
  eficiencia_pct:       number | null;
  fecha_planificada:    string;
  usuario:              string;
  creada_en:            string;
  ingredientes:         Ingrediente[];
  lote_pt:              LotePt | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ESTADO_CFG: Record<string, { label: string; badge: string; dot: string }> = {
  pendiente:  { label: 'Pendiente',  badge: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  producido:  { label: 'Producido',  badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  completada: { label: 'Completada', badge: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
  anulada:    { label: 'Anulada',    badge: 'bg-red-100 text-red-700',     dot: 'bg-red-400' },
};

function fmtNum(n: number): string {
  return n % 1 === 0 ? String(n) : n.toLocaleString('es-CO', { maximumFractionDigits: 3 });
}
function fmtFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function fmtFecha(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
function hoy(): string { return new Date().toISOString().split('T')[0]; }
function hace90d(): string {
  const d = new Date(); d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function AuditoriaProduccionesPage() {
  const [data,     setData]     = useState<ProduccionAudit[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [desde,    setDesde]    = useState(hace90d());
  const [hasta,    setHasta]    = useState(hoy());
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [expand,   setExpand]   = useState<Set<number>>(new Set());
  const [detalle,  setDetalle]  = useState<Record<number, unknown>>({});

  const cargar = useCallback(() => {
    setLoading(true); setError('');
    reportesService.auditProducciones(desde, hasta)
      .then(d => setData(d as ProduccionAudit[]))
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = useMemo(() => {
    return data.filter(p => {
      const matchBusq = !busqueda || p.producto_terminado.toLowerCase().includes(busqueda.toLowerCase()) || p.usuario.toLowerCase().includes(busqueda.toLowerCase());
      const matchEst  = !filtroEstado || p.estado === filtroEstado;
      return matchBusq && matchEst;
    });
  }, [data, busqueda, filtroEstado]);

  const completadas = filtrados.filter(p => p.estado === 'completada').length;
  const totalProd   = filtrados.reduce((s, p) => s + (p.cantidad_producida ?? 0), 0);
  const totalPlan   = filtrados.reduce((s, p) => s + p.cantidad_planificada, 0);
  const eficProm    = filtrados.filter(p => p.eficiencia_pct !== null).length
    ? Math.round(filtrados.filter(p => p.eficiencia_pct !== null).reduce((s, p) => s + (p.eficiencia_pct ?? 0), 0) / filtrados.filter(p => p.eficiencia_pct !== null).length)
    : null;

  const toggle = async (id: number) => {
    setExpand(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      next.add(id);
      return next;
    });
    if (!detalle[id]) {
      try {
        const d = await reportesService.auditProduccionDetalle(id);
        setDetalle(prev => ({ ...prev, [id]: d }));
      } catch { /* silently ignore */ }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Auditoría de Producción
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Órdenes de producción — ingredientes, cantidades producidas y eficiencia real
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

      {/* Filtros */}
      <div className="rounded-xl border-2 border-black/5 p-4" style={{ background: 'var(--bg-left)' }}>
        <div className="flex flex-wrap gap-3 items-end">
          {[['Desde', desde, setDesde], ['Hasta', hasta, setHasta]].map(([label, val, setter]) => (
            <div key={String(label)} className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input type="date" value={String(val)} onChange={e => (setter as (v: string) => void)(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-lg border-2 border-black/10 text-xs focus:outline-none focus:border-[var(--primary)] transition-colors"
                  style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }} />
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Estado</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-2 rounded-lg border-2 border-black/10 text-xs font-bold focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
              <option value="">Todos</option>
              {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Producto / Usuario</label>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border-2 border-black/10 text-xs focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }} />
            </div>
          </div>
          <button onClick={cargar} disabled={loading}
            className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            Aplicar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <ChefHat size={20} style={{ color: 'var(--primary)' }} />, bg: 'bg-slate-50 border-slate-200', val: filtrados.length, label: 'Órdenes' },
              { icon: <CheckCircle size={20} className="text-green-500" />, bg: 'bg-green-50 border-green-200', val: completadas, label: 'Completadas' },
              { icon: <Flame size={20} className="text-blue-500" />, bg: 'bg-blue-50 border-blue-200', val: `${fmtNum(totalProd)} / ${fmtNum(totalPlan)}`, label: 'Prod. real / plan' },
              { icon: <Clock size={20} className={eficProm !== null && eficProm < 85 ? 'text-amber-500' : 'text-green-500'} />,
                bg: eficProm !== null && eficProm < 85 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200',
                val: eficProm !== null ? `${eficProm}%` : '—', label: 'Eficiencia prom.' },
            ].map(({ icon, bg, val, label }) => (
              <div key={label} className={`rounded-xl p-4 border-2 flex items-center gap-3 ${bg}`}>
                <div className="flex-shrink-0">{icon}</div>
                <div>
                  <p className="text-xl font-black" style={{ color: 'var(--text-main)' }}>{val}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Lista */}
          {filtrados.length === 0 ? (
            <div className="text-center py-12 text-sm rounded-xl border-2 border-dashed border-black/10" style={{ color: 'var(--text-muted)' }}>
              Sin órdenes en el período o filtro aplicado.
            </div>
          ) : (
            <div className="space-y-3">
              {filtrados.map(p => {
                const isOpen = expand.has(p.id);
                const cfg    = ESTADO_CFG[p.estado] ?? ESTADO_CFG['pendiente'];
                const det    = detalle[p.id] as Record<string, unknown> | undefined;

                return (
                  <div key={p.id} className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
                    <button
                      onClick={() => toggle(p.id)}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-black/3 transition-colors text-left"
                    >
                      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>
                            OP #{p.id} — {p.producto_terminado}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                          {p.eficiencia_pct !== null && p.eficiencia_pct < 90 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              Efic. {p.eficiencia_pct}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {fmtFecha(p.fecha_planificada)} · {p.usuario} · {p.ingredientes.length} ingrediente{p.ingredientes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="hidden md:flex flex-col items-end gap-1 text-right min-w-[120px]">
                        <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                          {p.cantidad_producida !== null ? fmtNum(p.cantidad_producida) : '—'} / {fmtNum(p.cantidad_planificada)}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.unidad_medida}</span>
                      </div>
                      <div className="flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-black/5">
                        {/* Contexto */}
                        <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-black/5 bg-slate-50/50">
                          {[
                            ['Creada', fmtFechaHora(p.creada_en)],
                            ['Responsable', p.usuario],
                            ['Planificado', `${fmtNum(p.cantidad_planificada)} ${p.unidad_medida}`],
                            ['Producido', p.cantidad_producida !== null ? `${fmtNum(p.cantidad_producida)} ${p.unidad_medida}` : '—'],
                          ].map(([k, v]) => (
                            <div key={String(k)}>
                              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{k}</p>
                              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>{v}</p>
                            </div>
                          ))}
                        </div>

                        {/* Ingredientes */}
                        <div className="px-5 py-3 border-b border-black/5">
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                            Ingredientes planificados
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {p.ingredientes.map((ing, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100" style={{ color: 'var(--text-main)' }}>
                                {ing.materia_prima} · <span className="font-black">{fmtNum(ing.cantidad_requerida)}</span> {ing.unidad_medida}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Consumo real (del detalle) */}
                        {det ? (
                          <div className="px-5 py-3 border-b border-black/5">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                              Consumo real de MP (FEFO)
                            </p>
                            {(() => {
                              const consumos = (det as { consumo_real?: Array<{materia_prima: string; unidad_medida: string; total_consumido: number; lotes_usados: number}> }).consumo_real ?? [];
                              if (consumos.length === 0) return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin movimientos registrados.</p>;
                              return (
                                <div className="flex flex-wrap gap-2">
                                  {consumos.map((c, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                      {c.materia_prima} · <span className="font-black">{fmtNum(c.total_consumido)}</span> {c.unidad_medida}
                                      <span className="ml-1 opacity-60">({c.lotes_usados} lote{c.lotes_usados !== 1 ? 's' : ''})</span>
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="px-5 py-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                            Cargando detalle...
                          </div>
                        )}

                        {/* Lote PT */}
                        {p.lote_pt && (
                          <div className="px-5 py-3 bg-green-50/40">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                              Producto terminado generado
                            </p>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                              Lote PT #{p.lote_pt.lote_id} · {p.lote_pt.bodega}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              Disponible: <span className="font-bold">{fmtNum(p.lote_pt.cantidad_actual)} {p.unidad_medida}</span>
                              · Producido el {fmtFecha(p.lote_pt.fecha_produccion)}
                            </p>
                          </div>
                        )}
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
