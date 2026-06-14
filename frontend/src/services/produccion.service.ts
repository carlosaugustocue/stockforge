import { apiFetch } from '@/lib/api-client';

export interface RequerimientoMaterial {
  materia_prima_id: number;
  materia_prima: string | null;
  unidad_medida: string | null;
  cantidad_requerida: number;
  lote_sugerido_id: number | null;
}

export interface OrdenProduccion {
  id: number;
  estado: 'pendiente' | 'producido' | 'completada' | 'anulada';
  fecha_planificada: string;
  producto_terminado: { id: number; nombre: string; unidad: string | null };
  cantidad_planificada: number;
  cantidad_producida: number | null;
  usuario: { id: number; nombre: string } | null;
  requerimientos?: RequerimientoMaterial[];
  creada_en: string;
}

export interface CrearOrdenBody {
  producto_terminado_id: number;
  cantidad_planificada: number;
  fecha_planificada: string;
}

const unwrap = <T>(res: { data: T }) => res.data;

export const produccionService = {
  listarOrdenes: () =>
    apiFetch<{ data: OrdenProduccion[] }>('/produccion/ordenes').then(unwrap),

  verOrden: (id: number) =>
    apiFetch<{ data: unknown }>(`/produccion/ordenes/${id}`).then(unwrap),

  crearOrden: (body: CrearOrdenBody) =>
    apiFetch<{ data: OrdenProduccion }>('/produccion/ordenes', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),

  ejecutar: (id: number, cantidad_producida: number) =>
    apiFetch<{ data: unknown }>(`/produccion/ordenes/${id}/ejecutar`, {
      method: 'POST',
      body: JSON.stringify({ cantidad_producida }),
    }).then(unwrap),

  trasladarPt: (id: number) =>
    apiFetch<{ data: unknown }>(`/produccion/ordenes/${id}/traslado-pt`, {
      method: 'POST',
    }).then(unwrap),

  anular: (id: number) =>
    apiFetch<{ data: unknown }>(`/produccion/ordenes/${id}/anular`, {
      method: 'PATCH',
    }).then(unwrap),
};
