import { apiFetch } from '@/lib/api-client';

export interface Despacho {
  id: number;
  cantidad: number;
  referencia_cliente: string | null;
  created_at: string;
  usuario: string | null;
  producto_terminado: string | null;
}

export interface RegistrarDespachoBody {
  lote_pt_id: number;
  cantidad: number;
  cliente_id?: number;
  referencia_cliente?: string;
}

const unwrap = <T>(res: { data: T }) => res.data;

export const despachosService = {
  listar: () =>
    apiFetch<{ data: Despacho[] }>('/despachos').then(unwrap),

  ver: (id: number) =>
    apiFetch<{ data: unknown }>(`/despachos/${id}`).then(unwrap),

  registrar: (body: RegistrarDespachoBody) =>
    apiFetch<{ data: unknown }>('/despachos', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),
};
