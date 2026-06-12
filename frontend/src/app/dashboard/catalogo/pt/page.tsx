'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, X, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { catalogoService, type ProductoTerminado, type MateriaPrima, type RelacionMpPt } from '@/services/catalogo.service';
import { formatNum } from '@/lib/utils';

type Modal = 'crear' | 'editar' | 'relaciones' | null;

export default function ProductosTerminadosPage() {
  const [items,    setItems]    = useState<ProductoTerminado[]>([]);
  const [mps,      setMps]      = useState<MateriaPrima[]>([]);
  const [unidades, setUnidades] = useState<{ id: number; nombre: string }[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState<Modal>(null);
  const [selected, setSelected] = useState<ProductoTerminado | null>(null);
  const [relaciones, setRelaciones] = useState<RelacionMpPt[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [msgOk,    setMsgOk]    = useState('');
  const [msgErr,   setMsgErr]   = useState('');

  // Form crear/editar PT
  const [nombre,   setNombre]   = useState('');
  const [unidadId, setUnidadId] = useState('');

  // Form asociar MP
  const [mpAsocId,   setMpAsocId]   = useState('');
  const [cantAsoc,   setCantAsoc]   = useState('');

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      catalogoService.productosTerminados(),
      catalogoService.materiasPrimas(),
      catalogoService.unidadesMedida(),
    ]).then(([p, m, u]) => {
      if (p.status === 'fulfilled') setItems(p.value);
      if (m.status === 'fulfilled') setMps(m.value);
      if (u.status === 'fulfilled') setUnidades(u.value);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setNombre(''); setUnidadId(''); setMsgErr('');
    setSelected(null); setModal('crear');
  };

  const abrirEditar = (pt: ProductoTerminado) => {
    setSelected(pt); setNombre(pt.nombre); setMsgErr('');
    setModal('editar');
  };

  const abrirRelaciones = async (pt: ProductoTerminado) => {
    setSelected(pt); setMsgErr('');
    setMpAsocId(''); setCantAsoc('');
    try {
      const rels = await catalogoService.relacionesMpPt(pt.id);
      setRelaciones(rels);
    } catch { setRelaciones([]); }
    setModal('relaciones');
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await catalogoService.crearProductoTerminado({ nombre, unidad_medida_id: parseInt(unidadId) });
      setMsgOk(`"${nombre}" creado.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await catalogoService.actualizarProductoTerminado(selected!.id, { nombre });
      setMsgOk(`Producto actualizado.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleToggleActivo = async (pt: ProductoTerminado) => {
    try {
      await catalogoService.actualizarProductoTerminado(pt.id, { activo: !pt.activo });
      cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
  };

  const handleEliminar = async (pt: ProductoTerminado) => {
    if (!confirm(`¿Eliminar "${pt.nombre}"?`)) return;
    try {
      await catalogoService.eliminarProductoTerminado(pt.id);
      setMsgOk(`"${pt.nombre}" eliminado.`);
      cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
  };

  const handleAsociar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await catalogoService.asociarMp(selected!.id, {
        materia_prima_id: parseInt(mpAsocId),
        cantidad_requerida: parseFloat(cantAsoc),
      });
      setMpAsocId(''); setCantAsoc('');
      const rels = await catalogoService.relacionesMpPt(selected!.id);
      setRelaciones(rels);
      setMsgOk('MP asociada.');
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleDesasociar = async (mpId: number) => {
    if (!confirm('¿Quitar esta materia prima del producto?')) return;
    try {
      await catalogoService.desasociarMp(selected!.id, mpId);
      const rels = await catalogoService.relacionesMpPt(selected!.id);
      setRelaciones(rels);
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
  };

  const filtrados = items.filter(pt => pt.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>Productos Terminados</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{items.length} registrados</p>
        </div>
        <div className="flex gap-3">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white"
            style={{ background: 'var(--secondary)' }}>
            <Plus size={13} /> Nuevo PT
          </button>
        </div>
      </div>

      <input type="text" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
        style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />

      {msgOk && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium">{msgOk}</div>}
      {msgErr && !modal && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>}

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/5">
                  {['#', 'Nombre', 'Unidad', 'Estado', 'Ingredientes', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(pt => (
                  <tr key={pt.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                    <td className="px-5 py-3 font-black" style={{ color: 'var(--text-muted)' }}>{pt.id}</td>
                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>{pt.nombre}</td>
                    <td className="px-5 py-3 text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{pt.unidad_medida?.nombre ?? '—'}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleToggleActivo(pt)}
                        className="flex items-center gap-1 text-[10px] font-black hover:opacity-70 transition-opacity">
                        {pt.activo
                          ? <><CheckCircle size={11} className="text-green-600" /><span className="text-green-700">Activo</span></>
                          : <><XCircle size={11} className="text-red-400" /><span className="text-red-500">Inactivo</span></>
                        }
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => abrirRelaciones(pt)}
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded transition hover:opacity-80 text-white"
                        style={{ background: 'var(--primary)' }}>
                        <ChevronRight size={10} /> Ingredientes
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(pt)} className="p-1.5 rounded hover:bg-black/10 transition-colors" title="Editar">
                          <Pencil size={13} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button onClick={() => handleEliminar(pt)} className="p-1.5 rounded hover:bg-red-50 transition-colors text-red-400 hover:text-red-600" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                {search ? 'Sin resultados.' : 'No hay productos terminados.'}
              </div>
            )}
          </div>
        )}

      {/* Modal crear/editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <ModalShell title={modal === 'crear' ? 'Nuevo Producto Terminado' : `Editar — ${selected?.nombre}`} onClose={() => setModal(null)}>
          {msgErr && <ErrBox msg={msgErr} />}
          <form onSubmit={modal === 'crear' ? handleCrear : handleEditar} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del producto"
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
            </div>
            {modal === 'crear' && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Unidad de medida *</label>
                <select value={unidadId} onChange={e => setUnidadId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required>
                  <option value="">— Seleccionar —</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
                style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button type="submit" disabled={enviando}
                className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--primary)' }}>
                {enviando ? 'Guardando…' : modal === 'crear' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal relaciones MP */}
      {modal === 'relaciones' && selected && (
        <ModalShell title={`Ingredientes — ${selected.nombre}`} onClose={() => setModal(null)} wide>
          {msgErr && <ErrBox msg={msgErr} />}

          {/* Lista de relaciones actuales */}
          <div className="mb-5 rounded-xl border-2 border-black/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-black/5">
                  {['Materia prima', 'Unidad', 'Cantidad requerida', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {relaciones.map(r => (
                  <tr key={r.materia_prima_id} className="border-b border-black/5">
                    <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--text-main)' }}>{r.materia_prima_nombre}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{r.unidad_medida?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--text-main)' }}>{formatNum(r.cantidad_requerida)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDesasociar(r.materia_prima_id)}
                        className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {relaciones.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center" style={{ color: 'var(--text-muted)' }}>Sin ingredientes definidos.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Agregar ingrediente */}
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Agregar ingrediente
          </p>
          <form onSubmit={handleAsociar} className="flex gap-2 items-end">
            <div className="flex-1">
              <select value={mpAsocId} onChange={e => setMpAsocId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required>
                <option value="">— Materia prima —</option>
                {mps.filter(mp => !relaciones.find(r => r.materia_prima_id === mp.id)).map(mp => (
                  <option key={mp.id} value={mp.id}>{mp.nombre} ({mp.unidad_medida?.nombre ?? ''})</option>
                ))}
              </select>
            </div>
            <div>
              <input type="number" step="0.001" min="0.001" placeholder="Cantidad" value={cantAsoc}
                onChange={e => setCantAsoc(e.target.value)}
                className="w-28 px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
            </div>
            <button type="submit" disabled={enviando}
              className="px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--primary)' }}>
              <Plus size={13} />
            </button>
          </form>

          <div className="mt-5">
            <button onClick={() => setModal(null)}
              className="w-full py-2.5 rounded-lg text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
              style={{ color: 'var(--text-muted)' }}>Cerrar</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

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
