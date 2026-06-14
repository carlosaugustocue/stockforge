'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, X, Search, Package } from 'lucide-react';
import { catalogoService, type MateriaPrima } from '@/services/catalogo.service';
import { formatCantidad, unidadAdmiteDecimales } from '@/lib/utils';

type Modal = 'crear' | 'editar' | null;

export default function MateriasPrimasPage() {
  const [items,        setItems]    = useState<MateriaPrima[]>([]);
  const [unidades,     setUnidades] = useState<{ id: number; nombre: string }[]>([]);
  const [loading,      setLoading]  = useState(true);
  const [search,       setSearch]   = useState('');
  const [modal,        setModal]    = useState<Modal>(null);
  const [selected,     setSelected] = useState<MateriaPrima | null>(null);
  const [enviando,     setEnviando] = useState(false);
  const [msgOk,        setMsgOk]    = useState('');
  const [msgErr,       setMsgErr]   = useState('');

  const [nombre,       setNombre]   = useState('');
  const [unidadId,     setUnidadId] = useState('');
  const [puntoReorden, setPunto]    = useState('');

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
      setMsgOk('Materia prima actualizada.');
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

  const filtradas = items.filter(mp =>
    mp.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const activas   = items.filter(mp => mp.activa).length;
  const inactivas = items.length - activas;

  // Unidad del mp seleccionado (para el input de punto reorden)
  const unidadSeleccionada = modal === 'editar'
    ? selected?.unidad_medida?.nombre
    : unidades.find(u => String(u.id) === unidadId)?.nombre;

  return (
    <div className="space-y-6">

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Materias Primas
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Catálogo de ingredientes y materiales de producción
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all"
            style={{ background: 'var(--primary)' }}>
            <Plus size={13} />
            Nueva MP
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total',     value: items.length,  color: 'text-slate-700',  bg: 'bg-slate-50',   border: 'border-slate-100' },
          { label: 'Activas',   value: activas,        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Inactivas', value: inactivas,      color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl px-5 py-4`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-3xl font-black tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Feedback ── */}
      {msgOk && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          {msgOk}
        </div>
      )}
      {msgErr && !modal && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
          {msgErr}
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Barra de búsqueda */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar materia prima…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:bg-white focus:border-slate-300 transition-colors"
            />
          </div>
          <p className="text-xs text-slate-400 flex-shrink-0">
            {filtradas.length} de {items.length}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
              style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['#', 'Nombre', 'Unidad', 'Punto de reorden', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtradas.map(mp => (
                <tr key={mp.id} className="hover:bg-slate-50/50 transition-colors group">

                  {/* ID */}
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-300 tabular-nums">
                    {mp.id}
                  </td>

                  {/* Nombre */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(139,35,35,0.07)' }}>
                        <Package size={13} style={{ color: 'var(--primary)' }} />
                      </div>
                      <span className="font-semibold text-slate-700">{mp.nombre}</span>
                    </div>
                  </td>

                  {/* Unidad */}
                  <td className="px-5 py-3.5">
                    {mp.unidad_medida ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">
                        {mp.unidad_medida.nombre}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Punto de reorden */}
                  <td className="px-5 py-3.5 tabular-nums">
                    <span className="text-slate-700 font-semibold">
                      {formatCantidad(mp.punto_reorden, mp.unidad_medida?.nombre)}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleActiva(mp)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all hover:opacity-80 ${
                        mp.activa
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${mp.activa ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      {mp.activa ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>

                  {/* Acciones */}
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEditar(mp)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                        title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleEliminar(mp)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-500"
                        title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filtradas.length === 0 && (
          <div className="text-center py-14">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Package size={20} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              {search ? 'Sin resultados para esa búsqueda' : 'No hay materias primas. Crea una con Nueva MP.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Modal crear / editar ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {modal === 'crear' ? 'Nueva Materia Prima' : 'Editar Materia Prima'}
                </h2>
                {modal === 'editar' && (
                  <p className="text-xs text-slate-400 mt-0.5">{selected?.nombre}</p>
                )}
              </div>
              <button onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={15} className="text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {msgErr && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-600 font-medium">{msgErr}</p>
                </div>
              )}

              <form onSubmit={modal === 'crear' ? handleCrear : handleEditar} className="space-y-4">

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej: Harina de trigo"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/60 focus:bg-white transition-all"
                    style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                    required
                  />
                </div>

                {/* Unidad de medida (solo al crear) */}
                {modal === 'crear' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Unidad de medida *
                    </label>
                    <select
                      value={unidadId}
                      onChange={e => setUnidadId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/60 focus:bg-white transition-all"
                      style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                      required>
                      <option value="">— Seleccionar unidad —</option>
                      {unidades.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Punto de reorden */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Punto de reorden
                    {unidadSeleccionada && (
                      <span className="ml-1.5 normal-case font-normal text-slate-400">
                        ({unidadSeleccionada})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step={unidadAdmiteDecimales(unidadSeleccionada) ? '0.001' : '1'}
                    min="0"
                    value={puntoReorden}
                    onChange={e => setPunto(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/60 focus:bg-white transition-all"
                    style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Cantidad mínima antes de recibir una alerta de reabastecimiento.
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-all"
                    style={{ background: 'var(--primary)' }}>
                    {enviando ? 'Guardando…' : modal === 'crear' ? 'Crear materia prima' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
