'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  RefreshCw, Truck, Calendar, Search, ChevronDown, ChevronRight, Users, Package,
} from 'lucide-react';
import { reportesService } from '@/services/reportes.service';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ClienteInfo {
  id:     number | null;
  nombre: string;
  tipo:   string | null;
  nit:    string | null;
}

interface LotePtInfo {
  lote_id:          number;
  bodega:           string;
  fecha_produccion: string;
  stock_restante:   number;
}

interface OrdenInfo {
  id:      number;
  usuario: string | null;
}

interface DespachoAudit {
  id:                  number;
  despachado_en:       string;
  usuario:             string;
  cantidad:            number;
  cliente:             ClienteInfo;
  producto_terminado:  string;
  unidad_medida:       string;
  lote_pt:             LotePtInfo | null;
  orden_produccion:    OrdenInfo | null;
  referencia_cliente:  string | null;
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
function fmtFecha(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
function hoy(): string { return new Date().toISOString().split('T')[0]; }
function hace60d(): string {
  const d = new Date(); d.setDate(d.getDate() - 60);
  return d.toISOString().split('T')[0];
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function AuditoriaDespachoPage() {
  const [data,     setData]     = useState<DespachoAudit[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [desde,    setDesde]    = useState(hace60d());
  const [hasta,    setHasta]    = useState(hoy());
  const [busqueda, setBusqueda] = useState('');
  const [expand,   setExpand]   = useState<Set<number>>(new Set());

  const cargar = useCallback(() => {
    setLoading(true); setError('');
    reportesService.auditDespachos(desde, hasta)
      .then(d => setData(d as DespachoAudit[]))
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = useMemo(() => {
    if (!busqueda) return data;
    const q = busqueda.toLowerCase();
    return data.filter(d =>
      d.cliente.nombre.toLowerCase().includes(q) ||
      d.producto_terminado.toLowerCase().includes(q) ||
      d.usuario.toLowerCase().includes(q)
    );
  }, [data, busqueda]);

  const totalUnid   = filtrados.reduce((s, d) => s + d.cantidad, 0);
  const clientes    = new Set(filtrados.map(d => d.cliente.nombre)).size;
  const productos   = new Set(filtrados.map(d => d.producto_terminado)).size;

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
            Auditoría de Despachos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Trazabilidad completa: cliente → PT → lote → orden de producción
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
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cliente / Producto / Usuario</label>
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
              { icon: <Truck size={20} style={{ color: 'var(--primary)' }} />, bg: 'bg-slate-50 border-slate-200', val: filtrados.length, label: 'Despachos' },
              { icon: <Users size={20} className="text-blue-500" />, bg: 'bg-blue-50 border-blue-200', val: clientes, label: 'Clientes' },
              { icon: <Package size={20} className="text-green-500" />, bg: 'bg-green-50 border-green-200', val: productos, label: 'Productos' },
              { icon: <Truck size={20} className="text-amber-500" />, bg: 'bg-amber-50 border-amber-200', val: fmtNum(totalUnid), label: 'Unidades despachadas' },
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
              Sin despachos en el período.
            </div>
          ) : (
            <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black/5">
                    {['', '#', 'Fecha y hora', 'Cliente', 'Producto', 'Cantidad', 'Lote PT', 'OP', 'Responsable'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(d => {
                    const isOpen = expand.has(d.id);
                    return (
                      <>
                        <tr key={d.id}
                          className="border-b border-black/5 border-l-4 border-l-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
                          onClick={() => toggle(d.id)}>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </td>
                          <td className="px-4 py-3 font-black text-xs" style={{ color: 'var(--text-muted)' }}>#{d.id}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-main)' }}>{fmtFechaHora(d.despachado_en)}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{d.cliente.nombre}</span>
                            {d.cliente.tipo && (
                              <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-100" style={{ color: 'var(--text-muted)' }}>
                                {d.cliente.tipo}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-main)' }}>{d.producto_terminado}</td>
                          <td className="px-4 py-3 font-black text-blue-600 whitespace-nowrap">
                            {fmtNum(d.cantidad)} <span className="font-normal text-[10px]" style={{ color: 'var(--text-muted)' }}>{d.unidad_medida}</span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {d.lote_pt ? `#${d.lote_pt.lote_id}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {d.orden_produccion ? `OP #${d.orden_produccion.id}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{d.usuario}</td>
                        </tr>

                        {/* Fila expandida */}
                        {isOpen && (
                          <tr key={`${d.id}-det`} className="bg-blue-50/20">
                            <td colSpan={9} className="px-8 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Cliente */}
                                <div className="rounded-lg p-3 border border-black/10 bg-white">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Cliente</p>
                                  <p className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{d.cliente.nombre}</p>
                                  {d.cliente.nit && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>NIT/Cédula: {d.cliente.nit}</p>}
                                  {d.cliente.tipo && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tipo: {d.cliente.tipo}</p>}
                                  {d.referencia_cliente && <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>Ref: {d.referencia_cliente}</p>}
                                </div>
                                {/* Producto */}
                                <div className="rounded-lg p-3 border border-black/10 bg-white">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Producto terminado</p>
                                  <p className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{d.producto_terminado}</p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    <span className="font-bold text-blue-600">{fmtNum(d.cantidad)}</span> {d.unidad_medida} despachados
                                  </p>
                                </div>
                                {/* Lote PT */}
                                {d.lote_pt && (
                                  <div className="rounded-lg p-3 border border-black/10 bg-white">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Lote de origen</p>
                                    <p className="text-sm font-black" style={{ color: 'var(--text-main)' }}>Lote PT #{d.lote_pt.lote_id}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Bodega: {d.lote_pt.bodega}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Producido: {fmtFecha(d.lote_pt.fecha_produccion)}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Restante: {fmtNum(d.lote_pt.stock_restante)} {d.unidad_medida}</p>
                                  </div>
                                )}
                                {/* Orden producción */}
                                {d.orden_produccion && (
                                  <div className="rounded-lg p-3 border border-black/10 bg-white">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1">Orden de producción</p>
                                    <p className="text-sm font-black" style={{ color: 'var(--text-main)' }}>OP #{d.orden_produccion.id}</p>
                                    {d.orden_produccion.usuario && (
                                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Producido por: {d.orden_produccion.usuario}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
              {/* Footer */}
              <div className="border-t-2 border-black/5 px-5 py-3 flex flex-wrap gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span><span className="font-black" style={{ color: 'var(--text-main)' }}>{filtrados.length}</span> despachos</span>
                <span className="font-bold text-blue-600">Total: {fmtNum(totalUnid)} unidades</span>
                <span>{clientes} cliente{clientes !== 1 ? 's' : ''} · {productos} producto{productos !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
