'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  RefreshCw, ArrowLeftRight, Calendar, Search, Warehouse,
} from 'lucide-react';
import { reportesService } from '@/services/reportes.service';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface TrasladoAudit {
  id:             number;
  fecha:          string;
  usuario:        string;
  lote_mp_id:     number;
  materia_prima:  string;
  unidad_medida:  string;
  cantidad:       number;
  bodega_origen:  string;
  bodega_destino: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  return n % 1 === 0 ? String(n) : n.toLocaleString('es-CO', { maximumFractionDigits: 3 });
}
function fmtFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function hoy(): string { return new Date().toISOString().split('T')[0]; }
function hace90d(): string {
  const d = new Date(); d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function AuditoriaTrasladosMpPage() {
  const [data,     setData]     = useState<TrasladoAudit[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [desde,    setDesde]    = useState(hace90d());
  const [hasta,    setHasta]    = useState(hoy());
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(() => {
    setLoading(true); setError('');
    reportesService.auditTrasladosMp(desde, hasta)
      .then(d => setData(d as TrasladoAudit[]))
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = useMemo(() => {
    if (!busqueda) return data;
    const q = busqueda.toLowerCase();
    return data.filter(t =>
      t.materia_prima.toLowerCase().includes(q) ||
      t.usuario.toLowerCase().includes(q) ||
      (t.bodega_origen ?? '').toLowerCase().includes(q) ||
      (t.bodega_destino ?? '').toLowerCase().includes(q)
    );
  }, [data, busqueda]);

  const totalUnid   = filtrados.reduce((s, t) => s + t.cantidad, 0);
  const mpsMovidas  = new Set(filtrados.map(t => t.materia_prima)).size;
  const usuarios    = new Set(filtrados.map(t => t.usuario)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Auditoría de Traslados de MP
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Movimientos de materias primas entre bodegas — inmutables e imputados al responsable
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
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>MP / Usuario / Bodega</label>
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
              { icon: <ArrowLeftRight size={20} style={{ color: 'var(--primary)' }} />, bg: 'bg-slate-50 border-slate-200', val: filtrados.length, label: 'Traslados' },
              { icon: <Warehouse size={20} className="text-blue-500" />, bg: 'bg-blue-50 border-blue-200', val: mpsMovidas, label: 'Materias primas' },
              { icon: <ArrowLeftRight size={20} className="text-green-500" />, bg: 'bg-green-50 border-green-200', val: fmtNum(totalUnid), label: 'Unidades trasladadas' },
              { icon: <Warehouse size={20} className="text-amber-500" />, bg: 'bg-amber-50 border-amber-200', val: usuarios, label: 'Usuarios responsables' },
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

          {/* Tabla */}
          {filtrados.length === 0 ? (
            <div className="text-center py-12 text-sm rounded-xl border-2 border-dashed border-black/10" style={{ color: 'var(--text-muted)' }}>
              {busqueda ? 'Sin resultados.' : 'No hay traslados de MP en el período.'}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black/5">
                    {['#Mov', 'Fecha y hora', 'Materia Prima', 'Lote', 'Cantidad', 'Origen', '', 'Destino', 'Responsable'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(t => (
                    <tr key={t.id} className="border-b border-black/5 border-l-4 border-l-yellow-400 hover:bg-yellow-50/30 transition-colors">
                      <td className="px-5 py-3 font-black text-xs" style={{ color: 'var(--text-muted)' }}>#{t.id}</td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-main)' }}>{fmtFechaHora(t.fecha)}</td>
                      <td className="px-5 py-3 font-bold text-xs" style={{ color: 'var(--text-main)' }}>{t.materia_prima}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>Lote #{t.lote_mp_id}</td>
                      <td className="px-5 py-3 font-black text-yellow-600 whitespace-nowrap">
                        {fmtNum(t.cantidad)}
                        <span className="ml-1 font-normal text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.unidad_medida}</span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold text-[10px]">{t.bodega_origen}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <ArrowLeftRight size={13} className="text-slate-400" />
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {t.bodega_destino
                          ? <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold text-[10px]">{t.bodega_destino}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{t.usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Footer */}
              <div className="border-t-2 border-black/5 px-5 py-3 flex flex-wrap gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span><span className="font-black" style={{ color: 'var(--text-main)' }}>{filtrados.length}</span> traslados</span>
                <span className="font-bold text-yellow-600">Total: {fmtNum(totalUnid)} unidades</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
