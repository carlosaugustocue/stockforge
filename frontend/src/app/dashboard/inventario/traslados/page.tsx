'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, RefreshCw, History } from 'lucide-react';
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
  const [stock,      setStock]     = useState<StockMp[]>([]);
  const [bodegas,    setBodegas]   = useState<Bodega[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [enviando,   setEnviando]  = useState(false);
  const [resultado,  setResultado] = useState<Resultado>(null);
  const [historial,  setHistorial] = useState<Movimiento[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Formulario
  const [mpId,       setMpId]     = useState('');
  const [loteId,     setLoteId]   = useState('');
  const [bodegaId,   setBodegaId] = useState('');
  const [cantidad,   setCantidad] = useState('');

  const cargarHistorial = () => {
    setLoadingHist(true);
    reportesService.movimientos({ tipo: 'TRASLADO_SALIDA' })
      .then(d => setHistorial((d as MovimientosResponse).detalle ?? []))
      .catch(() => {})
      .finally(() => setLoadingHist(false));
  };

  useEffect(() => {
    Promise.allSettled([
      inventarioService.stockMp(),
      catalogoService.bodegas(),
    ]).then(([s, b]) => {
      if (s.status === 'fulfilled') setStock(s.value);
      if (b.status === 'fulfilled') setBodegas(b.value);
    }).finally(() => setLoading(false));

    cargarHistorial();
  }, []);

  const mpSeleccionada = stock.find(mp => mp.materia_prima_id.toString() === mpId);

  const lotesDisponibles = mpSeleccionada
    ? mpSeleccionada.por_bodega.flatMap(b =>
        b.lotes_activos > 0
          ? [{ id: `${b.bodega_id}`, label: `${b.bodega} — ${formatNum(b.stock)} ${mpSeleccionada.unidad_medida}`, bodega_origen_id: b.bodega_id }]
          : []
      )
    : [];

  const handleTraslado = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);

    try {
      await inventarioService.trasladar({
        lote_id:           parseInt(loteId),
        bodega_destino_id: parseInt(bodegaId),
        cantidad:          parseFloat(cantidad),
      });
      setResultado({ ok: true, mensaje: `Traslado de ${cantidad} ${mpSeleccionada?.unidad_medida ?? ''} registrado correctamente.` });
      setCantidad('');
      setLoteId('');
      // Recargar stock e historial
      inventarioService.stockMp().then(setStock).catch(() => {});
      cargarHistorial();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setResultado({ ok: false, mensaje: e?.message ?? 'Error al registrar el traslado.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
          Traslado de Materias Primas
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Mueve stock de MP entre bodegas — genera movimientos inmutables de trazabilidad
        </p>
      </div>

      {resultado && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${
          resultado.ok
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {resultado.mensaje}
        </div>
      )}

      <div className="rounded-xl shadow-lg p-6 border-2 border-black/5" style={{ background: 'var(--bg-left)' }}>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} />
          </div>
        ) : (
          <form onSubmit={handleTraslado} className="space-y-5">

            {/* Seleccionar MP */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Materia Prima
              </label>
              <select value={mpId} onChange={e => { setMpId(e.target.value); setLoteId(''); }}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }}
                required>
                <option value="">— Seleccionar MP —</option>
                {stock.map(mp => (
                  <option key={mp.materia_prima_id} value={mp.materia_prima_id}>
                    {mp.nombre} ({formatNum(mp.stock_total)} {mp.unidad_medida})
                  </option>
                ))}
              </select>
            </div>

            {/* Seleccionar lote / bodega origen */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Bodega de origen (lote)
              </label>
              <select value={loteId} onChange={e => setLoteId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
                style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }}
                disabled={!mpId} required>
                <option value="">— Seleccionar bodega origen —</option>
                {lotesDisponibles.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                El sistema usará el lote disponible en la bodega seleccionada (FEFO).
              </p>
            </div>

            {/* Bodega destino */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Bodega de destino
              </label>
              <select value={bodegaId} onChange={e => setBodegaId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }}
                required>
                <option value="">— Seleccionar bodega destino —</option>
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                ))}
              </select>
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Cantidad {mpSeleccionada ? `(${mpSeleccionada.unidad_medida})` : ''}
              </label>
              <input
                type="number" step="0.001" min="0.001"
                value={cantidad} onChange={e => setCantidad(e.target.value)}
                placeholder="0.000"
                className="w-full px-3 py-2.5 rounded-lg border-2 border-black/10 text-sm font-bold focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ background: 'var(--bg-right)', color: 'var(--text-main)' }}
                required
              />
            </div>

            <button type="submit" disabled={enviando}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-black uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--primary)' }}>
              <ArrowLeftRight size={16} className={enviando ? 'animate-spin' : ''} />
              {enviando ? 'Registrando traslado…' : 'Registrar traslado'}
            </button>
          </form>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Cada traslado genera movimientos TRASLADO_SALIDA y TRASLADO_ENTRADA inmutables con trazabilidad completa (HU-027).
      </p>

      {/* Historial de traslados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
              Historial de Traslados
            </h2>
          </div>
          <button onClick={cargarHistorial} disabled={loadingHist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            <RefreshCw size={11} className={loadingHist ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {loadingHist
          ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }} /></div>
          : (
            <div className="rounded-xl border-2 border-black/5 overflow-hidden" style={{ background: 'var(--bg-left)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black/5">
                    {['#', 'Entidad', 'Bodega origen', 'Cantidad', 'Usuario', 'Fecha'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map(m => (
                    <tr key={m.id} className="border-b border-black/5 hover:bg-black/2 transition-colors">
                      <td className="px-4 py-3 font-black text-xs" style={{ color: 'var(--text-muted)' }}>#{m.id}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {m.entidad_tipo} #{m.entidad_id}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{m.bodega}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-main)' }}>
                        {formatNum(m.cantidad)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{m.usuario}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(m.fecha).toLocaleDateString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historial.length === 0 && (
                <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
                  No hay traslados registrados aún.
                </div>
              )}
            </div>
          )
        }
      </div>
    </div>
  );
}
