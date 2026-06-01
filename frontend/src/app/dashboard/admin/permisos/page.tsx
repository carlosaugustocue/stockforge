'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Check, Minus } from 'lucide-react';
import { adminService } from '@/services/admin.service';

interface Permiso {
  id: number;
  nombre: string;
  recurso: string;
  accion: string;
  descripcion: string | null;
}

interface Rol {
  id: number;
  nombre: string;
}

const ROL_LABEL: Record<string, string> = {
  administrador:         'Administrador',
  gerencia:              'Gerencia',
  jefe_produccion:       'Jefe Producción',
  encargado_inventarios: 'Encargado',
};

export default function PermisosPage() {
  const [permisos,   setPermisos]   = useState<Permiso[]>([]);
  const [roles,      setRoles]      = useState<Rol[]>([]);
  const [matriz,     setMatriz]     = useState<Record<number, Set<number>>>({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [toggling,   setToggling]   = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, r] = await Promise.all([
        adminService.permisos(),
        adminService.listarRoles(),
      ]);
      const permisosData = p as Permiso[];
      const rolesData    = r as Rol[];
      setPermisos(permisosData);
      setRoles(rolesData);

      const nuevaMatriz: Record<number, Set<number>> = {};
      await Promise.all(
        rolesData.map(async rol => {
          const rp = await adminService.permisosPorRol(rol.id);
          nuevaMatriz[rol.id] = new Set((rp as Permiso[]).map(p => p.id));
        })
      );
      setMatriz(nuevaMatriz);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const toggle = async (roleId: number, permId: number) => {
    const key = `${roleId}-${permId}`;
    setToggling(key);
    const tiene = matriz[roleId]?.has(permId) ?? false;
    try {
      if (tiene) {
        await adminService.revocarPermiso(roleId, permId);
      } else {
        await adminService.asignarPermiso(roleId, permId);
      }
      setMatriz(prev => {
        const nuevo = new Set(prev[roleId] ?? []);
        if (tiene) nuevo.delete(permId);
        else nuevo.add(permId);
        return { ...prev, [roleId]: nuevo };
      });
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error al actualizar permiso');
    } finally {
      setToggling(null);
    }
  };

  // Agrupar permisos por recurso
  const grupos = permisos.reduce<Record<string, Permiso[]>>((acc, p) => {
    (acc[p.recurso] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Matriz de Permisos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Gestión dinámica de permisos por rol (RBAC)
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : (
          <div className="rounded-xl border-2 border-black/5 overflow-x-auto" style={{ background: 'var(--bg-left)' }}>
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="border-b-2 border-black/5">
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Permiso
                  </th>
                  {roles.map(r => (
                    <th key={r.id} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>
                      {ROL_LABEL[r.nombre] ?? r.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grupos).map(([recurso, perms]) => (
                  <>
                    <tr key={`grupo-${recurso}`} className="border-b border-black/5">
                      <td colSpan={roles.length + 1}
                        className="px-5 py-2 text-[9px] font-black uppercase tracking-widest bg-black/3"
                        style={{ color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.03)' }}>
                        {recurso.replace(/_/g, ' ')}
                      </td>
                    </tr>
                    {perms.map(p => (
                      <tr key={p.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>{p.nombre}</p>
                          {p.descripcion && (
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.descripcion}</p>
                          )}
                        </td>
                        {roles.map(r => {
                          const tiene = matriz[r.id]?.has(p.id) ?? false;
                          const key   = `${r.id}-${p.id}`;
                          return (
                            <td key={r.id} className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggle(r.id, p.id)}
                                disabled={toggling === key}
                                className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all hover:scale-110 disabled:opacity-50 ${
                                  tiene
                                    ? 'text-white'
                                    : 'border-2 border-black/15 hover:border-black/30'
                                }`}
                                style={tiene ? { background: 'var(--primary)' } : {}}>
                                {toggling === key
                                  ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                  : tiene
                                    ? <Check size={13} />
                                    : <Minus size={11} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                                }
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
