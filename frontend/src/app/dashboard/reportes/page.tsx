'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw, ShoppingBag, ArrowLeftRight,
  AlertTriangle, TrendingUp, Target, Star, Warehouse,
  FileText, FileSpreadsheet,
} from 'lucide-react';
import {
  reportesService,
  type Kpis,
  type IndicadoresOperativos,
} from '@/services/reportes.service';

// ── Paleta de colores ────────────────────────────────────────────────────────
const COLOR_COMPLETADA = '#22c55e';
const COLOR_PRODUCIDO  = '#3b82f6';
const COLOR_PENDIENTE  = '#f59e0b';
const COLOR_ANULADA    = '#ef4444';
const COLOR_PRIMARY    = '#1e293b';

const ESTADO_COLOR: Record<string, string> = {
  bueno: 'text-green-600',
  medio: 'text-amber-500',
  bajo:  'text-red-500',
};
const ESTADO_BG: Record<string, string> = {
  bueno: 'bg-green-50 border-green-200',
  medio: 'bg-amber-50 border-amber-200',
  bajo:  'bg-red-50  border-red-200',
};
const ESTADO_BAR: Record<string, string> = {
  bueno: 'bg-green-500',
  medio: 'bg-amber-400',
  bajo:  'bg-red-400',
};
const ESTADO_LABEL: Record<string, string> = {
  bueno: 'Óptimo',
  medio: 'Aceptable',
  bajo:  'Crítico',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtMes(ym: string): string {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
}

function fmtFecha(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// ── Exportación PDF ──────────────────────────────────────────────────────────
async function exportarPDF(ind: IndicadoresOperativos, kpis: Kpis | null) {
  const { jsPDF } = await import('jspdf');
  const autoTable  = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const hoy = new Date().toLocaleDateString('es-CO', { dateStyle: 'long' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('IPN-DEV — Informe de Indicadores Operativos', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${hoy}   |   Período: ${ind.periodo.desde} — ${ind.periodo.hasta}`, 14, 28);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('KPIs Logísticos', 14, 42);

  const filas = [
    ['Rotación de inventario',   `${ind.indicadores.rotacion_inventario.valor} veces`,   ESTADO_LABEL[ind.indicadores.rotacion_inventario.estado]],
    ['Exactitud de inventario',  `${ind.indicadores.exactitud_inventario.valor} %`,       ESTADO_LABEL[ind.indicadores.exactitud_inventario.estado]],
    ['Nivel de servicio',        `${ind.indicadores.nivel_servicio.valor} %`,             ESTADO_LABEL[ind.indicadores.nivel_servicio.estado]],
    ['Utilización de almacén',   `${ind.indicadores.utilizacion_almacen.valor} %`,        ESTADO_LABEL[ind.indicadores.utilizacion_almacen.estado]],
  ];

  autoTable(doc, {
    startY: 46,
    head: [['Indicador', 'Valor', 'Estado']],
    body: filas,
    headStyles: { fillColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  if (kpis) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 100;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Órdenes de Producción (mes actual)', 14, finalY + 14);

    autoTable(doc, {
      startY: finalY + 18,
      head: [['Estado', 'Cantidad']],
      body: [
        ['Pendientes',  kpis.ordenes_produccion.pendientes],
        ['Producidas',  kpis.ordenes_produccion.producidas],
        ['Completadas', kpis.ordenes_produccion.completadas],
        ['Anuladas',    kpis.ordenes_produccion.anuladas],
      ],
      headStyles: { fillColor: [30, 41, 59] },
    });
  }

  doc.save(`indicadores-operativos-${ind.periodo.hasta}.pdf`);
}

// ── Exportación Excel ────────────────────────────────────────────────────────
async function exportarExcel(ind: IndicadoresOperativos, kpis: Kpis | null) {
  const XLSX = await import('xlsx');

  const wsIndicadores = XLSX.utils.aoa_to_sheet([
    ['Indicador', 'Valor', 'Unidad', 'Estado', 'Descripción'],
    ['Rotación de inventario',  ind.indicadores.rotacion_inventario.valor,  'veces', ESTADO_LABEL[ind.indicadores.rotacion_inventario.estado],  ind.indicadores.rotacion_inventario.descripcion],
    ['Exactitud de inventario', ind.indicadores.exactitud_inventario.valor, '%',     ESTADO_LABEL[ind.indicadores.exactitud_inventario.estado], ind.indicadores.exactitud_inventario.descripcion],
    ['Nivel de servicio',       ind.indicadores.nivel_servicio.valor,       '%',     ESTADO_LABEL[ind.indicadores.nivel_servicio.estado],       ind.indicadores.nivel_servicio.descripcion],
    ['Utilización de almacén',  ind.indicadores.utilizacion_almacen.valor,  '%',     ESTADO_LABEL[ind.indicadores.utilizacion_almacen.estado],  ind.indicadores.utilizacion_almacen.descripcion],
  ]);

  const wsDespachos = XLSX.utils.aoa_to_sheet([
    ['Fecha', 'Unidades despachadas', 'N° despachos'],
    ...ind.graficos.despachos_30d.map(d => [d.fecha, d.total, d.num]),
  ]);

  const wsProduccion = XLSX.utils.aoa_to_sheet([
    ['Mes', 'Completadas', 'Producidas', 'Pendientes', 'Anuladas'],
    ...ind.graficos.produccion_6m.map(p => [p.mes, p.completada, p.producido, p.pendiente, p.anulada]),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsIndicadores, 'Indicadores');
  XLSX.utils.book_append_sheet(wb, wsDespachos,   'Despachos 30d');
  XLSX.utils.book_append_sheet(wb, wsProduccion,  'Producción 6m');

  if (kpis) {
    const wsOrdenes = XLSX.utils.aoa_to_sheet([
      ['Estado', 'Cantidad'],
      ['Pendientes',  kpis.ordenes_produccion.pendientes],
      ['Producidas',  kpis.ordenes_produccion.producidas],
      ['Completadas', kpis.ordenes_produccion.completadas],
      ['Anuladas',    kpis.ordenes_produccion.anuladas],
    ]);
    XLSX.utils.book_append_sheet(wb, wsOrdenes, 'Órdenes');
  }

  XLSX.writeFile(wb, `indicadores-operativos-${ind.periodo.hasta}.xlsx`);
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ReportesPage() {
  const [kpis, setKpis]   = useState<Kpis | null>(null);
  const [ind,  setInd]    = useState<IndicadoresOperativos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([reportesService.kpis(), reportesService.indicadores()])
      .then(([k, i]) => { setKpis(k); setInd(i); })
      .catch(e => setError(e.message ?? 'Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Dashboard de Indicadores
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            KPIs operativos · {ind ? `${ind.periodo.desde} — ${ind.periodo.hasta}` : 'Cargando…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ind && kpis && (
            <>
              <button
                onClick={() => exportarPDF(ind, kpis)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-2 hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                <FileText size={13} /> PDF
              </button>
              <button
                onClick={() => exportarExcel(ind, kpis)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-2 hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                <FileSpreadsheet size={13} /> Excel
              </button>
            </>
          )}
          <button
            onClick={cargar} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Indicadores operativos ─────────────────────────────────────── */}
          {ind && (
            <>
              <section>
                <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  Indicadores Operativos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <KpiIndicador
                    label="Rotación de Inventario"
                    valor={ind.indicadores.rotacion_inventario.valor}
                    unidad={ind.indicadores.rotacion_inventario.unidad}
                    descripcion={ind.indicadores.rotacion_inventario.descripcion}
                    estado={ind.indicadores.rotacion_inventario.estado}
                    icon={<TrendingUp size={20} />}
                    maxBar={3}
                  />
                  <KpiIndicador
                    label="Exactitud de Inventario"
                    valor={ind.indicadores.exactitud_inventario.valor}
                    unidad={ind.indicadores.exactitud_inventario.unidad}
                    descripcion={ind.indicadores.exactitud_inventario.descripcion}
                    estado={ind.indicadores.exactitud_inventario.estado}
                    icon={<Target size={20} />}
                    maxBar={100}
                  />
                  <KpiIndicador
                    label="Nivel de Servicio"
                    valor={ind.indicadores.nivel_servicio.valor}
                    unidad={ind.indicadores.nivel_servicio.unidad}
                    descripcion={ind.indicadores.nivel_servicio.descripcion}
                    estado={ind.indicadores.nivel_servicio.estado}
                    icon={<Star size={20} />}
                    maxBar={100}
                  />
                  <KpiIndicador
                    label="Utilización de Almacén"
                    valor={ind.indicadores.utilizacion_almacen.valor}
                    unidad={ind.indicadores.utilizacion_almacen.unidad}
                    descripcion={ind.indicadores.utilizacion_almacen.descripcion}
                    estado={ind.indicadores.utilizacion_almacen.estado}
                    icon={<Warehouse size={20} />}
                    maxBar={100}
                  />
                </div>
              </section>

              {/* ── Gráficos ─────────────────────────────────────────────────── */}
              <section>
                <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  Gráficos Interactivos
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Despachos — últimos 30 días */}
                  <div className="rounded-xl border-2 border-black/5 p-5" style={{ background: 'var(--bg-left)' }}>
                    <p className="text-sm font-black mb-4" style={{ color: 'var(--text-main)' }}>
                      Despachos — Últimos 30 días
                    </p>
                    {ind.graficos.despachos_30d.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        Sin despachos en el período
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={ind.graficos.despachos_30d} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradDespachos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLOR_PRIMARY} stopOpacity={0.15} />
                              <stop offset="95%" stopColor={COLOR_PRIMARY} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(v) => [`${v ?? 0} uds`, 'Despachado']}
                            labelFormatter={(l) => fmtFecha(String(l))}
                          />
                          <Area type="monotone" dataKey="total" stroke={COLOR_PRIMARY} fill="url(#gradDespachos)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Producción — últimos 6 meses */}
                  <div className="rounded-xl border-2 border-black/5 p-5" style={{ background: 'var(--bg-left)' }}>
                    <p className="text-sm font-black mb-4" style={{ color: 'var(--text-main)' }}>
                      Producción — Últimos 6 meses
                    </p>
                    {ind.graficos.produccion_6m.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        Sin órdenes en el período
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={ind.graficos.produccion_6m} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip labelFormatter={(l) => fmtMes(String(l))} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="completada" name="Completadas" fill={COLOR_COMPLETADA} radius={[3,3,0,0]} />
                          <Bar dataKey="producido"  name="Producidas"  fill={COLOR_PRODUCIDO}  radius={[3,3,0,0]} />
                          <Bar dataKey="pendiente"  name="Pendientes"  fill={COLOR_PENDIENTE}  radius={[3,3,0,0]} />
                          <Bar dataKey="anulada"    name="Anuladas"    fill={COLOR_ANULADA}    radius={[3,3,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Distribución órdenes — Pie */}
                  <div className="rounded-xl border-2 border-black/5 p-5" style={{ background: 'var(--bg-left)' }}>
                    <p className="text-sm font-black mb-4" style={{ color: 'var(--text-main)' }}>
                      Distribución de Órdenes de Producción
                    </p>
                    {ind.graficos.distribucion_ordenes.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={ind.graficos.distribucion_ordenes}
                            dataKey="total"
                            nameKey="estado"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            label={({ name, percent }: any) =>
                              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {ind.graficos.distribucion_ordenes.map((entry) => (
                              <Cell
                                key={entry.estado}
                                fill={
                                  entry.estado === 'completada' ? COLOR_COMPLETADA :
                                  entry.estado === 'producido'  ? COLOR_PRODUCIDO  :
                                  entry.estado === 'pendiente'  ? COLOR_PENDIENTE  :
                                  COLOR_ANULADA
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, name) => [v ?? 0, String(name)]} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Alertas / Órdenes mes actual */}
                  {kpis && (
                    <div className="rounded-xl border-2 border-black/5 p-5" style={{ background: 'var(--bg-left)' }}>
                      <p className="text-sm font-black mb-4" style={{ color: 'var(--text-main)' }}>
                        Resumen del Mes Actual
                      </p>
                      <div className="space-y-3">
                        {[
                          { label: 'Órdenes pendientes',  valor: kpis.ordenes_produccion.pendientes,  color: 'bg-amber-400' },
                          { label: 'Órdenes producidas',  valor: kpis.ordenes_produccion.producidas,  color: 'bg-blue-400'  },
                          { label: 'Órdenes completadas', valor: kpis.ordenes_produccion.completadas, color: 'bg-green-500' },
                          { label: 'Órdenes anuladas',    valor: kpis.ordenes_produccion.anuladas,    color: 'bg-red-400'   },
                        ].map(({ label, valor, color }) => {
                          const total = kpis.ordenes_produccion.total || 1;
                          return (
                            <div key={label}>
                              <div className="flex justify-between text-xs mb-1">
                                <span style={{ color: 'var(--text-muted)' }} className="font-medium">{label}</span>
                                <span className="font-black" style={{ color: 'var(--text-main)' }}>{valor}</span>
                              </div>
                              <div className="h-2 rounded-full bg-black/5">
                                <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${(valor / total) * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {kpis.alertas_reorden > 0 && (
                          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                            <p className="text-xs font-bold text-red-700">
                              {kpis.alertas_reorden} MP{kpis.alertas_reorden !== 1 ? 's' : ''} bajo punto de reorden
                            </p>
                            <Link href="/dashboard/inventario/alertas"
                              className="ml-auto text-[10px] font-black uppercase tracking-widest text-white px-2 py-1 rounded"
                              style={{ background: 'var(--primary)' }}>
                              Ver
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ── Accesos rápidos ───────────────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Reportes Detallados
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
                desc="Historial completo por tipo y fecha"
              />
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

// ── KpiIndicador ─────────────────────────────────────────────────────────────
function KpiIndicador({
  label, valor, unidad, descripcion, estado, icon, maxBar,
}: {
  label: string;
  valor: number;
  unidad: string;
  descripcion: string;
  estado: 'bueno' | 'medio' | 'bajo';
  icon: React.ReactNode;
  maxBar: number;
}) {
  const pct = Math.min((valor / maxBar) * 100, 100);

  return (
    <div className={`rounded-xl p-5 border-2 ${ESTADO_BG[estado]} flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className={`${ESTADO_COLOR[estado]}`}>{icon}</div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white ${
          estado === 'bueno' ? 'bg-green-500' : estado === 'medio' ? 'bg-amber-400' : 'bg-red-400'
        }`}>
          {ESTADO_LABEL[estado]}
        </span>
      </div>
      <div>
        <p className="text-3xl font-black leading-none" style={{ color: 'var(--text-main)' }}>
          {valor}
          <span className="text-sm font-bold ml-1" style={{ color: 'var(--text-muted)' }}>{unidad}</span>
        </p>
        <p className="text-[11px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-black/10">
        <div className={`h-1.5 rounded-full ${ESTADO_BAR[estado]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{descripcion}</p>
    </div>
  );
}

// ── ReporteCard ───────────────────────────────────────────────────────────────
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

