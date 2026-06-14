'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChefHat, Flame, Truck, Scale,
  AlertTriangle, PackageCheck, BarChart2,
  ChevronRight, Plus, ArrowRight,
} from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { produccionService, type OrdenProduccion } from '@/services/produccion.service';
import { inventarioService, type AlertaMp } from '@/services/inventario.service';
import { despachosService, type Despacho } from '@/services/despachos.service';
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

const ESTADO_LABEL: Record<string, string> = {
  pendiente:  'Pendiente',
  producido:  'Producido',
  completada: 'Completada',
  anulada:    'Anulada',
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-700',
  producido:  'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  anulada:    'bg-slate-100 text-slate-500',
};

export default function ProduccionView() {
  const sesion    = obtenerSesion();
  const firstName = sesion?.usuario.nombre?.split(' ')[0] ?? '';

  const [ordenes,   setOrdenes]   = useState<OrdenProduccion[]>([]);
  const [alertas,   setAlertas]   = useState<AlertaMp[]>([]);
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      produccionService.listarOrdenes(),
      inventarioService.alertas(),
      despachosService.listar(),
    ]).then(([o, a, d]) => {
      if (o.status === 'fulfilled') setOrdenes(o.value);
      if (a.status === 'fulfilled') setAlertas(a.value);
      if (d.status === 'fulfilled') setDespachos(d.value);
    }).finally(() => setLoading(false));
  }, []);

  const pendientes        = useMemo(() => ordenes.filter(o => o.estado === 'pendiente').sort((a, b) => a.fecha_planificada.localeCompare(b.fecha_planificada)), [ordenes]);
  const esperandoTraslado = useMemo(() => ordenes.filter(o => o.estado === 'producido'), [ordenes]);
  const completadas       = useMemo(() => ordenes.filter(o => o.estado === 'completada').length, [ordenes]);
  const despachosRecientes= useMemo(() => [...despachos].sort((a, b) => b.id - a.id).slice(0, 3), [despachos]);

  const ACCIONES = [
    { label: 'Nueva orden',    href: '/dashboard/produccion',          Icon: Plus,        bg: 'bg-orange-50',  color: 'text-orange-500' },
    { label: 'Ver órdenes',    href: '/dashboard/produccion',          Icon: Flame,       bg: 'bg-red-50',     color: 'text-red-500'    },
    { label: 'Stock MP',       href: '/dashboard/inventario',          Icon: Scale,       bg: 'bg-blue-50',    color: 'text-blue-500'   },
    { label: 'Despachos',      href: '/dashboard/despachos',           Icon: Truck,       bg: 'bg-green-50',   color: 'text-green-600'  },
    { label: 'Alertas',        href: '/dashboard/inventario/alertas',  Icon: AlertTriangle,bg:'bg-amber-50',   color: 'text-amber-600'  },
    { label: 'Reportes',       href: '/dashboard/reportes',            Icon: BarChart2,   bg: 'bg-purple-50',  color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Banner */}
      <div className="rounded-2xl p-6 flex items-center justify-between" style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <ChefHat size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">
              {getGreeting()}, <span className="text-white font-semibold">{firstName}</span>
            </p>
            <h1 className="text-xl font-bold text-white leading-tight">Panel de Producción</h1>
            <p className="text-white/50 text-xs mt-0.5 capitalize">{getDateStr()}</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-white/15 text-xs font-medium text-white border border-white/10">
          Jefe de Producción
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { titulo: 'Pendientes',          valor: loading ? '—' : pendientes.length,        Icon: Flame,         color: pendientes.length > 0 ? 'text-orange-500' : 'text-slate-400',     bg: pendientes.length > 0 ? 'bg-orange-50' : 'bg-slate-50' },
          { titulo: 'Listos para traslado',valor: loading ? '—' : esperandoTraslado.length, Icon: ArrowRight,    color: esperandoTraslado.length > 0 ? 'text-blue-600' : 'text-slate-400', bg: esperandoTraslado.length > 0 ? 'bg-blue-50' : 'bg-slate-50' },
          { titulo: 'Completadas',         valor: loading ? '—' : completadas,              Icon: PackageCheck,  color: 'text-green-600', bg: 'bg-green-50' },
          { titulo: 'Alertas insumos',     valor: loading ? '—' : alertas.length,           Icon: AlertTriangle, color: alertas.length > 0 ? 'text-red-500' : 'text-slate-400', bg: alertas.length > 0 ? 'bg-red-50' : 'bg-slate-50' },
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

      {/* Órdenes esperando traslado a ventas — acción urgente */}
      {!loading && esperandoTraslado.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-blue-50/60 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <ArrowRight size={14} className="text-blue-600" />
              </div>
              <h2 className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                Listos para trasladar a ventas
              </h2>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                {esperandoTraslado.length}
              </span>
            </div>
            <Link href="/dashboard/produccion" className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: 'var(--primary)' }}>
              Ir a producción <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {esperandoTraslado.map(o => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                      {o.producto_terminado.nombre}
                    </p>
                    <p className="text-xs text-slate-400">OP #{o.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                    {formatCantidad(o.cantidad_producida ?? o.cantidad_planificada, o.producto_terminado.unidad)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    Producido
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Órdenes pendientes */}
      {!loading && pendientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                <Flame size={14} className="text-orange-500" />
              </div>
              <h2 className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                Órdenes pendientes
              </h2>
            </div>
            <Link href="/dashboard/produccion" className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: 'var(--primary)' }}>
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-5 py-2.5">Producto</th>
                  <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-2.5">Cantidad</th>
                  <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-2.5">Fecha planificada</th>
                  <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendientes.slice(0, 5).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                          {o.producto_terminado.nombre}
                        </p>
                        <p className="text-xs text-slate-400">OP #{o.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-main)' }}>
                        {formatCantidad(o.cantidad_planificada, o.producto_terminado.unidad)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-slate-600">
                        {new Date(o.fecha_planificada + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ESTADO_BADGE[o.estado] ?? ''}`}>
                        {ESTADO_LABEL[o.estado] ?? o.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alertas de insumos */}
      {!loading && alertas.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              <strong>{alertas.length}</strong> insumo{alertas.length !== 1 ? 's' : ''} bajo punto de reorden — puede afectar la producción
            </p>
          </div>
          <Link href="/dashboard/inventario/alertas" className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 flex-shrink-0">
            Ver <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {/* Últimos despachos */}
      {!loading && despachosRecientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                <Truck size={14} className="text-green-600" />
              </div>
              <h2 className="text-sm font-black" style={{ color: 'var(--text-main)' }}>Últimos despachos</h2>
            </div>
            <Link href="/dashboard/despachos" className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: 'var(--primary)' }}>
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {despachosRecientes.map(d => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                      {d.producto_terminado ?? 'Sin producto'}
                    </p>
                    {d.referencia_cliente && (
                      <p className="text-xs text-slate-400 truncate">{d.referencia_cliente}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: 'var(--text-main)' }}>
                  {d.cantidad.toLocaleString('es-CO', { maximumFractionDigits: 1 })} uds.
                </span>
              </div>
            ))}
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
