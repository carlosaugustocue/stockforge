import { apiFetch } from '@/lib/api-client';

export interface StockMp {
  materia_prima_id: number;
  nombre: string;
  unidad_medida: string;
  punto_reorden: number;
  stock_total: number;
  bajo_reorden: boolean;
  por_bodega: {
    bodega_id: number;
    bodega: string;
    stock: number;
    lotes_activos: number;
    proximo_vencimiento: string | null;
  }[];
}

export interface AlertaMp extends StockMp {
  faltante: number;
}

export interface TrasladoBody {
  lote_id: number;
  bodega_destino_id: number;
  cantidad: number;
}

const unwrap = <T>(res: { data: T }) => res.data;

export const inventarioService = {
  stockMp: () =>
    apiFetch<{ data: StockMp[] }>('/inventario/stock/mp').then(unwrap),

  stockMpPorId: (id: number) =>
    apiFetch<{ data: StockMp }>(`/inventario/stock/mp/${id}`).then(unwrap),

  alertas: () =>
    apiFetch<{ data: AlertaMp[] }>('/inventario/alertas').then(unwrap),

  trasladar: (body: TrasladoBody) =>
    apiFetch<{ data: unknown }>('/inventario/traslados', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(unwrap),
};
