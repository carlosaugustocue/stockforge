'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, BarChart2, ShoppingBag, ArrowLeftRight, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { reportesService, type Kpis } from '@/services/reportes.service';

export default function ReportesPage() {
  const [kpis,    setKpis]    = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const cargar = () => {
    setLoading(true);
    setError('');
    reportesService.kpis()
      .then(setKpis)
      .catch(e => setError(e.message ?? 'Error al cargar KPIs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Reportes y KPIs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Resumen ejecutivo del sistema de inventario
          </p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {loading
        ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
        : kpis && (
          <div className="space-y-6">
            {/* Período */}
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Período: {kpis.periodo.desde} — {kpis.periodo.hasta}
            </p>

            {/* KPI Cards — Órdenes de Producción */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Órdenes de Producción
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  label="Pendientes"
                  value={kpis.ordenes_produccion.pendientes}
                  icon={<Clock size={20} className="text-yellow-500" />}
                  color="bg-yellow-50 border-yellow-200"
                />
                <KpiCard
                  label="Producidas"
                  value={kpis.ordenes_produccion.producidas}
                  icon={<BarChart2 size={20} className="text-blue-500" />}
                  color="bg-blue-50 border-blue-200"
                />
                <KpiCard
                  label="Completadas"
                  value={kpis.ordenes_produccion.completadas}
                  icon={<CheckCircle size={20} className="text-green-500" />}
                  color="bg-green-50 border-green-200"
                />
                <KpiCard
                  label="Anuladas"
                  value={kpis.ordenes_produccion.anuladas}
                  icon={<XCircle size={20} className="text-red-500" />}
                  color="bg-red-50 border-red-200"
                />
              </div>
            </div>

            {/* Alertas */}
            {kpis.alertas_reorden > 0 && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                <p className="text-sm font-bold text-red-700">
                  {kpis.alertas_reorden} materia{kpis.alertas_reorden !== 1 ? 's prima requieren' : ' prima requiere'} reposición urgente.
                </p>
                <Link href="/dashboard/inventario/alertas"
                  className="ml-auto text-[10px] font-black uppercase tracking-widest text-white px-3 py-1 rounded transition hover:opacity-80"
                  style={{ background: 'var(--primary)' }}>
                  Ver alertas
                </Link>
              </div>
            )}

            {/* Accesos rápidos a sub-reportes */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Reportes detallados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReporteCard
                  href="/dashboard/reportes/stock-pt"
                  icon={<ShoppingBag size={22} />}
                  label="Stock de Producto Terminado"
                  desc="Lotes disponibles en bodega de ventas"
                />
                <ReporteCard
                  href="/dashboard/reportes/movimientos"
                  icon={<ArrowLeftRight size={22} />}
                  label="Movimientos de Inventario"
                  desc="Historial completo de movimientos por tipo y fecha"
                />
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

function KpiCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`rounded-xl p-5 border-2 flex items-center gap-4 ${color}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{value}</p>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

function ReporteCard({ href, icon, label, desc }: {
  href: string; icon: React.ReactNode; label: string; desc: string;
}) {
  return (
    <Link href={href}
      className="rounded-xl p-5 border-2 border-black/5 flex items-center gap-4 hover:border-black/20 transition-colors group"
      style={{ background: 'var(--bg-left)' }}>
      <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 text-white group-hover:opacity-90 transition-opacity"
        style={{ background: 'var(--primary)' }}>
        {icon}
      </div>
      <div>
        <p className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
    </Link>
  );
}
