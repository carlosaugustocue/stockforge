'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  RefreshCw, PackageCheck, Calendar, ChevronDown, ChevronRight,
  Search, TrendingDown, Truck,
} from 'lucide-react';
import { reportesService } from '@/services/reportes.service';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface LoteAudit {
  lote_id:          number;
  materia_prima:    string;
  unidad_medida:    string;
  bodega:           string;
  cantidad_inicial: number;
  cantidad_actual:  number;
  consumido_pct:    number;
  fecha_vencimiento: string | null;
  fecha_ingreso:    string;
}

interface RecepcionAudit {
  id:                 number;
  registrada_en:      string;
  usuario:            string;
  observaciones:      string | null;
  proveedor:          string;
  orden_pedido:       { id: number; estado: string; fecha_esperada: string | null } | null;
  lotes:              LoteAudit[];
  total_lotes:        number;
  total_mp_unidades:  number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  return r % 1 === 0 ? r.toLocaleString('es-CO') : r.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}
function fmtFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function fmtFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
function hoy(): string { return new Date().toISOString().split('T')[0]; }
function hace60d(): string {
  const d = new Date(); d.setDate(d.getDate() - 60);
  return d.toISOString().split('T')[0];
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function AuditoriaRecepcionesPage() {
  const [data,    setData]    = useState<RecepcionAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [desde,   setDesde]   = useState(hace60d());
  const [hasta,   setHasta]   = useState(hoy());
  const [busqueda, setBusqueda] = useState('');
  const [expand,  setExpand]  = useState<Set<number>>(new Set());

  const cargar = useCallback(() => {
    setLoading(true); setError('');
    reportesService.auditRecepciones(desde, hasta)
      .then(d => setData(d as RecepcionAudit[]))
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = useMemo(() => {
    if (!busqueda) return data;
    const q = busqueda.toLowerCase();
    return data.filter(r =>
      r.proveedor.toLowerCase().includes(q) ||
      r.usuario.toLowerCase().includes(q) ||
      r.lotes.some(l => l.materia_prima.toLowerCase().includes(q))
    );
  }, [data, busqueda]);

  const totalLotes = filtrados.reduce((s, r) => s + r.total_lotes, 0);
  const totalUnid  = filtrados.reduce((s, r) => s + r.total_mp_unidades, 0);
  const proveedores = new Set(filtrados.map(r => r.proveedor)).size;

  const toggle = (id: number) =>
    setExpand(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Auditoría de Recepciones
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Trazabilidad completa de MP recibida — lotes, cantidades, proveedor y responsable
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
          {([['Desde', desde, setDesde], ['Hasta', hasta, setHasta]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input type="date" value={val} onChange={e => setter(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-lg border-2 border-black/10 text-xs focus:outline-none focus:border-[var(--primary)] transition-colors"
                  style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }} />
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Buscar proveedor / usuario / MP</label>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar..."
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
              { icon: <PackageCheck size={20} style={{ color: 'var(--primary)' }} />, bg: 'bg-slate-50 border-slate-200', val: filtrados.length, label: 'Recepciones' },
              { icon: <Truck size={20} className="text-blue-500" />, bg: 'bg-blue-50 border-blue-200', val: proveedores, label: 'Proveedores' },
              { icon: <PackageCheck size={20} className="text-green-500" />, bg: 'bg-green-50 border-green-200', val: totalLotes, label: 'Lotes creados' },
              { icon: <TrendingDown size={20} className="text-amber-500" />, bg: 'bg-amber-50 border-amber-200', val: fmtNum(totalUnid), label: 'Unidades recibidas' },
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
              {busqueda ? 'Sin resultados.' : 'No hay recepciones en el período.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtrados.map(r => {
                const isOpen = expand.has(r.id);
                return (
                  <div key={r.id} className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
                    <button
                      onClick={() => toggle(r.id)}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-black/3 transition-colors text-left"
                    >
                      <div className="w-1 h-10 rounded-full flex-shrink-0 bg-blue-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>
                            Recepción #{r.id}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            OP #{r.orden_pedido?.id}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          <span className="font-bold">{r.proveedor}</span> · {fmtFechaHora(r.registrada_en)} · {r.usuario}
                        </p>
                      </div>
                      <div className="hidden md:flex flex-col items-end gap-1 text-right">
                        <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{r.total_lotes} lote{r.total_lotes !== 1 ? 's' : ''}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtNum(r.total_mp_unidades)} uds recibidas</span>
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
                            ['Proveedor', r.proveedor],
                            ['Responsable', r.usuario],
                            ['Estado OP', r.orden_pedido?.estado ?? '—'],
                            ['Fecha esperada', fmtFecha(r.orden_pedido?.fecha_esperada ?? null)],
                          ].map(([k, v]) => (
                            <div key={String(k)}>
                              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{k}</p>
                              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>{v}</p>
                            </div>
                          ))}
                        </div>
                        {r.observaciones && (
                          <div className="px-5 py-2 text-xs border-b border-black/5" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-bold">Obs:</span> {r.observaciones}
                          </div>
                        )}
                        {/* Tabla de lotes */}
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-black/5">
                              {['Lote', 'Materia Prima', 'Bodega', 'Recibido', 'Disponible', 'Consumido', 'Vencimiento'].map(h => (
                                <th key={h} className="text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {r.lotes.map(l => (
                              <tr key={l.lote_id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                                <td className="px-5 py-3 font-black text-xs" style={{ color: 'var(--text-muted)' }}>#{l.lote_id}</td>
                                <td className="px-5 py-3 font-bold text-xs" style={{ color: 'var(--text-main)' }}>{l.materia_prima}</td>
                                <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{l.bodega}</td>
                                <td className="px-5 py-3 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                  {fmtNum(l.cantidad_inicial)} <span className="font-normal text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.unidad_medida}</span>
                                </td>
                                <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-main)' }}>
                                  {fmtNum(l.cantidad_actual)} <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.unidad_medida}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-14 h-1.5 rounded-full bg-black/10">
                                      <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${l.consumido_pct}%` }} />
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{l.consumido_pct}%</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-xs" style={{ color: l.fecha_vencimiento ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                  {fmtFecha(l.fecha_vencimiento)}
                                </td>
                              </tr>
                            ))}
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
