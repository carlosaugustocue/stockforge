import { apiFetch } from '@/lib/api-client';

export interface OrdenPedido {
  id: number;
  proveedor: string;
  estado: 'pendiente' | 'en_recepcion' | 'cerrada';
  fecha_esperada: string | null;
  observaciones: string | null;
}

export interface CrearOrdenBody {
  proveedor: string;
  fecha_esperada?: string;
  observaciones?: string;
}

export interface RegistrarRecepcionBody {
  items: { materia_prima_id: number; cantidad: number; fecha_vencimiento?: string }[];
  observaciones?: string;
}

const unwrap = <T>(res: { data: T }) => res.data;

export const recepcionesService = {
  listarOrdenes: () =>
    apiFetch<{ data: OrdenPedido[] }>('/recepciones/ordenes').then(unwrap),

  verOrden: (id: number) =>
    apiFetch<{ data: unknown }>(`/recepciones/ordenes/${id}`).then(unwrap),

  crearOrden: (body: CrearOrdenBody) =>
    apiFetch<{ data: unknown }>('/recepciones/ordenes', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),

  actualizarOrden: (id: number, body: Partial<CrearOrdenBody & { estado: string }>) =>
    apiFetch<{ data: unknown }>(`/recepciones/ordenes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then(unwrap),

  registrarRecepcion: (ordenId: number, body: RegistrarRecepcionBody) =>
    apiFetch<{ data: unknown }>(`/recepciones/ordenes/${ordenId}/recepciones`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),

  listarRecepciones: () =>
    apiFetch<{ data: unknown[] }>('/recepciones').then(unwrap),

  verRecepcion: (id: number) =>
    apiFetch<{ data: unknown }>(`/recepciones/${id}`).then(unwrap),
};
