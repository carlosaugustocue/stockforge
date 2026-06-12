import { apiFetch } from '@/lib/api-client';

export interface Usuario {
  id: number;
  name: string;
  email: string;
  activo: boolean;
  rol: string;
  creado_en?: string;
}

export interface CrearUsuarioBody {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: number;
}

const unwrap = <T>(res: { data: T }) => res.data;

export const adminService = {
  listarUsuarios: () =>
    apiFetch<{ data: Usuario[] }>('/auth/usuarios').then(unwrap),

  crearUsuario: (body: CrearUsuarioBody) =>
    apiFetch<{ data: unknown }>('/auth/usuarios', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),

  actualizarUsuario: (id: number, body: Partial<CrearUsuarioBody & { activo: boolean }>) =>
    apiFetch<{ data: unknown }>(`/auth/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then(unwrap),

  listarRoles: () =>
    apiFetch<{ data: { id: number; nombre: string; descripcion: string }[] }>('/roles').then(unwrap),

  permisos: () =>
    apiFetch<{ data: unknown[] }>('/permisos').then(unwrap),

  permisosPorRol: (roleId: number) =>
    apiFetch<{ data: unknown[] }>(`/roles/${roleId}/permisos`).then(unwrap),

  asignarPermiso: (roleId: number, permissionId: number) =>
    apiFetch<{ data: unknown }>(`/roles/${roleId}/permisos`, {
      method: 'POST',
      body: JSON.stringify({ permission_id: permissionId }),
    }).then(unwrap),

  revocarPermiso: (roleId: number, permissionId: number) =>
    apiFetch<{ data: unknown }>(`/roles/${roleId}/permisos/${permissionId}`, {
      method: 'DELETE',
    }).then(unwrap),

  bitacora: (params: Record<string, string> = {}) => {
    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return apiFetch<{ data: unknown }>(`/bitacora${qs}`).then(unwrap);
  },
};
