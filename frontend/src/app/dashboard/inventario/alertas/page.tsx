'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Plus, ShoppingCart, X, Trash2, Phone, Mail } from 'lucide-react';
import { inventarioService, type AlertaMp } from '@/services/inventario.service';
import { proveedoresService, type Proveedor } from '@/services/proveedores.service';
import { recepcionesService } from '@/services/recepciones.service';
import { formatNum, formatCantidad } from '@/lib/utils';

interface ItemOrden {
  materia_prima_id: number;
  materia_prima_nombre: string;
  unidad_medida: string;
  cantidad_solicitada: string;
}

export default function AlertasPage() {
  const [alertas,     setAlertas]     = useState<AlertaMp[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  // Modal de orden
  const [modalOrden,    setModalOrden]    = useState(false);
  const [enviando,      setEnviando]      = useState(false);
  const [msgOk,         setMsgOk]         = useState('');
  const [msgErr,        setMsgErr]        = useState('');

  // Form orden
  const [proveedorId,   setProveedorId]   = useState('');
  const [fechaEsperada, setFechaEsperada] = useState('');
  const [itemsOrden,    setItemsOrden]    = useState<ItemOrden[]>([]);

  const cargar = () => {
    setLoading(true);
    setError('');
    Promise.allSettled([
      inventarioService.alertas(),
      proveedoresService.listar(),
    ]).then(([a, p]) => {
      if (a.status === 'fulfilled') setAlertas(a.value);
      if (p.status === 'fulfilled') setProveedores(p.value);
      else if (a.status === 'rejected') setError((a.reason as Error).message ?? 'Error');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  /** Abre el modal de orden con una MP pre-cargada */
  const abrirOrden = (alerta: AlertaMp) => {
    const item: ItemOrden = {
      materia_prima_id:     alerta.materia_prima_id,
      materia_prima_nombre: alerta.nombre,
      unidad_medida:        alerta.unidad_medida,
      cantidad_solicitada:  String(alerta.faltante > 0 ? Math.ceil(alerta.faltante) : ''),
    };

    setItemsOrden([item]);

    // Sugerir proveedor que suministra esa MP
    const provSugerido = proveedores.find(p =>
      p.activo && p.materias_primas.some(mp => mp.id === alerta.materia_prima_id)
    );
    setProveedorId(provSugerido ? String(provSugerido.id) : '');
    setFechaEsperada('');
    setMsgErr('');
    setModalOrden(true);
  };

  /** Agrega más alertas al pedido existente */
  const agregarAlPedido = (alerta: AlertaMp) => {
    if (itemsOrden.some(i => i.materia_prima_id === alerta.materia_prima_id)) return;
    setItemsOrden(prev => [...prev, {
      materia_prima_id:     alerta.materia_prima_id,
      materia_prima_nombre: alerta.nombre,
      unidad_medida:        alerta.unidad_medida,
      cantidad_solicitada:  String(alerta.faltante > 0 ? Math.ceil(alerta.faltante) : ''),
    }]);
  };

  const removeItem = (id: number) =>
    setItemsOrden(prev => prev.filter(i => i.materia_prima_id !== id));

  const updateCantidad = (id: number, val: string) =>
    setItemsOrden(prev => prev.map(i => i.materia_prima_id === id ? { ...i, cantidad_solicitada: val } : i));

  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      const items = itemsOrden
        .filter(i => i.cantidad_solicitada)
        .map(i => ({
          materia_prima_id:    i.materia_prima_id,
          cantidad_solicitada: parseFloat(i.cantidad_solicitada),
        }));

      if (items.length === 0) { setMsgErr('Agrega al menos un ítem al pedido.'); setEnviando(false); return; }

      await recepcionesService.crearOrden({
        proveedor_id:   proveedorId ? parseInt(proveedorId) : undefined,
        fecha_esperada: fechaEsperada || undefined,
        items,
      });

      const prov = proveedores.find(p => String(p.id) === proveedorId);
      setMsgOk(`Orden de compra creada${prov ? ` para ${prov.nombre}` : ''}. Puedes verla en Órdenes de Compra.`);
      setModalOrden(false);
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const proveedorSeleccionado = proveedores.find(p => String(p.id) === proveedorId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Alertas de Reabastecimiento
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Materias primas con stock por debajo del punto de reorden
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {msgOk && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium flex items-center justify-between">
          {msgOk}
          <button onClick={() => setMsgOk('')}><X size={14} className="text-green-500" /></button>
        </div>
      )}
      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      )}

      {!loading && !error && alertas.length === 0 && (
        <div className="rounded-xl p-12 text-center border-2 border-dashed border-green-200 bg-green-50">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-green-500" />
          </div>
          <h3 className="font-black text-lg text-green-700">Sin alertas activas</h3>
          <p className="text-sm text-green-600 mt-1">Todos los insumos están sobre su punto de reorden.</p>
        </div>
      )}

      {!loading && alertas.length > 0 && (
        <>
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700">
              {alertas.length} materia{alertas.length !== 1 ? 's primas requieren' : ' prima requiere'} reposición urgente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertas.map(mp => {
              const provSugerido = proveedores.find(p =>
                p.activo && p.materias_primas.some(m => m.id === mp.materia_prima_id)
              );
              const yaEnPedido = itemsOrden.some(i => i.materia_prima_id === mp.materia_prima_id);

              return (
                <div key={mp.materia_prima_id}
                  className="rounded-xl border-2 border-red-100 p-5 flex flex-col gap-3"
                  style={{ background: 'var(--bg-left)' }}>
                  {/* Nombre y unidad */}
                  <div>
                    <h3 className="font-black text-base" style={{ color: 'var(--text-main)' }}>{mp.nombre}</h3>
                    <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>{mp.unidad_medida}</p>
                  </div>

                  {/* Métricas */}
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-lg p-2.5 border border-red-100 bg-red-50">
                      <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Stock actual</p>
                      <p className="text-lg font-black text-red-600">{formatCantidad(mp.stock_total, mp.unidad_medida)}</p>
                    </div>
                    <div className="flex-1 rounded-lg p-2.5 border border-black/5" style={{ background: 'var(--bg-right)' }}>
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Punto reorden</p>
                      <p className="text-lg font-black" style={{ color: 'var(--text-main)' }}>{formatCantidad(mp.punto_reorden, mp.unidad_medida)}</p>
                    </div>
                    <div className="flex-1 rounded-lg p-2.5 border border-orange-100 bg-orange-50">
                      <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">Faltante</p>
                      <p className="text-lg font-black text-orange-600">{formatCantidad(mp.faltante, mp.unidad_medida)}</p>
                    </div>
                  </div>

                  {/* Proveedor sugerido */}
                  {provSugerido && (
                    <div className="flex items-center gap-2 text-xs py-2 px-3 rounded-lg border border-black/5"
                      style={{ background: 'var(--bg-right)', color: 'var(--text-muted)' }}>
                      <ShoppingCart size={11} />
                      <span>Proveedor sugerido: <strong style={{ color: 'var(--text-main)' }}>{provSugerido.nombre}</strong></span>
                      {provSugerido.telefono && (
                        <span className="ml-auto flex items-center gap-1"><Phone size={9} /> {provSugerido.telefono}</span>
                      )}
                    </div>
                  )}

                  {/* Botón de acción */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirOrden(mp)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest text-white hover:opacity-90 transition-all"
                      style={{ background: 'var(--secondary)' }}>
                      <Plus size={12} /> Crear orden de compra
                    </button>
                    {modalOrden && !yaEnPedido && (
                      <button
                        onClick={() => agregarAlPedido(mp)}
                        className="px-3 py-2.5 rounded-lg text-xs font-black uppercase border-2 border-black/10 hover:bg-black/5 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        title="Agregar a la orden en curso">
                        + Al pedido
                      </button>
                    )}
                    {modalOrden && yaEnPedido && (
                      <span className="px-3 py-2.5 text-xs font-black uppercase text-green-600">
                        ✓ En pedido
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal — Crear orden de compra */}
      {modalOrden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="rounded-2xl shadow-2xl p-8 w-full max-w-2xl border-2 border-black/5 relative max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-right)' }}>
            <button onClick={() => setModalOrden(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-black/10 transition-colors">
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <h2 className="text-lg font-black uppercase tracking-tight mb-5" style={{ color: 'var(--text-main)' }}>
              Nueva Orden de Compra
            </h2>

            {msgErr && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>}

            <form onSubmit={handleCrearOrden} className="space-y-5">
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
                {proveedorSeleccionado && (
                  <div className="mt-2 px-3 py-2 rounded-lg border border-black/5 text-xs flex flex-wrap gap-x-4"
                    style={{ background: 'var(--bg-left)', color: 'var(--text-muted)' }}>
                    {proveedorSeleccionado.contacto_nombre && <span>{proveedorSeleccionado.contacto_nombre}</span>}
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
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Fecha esperada de entrega
                </label>
                <input type="date" value={fechaEsperada} onChange={e => setFechaEsperada(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
              </div>

              {/* Ítems */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                  Materias primas a solicitar
                </label>
                <div className="space-y-2">
                  {itemsOrden.map(item => (
                    <div key={item.materia_prima_id}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-black/5"
                      style={{ background: 'var(--bg-left)' }}>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{item.materia_prima_nombre}</p>
                        <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{item.unidad_medida}</p>
                      </div>
                      <input type="number" step="0.001" min="0.001"
                        value={item.cantidad_solicitada}
                        onChange={e => updateCantidad(item.materia_prima_id, e.target.value)}
                        placeholder="Cantidad"
                        className="w-28 px-2 py-2 rounded-lg border-2 border-black/10 text-sm text-right font-bold focus:outline-none focus:border-[var(--primary)]"
                        style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }} />
                      <button type="button" onClick={() => removeItem(item.materia_prima_id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOrden(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={enviando}
                  className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90 transition-all"
                  style={{ background: 'var(--primary)' }}>
                  {enviando ? 'Creando…' : 'Crear orden de compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
