'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Scale, AlertTriangle, ArrowLeftRight, PackageCheck,
  Flame, Truck, ChevronRight,
} from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { inventarioService, type StockMp, type AlertaMp } from '@/services/inventario.service';
import { produccionService, type OrdenProduccion } from '@/services/produccion.service';

const MODULOS = [
  { nombre: 'Stock de MP',        desc: 'Consulta niveles por bodega',              Icono: Scale,         href: '/dashboard/inventario'           },
  { nombre: 'Alertas de stock',   desc: 'Materias primas bajo punto de reorden',    Icono: AlertTriangle, href: '/dashboard/inventario/alertas'   },
  { nombre: 'Traslados',          desc: 'Mover materia prima entre bodegas',        Icono: ArrowLeftRight,href: '/dashboard/inventario/traslados' },
  { nombre: 'Órdenes de compra',  desc: 'Pedidos y recepción de materias primas',   Icono: PackageCheck,  href: '/dashboard/recepciones'          },
  { nombre: 'Producción',         desc: 'Gestión del ciclo productivo completo',    Icono: Flame,         href: '/dashboard/produccion'           },
  { nombre: 'Despachos',          desc: 'Salida de productos terminados',           Icono: Truck,         href: '/dashboard/despachos'            },
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

  const activas     = ordenes.filter(o => o.estado === 'pendiente' || o.estado === 'producido').length;
  const completadas = ordenes.filter(o => o.estado === 'completada').length;
  const hayAlertas  = alertas.length > 0;

  const tarjetas = [
    {
      titulo: 'Materias primas',
      valor:  loading ? '—' : stock.length.toString(),
      Icono:  Scale,
      color:  'text-blue-600',
      bg:     'bg-blue-50',
    },
    {
      titulo: 'Alertas de reorden',
      valor:  loading ? '—' : alertas.length.toString(),
      Icono:  AlertTriangle,
      color:  hayAlertas ? 'text-red-500' : 'text-slate-400',
      bg:     hayAlertas ? 'bg-red-50' : 'bg-slate-50',
    },
    {
      titulo: 'Órdenes activas',
      valor:  loading ? '—' : activas.toString(),
      Icono:  Flame,
      color:  'text-orange-500',
      bg:     'bg-orange-50',
    },
    {
      titulo: 'Órdenes completadas',
      valor:  loading ? '—' : completadas.toString(),
      Icono:  PackageCheck,
      color:  'text-green-600',
      bg:     'bg-green-50',
    },
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
              {getGreeting()},{' '}
              <span className="text-white font-semibold">{firstName}</span>
            </p>
            <h1 className="text-xl font-bold text-white leading-tight">Panel de Inventarios</h1>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1.5">
          <span className="text-xs text-white/60 capitalize">{getDateStr()}</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/15 text-xs font-medium text-white border border-white/10">
            Encargado de Inventarios
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

      {/* Alerta strip */}
      {hayAlertas && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">
              {alertas.length} materia{alertas.length !== 1 ? 's' : ''} prima{alertas.length !== 1 ? 's' : ''} bajo punto de reorden
            </p>
          </div>
          <Link href="/dashboard/inventario/alertas"
            className="flex-shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
            Ver alertas →
          </Link>
        </div>
      )}

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

      {/* Acción rápida */}
      <Link href="/dashboard/inventario/traslados"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-95"
        style={{ background: 'var(--primary)' }}>
        <ArrowLeftRight size={15} />
        Registrar traslado
      </Link>
    </div>
  );
}
