'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw, History, Package, Warehouse, CheckCircle2, AlertCircle } from 'lucide-react';
import { inventarioService, type StockMp } from '@/services/inventario.service';
import { catalogoService, type Bodega } from '@/services/catalogo.service';
import { reportesService } from '@/services/reportes.service';
import { formatNum } from '@/lib/utils';

type Resultado = { mensaje: string; ok: boolean } | null;

interface Movimiento {
  id: number;
  tipo: string;
  entidad_tipo: string;
  entidad_id: number;
  bodega: string;
  cantidad: number;
  usuario: string;
  fecha: string;
}

interface MovimientosResponse {
  detalle?: Movimiento[];
}

export default function TrasladosPage() {
  const [stock,       setStock]      = useState<StockMp[]>([]);
  const [bodegas,     setBodegas]    = useState<Bodega[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [enviando,    setEnviando]   = useState(false);
  const [resultado,   setResultado]  = useState<Resultado>(null);
  const [historial,   setHistorial]  = useState<Movimiento[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const [mpId,      setMpId]      = useState('');
  const [loteId,    setLoteId]    = useState('');
  const [bodegaId,  setBodegaId]  = useState('');
  const [cantidad,  setCantidad]  = useState('');

  const cargarHistorial = () => {
    setLoadingHist(true);
    reportesService.movimientos({ tipo: 'TRASLADO_SALIDA' })
      .then(d => setHistorial((d as MovimientosResponse).detalle ?? []))
      .catch(() => {})
      .finally(() => setLoadingHist(false));
  };

  const cargarDatos = () => {
    setLoading(true);
    Promise.allSettled([
      inventarioService.stockMp(),
      catalogoService.bodegas(),
    ]).then(([s, b]) => {
      if (s.status === 'fulfilled') setStock(s.value);
      if (b.status === 'fulfilled') setBodegas(b.value);
    }).finally(() => setLoading(false));
    cargarHistorial();
  };

  useEffect(() => { cargarDatos(); }, []);

  const mpSeleccionada   = stock.find(mp => mp.materia_prima_id.toString() === mpId);
  const bodegaOrigenInfo = mpSeleccionada?.por_bodega.find(b => b.bodega_id.toString() === loteId);
  const bodegaDestInfo   = bodegas.find(b => b.id.toString() === bodegaId);

  const lotesDisponibles = mpSeleccionada
    ? mpSeleccionada.por_bodega.filter(b => b.lotes_activos > 0)
    : [];

  const bodegasDestino = bodegas.filter(b => b.id.toString() !== loteId);

  const stockOrigen  = bodegaOrigenInfo?.stock ?? 0;
  const cantNum      = parseFloat(cantidad) || 0;
  const stockRestante = stockOrigen - cantNum;

  const handleTraslado = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);
    try {
      await inventarioService.trasladar({
        lote_id:           parseInt(loteId),
        bodega_destino_id: parseInt(bodegaId),
        cantidad:          cantNum,
      });
      setResultado({
        ok: true,
        mensaje: `${formatNum(cantNum)} ${mpSeleccionada?.unidad_medida ?? ''} de "${mpSeleccionada?.nombre}" trasladados correctamente.`,
      });
      setCantidad('');
      setLoteId('');
      setBodegaId('');
      inventarioService.stockMp().then(setStock).catch(() => {});
      cargarHistorial();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setResultado({ ok: false, mensaje: e?.message ?? 'Error al registrar el traslado.' });
    } finally {
      setEnviando(false);
    }
  };

  // Mapear entidad_id a nombre de MP para el historial
  const mpNombre = (entidadId: number) => {
    const mp = stock.find(m =>
      m.por_bodega.some(b => b.lotes_activos > 0) && m.materia_prima_id === entidadId
    );
    return mp ? mp.nombre : `Lote #${entidadId}`;
  };

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Traslado de Materias Primas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Mueve stock entre bodegas — trazabilidad inmutable (HU-027)
          </p>
        </div>
        <button onClick={cargarDatos} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90 transition-all"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium ${
          resultado.ok
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {resultado.ok
            ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5 text-green-600" />
            : <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-600" />}
          {resultado.mensaje}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
        </div>
      ) : (
        <form onSubmit={handleTraslado} className="space-y-6">

          {/* Paso 1: Seleccionar MP */}
          <div className="rounded-2xl border-2 border-black/5 p-6 space-y-4" style={{ background: 'var(--bg-left)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              1 — Materia prima a trasladar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stock.map(mp => (
                <button
                  key={mp.materia_prima_id}
                  type="button"
                  onClick={() => { setMpId(mp.materia_prima_id.toString()); setLoteId(''); setBodegaId(''); setCantidad(''); }}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    mpId === mp.materia_prima_id.toString()
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-black/5 hover:border-black/20'
                  }`}
                  style={{ background: mpId === mp.materia_prima_id.toString() ? undefined : 'var(--bg-right)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={14} style={{ color: mpId === mp.materia_prima_id.toString() ? 'var(--primary)' : 'var(--text-muted)' }} />
                      <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{mp.nombre}</span>
                    </div>
                    {mp.bajo_reorden && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-600">Bajo reorden</span>
                    )}
                  </div>
                  <p className="text-xs mt-1 font-bold" style={{ color: 'var(--text-muted)' }}>
                    Stock total: <span style={{ color: 'var(--text-main)' }}>{formatNum(mp.stock_total)} {mp.unidad_medida}</span>
                    {' · '}{mp.por_bodega.filter(b => b.lotes_activos > 0).length} bodega(s)
                  </p>
                </button>
              ))}
            </div>
            {stock.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No hay materias primas con stock disponible.</p>
            )}
          </div>

          {/* Paso 2: Flujo visual Origen → Destino */}
          {mpSeleccionada && (
            <div className="rounded-2xl border-2 border-black/5 p-6 space-y-4" style={{ background: 'var(--bg-left)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                2 — Ruta del traslado
              </p>

              <div className="grid grid-cols-[1fr,56px,1fr] items-center gap-3">
                {/* Bodega origen */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Bodega origen</p>
                  <div className="space-y-2">
                    {lotesDisponibles.map(b => (
                      <button
                        key={b.bodega_id}
                        type="button"
                        onClick={() => { setLoteId(b.bodega_id.toString()); setBodegaId(''); setCantidad(''); }}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          loteId === b.bodega_id.toString()
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-black/5 hover:border-black/20'
                        }`}
                        style={{ background: loteId === b.bodega_id.toString() ? undefined : 'var(--bg-right)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Warehouse size={13} className={loteId === b.bodega_id.toString() ? 'text-orange-500' : ''} style={{ color: loteId === b.bodega_id.toString() ? undefined : 'var(--text-muted)' }} />
                          <span className="font-black text-xs" style={{ color: 'var(--text-main)' }}>{b.bodega}</span>
                        </div>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-main)' }}>{formatNum(b.stock)}</span> {mpSeleccionada.unidad_medida} disponibles
                        </p>
                        {b.proximo_vencimiento && (
                          <p className="text-[10px] text-orange-500 font-bold mt-0.5">Vence: {b.proximo_vencimiento}</p>
                        )}
                      </button>
                    ))}
                    {lotesDisponibles.length === 0 && (
                      <p className="text-xs p-3 rounded-xl border-2 border-dashed border-black/10 text-center" style={{ color: 'var(--text-muted)' }}>
                        Sin stock disponible
                      </p>
                    )}
                  </div>
                </div>

                {/* Flecha central con cantidad */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    loteId && bodegaId ? 'bg-[var(--primary)]' : 'bg-black/10'
                  }`}>
                    <ArrowRight size={18} color={loteId && bodegaId ? 'white' : 'var(--text-muted)'} />
                  </div>
                  {cantNum > 0 && (
                    <span className="text-[10px] font-black text-center" style={{ color: 'var(--primary)' }}>
                      {formatNum(cantNum)}<br />{mpSeleccionada.unidad_medida}
                    </span>
                  )}
                </div>

                {/* Bodega destino */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Bodega destino</p>
                  <div className="space-y-2">
                    {bodegasDestino.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        disabled={!loteId}
                        onClick={() => setBodegaId(b.id.toString())}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          bodegaId === b.id.toString()
                            ? 'border-green-400 bg-green-50'
                            : 'border-black/5 hover:border-black/20'
                        }`}
                        style={{ background: bodegaId === b.id.toString() ? undefined : 'var(--bg-right)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Warehouse size={13} className={bodegaId === b.id.toString() ? 'text-green-500' : ''} style={{ color: bodegaId === b.id.toString() ? undefined : 'var(--text-muted)' }} />
                          <span className="font-black text-xs" style={{ color: 'var(--text-main)' }}>{b.nombre}</span>
                        </div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>{b.tipo}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Cantidad */}
          {mpSeleccionada && loteId && bodegaId && (
            <div className="rounded-2xl border-2 border-black/5 p-6 space-y-4" style={{ background: 'var(--bg-left)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                3 — Cantidad a trasladar
              </p>

              {/* Resumen visual */}
              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-black/5 text-sm" style={{ background: 'var(--bg-right)' }}>
                <span className="font-black" style={{ color: 'var(--text-main)' }}>{mpSeleccionada.nombre}</span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span className="font-bold" style={{ color: 'var(--text-muted)' }}>
                  {bodegaOrigenInfo?.bodega ?? '—'}
                </span>
                <ArrowRight size={14} style={{ color: 'var(--primary)' }} />
                <span className="font-bold" style={{ color: 'var(--text-muted)' }}>
                  {bodegaDestInfo?.nombre ?? '—'}
                </span>
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Cantidad ({mpSeleccionada.unidad_medida}) · Disponible: {formatNum(stockOrigen)}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={stockOrigen}
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)]"
                    style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCantidad(String(stockOrigen))}
                  className="px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest border-2 border-black/10 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  Todo
                </button>
              </div>

              {/* Indicador de stock restante */}
              {cantNum > 0 && (
                <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg ${
                  stockRestante < 0
                    ? 'bg-red-50 text-red-600'
                    : stockRestante === 0
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-green-50 text-green-700'
                }`}>
                  {stockRestante < 0
                    ? `Stock insuficiente — faltan ${formatNum(Math.abs(stockRestante))} ${mpSeleccionada.unidad_medida}`
                    : stockRestante === 0
                      ? `Se trasladará todo el stock de ${bodegaOrigenInfo?.bodega ?? 'la bodega'}`
                      : `Quedarán ${formatNum(stockRestante)} ${mpSeleccionada.unidad_medida} en ${bodegaOrigenInfo?.bodega ?? 'la bodega'}`
                  }
                </div>
              )}

              <button
                type="submit"
                disabled={enviando || cantNum <= 0 || cantNum > stockOrigen}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'var(--primary)' }}>
                <ArrowRight size={16} className={enviando ? 'animate-spin' : ''} />
                {enviando ? 'Registrando traslado…' : 'Confirmar traslado'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Historial */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
              Historial de Traslados
            </h2>
            {historial.length > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'var(--primary)', color: 'white' }}>
                {historial.length}
              </span>
            )}
          </div>
          <button onClick={cargarHistorial} disabled={loadingHist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--primary)' }}>
            <RefreshCw size={11} className={loadingHist ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {loadingHist ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
          </div>
        ) : historial.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-black/10 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No hay traslados registrados aún.
          </div>
        ) : (
          <div className="space-y-2">
            {historial.map(m => (
              <div key={m.id}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-black/5 hover:border-black/10 transition-colors"
                style={{ background: 'var(--bg-left)' }}>
                <span className="text-[10px] font-black w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>#{m.id}</span>

                {/* MP */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Package size={13} style={{ color: 'var(--primary)' }} />
                  <span className="font-black text-sm truncate" style={{ color: 'var(--text-main)' }}>
                    {mpNombre(m.entidad_id)}
                  </span>
                </div>

                {/* Ruta */}
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-2 py-1 rounded-lg" style={{ background: 'var(--bg-right)', color: 'var(--text-muted)' }}>
                    {m.bodega}
                  </span>
                  <ArrowRight size={12} style={{ color: 'var(--primary)' }} />
                  <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700">destino</span>
                </div>

                {/* Cantidad */}
                <span className="font-black text-sm flex-shrink-0" style={{ color: 'var(--text-main)' }}>
                  {formatNum(m.cantidad)}
                </span>

                {/* Meta */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.usuario}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(m.fecha).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
