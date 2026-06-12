'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, BarChart2, AlertTriangle, Flame, Scale, ChefHat, Truck, Package } from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { reportesService, type Kpis } from '@/services/reportes.service';

const modulos = [
  { nombre: 'Stock de Inventario',   desc: 'Niveles de MP y alertas de reorden',         Icono: Scale,    href: '/dashboard/inventario'  },
  { nombre: 'Reportes de Producción',desc: 'Órdenes y eficiencia productiva',             Icono: ChefHat,  href: '/dashboard/reportes'    },
  { nombre: 'Despachos',             desc: 'Salidas de PT hacia clientes',                Icono: Truck,    href: '/dashboard/despachos'   },
  { nombre: 'Catálogo',              desc: 'Materias primas y productos terminados',      Icono: Package,  href: '/dashboard/catalogo/mp' },
];

export default function GerenciaView() {
  const sesion = obtenerSesion();
  const [kpis, setKpis]       = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportesService.kpis()
      .then(setKpis)
      .catch(() => setKpis(null))
      .finally(() => setLoading(false));
  }, []);

  const tarjetas = [
    {
      titulo: 'Órdenes completadas',
      valor:  loading ? '…' : (kpis?.ordenes_produccion.completadas ?? '—').toString(),
      Icono:  Flame,
      color:  'text-green-600',
    },
    {
      titulo: 'Órdenes pendientes',
      valor:  loading ? '…' : (kpis?.ordenes_produccion.pendientes ?? '—').toString(),
      Icono:  TrendingUp,
      color:  'text-blue-600',
    },
    {
      titulo: 'Total órdenes',
      valor:  loading ? '…' : (kpis?.ordenes_produccion.total ?? '—').toString(),
      Icono:  BarChart2,
      color:  'text-purple-600',
    },
    {
      titulo: 'Alertas de reorden',
      valor:  loading ? '…' : (kpis?.alertas_reorden ?? '—').toString(),
      Icono:  AlertTriangle,
      color:  kpis && kpis.alertas_reorden > 0 ? 'text-red-600' : 'text-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      {/* COLUMNA IZQUIERDA */}
      <div className="lg:col-span-8 space-y-8">

        {/* Banner */}
        <div className="rounded-xl p-8 text-white shadow-xl relative overflow-hidden border-b-4 border-r-4 border-black/10"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 border-8 border-white/5 rounded-full -mr-20 -mt-20" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-2xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)' }}>
              <TrendingUp size={36} className="text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">Panel de Gerencia</h1>
              <p className="text-base mt-1 text-white/80 font-medium">
                ESTRATEGIA IPN-DEV <span className="mx-2 opacity-30">|</span>
                <span className="text-white">{sesion?.usuario.nombre}</span>
              </p>
              {kpis && (
                <p className="text-xs mt-2 text-white/60">
                  Período: {kpis.periodo.desde} → {kpis.periodo.hasta}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Módulos navegables */}
        <div className="rounded-xl shadow-lg p-6 border-2 border-black/5" style={{ background: 'var(--bg-left)' }}>
          <div className="flex items-center gap-3 mb-6 border-b-2 border-black/5 pb-4">
            <div className="w-3 h-3 rotate-45" style={{ background: 'var(--primary)' }} />
            <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
              Módulos Disponibles
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modulos.map(({ nombre, desc, Icono, href }) => (
              <Link key={nombre} href={href}
                className="group rounded-xl p-5 flex items-center gap-4 border-2 border-black/5 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                style={{ background: 'var(--bg-right)' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:rotate-6"
                  style={{ background: 'var(--primary)' }}>
                  <Icono size={22} color="white" />
                </div>
                <div className="flex-1">
                  <div className="font-black text-sm uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                    {nombre}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA — KPIs */}
      <div className="lg:col-span-4 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">Indicadores del mes</h3>

        {tarjetas.map(({ titulo, valor, Icono, color }) => (
          <div key={titulo}
            className="rounded-xl shadow-md p-5 flex items-center gap-4 border-2 border-black/5 transition-all hover:translate-x-1"
            style={{ background: 'var(--bg-left)' }}>
            <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-white/50"
              style={{ background: 'var(--bg-right)' }}>
              <Icono size={20} className={color} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {titulo}
              </div>
              <div className="text-2xl font-black tracking-tighter mt-0.5" style={{ color: 'var(--text-main)' }}>
                {valor}
              </div>
            </div>
          </div>
        ))}

        <Link href="/dashboard/reportes"
          className="mt-2 block w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest text-white text-center transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--primary)' }}>
          Ver reportes completos
        </Link>
      </div>
    </div>
  );
}
