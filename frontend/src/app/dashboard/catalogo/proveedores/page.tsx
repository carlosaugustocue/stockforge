'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, X, Pencil, Trash2, Phone, Mail, User, Package } from 'lucide-react';
import { proveedoresService, type Proveedor, type CreateProveedorBody } from '@/services/proveedores.service';
import { catalogoService, type MateriaPrima } from '@/services/catalogo.service';

type Modal = 'crear' | 'editar' | 'eliminar' | null;

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [mps,         setMps]         = useState<MateriaPrima[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<Modal>(null);
  const [selected,    setSelected]    = useState<Proveedor | null>(null);
  const [enviando,    setEnviando]    = useState(false);
  const [msgOk,       setMsgOk]       = useState('');
  const [msgErr,      setMsgErr]      = useState('');

  // Form
  const [nombre,         setNombre]         = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [telefono,       setTelefono]       = useState('');
  const [email,          setEmail]          = useState('');
  const [mpSeleccionadas, setMpSeleccionadas] = useState<number[]>([]);

  const cargar = () => {
    setLoading(true);
    Promise.allSettled([
      proveedoresService.listar(),
      catalogoService.materiasPrimas(),
    ]).then(([p, m]) => {
      if (p.status === 'fulfilled') setProveedores(p.value);
      if (m.status === 'fulfilled') setMps(m.value);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const resetForm = () => {
    setNombre(''); setContactoNombre(''); setTelefono(''); setEmail('');
    setMpSeleccionadas([]); setMsgErr('');
  };

  const abrirCrear = () => { resetForm(); setModal('crear'); };

  const abrirEditar = (p: Proveedor) => {
    setSelected(p);
    setNombre(p.nombre);
    setContactoNombre(p.contacto_nombre ?? '');
    setTelefono(p.telefono ?? '');
    setEmail(p.email ?? '');
    setMpSeleccionadas(p.materias_primas.map(m => m.id));
    setMsgErr('');
    setModal('editar');
  };

  const toggleMp = (id: number) => {
    setMpSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const buildBody = (): CreateProveedorBody => ({
    nombre:          nombre.trim(),
    contacto_nombre: contactoNombre.trim() || undefined,
    telefono:        telefono.trim() || undefined,
    email:           email.trim() || undefined,
    materias_primas: mpSeleccionadas,
  });

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await proveedoresService.crear(buildBody());
      setMsgOk('Proveedor creado correctamente.');
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setMsgErr('');
    try {
      await proveedoresService.actualizar(selected!.id, buildBody());
      setMsgOk('Proveedor actualizado.');
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  const handleEliminar = async () => {
    setEnviando(true); setMsgErr('');
    try {
      await proveedoresService.eliminar(selected!.id);
      setMsgOk(`Proveedor "${selected!.nombre}" eliminado.`);
      setModal(null); cargar();
    } catch (err: unknown) { setMsgErr((err as Error).message ?? 'Error'); }
    finally { setEnviando(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Proveedores
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} registrado{proveedores.length !== 1 ? 's' : ''}
          </p>
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
            <Plus size={13} /> Nuevo proveedor
          </button>
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
      ) : proveedores.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-black/10 py-16 text-center">
          <Package size={32} className="mx-auto mb-3 opacity-25" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-muted)' }}>No hay proveedores</p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Registra los proveedores y las materias primas que suministra cada uno</p>
          <button onClick={abrirCrear}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white"
            style={{ background: 'var(--secondary)' }}>
            <Plus size={14} /> Nuevo proveedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proveedores.map(p => (
            <div key={p.id} className="rounded-xl border-2 border-black/5 p-5 flex flex-col gap-3" style={{ background: 'var(--bg-left)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-black text-base truncate" style={{ color: 'var(--text-main)' }}>{p.nombre}</h3>
                  {!p.activo && (
                    <span className="text-[9px] font-black uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inactivo</span>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => abrirEditar(p)}
                    className="p-1.5 rounded hover:bg-black/5 transition-colors" title="Editar">
                    <Pencil size={13} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button onClick={() => { setSelected(p); setModal('eliminar'); }}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors" title="Eliminar">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="space-y-1">
                {p.contacto_nombre && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <User size={11} /> {p.contacto_nombre}
                  </div>
                )}
                {p.telefono && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Phone size={11} /> {p.telefono}
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Mail size={11} /> {p.email}
                  </div>
                )}
              </div>

              {/* Materias primas */}
              {p.materias_primas.length > 0 ? (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Suministra
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {p.materias_primas.map(mp => (
                      <span key={mp.id}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ background: 'var(--primary)18', borderColor: 'var(--primary)40', color: 'var(--primary)' }}>
                        {mp.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>Sin materias primas asignadas</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <ModalShell
          title={modal === 'crear' ? 'Nuevo Proveedor' : `Editar — ${selected?.nombre}`}
          onClose={() => setModal(null)}
          wide>
          {msgErr && <ErrBox msg={msgErr} />}
          <form onSubmit={modal === 'crear' ? handleCrear : handleEditar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre / Razón social *">
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Harinera del Valle S.A." autoFocus
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} required />
              </Field>
              <Field label="Contacto">
                <input type="text" value={contactoNombre} onChange={e => setContactoNombre(e.target.value)}
                  placeholder="Nombre del responsable"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
              </Field>
              <Field label="Teléfono">
                <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="ventas@proveedor.com"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }} />
              </Field>
            </div>

            {/* Materias primas que suministra */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Materias primas que suministra
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {mps.map(mp => (
                  <label key={mp.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm ${
                      mpSeleccionadas.includes(mp.id)
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                        : 'border-black/10 hover:border-black/20'
                    }`}
                    style={{ color: 'var(--text-main)' }}>
                    <input type="checkbox"
                      checked={mpSeleccionadas.includes(mp.id)}
                      onChange={() => toggleMp(mp.id)}
                      className="w-3 h-3 accent-[var(--primary)]" />
                    <span className="truncate text-xs font-bold">{mp.nombre}</span>
                  </label>
                ))}
              </div>
              {mpSeleccionadas.length > 0 && (
                <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  {mpSeleccionadas.length} materia{mpSeleccionadas.length !== 1 ? 's primas' : ' prima'} seleccionada{mpSeleccionadas.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <ModalActions onCancel={() => setModal(null)} loading={enviando}
              label={modal === 'crear' ? 'Crear proveedor' : 'Guardar cambios'} />
          </form>
        </ModalShell>
      )}

      {/* Modal Eliminar */}
      {modal === 'eliminar' && selected && (
        <ModalShell title={`Eliminar proveedor`} onClose={() => setModal(null)}>
          <p className="text-sm mb-4" style={{ color: 'var(--text-main)' }}>
            ¿Confirmas eliminar <strong>{selected.nombre}</strong>?
            Las órdenes de pedido existentes no se verán afectadas.
          </p>
          {msgErr && <ErrBox msg={msgErr} />}
          <ModalActions onCancel={() => setModal(null)} loading={enviando} label="Eliminar" danger onClick={handleEliminar} />
        </ModalShell>
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
        {loading ? 'Guardando…' : label}
      </button>
    </div>
  );
}
