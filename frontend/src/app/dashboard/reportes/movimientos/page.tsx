'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  RefreshCw, ArrowDownCircle, ArrowUpCircle, Activity,
  Search, Filter, Calendar, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { reportesService } from '@/services/reportes.service';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Movimiento {
  id:            number;
  tipo:          string;
  direccion:     'entrada' | 'salida';
  entidad_tipo:  string;
  entidad_id:    number;
  bodega:        string;
  cantidad:      number;
  usuario:       string;
  fecha:         string;
  compensatorio: boolean;
}

interface MovimientosResponse {
  total:       number;
  entradas:    number;
  salidas:     number;
  detalle:     Movimiento[];
}

// ── Etiquetas legibles ────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  RECEPCION_ENTRADA:  'Recepción MP',
  CONSUMO_MP:         'Consumo MP',
  PRODUCCION_ENTRADA: 'Entrada PT',
  TRASLADO_SALIDA:    'Traslado salida',
  TRASLADO_ENTRADA:   'Traslado entrada',
  DESPACHO_SALIDA:    'Despacho',
  AJUSTE_ENTRADA:     'Ajuste entrada',
  AJUSTE_SALIDA:      'Ajuste salida',
};

const TIPO_STYLE: Record<string, { badge: string; row: string; dot: string }> = {
  RECEPCION_ENTRADA:  { badge: 'bg-green-100 text-green-700',    row: 'border-l-green-400',   dot: 'bg-green-400' },
  CONSUMO_MP:         { badge: 'bg-orange-100 text-orange-700',  row: 'border-l-orange-400',  dot: 'bg-orange-400' },
  PRODUCCION_ENTRADA: { badge: 'bg-blue-100 text-blue-700',      row: 'border-l-blue-400',    dot: 'bg-blue-400' },
  TRASLADO_SALIDA:    { badge: 'bg-yellow-100 text-yellow-700',  row: 'border-l-yellow-400',  dot: 'bg-yellow-400' },
  TRASLADO_ENTRADA:   { badge: 'bg-yellow-100 text-yellow-700',  row: 'border-l-yellow-300',  dot: 'bg-yellow-300' },
  DESPACHO_SALIDA:    { badge: 'bg-red-100 text-red-700',        row: 'border-l-red-400',     dot: 'bg-red-400' },
  AJUSTE_ENTRADA:     { badge: 'bg-purple-100 text-purple-700',  row: 'border-l-purple-400',  dot: 'bg-purple-400' },
  AJUSTE_SALIDA:      { badge: 'bg-purple-100 text-purple-700',  row: 'border-l-purple-300',  dot: 'bg-purple-300' },
};

const FALLBACK_STYLE = { badge: 'bg-gray-100 text-gray-600', row: 'border-l-gray-300', dot: 'bg-gray-300' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  return n % 1 === 0 ? String(n) : n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

function fmtFechaHora(iso: string): { fecha: string; hora: string } {
  const d = new Date(iso);
  return {
    fecha: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
    hora:  d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
  };
}

function hoy(): string {
  return new Date().toISOString().split('T')[0];
}
function hace30d(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function MovimientosPage() {
  const [data,     setData]     = useState<MovimientosResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tipo,     setTipo]     = useState('');
  const [desde,    setDesde]    = useState(hace30d());
  const [hasta,    setHasta]    = useState(hoy());
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = {};
    if (tipo)  params.tipo         = tipo;
    if (desde) params.fecha_desde  = desde;
    if (hasta) params.fecha_hasta  = hasta;
    reportesService.movimientos(params)
      .then(d => {
        const res = d as MovimientosResponse & { detalle?: Movimiento[] };
        setData({
          total:    res.total    ?? res.detalle?.length ?? 0,
          entradas: res.entradas ?? 0,
          salidas:  res.salidas  ?? 0,
          detalle:  res.detalle  ?? [],
        });
      })
      .catch(e => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [tipo, desde, hasta]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const movimientos = data?.detalle ?? [];

  // Filtro local por búsqueda (bodega o usuario)
  const filtrados = useMemo(() => {
    if (!busqueda) return movimientos;
    const q = busqueda.toLowerCase();
    return movimientos.filter(
      m => m.bodega.toLowerCase().includes(q) || m.usuario.toLowerCase().includes(q),
    );
  }, [movimientos, busqueda]);

  // KPIs calculados sobre los registros mostrados
  const totalEntradas    = filtrados.filter(m => m.direccion === 'entrada').length;
  const totalSalidas     = filtrados.filter(m => m.direccion === 'salida').length;
  const compensatorios   = filtrados.filter(m => m.compensatorio).length;
  const volumenEntradas  = filtrados.filter(m => m.direccion === 'entrada').reduce((s, m) => s + m.cantidad, 0);
  const volumenSalidas   = filtrados.filter(m => m.direccion === 'salida').reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Movimientos de Inventario
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Historial inmutable · {filtrados.length} de {movimientos.length} registros
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

          {/* Fecha desde */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Desde
            </label>
            <div className="relative">
              <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-lg border-2 border-black/10 text-xs focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }} />
            </div>
          </div>

          {/* Fecha hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Hasta
            </label>
            <div className="relative">
              <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-lg border-2 border-black/10 text-xs focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }} />
            </div>
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Tipo de movimiento
            </label>
            <div className="relative">
              <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-lg border-2 border-black/10 text-xs font-bold focus:outline-none focus:border-[var(--primary)] transition-colors appearance-none"
                style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                <option value="">Todos</option>
                {Object.entries(TIPO_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Búsqueda local */}
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Bodega / Usuario
            </label>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border-2 border-black/10 text-xs focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }} />
            </div>
          </div>

          {/* Aplicar */}
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                icon: <Activity size={20} style={{ color: 'var(--primary)' }} />,
                bg: 'bg-slate-50 border-slate-200',
                val: filtrados.length,
                label: 'Movimientos',
              },
              {
                icon: <ArrowDownCircle size={20} className="text-green-500" />,
                bg: 'bg-green-50 border-green-200',
                val: totalEntradas,
                sub: `Vol. ${fmtNum(volumenEntradas)}`,
                label: 'Entradas',
              },
              {
                icon: <ArrowUpCircle size={20} className="text-red-500" />,
                bg: 'bg-red-50 border-red-200',
                val: totalSalidas,
                sub: `Vol. ${fmtNum(volumenSalidas)}`,
                label: 'Salidas',
              },
              {
                icon: <TrendingUp size={20} className="text-blue-500" />,
                bg: 'bg-blue-50 border-blue-200',
                val: fmtNum(volumenEntradas - volumenSalidas),
                label: 'Balance neto',
              },
              {
                icon: <AlertTriangle size={20} className={compensatorios > 0 ? 'text-purple-500' : 'text-slate-400'} />,
                bg: compensatorios > 0 ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200',
                val: compensatorios,
                label: 'Compensatorios',
              },
            ].map(({ icon, bg, val, sub, label }) => (
              <div key={label} className={`rounded-xl p-4 border-2 flex items-center gap-3 ${bg}`}>
                <div className="flex-shrink-0">{icon}</div>
                <div>
                  <p className="text-xl font-black" style={{ color: 'var(--text-main)' }}>{val}</p>
                  {sub && <p className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Leyenda de tipos */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIPO_LABEL).map(([key, label]) => {
              const s = TIPO_STYLE[key] ?? FALLBACK_STYLE;
              return (
                <div key={key} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
                  {label}
                </div>
              );
            })}
          </div>

          {/* Tabla */}
          {filtrados.length === 0 ? (
            <div className="text-center py-12 text-sm rounded-xl border-2 border-dashed border-black/10" style={{ color: 'var(--text-muted)' }}>
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay movimientos en el período seleccionado.'}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black/5">
                    {['#', 'Tipo', 'Dirección', 'Entidad', 'Bodega', 'Cantidad', 'Usuario', 'Fecha y hora'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(m => {
                    const s = TIPO_STYLE[m.tipo] ?? FALLBACK_STYLE;
                    const { fecha, hora } = fmtFechaHora(m.fecha);
                    const rowBg = m.direccion === 'entrada'
                      ? 'hover:bg-green-50/40'
                      : 'hover:bg-red-50/40';

                    return (
                      <tr key={m.id}
                        className={`border-b border-black/5 border-l-4 ${s.row} ${rowBg} transition-colors`}>
                        <td className="px-5 py-3 font-black text-xs" style={{ color: 'var(--text-muted)' }}>
                          #{m.id}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap ${s.badge}`}>
                            {TIPO_LABEL[m.tipo] ?? m.tipo.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`flex items-center gap-1 text-[9px] font-black uppercase w-fit px-2 py-0.5 rounded ${
                            m.direccion === 'entrada'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {m.direccion === 'entrada'
                              ? <ArrowDownCircle size={10} />
                              : <ArrowUpCircle size={10} />}
                            {m.direccion}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="font-bold" style={{ color: 'var(--text-main)' }}>{m.entidad_tipo}</span>{' '}
                          <span className="text-[10px]">#{m.entidad_id}</span>
                        </td>
                        <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {m.bodega}
                        </td>
                        <td className="px-5 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--text-main)' }}>
                          <span className={m.direccion === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                            {m.direccion === 'entrada' ? '+' : '−'}{fmtNum(m.cantidad)}
                          </span>
                          {m.compensatorio && (
                            <span className="ml-1.5 text-[8px] font-black px-1 py-0.5 rounded bg-purple-100 text-purple-600">
                              COMP
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {m.usuario}
                        </td>
                        <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-main)' }}>{fecha}</span>
                          <span className="ml-1 text-[10px]">{hora}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer con totales */}
              <div className="border-t-2 border-black/5 px-5 py-3 flex flex-wrap gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>
                  <span className="font-black" style={{ color: 'var(--text-main)' }}>{filtrados.length}</span> movimientos mostrados
                </span>
                <span className="text-green-600 font-bold">
                  +{fmtNum(volumenEntradas)} entradas
                </span>
                <span className="text-red-600 font-bold">
                  −{fmtNum(volumenSalidas)} salidas
                </span>
                <span className="font-bold" style={{ color: volumenEntradas >= volumenSalidas ? 'var(--text-main)' : '#ef4444' }}>
                  Balance: {fmtNum(volumenEntradas - volumenSalidas)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
