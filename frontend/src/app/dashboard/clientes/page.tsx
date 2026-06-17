'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw, Plus, X, Search, Building2, User,
  Phone, Mail, MapPin, Edit2, Trash2, Users,
} from 'lucide-react';
import { clientesService, type Cliente, type CreateClienteBody } from '@/services/clientes.service';

/* ─── helpers ────────────────────────────────────────────────────────── */

const TIPO_CONFIG = {
  empresa: { label: 'Empresa',  bg: 'bg-blue-100',   text: 'text-blue-700',  Icon: Building2 },
  persona: { label: 'Persona',  bg: 'bg-violet-100', text: 'text-violet-700', Icon: User },
};

type Modal = 'crear' | 'editar' | null;

const EMPTY: CreateClienteBody = {
  tipo: 'empresa', nombre: '', nit_cedula: '', telefono: '',
  email: '', direccion: '', contacto_nombre: '', activo: true,
};

/* ─── página ─────────────────────────────────────────────────────────── */

export default function ClientesPage() {
  const [clientes,  setClientes]  = useState<Cliente[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<Modal>(null);
  const [selected,  setSelected]  = useState<Cliente | null>(null);
  const [enviando,  setEnviando]  = useState(false);
  const [msgOk,     setMsgOk]     = useState('');
  const [msgErr,    setMsgErr]    = useState('');
  const [busqueda,  setBusqueda]  = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'persona' | 'empresa'>('todos');
  const [form,      setForm]      = useState<CreateClienteBody>(EMPTY);

  const cargar = () => {
    setLoading(true);
    clientesService.listar()
      .then(setClientes)
      .catch(e => setMsgErr(e.message ?? 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm(EMPTY); setMsgErr(''); setSelected(null); setModal('crear');
  };

  const abrirEditar = (c: Cliente) => {
    setForm({
      tipo:             c.tipo,
      nombre:           c.nombre,
      nit_cedula:       c.nit_cedula ?? '',
      telefono:         c.telefono ?? '',
      email:            c.email ?? '',
      direccion:        c.direccion ?? '',
      contacto_nombre:  c.contacto_nombre ?? '',
      activo:           c.activo,
    });
    setSelected(c); setMsgErr(''); setModal('editar');
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      const body: CreateClienteBody = {
        ...form,
        nit_cedula:      form.nit_cedula      || undefined,
        telefono:        form.telefono        || undefined,
        email:           form.email           || undefined,
        direccion:       form.direccion       || undefined,
        contacto_nombre: form.contacto_nombre || undefined,
      };
      if (modal === 'crear') {
        await clientesService.crear(body);
        setMsgOk('Cliente creado correctamente.');
      } else {
        await clientesService.actualizar(selected!.id, body);
        setMsgOk('Cliente actualizado.');
      }
      setModal(null); cargar();
    } catch (err: unknown) {
      setMsgErr((err as Error).message ?? 'Error al guardar');
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async (c: Cliente) => {
    if (!confirm(`¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await clientesService.eliminar(c.id);
      setMsgOk(`${c.nombre} eliminado.`);
      cargar();
    } catch (err: unknown) {
      setMsgErr((err as Error).message ?? 'Error al eliminar');
    }
  };

  /* filtro */
  const visibles = useMemo(() => {
    let r = clientes;
    if (filtroTipo !== 'todos') r = r.filter(c => c.tipo === filtroTipo);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      r = r.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        (c.nit_cedula ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.contacto_nombre ?? '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [clientes, filtroTipo, busqueda]);

  const kpis = useMemo(() => ({
    total:    clientes.length,
    empresas: clientes.filter(c => c.tipo === 'empresa').length,
    personas: clientes.filter(c => c.tipo === 'persona').length,
    activos:  clientes.filter(c => c.activo).length,
  }), [clientes]);

  const set = (k: keyof CreateClienteBody, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  /* ─── render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Clientes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Personas y empresas a las que se despacha producto terminado
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--primary)' }}>
            <Plus size={13} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {msgOk && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-700 font-semibold">
          {msgOk}
          <button onClick={() => setMsgOk('')}><X size={14} className="text-green-400" /></button>
        </div>
      )}
      {msgErr && !modal && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>
      )}

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total clientes', value: kpis.total,    bg: 'bg-slate-50',   text: 'text-slate-600',  Icon: Users     },
            { label: 'Empresas',       value: kpis.empresas, bg: 'bg-blue-50',    text: 'text-blue-600',   Icon: Building2 },
            { label: 'Personas',       value: kpis.personas, bg: 'bg-violet-50',  text: 'text-violet-600', Icon: User      },
            { label: 'Activos',        value: kpis.activos,  bg: 'bg-emerald-50', text: 'text-emerald-600',Icon: Users     },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
                <k.Icon size={17} className={k.text} />
              </div>
              <p className="text-2xl font-black leading-none" style={{ color: 'var(--text-main)' }}>{k.value}</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {!loading && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative max-w-xs w-full">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, NIT, email…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-slate-300"
            />
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {(['todos', 'empresa', 'persona'] as const).map(t => (
              <button key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  filtroTipo === t ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                style={filtroTipo === t ? { background: 'var(--primary)' } : {}}>
                {t === 'todos' ? 'Todos' : t === 'empresa' ? 'Empresas' : 'Personas'}
              </button>
            ))}
          </div>
          <p className="text-xs sm:ml-auto" style={{ color: 'var(--text-muted)' }}>
            {visibles.length} de {clientes.length}
          </p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : visibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-400 mb-1">
            {busqueda ? 'Sin resultados' : 'No hay clientes registrados'}
          </p>
          <p className="text-xs text-slate-300">
            {busqueda ? `No se encontró "${busqueda}"` : 'Crea tu primer cliente para asociarlo a despachos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibles.map(c => {
            const cfg = TIPO_CONFIG[c.tipo];
            return (
              <div key={c.id}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4 ${!c.activo ? 'opacity-60' : ''}`}>

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <cfg.Icon size={18} className={cfg.text} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-tight truncate" style={{ color: 'var(--text-main)' }}>
                        {c.nombre}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {!c.activo && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* always visible on desktop */}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5">
                  {c.nit_cedula && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase w-12">
                        {c.tipo === 'empresa' ? 'NIT' : 'CC'}
                      </span>
                      {c.nit_cedula}
                    </p>
                  )}
                  {c.contacto_nombre && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <User size={11} className="text-slate-400 flex-shrink-0" />
                      {c.contacto_nombre}
                    </p>
                  )}
                  {c.telefono && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Phone size={11} className="text-slate-400 flex-shrink-0" />
                      {c.telefono}
                    </p>
                  )}
                  {c.email && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <Mail size={11} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </p>
                  )}
                  {c.direccion && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.direccion}</span>
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-1 border-t border-slate-50 mt-auto">
                  <button onClick={() => abrirEditar(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    <Edit2 size={12} /> Editar
                  </button>
                  <button onClick={() => handleEliminar(c)}
                    className="flex items-center justify-center p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                  <Users size={15} className="text-white" />
                </div>
                <h2 className="text-base font-black text-slate-800">
                  {modal === 'crear' ? 'Nuevo cliente' : `Editar — ${selected?.nombre}`}
                </h2>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5">
              {msgErr && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>
              )}
              <form onSubmit={handleGuardar} id="form-cliente" className="space-y-4">

                {/* Tipo */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Tipo *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['empresa', 'persona'] as const).map(t => {
                      const c = TIPO_CONFIG[t];
                      return (
                        <button key={t} type="button"
                          onClick={() => set('tipo', t)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                            form.tipo === t
                              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                              : 'border-black/10 hover:border-black/20'
                          }`}>
                          <c.Icon size={16} className={form.tipo === t ? 'text-[var(--primary)]' : 'text-slate-400'} />
                          <span className={`text-sm font-bold ${form.tipo === t ? 'text-[var(--primary)]' : 'text-slate-500'}`}>
                            {c.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                    {form.tipo === 'empresa' ? 'Razón social' : 'Nombre completo'} *
                  </label>
                  <input type="text" required value={form.nombre} onChange={e => set('nombre', e.target.value)}
                    placeholder={form.tipo === 'empresa' ? 'Ej: Distribuciones XYZ S.A.S.' : 'Ej: Juan Carlos Pérez'}
                    className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* NIT / Cédula */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      {form.tipo === 'empresa' ? 'NIT' : 'Cédula'}
                    </label>
                    <input type="text" value={form.nit_cedula} onChange={e => set('nit_cedula', e.target.value)}
                      placeholder={form.tipo === 'empresa' ? '900.123.456-7' : '1.000.123.456'}
                      className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)]" />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Teléfono</label>
                    <input type="text" value={form.telefono} onChange={e => set('telefono', e.target.value)}
                      placeholder="310 123 4567"
                      className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)]" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)]" />
                </div>

                {/* Contacto (solo empresas) */}
                {form.tipo === 'empresa' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Persona de contacto
                    </label>
                    <input type="text" value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)}
                      placeholder="Nombre del contacto en la empresa"
                      className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)]" />
                  </div>
                )}

                {/* Dirección */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Dirección</label>
                  <input type="text" value={form.direccion} onChange={e => set('direccion', e.target.value)}
                    placeholder="Calle 123 # 45-67, Ciudad"
                    className="w-full px-3 py-2.5 text-sm border-2 border-black/10 rounded-xl focus:outline-none focus:border-[var(--primary)]" />
                </div>

                {/* Activo */}
                {modal === 'editar' && (
                  <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-black/10 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={form.activo}
                      onChange={e => set('activo', e.target.checked)}
                      className="w-4 h-4 accent-[var(--primary)]" />
                    <span className="text-sm font-semibold text-slate-600">Cliente activo</span>
                  </label>
                )}
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" form="form-cliente" disabled={enviando}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: 'var(--primary)' }}>
                {enviando ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                {modal === 'crear' ? 'Crear cliente' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
