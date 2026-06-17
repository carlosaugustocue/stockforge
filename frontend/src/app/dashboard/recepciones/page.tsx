'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Plus, PackageCheck, X, Trash2, Building2, Phone, Mail, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { recepcionesService, type OrdenPedido } from '@/services/recepciones.service';
import { proveedoresService, type Proveedor } from '@/services/proveedores.service';
import { catalogoService, type MateriaPrima } from '@/services/catalogo.service';
import { formatCantidad } from '@/lib/utils';
import { obtenerSesion } from '@/lib/session';

const ESTADO_LABEL: Record<string, string> = {
  pendiente:    'Pendiente',
  en_recepcion: 'En recepción',
  cerrada:      'Cerrada',
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  en_recepcion: 'bg-blue-100 text-blue-700 border-blue-200',
  cerrada:      'bg-green-100 text-green-700 border-green-200',
};

interface ItemOrden {
  materia_prima_id: string;
  cantidad_solicitada: string;
}

interface ItemRecepcion {
  materia_prima_id: string;
  cantidad: string;
  fecha_vencimiento: string;
}

type Modal = 'crear' | 'recibir' | null;

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function RecepcionesPage() {
  const searchParams = useSearchParams();
  const rolUsuario = obtenerSesion()?.usuario.rol ?? '';
  const puedeCrearOrden = rolUsuario === 'encargado_inventarios';

  const [ordenes,     setOrdenes]     = useState<OrdenPedido[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [mps,         setMps]         = useState<MateriaPrima[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<Modal>(null);
  const [selected,    setSelected]    = useState<OrdenPedido | null>(null);
  const [enviando,    setEnviando]    = useState(false);
  const [msgOk,       setMsgOk]       = useState('');
  const [msgErr,      setMsgErr]      = useState('');
  const [expandidas,  setExpandidas]  = useState<Set<number>>(new Set());

  // Form crear orden
  const [proveedorId,   setProveedorId]   = useState('');
  const [fechaEsperada, setFechaEsperada] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [itemsOrden,    setItemsOrden]    = useState<ItemOrden[]>([{ materia_prima_id: '', cantidad_solicitada: '' }]);

  // Form recibir
  const [itemsRecepcion, setItemsRecepcion] = useState<ItemRecepcion[]>([]);
  const [obsRecepcion,   setObsRecepcion]   = useState('');

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      recepcionesService.listarOrdenes(),
      proveedoresService.listar(),
      catalogoService.materiasPrimas(),
    ]).then(([o, p, m]) => {
      if (o.status === 'fulfilled') setOrdenes(o.value);
      if (p.status === 'fulfilled') setProveedores(p.value);
      if (m.status === 'fulfilled') setMps(m.value);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  // Si viene de alertas con ?mp_id y ?cantidad, abrir modal crear pre-llenado
  useEffect(() => {
    const mpId    = searchParams.get('mp_id');
    const cant    = searchParams.get('cantidad');
    if (mpId && !loading) {
      setItemsOrden([{ materia_prima_id: mpId, cantidad_solicitada: cant ?? '' }]);
      setModal('crear');
    }
  }, [loading, searchParams]);

  // Cuando se selecciona proveedor, sugerir sus MPs como ítems si la lista está vacía
  useEffect(() => {
    if (!proveedorId) return;
    const prov = proveedores.find(p => String(p.id) === proveedorId);
    if (prov && prov.materias_primas.length > 0 && itemsOrden.every(i => !i.materia_prima_id)) {
      setItemsOrden(prov.materias_primas.map(mp => ({
        materia_prima_id:    String(mp.id),
        cantidad_solicitada: '',
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedorId]);

  const toggleExpand = (id: number) => {
    setExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const abrirCrear = () => {
    setProveedorId(''); setFechaEsperada(today()); setObservaciones('');
    setItemsOrden([{ materia_prima_id: '', cantidad_solicitada: '' }]); setMsgErr('');
    setModal('crear');
  };

  const abrirRecibir = (o: OrdenPedido) => {
    setSelected(o);
    // Pre-llenar con ítems de la orden como sugerencia
    setItemsRecepcion(
      o.items.length > 0
        ? o.items.map(item => ({
            materia_prima_id:  String(item.materia_prima_id),
            cantidad:          String(item.cantidad_solicitada),
            fecha_vencimiento: '',
          }))
        : [{ materia_prima_id: '', cantidad: '', fecha_vencimiento: '' }]
    );
    setObsRecepcion('');
    setMsgErr('');
    setModal('recibir');
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      const items = itemsOrden
        .filter(i => i.materia_prima_id && i.cantidad_solicitada)
        .map(i => ({
          materia_prima_id:    parseInt(i.materia_prima_id),
          cantidad_solicitada: parseFloat(i.cantidad_solicitada),
        }));

      await recepcionesService.crearOrden({
        proveedor_id:  proveedorId ? parseInt(proveedorId) : undefined,
        fecha_esperada: fechaEsperada || undefined,
        observaciones:  observaciones || undefined,
        items:          items.length > 0 ? items : undefined,
      });

      const prov = proveedores.find(p => String(p.id) === proveedorId);
      setMsgOk(`Orden de compra creada${prov ? ` para ${prov.nombre}` : ''}.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleRecibir = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      const items = itemsRecepcion
        .filter(i => i.materia_prima_id && i.cantidad)
        .map(i => ({
          materia_prima_id: parseInt(i.materia_prima_id),
          cantidad:          parseFloat(i.cantidad),
          ...(i.fecha_vencimiento ? { fecha_vencimiento: i.fecha_vencimiento } : {}),
        }));
      if (items.length === 0) { setMsgErr('Agrega al menos un ítem recibido.'); setEnviando(false); return; }
      await recepcionesService.registrarRecepcion(selected!.id, {
        items,
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
      setMsgOk(`Orden #${id} cerrada.`);
      cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
  };

  // Ítems orden
  const addItemOrden    = () => setItemsOrden(p => [...p, { materia_prima_id: '', cantidad_solicitada: '' }]);
  const removeItemOrden = (i: number) => setItemsOrden(p => p.filter((_, idx) => idx !== i));
  const updateItemOrden = (i: number, f: keyof ItemOrden, v: string) =>
    setItemsOrden(p => p.map((item, idx) => idx === i ? { ...item, [f]: v } : item));

  // Ítems recepción
  const addItemRec    = () => setItemsRecepcion(p => [...p, { materia_prima_id: '', cantidad: '', fecha_vencimiento: '' }]);
  const removeItemRec = (i: number) => setItemsRecepcion(p => p.filter((_, idx) => idx !== i));
  const updateItemRec = (i: number, f: keyof ItemRecepcion, v: string) =>
    setItemsRecepcion(p => p.map((item, idx) => idx === i ? { ...item, [f]: v } : item));

  const activas  = ordenes.filter(o => o.estado !== 'cerrada');
  const cerradas = ordenes.filter(o => o.estado === 'cerrada');

  const proveedorSeleccionado = proveedores.find(p => String(p.id) === proveedorId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Órdenes de Compra
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {activas.length} orden{activas.length !== 1 ? 'es' : ''} activa{activas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          {puedeCrearOrden && (
            <button onClick={abrirCrear}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white"
              style={{ background: 'var(--secondary)' }}>
              <Plus size={13} /> Nueva orden de compra
            </button>
          )}
        </div>
      </div>

      {msgOk && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium flex items-center justify-between">
          {msgOk}
          <button onClick={() => setMsgOk('')}><X size={14} className="text-green-500" /></button>
        </div>
      )}
      {msgErr && !modal && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <>
          {activas.length === 0 && cerradas.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-black/10 py-16 text-center">
              <Package size={32} className="mx-auto mb-3 opacity-25" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-muted)' }}>No hay órdenes de compra</p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Crea una orden cuando necesites reabastecer materias primas</p>
              {puedeCrearOrden && (
                <button onClick={abrirCrear}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white"
                  style={{ background: 'var(--secondary)' }}>
                  <Plus size={14} /> Nueva orden de compra
                </button>
              )}
            </div>
          )}

          {activas.length > 0 && (
            <section>
              <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Órdenes activas — {activas.length}
              </h2>
              <div className="space-y-3">
                {activas.map(o => (
                  <OrdenCard key={o.id} orden={o}
                    expandida={expandidas.has(o.id)}
                    onToggle={() => toggleExpand(o.id)}
                    onRecibir={abrirRecibir}
                    onCerrar={cerrarOrden} />
                ))}
              </div>
            </section>
          )}

          {cerradas.length > 0 && (
            <section>
              <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Historial — {cerradas.length}
              </h2>
              <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
                {cerradas.map((o, idx) => (
                  <div key={o.id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx < cerradas.length - 1 ? 'border-b border-black/5' : ''}`}>
                    <span className="text-xs font-black w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>#{o.id}</span>
                    <Building2 size={13} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
                    <span className="font-bold text-sm flex-1 truncate" style={{ color: 'var(--text-main)' }}>
                      {o.proveedor || '—'}
                    </span>
                    <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                      {o.items.length} ítem{o.items.length !== 1 ? 's' : ''}
                    </span>
                    {o.fecha_esperada && (
                      <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>{o.fecha_esperada}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border flex-shrink-0 ${ESTADO_COLOR[o.estado] ?? ''}`}>
                      {ESTADO_LABEL[o.estado]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal — Crear orden de compra */}
      {modal === 'crear' && (
        <ModalShell title="Nueva Orden de Compra" onClose={() => setModal(null)} wide>
          {msgErr && <ErrBox msg={msgErr} />}
          <form onSubmit={handleCrear} className="space-y-5">

            {/* Proveedor */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Proveedor *
              </label>
              <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required>
                <option value="">— Seleccionar proveedor —</option>
                {proveedores.filter(p => p.activo).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {/* Info del proveedor seleccionado */}
              {proveedorSeleccionado && (
                <div className="mt-2 px-3 py-2 rounded-lg border border-black/5 text-xs flex flex-wrap gap-x-4 gap-y-1"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-muted)' }}>
                  {proveedorSeleccionado.contacto_nombre && (
                    <span className="flex items-center gap-1"><Package size={10} /> {proveedorSeleccionado.contacto_nombre}</span>
                  )}
                  {proveedorSeleccionado.telefono && (
                    <span className="flex items-center gap-1"><Phone size={10} /> {proveedorSeleccionado.telefono}</span>
                  )}
                  {proveedorSeleccionado.email && (
                    <span className="flex items-center gap-1"><Mail size={10} /> {proveedorSeleccionado.email}</span>
                  )}
                </div>
              )}
            </div>

            {/* Fecha esperada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Fecha esperada de entrega
                </label>
                <input type="date" value={fechaEsperada} onChange={e => setFechaEsperada(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Observaciones
                </label>
                <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                  placeholder="Notas internas…"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
              </div>
            </div>

            {/* Ítems de la orden */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Materias primas solicitadas
                </label>
                <button type="button" onClick={addItemOrden}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded text-white"
                  style={{ background: 'var(--primary)' }}>
                  <Plus size={10} /> Agregar ítem
                </button>
              </div>
              <div className="space-y-2">
                {itemsOrden.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={item.materia_prima_id}
                      onChange={e => updateItemOrden(i, 'materia_prima_id', e.target.value)}
                      className="flex-1 px-2 py-2 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }}>
                      <option value="">— Materia prima —</option>
                      {/* Sugerir primero las MPs del proveedor seleccionado */}
                      {proveedorSeleccionado?.materias_primas.length ? (
                        <>
                          <optgroup label={`Suministradas por ${proveedorSeleccionado.nombre}`}>
                            {proveedorSeleccionado.materias_primas.map(mp => (
                              <option key={mp.id} value={mp.id}>{mp.nombre}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Otras">
                            {mps.filter(mp => !proveedorSeleccionado.materias_primas.find(p => p.id === mp.id))
                              .map(mp => <option key={mp.id} value={mp.id}>{mp.nombre}</option>)}
                          </optgroup>
                        </>
                      ) : (
                        mps.map(mp => <option key={mp.id} value={mp.id}>{mp.nombre}</option>)
                      )}
                    </select>
                    <input type="number" step="0.001" min="0.001"
                      placeholder="Cantidad" value={item.cantidad_solicitada}
                      onChange={e => updateItemOrden(i, 'cantidad_solicitada', e.target.value)}
                      className="w-28 px-2 py-2 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
                    {itemsOrden.length > 1 && (
                      <button type="button" onClick={() => removeItemOrden(i)}
                        className="p-2 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Crear orden de compra" />
          </form>
        </ModalShell>
      )}

      {/* Modal — Registrar recepción */}
      {modal === 'recibir' && selected && (
        <ModalShell title={`Registrar Recepción — Orden #${selected.id}`} onClose={() => setModal(null)} wide>
          {/* Info del proveedor */}
          <div className="mb-4 p-3 rounded-xl border-2 border-black/5" style={{ background: 'var(--bg-left)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Proveedor</p>
            <p className="font-black text-base" style={{ color: 'var(--text-main)' }}>{selected.proveedor || '—'}</p>
            {selected.fecha_esperada && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Entrega esperada: <strong style={{ color: 'var(--text-main)' }}>{selected.fecha_esperada}</strong>
              </p>
            )}
          </div>

          {/* Ítems solicitados vs recibidos */}
          {selected.items.length > 0 && (
            <div className="mb-4 p-3 rounded-xl border-2 border-black/5" style={{ background: 'var(--bg-left)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Ítems solicitados en la orden
              </p>
              <div className="space-y-1">
                {selected.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-main)' }}>{item.materia_prima}</span>
                    <span className="font-black" style={{ color: 'var(--primary)' }}>
                      {formatCantidad(item.cantidad_solicitada, item.unidad_medida)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {msgErr && <ErrBox msg={msgErr} />}
          <form onSubmit={handleRecibir} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Materias primas recibidas *
                </label>
                <button type="button" onClick={addItemRec}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded text-white"
                  style={{ background: 'var(--primary)' }}>
                  <Plus size={10} /> Agregar ítem
                </button>
              </div>
              <div className="space-y-3">
                {itemsRecepcion.map((item, i) => {
                  const mpInfo        = mps.find(m => String(m.id) === item.materia_prima_id);
                  const unidad        = mpInfo?.unidad_medida?.nombre ?? '';
                  const itemSolicitado = selected?.items.find(si => String(si.materia_prima_id) === item.materia_prima_id);
                  return (
                    <div key={i} className="rounded-xl border-2 border-black/5 p-3 space-y-3" style={{ background: 'var(--bg-left)' }}>
                      {/* Fila superior: MP + botón eliminar */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                            Materia prima
                          </label>
                          <select value={item.materia_prima_id}
                            onChange={e => updateItemRec(i, 'materia_prima_id', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
                            style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }} required>
                            <option value="">— Seleccionar materia prima —</option>
                            {mps.map(mp => (
                              <option key={mp.id} value={mp.id}>
                                {mp.nombre}{mp.unidad_medida ? ` (${mp.unidad_medida.nombre})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        {itemsRecepcion.length > 1 && (
                          <button type="button" onClick={() => removeItemRec(i)}
                            className="mt-6 p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Fila inferior: Cantidad + Fecha vencimiento */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                            Cantidad recibida{unidad ? ` (${unidad})` : ''} *
                          </label>
                          <div className="flex rounded-lg border-2 border-black/10 overflow-hidden focus-within:border-[var(--primary)]"
                            style={{ background: 'var(--bg-right)' }}>
                            <input type="number" step="0.001" min="0.001"
                              placeholder="0"
                              value={item.cantidad} onChange={e => updateItemRec(i, 'cantidad', e.target.value)}
                              className="flex-1 px-2.5 py-2 text-sm focus:outline-none bg-transparent"
                              required />
                            {unidad && (
                              <span className="px-2.5 py-2 text-xs font-bold border-l-2 border-black/10 flex items-center flex-shrink-0"
                                style={{ color: 'var(--text-muted)' }}>
                                {unidad}
                              </span>
                            )}
                          </div>
                          {itemSolicitado && (
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                              Solicitado: <strong style={{ color: 'var(--text-main)' }}>
                                {formatCantidad(itemSolicitado.cantidad_solicitada, itemSolicitado.unidad_medida ?? unidad)}
                              </strong>
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                            Fecha de vencimiento del lote
                          </label>
                          <input type="date"
                            value={item.fecha_vencimiento} onChange={e => updateItemRec(i, 'fecha_vencimiento', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                            style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }} />
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Opcional</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Package size={10} />
                Los lotes se crean automáticamente en Bodega Principal al registrar.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Observaciones de la recepción
              </label>
              <input type="text" placeholder="Estado del embalaje, discrepancias…"
                value={obsRecepcion} onChange={e => setObsRecepcion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
            </div>

            <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Registrar recepción" />
          </form>
        </ModalShell>
      )}
    </div>
  );
}

/* ── OrdenCard ── */

function OrdenCard({ orden, expandida, onToggle, onRecibir, onCerrar }: {
  orden: OrdenPedido;
  expandida: boolean;
  onToggle: () => void;
  onRecibir: (o: OrdenPedido) => void;
  onCerrar: (id: number) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
      {/* Header de la tarjeta */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--primary)18' }}>
          <Building2 size={16} style={{ color: 'var(--primary)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>#{orden.id}</span>
            <h3 className="font-black text-sm truncate" style={{ color: 'var(--text-main)' }}>
              {orden.proveedor || 'Sin proveedor'}
            </h3>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${ESTADO_COLOR[orden.estado] ?? ''}`}>
              {ESTADO_LABEL[orden.estado]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
            {orden.proveedor_detalle?.telefono && (
              <span className="flex items-center gap-1"><Phone size={9} /> {orden.proveedor_detalle.telefono}</span>
            )}
            {orden.fecha_esperada && (
              <span>Entrega: <strong style={{ color: 'var(--text-main)' }}>{orden.fecha_esperada}</strong></span>
            )}
            {orden.items.length > 0 && (
              <span>{orden.items.length} ítem{orden.items.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 flex-shrink-0">
          {(orden.estado === 'pendiente' || orden.estado === 'en_recepcion') && (
            <button onClick={() => onRecibir(orden)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90"
              style={{ background: '#16a34a' }}>
              <PackageCheck size={11} /> Registrar recepción
            </button>
          )}
          {orden.estado === 'en_recepcion' && (
            <button onClick={() => onCerrar(orden.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90"
              style={{ background: '#2563eb' }}>
              Cerrar orden
            </button>
          )}
          {orden.items.length > 0 && (
            <button onClick={onToggle}
              className="p-2 rounded-lg border-2 border-black/10 hover:bg-black/5 transition-colors"
              title={expandida ? 'Ocultar ítems' : 'Ver ítems'}>
              {expandida
                ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
            </button>
          )}
        </div>
      </div>

      {/* Ítems expandidos */}
      {expandida && orden.items.length > 0 && (
        <div className="border-t-2 border-black/5 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Ítems solicitados
          </p>
          <div className="space-y-1.5">
            {orden.items.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--text-main)' }}>{item.materia_prima}</span>
                <span className="font-black" style={{ color: 'var(--primary)' }}>
                  {formatCantidad(item.cantidad_solicitada, item.unidad_medida ?? '')}
                </span>
              </div>
            ))}
          </div>
          {orden.observaciones && (
            <p className="text-[11px] mt-2 italic" style={{ color: 'var(--text-muted)' }}>
              {orden.observaciones}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Auxiliares ── */

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
