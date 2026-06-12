import { apiFetch } from '@/lib/api-client';

export interface OrdenesProduccionKpi {
  pendientes: number;
  producidas: number;
  completadas: number;
  anuladas: number;
  total: number;
}

export interface Kpis {
  ordenes_produccion: OrdenesProduccionKpi;
  despachos_mes: unknown;
  mp_recibida_mes: unknown;
  alertas_reorden: number;
  periodo: { desde: string; hasta: string };
}

const unwrap = <T>(res: { data: T }) => res.data;

export const reportesService = {
  kpis: () =>
    apiFetch<{ data: Kpis }>('/reportes/kpis').then(unwrap),

  produccion: (desde?: string, hasta?: string) => {
    const qs =
      desde ? `?fecha_desde=${desde}&fecha_hasta=${hasta ?? ''}` : '';
    return apiFetch<{ data: unknown }>(`/reportes/produccion${qs}`).then(unwrap);
  },

  despachos: (desde?: string, hasta?: string) => {
    const qs =
      desde ? `?fecha_desde=${desde}&fecha_hasta=${hasta ?? ''}` : '';
    return apiFetch<{ data: unknown }>(`/reportes/despachos${qs}`).then(unwrap);
  },

  movimientos: (params: Record<string, string> = {}) => {
    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return apiFetch<{ data: unknown }>(`/reportes/movimientos${qs}`).then(unwrap);
  },

  stockPt: () =>
    apiFetch<{ data: unknown }>('/reportes/stock-pt').then(unwrap),
};
