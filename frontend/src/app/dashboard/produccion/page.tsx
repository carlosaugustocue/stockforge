'use client';

import { useEffect, useState } from 'react';
import {
  RefreshCw, Plus, Play, Truck, X, AlertTriangle,
  ClipboardList, ChefHat, CheckCircle2, Package, Search,
} from 'lucide-react';
import Link from 'next/link';
import { produccionService, type OrdenProduccion, type RequerimientoMaterial } from '@/services/produccion.service';
import { catalogoService, type ProductoTerminado, type RelacionMpPt } from '@/services/catalogo.service';
import { formatCantidad, parseApiError, unidadAdmiteDecimales } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';

/* ─────────────── Tipos ─────────────── */

type Modal = 'crear' | 'requerimientos' | 'ejecutar' | 'traslado' | 'anular' | null;

interface StockErrorData {
  materia_prima: string;
  unidad_medida: string;
  requerida: number;
  disponible: number;
  faltante: number;
}

/* ─────────────── Constantes de estilo ─────────────── */

const BADGE: Record<string, string> = {
  pendiente:  'bg-amber-50 text-amber-700 border border-amber-200',
  producido:  'bg-blue-50 text-blue-700 border border-blue-200',
  completada: 'bg-green-50 text-green-700 border border-green-200',
  anulada:    'bg-slate-100 text-slate-500 border border-slate-200',
};

const LABEL: Record<string, string> = {
  pendiente:  'Pendiente',
  producido:  'PT en planta',
  completada: 'Completada',
  anulada:    'Anulada',
};

/* ─────────────── Componente: progreso de pasos ─────────────── */

const STEPS = [
  { key: 'planificar', label: 'Planificar' },
  { key: 'producir',   label: 'Producir'   },
  { key: 'trasladar',  label: 'Trasladar'  },
  { key: 'despachar',  label: 'Despachar'  },
];

function StepProgress({ estado }: { estado: string }) {
  const doneUntil =
    estado === 'completada' ? 3 :
    estado === 'producido'  ? 2 :
    estado === 'pendiente'  ? 1 : 0;

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done    = i < doneUntil;
        const current = i === doneUntil && estado !== 'anulada';
        const future  = i > doneUntil;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all
              ${done    ? 'bg-green-100 text-green-700' :
                current ? 'text-white'                 :
                          'bg-slate-100 text-slate-400'}`}
              style={current ? { background: 'var(--primary)', opacity: 1 } : undefined}>
              <span>{done ? '✓' : i + 1}</span>
              <span className={future ? 'hidden sm:inline' : ''}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 flex-shrink-0 ${done ? 'bg-green-300' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── Componente: tarjeta de orden ─────────────── */

function OrderCard({
  orden,
  onVerReqs,
  onEjecutar,
  onTrasladar,
  onAnular,
}: {
  orden: OrdenProduccion;
  onVerReqs:   (o: OrdenProduccion) => void;
  onEjecutar:  (o: OrdenProduccion) => void;
  onTrasladar: (o: OrdenProduccion) => void;
  onAnular:    (o: OrdenProduccion) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(139,35,35,0.08)' }}>
            <ChefHat size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 leading-tight">
              {orden.producto_terminado?.nombre}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Orden #{orden.id}
              {orden.usuario?.nombre ? ` · ${orden.usuario.nombre}` : ''}
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${BADGE[orden.estado] ?? ''}`}>
          {LABEL[orden.estado] ?? orden.estado}
        </span>
      </div>

      {/* Métricas */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-4 border-b border-slate-50">
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Planificado</p>
          <p className="text-sm font-semibold text-slate-700 tabular-nums mt-0.5">
            {formatCantidad(orden.cantidad_planificada, orden.producto_terminado?.unidad)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Producido</p>
          <p className="text-sm font-semibold text-slate-700 tabular-nums mt-0.5">
            {orden.cantidad_producida != null
              ? formatCantidad(orden.cantidad_producida, orden.producto_terminado?.unidad)
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Fecha</p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            {orden.fecha_planificada}
          </p>
        </div>
      </div>

      {/* Progreso */}
      {orden.estado !== 'anulada' && (
        <div className="px-5 py-3 border-b border-slate-50">
          <StepProgress estado={orden.estado} />
        </div>
      )}

      {/* Acciones */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
        {orden.estado === 'pendiente' && (
          <>
            <button
              onClick={() => onVerReqs(orden)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              <ClipboardList size={13} />
              Ver ingredientes
            </button>
            <button
              onClick={() => onEjecutar(orden)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ background: '#2563eb' }}>
              <Play size={12} />
              Ejecutar producción
            </button>
            <button
              onClick={() => onAnular(orden)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-100 hover:bg-red-50 transition-colors ml-auto">
              <X size={12} />
              Anular
            </button>
          </>
        )}

        {orden.estado === 'producido' && (
          <>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Package size={13} />
              <span>PT listo en Planta de Producción</span>
            </div>
            <button
              onClick={() => onTrasladar(orden)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90 ml-auto"
              style={{ background: '#16a34a' }}>
              <Truck size={12} />
              Trasladar PT a Ventas
            </button>
            <button
              onClick={() => onAnular(orden)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-100 hover:bg-red-50 transition-colors">
              <X size={12} />
              Anular
            </button>
          </>
        )}

        {orden.estado === 'completada' && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <CheckCircle2 size={13} />
            <span>PT en Bodega de Ventas — disponible para despacho</span>
          </div>
        )}

        {orden.estado === 'anulada' && (
          <div className="text-xs text-slate-400 italic">Orden anulada</div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Página principal ─────────────── */

export default function ProduccionPage() {
  const [ordenes,       setOrdenes]       = useState<OrdenProduccion[]>([]);
  const [productos,     setProductos]     = useState<ProductoTerminado[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState<Modal>(null);
  const [selected,      setSelected]      = useState<OrdenProduccion | null>(null);
  const [enviando,      setEnviando]      = useState(false);
  const [msgOk,         setMsgOk]         = useState('');
  const [msgErr,        setMsgErr]        = useState('');
  const [stockErr,      setStockErr]      = useState<StockErrorData | null>(null);
  const [mostrarAnuladas, setMostrarAnuladas] = useState(false);

  // Form crear
  const [ptId,         setPtId]        = useState('');
  const [cantidad,     setCantidad]    = useState('');
  const [fecha,        setFecha]       = useState('');
  const [busquedaPt,   setBusquedaPt]  = useState('');
  const [relacionesPt, setRelacionesPt] = useState<RelacionMpPt[]>([]);
  const [loadingRels,  setLoadingRels]  = useState(false);

  // Requerimientos
  const [reqs,        setReqs]        = useState<RequerimientoMaterial[]>([]);
  const [ordenCreada, setOrdenCreada] = useState<OrdenProduccion | null>(null);

  // Form ejecutar
  const [cantProd, setCantProd] = useState('');

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      produccionService.listarOrdenes(),
      catalogoService.productosTerminados(),
    ]).then(([o, p]) => {
      if (o.status === 'fulfilled') setOrdenes(o.value);
      if (p.status === 'fulfilled') setProductos(p.value);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  // Preview de ingredientes al seleccionar producto
  useEffect(() => {
    if (!ptId) { setRelacionesPt([]); return; }
    setLoadingRels(true);
    catalogoService.relacionesMpPt(parseInt(ptId))
      .then(setRelacionesPt)
      .catch(() => setRelacionesPt([]))
      .finally(() => setLoadingRels(false));
  }, [ptId]);

  /* ── Handlers ── */

  const abrirCrear = () => {
    setPtId(''); setCantidad('');
    const now = new Date();
    setFecha(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setMsgErr(''); setStockErr(null);
    setRelacionesPt([]);
    setBusquedaPt('');
    setModal('crear');
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      const orden = await produccionService.crearOrden({
        producto_terminado_id: parseInt(ptId),
        cantidad_planificada:  parseFloat(cantidad),
        fecha_planificada:     fecha,
      });
      setOrdenCreada(orden);
      setReqs(orden.requerimientos ?? []);
      setModal('requerimientos');
      cargar();
    } catch (err: unknown) {
      const detail = err instanceof ApiError
        ? (err.data as { errors?: StockErrorData } | undefined)?.errors
        : undefined;
      if (detail?.materia_prima) {
        setStockErr(detail);
      } else {
        setMsgErr(parseApiError((err as Error).message ?? 'Error al crear la orden'));
      }
    } finally {
      setEnviando(false);
    }
  };

  const handleVerReqs = async (o: OrdenProduccion) => {
    setMsgErr('');
    try {
      const detalle = await produccionService.verOrden(o.id) as OrdenProduccion & { requerimientos?: RequerimientoMaterial[] };
      setOrdenCreada(detalle);
      setReqs(detalle.requerimientos ?? []);
      setModal('requerimientos');
    } catch {
      setMsgErr('Error al cargar los ingredientes');
    }
  };

  const handleEjecutar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await produccionService.ejecutar(selected!.id, parseFloat(cantProd));
      setMsgOk(`Producción ejecutada — Orden #${selected!.id} · PT creado en Planta de Producción.`);
      setModal(null); cargar();
    } catch (err: unknown) {
      const detail = err instanceof ApiError
        ? (err.data as { errors?: StockErrorData } | undefined)?.errors
        : undefined;
      if (detail?.materia_prima) {
        setStockErr(detail);
      } else {
        setMsgErr(parseApiError((err as Error).message ?? 'Error al ejecutar la producción'));
      }
    } finally {
      setEnviando(false);
    }
  };

  const handleTrasladar = async () => {
    setEnviando(true); setMsgErr('');
    try {
      await produccionService.trasladarPt(selected!.id);
      setMsgOk(`Traslado completado — Orden #${selected!.id} · PT en Bodega de Ventas, listo para despacho.`);
      setModal(null); cargar();
    } catch (err: unknown) {
      setMsgErr(parseApiError((err as Error).message ?? 'Error al trasladar el PT'));
    } finally {
      setEnviando(false);
    }
  };

  const handleAnular = async () => {
    setEnviando(true); setMsgErr('');
    try {
      await produccionService.anular(selected!.id);
      setMsgOk(`Orden #${selected!.id} anulada.`);
      setModal(null); cargar();
    } catch (err: unknown) {
      setMsgErr((err as Error).message ?? 'Error al anular');
    } finally {
      setEnviando(false);
    }
  };

  /* ── Agrupación ── */
  const pendientes  = ordenes.filter(o => o.estado === 'pendiente');
  const producidos  = ordenes.filter(o => o.estado === 'producido');
  const completadas = ordenes.filter(o => o.estado === 'completada');
  const anuladas    = ordenes.filter(o => o.estado === 'anulada');

  const cardProps = (o: OrdenProduccion) => ({
    orden:       o,
    onVerReqs:   handleVerReqs,
    onEjecutar:  (ord: OrdenProduccion) => { setSelected(ord); setCantProd(String(Number(ord.cantidad_planificada))); setMsgErr(''); setStockErr(null); setModal('ejecutar'); },
    onTrasladar: (ord: OrdenProduccion) => { setSelected(ord); setMsgErr(''); setModal('traslado'); },
    onAnular:    (ord: OrdenProduccion) => { setSelected(ord); setMsgErr(''); setModal('anular'); },
  });

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Órdenes de Producción</h1>
          <p className="text-sm text-slate-400 mt-0.5">{ordenes.length} órdenes en total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={abrirCrear}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-all active:scale-95"
            style={{ background: 'var(--primary)' }}>
            <Plus size={15} />
            Nueva orden
          </button>
        </div>
      </div>

      {/* Feedback */}
      {msgOk && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 font-medium">{msgOk}</p>
          <button onClick={() => setMsgOk('')} className="ml-auto text-green-500 hover:text-green-700">
            <X size={14} />
          </button>
        </div>
      )}
      {msgErr && !modal && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{msgErr}</p>
        </div>
      )}

      {/* Resumen pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pendientes',    count: pendientes.length,  color: 'text-amber-600', bg: 'bg-amber-50'  },
          { label: 'PT en planta',  count: producidos.length,  color: 'text-blue-600',  bg: 'bg-blue-50'   },
          { label: 'Completadas',   count: completadas.length, color: 'text-green-600', bg: 'bg-green-50'  },
          { label: 'Anuladas',      count: anuladas.length,    color: 'text-slate-500', bg: 'bg-slate-50'  },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${bg}`}>
              <ChefHat size={14} className={color} />
            </div>
            <div className={`text-2xl font-bold tabular-nums ${color}`}>{count}</div>
            <div className="text-xs font-medium text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="space-y-8">

          {/* Sección: Pendientes */}
          {pendientes.length > 0 && (
            <Section
              title="Pendientes de ejecutar"
              count={pendientes.length}
              badge="amber"
              hint="Estas órdenes están planificadas. Ejecuta la producción para descontar MP y crear el PT.">
              {pendientes.map(o => <OrderCard key={o.id} {...cardProps(o)} />)}
            </Section>
          )}

          {/* Sección: PT en planta */}
          {producidos.length > 0 && (
            <Section
              title="PT en Planta — listos para trasladar"
              count={producidos.length}
              badge="blue"
              hint="La producción fue ejecutada. Traslada el PT a la Bodega de Ventas para habilitarlo al despacho.">
              {producidos.map(o => <OrderCard key={o.id} {...cardProps(o)} />)}
            </Section>
          )}

          {/* Sección: Completadas */}
          {completadas.length > 0 && (
            <Section
              title="Completadas"
              count={completadas.length}
              badge="green"
              hint="PT trasladado a Ventas. Para despacharlo ve al módulo de Despachos.">
              {completadas.map(o => <OrderCard key={o.id} {...cardProps(o)} />)}
            </Section>
          )}

          {/* Sección: Anuladas */}
          {anuladas.length > 0 && (
            <div>
              <button
                onClick={() => setMostrarAnuladas(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors mb-3">
                <span>{mostrarAnuladas ? '▾' : '▸'}</span>
                Anuladas ({anuladas.length})
              </button>
              {mostrarAnuladas && (
                <div className="space-y-3">
                  {anuladas.map(o => <OrderCard key={o.id} {...cardProps(o)} />)}
                </div>
              )}
            </div>
          )}

          {ordenes.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
              <ChefHat size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No hay órdenes aún</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Crea una nueva orden para comenzar el ciclo de producción</p>
              <button onClick={abrirCrear}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'var(--primary)' }}>
                <Plus size={14} />
                Nueva orden
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Crear orden ── */}
      {modal === 'crear' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 flex flex-col"
            style={{ maxHeight: '88vh' }}>

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">Nueva Orden de Producción</h2>
                <p className="text-xs text-slate-400 mt-0.5">Paso 1 de 4 — Planificar</p>
              </div>
              <button onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={15} className="text-slate-400" />
              </button>
            </div>

            {/* Cuerpo — un solo scroll */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Paso A: elegir producto */}
              {!ptId ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Producto a producir
                  </p>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={busquedaPt}
                      onChange={e => setBusquedaPt(e.target.value)}
                      autoFocus
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:bg-white focus:border-slate-300 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {productos
                      .filter(p => p.activo && p.nombre.toLowerCase().includes(busquedaPt.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPtId(String(p.id))}
                          className="text-left px-3 py-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all group">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                            style={{ background: 'rgba(139,35,35,0.07)' }}>
                            <ChefHat size={14} style={{ color: 'var(--primary)' }} />
                          </div>
                          <div className="text-sm font-semibold text-slate-700 leading-tight truncate">{p.nombre}</div>
                          {p.unidad_medida && (
                            <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">
                              {p.unidad_medida.nombre}
                            </div>
                          )}
                        </button>
                      ))}
                    {productos.filter(p => p.activo && p.nombre.toLowerCase().includes(busquedaPt.toLowerCase())).length === 0 && (
                      <p className="col-span-3 text-xs text-slate-400 text-center py-8">Sin resultados</p>
                    )}
                  </div>
                </div>
              ) : (() => {
                const pt      = productos.find(p => String(p.id) === ptId);
                const cantNum = parseFloat(cantidad) || 0;
                const unidad  = pt?.unidad_medida?.nombre ?? '';

                return (
                  <div className="space-y-4">

                    {/* Producto seleccionado */}
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(139,35,35,0.1)' }}>
                        <ChefHat size={16} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{pt?.nombre}</p>
                        {pt?.unidad_medida && (
                          <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">{pt.unidad_medida.nombre}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => { setPtId(''); setBusquedaPt(''); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0">
                        <X size={12} />
                        Cambiar
                      </button>
                    </div>

                    {stockErr && <StockErrorBox err={stockErr} />}
                    {msgErr && <ErrBox msg={msgErr} />}

                    <form onSubmit={handleCrear} className="space-y-4">

                      {/* Cantidad + fecha */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Cantidad a producir
                          </label>
                          <div className="flex rounded-lg border border-slate-200 overflow-hidden focus-within:ring-2"
                            style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}>
                            <input
                              type="number"
                              step={unidadAdmiteDecimales(unidad) ? '0.001' : '1'}
                              min={unidadAdmiteDecimales(unidad) ? '0.001' : '1'}
                              value={cantidad} onChange={e => setCantidad(e.target.value)}
                              placeholder="0" autoFocus
                              className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white min-w-0"
                              required />
                            {unidad && (
                              <span className="px-3 py-2.5 text-xs text-slate-500 font-medium bg-slate-50 border-l border-slate-200 flex items-center flex-shrink-0">
                                {unidad}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Fecha planificada
                          </label>
                          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                            style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                            required />
                        </div>
                      </div>

                      {/* Ingredientes requeridos */}
                      <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Ingredientes requeridos
                          </p>
                          {cantNum > 0 && (
                            <span className="text-xs text-slate-400">
                              para <strong className="text-slate-600">{formatCantidad(cantNum, unidad)}</strong>
                            </span>
                          )}
                        </div>
                        {loadingRels ? (
                          <div className="py-6 flex justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent"
                              style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                          </div>
                        ) : relacionesPt.length === 0 ? (
                          <div className="py-5 text-center">
                            <p className="text-xs text-slate-400">Sin ingredientes configurados</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {relacionesPt.map(r => {
                              const total = cantNum > 0 ? r.cantidad_requerida * cantNum : null;
                              return (
                                <div key={r.materia_prima_id}
                                  className="flex items-center justify-between px-4 py-2.5">
                                  <span className="text-xs font-medium text-slate-600 truncate flex-1 mr-3">
                                    {r.materia_prima_nombre}
                                  </span>
                                  <div className="flex-shrink-0">
                                    {total != null ? (
                                      <span className="text-xs font-semibold tabular-nums"
                                        style={{ color: 'var(--primary)' }}>
                                        {formatCantidad(total, r.unidad_medida?.nombre)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400 tabular-nums">
                                        × {formatCantidad(r.cantidad_requerida, r.unidad_medida?.nombre)} / ud
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => setModal(null)}
                          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                          Cancelar
                        </button>
                        <button type="submit" disabled={enviando || !ptId || !cantidad || !fecha}
                          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-all"
                          style={{ background: 'var(--primary)' }}>
                          {enviando ? 'Creando…' : 'Crear orden'}
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Ingredientes requeridos ── */}
      {modal === 'requerimientos' && ordenCreada && (
        <ModalShell
          title={`Ingredientes requeridos`}
          subtitle={`Orden #${ordenCreada.id} · ${ordenCreada.producto_terminado?.nombre}`}
          onClose={() => setModal(null)}>

          <div className="flex items-start gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl mb-4">
            <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">
              Orden creada. Para producir{' '}
              <strong>{formatCantidad(ordenCreada.cantidad_planificada, ordenCreada.producto_terminado?.unidad)}</strong>
              {' '}el sistema necesita:
            </p>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Materia Prima</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reqs.map(r => (
                  <tr key={r.materia_prima_id}>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{r.materia_prima}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums"
                      style={{ color: 'var(--primary)' }}>
                      {formatCantidad(r.cantidad_requerida, r.unidad_medida)}
                    </td>
                  </tr>
                ))}
                {reqs.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-400">
                      Sin requerimientos calculados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 mb-4">
            Estas cantidades se descontarán <strong>automáticamente</strong> de Bodega Principal al ejecutar (FEFO — primero vence, primero sale).
          </p>

          <div className="flex gap-2">
            <button onClick={() => setModal(null)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              Ejecutar más tarde
            </button>
            <button onClick={() => {
              setSelected(ordenCreada);
              setCantProd(String(Number(ordenCreada.cantidad_planificada)));
              setMsgErr(''); setStockErr(null);
              setModal('ejecutar');
            }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: '#2563eb' }}>
              ▶ Ejecutar ahora
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Modal: Ejecutar producción ── */}
      {modal === 'ejecutar' && selected && (
        <ModalShell
          title="Ejecutar Producción"
          subtitle={`Paso 2 de 4 — Producir · Orden #${selected.id}`}
          onClose={() => setModal(null)}>

          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Producto</span>
              <span className="font-semibold text-slate-800">{selected.producto_terminado?.nombre}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-slate-500">Cantidad planificada</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {formatCantidad(selected.cantidad_planificada, selected.producto_terminado?.unidad)}
              </span>
            </div>
          </div>

          {stockErr && <StockErrorBox err={stockErr} />}
          {msgErr && <ErrBox msg={msgErr} />}

          <form onSubmit={handleEjecutar} className="space-y-4">
            <Field label={`Cantidad realmente producida${selected.producto_terminado?.unidad ? ` (${selected.producto_terminado.unidad})` : ''}`}>
              {(() => {
                const decimales = unidadAdmiteDecimales(selected.producto_terminado?.unidad);
                return (
                  <input
                    type="number"
                    step={decimales ? '0.001' : '1'}
                    min={decimales ? '0.001' : '1'}
                    value={cantProd}
                    onChange={e => setCantProd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                    required
                  />
                );
              })()}
              <p className="text-xs text-slate-400 mt-1.5">
                Puede diferir de lo planificado. El consumo de MP se ajustará a la cantidad real.
              </p>
            </Field>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
              Las materias primas se descontarán de Bodega Principal (FEFO). Si no hay stock suficiente, la operación será rechazada con detalle del faltante.
            </p>
            <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Ejecutar producción" />
          </form>
        </ModalShell>
      )}

      {/* ── Modal: Trasladar PT ── */}
      {modal === 'traslado' && selected && (
        <ModalShell
          title="Trasladar PT a Ventas"
          subtitle={`Paso 3 de 4 — Trasladar · Orden #${selected.id}`}
          onClose={() => setModal(null)}>

          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Producto</span>
              <span className="font-semibold text-slate-800">{selected.producto_terminado?.nombre}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-slate-500">Cantidad producida</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {formatCantidad(
                  selected.cantidad_producida ?? selected.cantidad_planificada,
                  selected.producto_terminado?.unidad
                )}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl mb-4">
            <Truck size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              El PT pasará de <strong>Planta de Producción</strong> a <strong>Bodega de Ventas</strong>, quedando disponible para despacho a clientes.
            </p>
          </div>

          {msgErr && <ErrBox msg={msgErr} />}

          <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Confirmar traslado" onClick={handleTrasladar} />
        </ModalShell>
      )}

      {/* ── Modal: Anular ── */}
      {modal === 'anular' && selected && (
        <ModalShell
          title="Anular Orden"
          subtitle={`Orden #${selected.id} · ${selected.producto_terminado?.nombre}`}
          onClose={() => setModal(null)}>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-4">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Esta acción es <strong>irreversible</strong>. La orden pasará a estado anulado y no podrá ser recuperada.
            </p>
          </div>

          {msgErr && <ErrBox msg={msgErr} />}

          <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Sí, anular orden" danger onClick={handleAnular} />
        </ModalShell>
      )}
    </div>
  );
}

/* ─────────────── Componentes auxiliares ─────────────── */

function Section({
  title, count, badge, hint, children,
}: {
  title: string; count: number; badge: 'amber' | 'blue' | 'green';
  hint?: string; children: React.ReactNode;
}) {
  const colors = {
    amber: 'bg-amber-50 text-amber-700',
    blue:  'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[badge]}`}>
          {count}
        </span>
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ModalShell({
  title, subtitle, onClose, children,
}: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
            <X size={15} className="text-slate-400" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function StockErrorBox({ err }: { err: StockErrorData }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 overflow-hidden mb-4">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100 border-b border-red-200">
        <AlertTriangle size={13} className="text-red-600 flex-shrink-0" />
        <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Stock insuficiente — no se puede crear la orden</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-red-700">
          No hay suficiente <strong>{err.materia_prima}</strong> en Bodega Principal para esta producción.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'Requerido',  val: err.requerida,  cls: 'text-slate-700' },
            { label: 'Disponible', val: err.disponible, cls: 'text-amber-600'  },
            { label: 'Faltante',   val: err.faltante,   cls: 'text-red-700'   },
          ] as { label: string; val: number; cls: string }[]).map(({ label, val, cls }) => (
            <div key={label} className="text-center px-2 py-2 rounded-lg bg-white border border-red-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className={`text-sm font-black tabular-nums ${cls}`}>{formatCantidad(val, err.unidad_medida)}</p>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
          <span className="text-amber-500 text-xs mt-0.5 flex-shrink-0">💡</span>
          <p className="text-xs text-amber-800">
            <strong>Solución:</strong> Recibe más <strong>{err.materia_prima}</strong> en{' '}
            <Link href="/dashboard/recepciones" className="underline font-semibold hover:text-amber-900">
              Recepciones → Nueva orden de compra
            </Link>
            , o reduce la cantidad a producir.
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200">
      <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700">{msg}</p>
    </div>
  );
}

function ModalActions({
  onCancel, loading, label, danger, onClick,
}: {
  onCancel: () => void; loading: boolean; label: string; danger?: boolean; onClick?: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onCancel}
        className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
        Cancelar
      </button>
      <button
        type={onClick ? 'button' : 'submit'}
        onClick={onClick}
        disabled={loading}
        className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-all"
        style={{ background: danger ? '#dc2626' : 'var(--primary)' }}>
        {loading ? 'Procesando…' : label}
      </button>
    </div>
  );
}
