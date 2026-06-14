'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChefHat, Flame, Truck, Scale,
  AlertTriangle, PackageCheck, BarChart2, ChevronRight, Plus,
} from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { produccionService, type OrdenProduccion } from '@/services/produccion.service';
import { inventarioService, type AlertaMp } from '@/services/inventario.service';
import { despachosService } from '@/services/despachos.service';

const MODULOS = [
  { nombre: 'Órdenes de Producción', desc: 'Ver y gestionar el ciclo completo',     Icono: Flame,        href: '/dashboard/produccion'          },
  { nombre: 'Stock de MP',           desc: 'Materias primas disponibles en planta', Icono: Scale,        href: '/dashboard/inventario'          },
  { nombre: 'Traslados',             desc: 'Mover MP o PT entre bodegas',           Icono: Truck,        href: '/dashboard/inventario/traslados'},
  { nombre: 'Despachos',             desc: 'Registrar salida de PT a clientes',     Icono: PackageCheck, href: '/dashboard/despachos'           },
  { nombre: 'Alertas',               desc: 'Materias primas bajo reorden',          Icono: AlertTriangle,href: '/dashboard/inventario/alertas'  },
  { nombre: 'Reportes',              desc: 'KPIs y trazabilidad completa',          Icono: BarChart2,    href: '/dashboard/reportes'            },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getDateStr() {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function ProduccionView() {
  const sesion    = obtenerSesion();
  const firstName = sesion?.usuario.nombre?.split(' ')[0] ?? '';

  const [ordenes,   setOrdenes]   = useState<OrdenProduccion[]>([]);
  const [alertas,   setAlertas]   = useState<AlertaMp[]>([]);
  const [despachos, setDespachos] = useState<unknown[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      produccionService.listarOrdenes(),
      inventarioService.alertas(),
      despachosService.listar(),
    ]).then(([o, a, d]) => {
      if (o.status === 'fulfilled') setOrdenes(o.value);
      if (a.status === 'fulfilled') setAlertas(a.value);
      if (d.status === 'fulfilled') setDespachos(d.value as unknown[]);
    }).finally(() => setLoading(false));
  }, []);

  const pendientes  = ordenes.filter(o => o.estado === 'pendiente').length;
  const enProducido = ordenes.filter(o => o.estado === 'producido').length;
  const hayAlertas  = alertas.length > 0;

  const tarjetas = [
    {
      titulo: 'Órdenes pendientes',
      valor:  loading ? '—' : pendientes.toString(),
      Icono:  Flame,
      color:  'text-orange-500',
      bg:     'bg-orange-50',
    },
    {
      titulo: 'En producción',
      valor:  loading ? '—' : enProducido.toString(),
      Icono:  ChefHat,
      color:  'text-blue-500',
      bg:     'bg-blue-50',
    },
    {
      titulo: 'Total despachos',
      valor:  loading ? '—' : despachos.length.toString(),
      Icono:  Truck,
      color:  'text-green-600',
      bg:     'bg-green-50',
    },
    {
      titulo: 'Insumos bajo reorden',
      valor:  loading ? '—' : alertas.length.toString(),
      Icono:  AlertTriangle,
      color:  hayAlertas ? 'text-red-500' : 'text-slate-400',
      bg:     hayAlertas ? 'bg-red-50'    : 'bg-slate-50',
    },
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
              {getGreeting()},{' '}
              <span className="text-white font-semibold">{firstName}</span>
            </p>
            <h1 className="text-xl font-bold text-white leading-tight">Panel de Producción</h1>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1.5">
          <span className="text-xs text-white/60 capitalize">{getDateStr()}</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/15 text-xs font-medium text-white border border-white/10">
            Jefe de Producción
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {tarjetas.map(({ titulo, valor, Icono, color, bg }) => (
          <div key={titulo} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
              <Icono size={16} className={color} />
            </div>
            <div className="text-2xl font-bold text-slate-800 tabular-nums">{valor}</div>
            <div className="text-xs font-medium text-slate-400 mt-1">{titulo}</div>
          </div>
        ))}
      </div>

      {/* Módulos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Módulos disponibles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {MODULOS.map(({ nombre, desc, Icono, href }) => (
            <Link key={nombre} href={href}
              className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-150">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(139,35,35,0.08)' }}>
                <Icono size={17} style={{ color: 'var(--primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-700 truncate">{nombre}</div>
                <div className="text-xs text-slate-400 truncate">{desc}</div>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link href="/dashboard/produccion"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-95"
        style={{ background: 'var(--primary)' }}>
        <Plus size={15} />
        Nueva orden de producción
      </Link>
    </div>
  );
}
