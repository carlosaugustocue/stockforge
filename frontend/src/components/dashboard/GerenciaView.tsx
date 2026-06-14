'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, BarChart2, AlertTriangle, Flame,
  Scale, ChefHat, Truck, ShoppingBag, ChevronRight, ArrowLeftRight,
} from 'lucide-react';
import { obtenerSesion } from '@/lib/session';
import { reportesService, type Kpis } from '@/services/reportes.service';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getDateStr() {
  return new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtFecha(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

export default function GerenciaView() {
  const sesion    = obtenerSesion();
  const firstName = sesion?.usuario.nombre?.split(' ')[0] ?? '';

  const [kpis,    setKpis]    = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportesService.kpis()
      .then(setKpis)
      .catch(() => setKpis(null))
      .finally(() => setLoading(false));
  }, []);

  const ordenes    = kpis?.ordenes_produccion;
  const hayAlertas = (kpis?.alertas_reorden ?? 0) > 0;
  const total      = ordenes?.total ?? 0;

  /* barras de estado de producción */
  const estados = [
    { label: 'Completadas', value: ordenes?.completadas ?? 0, color: 'bg-green-400'  },
    { label: 'Pendientes',  value: ordenes?.pendientes  ?? 0, color: 'bg-amber-400'  },
    { label: 'Anuladas',    value: ordenes?.anuladas    ?? 0, color: 'bg-slate-300'   },
  ];

  const REPORTES = [
    { label: 'KPIs globales',   href: '/dashboard/reportes',             Icon: BarChart2,     color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Stock PT',        href: '/dashboard/inventario/stock-pt',  Icon: ShoppingBag,   color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Movimientos',     href: '/dashboard/reportes/movimientos', Icon: ArrowLeftRight, color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Despachos',       href: '/dashboard/despachos',            Icon: Truck,         color: 'text-slate-600',  bg: 'bg-slate-100' },
    { label: 'Inventario MP',   href: '/dashboard/inventario',           Icon: Scale,         color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Producción',      href: '/dashboard/produccion',           Icon: ChefHat,       color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Banner */}
      <div className="rounded-2xl p-6 flex items-center justify-between" style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">
              {getGreeting()}, <span className="text-white font-semibold">{firstName}</span>
            </p>
            <h1 className="text-xl font-bold text-white leading-tight">Panel de Gerencia</h1>
            {kpis && (
              <p className="text-white/50 text-xs mt-0.5 capitalize">
                {getDateStr()} · Período: {fmtFecha(kpis.periodo.desde)} – {fmtFecha(kpis.periodo.hasta)}
              </p>
            )}
          </div>
        </div>
        <span className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-white/15 text-xs font-medium text-white border border-white/10">
          Gerencia
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { titulo: 'Completadas (mes)',  valor: loading ? '—' : (ordenes?.completadas ?? 0), Icon: Flame,         color: 'text-green-600',  bg: 'bg-green-50'   },
          { titulo: 'Pendientes',         valor: loading ? '—' : (ordenes?.pendientes  ?? 0), Icon: TrendingUp,    color: 'text-amber-600',  bg: 'bg-amber-50'   },
          { titulo: 'Total órdenes',      valor: loading ? '—' : (ordenes?.total       ?? 0), Icon: BarChart2,     color: 'text-purple-600', bg: 'bg-purple-50'  },
          { titulo: 'Alertas reorden',    valor: loading ? '—' : (kpis?.alertas_reorden ?? 0),Icon: AlertTriangle, color: hayAlertas ? 'text-red-500' : 'text-slate-400', bg: hayAlertas ? 'bg-red-50' : 'bg-slate-50' },
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

      {/* Estado de producción del mes */}
      {!loading && total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
              Estado de producción del mes
            </h2>
            <Link href="/dashboard/produccion" className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: 'var(--primary)' }}>
              Ver órdenes <ChevronRight size={12} />
            </Link>
          </div>

          {/* Barra apilada */}
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
            {estados.filter(e => e.value > 0).map(e => (
              <div
                key={e.label}
                className={`${e.color} transition-all`}
                style={{ width: `${(e.value / total) * 100}%` }}
                title={`${e.label}: ${e.value}`}
              />
            ))}
          </div>

          {/* Leyenda */}
          <div className="grid grid-cols-3 gap-3">
            {estados.map(e => (
              <div key={e.label} className="flex items-center gap-2.5">
                <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${e.color}`} />
                <div>
                  <p className="text-xs font-medium text-slate-500">{e.label}</p>
                  <p className="text-lg font-black tabular-nums leading-tight" style={{ color: 'var(--text-main)' }}>
                    {e.value}
                    <span className="text-xs font-medium text-slate-400 ml-1">
                      ({total > 0 ? Math.round((e.value / total) * 100) : 0}%)
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de reorden */}
      {!loading && hayAlertas && (
        <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={17} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">
                {kpis?.alertas_reorden} materia{(kpis?.alertas_reorden ?? 0) !== 1 ? 's' : ''} prima{(kpis?.alertas_reorden ?? 0) !== 1 ? 's' : ''} bajo punto de reorden
              </p>
              <p className="text-xs text-red-600 mt-0.5">Revisar inventario para evitar paros de producción.</p>
            </div>
          </div>
          <Link href="/dashboard/inventario/alertas"
            className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 flex-shrink-0">
            Revisar <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {/* Acceso rápido a secciones */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Acceso rápido
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {REPORTES.map(({ label, href, Icon, bg, color }) => (
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
