'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Plus, PackageCheck, X, Trash2 } from 'lucide-react';
import { recepcionesService, type OrdenPedido } from '@/services/recepciones.service';
import { catalogoService, type MateriaPrima } from '@/services/catalogo.service';

const ESTADO_BADGE: Record<string, string> = {
  pendiente:    'bg-yellow-100 text-yellow-700',
  en_recepcion: 'bg-blue-100 text-blue-700',
  cerrada:      'bg-green-100 text-green-700',
};
const ESTADO_LABEL: Record<string, string> = {
  pendiente:    'Pendiente',
  en_recepcion: 'En recepción',
  cerrada:      'Cerrada',
};

interface ItemRecepcion {
  materia_prima_id: string;
  cantidad: string;
  fecha_vencimiento: string;
}

type Modal = 'crear' | 'recibir' | null;

export default function RecepcionesPage() {
  const [ordenes,  setOrdenes]  = useState<OrdenPedido[]>([]);
  const [mps,      setMps]      = useState<MateriaPrima[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<Modal>(null);
  const [selected, setSelected] = useState<OrdenPedido | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msgOk,    setMsgOk]    = useState('');
  const [msgErr,   setMsgErr]   = useState('');

  // Form crear orden
  const [proveedor,     setProveedor]     = useState('');
  const [fechaEsperada, setFechaEsperada] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Form recibir
  const [items,        setItems]        = useState<ItemRecepcion[]>([{ materia_prima_id: '', cantidad: '', fecha_vencimiento: '' }]);
  const [obsRecepcion, setObsRecepcion] = useState('');

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      recepcionesService.listarOrdenes(),
      catalogoService.materiasPrimas(),
    ]).then(([o, m]) => {
      if (o.status === 'fulfilled') setOrdenes(o.value);
      if (m.status === 'fulfilled') setMps(m.value);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setProveedor(''); setFechaEsperada(''); setObservaciones(''); setMsgErr('');
    setModal('crear');
  };

  const abrirRecibir = (o: OrdenPedido) => {
    setSelected(o);
    setItems([{ materia_prima_id: '', cantidad: '', fecha_vencimiento: '' }]);
    setObsRecepcion('');
    setMsgErr('');
    setModal('recibir');
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await recepcionesService.crearOrden({
        proveedor,
        ...(fechaEsperada ? { fecha_esperada: fechaEsperada } : {}),
        ...(observaciones ? { observaciones }  : {}),
      });
      setMsgOk(`Orden a "${proveedor}" creada correctamente.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleRecibir = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      const itemsValidos = items
        .filter(i => i.materia_prima_id && i.cantidad)
        .map(i => ({
          materia_prima_id: parseInt(i.materia_prima_id),
          cantidad:         parseFloat(i.cantidad),
          ...(i.fecha_vencimiento ? { fecha_vencimiento: i.fecha_vencimiento } : {}),
        }));
      if (itemsValidos.length === 0) { setMsgErr('Agrega al menos un ítem.'); setEnviando(false); return; }
      await recepcionesService.registrarRecepcion(selected!.id, {
        items: itemsValidos,
        ...(obsRecepcion ? { observaciones: obsRecepcion } : {}),
      });
      setMsgOk(`Recepción registrada para la orden #${selected!.id}.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const cerrarOrden = async (id: number) => {
    try {
      await recepcionesService.actualizarOrden(id, { estado: 'cerrada' });
      setMsgOk(`Orden #${id} cerrada correctamente.`);
      cargar();
    } catch (err: unknown) {
      setMsgErr((err as Error).message ?? 'Error al cerrar la orden');
    }
  };

  const addItem = () => setItems(prev => [...prev, { materia_prima_id: '', cantidad: '', fecha_vencimiento: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ItemRecepcion, val: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Órdenes de Pedido
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

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/5">
                  {['#', 'Proveedor', 'Estado', 'Fecha esperada', 'Observaciones', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenes.map(o => (
                  <tr key={o.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                    <td className="px-5 py-3 font-black" style={{ color: 'var(--text-muted)' }}>#{o.id}</td>
                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>{o.proveedor}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ESTADO_BADGE[o.estado] ?? ''}`}>
                        {ESTADO_LABEL[o.estado] ?? o.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{o.fecha_esperada ?? '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{o.observaciones ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {(o.estado === 'pendiente' || o.estado === 'en_recepcion') && (
                          <button onClick={() => abrirRecibir(o)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase text-white transition hover:opacity-80"
                            style={{ background: '#16a34a' }}>
                            <PackageCheck size={10} /> Registrar recepción
                          </button>
                        )}
                        {o.estado === 'en_recepcion' && (
                          <button onClick={() => cerrarOrden(o.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase text-white transition hover:opacity-80"
                            style={{ background: '#2563eb' }}>
                            Cerrar orden
                          </button>
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

      {/* Modal — Crear orden */}
      {modal === 'crear' && (
        <ModalShell title="Nueva Orden de Pedido" onClose={() => setModal(null)}>
          {msgErr && <ErrBox msg={msgErr} />}
          <form onSubmit={handleCrear} className="space-y-4">
            <Field label="Proveedor *">
              <input type="text" placeholder="Nombre del proveedor" value={proveedor}
                onChange={e => setProveedor(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
            </Field>
            <Field label="Fecha esperada de llegada">
              <input type="date" value={fechaEsperada} onChange={e => setFechaEsperada(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
            </Field>
            <Field label="Observaciones / materiales solicitados">
              <textarea placeholder="Ej: Harina de trigo 500kg, Azúcar 200kg…" value={observaciones}
                onChange={e => setObservaciones(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
            </Field>
            <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Crear orden" />
          </form>
        </ModalShell>
      )}

      {/* Modal — Registrar recepción */}
      {modal === 'recibir' && selected && (
        <ModalShell title={`Registrar Recepción — Orden #${selected.id}`} onClose={() => setModal(null)} wide>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Proveedor: <strong style={{ color: 'var(--text-main)' }}>{selected.proveedor}</strong>
          </p>
          {msgErr && <ErrBox msg={msgErr} />}
          <form onSubmit={handleRecibir} className="space-y-4">
            {/* Ítems */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Materias primas recibidas *
                </label>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded text-white"
                  style={{ background: 'var(--primary)' }}>
                  <Plus size={10} /> Agregar ítem
                </button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                  <div>
                    <select value={item.materia_prima_id}
                      onChange={e => updateItem(i, 'materia_prima_id', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border-2 border-black/10 text-xs font-bold focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required>
                      <option value="">— Materia prima —</option>
                      {mps.map(mp => <option key={mp.id} value={mp.id}>{mp.nombre} ({mp.unidad_medida?.nombre ?? ''})</option>)}
                    </select>
                  </div>
                  <div>
                    <input type="number" step="0.001" min="0.001" placeholder="Cantidad"
                      value={item.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)}
                      className="w-28 px-2 py-2 rounded-lg border-2 border-black/10 text-xs focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
                  </div>
                  <div>
                    <input type="date" title="Fecha vencimiento (opcional)"
                      value={item.fecha_vencimiento} onChange={e => updateItem(i, 'fecha_vencimiento', e.target.value)}
                      className="w-36 px-2 py-2 rounded-lg border-2 border-black/10 text-xs focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="p-2 rounded hover:bg-red-50 transition-colors text-red-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                La fecha de vencimiento es opcional — si se omite el lote queda sin fecha de caducidad.
              </p>
            </div>

            <Field label="Observaciones">
              <textarea placeholder="Notas sobre la recepción…" value={obsRecepcion}
                onChange={e => setObsRecepcion(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
            </Field>
            <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Registrar recepción" />
          </form>
        </ModalShell>
      )}
    </div>
  );
}

/* ── Componentes auxiliares ── */
function ModalShell({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`rounded-2xl shadow-2xl p-8 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} border-2 border-black/5 relative max-h-[90vh] overflow-y-auto`}
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
      <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
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
        style={{ color: 'var(--text-muted)' }}>Cancelar</button>
      <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={loading}
        className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90 transition-all"
        style={{ background: danger ? '#dc2626' : 'var(--primary)' }}>
        {loading ? 'Procesando…' : label}
      </button>
    </div>
  );
}
