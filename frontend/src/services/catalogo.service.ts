import { apiFetch } from '@/lib/api-client';

export interface MateriaPrima {
  id: number;
  nombre: string;
  unidad_medida: { id: number; nombre: string } | null;
  punto_reorden: number;
  activa: boolean;
}

export interface ProductoTerminado {
  id: number;
  nombre: string;
  unidad_medida: { id: number; nombre: string } | null;
  activo: boolean;
}

export interface Bodega {
  id: number;
  nombre: string;
  tipo: 'principal' | 'produccion' | 'ventas';
  descripcion: string | null;
}

const unwrap = <T>(res: { data: T }) => res.data;

export interface RelacionMpPt {
  materia_prima_id: number;
  materia_prima_nombre: string;
  unidad_medida: { id: number; nombre: string } | null;
  cantidad_requerida: number;
}

export const catalogoService = {
  materiasPrimas: () =>
    apiFetch<{ data: MateriaPrima[] }>('/materias-primas').then(unwrap),

  crearMateriaPrima: (body: { nombre: string; unidad_medida_id: number; punto_reorden: number }) =>
    apiFetch<{ data: MateriaPrima }>('/materias-primas', { method: 'POST', body: JSON.stringify(body) }).then(unwrap),

  actualizarMateriaPrima: (id: number, body: Partial<{ nombre: string; punto_reorden: number; activa: boolean }>) =>
    apiFetch<{ data: MateriaPrima }>(`/materias-primas/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(unwrap),

  eliminarMateriaPrima: (id: number) =>
    apiFetch<{ data: unknown }>(`/materias-primas/${id}`, { method: 'DELETE' }).then(unwrap),

  productosTerminados: () =>
    apiFetch<{ data: ProductoTerminado[] }>('/productos-terminados').then(unwrap),

  crearProductoTerminado: (body: { nombre: string; unidad_medida_id: number }) =>
    apiFetch<{ data: ProductoTerminado }>('/productos-terminados', { method: 'POST', body: JSON.stringify(body) }).then(unwrap),

  actualizarProductoTerminado: (id: number, body: Partial<{ nombre: string; activo: boolean }>) =>
    apiFetch<{ data: ProductoTerminado }>(`/productos-terminados/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(unwrap),

  eliminarProductoTerminado: (id: number) =>
    apiFetch<{ data: unknown }>(`/productos-terminados/${id}`, { method: 'DELETE' }).then(unwrap),

  relacionesMpPt: (ptId: number) =>
    apiFetch<{ data: RelacionMpPt[] }>(`/productos-terminados/${ptId}/materias-primas`).then(unwrap),

  asociarMp: (ptId: number, body: { materia_prima_id: number; cantidad_requerida: number }) =>
    apiFetch<{ data: unknown }>(`/productos-terminados/${ptId}/materias-primas`, { method: 'POST', body: JSON.stringify(body) }).then(unwrap),

  actualizarRelacionMp: (ptId: number, mpId: number, body: { cantidad_requerida: number }) =>
    apiFetch<{ data: unknown }>(`/productos-terminados/${ptId}/materias-primas/${mpId}`, { method: 'PATCH', body: JSON.stringify(body) }).then(unwrap),

  desasociarMp: (ptId: number, mpId: number) =>
    apiFetch<{ data: unknown }>(`/productos-terminados/${ptId}/materias-primas/${mpId}`, { method: 'DELETE' }).then(unwrap),

  bodegas: () =>
    apiFetch<{ data: Bodega[] }>('/bodegas').then(unwrap),

  crearBodega: (body: { nombre: string; tipo: string; descripcion?: string }) =>
    apiFetch<{ data: Bodega }>('/bodegas', { method: 'POST', body: JSON.stringify(body) }).then(unwrap),

  actualizarBodega: (id: number, body: Partial<{ nombre: string; descripcion: string }>) =>
    apiFetch<{ data: Bodega }>(`/bodegas/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(unwrap),

  unidadesMedida: () =>
    apiFetch<{ data: { id: number; nombre: string }[] }>('/unidades-medida').then(unwrap),
};
