'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, UserPlus, CheckCircle, XCircle, X } from 'lucide-react';
import { adminService, type Usuario, type CrearUsuarioBody } from '@/services/admin.service';

const ROL_BADGE: Record<string, string> = {
  administrador:         'bg-purple-100 text-purple-700',
  gerencia:              'bg-blue-100 text-blue-700',
  jefe_produccion:       'bg-yellow-100 text-yellow-700',
  encargado_inventarios: 'bg-green-100 text-green-700',
};

const ROL_LABEL: Record<string, string> = {
  administrador:         'Administrador',
  gerencia:              'Gerencia',
  jefe_produccion:       'Jefe Producción',
  encargado_inventarios: 'Encargado Inventarios',
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles,    setRoles]    = useState<{ id: number; nombre: string }[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [modal,    setModal]    = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msgOk,    setMsgOk]    = useState('');
  const [msgErr,   setMsgErr]   = useState('');

  const [form, setForm] = useState<CrearUsuarioBody>({
    name: '', email: '', password: '', password_confirmation: '', role_id: 0,
  });

  const cargar = () => {
    setLoading(true);
    setError('');
    Promise.allSettled([adminService.listarUsuarios(), adminService.listarRoles()])
      .then(([u, r]) => {
        if (u.status === 'fulfilled') setUsuarios(u.value);
        if (r.status === 'fulfilled') setRoles(r.value as { id: number; nombre: string }[]);
        if (u.status === 'rejected') setError((u.reason as Error).message ?? 'Error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMsgErr('');
    setMsgOk('');
    try {
      await adminService.crearUsuario(form);
      setMsgOk(`Usuario "${form.name}" creado correctamente.`);
      setModal(false);
      setForm({ name: '', email: '', password: '', password_confirmation: '', role_id: 0 });
      cargar();
    } catch (err: unknown) {
      setMsgErr((err as Error).message ?? 'Error al crear usuario');
    } finally {
      setEnviando(false);
    }
  };

  const set = (field: keyof CrearUsuarioBody) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: field === 'role_id' ? parseInt(e.target.value) : e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Gestión de Usuarios
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={() => { setModal(true); setMsgErr(''); setMsgOk(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white"
            style={{ background: 'var(--secondary)' }}>
            <UserPlus size={13} />
            Nuevo usuario
          </button>
        </div>
      </div>

      {msgOk && <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium">{msgOk}</div>}
      {error  && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/5">
                  {['#', 'Nombre', 'Email', 'Rol', 'Estado'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                    <td className="px-5 py-3 font-black" style={{ color: 'var(--text-muted)' }}>{u.id}</td>
                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--text-main)' }}>{u.name}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ROL_BADGE[u.rol] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROL_LABEL[u.rol] ?? u.rol}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={async () => {
                          try {
                            await adminService.actualizarUsuario(u.id, { activo: !u.activo });
                            cargar();
                          } catch { /* silencio */ }
                        }}
                        className="flex items-center gap-1 text-[10px] font-black hover:opacity-70 transition-opacity">
                        {u.activo
                          ? <><CheckCircle size={11} className="text-green-600" /><span className="text-green-700">Activo</span></>
                          : <><XCircle size={11} className="text-red-400" /><span className="text-red-500">Inactivo</span></>
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usuarios.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No hay usuarios registrados.</div>
            )}
          </div>
        )}

      {/* Modal Crear Usuario */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-black/5 relative" style={{ background: 'var(--bg-right)' }}>
            <button onClick={() => setModal(false)} className="absolute top-4 right-4 p-1 rounded hover:bg-black/10 transition-colors">
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <h2 className="text-lg font-black uppercase tracking-tight mb-5" style={{ color: 'var(--text-main)' }}>
              Nuevo Usuario
            </h2>
            {msgErr && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{msgErr}</div>}
            <form onSubmit={handleCrear} className="space-y-4">
              {[
                { id: 'name',                  label: 'Nombre',          type: 'text',     placeholder: 'Nombre completo' },
                { id: 'email',                 label: 'Email',           type: 'email',    placeholder: 'usuario@empresa.com' },
                { id: 'password',              label: 'Contraseña',      type: 'password', placeholder: 'Mínimo 8 caracteres' },
                { id: 'password_confirmation', label: 'Confirmar contraseña', type: 'password', placeholder: 'Repetir contraseña' },
              ].map(f => (
                <div key={f.id}>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as unknown as Record<string, string | number>)[f.id] as string}
                    onChange={set(f.id as keyof CrearUsuarioBody)}
                    className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                    style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }}
                    required
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                  Rol
                </label>
                <select value={form.role_id} onChange={set('role_id')}
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)] transition-colors"
                  style={{ background: 'var(--bg-left)', color: 'var(--text-main)' }}
                  required>
                  <option value={0}>— Seleccionar rol —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{ROL_LABEL[r.nombre] ?? r.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest border-2 border-black/10 transition-colors hover:bg-black/5"
                  style={{ color: 'var(--text-muted)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={enviando}
                  className="flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ background: 'var(--primary)' }}>
                  {enviando ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
