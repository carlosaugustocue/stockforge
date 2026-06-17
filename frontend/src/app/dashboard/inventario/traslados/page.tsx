'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, RefreshCw, History, Package, Warehouse, CheckCircle2, AlertCircle, Check } from 'lucide-react';
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

const PASOS = ['Materia prima', 'Ruta', 'Cantidad'];

export default function TrasladosPage() {
  const [stock,        setStock]       = useState<StockMp[]>([]);
  const [bodegas,      setBodegas]     = useState<Bodega[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [enviando,     setEnviando]    = useState(false);
  const [resultado,    setResultado]   = useState<Resultado>(null);
  const [historial,    setHistorial]   = useState<Movimiento[]>([]);
  const [loadingHist,  setLoadingHist] = useState(false);
  const [paso,         setPaso]        = useState(0); // 0, 1, 2

  // Selecciones
  const [mpId,     setMpId]     = useState('');
  const [loteId,   setLoteId]   = useState('');
  const [bodegaId, setBodegaId] = useState('');
  const [cantidad, setCantidad] = useState('');

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarDatos(); }, []);

  const mpSeleccionada   = stock.find(mp => mp.materia_prima_id.toString() === mpId);
  const bodegaOrigenInfo = mpSeleccionada?.por_bodega.find(b => b.bodega_id.toString() === loteId);
  const bodegaDestInfo   = bodegas.find(b => b.id.toString() === bodegaId);
  const lotesDisponibles = mpSeleccionada ? mpSeleccionada.por_bodega.filter(b => b.lotes_activos > 0) : [];
  const bodegasDestino   = bodegas.filter(b => b.id.toString() !== loteId);
  const stockOrigen      = bodegaOrigenInfo?.stock ?? 0;
  const cantNum          = parseFloat(cantidad) || 0;
  const stockRestante    = stockOrigen - cantNum;

  const resetForm = () => {
    setMpId(''); setLoteId(''); setBodegaId(''); setCantidad(''); setPaso(0);
  };

  const handleTraslado = async () => {
    setEnviando(true);
    setResultado(null);
    try {
      await inventarioService.trasladar({
        materia_prima_id:  parseInt(mpId),
        bodega_origen_id:  parseInt(loteId),
        bodega_destino_id: parseInt(bodegaId),
        cantidad:          cantNum,
      });
      setResultado({
        ok: true,
        mensaje: `${formatNum(cantNum)} ${mpSeleccionada?.unidad_medida ?? ''} de "${mpSeleccionada?.nombre}" trasladados correctamente.`,
      });
      resetForm();
      inventarioService.stockMp().then(setStock).catch(() => {});
      cargarHistorial();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setResultado({ ok: false, mensaje: e?.message ?? 'Error al registrar el traslado.' });
    } finally {
      setEnviando(false);
    }
  };

  const mpNombre = (entidadId: number) =>
    stock.find(m => m.materia_prima_id === entidadId)?.nombre ?? `Lote #${entidadId}`;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
            Traslado de Materias Primas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Mueve stock entre bodegas — trazabilidad inmutable
          </p>
        </div>
        <button onClick={cargarDatos} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 hover:opacity-90"
          style={{ background: 'var(--primary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium ${
          resultado.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {resultado.ok
            ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5 text-green-600" />
            : <AlertCircle   size={18} className="flex-shrink-0 mt-0.5 text-red-600" />}
          {resultado.mensaje}
        </div>
      )}

      {/* ── STEPPER ── */}
      <div className="rounded-2xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>

        {/* Indicador de pasos */}
        <div className="flex border-b-2 border-black/5">
          {PASOS.map((label, i) => {
            const completado = i < paso;
            const activo     = i === paso;
            return (
              <div key={i} className={`flex-1 flex items-center gap-2 px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors ${
                activo     ? 'border-b-2 -mb-[2px]' : ''
              }`}
              style={{
                borderColor: activo ? 'var(--primary)' : undefined,
                color: activo ? 'var(--primary)' : completado ? 'var(--text-main)' : 'var(--text-muted)',
              }}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                  completado ? 'bg-green-500 text-white' : activo ? 'text-white' : 'bg-black/10'
                }`}
                style={{ background: activo ? 'var(--primary)' : undefined }}>
                  {completado ? <Check size={10} /> : i + 1}
                </span>
                <span className="hidden sm:block">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Contenido del paso */}
        <div className="p-6">

          {/* ── PASO 0: Seleccionar MP ── */}
          {paso === 0 && (
            <div className="space-y-4">
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                ¿Qué materia prima deseas trasladar?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stock.map(mp => (
                  <button key={mp.materia_prima_id} type="button"
                    onClick={() => { setMpId(mp.materia_prima_id.toString()); setLoteId(''); setBodegaId(''); setCantidad(''); }}
                    className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-sm ${
                      mpId === mp.materia_prima_id.toString()
                        ? 'border-[var(--primary)] shadow-md'
                        : 'border-black/5 hover:border-black/20'
                    }`}
                    style={{ background: 'var(--bg-right)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          mpId === mp.materia_prima_id.toString() ? '' : 'bg-black/5'
                        }`} style={{ background: mpId === mp.materia_prima_id.toString() ? 'var(--primary)' : undefined }}>
                          <Package size={13} color={mpId === mp.materia_prima_id.toString() ? 'white' : 'var(--text-muted)'} />
                        </div>
                        <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{mp.nombre}</span>
                      </div>
                      {mpId === mp.materia_prima_id.toString() && (
                        <Check size={15} style={{ color: 'var(--primary)' }} className="flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>
                        Stock: <strong style={{ color: 'var(--text-main)' }}>{formatNum(mp.stock_total)} {mp.unidad_medida}</strong>
                      </span>
                      {mp.bajo_reorden && (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-black text-[9px] uppercase">Bajo reorden</span>
                      )}
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {mp.por_bodega.filter(b => b.lotes_activos > 0).length} bodega(s) con stock
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setPaso(1)} disabled={!mpId}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-40 hover:opacity-90 transition-all"
                  style={{ background: 'var(--primary)' }}>
                  Siguiente <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 1: Ruta Origen → Destino ── */}
          {paso === 1 && mpSeleccionada && (
            <div className="space-y-5">
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                ¿De dónde a dónde se mueve <strong style={{ color: 'var(--text-main)' }}>{mpSeleccionada.nombre}</strong>?
              </p>

              <div className="grid grid-cols-[1fr,48px,1fr] gap-4 items-start">

                {/* Origen */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[9px] font-black">S</span>
                    Sale de
                  </p>
                  {lotesDisponibles.map(b => (
                    <button key={b.bodega_id} type="button"
                      onClick={() => { setLoteId(b.bodega_id.toString()); setBodegaId(''); }}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                        loteId === b.bodega_id.toString()
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-black/5 hover:border-black/20'
                      }`}
                      style={{ background: loteId === b.bodega_id.toString() ? undefined : 'var(--bg-right)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Warehouse size={13} className={loteId === b.bodega_id.toString() ? 'text-orange-500' : ''} style={{ color: loteId === b.bodega_id.toString() ? undefined : 'var(--text-muted)' }} />
                          <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{b.bodega}</span>
                        </div>
                        {loteId === b.bodega_id.toString() && <Check size={13} className="text-orange-500" />}
                      </div>
                      <p className="text-xs mt-1 font-bold" style={{ color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--text-main)' }}>{formatNum(b.stock)}</span> {mpSeleccionada.unidad_medida}
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

                {/* Flecha */}
                <div className="flex items-center justify-center pt-8">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    loteId && bodegaId ? '' : 'bg-black/5'
                  }`} style={{ background: loteId && bodegaId ? 'var(--primary)' : undefined }}>
                    <ArrowRight size={18} color={loteId && bodegaId ? 'white' : 'var(--text-muted)'} />
                  </div>
                </div>

                {/* Destino */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[9px] font-black">E</span>
                    Entra a
                  </p>
                  {bodegasDestino.map(b => (
                    <button key={b.id} type="button"
                      disabled={!loteId}
                      onClick={() => setBodegaId(b.id.toString())}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        bodegaId === b.id.toString()
                          ? 'border-green-400 bg-green-50'
                          : 'border-black/5 hover:border-black/20'
                      }`}
                      style={{ background: bodegaId === b.id.toString() ? undefined : 'var(--bg-right)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Warehouse size={13} className={bodegaId === b.id.toString() ? 'text-green-500' : ''} style={{ color: bodegaId === b.id.toString() ? undefined : 'var(--text-muted)' }} />
                          <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{b.nombre}</span>
                        </div>
                        {bodegaId === b.id.toString() && <Check size={13} className="text-green-500" />}
                      </div>
                      <p className="text-[10px] uppercase font-bold mt-1" style={{ color: 'var(--text-muted)' }}>{b.tipo}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setPaso(0)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  <ArrowLeft size={15} /> Atrás
                </button>
                <button type="button" onClick={() => setPaso(2)} disabled={!loteId || !bodegaId}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-40 hover:opacity-90 transition-all"
                  style={{ background: 'var(--primary)' }}>
                  Siguiente <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 2: Cantidad y confirmación ── */}
          {paso === 2 && mpSeleccionada && (
            <div className="space-y-5">
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                ¿Cuánto deseas trasladar?
              </p>

              {/* Resumen de la ruta */}
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-black/5" style={{ background: 'var(--bg-right)' }}>
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Sale de</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <Warehouse size={14} className="text-orange-500" />
                    <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{bodegaOrigenInfo?.bodega}</span>
                  </div>
                  <p className="text-xs mt-0.5 font-bold text-orange-600">{formatNum(stockOrigen)} {mpSeleccionada.unidad_medida} disponibles</p>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                    <ArrowRight size={15} color="white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {mpSeleccionada.nombre}
                  </span>
                </div>

                <div className="flex-1 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Entra a</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <Warehouse size={14} className="text-green-500" />
                    <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{bodegaDestInfo?.nombre}</span>
                  </div>
                  <p className="text-[10px] uppercase font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>{bodegaDestInfo?.tipo}</p>
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Cantidad ({mpSeleccionada.unidad_medida})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number" step="0.001" min="0.001" max={stockOrigen}
                    value={cantidad} onChange={e => setCantidad(e.target.value)}
                    placeholder="0" autoFocus
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-black/10 text-lg font-black focus:outline-none focus:border-[var(--primary)] transition-colors"
                    style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }}
                  />
                  <button type="button" onClick={() => setCantidad(String(stockOrigen))}
                    className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 border-black/10 hover:border-[var(--primary)] transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    Todo
                  </button>
                </div>
              </div>

              {/* Indicador stock restante */}
              {cantNum > 0 && (
                <div className={`flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-xl ${
                  stockRestante < 0  ? 'bg-red-50 text-red-600' :
                  stockRestante === 0 ? 'bg-yellow-50 text-yellow-700' :
                  'bg-green-50 text-green-700'
                }`}>
                  {stockRestante < 0
                    ? <><AlertCircle size={16} /> Stock insuficiente — faltan {formatNum(Math.abs(stockRestante))} {mpSeleccionada.unidad_medida}</>
                    : stockRestante === 0
                      ? <><CheckCircle2 size={16} /> Se trasladará todo el stock de {bodegaOrigenInfo?.bodega}</>
                      : <><CheckCircle2 size={16} /> Quedarán {formatNum(stockRestante)} {mpSeleccionada.unidad_medida} en {bodegaOrigenInfo?.bodega}</>
                  }
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setPaso(1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest border-2 border-black/10 hover:bg-black/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  <ArrowLeft size={15} /> Atrás
                </button>
                <button type="button" onClick={handleTraslado}
                  disabled={enviando || cantNum <= 0 || cantNum > stockOrigen}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-40 hover:opacity-90 transition-all"
                  style={{ background: 'var(--primary)' }}>
                  {enviando ? <><RefreshCw size={15} className="animate-spin" /> Registrando…</> : <><Check size={15} /> Confirmar traslado</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Historial */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
              Historial de Traslados
            </h2>
            {historial.length > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--primary)' }}>
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
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Package size={13} style={{ color: 'var(--primary)' }} />
                  <span className="font-black text-sm truncate" style={{ color: 'var(--text-main)' }}>{mpNombre(m.entidad_id)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700">{m.bodega}</span>
                  <ArrowRight size={12} style={{ color: 'var(--primary)' }} />
                  <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700">destino</span>
                </div>
                <span className="font-black text-sm flex-shrink-0" style={{ color: 'var(--text-main)' }}>{formatNum(m.cantidad)}</span>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.usuario}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(m.fecha).toLocaleDateString('es-CO')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
