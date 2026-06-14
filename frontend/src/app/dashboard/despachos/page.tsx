'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw, Plus, X, Truck, Package,
  Search, ArrowRight, User, Calendar, Building2,
} from 'lucide-react';
import { despachosService } from '@/services/despachos.service';
import { reportesService } from '@/services/reportes.service';
import { clientesService, type Cliente } from '@/services/clientes.service';
import { formatNum } from '@/lib/utils';

/* ─── tipos ──────────────────────────────────────────────────────────── */

interface DespachoRaw {
  id: number;
  cantidad: number;
  referencia_cliente?: string;
  despachado_en: string;
  usuario?: { nombre: string };
  lote_pt?: { producto_terminado?: { nombre: string } };
  cliente?: { id: number; tipo: string; nombre: string; nit_cedula: string | null } | null;
}

interface LotePt {
  lote_id: number;
  producto_terminado: string;
  bodega: string;
  cantidad_actual: number;
  unidad_medida: string;
  fecha_produccion: string | null;
}

interface StockPtResponse {
  total_lotes: number;
  por_producto: unknown[];
  detalle: LotePt[];
}

/* ─── helpers ────────────────────────────────────────────────────────── */

function formatFecha(iso: string): string {
  const d   = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoy.toDateString())  return `Hoy ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `Ayer ${hora}`;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function iniciales(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

/* ─── página ─────────────────────────────────────────────────────────── */

export default function DespachosPage() {
  const [despachos,  setDespachos]  = useState<DespachoRaw[]>([]);
  const [lotesPt,    setLotesPt]    = useState<LotePt[]>([]);
  const [clientes,   setClientes]   = useState<Cliente[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [enviando,   setEnviando]   = useState(false);
  const [msgOk,      setMsgOk]      = useState('');
  const [msgErr,     setMsgErr]     = useState('');
  const [busqueda,   setBusqueda]   = useState('');

  /* form */
  const [loteId,     setLoteId]     = useState('');
  const [cantidad,   setCantidad]   = useState('');
  const [clienteId,  setClienteId]  = useState('');
  const [clienteRef, setClienteRef] = useState('');
  const [buscCliente, setBuscCliente] = useState('');

  const clienteSeleccionado = clientes.find(c => String(c.id) === clienteId);
  const clientesFiltrados   = clientes.filter(c =>
    c.activo && (
      !buscCliente.trim() ||
      c.nombre.toLowerCase().includes(buscCliente.toLowerCase()) ||
      (c.nit_cedula ?? '').includes(buscCliente)
    )
  ).slice(0, 8);

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      despachosService.listar(),
      reportesService.stockPt(),
      clientesService.listar(),
    ]).then(([d, s, c]) => {
      if (d.status === 'fulfilled') setDespachos(d.value as unknown as DespachoRaw[]);
      if (s.status === 'fulfilled') setLotesPt((s.value as StockPtResponse).detalle ?? []);
      if (c.status === 'fulfilled') setClientes(c.value);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const loteSeleccionado = lotesPt.find(l => String(l.lote_id) === loteId);
  const cantNum          = parseFloat(cantidad) || 0;
  const pctDespacho      = loteSeleccionado
    ? Math.min((cantNum / loteSeleccionado.cantidad_actual) * 100, 100)
    : 0;

  const abrirModal = (lote?: LotePt) => {
    setLoteId(lote ? String(lote.lote_id) : '');
    setCantidad('');
    setClienteId('');
    setClienteRef('');
    setBuscCliente('');
    setMsgErr('');
    setModal(true);
  };

  const handleDespacho = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await despachosService.registrar({
        lote_pt_id:         parseInt(loteId),
        cantidad:           parseFloat(cantidad),
        cliente_id:         clienteId ? parseInt(clienteId) : undefined,
        referencia_cliente: clienteRef || undefined,
      });
      setMsgOk('Despacho registrado correctamente.');
      setModal(false);
      cargar();
    } catch (err: unknown) {
      setMsgErr((err as Error).message ?? 'Error al registrar despacho');
    } finally {
      setEnviando(false);
    }
  };

  /* KPIs */
  const hoy   = new Date().toDateString();
  const mes   = new Date().getMonth();
  const anio  = new Date().getFullYear();

  const kpis = useMemo(() => ({
    lotesPt:        lotesPt.length,
    despachosHoy:   despachos.filter(d => new Date(d.despachado_en).toDateString() === hoy).length,
    despachosMes:   despachos.filter(d => {
      const f = new Date(d.despachado_en);
      return f.getMonth() === mes && f.getFullYear() === anio;
    }).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [despachos, lotesPt]);

  /* Filtro historial */
  const historialFiltrado = useMemo(() => {
    if (!busqueda.trim()) return despachos;
    const q = busqueda.toLowerCase();
    return despachos.filter(d =>
      (d.lote_pt?.producto_terminado?.nombre ?? '').toLowerCase().includes(q) ||
      (d.referencia_cliente ?? '').toLowerCase().includes(q) ||
      (d.usuario?.nombre ?? '').toLowerCase().includes(q)
    );
  }, [despachos, busqueda]);

  /* ─── render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Despachos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Salidas de producto terminado hacia clientes
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={() => abrirModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--primary)' }}>
            <Plus size={13} />
            Registrar despacho
          </button>
        </div>
      </div>

      {/* Banner OK */}
      {msgOk && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-700 font-semibold">
          <span className="flex items-center gap-2"><Truck size={15} /> {msgOk}</span>
          <button onClick={() => setMsgOk('')}><X size={14} className="text-green-400" /></button>
        </div>
      )}

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Lotes disponibles', value: kpis.lotesPt,       sub: 'listos para despacho', color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: Package },
            { label: 'Despachos hoy',     value: kpis.despachosHoy,  sub: 'en el día de hoy',     color: 'text-blue-600',    bg: 'bg-blue-50',    Icon: Truck   },
            { label: 'Este mes',          value: kpis.despachosMes,  sub: 'despachos del mes',    color: 'text-violet-600',  bg: 'bg-violet-50',  Icon: Calendar },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
                <k.Icon size={17} className={k.color} />
              </div>
              <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-main)' }}>{k.value}</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <>
          {/* Lotes disponibles */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Lotes disponibles para despacho — {lotesPt.length}
            </h2>

            {lotesPt.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Package size={22} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-400 mb-1">Sin lotes disponibles</p>
                <p className="text-xs text-slate-300">
                  Completa el ciclo de producción (Crear → Producir → Trasladar PT) para tener producto listo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {lotesPt.map(lote => (
                  <div key={lote.lote_id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black leading-tight truncate" style={{ color: 'var(--text-main)' }}>
                          {lote.producto_terminado}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                          {lote.bodega}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-emerald-600" />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Disponible</p>
                      <p className="text-xl font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                        {formatNum(lote.cantidad_actual)}
                        <span className="text-sm font-semibold text-slate-400 ml-1">{lote.unidad_medida}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => abrirModal(lote)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                      style={{ background: 'var(--primary)' }}
                    >
                      <Truck size={12} />
                      Despachar
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Historial */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Historial — {despachos.length} despacho{despachos.length !== 1 ? 's' : ''}
              </h2>
              <div className="relative max-w-xs w-full">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto, cliente…"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-slate-300 transition-colors"
                />
              </div>
            </div>

            {despachos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Truck size={20} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-400">No hay despachos registrados</p>
                <p className="text-xs text-slate-300 mt-1">Los despachos que registres aparecerán aquí.</p>
              </div>
            ) : historialFiltrado.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <p className="text-sm text-slate-400">Sin resultados para &ldquo;{busqueda}&rdquo;</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Producto</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cantidad</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Cliente / Ref.</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Fecha</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {historialFiltrado.map(d => {
                      const nombreProducto = d.lote_pt?.producto_terminado?.nombre ?? '—';
                      const nombreUsuario  = d.usuario?.nombre ?? '';
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-black text-slate-400">#{d.id}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <Package size={13} className="text-emerald-600" />
                              </div>
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                                {nombreProducto}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                              {formatNum(d.cantidad)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 hidden sm:table-cell">
                            {d.cliente ? (
                              <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${d.cliente.tipo === 'empresa' ? 'bg-blue-100' : 'bg-violet-100'}`}>
                                  {d.cliente.tipo === 'empresa'
                                    ? <Building2 size={10} className="text-blue-600" />
                                    : <User size={10} className="text-violet-600" />}
                                </div>
                                <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">{d.cliente.nombre}</span>
                              </div>
                            ) : d.referencia_cliente ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                {d.referencia_cliente}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <span className="text-xs text-slate-500">{formatFecha(d.despachado_en)}</span>
                          </td>
                          <td className="px-4 py-3.5 hidden lg:table-cell">
                            {nombreUsuario ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[9px] font-black text-slate-500">{iniciales(nombreUsuario)}</span>
                                </div>
                                <span className="text-xs text-slate-500 truncate max-w-[100px]">{nombreUsuario}</span>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                <User size={11} className="text-slate-400" />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Modal registrar despacho */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                  <Truck size={15} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800">Registrar Despacho</h2>
                  <p className="text-xs text-slate-400">Salida de producto terminado</p>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo modal */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {lotesPt.length === 0 ? (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700 text-center">
                  <Package size={28} className="mx-auto mb-2 text-amber-400" />
                  <p className="font-semibold mb-1">Sin lotes disponibles</p>
                  <p className="text-xs text-amber-600">
                    Completa el ciclo de producción (Crear → Producir → Trasladar PT) primero.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDespacho} className="space-y-5" id="form-despacho">

                  {msgErr && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>
                  )}

                  {/* Selección de lote */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Producto / Lote <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={loteId}
                      onChange={e => { setLoteId(e.target.value); setCantidad(''); }}
                      className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)] bg-white"
                      required
                    >
                      <option value="">— Seleccionar lote —</option>
                      {lotesPt.map(l => (
                        <option key={l.lote_id} value={l.lote_id}>
                          {l.producto_terminado} · {formatNum(l.cantidad_actual)} {l.unidad_medida} ({l.bodega})
                        </option>
                      ))}
                    </select>

                    {/* Info del lote seleccionado */}
                    {loteSeleccionado && (
                      <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Stock disponible</p>
                          <p className="text-lg font-black text-emerald-700 tabular-nums leading-tight">
                            {formatNum(loteSeleccionado.cantidad_actual)}
                            <span className="text-sm font-semibold ml-1">{loteSeleccionado.unidad_medida}</span>
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Package size={18} className="text-emerald-600" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cantidad */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        Cantidad a despachar <span className="text-red-500">*</span>
                      </label>
                      {loteSeleccionado && cantNum > 0 && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {pctDespacho.toFixed(0)}% del lote
                        </span>
                      )}
                    </div>
                    <div className={`flex rounded-xl border-2 overflow-hidden transition-colors ${
                      cantNum > (loteSeleccionado?.cantidad_actual ?? Infinity)
                        ? 'border-red-300'
                        : 'border-black/10 focus-within:border-[var(--primary)]'
                    }`}>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max={loteSeleccionado?.cantidad_actual}
                        value={cantidad}
                        onChange={e => setCantidad(e.target.value)}
                        placeholder="0"
                        className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white"
                        required
                      />
                      {loteSeleccionado && (
                        <span className="px-3 py-2.5 text-xs font-bold border-l-2 border-black/10 flex items-center bg-slate-50 text-slate-500 flex-shrink-0">
                          {loteSeleccionado.unidad_medida}
                        </span>
                      )}
                    </div>

                    {/* Barra de progreso */}
                    {loteSeleccionado && cantNum > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pctDespacho > 100 ? 'bg-red-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(pctDespacho, 100)}%` }}
                          />
                        </div>
                        {cantNum > loteSeleccionado.cantidad_actual && (
                          <p className="text-[10px] text-red-500 mt-1 font-semibold">
                            Excede el stock disponible ({formatNum(loteSeleccionado.cantidad_actual)} {loteSeleccionado.unidad_medida})
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cliente */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Cliente
                    </label>

                    {clientes.length > 0 ? (
                      <>
                        {/* Búsqueda de cliente */}
                        {!clienteSeleccionado ? (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Buscar cliente por nombre o NIT…"
                                value={buscCliente}
                                onChange={e => setBuscCliente(e.target.value)}
                                className="w-full pl-8 pr-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)]"
                              />
                            </div>
                            {(buscCliente || clientesFiltrados.length <= 5) && (
                              <div className="border-2 border-black/10 rounded-xl overflow-hidden">
                                {clientesFiltrados.length === 0 ? (
                                  <p className="text-xs text-slate-400 px-3 py-2.5 text-center">Sin resultados</p>
                                ) : (
                                  clientesFiltrados.map(c => (
                                    <button key={c.id} type="button"
                                      onClick={() => { setClienteId(String(c.id)); setBuscCliente(''); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0">
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c.tipo === 'empresa' ? 'bg-blue-50' : 'bg-violet-50'}`}>
                                        {c.tipo === 'empresa'
                                          ? <Building2 size={12} className="text-blue-600" />
                                          : <User size={12} className="text-violet-600" />}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{c.nombre}</p>
                                        {c.nit_cedula && (
                                          <p className="text-[10px] text-slate-400">{c.tipo === 'empresa' ? 'NIT' : 'CC'}: {c.nit_cedula}</p>
                                        )}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Cliente seleccionado */
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${clienteSeleccionado.tipo === 'empresa' ? 'bg-blue-100' : 'bg-violet-100'}`}>
                              {clienteSeleccionado.tipo === 'empresa'
                                ? <Building2 size={16} className="text-blue-600" />
                                : <User size={16} className="text-violet-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-800 truncate">{clienteSeleccionado.nombre}</p>
                              <p className="text-[10px] text-slate-500">
                                {clienteSeleccionado.tipo === 'empresa' ? 'Empresa' : 'Persona'}
                                {clienteSeleccionado.nit_cedula ? ` · ${clienteSeleccionado.tipo === 'empresa' ? 'NIT' : 'CC'} ${clienteSeleccionado.nit_cedula}` : ''}
                              </p>
                            </div>
                            <button type="button" onClick={() => setClienteId('')}
                              className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </>
                    ) : null}

                    {/* Referencia libre (cuando no hay cliente o como complemento) */}
                    {!clienteSeleccionado && (
                      <input
                        type="text"
                        placeholder={clientes.length > 0 ? 'O escribe una referencia libre…' : 'Nombre del cliente o número de pedido'}
                        value={clienteRef}
                        onChange={e => setClienteRef(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)] mt-1.5"
                      />
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Footer modal */}
            {lotesPt.length > 0 && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="form-despacho"
                  disabled={enviando || !loteId || !cantidad || cantNum > (loteSeleccionado?.cantidad_actual ?? 0)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ background: 'var(--primary)' }}
                >
                  {enviando
                    ? <><RefreshCw size={14} className="animate-spin" /> Registrando…</>
                    : <><Truck size={14} /> Registrar despacho</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
