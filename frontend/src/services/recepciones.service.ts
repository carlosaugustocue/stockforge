import { apiFetch } from '@/lib/api-client';

export interface OrdenPedidoItem {
  id: number;
  materia_prima_id: number;
  materia_prima: string | null;
  unidad_medida: string | null;
  cantidad_solicitada: number;
}

export interface ProveedorResumen {
  id: number;
  nombre: string;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
}

export interface OrdenPedido {
  id: number;
  proveedor: string;
  proveedor_id: number | null;
  proveedor_detalle: ProveedorResumen | null;
  estado: 'pendiente' | 'en_recepcion' | 'cerrada';
  fecha_esperada: string | null;
  observaciones: string | null;
  items: OrdenPedidoItem[];
}

export interface CrearOrdenBody {
  proveedor_id?: number;
  proveedor?: string;
  fecha_esperada?: string;
  observaciones?: string;
  items?: { materia_prima_id: number; cantidad_solicitada: number }[];
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
    apiFetch<{ data: OrdenPedido }>(`/recepciones/ordenes/${id}`).then(unwrap),

  crearOrden: (body: CrearOrdenBody) =>
    apiFetch<{ data: OrdenPedido }>('/recepciones/ordenes', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),

  actualizarOrden: (id: number, body: Partial<CrearOrdenBody & { estado: string }>) =>
    apiFetch<{ data: OrdenPedido }>(`/recepciones/ordenes/${id}`, {
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
