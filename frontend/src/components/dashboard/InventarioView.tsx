'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Scale, AlertTriangle, ArrowLeftRight, PackageCheck,
  Flame, Layers, Warehouse, Clock, ChevronRight, TrendingDown,
} from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { inventarioService, type StockMp, type AlertaMp } from '@/services/inventario.service';
import { produccionService, type OrdenProduccion } from '@/services/produccion.service';
import { formatCantidad } from '@/lib/utils';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getDateStr() {
  return new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const f   = new Date(fecha.length === 10 ? fecha + 'T12:00:00' : fecha);
  f.setHours(0, 0, 0, 0);
  return Math.ceil((f.getTime() - hoy.getTime()) / 86_400_000);
}

interface ItemVencimiento {
  nombre: string;
  unidad: string;
  bodega: string;
  stock: number;
  fecha: string;
  dias: number;
}

export default function InventarioView() {
  const sesion    = obtenerSesion();
  const firstName = sesion?.usuario.nombre?.split(' ')[0] ?? '';

  const [stock,   setStock]   = useState<StockMp[]>([]);
  const [alertas, setAlertas] = useState<AlertaMp[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      inventarioService.stockMp(),
      inventarioService.alertas(),
      produccionService.listarOrdenes(),
    ]).then(([s, a, o]) => {
      if (s.status === 'fulfilled') setStock(s.value);
      if (a.status === 'fulfilled') setAlertas(a.value);
      if (o.status === 'fulfilled') setOrdenes(o.value);
    }).finally(() => setLoading(false));
  }, []);

  const ordenesActivas = ordenes.filter(o => o.estado === 'pendiente' || o.estado === 'producido').length;

  /* lotes con vencimiento en ≤ 7 días derivados del stockMp */
  const vencenProximo = useMemo<ItemVencimiento[]>(() => {
    return stock.flatMap(mp =>
      mp.por_bodega
        .filter(b => { const d = diasHasta(b.proximo_vencimiento); return d !== null && d >= 0 && d <= 7; })
        .map(b => ({
          nombre: mp.nombre,
          unidad: mp.unidad_medida,
          bodega: b.bodega,
          stock:  b.stock,
          fecha:  b.proximo_vencimiento!,
          dias:   diasHasta(b.proximo_vencimiento)!,
        }))
    ).sort((a, b) => a.dias - b.dias);
  }, [stock]);

  /* alertas ordenadas por faltante desc (las más críticas primero) */
  const alertasOrdenadas = useMemo(() =>
    [...alertas].sort((a, b) => b.faltante - a.faltante).slice(0, 5),
    [alertas]);

  const ACCIONES = [
    { label: 'Ver alertas',       href: '/dashboard/inventario/alertas',   Icon: AlertTriangle, bg: 'bg-red-50',    color: 'text-red-500'    },
    { label: 'Registrar traslado',href: '/dashboard/inventario/traslados', Icon: ArrowLeftRight,bg: 'bg-blue-50',   color: 'text-blue-500'   },
    { label: 'Órdenes de compra', href: '/dashboard/recepciones',          Icon: PackageCheck,  bg: 'bg-green-50',  color: 'text-green-600'  },
    { label: 'Vista bodegas',     href: '/dashboard/inventario/bodegas',   Icon: Warehouse,     bg: 'bg-purple-50', color: 'text-purple-600' },
    { label: 'Ver lotes',         href: '/dashboard/inventario/lotes',     Icon: Layers,        bg: 'bg-amber-50',  color: 'text-amber-600'  },
    { label: 'Stock MP',          href: '/dashboard/inventario',           Icon: Scale,         bg: 'bg-slate-100', color: 'text-slate-600'  },
  ];

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Banner */}
      <div className="rounded-2xl p-6 flex items-center justify-between" style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Scale size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">
              {getGreeting()}, <span className="text-white font-semibold">{firstName}</span>
            </p>
            <h1 className="text-xl font-bold text-white leading-tight">Panel de Inventarios</h1>
            <p className="text-white/50 text-xs mt-0.5 capitalize">{getDateStr()}</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-white/15 text-xs font-medium text-white border border-white/10">
          Encargado de Inventarios
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { titulo: 'Materias primas',    valor: loading ? '—' : stock.length,         Icon: Scale,         color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { titulo: 'Alertas reorden',    valor: loading ? '—' : alertas.length,       Icon: AlertTriangle, color: alertas.length > 0 ? 'text-red-500' : 'text-slate-400', bg: alertas.length > 0 ? 'bg-red-50' : 'bg-slate-50' },
          { titulo: 'Vencen ≤ 7 días',   valor: loading ? '—' : vencenProximo.length, Icon: Clock,         color: vencenProximo.length > 0 ? 'text-amber-600' : 'text-slate-400', bg: vencenProximo.length > 0 ? 'bg-amber-50' : 'bg-slate-50' },
          { titulo: 'Órdenes activas',    valor: loading ? '—' : ordenesActivas,       Icon: Flame,         color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map(({ titulo, valor, Icon, color, bg }) => (
          <div key={titulo} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
              <Icon size={17} className={color} />
            </div>
            <div className="text-2xl font-black tabular-nums" style={{ color: 'var(--text-main)' }}>{valor}</div>
            <div className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{titulo}</div>
          </div>
        ))}
      </div>

      {/* Alertas críticas */}
      {!loading && alertasOrdenadas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle size={14} className="text-red-500" />
              </div>
              <h2 className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                Materias primas bajo reorden
              </h2>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                {alertas.length}
              </span>
            </div>
            <Link href="/dashboard/inventario/alertas" className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: 'var(--primary)' }}>
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {alertasOrdenadas.map(mp => (
              <div key={mp.materia_prima_id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>{mp.nombre}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Stock actual</p>
                    <p className="text-sm font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                      {formatCantidad(mp.stock_total, mp.unidad_medida)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Faltante</p>
                    <p className="text-sm font-black tabular-nums text-red-600">
                      {formatCantidad(mp.faltante, mp.unidad_medida)}
                    </p>
                  </div>
                  <Link href="/dashboard/inventario/alertas"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'var(--primary)' }}>
                    Ordenar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vencimientos próximos */}
      {!loading && vencenProximo.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-100 bg-amber-50/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock size={14} className="text-amber-600" />
              </div>
              <h2 className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                Lotes próximos a vencer
              </h2>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                {vencenProximo.length} en ≤ 7 días
              </span>
            </div>
            <Link href="/dashboard/inventario/lotes" className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: 'var(--primary)' }}>
              Ver lotes <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {vencenProximo.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dias === 0 ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>{item.nombre}</p>
                    <p className="text-xs text-slate-400">{item.bodega}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className="text-xs text-slate-400">Stock</p>
                    <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-main)' }}>
                      {formatCantidad(item.stock, item.unidad)}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.dias === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.dias === 0 ? 'Hoy' : `${item.dias}d`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Todo en orden */}
      {!loading && alertas.length === 0 && vencenProximo.length === 0 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-50 border border-green-100">
          <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <TrendingDown size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">Inventario en buen estado</p>
            <p className="text-xs text-green-600 mt-0.5">Sin alertas de reorden ni vencimientos próximos.</p>
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {ACCIONES.map(({ label, href, Icon, bg, color }) => (
            <Link key={label} href={href}
              className="flex flex-col items-center gap-2 p-3.5 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <span className="text-[11px] font-bold leading-tight text-slate-600">{label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
