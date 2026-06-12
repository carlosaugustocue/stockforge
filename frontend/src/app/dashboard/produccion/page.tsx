'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Play, Truck, X, AlertTriangle, ClipboardList } from 'lucide-react';
import { produccionService, type OrdenProduccion, type RequerimientoMaterial } from '@/services/produccion.service';
import { catalogoService, type ProductoTerminado } from '@/services/catalogo.service';

const ESTADO_BADGE: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  producido:  'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  anulada:    'bg-red-100 text-red-700',
};

type Modal = 'crear' | 'requerimientos' | 'ejecutar' | 'anular' | null;

export default function ProduccionPage() {
  const [ordenes,   setOrdenes]   = useState<OrdenProduccion[]>([]);
  const [productos, setProductos] = useState<ProductoTerminado[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<Modal>(null);
  const [selected,  setSelected]  = useState<OrdenProduccion | null>(null);
  const [enviando,  setEnviando]  = useState(false);
  const [msgOk,     setMsgOk]     = useState('');
  const [msgErr,    setMsgErr]    = useState('');

  // Form crear
  const [ptId,         setPtId]         = useState('');
  const [cantidad,     setCantidad]      = useState('');
  const [fecha,        setFecha]         = useState('');
  // Requerimientos calculados
  const [reqs,         setReqs]          = useState<RequerimientoMaterial[]>([]);
  const [ordenCreada,  setOrdenCreada]   = useState<OrdenProduccion | null>(null);
  // Form ejecutar
  const [cantProd,  setCantProd]  = useState('');

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

  const abrirCrear = () => {
    setPtId(''); setCantidad(''); setFecha(''); setMsgErr('');
    setModal('crear');
  };

  const abrirEjecutar = (o: OrdenProduccion) => {
    setSelected(o);
    setCantProd(String(o.cantidad_planificada));
    setMsgErr('');
    setModal('ejecutar');
  };

  const abrirAnular = (o: OrdenProduccion) => {
    setSelected(o); setMsgErr('');
    setModal('anular');
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
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleEjecutar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await produccionService.ejecutar(selected!.id, parseFloat(cantProd));
      setMsgOk(`Producción ejecutada para la orden #${selected!.id}.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleTrasladar = async (o: OrdenProduccion) => {
    if (!confirm(`¿Trasladar PT de la orden #${o.id} a Bodega de Ventas?`)) return;
    setMsgOk(''); setMsgErr('');
    try {
      await produccionService.trasladarPt(o.id);
      setMsgOk(`Traslado de PT registrado para la orden #${o.id}.`);
      cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error al trasladar'); }
  };

  const handleAnular = async () => {
    setEnviando(true); setMsgErr('');
    try {
      await produccionService.anular(selected!.id);
      setMsgOk(`Orden #${selected!.id} anulada.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Órdenes de Producción
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {ordenes.length} órdenes en total
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white"
            style={{ background: 'var(--secondary)' }}>
            <Plus size={13} />
            Nueva orden
          </button>
        </div>
      </div>

      {msgOk && <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium">{msgOk}</div>}
      {msgErr && !modal && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>}

      {/* Guía de flujo */}
      <div className="p-4 rounded-xl border-2 border-black/5 text-xs flex gap-6 flex-wrap" style={{ background: 'var(--bg-left)', color: 'var(--text-muted)' }}>
        <span><strong style={{ color: 'var(--text-main)' }}>1. Crear</strong> → Planifica</span>
        <span>→</span>
        <span><strong style={{ color: 'var(--text-main)' }}>2. Ejecutar</strong> → Descuenta MP, crea lote PT en Planta</span>
        <span>→</span>
        <span><strong style={{ color: 'var(--text-main)' }}>3. Trasladar PT</strong> → Mueve PT a Bodega Ventas</span>
        <span>→</span>
        <span><strong style={{ color: 'var(--text-main)' }}>4. Despachar</strong> → Desde módulo Despachos</span>
      </div>

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/5">
                  {['#', 'Producto', 'Planificado', 'Producido', 'Fecha', 'Estado', 'Usuario', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenes.map(o => (
                  <tr key={o.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                    <td className="px-4 py-3 font-black" style={{ color: 'var(--text-muted)' }}>#{o.id}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-main)' }}>{o.producto_terminado?.nombre}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-main)' }}>{o.cantidad_planificada}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-main)' }}>{o.cantidad_producida ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{o.fecha_planificada}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ESTADO_BADGE[o.estado] ?? ''}`}>
                        {o.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{o.usuario?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {o.estado === 'pendiente' && (
                          <>
                            <button onClick={async () => {
                              const detalle = await produccionService.verOrden(o.id) as OrdenProduccion;
                              setOrdenCreada(detalle);
                              setReqs((detalle as OrdenProduccion & { requerimientos?: RequerimientoMaterial[] }).requerimientos ?? []);
                              setMsgErr('');
                              setModal('requerimientos');
                            }}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase text-white transition hover:opacity-80 bg-gray-500"
                              title="Ver ingredientes calculados">
                              <ClipboardList size={9} /> Ingredientes
                            </button>
                            <button onClick={() => abrirEjecutar(o)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase text-white transition hover:opacity-80"
                              style={{ background: '#2563eb' }} title="Ejecutar producción">
                              <Play size={9} /> Ejecutar
                            </button>
                            <button onClick={() => abrirAnular(o)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase text-white transition hover:opacity-80 bg-red-500"
                              title="Anular">
                              <X size={9} /> Anular
                            </button>
                          </>
                        )}
                        {o.estado === 'producido' && (
                          <>
                            <button onClick={() => handleTrasladar(o)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase text-white transition hover:opacity-80"
                              style={{ background: '#16a34a' }} title="Trasladar PT a Ventas">
                              <Truck size={9} /> Trasladar PT
                            </button>
                            <button onClick={() => abrirAnular(o)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase text-white transition hover:opacity-80 bg-red-500"
                              title="Anular">
                              <X size={9} /> Anular
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ordenes.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                No hay órdenes. Crea una con <strong>Nueva orden</strong>.
              </div>
            )}
          </div>
        )}

      {/* Modal — Requerimientos calculados */}
      {modal === 'requerimientos' && ordenCreada && (
        <ModalShell title={`Ingredientes — Orden #${ordenCreada.id}`} onClose={() => setModal(null)}>
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium">
            Orden creada. Para producir <strong>{ordenCreada.cantidad_planificada}</strong> unidades de{' '}
            <strong>{ordenCreada.producto_terminado?.nombre}</strong> el sistema necesita:
          </div>

          <div className="rounded-xl border-2 border-black/5 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/5">
                  {['Materia Prima', 'Cantidad requerida'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reqs.map(r => (
                  <tr key={r.materia_prima_id} className="border-b border-black/5">
                    <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--text-main)' }}>{r.materia_prima}</td>
                    <td className="px-4 py-2.5 font-black" style={{ color: 'var(--primary)' }}>
                      {r.cantidad_requerida.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
                {reqs.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    Sin requerimientos calculados.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Estas cantidades se descontarán <strong>automáticamente</strong> de Bodega Principal al ejecutar la orden (FEFO — primero vence, primero sale). No necesitas hacer traslados manuales de MP.
          </p>

          <div className="flex gap-3">
            <button onClick={() => setModal(null)}
              className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              Cerrar
            </button>
            <button onClick={() => { setSelected(ordenCreada); setCantProd(String(ordenCreada.cantidad_planificada)); setMsgErr(''); setModal('ejecutar'); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white hover:opacity-90 transition-all"
              style={{ background: '#2563eb' }}>
              Ejecutar ahora
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal — Crear orden */}
      {modal === 'crear' && (
        <ModalShell title="Nueva Orden de Producción" onClose={() => setModal(null)}>
          {msgErr && <ErrBox msg={msgErr} />}
          <form onSubmit={handleCrear} className="space-y-4">
            <Field label="Producto terminado *">
              <select value={ptId} onChange={e => setPtId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required>
                <option value="">— Seleccionar —</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
            <Field label="Cantidad a producir *">
              <input type="number" step="0.001" min="0.001" value={cantidad} onChange={e => setCantidad(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
            </Field>
            <Field label="Fecha planificada *">
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
            </Field>
            <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Crear orden" />
          </form>
        </ModalShell>
      )}

      {/* Modal — Ejecutar */}
      {modal === 'ejecutar' && selected && (
        <ModalShell title={`Ejecutar Producción — Orden #${selected.id}`} onClose={() => setModal(null)}>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Producto: <strong style={{ color: 'var(--text-main)' }}>{selected.producto_terminado?.nombre}</strong>
            {' '}· Planificado: <strong style={{ color: 'var(--text-main)' }}>{selected.cantidad_planificada}</strong>
          </p>
          {msgErr && <ErrBox msg={msgErr} />}
          <form onSubmit={handleEjecutar} className="space-y-4">
            <Field label="Cantidad producida *">
              <input type="number" step="0.001" min="0.001" value={cantProd} onChange={e => setCantProd(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
            </Field>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Se descontarán las materias primas de Bodega Principal (FEFO). Si no hay stock suficiente, la operación será rechazada con detalle.
            </p>
            <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Ejecutar producción" />
          </form>
        </ModalShell>
      )}

      {/* Modal — Anular */}
      {modal === 'anular' && selected && (
        <ModalShell title={`Anular Orden #${selected.id}`} onClose={() => setModal(null)}>
          <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-4">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              ¿Confirmas que deseas anular la orden <strong>#{selected.id}</strong> — {selected.producto_terminado?.nombre}?
              Esta acción es irreversible.
            </p>
          </div>
          {msgErr && <ErrBox msg={msgErr} />}
          <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Sí, anular" danger onClick={handleAnular} />
        </ModalShell>
      )}
    </div>
  );
}

/* ── Componentes auxiliares ── */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-black/5 relative"
        style={{ background: 'var(--bg-right)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded hover:bg-black/10 transition-colors">
          <X size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
        <h2 className="text-lg font-black uppercase tracking-tight mb-5" style={{ color: 'var(--text-main)' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{msg}</div>;
}

function ModalActions({ onCancel, loading, label, danger, onClick }: {
  onCancel: () => void; loading: boolean; label: string; danger?: boolean; onClick?: () => void;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel}
        className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
        style={{ color: 'var(--text-muted)' }}>
        Cancelar
      </button>
      <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={loading}
        className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90 transition-all"
        style={{ background: danger ? '#dc2626' : 'var(--primary)' }}>
        {loading ? 'Procesando…' : label}
      </button>
    </div>
  );
}
