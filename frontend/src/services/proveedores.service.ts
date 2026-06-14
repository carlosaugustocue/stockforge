import { apiFetch } from '@/lib/api-client';

export interface MateriaPrimaResumen {
  id: number;
  nombre: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  materias_primas: MateriaPrimaResumen[];
}

export interface CreateProveedorBody {
  nombre: string;
  contacto_nombre?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
  materias_primas?: number[];
}

const unwrap = <T>(res: { data: T }) => res.data;

export const proveedoresService = {
  listar: () =>
    apiFetch<{ data: Proveedor[] }>('/proveedores').then(unwrap),

  ver: (id: number) =>
    apiFetch<{ data: Proveedor }>(`/proveedores/${id}`).then(unwrap),

  crear: (body: CreateProveedorBody) =>
    apiFetch<{ data: Proveedor }>('/proveedores', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),

  actualizar: (id: number, body: Partial<CreateProveedorBody>) =>
    apiFetch<{ data: Proveedor }>(`/proveedores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then(unwrap),

  eliminar: (id: number) =>
    apiFetch<{ data: null }>(`/proveedores/${id}`, { method: 'DELETE' }).then(unwrap),
};
