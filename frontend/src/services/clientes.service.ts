import { apiFetch } from '@/lib/api-client';

export interface Cliente {
  id: number;
  tipo: 'persona' | 'empresa';
  nombre: string;
  nit_cedula: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  contacto_nombre: string | null;
  activo: boolean;
  created_at: string | null;
}

export interface CreateClienteBody {
  tipo: 'persona' | 'empresa';
  nombre: string;
  nit_cedula?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto_nombre?: string;
  activo?: boolean;
}

const unwrap = <T>(res: { data: T }) => res.data;

export const clientesService = {
  listar: () =>
    apiFetch<{ data: Cliente[] }>('/clientes').then(unwrap),

  buscar: (q: string) =>
    apiFetch<{ data: Cliente[] }>(`/clientes?q=${encodeURIComponent(q)}`).then(unwrap),

  ver: (id: number) =>
    apiFetch<{ data: Cliente }>(`/clientes/${id}`).then(unwrap),

  crear: (body: CreateClienteBody) =>
    apiFetch<{ data: Cliente }>('/clientes', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),

  actualizar: (id: number, body: Partial<CreateClienteBody>) =>
    apiFetch<{ data: Cliente }>(`/clientes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then(unwrap),

  eliminar: (id: number) =>
    apiFetch<{ data: unknown }>(`/clientes/${id}`, { method: 'DELETE' }),
};
