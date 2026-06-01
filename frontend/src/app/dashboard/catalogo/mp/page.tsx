'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, X, CheckCircle, XCircle } from 'lucide-react';
import { catalogoService, type MateriaPrima } from '@/services/catalogo.service';

type Modal = 'crear' | 'editar' | null;

export default function MateriasPrimasPage() {
  const [items,       setItems]      = useState<MateriaPrima[]>([]);
  const [unidades,    setUnidades]   = useState<{ id: number; nombre: string }[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [search,      setSearch]     = useState('');
  const [modal,       setModal]      = useState<Modal>(null);
  const [selected,    setSelected]   = useState<MateriaPrima | null>(null);
  const [enviando,    setEnviando]   = useState(false);
  const [msgOk,       setMsgOk]      = useState('');
  const [msgErr,      setMsgErr]     = useState('');

  const [nombre,      setNombre]     = useState('');
  const [unidadId,    setUnidadId]   = useState('');
  const [puntoReorden, setPunto]     = useState('');

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      catalogoService.materiasPrimas(),
      catalogoService.unidadesMedida(),
    ]).then(([m, u]) => {
      if (m.status === 'fulfilled') setItems(m.value);
      if (u.status === 'fulfilled') setUnidades(u.value);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setNombre(''); setUnidadId(''); setPunto(''); setMsgErr('');
    setSelected(null); setModal('crear');
  };

  const abrirEditar = (mp: MateriaPrima) => {
    setSelected(mp);
    setNombre(mp.nombre);
    setPunto(String(mp.punto_reorden));
    setMsgErr('');
    setModal('editar');
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await catalogoService.crearMateriaPrima({
        nombre,
        unidad_medida_id: parseInt(unidadId),
        punto_reorden:    parseFloat(puntoReorden) || 0,
      });
      setMsgOk(`Materia prima "${nombre}" creada.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await catalogoService.actualizarMateriaPrima(selected!.id, {
        nombre,
        punto_reorden: parseFloat(puntoReorden) || 0,
      });
      setMsgOk(`Materia prima actualizada.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleToggleActiva = async (mp: MateriaPrima) => {
    try {
      await catalogoService.actualizarMateriaPrima(mp.id, { activa: !mp.activa });
      cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
  };

  const handleEliminar = async (mp: MateriaPrima) => {
    if (!confirm(`¿Eliminar "${mp.nombre}"? Esta acción es irreversible.`)) return;
    try {
      await catalogoService.eliminarMateriaPrima(mp.id);
      setMsgOk(`"${mp.nombre}" eliminada.`);
      cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
  };

  const filtradas = items.filter(mp => mp.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Materias Primas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{items.length} registradas</p>
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
            <Plus size={13} /> Nueva MP
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
                  {['#', 'Nombre', 'Unidad', 'Punto reorden', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map(mp => (
                  <tr key={mp.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                    <td className="px-5 py-3 font-black" style={{ color: 'var(--text-muted)' }}>{mp.id}</td>
                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>{mp.nombre}</td>
                    <td className="px-5 py-3 text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{mp.unidad_medida?.nombre ?? '—'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-main)' }}>{mp.punto_reorden.toLocaleString('es-CO')}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleToggleActiva(mp)}
                        className="flex items-center gap-1 text-[10px] font-black hover:opacity-70 transition-opacity">
                        {mp.activa
                          ? <><CheckCircle size={11} className="text-green-600" /><span className="text-green-700">Activa</span></>
                          : <><XCircle size={11} className="text-red-400" /><span className="text-red-500">Inactiva</span></>
                        }
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(mp)}
                          className="p-1.5 rounded hover:bg-black/10 transition-colors" title="Editar">
                          <Pencil size={13} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button onClick={() => handleEliminar(mp)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors text-red-400 hover:text-red-600" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtradas.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                {search ? 'Sin resultados.' : 'No hay materias primas. Crea una con Nueva MP.'}
              </div>
            )}
          </div>
        )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-black/5 relative"
            style={{ background: 'var(--bg-right)' }}>
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 p-1 rounded hover:bg-black/10 transition-colors">
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <h2 className="text-lg font-black uppercase tracking-tight mb-5" style={{ color: 'var(--text-main)' }}>
              {modal === 'crear' ? 'Nueva Materia Prima' : `Editar — ${selected?.nombre}`}
            </h2>
            {msgErr && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>}
            <form onSubmit={modal === 'crear' ? handleCrear : handleEditar} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre de la MP"
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
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Punto de reorden</label>
                <input type="number" step="0.001" min="0" value={puntoReorden} onChange={e => setPunto(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>Cancelar</button>
                <button type="submit" disabled={enviando}
                  className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90 transition-all"
                  style={{ background: 'var(--primary)' }}>
                  {enviando ? 'Guardando…' : modal === 'crear' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
