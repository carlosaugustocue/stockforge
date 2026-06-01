'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChefHat, Flame, Truck, Scale, AlertTriangle, PackageCheck, BarChart2 } from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { produccionService, type OrdenProduccion } from '@/services/produccion.service';
import { inventarioService, type AlertaMp } from '@/services/inventario.service';
import { despachosService } from '@/services/despachos.service';

const modulos = [
  { nombre: 'Órdenes de Producción', desc: 'Ver y gestionar el ciclo completo',    Icono: Flame,   href: '/dashboard/produccion'  },
  { nombre: 'Stock MP',              desc: 'Materias primas disponibles en planta', Icono: Scale,   href: '/dashboard/inventario'  },
  { nombre: 'Traslados',             desc: 'Mover MP o PT entre bodegas',          Icono: Truck,   href: '/dashboard/inventario/traslados' },
  { nombre: 'Despachos',             desc: 'Registrar salida de PT a clientes',    Icono: PackageCheck, href: '/dashboard/despachos' },
  { nombre: 'Alertas',               desc: 'MP bajo punto de reorden',             Icono: AlertTriangle, href: '/dashboard/inventario/alertas' },
  { nombre: 'Reportes',              desc: 'KPIs y trazabilidad completa',         Icono: BarChart2, href: '/dashboard/reportes'  },
];

export default function ProduccionView() {
  const sesion = obtenerSesion();

  const [ordenes,  setOrdenes]  = useState<OrdenProduccion[]>([]);
  const [alertas,  setAlertas]  = useState<AlertaMp[]>([]);
  const [despachos,setDespachos]= useState<unknown[]>([]);
  const [loading,  setLoading]  = useState(true);

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

  const tarjetas = [
    { titulo: 'Órdenes pendientes', valor: loading ? '…' : pendientes.toString(),          Icono: Flame,        color: 'text-orange-500' },
    { titulo: 'En producido',       valor: loading ? '…' : enProducido.toString(),         Icono: ChefHat,      color: 'text-blue-500'   },
    { titulo: 'Total despachos',    valor: loading ? '…' : despachos.length.toString(),    Icono: Truck,        color: 'text-green-600'  },
    { titulo: 'Insumos bajo reorden',valor: loading ? '…' : alertas.length.toString(),     Icono: AlertTriangle,color: alertas.length > 0 ? 'text-red-500' : 'text-slate-400' },
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
              <ChefHat size={36} className="text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">Panel de Producción</h1>
              <p className="text-base mt-1 text-white/80 font-medium">
                OPERACIÓN IPN-DEV <span className="mx-2 opacity-30">|</span>
                <span className="text-white">{sesion?.usuario.nombre}</span>
              </p>
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
                  <div className="font-black text-sm uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>{nombre}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA — KPIs */}
      <div className="lg:col-span-4 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">Estado de planta</h3>
        {tarjetas.map(({ titulo, valor, Icono, color }) => (
          <div key={titulo}
            className="rounded-xl shadow-md p-5 flex items-center gap-4 border-2 border-black/5 transition-all hover:translate-x-1"
            style={{ background: 'var(--bg-left)' }}>
            <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-white/50"
              style={{ background: 'var(--bg-right)' }}>
              <Icono size={20} className={color} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{titulo}</div>
              <div className="text-2xl font-black tracking-tighter mt-0.5" style={{ color: 'var(--text-main)' }}>{valor}</div>
            </div>
          </div>
        ))}
        <Link href="/dashboard/produccion"
          className="block w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest text-white text-center transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--primary)' }}>
          Nueva orden de producción
        </Link>
      </div>
    </div>
  );
}
