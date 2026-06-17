'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AlertTriangle, RefreshCw, Plus, ShoppingCart, X, Trash2,
  Phone, Mail, Package, CheckCircle2, Calendar, ChevronRight,
  Truck, Clock, Activity,
} from 'lucide-react';
import { inventarioService, type AlertaMp } from '@/services/inventario.service';
import { proveedoresService, type Proveedor } from '@/services/proveedores.service';
import { recepcionesService } from '@/services/recepciones.service';
import { reportesService } from '@/services/reportes.service';
import { formatCantidad, unidadAdmiteDecimales } from '@/lib/utils';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface ItemOrden {
  materia_prima_id:     number;
  materia_prima_nombre: string;
  unidad_medida:        string;
  cantidad_solicitada:  string;
}

interface LotePt {
  lote_id:             number;
  producto_terminado:  string;
  unidad_medida:       string;
  bodega:              string;
  cantidad_actual:     number;
  fecha_produccion:    string;
  orden_produccion_id: number;
}

interface StockPtData {
  total_lotes:  number;
  por_producto: { producto_terminado: string; stock_total: number; lotes_activos: number }[];
  detalle:      LotePt[];
}

// ── Constante de polling ─────────────────────────────────────────────────────
const INTERVALO_SEGUNDOS = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtHora(d: Date) {
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AlertasPage() {
  const [alertas,     setAlertas]     = useState<AlertaMp[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [stockPt,     setStockPt]     = useState<StockPtData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [ultimaAct,   setUltimaAct]   = useState<Date | null>(null);
  const [contador,    setContador]    = useState(INTERVALO_SEGUNDOS);

  const [modalOrden,    setModalOrden]    = useState(false);
  const [enviando,      setEnviando]      = useState(false);
  const [msgOk,         setMsgOk]         = useState('');
  const [msgErr,        setMsgErr]        = useState('');
  const [proveedorId,   setProveedorId]   = useState('');
  const [fechaEsperada, setFechaEsperada] = useState('');
  const [itemsOrden,    setItemsOrden]    = useState<ItemOrden[]>([]);

  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Carga de datos ────────────────────────────────────────────────────────
  const cargar = useCallback((silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError('');
    Promise.allSettled([
      inventarioService.alertas(),
      proveedoresService.listar(),
      reportesService.stockPt() as Promise<StockPtData>,
    ]).then(([a, p, s]) => {
      if (a.status === 'fulfilled') setAlertas(a.value);
      if (p.status === 'fulfilled') setProveedores(p.value);
      if (s.status === 'fulfilled') setStockPt(s.value as StockPtData);
      if (a.status === 'rejected')  setError((a.reason as Error).message ?? 'Error al cargar alertas');
      setUltimaAct(new Date());
      setContador(INTERVALO_SEGUNDOS);
    }).finally(() => { if (!silencioso) setLoading(false); });
  }, []);

  // ── Polling automático ────────────────────────────────────────────────────
  useEffect(() => {
    cargar(false);

    intervaloRef.current = setInterval(() => {
      cargar(true);
    }, INTERVALO_SEGUNDOS * 1000);

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [cargar]);

  // ── Contador regresivo ────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      setContador(prev => (prev > 0 ? prev - 1 : INTERVALO_SEGUNDOS));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Acciones de orden de compra ────────────────────────────────────────────
  const abrirOrden = (alerta: AlertaMp) => {
    setItemsOrden([{
      materia_prima_id:     alerta.materia_prima_id,
      materia_prima_nombre: alerta.nombre,
      unidad_medida:        alerta.unidad_medida,
      cantidad_solicitada:  String(alerta.faltante > 0 ? Math.ceil(alerta.faltante) : ''),
    }]);
    const provSugerido = proveedores.find(p =>
      p.activo && p.materias_primas.some(mp => mp.id === alerta.materia_prima_id)
    );
    setProveedorId(provSugerido ? String(provSugerido.id) : '');
    setFechaEsperada(''); setMsgErr('');
    setModalOrden(true);
  };

  const agregarAlPedido = (alerta: AlertaMp) => {
    if (itemsOrden.some(i => i.materia_prima_id === alerta.materia_prima_id)) return;
    setItemsOrden(prev => [...prev, {
      materia_prima_id:     alerta.materia_prima_id,
      materia_prima_nombre: alerta.nombre,
      unidad_medida:        alerta.unidad_medida,
      cantidad_solicitada:  String(alerta.faltante > 0 ? Math.ceil(alerta.faltante) : ''),
    }]);
  };

  const removeItem     = (id: number) => setItemsOrden(prev => prev.filter(i => i.materia_prima_id !== id));
  const updateCantidad = (id: number, val: string) =>
    setItemsOrden(prev => prev.map(i => i.materia_prima_id === id ? { ...i, cantidad_solicitada: val } : i));

  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      const items = itemsOrden
        .filter(i => i.cantidad_solicitada)
        .map(i => ({ materia_prima_id: i.materia_prima_id, cantidad_solicitada: parseFloat(i.cantidad_solicitada) }));
      if (items.length === 0) { setMsgErr('Agrega al menos un ítem al pedido.'); setEnviando(false); return; }
      await recepcionesService.crearOrden({
        proveedor_id:   proveedorId ? parseInt(proveedorId) : undefined,
        fecha_esperada: fechaEsperada || undefined,
        items,
      });
      const prov = proveedores.find(p => String(p.id) === proveedorId);
      setMsgOk(`Orden de compra creada${prov ? ` para ${prov.nombre}` : ''}. Disponible en Recepciones → Órdenes.`);
      setModalOrden(false);
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const proveedorSeleccionado = proveedores.find(p => String(p.id) === proveedorId);
  const inicial = (nombre: string) => nombre.trim().charAt(0).toUpperCase();
  const pendientesDespacho = stockPt?.detalle ?? [];

  return (
    <div className="space-y-6">

      {/* ── Encabezado ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Panel de Alertas Operativas
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Monitoreo en tiempo real — stock bajo reorden y despachos pendientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Badge EN VIVO */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <Activity size={11} className="text-green-600" />
            <span className="text-[11px] font-black uppercase tracking-widest text-green-700">En vivo</span>
          </div>
          {/* Contador y última actualización */}
          {ultimaAct && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={11} />
              <span>Actualiza en <strong className="text-slate-600">{contador}s</strong> · {fmtHora(ultimaAct)}</span>
            </div>
          )}
          <button onClick={() => cargar(false)} disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Feedback */}
      {msgOk && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
          <span className="flex-1">{msgOk}</span>
          <button onClick={() => setMsgOk('')}><X size={13} className="text-emerald-400" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {!loading && (
        <div className="space-y-8">

          {/* ── Sección 1: Stock bajo reorden ─────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Stock bajo punto de reorden
              </h2>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                alertas.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                {alertas.length} alerta{alertas.length !== 1 ? 's' : ''}
              </span>
            </div>

            {alertas.length === 0 ? (
              <div className="rounded-2xl p-10 text-center border-2 border-dashed border-emerald-200 bg-emerald-50/50">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>
                <h3 className="font-bold text-emerald-700">¡Todo en orden!</h3>
                <p className="text-sm text-emerald-500 mt-1">Todos los insumos están sobre su punto de reorden.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 mb-4">
                  <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-red-700">
                    {alertas.length} materia{alertas.length !== 1 ? 's primas requieren' : ' prima requiere'} reposición urgente.
                  </p>
                  {modalOrden && (
                    <span className="ml-auto text-xs font-semibold text-red-500 bg-red-100 px-2.5 py-1 rounded-full">
                      Pedido en curso · {itemsOrden.length} ítem{itemsOrden.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alertas.map(mp => {
                    const provSugerido = proveedores.find(p =>
                      p.activo && p.materias_primas.some(m => m.id === mp.materia_prima_id)
                    );
                    const yaEnPedido = itemsOrden.some(i => i.materia_prima_id === mp.materia_prima_id);
                    return (
                      <div key={mp.materia_prima_id}
                        className="bg-white rounded-2xl border border-red-100 border-l-4 border-l-red-400 shadow-sm overflow-hidden">
                        <div className="px-5 pt-4 pb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle size={15} className="text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 leading-tight truncate">{mp.nombre}</p>
                              <span className="inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-semibold bg-slate-100 text-slate-500 uppercase tracking-wide">
                                {mp.unidad_medida}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-center">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-red-400 mb-0.5">Stock actual</p>
                              <p className="text-base font-black text-red-600 tabular-nums leading-tight">
                                {formatCantidad(mp.stock_total, mp.unidad_medida)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Reorden</p>
                              <p className="text-base font-black text-slate-600 tabular-nums leading-tight">
                                {formatCantidad(mp.punto_reorden, mp.unidad_medida)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2.5 text-center">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-orange-400 mb-0.5">Faltante</p>
                              <p className="text-base font-black text-orange-600 tabular-nums leading-tight">
                                {formatCantidad(mp.faltante, mp.unidad_medida)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            {provSugerido
                              ? <p className="text-xs text-slate-500 truncate"><span className="text-slate-400">Proveedor: </span><span className="font-semibold text-slate-700">{provSugerido.nombre}</span></p>
                              : <p className="text-xs text-slate-400 italic">Sin proveedor asignado</p>
                            }
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            {modalOrden && !yaEnPedido && (
                              <button onClick={() => agregarAlPedido(mp)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-white transition-colors">
                                <Plus size={11} /> Agregar
                              </button>
                            )}
                            {modalOrden && yaEnPedido && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                                <CheckCircle2 size={12} /> En pedido
                              </span>
                            )}
                            {!yaEnPedido && (
                              <button onClick={() => abrirOrden(mp)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all"
                                style={{ background: 'var(--primary)' }}>
                                <ShoppingCart size={11} /> Ordenar <ChevronRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── Sección 2: Pendientes de despacho ─────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Pendientes de despacho
              </h2>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                pendientesDespacho.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {pendientesDespacho.length} lote{pendientesDespacho.length !== 1 ? 's' : ''}
              </span>
            </div>

            {pendientesDespacho.length === 0 ? (
              <div className="rounded-2xl p-10 text-center border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Truck size={22} className="text-slate-400" />
                </div>
                <p className="font-bold text-slate-500">Sin producto terminado esperando despacho</p>
                <p className="text-sm text-slate-400 mt-1">Los lotes en Bodega Ventas aparecerán aquí.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 mb-4">
                  <Truck size={14} className="text-blue-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-blue-700">
                    {pendientesDespacho.length} lote{pendientesDespacho.length !== 1 ? 's' : ''} de producto terminado aguardando despacho en Bodega Ventas.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pendientesDespacho.map(lote => (
                    <div key={lote.lote_id}
                      className="bg-white rounded-2xl border border-blue-100 border-l-4 border-l-blue-400 shadow-sm px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Package size={15} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 leading-tight truncate">{lote.producto_terminado}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{lote.bodega}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-blue-400 mb-0.5">Disponible</p>
                          <p className="text-base font-black text-blue-700 tabular-nums leading-tight">
                            {lote.cantidad_actual} <span className="text-xs font-medium">{lote.unidad_medida}</span>
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Producido</p>
                          <p className="text-xs font-bold text-slate-600 leading-tight mt-1">
                            {new Date(lote.fecha_produccion + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

        </div>
      )}

      {/* ── Modal: Nueva Orden de Compra ──────────────────────────────────── */}
      {modalOrden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,35,35,0.08)' }}>
                  <ShoppingCart size={16} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Nueva Orden de Compra</h2>
                  <p className="text-[11px] text-slate-400">{itemsOrden.length} ítem{itemsOrden.length !== 1 ? 's' : ''} en el pedido</p>
                </div>
              </div>
              <button onClick={() => setModalOrden(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={15} className="text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5">
              {msgErr && (
                <div className="flex items-center gap-2.5 mb-4 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-600 font-medium">{msgErr}</p>
                </div>
              )}
              <form onSubmit={handleCrearOrden} id="form-orden" className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Proveedor *</label>
                  <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/60 focus:bg-white transition-all"
                    style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties} required>
                    <option value="">— Seleccionar proveedor —</option>
                    {proveedores.filter(p => p.activo).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  {proveedorSeleccionado && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="h-1 w-full" style={{ background: 'var(--primary)' }} />
                      <div className="px-4 py-3 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                          style={{ background: 'var(--primary)' }}>
                          {inicial(proveedorSeleccionado.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{proveedorSeleccionado.nombre}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            {proveedorSeleccionado.telefono && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Phone size={10} className="text-slate-400" /> {proveedorSeleccionado.telefono}
                              </span>
                            )}
                            {proveedorSeleccionado.email && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Mail size={10} className="text-slate-400" /> {proveedorSeleccionado.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha esperada de entrega</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="date" value={fechaEsperada} onChange={e => setFechaEsperada(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/60 focus:bg-white transition-all"
                      style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Materias primas a solicitar</label>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">{itemsOrden.length}</span>
                  </div>
                  <div className="space-y-2">
                    {itemsOrden.map(item => {
                      const decimales = unidadAdmiteDecimales(item.unidad_medida);
                      return (
                        <div key={item.materia_prima_id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,35,35,0.08)' }}>
                            <Package size={13} style={{ color: 'var(--primary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate leading-tight">{item.materia_prima_nombre}</p>
                            <span className="inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 uppercase tracking-wide">
                              {item.unidad_medida}
                            </span>
                          </div>
                          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white flex-shrink-0 w-32">
                            <input type="number" step={decimales ? '0.001' : '1'} min={decimales ? '0.001' : '1'}
                              value={item.cantidad_solicitada} onChange={e => updateCantidad(item.materia_prima_id, e.target.value)}
                              placeholder="0" className="flex-1 px-2 py-2 text-sm text-right font-semibold focus:outline-none bg-white min-w-0" />
                            <span className="px-2 py-2 text-[11px] text-slate-400 font-medium bg-slate-50 border-l border-slate-200 flex items-center">
                              {item.unidad_medida}
                            </span>
                          </div>
                          <button type="button" onClick={() => removeItem(item.materia_prima_id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {itemsOrden.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center">
                      <Package size={20} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400">Sin ítems. Agrega materias primas desde las alertas.</p>
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-white">
              <button type="button" onClick={() => setModalOrden(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="form-orden" disabled={enviando || itemsOrden.length === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all shadow-sm"
                style={{ background: 'var(--primary)' }}>
                {enviando ? (
                  <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>Creando…</>
                ) : (
                  <><ShoppingCart size={14} />Crear orden de compra</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
